type FolderBreadcrumbsProps = {
	prefix: string
	rootPrefix: string
	onNavigate: (prefix: string) => void
}

export function FolderBreadcrumbs({ prefix, rootPrefix, onNavigate }: FolderBreadcrumbsProps) {
	const relativePath = prefix.startsWith(rootPrefix) ? prefix.slice(rootPrefix.length) : ''
	const folders = relativePath.split('/').filter(Boolean)
	const segments = ['My files', ...folders]

	return (
		<nav aria-label="Current folder" className="breadcrumbs min-w-0 flex-1 overflow-x-auto text-xs text-blue-600 sm:text-sm">
			<ol>
				{segments.map((segment, index) => (
					<li key={index}>
						{index === segments.length - 1 ? (
							<span aria-current="location" className="font-medium">{segment}</span>
						) : (
							<button
								className="hover:underline"
								onClick={() => onNavigate(rootPrefix + folders.slice(0, index).map((folder) => `${folder}/`).join(''))}
								type="button"
							>
								{segment}
							</button>
						)}
					</li>
				))}
			</ol>
		</nav>
	)
}
