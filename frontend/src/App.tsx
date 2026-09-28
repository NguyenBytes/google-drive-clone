import { useEffect, useState } from 'react'
import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
} from 'react-router'
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth'
import { isAuthConfigured } from './auth'
import { Dashboard } from './components/pages/Dashboard'
import { HomePage } from './components/pages/HomePage'
import { LoginPage } from './components/pages/LoginPage'
import { ProfilePage } from './components/pages/ProfilePage'
import { ProtectedRoute } from './components/ui/ProtectedRoute'
import { SiteLayout } from './components/ui/SiteLayout'
import type { AuthState } from './types'

function App() {
	const [auth, setAuth] = useState<AuthState>({
		status: 'loading',
		username: null,
	})

	const refreshAuth = async () => {
		if (!isAuthConfigured) {
			setAuth({ status: 'signedOut', username: null })
			return
		}

		try {
			const user = await getCurrentUser()
			const attributes = await fetchUserAttributes().catch(() => null)

			setAuth({
				status: 'signedIn',
				username: user.username,
				preferredUsername: attributes?.preferred_username?.trim() || null,
			})
		} catch {
			setAuth({ status: 'signedOut', username: null })
		}
	}

	useEffect(() => {
		void refreshAuth()
	}, [])

	return (
		<BrowserRouter>
			<Routes>
				<Route element={<SiteLayout auth={auth} setAuth={setAuth} />}>
					<Route index element={<HomePage auth={auth} />} />
					<Route
						path="login"
						element={<LoginPage auth={auth} refreshAuth={refreshAuth} />}
					/>
					<Route element={<ProtectedRoute auth={auth} />}>
						<Route path="dashboard" element={<Dashboard key={auth.username} auth={auth} />} />
						<Route path="profile" element={<ProfilePage auth={auth} setAuth={setAuth} />} />
					</Route>
					<Route path="*" element={<Navigate replace to="/" />} />
				</Route>
			</Routes>
		</BrowserRouter>
	)
}

export default App
