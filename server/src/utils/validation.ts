const MAX_UPLOAD_BYTES = 18 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
	"jpg", "jpeg", "png", "gif", "webp", "bmp", "heic",
	"mp4", "mov", "webm", "mkv", "avi",
	"mp3", "wav", "m4a", "aac", "ogg", "flac",
	"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods",
]);

export const getNonEmptyString = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim().length > 0 ? value : undefined;


export const validateFileUpload = (key: string, content: string): { status: number; error: string } | null => {
	const isFolderMarker = key.endsWith("/") && content.length === 0;
	const extension = key.split("/").pop()?.split(".").pop()?.toLowerCase();

	if (!isFolderMarker && (!extension || !ALLOWED_EXTENSIONS.has(extension))) {
		return { status: 415, error: "This file type is not allowed" };
	}

	if (Buffer.from(content, "base64").byteLength > MAX_UPLOAD_BYTES) {
		return { status: 413, error: "Files must be 18 MB or smaller" };
	}

	return null;
};
