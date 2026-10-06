import { useEffect } from 'react'

const policies = {
	privacy: {
		title: 'Privacy Policy',
		sections: [
			['Information we handle', 'Drivebox handles the account information you provide, including your username, email address, and optional profile information. When you use Google sign-in, Google shares basic identity information with our authentication provider. Drivebox also handles the files you upload and their names, sizes, and related metadata.'],
			['How information is used', 'We use this information to sign you in, display your profile, and provide file storage and management. Google sign-in is used for authentication; it does not grant Drivebox access to your Google Drive files.'],
			['Service providers', 'Drivebox uses Amazon Web Services for authentication and file storage. Google processes sign-in requests when you choose Google login. These providers process information under their own applicable privacy policies.'],
			['Browser storage', 'Authentication uses browser storage to maintain your session. You can sign out and clear your browser storage to remove locally stored session information.'],
			['Your choices and files', 'You can edit the profile fields available in your account and delete files through the dashboard. This policy does not promise a specific retention period for service logs or backup copies. Avoid uploading information you do not want processed by the service.'],
			['Updates', 'This policy may change as Drivebox develops. The date below identifies the latest update.'],
		],
	},
	terms: {
		title: 'Terms of Service',
		sections: [
			['Using Drivebox', 'By using Drivebox, you agree to these terms. If you do not agree, stop using the service. Drivebox provides account access and tools to upload, view, organize, download, and delete files.'],
			['Your account', 'You are responsible for keeping your login credentials secure and for activity carried out through your account. Use accurate account information and do not access another person’s account without permission.'],
			['Your content', 'You retain ownership of your files. By uploading content, you permit Drivebox and its service providers to store and process it as needed to provide the service. Only upload content you have the right to use and store.'],
			['Acceptable use', 'Do not use Drivebox for unlawful activity, distribute malware, infringe other people’s rights, or attempt to disrupt the service or bypass access controls.'],
			['Availability and backups', 'Drivebox is a developing project and may change or become unavailable. Keep independent backups of important files. The service is provided as available, without a guarantee of uninterrupted access or recovery of lost files.'],
			['Ending use and changes', 'You can stop using Drivebox at any time and delete your files through the dashboard. Access may be restricted for misuse. These terms may be updated as the service develops; review them when continuing to use the service.'],
		],
	},
}

export function LegalPage({ policy }: { policy: keyof typeof policies }) {
	const { title, sections } = policies[policy]

	useEffect(() => {
		window.scrollTo(0, 0)
		document.title = `${title} | Drivebox`
		return () => { document.title = 'Drivebox' }
	}, [title])

	return (
		<article className="mx-auto w-full max-w-3xl px-5 py-12 md:px-8">
			<h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
			<p className="mt-3 text-sm text-base-content/70">Last updated: October 5, 2026</p>
			<div className="mt-10 space-y-8">
				{sections.map(([heading, body]) => (
					<section key={heading}>
						<h2 className="text-xl font-semibold">{heading}</h2>
						<p className="mt-3 leading-7 text-base-content/80">{body}</p>
					</section>
				))}
			</div>
		</article>
	)
}
