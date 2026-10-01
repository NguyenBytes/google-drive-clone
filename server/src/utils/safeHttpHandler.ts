export type SafeResult<T> = [error: Error, data: null] | [error: null, data: T];

/**
 * Wraps a promise to return a Go-style [error, data] tuple.
 * A callback also captures synchronous errors before a promise is created.
 */
export const safeHttpHandler = async <T>(operation: Promise<T> | (() => T | Promise<T>)): Promise<SafeResult<T>> => {
	try {
		const data = await (typeof operation === "function" ? operation() : operation);
		return [null, data];
	} catch (error) {
		return [error instanceof Error ? error : new Error("Operation failed", { cause: error }), null];
	}
};
