export function HomeArtwork() {
	return (
		<div className="relative mx-auto mt-8 max-w-xl overflow-hidden rounded-3xl bg-[#111438]">
			<div className="absolute -right-10 -top-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
			<svg aria-hidden="true" viewBox="0 0 600 260" fill="none" className="relative w-full">
				<ellipse cx="300" cy="138" rx="250" ry="91" stroke="#818cf8" strokeOpacity=".25" />
				<ellipse cx="300" cy="138" rx="190" ry="64" stroke="#a5b4fc" strokeOpacity=".2" strokeDasharray="4 8" />
				<g transform="rotate(-12 140 120)">
					<rect x="96" y="65" width="85" height="113" rx="12" fill="#e0e7ff" />
					<rect x="109" y="79" width="59" height="49" rx="6" fill="#a5b4fc" />
					<path d="m112 118 17-22 15 17 10-10 12 15" stroke="#6366f1" strokeWidth="4" strokeLinejoin="round" />
					<path d="M111 143h49m-49 13h31" stroke="#818cf8" strokeWidth="4" strokeLinecap="round" />
				</g>
				<g transform="rotate(10 462 135)">
					<rect x="420" y="84" width="84" height="105" rx="12" fill="#a5f3fc" />
					<path d="M437 105h35m-35 15h50m-50 15h42m-42 15h50" stroke="#0891b2" strokeWidth="4" strokeLinecap="round" />
				</g>
				<path d="M222 91a12 12 0 0 1 12-12h45l17 18h64a14 14 0 0 1 14 14v80a14 14 0 0 1-14 14H236a14 14 0 0 1-14-14Z" fill="#6366f1" />
				<path d="M224 131a12 12 0 0 1 12-13h134a12 12 0 0 1 12 15l-13 60a16 16 0 0 1-16 12H245a16 16 0 0 1-16-14Z" fill="#a5b4fc" />
				<path d="m286 153 16-9 16 9v19l-16 9-16-9Zm0 0 16 9 16-9m-16 9v19" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
				<circle cx="381" cy="70" r="20" fill="#67e8f9" />
				<path d="m373 70 6 6 11-12" stroke="#155e75" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M194 44v12m-6-6h12M409 207v12m-6-6h12" stroke="#c7d2fe" strokeWidth="2" strokeLinecap="round" />
				<circle cx="74" cy="188" r="4" fill="#67e8f9" />
				<circle cx="521" cy="65" r="4" fill="#a5b4fc" />
			</svg>
		</div>
	)
}

export function FeatureArtwork({ index }: { index: number }) {
	return (
		<svg aria-hidden="true" viewBox="0 0 240 120" fill="none" className="mb-5 w-full rounded-xl bg-indigo-950">
			<circle cx="120" cy="60" r="46" stroke="#818cf8" strokeOpacity=".35" strokeDasharray="3 6" />
			{index === 0 ? (
				<>
					<rect x="82" y="31" width="64" height="71" rx="9" fill="#818cf8" transform="rotate(-12 82 31)" />
					<rect x="94" y="23" width="60" height="74" rx="9" fill="#e0e7ff" />
					<path d="M124 76V43m-13 13 13-13 13 13" stroke="#6366f1" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
				</>
			) : index === 1 ? (
				<>
					<path d="M73 41a8 8 0 0 1 8-8h32l12 12h34a8 8 0 0 1 8 8v34H73Z" fill="#818cf8" />
					<path d="M78 59h95l-9 32H84Z" fill="#c7d2fe" />
					<path d="M109 70h28" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
				</>
			) : (
				<>
					<rect x="69" y="29" width="102" height="64" rx="9" fill="#a5f3fc" />
					<path d="M69 43h102" stroke="#0891b2" strokeWidth="2" />
					<circle cx="79" cy="36" r="2" fill="#0891b2" />
					<path d="m112 53 21 13-21 13Z" fill="#0891b2" />
				</>
			)}
			<circle cx="183" cy="34" r="4" fill="#67e8f9" />
			<path d="M55 74v10m-5-5h10" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
		</svg>
	)
}
