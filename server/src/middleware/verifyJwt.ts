import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { CognitoAccessTokenPayload } from "aws-jwt-verify/jwt-model";
import type { NextFunction, Request, Response } from "express";
import { safeHttpHandler } from "../utils/safeHttpHandler.js";

declare global {
	namespace Express {
		interface Request {
			auth?: CognitoAccessTokenPayload;
		}
	}
}

const createVerifier = () => {
	const userPoolId = process.env.COGNITO_USER_POOL_ID?.trim();
	const clientId = process.env.COGNITO_APP_CLIENT_ID?.trim();
	if (!userPoolId || !clientId) {
		throw new Error("COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID are required");
	}
	return CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "access" });
};

let verifier: ReturnType<typeof createVerifier> | undefined;

/** Verify a Cognito access token from Authorization: Bearer <JWT>. */
export const verifyJwt = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
	const token = /^Bearer[ \t]+(\S+)$/i.exec(request.get("Authorization")?.trim() ?? "")?.[1];
	if (!token) {
		response.setHeader("WWW-Authenticate", "Bearer");
		response.status(401).json({ error: "A Bearer token in the Authorization header is required" });
		return;
	}

	// Initialize after .env is loaded and reuse the verifier's signing-key cache.
	const [configurationError, jwtVerifier] = await safeHttpHandler(() => verifier ??= createVerifier());
	if (configurationError) {
		console.error("JWT verifier configuration failed", configurationError);
		response.status(500).json({ error: "Authentication is not configured correctly" });
		return;
	}

	// Verifies the signature, issuer, expiry, app client, and access-token type.
	const [verificationError, payload] = await safeHttpHandler(() => jwtVerifier.verify(token));
	if (verificationError) {
		response.setHeader("WWW-Authenticate", 'Bearer error="invalid_token"');
		response.status(401).json({ error: "Invalid or expired access token" });
		return;
	}

	request.auth = payload;
	next();
};
