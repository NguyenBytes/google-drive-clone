import { useEffect } from 'react'

const policies = {
	privacy: {
		title: 'Privacy Policy',
		sections: [
			['Information we handle', 'Drivebox handles the account information you provide, including your username, email address, and optional profile information. When you use Google sign-in, Google shares basic identity information with our authentication provider. Drivebox also handles the files you upload and their names, sizes, and related metadata.'],
			['How information is used', 'We use this information to sign you in, display your profile, and provide file storage and management. Google sign-in is used for authentication; it does not grant Drivebox access to your Google Drive files.'],
			['Service providers', 'Drivebox uses Amazon Web Services for authentication and file storage. Google processes sign-in requests when you choose Google login. These providers process information under their own applicable privacy policies.'],
			['Browser storage', 'Authentication uses browser storage to maintain your session. You can sign out and clear your browser storage to remove locally stored session information.'],
			['Google account permissions', 'Google sign-in requests basic identity permissions, including your account identifier, email address, and basic profile information. Amazon Cognito uses this information to authenticate you and associate your Google identity with a Drivebox account. Drivebox does not receive your Google password, and these permissions do not grant access to Gmail, contacts, or your Google Drive storage. You can review or revoke the connection in your Google Account settings. Revoking access does not automatically delete your Drivebox account or uploaded files.'],
			['File content and metadata', 'When you upload a file, Drivebox processes its content along with information such as its name, folder path, size, content type, and modification time. This information makes it possible to list, download, rename, replace, and delete files. File names and folder paths can contain personal information too. Only upload content you are authorized to store and share with the service.'],
			['Technical records', 'Requests to Drivebox and its infrastructure may generate technical records, including request times, network addresses, operation details, and error messages. These records may be used to diagnose failures, operate the service, and investigate misuse. Error records may contain file paths or other information associated with a failed operation.'],
			['Download links', 'Some downloads use temporary access links. Anyone who obtains a valid link may be able to download the associated file until the link expires. Keep these links private and share downloaded copies only with people you intend to receive them. Deleting a file does not remove copies that someone has already downloaded.'],
			['Storage and security', 'The current AWS infrastructure is configured in the US West region of the United States. Authentication and infrastructure providers may process information in other locations under their own terms. Authentication and access controls help protect information, but no online service can guarantee absolute security. Keep your sign-in credentials and devices secure, and maintain independent copies of important files.'],
			['Disclosure of information', 'Information is provided to authentication and storage providers as needed to operate Drivebox. Information may also be disclosed where required by applicable law or a valid legal request, or where necessary to address unlawful activity and protect the service or its users. This policy covers Drivebox; external websites and authentication providers have their own privacy policies.'],
			['Your choices and files', 'You can edit the profile fields available in your account and delete files through the dashboard. This policy does not promise a specific retention period for service logs or backup copies. Avoid uploading information you do not want processed by the service.'],
			['Retention and account deletion', 'Deleting a file through the dashboard requests its removal from active storage. Account records are separate from file content and are not automatically deleted when you remove a file, sign out, or clear browser storage. The current interface does not provide self-service account deletion. Retention periods for account records, logs, and any backup copies have not been fixed. Any copies retained for operational or legal purposes may have a different retention period from active files.'],
			['Privacy questions and requests', 'Depending on the laws that apply to you, you may have rights to access, correct, or delete personal information. For account or privacy requests, use the support contact shown on the Google sign-in consent screen. Verification of account ownership may be needed before a request can be completed. Do not include your password or authentication tokens in a request.'],
			['Updates', 'This policy may change as Drivebox develops. The date below identifies the latest update. Review this page periodically to understand the practices described here. Any additional notice or consent required by applicable law still applies.'],
		],
	},
	terms: {
		title: 'Terms of Service',
		sections: [
			['Using Drivebox', 'By using Drivebox, you agree to these terms. If you do not agree, stop using the service. Drivebox provides account access and tools to upload, view, organize, download, and delete files.'],
			['Your account', 'You are responsible for keeping your login credentials secure and for activity carried out through your account. Use accurate account information and do not access another person’s account without permission.'],
			['Your content', 'You retain ownership of your files. By uploading content, you permit Drivebox and its service providers to store and process it as needed to provide the service. Only upload content you have the right to use and store.'],
			['Permission to process content', 'Your permission allows Drivebox and its infrastructure providers to host, copy, transmit, and process content to carry out the file operations you request and maintain the service. Uploading a file does not transfer ownership to Drivebox. You are responsible for obtaining any permissions required to upload copyrighted material or information about other people.'],
			['Acceptable use', 'Do not use Drivebox for unlawful activity, distribute malware, infringe other people’s rights, or attempt to disrupt the service or bypass access controls.'],
			['Account access and third-party services', 'Do not impersonate another person, share stolen credentials, or access accounts without authorization. Secure devices on which you remain signed in. Google sign-in is an optional authentication method and does not connect Drivebox to your Google Drive files. Your use of Google and other providers is subject to their applicable terms, and provider outages or restrictions may affect your ability to access Drivebox.'],
			['File operations and sharing', 'Check selected files and destinations before replacing, renaming, or deleting content. These operations may overwrite or remove information and may not be reversible. Temporary download links can grant access to anyone who possesses them while they remain valid. You are responsible for deciding whom to give a link or downloaded copy.'],
			['Service limits', 'Drivebox may limit upload sizes, storage capacity, request rates, or supported operations as the project develops. Do not use automated requests to overwhelm the service, evade limits, probe other users’ accounts, or interfere with infrastructure. Features may be modified or discontinued, and maintenance or technical failures may interrupt access.'],
			['Availability and backups', 'Drivebox is a developing project and may change or become unavailable. Keep independent backups of important files. The service is provided as available, without a guarantee of uninterrupted access or recovery of lost files.'],
			['Privacy and confidential information', 'The Privacy Policy explains how account information, uploaded files, browser storage, and technical information are handled. Review it before using the service. Do not upload confidential or personal information unless you are authorized to provide it to Drivebox and its infrastructure providers.'],
			['Ending use and suspension', 'You can stop using Drivebox at any time and delete files through the dashboard. Download anything you want to keep before deleting it or losing account access. Access may be restricted or ended to address misuse, security issues, legal requirements, or discontinuation of the project. Signing out or revoking Google access does not delete your account or files. The current interface does not provide self-service account deletion; use the support contact on the Google sign-in consent screen for account requests.'],
			['Disclaimers and statutory rights', 'To the extent permitted by applicable law, Drivebox is provided as available without warranties of uninterrupted operation, suitability for a particular purpose, or recovery of lost content. You are responsible for deciding whether the service meets your needs. These terms do not exclude rights or remedies that cannot be excluded under applicable law, or remove obligations that the service operator is legally required to meet.'],
			['Changes and questions', 'These terms may be updated as the service develops. The date below identifies the latest version. Review them when continuing to use the service; any notice or consent requirements imposed by applicable law remain in effect. For questions about the service or these terms, use the support contact shown on the Google sign-in consent screen.'],
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
