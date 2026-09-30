import {
	CopyObjectCommand,
	HeadObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { _Object, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import type { Request, Response } from "express";
import type { FileUploadBody } from "../models/file.model.js";

import { s3, getBucket } from "../libs/s3.js";
import { getNonEmptyString, validateFileUpload } from "../utils/validation.js";
import { sendServiceError } from "../utils/errors.js";

const PRESIGNED_URL_EXPIRES_IN = 900;

// CommonPrefixes includes folders even when no explicit folder marker exists.
const listingEntries = (result: ListObjectsV2CommandOutput): _Object[] => [
	...(result.Contents ?? []).filter((file) => file.Key && !file.Key.endsWith("/")),
	...(result.CommonPrefixes ?? []).flatMap((folder) => folder.Prefix ? [{ Key: folder.Prefix }] : []),
].sort((a, b) => Buffer.compare(Buffer.from(a.Key!), Buffer.from(b.Key!)));

export const createFile = async (
	request: Request<unknown, unknown, FileUploadBody>,
	response: Response,
): Promise<void> => {
	const key = getNonEmptyString(request.body.key);
	const { content, contentType } = request.body;

	if (!key || typeof content !== "string") {
		response.status(400).json({ error: "key and base64-encoded content are required" });
		return;
	}

	const validationError = validateFileUpload(key, content);
	if (validationError) {
		response.status(validationError.status).json({ error: validationError.error });
		return;
	}

	try {
		await s3.send(
			new PutObjectCommand({
				Bucket: getBucket(),
				Key: key,
				Body: Buffer.from(content, "base64"),
				ContentType:
					typeof contentType === "string" ? contentType : "application/octet-stream",
			}),
		);
		const isUpdate = request.method === "PUT";
		response.status(isUpdate ? 200 : 201).json({
			key,
			message: isUpdate ? "File updated" : "File uploaded",
		});
	} catch (error) {
		sendServiceError(response, error);
	}
};

export const listFiles = async (request: Request, response: Response): Promise<void> => {
	const prefix = getNonEmptyString(request.query.prefix);
	if (!prefix) {
		response.status(400).json({ error: "A non-empty prefix query parameter is required" });
		return;
	}

	const pageSize = 10;
	const page = request.query.page === undefined ? undefined : Number(request.query.page);
	if (page !== undefined && (typeof request.query.page !== "string" || !Number.isSafeInteger(page) || page < 1)) {
		response.status(400).json({ error: "page must be a positive integer" });
		return;
	}
	const continuationToken = getNonEmptyString(request.query.continuationToken);
	if (request.query.continuationToken !== undefined && !continuationToken) {
		response.status(400).json({ error: "continuationToken must be a non-empty string" });
		return;
	}

	try {
		const objects: _Object[] = [];
		let nextContinuationToken = continuationToken;

		// Token requests retain sequential navigation support.
		if (page === undefined) {
			do {
				const result = await s3.send(new ListObjectsV2Command({
					Bucket: getBucket(),
					Prefix: prefix,
					Delimiter: "/",
					MaxKeys: pageSize - objects.length,
					ContinuationToken: nextContinuationToken,
				}));

				objects.push(...listingEntries(result));
				nextContinuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
			} while (objects.length < pageSize && nextContinuationToken);
		}

		let totalItems = 0;
		let countToken: string | undefined;

		// Count immediate files and folders without retaining the entire listing.
		do {
			const result = await s3.send(new ListObjectsV2Command({
				Bucket: getBucket(),
				Prefix: prefix,
				Delimiter: "/",
				MaxKeys: 1000,
				ContinuationToken: countToken,
			}));

			for (const file of listingEntries(result)) {
				if (page !== undefined && totalItems >= (page - 1) * pageSize && objects.length < pageSize) {
					objects.push(file);
				}
				totalItems++;
			}
			countToken = result.IsTruncated ? result.NextContinuationToken : undefined;
		} while (countToken);

		response.json({
			pageSize,
			page,
			totalItems,
			totalPages: Math.ceil(totalItems / pageSize),
			nextContinuationToken: nextContinuationToken ?? null,
			hasMore: page === undefined ? Boolean(nextContinuationToken) : page < Math.ceil(totalItems / pageSize),
			files: objects.map((file) => {
				const key = file.Key;
				const name = key?.replace(/\/$/, "").split("/").pop();
				return {
					key,
					name,
					isDirectory: key?.endsWith("/") ?? false,
					size: file.Size,
					lastModifiedAt: file.LastModified?.toISOString(),
					lastModified: file.LastModified
						? `${new Intl.DateTimeFormat("en-US", {
							dateStyle: "medium",
							timeStyle: "short",
							timeZone: "UTC",
						}).format(file.LastModified)} UTC`
						: undefined,
					eTag: file.ETag,
				};
			}),
		});
	} catch (error) {
		sendServiceError(response, error);
	}
};

export const downloadFile = async (request: Request, response: Response): Promise<void> => {
	const key = getNonEmptyString(request.query.key);

	if (!key) {
		response.status(400).json({ error: "A non-empty key query parameter is required" });
		return;
	}

	try {
		const result = await s3.send(
			new GetObjectCommand({ Bucket: getBucket(), Key: key }),
		);

		if (!result.Body) {
			response.status(404).json({ error: "File not found" });
			return;
		}

		response.attachment(key.split("/").pop() || "download");
		response.setHeader("Content-Type", result.ContentType ?? "application/octet-stream");
		if (result.ContentLength !== undefined) {
			response.setHeader("Content-Length", result.ContentLength);
		}
		response.send(Buffer.from(await result.Body.transformToByteArray()));
	} catch (error) {
		sendServiceError(response, error);
	}
};

export const getPresignedDownloadUrl = async (
	request: Request,
	response: Response,
): Promise<void> => {
	const key = getNonEmptyString(request.query.key);
	if (!key) {
		response.status(400).json({ error: "A non-empty key query parameter is required" });
		return;
	}

	try {
		const url = await getSignedUrl(
			s3,
			new GetObjectCommand({ Bucket: getBucket(), Key: key }),
			{ expiresIn: PRESIGNED_URL_EXPIRES_IN },
		);
		response.json({ key, url, expiresIn: PRESIGNED_URL_EXPIRES_IN });
	} catch (error) {
		sendServiceError(response, error);
	}
};

// S3 uses PutObject for both creation and replacement.
export const updateFile = createFile;

export const deleteFile = async (request: Request, response: Response): Promise<void> => {
	const key = getNonEmptyString(request.query.key);

	if (!key) {
		response.status(400).json({ error: "A non-empty key query parameter is required" });
		return;
	}

	try {
		await s3.send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
		response.status(204).send();
	} catch (error) {
		sendServiceError(response, error);
	}
};

export const renameFile = async (request: Request, response: Response): Promise<void> => {
	const key = getNonEmptyString(request.body?.key);
	const name = getNonEmptyString(request.body?.name)?.trim();
	if (!key || !name || /[\\/\u0000-\u001f\u007f]/.test(name) || name === "." || name === "..") {
		response.status(400).json({ error: "A key and a name without slashes or control characters are required" });
		return;
	}
	const isDirectory = key.endsWith("/");
	const sourceBase = isDirectory ? key.slice(0, -1) : key;
	const parent = sourceBase.slice(0, sourceBase.lastIndexOf("/") + 1);
	const targetBase = parent + name;
	const newKey = targetBase + (isDirectory ? "/" : "");
	if (Buffer.byteLength(newKey) > 1024) {
		response.status(400).json({ error: "The new name is too long" });
		return;
	}
	if (key === newKey) {
		response.json({ key, name, isDirectory });
		return;
	}

	let stage: "read" | "copy" | "delete" = "read";
	try {
		const bucket = getBucket();
		const objects: _Object[] = [];
		if (isDirectory) {
			let token: string | undefined;
			do {
				const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: key, ContinuationToken: token }));
				objects.push(...(result.Contents ?? []).filter((object) => object.Key?.startsWith(key)));
				token = result.IsTruncated ? result.NextContinuationToken : undefined;
			} while (token);
			if (!objects.length) {
				response.status(404).json({ error: "Folder not found" });
				return;
			}
		} else {
			const source = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
			objects.push({ Key: key, ETag: source.ETag });
		}

		// A file and directory with the same display name both count as conflicts.
		let token: string | undefined;
		do {
			const result = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: targetBase, ContinuationToken: token }));
			if (result.Contents?.some((object) => object.Key === targetBase || object.Key?.startsWith(`${targetBase}/`))) {
				response.status(409).json({ error: "A file or folder with that name already exists" });
				return;
			}
			token = result.IsTruncated ? result.NextContinuationToken : undefined;
		} while (token);

		const moves = objects.map((object) => ({
			object,
			target: isDirectory ? newKey + object.Key!.slice(key.length) : newKey,
		}));
		if (moves.some(({ target }) => Buffer.byteLength(target) > 1024)) {
			response.status(400).json({ error: "The new name makes a nested file path too long" });
			return;
		}

		// Preserve all originals until every destination object has been copied.
		stage = "copy";
		for (const { object, target } of moves) {
			await s3.send(new CopyObjectCommand({
				Bucket: bucket,
				Key: target,
				CopySource: `${bucket}/${object.Key!.split("/").map(encodeURIComponent).join("/")}`,
				CopySourceIfMatch: object.ETag,
				IfNoneMatch: "*",
			}));
		}
		stage = "delete";
		for (const { object } of moves) {
			await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key!, IfMatch: object.ETag }));
		}
		response.json({ key: newKey, name, isDirectory });
	} catch (error) {
		if (stage !== "read") {
			console.error("S3 rename failed", error);
			response.status(502).json({
				error: stage === "copy"
					? "Rename could not finish. Original items were kept; some copies may exist under the new name."
					: "Items were copied to the new name, but some originals could not be removed. Refresh the folder to review both names."
			});
		} else if ((error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode === 404) {
			response.status(404).json({ error: "File or folder not found" });
		} else {
			sendServiceError(response, error);
		}
	}
};
