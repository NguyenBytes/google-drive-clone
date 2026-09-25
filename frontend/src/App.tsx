import { useEffect, useState, type FormEvent } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router'
import { confirmSignUp, getCurrentUser, signIn, signOut, signUp } from 'aws-amplify/auth'
import { isAuthConfigured } from './auth'
import './App.css'

type AuthStatus = 'loading' | 'signedOut' | 'signedIn'
type AuthState = { status: AuthStatus; username: string | null }

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : 'Something went wrong. Please try again.'

function App() {
	const [auth, setAuth] = useState<AuthState>({ status: 'loading', username: null })

	const refreshAuth = async () => {
		if (!isAuthConfigured) {
			setAuth({ status: 'signedOut', username: null })
			return
		}
		try {
			const user = await getCurrentUser()
			setAuth({ status: 'signedIn', username: user.username })
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
				<Route element={<Layout auth={auth} setAuth={setAuth} />}>
					<Route index element={<HomePage auth={auth} />} />
					<Route path="login" element={<LoginPage auth={auth} refreshAuth={refreshAuth} />} />
					<Route element={<ProtectedRoute auth={auth} />}>
						<Route path="dashboard" element={<Dashboard auth={auth} />} />
					</Route>
					<Route path="*" element={<Navigate replace to="/" />} />
				</Route>
			</Routes>
		</BrowserRouter>
	)
}

function Layout({ auth, setAuth }: { auth: AuthState; setAuth: (state: AuthState) => void }) {
	const navigate = useNavigate()
	const handleSignOut = async () => {
		await signOut()
		setAuth({ status: 'signedOut', username: null })
		navigate('/')
	}

	return (
		<div className="app-shell">
			<header className="site-header">
				<Link className="brand" to="/">Drivebox</Link>
				<nav aria-label="Primary navigation">
					{auth.status === 'signedIn' ? (
						<>
							<Link to="/dashboard">Dashboard</Link>
							<button className="link-button" onClick={() => void handleSignOut()} type="button">Log out</button>
						</>
					) : <Link to="/login">Log in</Link>}
				</nav>
			</header>
			<main><Outlet /></main>
		</div>
	)
}

function HomePage({ auth }: { auth: AuthState }) {
	return (
		<section className="hero-section">
			<p className="eyebrow">Your files, in one place</p>
			<h1>Store, find, and share what matters.</h1>
			<p className="lead">A simple personal drive built with React, Cognito, and AWS.</p>
			{auth.status === 'loading' ? <p className="muted">Checking your session…</p> : (
				<Link className="button" to={auth.status === 'signedIn' ? '/dashboard' : '/login'}>
					{auth.status === 'signedIn' ? 'Open dashboard' : 'Get started'}
				</Link>
			)}
		</section>
	)
}

function LoginPage({ auth, refreshAuth }: { auth: AuthState; refreshAuth: () => Promise<void> }) {
	const navigate = useNavigate()
  const [mode, setMode] = useState<'signIn' | 'signUp' | 'confirm'>('signIn')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
	const [confirmationCode, setConfirmationCode] = useState('')
	const [message, setMessage] = useState('')
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	if (auth.status === 'signedIn') return <Navigate replace to="/dashboard" />

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError('')
		setMessage('')
		setSubmitting(true)
		try {
			if (mode === 'signIn') {
				const result = await signIn({ username, password })
				if (result.isSignedIn) {
					await refreshAuth()
					navigate('/dashboard')
				} else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
					setMode('confirm')
					setMessage('Confirm your account, then sign in.')
				} else {
					setError('This sign-in needs an additional step that is not configured yet.')
				}
				return
      }
      if (mode === 'signUp') {
        const result = await signUp({
          username,
          password,
          options: { userAttributes: { email } },
        })
				if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
					setMode('confirm')
					setMessage('Check for your confirmation code, then confirm your account.')
				} else {
					setMode('signIn')
					setMessage('Account created. You can now log in.')
				}
				return
			}
			await confirmSignUp({ username, confirmationCode })
			setMode('signIn')
			setMessage('Account confirmed. You can now log in.')
		} catch (caughtError) {
			setError(errorMessage(caughtError))
		} finally {
			setSubmitting(false)
		}
	}

	const isConfirmation = mode === 'confirm'
	return (
		<section className="auth-section">
			<form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
				<p className="eyebrow">{isConfirmation ? 'Verify account' : 'Welcome'}</p>
				<h1>{mode === 'signIn' ? 'Log in to Drivebox' : mode === 'signUp' ? 'Create your account' : 'Confirm your account'}</h1>
				{!isAuthConfigured && <p className="form-error">Authentication is not configured. Add the Cognito values to your frontend environment.</p>}
				{message && <p className="form-message">{message}</p>}
				{error && <p className="form-error">{error}</p>}
				<label>Username
          <input autoComplete="username" disabled={submitting || !isAuthConfigured} onChange={(event) => setUsername(event.target.value)} required value={username} />
        </label>
        {mode === 'signUp' && (
          <label>Email
            <input autoComplete="email" disabled={submitting || !isAuthConfigured} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
          </label>
        )}
        {isConfirmation ? (
					<label>Confirmation code
						<input autoComplete="one-time-code" disabled={submitting || !isAuthConfigured} inputMode="numeric" onChange={(event) => setConfirmationCode(event.target.value)} required value={confirmationCode} />
					</label>
				) : (
					<label>Password
						<input autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} disabled={submitting || !isAuthConfigured} minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
					</label>
				)}
				<button className="button" disabled={submitting || !isAuthConfigured} type="submit">
					{submitting ? 'Working…' : isConfirmation ? 'Confirm account' : mode === 'signIn' ? 'Log in' : 'Create account'}
				</button>
				{!isConfirmation && (
					<button className="text-button" disabled={submitting} onClick={() => { setError(''); setMessage(''); setMode(mode === 'signIn' ? 'signUp' : 'signIn') }} type="button">
						{mode === 'signIn' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
					</button>
				)}
			</form>
		</section>
	)
}

function ProtectedRoute({ auth }: { auth: AuthState }) {
	if (auth.status === 'loading') return <p className="page-status">Checking your session…</p>
	return auth.status === 'signedIn' ? <Outlet /> : <Navigate replace to="/login" />
}

function Dashboard({ auth }: { auth: AuthState }) {
	return (
		<section className="dashboard-section">
			<p className="eyebrow">Dashboard</p>
			<h1>Welcome back, {auth.username}.</h1>
			<p className="lead">Your protected file workspace will appear here.</p>
			<div className="empty-state"><h2>No files yet</h2><p>Connect the file API next to upload and browse your S3-backed files.</p></div>
		</section>
	)
}

export default App
