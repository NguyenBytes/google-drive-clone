import { useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { DownloadButton } from './DownloadButton'

type FileActionsMenuProps = {
	fileName: string
	onDelete: () => void
	onRename: () => void
	isDeleting: boolean
	downloadUrl: string
	isDirectory?: boolean
}

export function FileActionsMenu({ fileName, onDelete, onRename, isDeleting, downloadUrl, isDirectory }: FileActionsMenuProps) {
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
						<li><DownloadButton url={downloadUrl} fileName={fileName} disabled={isDirectory} /></li>
						{['Rename', 'Delete'].map((action) => (
							<li key={action}>
								<button
									className={action === 'Delete' ? 'text-error' : undefined}
									disabled={isDeleting}
									onClick={() => {
										menuRef.current?.hidePopover()
										if (action === 'Delete') onDelete()
										if (action === 'Rename') onRename()
									}}
									type="button"
								>
									{action === 'Delete' && isDeleting ? 'Deleting…' : action}
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
