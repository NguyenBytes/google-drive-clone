const sampleFiles = [
	{ name: 'Project overview.pdf', type: 'PDF', detail: 'Document', size: '2.4 MB', color: 'bg-red-500/10 text-red-600' },
	{ name: 'Weekend photos.jpg', type: 'JPG', detail: 'Image', size: '1.8 MB', color: 'bg-blue-500/10 text-blue-600' },
	{ name: 'Meeting notes.txt', type: 'TXT', detail: 'Text file', size: '12 KB', color: 'bg-emerald-500/10 text-emerald-600' },
]

export function HomeDrivePreview() {
	return (
		<figure className="m-0 rounded-2xl border border-base-300 bg-base-200/50 p-3 sm:p-5">
			<div className="overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm">
				<div className="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-4 sm:px-6">
					<div className="flex items-center gap-3">
						<span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-content">D</span>
						<span className="text-sm font-semibold">My Drive</span>
					</div>
					<span className="rounded-full bg-base-200 px-3 py-1 text-xs text-base-content/60">Preview</span>
				</div>

				<div className="flex items-center justify-between px-4 pb-2 pt-4 text-xs text-base-content/50 sm:px-6">
					<span>Name</span>
					<span className="hidden sm:inline">Size</span>
				</div>
				<ul className="divide-y divide-base-200 px-4 pb-2 sm:px-6">
					{sampleFiles.map((file) => (
						<li key={file.name} className="flex items-center gap-3 py-4">
							<span aria-hidden="true" className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${file.color}`}>
								{file.type}
							</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{file.name}</p>
								<p className="mt-0.5 text-xs text-base-content/50">{file.detail}</p>
							</div>
							<span className="hidden shrink-0 text-xs tabular-nums text-base-content/50 sm:inline">{file.size}</span>
						</li>
					))}
				</ul>
			</div>
			<figcaption className="pt-3 text-center text-xs text-base-content/50">
				A look inside Drivebox · Example files
			</figcaption>
		</figure>
	)
}
