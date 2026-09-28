import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'

type FileActionsMenuProps = {
	fileName: string
}

export function FileActionsMenu({ fileName }: FileActionsMenuProps) {
	const menuId = useId()
	const menuRef = useRef<HTMLDivElement>(null)

	return (
		<span onDoubleClick={(event) => event.stopPropagation()} title="">
			<button
				aria-label={`More options for ${fileName}`}
				className="btn btn-ghost btn-sm"
				popoverTarget={menuId}
				onClick={(event) => {
					const menu = menuRef.current
					if (!menu) return

					const bounds = event.currentTarget.getBoundingClientRect()
					menu.style.left = `${Math.max(8, Math.min(bounds.right - 176, window.innerWidth - 184))}px`
					menu.style.top = `${Math.max(8, Math.min(bounds.bottom + 4, window.innerHeight - 144))}px`
				}}
				type="button"
			>
				⋮
			</button>

			{createPortal(
				<div
					className="fixed m-0 w-44 rounded-box border border-base-300 bg-base-100 p-1 text-base-content shadow-lg"
					id={menuId}
					popover="auto"
					ref={menuRef}
				>
					<ul className="menu w-full p-0" aria-label={`Actions for ${fileName}`}>
						{['Download', 'Rename', 'Delete'].map((action) => (
							<li key={action}>
								<button
									className={action === 'Delete' ? 'text-error' : undefined}
									onClick={() => menuRef.current?.hidePopover()}
									type="button"
								>
									{action}
								</button>
							</li>
						))}
					</ul>
				</div>,
				document.body,
			)}
		</span>
	)
}
