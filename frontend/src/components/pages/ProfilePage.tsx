import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { deleteUserAttributes, fetchUserAttributes, updateUserAttributes } from 'aws-amplify/auth'
import type { AuthState } from '../../types'
import { getAccountName } from '../../types'

const messageFor = (error: unknown) =>
	error instanceof Error ? error.message : 'Something went wrong. Please try again.'

type ProfilePageProps = {
	auth: AuthState
	setAuth: (value: AuthState) => void
}

export function ProfilePage({ auth, setAuth }: ProfilePageProps) {
	const [email, setEmail] = useState('')
	const [preferredUsername, setPreferredUsername] = useState('')
	const [savedPreferredUsername, setSavedPreferredUsername] = useState('')
	const [notice, setNotice] = useState('')
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(true)
	const accountName = getAccountName(auth)

	useEffect(() => {
		const loadProfile = async () => {
			try {
				const attributes = await fetchUserAttributes()
				setEmail(attributes.email ?? '')
				setPreferredUsername(attributes.preferred_username ?? '')
				setSavedPreferredUsername(attributes.preferred_username ?? '')
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
			const nextPreferredUsername = preferredUsername.trim()

			if (nextPreferredUsername !== savedPreferredUsername) {
				if (nextPreferredUsername) {
					await updateUserAttributes({
						userAttributes: { preferred_username: nextPreferredUsername },
					})
				} else {
					await deleteUserAttributes({ userAttributeKeys: ['preferred_username'] })
				}

				setSavedPreferredUsername(nextPreferredUsername)
				setPreferredUsername(nextPreferredUsername)
				setAuth({ ...auth, preferredUsername: nextPreferredUsername || null })
			}

			const result = await updateUserAttributes({ userAttributes: { email } })
			const nextStep = result.email?.nextStep.updateAttributeStep
			const attributes = await fetchUserAttributes()
			setAuth({
				...auth,
				email: attributes.email?.trim() || null,
				preferredUsername: attributes.preferred_username?.trim() || null,
			})
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
						<input className="input input-bordered w-full" disabled value={accountName ?? ''} />
					</label>

					<label className="fieldset">
						<span className="fieldset-label">Display name</span>
						<input
							className="input input-bordered w-full"
							autoComplete="nickname"
							disabled={busy}
							onChange={(event) => setPreferredUsername(event.target.value)}
							placeholder={accountName ?? ''}
							type="text"
							value={preferredUsername}
						/>
						<span className="text-xs text-base-content/60">
							Shown throughout Drivebox. Leave blank to use your Google email or account username.
						</span>
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
