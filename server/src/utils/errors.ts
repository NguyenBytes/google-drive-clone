import type { Response } from "express";

export const sendServiceError = (response: Response, error: unknown): void => {
	console.error("S3 request failed", error);

	const isConfigurationError =
		error instanceof Error && error.message === "S3_BUCKET_NAME is not configured";

	response.status(isConfigurationError ? 500 : 502).json({
		error: isConfigurationError
			? "S3_BUCKET_NAME is not configured"
			: "Unable to complete S3 request",
	});
};

