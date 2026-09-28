type FolderBreadcrumbsProps = {
	prefix: string
	rootPrefix: string
}

export function FolderBreadcrumbs({ prefix, rootPrefix }: FolderBreadcrumbsProps) {
	const relativePath = prefix.startsWith(rootPrefix) ? prefix.slice(rootPrefix.length) : ''
	const folders = relativePath.split('/').filter(Boolean)
	const segments = ['My files', ...folders]

	return (
		<nav aria-label="Current folder" className="breadcrumbs min-w-0 flex-1 overflow-x-auto text-xs text-blue-600 sm:text-sm">
			<ol>
				{segments.map((segment, index) => (
					<li key={index}>
						<span
							aria-current={index === segments.length - 1 ? 'location' : undefined}
							className={index === segments.length - 1 ? 'font-medium' : undefined}
						>
							{segment}
						</span>
					</li>
				))}
			</ol>
		</nav>
	)
}
