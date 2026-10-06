export type AuthState = {
	status: 'loading' | 'signedOut' | 'signedIn'
	username: string | null
	email?: string | null
	preferredUsername?: string | null
}

export const getAccountName = (auth: AuthState) =>
	auth.username?.toLowerCase().startsWith('google_')
		? auth.email || 'Google account'
		: auth.username

export const getDisplayName = (auth: AuthState) =>
	auth.preferredUsername || getAccountName(auth)

export type DriveFile = {
	isDirectory?: boolean
	key: string
	name: string
	size?: number
	lastModified?: string
	lastModifiedAt?: string
	eTag?: string
}
