export type AuthState = {
	status: 'loading' | 'signedOut' | 'signedIn'
	username: string | null
	preferredUsername?: string | null
}

export type DriveFile = {
	key: string
	name: string
	size?: number
	lastModified?: string
	lastModifiedAt?: string
	eTag?: string
}
