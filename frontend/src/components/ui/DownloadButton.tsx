import { useRef, useState } from 'react'
import { apiFetch } from '../../utils/apiFetch'

type DownloadButtonProps = {
	url: string
	fileName: string
	iconOnly?: boolean
	disabled?: boolean
}

export function DownloadButton({ url, fileName, iconOnly = false, disabled = false }: DownloadButtonProps) {
	const [isDownloading, setIsDownloading] = useState(false)
	const [error, setError] = useState('')
	const inProgress = useRef(false)

	const download = async () => {
		if (inProgress.current || disabled) return
		inProgress.current = true
		setIsDownloading(true)
		setError('')
		try {
			const response = await apiFetch(url)
			if (!response.ok) {
				const result = await response.json().catch(() => null)
				throw new Error(result?.error ?? 'Could not download this file.')
			}
			const objectUrl = URL.createObjectURL(await response.blob())
			const link = document.createElement('a')
			link.href = objectUrl
			link.download = fileName
			link.hidden = true
			document.body.appendChild(link)
			try {
				link.click()
			} finally {
				link.remove()
				// Allow the browser to start reading the blob before releasing it.
				window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
			}
		} catch (error) {
			setError(error instanceof Error ? error.message : 'Could not download this file.')
		} finally {
			inProgress.current = false
			setIsDownloading(false)
		}
	}

	return (
		<>
			<button
				aria-label={isDownloading ? `Downloading ${fileName}` : `Download ${fileName}`}
				className={iconOnly ? 'btn btn-circle btn-sm' : undefined}
				disabled={disabled || isDownloading}
				onClick={() => void download()}
				title={disabled ? 'Folder downloads are not available' : 'Download file'}
				type="button"
			>
				{isDownloading ? (
					<span className="loading loading-spinner loading-xs" aria-hidden="true" />
				) : iconOnly ? (
					<svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path d="M12 4v16m-6-6 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
					</svg>
				) : 'Download'}
			</button>
			{error && <span className="max-w-64 whitespace-normal text-sm text-error" role="alert">{error}</span>}
		</>
	)
}
