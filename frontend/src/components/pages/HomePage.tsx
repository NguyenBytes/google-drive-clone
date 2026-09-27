import { Link } from 'react-router'
import type { AuthState } from '../../types'

export function HomePage({ auth }: { auth: AuthState }) {
	return (
		<section className="hero min-h-[calc(100vh-65px)]">
			<div className="hero-content max-w-3xl text-center">
				<div>
					<div className="badge badge-primary badge-outline mb-5">
						Your files, in one place
					</div>
					<h1 className="text-5xl font-bold sm:text-6xl">
						Store, find, and share what matters.
					</h1>
					<p className="py-6 text-lg text-base-content/70">
						A simple personal drive built with React, Cognito, and AWS.
					</p>
					{auth.status === 'loading' ? (
						<span aria-label="Checking session" className="loading loading-dots loading-md" />
					) : (
						<Link
							className="btn btn-primary"
							to={auth.status === 'signedIn' ? '/dashboard' : '/login'}
						>
							{auth.status === 'signedIn' ? 'Open dashboard' : 'Get started'}
						</Link>
					)}
				</div>
			</div>
		</section>
	)
}
