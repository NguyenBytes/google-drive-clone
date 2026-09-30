import { useRef, useState } from 'react'
import type { DriveFile } from '../../types'

export function RenameModal({ file, onRename, onClose }: {
	file: DriveFile
	onRename: (name: string) => Promise<void>
	onClose: () => void
}) {
	const [name, setName] = useState(file.name)
	const [error, setError] = useState('')
	const [isBusy, setIsBusy] = useState(false)
	const pending = useRef(false)

	const submit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (pending.current) return
		const trimmedName = name.trim()
		const hasControlCharacter = Array.from(trimmedName).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
		if (!trimmedName || /[\\/]/.test(trimmedName) || hasControlCharacter || trimmedName === '.' || trimmedName === '..') {
			setError('Enter a name without slashes or control characters.')
			return
		}
		pending.current = true
		setIsBusy(true)
		setError('')
		try {
			await onRename(trimmedName)
			onClose()
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Could not rename this item.')
		} finally {
			pending.current = false
			setIsBusy(false)
		}
	}

	return (
		<div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="rename-title">
			<div className="modal-box">
				<h2 className="text-xl font-semibold" id="rename-title">Rename {file.isDirectory ? 'folder' : 'file'}</h2>
				<form className="mt-5" onSubmit={(event) => void submit(event)}>
					<label className="fieldset">
						<span className="fieldset-label">Name</span>
						<input autoFocus className="input input-bordered w-full" disabled={isBusy} value={name}
							onChange={(event) => setName(event.target.value)} onFocus={(event) => event.target.select()} />
					</label>
					{error && <p className="mt-2 text-sm text-error" role="alert">{error}</p>}
					<div className="modal-action">
						<button className="btn" disabled={isBusy} onClick={onClose} type="button">Cancel</button>
						<button className="btn btn-primary" disabled={isBusy || !name.trim()} type="submit">
							{isBusy ? 'Renaming…' : 'Rename'}
						</button>
					</div>
				</form>
			</div>
			<button aria-label="Close rename dialog" className="modal-backdrop" disabled={isBusy} onClick={onClose} type="button" />
		</div>
	)
}
