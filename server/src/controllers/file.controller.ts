import {
	DeleteObjectCommand,
	GetObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import type { Request, Response } from "express";
import type { FileUploadBody } from "../models/file.model.js";

const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-west-2" });
const MAX_UPLOAD_BYTES = 18 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
	"jpg", "jpeg", "png", "gif", "webp", "bmp", "heic",
	"mp4", "mov", "webm", "mkv", "avi",
	"mp3", "wav", "m4a", "aac", "ogg", "flac",
	"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods",
]);

const getBucket = (): string => {
	const bucket = process.env.S3_BUCKET_NAME;

	if (!bucket) {
		throw new Error("S3_BUCKET_NAME is not configured");
	}

	return bucket;
};

const getNonEmptyString = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0 ? value : undefined;

const sendServiceError = (response: Response, error: unknown): void => {
	console.error("S3 request failed", error);

	const isConfigurationError =
		error instanceof Error && error.message === "S3_BUCKET_NAME is not configured";

	response.status(isConfigurationError ? 500 : 502).json({
		error: isConfigurationError
			? "S3_BUCKET_NAME is not configured"
			: "Unable to complete S3 request",
	});
};

const upload = async (
	request: Request<unknown, unknown, FileUploadBody>,
	response: Response,
	status: number,
	message: string,
): Promise<void> => {
	const key = getNonEmptyString(request.body.key);
	const { content, contentType } = request.body;

	if (!key || typeof content !== "string") {
		response.status(400).json({ error: "key and base64-encoded content are required" });
		return;
	}

	const isFolderMarker = key.endsWith("/") && content.length === 0;
	const extension = key.split("/").pop()?.split(".").pop()?.toLowerCase();
	if (!isFolderMarker && (!extension || !ALLOWED_EXTENSIONS.has(extension))) {
		response.status(415).json({ error: "This file type is not allowed" });
		return;
	}
	const decodedSize = Buffer.from(content, "base64").byteLength;
	if (decodedSize > MAX_UPLOAD_BYTES) {
		response.status(413).json({ error: "Files must be 18 MB or smaller" });
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
		response.status(status).json({ key, message });
	} catch (error) {
		sendServiceError(response, error);
	}
};

export const listFiles = async (request: Request, response: Response): Promise<void> => {
	const prefix = typeof request.query.prefix === "string" ? request.query.prefix : undefined;

	try {
		const result = await s3.send(
			new ListObjectsV2Command({ Bucket: getBucket(), Prefix: prefix }),
		);

		response.json({
			files: (result.Contents ?? []).map((file) => ({
				key: file.Key,
				size: file.Size,
				lastModified: file.LastModified,
				eTag: file.ETag,
			})),
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

		response.setHeader("Content-Type", result.ContentType ?? "application/octet-stream");
		if (result.ContentLength !== undefined) {
			response.setHeader("Content-Length", result.ContentLength);
		}
		response.setHeader("Content-Disposition", `attachment; filename="${key.split("/").pop()}"`);
		response.send(Buffer.from(await result.Body.transformToByteArray()));
	} catch (error) {
		sendServiceError(response, error);
	}
};

export const createFile = (
	request: Request<unknown, unknown, FileUploadBody>,
	response: Response,
): Promise<void> => upload(request, response, 201, "File uploaded");

export const updateFile = (
	request: Request<unknown, unknown, FileUploadBody>,
	response: Response,
): Promise<void> => upload(request, response, 200, "File updated");

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
