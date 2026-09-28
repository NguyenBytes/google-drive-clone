import { Navigate, Outlet } from 'react-router'
import type { AuthState } from '../../types'

export function ProtectedRoute({ auth }: { auth: AuthState }) {
	if (auth.status === 'loading') {
		return (
			<div className="grid flex-1 place-items-center">
				<span aria-label="Checking session" className="loading loading-spinner loading-lg" />
			</div>
		)
	}

	return auth.status === 'signedIn' ? <Outlet /> : <Navigate replace to="/login" />
}
