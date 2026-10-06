import { useEffect, useState } from 'react'
import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
} from 'react-router'
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { isAuthConfigured } from './auth'
import { Dashboard } from './components/pages/Dashboard'
import { HomePage } from './components/pages/HomePage'
import { LoginPage } from './components/pages/LoginPage'
import { SignupPage } from './components/pages/SignupPage'
import { ProfilePage } from './components/pages/ProfilePage'
import { LegalPage } from './components/pages/LegalPage'
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
				email: attributes?.email?.trim() || null,
				preferredUsername: attributes?.preferred_username?.trim() || null,
			})
		} catch {
			setAuth({ status: 'signedOut', username: null })
		}
	}

	useEffect(() => {
		const stopListening = Hub.listen('auth', ({ payload }) => {
			if (payload.event === 'signedIn' || payload.event === 'signInWithRedirect') {
				void refreshAuth()
			}
		})
		void refreshAuth()
		return stopListening
	}, [])

	return (
		<BrowserRouter>
			<Routes>
				<Route element={<SiteLayout auth={auth} setAuth={setAuth} />}>
					<Route index element={<HomePage auth={auth} />} />
					<Route path="privacy" element={<LegalPage policy="privacy" />} />
					<Route path="terms" element={<LegalPage policy="terms" />} />
					<Route
						path="login"
						element={<LoginPage auth={auth} refreshAuth={refreshAuth} />}
					/>
					<Route path="signup" element={<SignupPage auth={auth} refreshAuth={refreshAuth} />} />
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
