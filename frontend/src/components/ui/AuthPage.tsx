import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import {
	confirmSignUp,
	signIn,
	signInWithRedirect,
	signUp,
} from 'aws-amplify/auth'
import { isAuthConfigured, isGoogleAuthConfigured } from '../../auth'
import type { AuthState } from '../../types'
import { LoginArtwork } from './LoginArtwork'

type AuthPageProps = {
	initialMode: 'signIn' | 'signUp'
	auth: AuthState
	refreshAuth: () => Promise<void>
}

type LoginMode = 'signIn' | 'signUp' | 'confirm'

const messageFor = (error: unknown) =>
	error instanceof Error ? error.message : 'Something went wrong. Please try again.'

export function AuthPage({ auth, refreshAuth, initialMode }: AuthPageProps) {
	const navigate = useNavigate()
	const [mode, setMode] = useState<LoginMode>(initialMode)
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmationCode, setConfirmationCode] = useState('')
	const location = useLocation()
	const [notice, setNotice] = useState<string>(location.state?.notice ?? '')
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(false)

	if (auth.status === 'signedIn') {
		return <Navigate replace to="/dashboard" />
	}

	const continueWithGoogle = async () => {
		setError('')
		if (!isGoogleAuthConfigured) {
			setError('Google sign-in is not available yet. Please use your username and password.')
			return
		}
		setBusy(true)
		try {
			await signInWithRedirect({ provider: 'Google' })
		} catch (caught) {
			setError(messageFor(caught))
			setBusy(false)
		}
	}

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError('')
		setNotice('')
		setBusy(true)

		try {
			if (mode === 'signIn') {
				const result = await signIn({ username, password })

				if (result.isSignedIn) {
					await refreshAuth()
					navigate('/dashboard')
				} else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
					setMode('confirm')
					setNotice('Enter the code sent to your email.')
				} else {
					setError('This sign-in requires an additional step that is not configured yet.')
				}
			} else if (mode === 'signUp') {
				const result = await signUp({
					username,
					password,
					options: { userAttributes: { email } },
				})

				if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
					setMode('confirm')
					setNotice('Check your email for a confirmation code.')
				} else {
					navigate('/login', { replace: true, state: { notice: 'Account created. You can now log in.' } })
				}
			} else {
				await confirmSignUp({ username, confirmationCode })
				if (initialMode === 'signUp') {
					navigate('/login', { replace: true, state: { notice: 'Account confirmed. You can now log in.' } })
				} else {
					setMode('signIn')
					setNotice('Account confirmed. You can now log in.')
				}
			}
		} catch (caught) {
			setError(messageFor(caught))
		} finally {
			setBusy(false)
		}
	}

	const confirming = mode === 'confirm'
	const title = mode === 'signIn'
		? 'Log in to Drivebox'
		: mode === 'signUp'
			? 'Create your account'
			: 'Confirm your account'

	return (
		<section className="relative isolate grid min-w-0 flex-1 md:grid-cols-2" aria-label="Your Drivebox account">
			<LoginArtwork />

			<div className="relative z-10 flex min-w-0 items-center justify-center px-5 py-16 md:bg-base-100 md:px-8 lg:px-16">
			<form
				className="card w-full max-w-md border border-base-300/50 bg-base-100/95 shadow-2xl backdrop-blur-xl md:border-0 md:bg-transparent md:shadow-none md:backdrop-blur-none"
				onSubmit={(event) => void submit(event)}
			>
				<div className="card-body gap-5 p-6 sm:p-8 md:p-0">
					<div>
						<img src="/favicon.svg?v=2" alt="" className="mb-6 h-11 w-11" />
						<p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
							{confirming ? 'One last step' : mode === 'signIn' ? 'Your space awaits' : 'Make room for more'}
						</p>
						<h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
						<p className="mt-3 text-sm leading-6 text-base-content/60">
							{confirming ? 'Enter your email confirmation code to get started.' : mode === 'signIn' ? 'Pick up where you left off. Your files are waiting.' : 'A little more organized starts right here.'}
						</p>
					</div>

					{!isAuthConfigured && (
						<div className="alert alert-error text-sm">
							Authentication is not configured. Add the Cognito values to your frontend environment.
						</div>
					)}
					{notice && <div className="alert alert-info text-sm">{notice}</div>}
					{error && <div className="alert alert-error text-sm">{error}</div>}

					{!confirming && (
						<>
							<button
								className="btn w-full gap-3 rounded-xl border-base-300 bg-base-100 text-base-content hover:bg-base-200"
								disabled={busy}
								onClick={() => void continueWithGoogle()}
								type="button"
							>
								<svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
									<path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.36Z" />
									<path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
									<path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.34-2.59Z" />
									<path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.59A6 6 0 0 1 12 5.96Z" />
								</svg>
								Continue with Google
							</button>
							<div className="divider my-0 text-xs text-base-content/50">or continue with username</div>
						</>
					)}

					<label className="fieldset">
						<span className="fieldset-label">Username</span>
						<input
							className="input input-bordered w-full"
							autoComplete="username"
							disabled={busy || !isAuthConfigured}
							onChange={(event) => setUsername(event.target.value)}
							required
							value={username}
						/>
					</label>

					{mode === 'signUp' && (
						<label className="fieldset">
							<span className="fieldset-label">Email</span>
							<input
								className="input input-bordered w-full"
								autoComplete="email"
								disabled={busy || !isAuthConfigured}
								onChange={(event) => setEmail(event.target.value)}
								required
								type="email"
								value={email}
							/>
						</label>
					)}

					{confirming ? (
						<label className="fieldset">
							<span className="fieldset-label">Confirmation code</span>
							<input
								className="input input-bordered w-full"
								autoComplete="one-time-code"
								disabled={busy || !isAuthConfigured}
								inputMode="numeric"
								onChange={(event) => setConfirmationCode(event.target.value)}
								required
								value={confirmationCode}
							/>
						</label>
					) : (
						<label className="fieldset">
							<span className="fieldset-label">Password</span>
							<input
								className="input input-bordered w-full"
								autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
								disabled={busy || !isAuthConfigured}
								minLength={8}
								onChange={(event) => setPassword(event.target.value)}
								required
								type="password"
								value={password}
							/>
						</label>
					)}

					<button
						className="btn btn-primary mt-2 w-full rounded-xl"
						disabled={busy || !isAuthConfigured}
						type="submit"
					>
						{busy
							? 'Working…'
							: confirming
								? 'Confirm account'
								: mode === 'signIn'
									? 'Log in'
									: 'Create account'}
					</button>

					{!confirming && (
						<Link
							className="btn btn-ghost btn-sm"
							to={mode === 'signIn' ? '/signup' : '/login'}
							aria-disabled={busy}
							onClick={(event) => { if (busy) event.preventDefault() }}
						>
							{mode === 'signIn' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
						</Link>
					)}
				</div>
			</form>
			</div>
		</section>
	)
}
