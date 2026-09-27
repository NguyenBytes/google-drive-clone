import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth'
import type { AuthState } from '../../types'

const messageFor = (error: unknown) =>
	error instanceof Error ? error.message : 'Something went wrong. Please try again.'

export function ProfilePage({ auth }: { auth: AuthState }) {
	const [email, setEmail] = useState('')
	const [notice, setNotice] = useState('')
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(true)

	useEffect(() => {
		const loadProfile = async () => {
			try {
				const attributes = await fetchUserAttributes()
				setEmail(attributes.email ?? '')
			} catch (caught) {
				setError(messageFor(caught))
			} finally {
				setBusy(false)
			}
		}

		void loadProfile()
	}, [])

	const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError('')
		setNotice('')
		setBusy(true)

		try {
			const result = await updateUserAttributes({ userAttributes: { email } })
			const nextStep = result.email?.nextStep.updateAttributeStep
			setNotice(
				nextStep === 'CONFIRM_ATTRIBUTE_WITH_CODE'
					? 'Check your new email for a verification code.'
					: 'Profile updated.',
			)
		} catch (caught) {
			setError(messageFor(caught))
		} finally {
			setBusy(false)
		}
	}

	return (
		<section className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
			<div className="mb-6">
				<div className="badge badge-primary badge-outline mb-3">Account</div>
				<h1 className="text-3xl font-bold">Profile settings</h1>
				<p className="mt-2 text-base-content/70">
					Manage the information associated with your Drivebox account.
				</p>
			</div>

			<form className="card bg-base-100 shadow-sm" onSubmit={(event) => void saveProfile(event)}>
				<div className="card-body gap-5">
					{error && <div className="alert alert-error text-sm">{error}</div>}
					{notice && <div className="alert alert-success text-sm">{notice}</div>}

					<label className="fieldset">
						<span className="fieldset-label">Username</span>
						<input className="input input-bordered w-full" disabled value={auth.username ?? ''} />
					</label>
					<label className="fieldset">
						<span className="fieldset-label">Email address</span>
						<input
							className="input input-bordered w-full"
							autoComplete="email"
							disabled={busy}
							onChange={(event) => setEmail(event.target.value)}
							required
							type="email"
							value={email}
						/>
					</label>

					<div className="card-actions justify-end">
						<Link className="btn btn-ghost" to="/dashboard">Cancel</Link>
						<button className="btn btn-primary" disabled={busy} type="submit">
							{busy ? 'Loading…' : 'Save changes'}
						</button>
					</div>
				</div>
			</form>
		</section>
	)
}
