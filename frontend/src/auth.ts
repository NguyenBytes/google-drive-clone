import { Amplify } from '@aws-amplify/core'

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID

export const isAuthConfigured = Boolean(userPoolId && userPoolClientId)

if (isAuthConfigured) {
	Amplify.configure({
		Auth: {
			Cognito: {
				userPoolId,
				userPoolClientId,
			},
		},
	})
}
