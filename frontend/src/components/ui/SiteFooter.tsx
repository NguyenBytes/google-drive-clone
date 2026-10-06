export function SiteFooter() {
	return (
		<footer className="shrink-0 bg-primary px-4 py-5 text-center text-xs text-primary-content">
			© {new Date().getFullYear()} Drivebox
			<nav aria-label="Legal" className="mt-3 flex flex-wrap justify-center gap-x-6 gap-y-2">
				<Link className="link link-hover" to="/privacy">Privacy Policy</Link>
				<Link className="link link-hover" to="/terms">Terms of Service</Link>
			</nav>
		</footer>
	)
}
import { Link } from 'react-router'
