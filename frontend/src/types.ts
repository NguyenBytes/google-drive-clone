export type AuthState = {
	status: 'loading' | 'signedOut' | 'signedIn'
	username: string | null
}

export type DriveFile = {
	key: string
	name: string
	size?: number
	lastModified?: string
	eTag?: string
}
