import { Link, Outlet, useNavigate } from 'react-router'
import { signOut } from 'aws-amplify/auth'
import type { AuthState } from '../../types'
import { getDisplayName } from '../../types'
import { SiteFooter } from './SiteFooter'

type SiteLayoutProps = {
	auth: AuthState
	setAuth: (value: AuthState) => void
}

export function SiteLayout({ auth, setAuth }: SiteLayoutProps) {
	const navigate = useNavigate()
	const displayName = getDisplayName(auth)

	const logout = async () => {
		await signOut()
		setAuth({ status: 'signedOut', username: null })
		navigate('/')
	}

	return (
		<div className="flex min-h-dvh min-w-0 max-w-full flex-col bg-base-200">
			<header className="border-b border-base-300 bg-base-100 shadow-sm">
			<div className="navbar mx-auto w-full min-w-0 gap-2 px-4 md:w-2/3 md:px-6 xl:w-2/3">
				<Link
					className="btn btn-ghost shrink-0 gap-3 px-2 text-xl normal-case"
					to={auth.status === 'signedIn' ? '/dashboard' : '/'}
				>
					<img
						alt=""
						className="h-8 w-8 shrink-0"
						src="/favicon.svg?v=2"
						width={32}
						height={32}
					/>
					Drivebox
				</Link>

				{auth.status === 'signedIn' && (
					<label className="input input-bordered mx-auto hidden min-w-0 flex-1 max-w-xl items-center gap-2 rounded-full bg-base-200 md:flex">
						<svg
							aria-hidden="true"
							className="h-4 w-4 opacity-60"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<circle cx="11" cy="11" r="7" strokeWidth="2" />
							<path d="m20 20-4-4" strokeWidth="2" />
						</svg>
						<input className="min-w-0 w-full" aria-label="Search Drivebox" placeholder="Search in Drivebox" type="search" />
					</label>
				)}

				<nav className="ml-auto flex shrink-0 gap-2" aria-label="Primary navigation">
					{auth.status === 'signedIn' ? (
						<details className="dropdown dropdown-end">
							<summary
								className="btn btn-ghost btn-circle avatar placeholder"
								aria-label="Open profile menu"
							>
								<div className="w-9 rounded-full bg-primary text-primary-content">
									<span className="inline-block translate-y-1/4">
										{displayName?.slice(0, 1).toUpperCase()}
									</span>
								</div>
							</summary>
							<ul className="menu dropdown-content z-20 mt-3 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow">
								<li className="menu-title">
									<span className="truncate">{displayName}</span>
								</li>
								<li><Link to="/profile">Profile settings</Link></li>
								<li><button onClick={() => void logout()} type="button">Log out</button></li>
							</ul>
						</details>
					) : (
						<Link className="btn btn-primary btn-sm" to="/login">Log in</Link>
					)}
				</nav>
			</div>
			</header>
			<main className="flex min-w-0 flex-1 flex-col">
				<Outlet />
			</main>

			<SiteFooter />
		</div>
	)
}
