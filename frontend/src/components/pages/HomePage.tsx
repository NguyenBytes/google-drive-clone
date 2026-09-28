import { Link } from 'react-router'
import type { AuthState } from '../../types'
import { HomeDrivePreview } from '../ui/HomeDrivePreview'
import { HomeFeatures } from '../ui/HomeFeatures'

export function HomePage({ auth }: { auth: AuthState }) {
	const destination = auth.status === 'signedIn' ? '/dashboard' : '/login'
	const actionLabel = auth.status === 'signedIn' ? 'Open your drive' : 'Get started'

	return (
		<div className="flex-1 bg-base-100 pb-10">
			<div className="mx-auto w-full px-4 md:w-2/3 md:px-6">
				<section className="pb-10 pt-12 text-center sm:pt-16 lg:pt-20" aria-labelledby="home-title">
					<p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
						Your personal cloud drive
					</p>
					<h1
						id="home-title"
						className="mx-auto max-w-[18ch] text-4xl font-semibold leading-[1.12] tracking-tight lg:text-5xl 2xl:text-6xl"
					>
						Everything important.
						<br />
						<span className="text-primary">In one place.</span>
					</h1>
					<p className="mx-auto mt-5 max-w-md text-base leading-7 text-base-content/65">
						A home for your documents, photos, and projects. Upload your files,
						keep them organized, and open them whenever you need them.
					</p>

					<div className="mt-6 flex min-h-12 flex-wrap items-center justify-center gap-3">
						{auth.status === 'loading' ? (
							<span aria-label="Checking your account" className="loading loading-dots loading-md" />
						) : (
							<Link className="btn btn-primary rounded-lg px-6" to={destination}>
								{actionLabel}
								<span aria-hidden="true">→</span>
							</Link>
						)}
						<a className="btn btn-ghost rounded-lg" href="#features">Explore Drivebox</a>
					</div>
				</section>

				<HomeDrivePreview />

				<section id="features" className="scroll-mt-8 py-12 lg:py-16" aria-labelledby="features-title">
					<div className="mb-6">
						<h2 id="features-title" className="text-2xl font-semibold tracking-tight">
						A simpler way to keep your files.
						</h2>
						<p className="mt-2 text-sm leading-6 text-base-content/60">
							The everyday essentials, with room to focus on your work.
						</p>
					</div>
					<HomeFeatures />
				</section>

				<section className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-base-300 bg-base-200/50 p-6 sm:p-8">
					<div className="max-w-sm">
						<h2 className="text-xl font-semibold tracking-tight">Your next project starts here.</h2>
						<p className="mt-2 text-sm leading-6 text-base-content/60">
							Sign in, add your first file, and make yourself at home.
						</p>
					</div>
					{auth.status !== 'loading' && (
						<Link className="btn btn-primary shrink-0 rounded-lg" to={destination}>
							{actionLabel}
							<span aria-hidden="true">→</span>
						</Link>
					)}
				</section>

			</div>
		</div>
	)
}
