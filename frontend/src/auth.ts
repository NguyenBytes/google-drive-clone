const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID

export const isAuthConfigured = Boolean(userPoolId && userPoolClientId)

export const amplifyConfig = isAuthConfigured
	? {
		Auth: {
			Cognito: {
				userPoolId,
				userPoolClientId,
			},
		},
	}
	: null
