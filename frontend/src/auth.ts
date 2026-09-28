const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID
const oauthDomain = (import.meta.env.VITE_COGNITO_DOMAIN ?? '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
const redirectSignIn = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN || `${window.location.origin}/login`
const redirectSignOut = import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT || `${window.location.origin}/`

export const isAuthConfigured = Boolean(userPoolId && userPoolClientId)
export const isGoogleAuthConfigured = isAuthConfigured && Boolean(oauthDomain)

export const amplifyConfig = isAuthConfigured
	? {
		Auth: {
			Cognito: {
				userPoolId,
				userPoolClientId,
				...(oauthDomain ? {
					loginWith: {
						oauth: {
							domain: oauthDomain,
							scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
							redirectSignIn: [redirectSignIn],
							redirectSignOut: [redirectSignOut],
							responseType: 'code' as const,
						},
					},
				} : {}),
			},
		},
	}
	: null
