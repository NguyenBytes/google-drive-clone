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
import { safeHttpHandler } from "../utils/safeHttpHandler.js";

const PRESIGNED_URL_EXPIRES_IN = 900;

// CommonPrefixes includes folders even when no explicit folder marker exists.
const listingEntries = (result: ListObjectsV2CommandOutput): _Object[] => [
	...(result.Contents ?? []).filter((file) => file.Key && !file.Key.endsWith("/")),
	...(result.CommonPrefixes ?? []).flatMap((folder) => folder.Prefix ? [{ Key: folder.Prefix }] : []),
].sort((a, b) => Buffer.compare(Buffer.from(a.Key!), Buffer.from(b.Key!)));

/** Handles file and directory requests backed by S3. */
export class FileController {
	/** GET /api/v1/files — List immediate files and folders with numbered or token-based pagination. */
	async getFiles(request: Request, response: Response): Promise<void> {
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

		const [bucketError, bucket] = await safeHttpHandler(getBucket);
		if (bucketError) return sendServiceError(response, bucketError);

		const objects: _Object[] = [];
		let nextContinuationToken = continuationToken;

		// Token requests retain sequential navigation support.
		if (page === undefined) {
			do {
				const [resultError, result] = await safeHttpHandler(s3.send(new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: prefix,
					Delimiter: "/",
					MaxKeys: pageSize - objects.length,
					ContinuationToken: nextContinuationToken,
				})));
				if (resultError) return sendServiceError(response, resultError);

				objects.push(...listingEntries(result));
				nextContinuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
			} while (objects.length < pageSize && nextContinuationToken);
		}

		let totalItems = 0;
		let countToken: string | undefined;

		// Count immediate files and folders without retaining the entire listing.
		do {
			const [resultError, result] = await safeHttpHandler(s3.send(new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: prefix,
				Delimiter: "/",
				MaxKeys: 1000,
				ContinuationToken: countToken,
			})));
			if (resultError) return sendServiceError(response, resultError);

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
	}

	/** GET /api/v1/files/object — Return an object as an attachment for downloads to the user’s device. */
	async getFileDownload(request: Request, response: Response): Promise<void> {
		const key = getNonEmptyString(request.query.key);

		if (!key) {
			response.status(400).json({ error: "A non-empty key query parameter is required" });
			return;
		}

		const [bucketError, bucket] = await safeHttpHandler(getBucket);
		if (bucketError) return sendServiceError(response, bucketError);

		const [resultError, result] = await safeHttpHandler(s3.send(
			new GetObjectCommand({ Bucket: bucket, Key: key }),
		));
		if (resultError) return sendServiceError(response, resultError);

		if (!result.Body) {
			response.status(404).json({ error: "File not found" });
			return;
		}

		const [bodyError, body] = await safeHttpHandler(() => result.Body!.transformToByteArray());
		if (bodyError) return sendServiceError(response, bodyError);

		response.attachment(key.split("/").pop() || "download");
		response.setHeader("Content-Type", result.ContentType ?? "application/octet-stream");
		if (result.ContentLength !== undefined) {
			response.setHeader("Content-Length", result.ContentLength);
		}
		response.send(Buffer.from(body));
	}

	/** GET /api/v1/files/presigned-url — Issue a short-lived S3 URL for previewing an object. */
	async getPresignedDownloadUrl(
		request: Request,
		response: Response,
	): Promise<void> {
		const key = getNonEmptyString(request.query.key);
		if (!key) {
			response.status(400).json({ error: "A non-empty key query parameter is required" });
			return;
		}

		const [bucketError, bucket] = await safeHttpHandler(getBucket);
		if (bucketError) return sendServiceError(response, bucketError);

		const [urlError, url] = await safeHttpHandler(getSignedUrl(
			s3,
			new GetObjectCommand({ Bucket: bucket, Key: key }),
			{ expiresIn: PRESIGNED_URL_EXPIRES_IN },
		));
		if (urlError) return sendServiceError(response, urlError);
		response.json({ key, url, expiresIn: PRESIGNED_URL_EXPIRES_IN });
	}

	/** POST /api/v1/files — Upload an object, or replace it when called by the PUT handler. */
	async postFile(
		request: Request<unknown, unknown, FileUploadBody>,
		response: Response,
	): Promise<void> {
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

		const [bucketError, bucket] = await safeHttpHandler(getBucket);
		if (bucketError) return sendServiceError(response, bucketError);

		const [uploadError] = await safeHttpHandler(s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: Buffer.from(content, "base64"),
				ContentType:
					typeof contentType === "string" ? contentType : "application/octet-stream",
			}),
		));
		if (uploadError) return sendServiceError(response, uploadError);
		const isUpdate = request.method === "PUT";
		response.status(isUpdate ? 200 : 201).json({
			key,
			message: isUpdate ? "File updated" : "File uploaded",
		});
	}

	/** POST /api/v1/files/rename — Rename a file or folder by copying its objects before deleting originals. */
	async postFileRename(request: Request, response: Response): Promise<void> {
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

		const [bucketError, bucket] = await safeHttpHandler(getBucket);
		if (bucketError) return sendServiceError(response, bucketError);
		const respondToReadError = (error: Error): void => {
			if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) {
				response.status(404).json({ error: "File or folder not found" });
				return;
			}
			sendServiceError(response, error);
		};

		const objects: _Object[] = [];
		if (isDirectory) {
			let token: string | undefined;
			do {
				const [resultError, result] = await safeHttpHandler(s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: key, ContinuationToken: token })));
				if (resultError) return respondToReadError(resultError);
				objects.push(...(result.Contents ?? []).filter((object) => object.Key?.startsWith(key)));
				token = result.IsTruncated ? result.NextContinuationToken : undefined;
			} while (token);
			if (!objects.length) {
				response.status(404).json({ error: "Folder not found" });
				return;
			}
		} else {
			const [sourceError, source] = await safeHttpHandler(s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })));
			if (sourceError) return respondToReadError(sourceError);
			objects.push({ Key: key, ETag: source.ETag });
		}

		// A file and directory with the same display name both count as conflicts.
		let token: string | undefined;
		do {
			const [resultError, result] = await safeHttpHandler(s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: targetBase, ContinuationToken: token })));
			if (resultError) return respondToReadError(resultError);
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
		for (const { object, target } of moves) {
			const [copyError] = await safeHttpHandler(s3.send(new CopyObjectCommand({
				Bucket: bucket,
				Key: target,
				CopySource: `${bucket}/${object.Key!.split("/").map(encodeURIComponent).join("/")}`,
				CopySourceIfMatch: object.ETag,
				IfNoneMatch: "*",
			})));
			if (copyError) {
				console.error("S3 rename failed", copyError);
				response.status(502).json({ error: "Rename could not finish. Original items were kept; some copies may exist under the new name." });
				return;
			}
		}
		for (const { object } of moves) {
			const [deleteError] = await safeHttpHandler(s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key!, IfMatch: object.ETag })));
			if (deleteError) {
				console.error("S3 rename failed", deleteError);
				response.status(502).json({ error: "Items were copied to the new name, but some originals could not be removed. Refresh the folder to review both names." });
				return;
			}
		}
		response.json({ key: newKey, name, isDirectory });
	}

	/** PUT /api/v1/files — Replace an object using the same S3 PutObject operation as POST. */
	async putFile(
		request: Request<unknown, unknown, FileUploadBody>,
		response: Response,
	): Promise<void> {
		await this.postFile(request, response);
	}

	/** DELETE /api/v1/files — Delete a single S3 object, including an empty folder marker. */
	async deleteFile(request: Request, response: Response): Promise<void> {
		const key = getNonEmptyString(request.query.key);

		if (!key) {
			response.status(400).json({ error: "A non-empty key query parameter is required" });
			return;
		}

		const [bucketError, bucket] = await safeHttpHandler(getBucket);
		if (bucketError) return sendServiceError(response, bucketError);

		const [deleteError] = await safeHttpHandler(s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })));
		if (deleteError) return sendServiceError(response, deleteError);
		response.status(204).send();
	}
}

export const fileController = new FileController();
