import type { AuthState } from '../../types'
import { AuthPage } from '../ui/AuthPage'

type SignupPageProps = {
	auth: AuthState
	refreshAuth: () => Promise<void>
}

export function SignupPage({ auth, refreshAuth }: SignupPageProps) {
	return <AuthPage key="signUp" auth={auth} refreshAuth={refreshAuth} initialMode="signUp" />
}
