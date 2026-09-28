import type { AuthState } from '../../types'
import { AuthPage } from '../ui/AuthPage'

type LoginPageProps = {
	auth: AuthState
	refreshAuth: () => Promise<void>
}

export function LoginPage({ auth, refreshAuth }: LoginPageProps) {
	return <AuthPage key="signIn" auth={auth} refreshAuth={refreshAuth} initialMode="signIn" />
}
