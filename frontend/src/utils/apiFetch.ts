import { fetchAuthSession } from 'aws-amplify/auth'

/** Send an API request with the current Cognito access token. */
export async function apiFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
	init.signal?.throwIfAborted()
	const session = await fetchAuthSession()
	init.signal?.throwIfAborted()
	const accessToken = session.tokens?.accessToken.toString()
	if (!accessToken) throw new Error('Please sign in to continue.')

	const headers = new Headers(init.headers)
	headers.set('Authorization', `Bearer ${accessToken}`)
	return fetch(input, { ...init, headers })
}
