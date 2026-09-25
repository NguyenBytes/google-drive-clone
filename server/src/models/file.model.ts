export type FileUploadBody = {
	key?: unknown;
	content?: unknown;
	contentType?: unknown;
};

export type StoredFile = {
	key?: string;
	size?: number;
	lastModified?: Date;
	eTag?: string;
};

export type DownloadedFile = {
	body: Uint8Array;
	contentType?: string;
	contentLength?: number;
};
