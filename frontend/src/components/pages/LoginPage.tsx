import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import {
	confirmSignUp,
	signIn,
	signUp,
} from 'aws-amplify/auth'
import { isAuthConfigured } from '../../auth'
import type { AuthState } from '../../types'

type LoginPageProps = {
	auth: AuthState
	refreshAuth: () => Promise<void>
}

type LoginMode = 'signIn' | 'signUp' | 'confirm'

const messageFor = (error: unknown) =>
	error instanceof Error ? error.message : 'Something went wrong. Please try again.'

export function LoginPage({ auth, refreshAuth }: LoginPageProps) {
	const navigate = useNavigate()
	const [mode, setMode] = useState<LoginMode>('signIn')
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmationCode, setConfirmationCode] = useState('')
	const [notice, setNotice] = useState('')
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(false)

	if (auth.status === 'signedIn') {
		return <Navigate replace to="/dashboard" />
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
					setMode('signIn')
					setNotice('Account created. You can now log in.')
				}
			} else {
				await confirmSignUp({ username, confirmationCode })
				setMode('signIn')
				setNotice('Account confirmed. You can now log in.')
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
		<section className="hero flex-1 px-4 py-10">
			<form
				className="card w-full max-w-md bg-base-100 shadow-xl"
				onSubmit={(event) => void submit(event)}
			>
				<div className="card-body gap-4">
					<div>
						<div className="badge badge-primary badge-outline mb-3">
							{confirming ? 'Verify account' : 'Welcome'}
						</div>
						<h1 className="card-title text-3xl">{title}</h1>
					</div>

					{!isAuthConfigured && (
						<div className="alert alert-error text-sm">
							Authentication is not configured. Add the Cognito values to your frontend environment.
						</div>
					)}
					{notice && <div className="alert alert-info text-sm">{notice}</div>}
					{error && <div className="alert alert-error text-sm">{error}</div>}

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
						className="btn btn-primary w-full"
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
						<button
							className="btn btn-ghost btn-sm"
							disabled={busy}
							onClick={() => {
								setError('')
								setNotice('')
								setMode(mode === 'signIn' ? 'signUp' : 'signIn')
							}}
							type="button"
						>
							{mode === 'signIn'
								? 'Need an account? Sign up'
								: 'Already have an account? Log in'}
						</button>
					)}
				</div>
			</form>
		</section>
	)
}
