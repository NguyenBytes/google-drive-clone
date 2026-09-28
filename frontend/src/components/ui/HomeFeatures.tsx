const features = [
	{
		title: 'Upload in a few clicks',
		description: 'Bring documents, images, and media together. Add individual files or upload a whole folder.',
		path: 'M12 16V4m-4 4 4-4 4 4M4 15v5h16v-5',
	},
	{
		title: 'Give everything a place',
		description: 'Create folders for your projects and personal files. Keep related work together from the start.',
		path: 'M3 7V5h6l2 2h10v13H3V7Z',
	},
	{
		title: 'Open it right here',
		description: 'Double-click a file to open its preview. View browser-supported files right inside your drive.',
		path: 'M3 5h18v14H3V5Zm0 4h18M7 7h.01M10 7h.01',
	},
]

export function HomeFeatures() {
	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
			{features.map((feature) => (
				<article key={feature.title} className="rounded-xl border border-base-300 p-5">
					<div className="mb-4 grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
						<svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path d={feature.path} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
						</svg>
					</div>
					<h3 className="text-sm font-semibold">{feature.title}</h3>
					<p className="mt-2 text-sm leading-6 text-base-content/60">{feature.description}</p>
				</article>
			))}
		</div>
	)
}
