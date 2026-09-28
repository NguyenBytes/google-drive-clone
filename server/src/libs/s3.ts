import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-west-2" });

export const getBucket = (): string => {
	const bucket = process.env.S3_BUCKET_NAME;

	if (!bucket) {
		throw new Error("S3_BUCKET_NAME is not configured");
	}

	return bucket;
};

