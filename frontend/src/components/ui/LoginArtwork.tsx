export function LoginArtwork() {
	return (
		<div className="absolute inset-0 overflow-hidden bg-[#111438] md:relative md:flex md:min-h-[640px] md:flex-col md:justify-between md:p-10 lg:p-16">
			<div className="pointer-events-none absolute -left-32 top-0 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />
			<div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

			<div className="relative z-10 hidden items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-indigo-200 md:flex">
				<span className="h-2 w-2 rounded-full bg-cyan-300" />
				Room for your next idea
			</div>

			<svg
				aria-hidden="true"
				className="absolute inset-0 h-full w-full opacity-60 md:relative md:my-8 md:h-auto md:opacity-100"
				viewBox="0 0 520 440"
				fill="none"
			>
				<defs>
					<linearGradient id="login-folder" x1="140" y1="170" x2="360" y2="350" gradientUnits="userSpaceOnUse">
						<stop stopColor="#a5b4fc" />
						<stop offset="1" stopColor="#6366f1" />
					</linearGradient>
					<linearGradient id="login-front" x1="160" y1="230" x2="370" y2="340" gradientUnits="userSpaceOnUse">
						<stop stopColor="#e0e7ff" />
						<stop offset="1" stopColor="#818cf8" />
					</linearGradient>
				</defs>
				<circle cx="260" cy="220" r="195" stroke="#818cf8" strokeOpacity=".16" />
				<circle cx="260" cy="220" r="150" stroke="#818cf8" strokeOpacity=".24" strokeDasharray="4 10" />
				<ellipse cx="260" cy="367" rx="125" ry="16" fill="#080c29" opacity=".5" />
				<g transform="rotate(-12 177 169)">
					<rect x="114" y="89" width="112" height="145" rx="14" fill="#f8fafc" />
					<rect x="132" y="110" width="76" height="57" rx="7" fill="#c7d2fe" />
					<path d="m135 158 22-25 18 18 12-12 18 19" stroke="#6366f1" strokeWidth="5" strokeLinejoin="round" />
					<circle cx="192" cy="124" r="6" fill="#f8fafc" />
					<path d="M134 187h65m-65 14h41" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
				</g>
				<g transform="rotate(12 311 155)">
					<rect x="262" y="84" width="105" height="141" rx="14" fill="#a5f3fc" />
					<path d="M283 112h38m-38 18h62m-62 18h53m-53 18h62" stroke="#0891b2" strokeOpacity=".5" strokeWidth="6" strokeLinecap="round" />
				</g>
				<path d="M128 196a16 16 0 0 1 16-16h68l23 24h130a16 16 0 0 1 16 16v109a20 20 0 0 1-20 20H148a20 20 0 0 1-20-20Z" fill="url(#login-folder)" />
				<path d="M142 245a16 16 0 0 1 16-17h214a14 14 0 0 1 14 17l-17 88a20 20 0 0 1-20 16H167a20 20 0 0 1-20-18Z" fill="url(#login-front)" />
				<path d="m237 280 23-13 23 13v26l-23 13-23-13Zm0 0 23 13 23-13m-23 13v26" stroke="white" strokeWidth="3" strokeLinejoin="round" />
				<circle cx="414" cy="155" r="25" fill="#67e8f9" />
				<path d="m404 155 7 7 13-14" stroke="#155e75" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M90 272v16m-8-8h16M384 64v12m-6-6h12" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
				<circle cx="405" cy="316" r="5" fill="#a5b4fc" />
				<circle cx="99" cy="143" r="4" fill="#67e8f9" />
			</svg>

			<div className="relative hidden max-w-md md:block">
				<h2 className="text-3xl font-medium leading-tight tracking-tight text-white lg:text-5xl">
					Good ideas deserve<br />a place to land.
				</h2>
				<p className="mt-5 max-w-sm text-sm leading-7 text-indigo-200/80">
					Your documents, photos, and next big thing.<br />Keep them together in Drivebox.
				</p>
			</div>
		</div>
	)
}
