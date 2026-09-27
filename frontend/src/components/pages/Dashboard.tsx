import { useEffect, useRef, useState } from 'react'
import { fetchUserAttributes } from 'aws-amplify/auth'
import type { DriveFile, AuthState } from '../../types'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = (/^https?:\/\//i.test(configuredApiUrl)
	? configuredApiUrl
	: `http://${configuredApiUrl}`).replace(/\/+$/, '')
const MAX_FILE_BYTES = 18 * 1024 * 1024
const ALLOWED_EXTENSIONS = [
	'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic',
	'mp4', 'mov', 'webm', 'mkv', 'avi',
	'mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac',
	'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
	'txt', 'csv', 'rtf', 'odt', 'ods',
]
const ACCEPTED_FILE_TYPES = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',')

type DashboardProps = {
	auth: AuthState
}

type FilePreview = {
	url: string
}

export function Dashboard({ auth }: DashboardProps) {
	const [uploadMessage, setUploadMessage] = useState('')
	const [uploadError, setUploadError] = useState('')
	const [uploading, setUploading] = useState(false)
	const [files, setFiles] = useState<DriveFile[]>([])
	const [userEmail, setUserEmail] = useState<string | null>(null)
	const [loadingFiles, setLoadingFiles] = useState(true)
	const [filesError, setFilesError] = useState('')
	const [filesVersion, setFilesVersion] = useState(0)
	const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)
	const [preview, setPreview] = useState<FilePreview | null>(null)
	const [previewLoading, setPreviewLoading] = useState(false)
	const [previewError, setPreviewError] = useState('')
	const [folderName, setFolderName] = useState('')
	const [folderModalError, setFolderModalError] = useState('')
	const [folderModalOpen, setFolderModalOpen] = useState(false)
	const filePicker = useRef<HTMLInputElement>(null)
	const folderPicker = useRef<HTMLInputElement>(null)
	const previewRequest = useRef<AbortController | null>(null)
	const presignedUrlCache = useRef(new Map<string, { url: string; expiresAt: number }>())

	useEffect(() => {
		let cancelled = false

		const loadFiles = async () => {
			setLoadingFiles(true)
			setFilesError('')

			try {
				const attributes = await fetchUserAttributes()
				const email = attributes.email?.trim()
				if (!email) throw new Error('Could not find an email address for this account.')
				if (!cancelled) setUserEmail(email)

				const filesUrl = new URL(`${API_URL}/files`)
				filesUrl.searchParams.set('prefix', `${email}/`)
				const response = await fetch(filesUrl)
				const result = await response.json().catch(() => null)

				if (!response.ok) {
					throw new Error(result?.error ?? 'Could not load files.')
				}
				if (!cancelled) {
					setFiles(Array.isArray(result?.files) ? result.files : [])
				}
			} catch (error) {
				if (!cancelled) {
					setFilesError(error instanceof Error ? error.message : 'Could not load files.')
				}
			} finally {
				if (!cancelled) setLoadingFiles(false)
			}
		}

		void loadFiles()
		return () => {
			cancelled = true
		}
	}, [auth.username, filesVersion])

	const openFile = async (file: DriveFile) => {
		previewRequest.current?.abort()

		const controller = new AbortController()
		previewRequest.current = controller
		setSelectedFile(file)
		setPreview(null)
		setPreviewError('')
		setPreviewLoading(true)

		const cachedUrl = presignedUrlCache.current.get(file.key)
		if (cachedUrl && cachedUrl.expiresAt > Date.now() + 30_000) {
			setPreview(cachedUrl)
			setPreviewLoading(false)
			return
		}

		try {
			const requestUrl = new URL(`${API_URL}/files/presigned-url`)
			requestUrl.searchParams.set('key', file.key)
			const response = await fetch(requestUrl, { signal: controller.signal })
			const result = await response.json().catch(() => null)
			if (!response.ok) throw new Error(result?.error ?? 'Could not get a preview URL.')
			if (typeof result?.url !== 'string') throw new Error('The server did not return a preview URL.')
			if (controller.signal.aborted) return

			const signedUrl = {
				url: result.url as string,
				expiresAt: Date.now() + (Number(result.expiresIn) || 900) * 1000,
			}
			presignedUrlCache.current.set(file.key, signedUrl)
			setPreview(signedUrl)
		} catch (error) {
			if (!controller.signal.aborted) {
				setPreviewError(error instanceof Error ? error.message : 'Could not load this file.')
			}
		} finally {
			if (!controller.signal.aborted) setPreviewLoading(false)
		}
	}

	const closePreview = () => {
		previewRequest.current?.abort()
		previewRequest.current = null
		setSelectedFile(null)
		setPreview(null)
		setPreviewError('')
		setPreviewLoading(false)
	}

	const uploadFiles = async (selectedFiles: FileList | null, keepFolderPaths = false) => {
		if (!selectedFiles?.length) return
		if (!userEmail) {
			setUploadError('Your account email is still loading. Please try again.')
			return
		}

		setUploadMessage('')
		setUploadError('')
		setUploading(true)

		try {
			for (const file of Array.from(selectedFiles)) {
				const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
				if (!ALLOWED_EXTENSIONS.includes(extension)) {
					throw new Error(`${file.name} is not an allowed file type.`)
				}
				if (file.size > MAX_FILE_BYTES) {
					throw new Error(`${file.name} exceeds the 18 MB limit.`)
				}

				const dataUrl = await readFileAsDataUrl(file)
				const content = dataUrl.slice(dataUrl.indexOf(',') + 1)
				const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath
				const relativeKey = keepFolderPaths && relativePath ? relativePath : file.name
				const key = `${userEmail}/${relativeKey}`
				const response = await fetch(`${API_URL}/files`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						key,
						content,
						contentType: file.type || 'application/octet-stream',
					}),
				})

				if (!response.ok) {
					const result = await response.json().catch(() => null)
					throw new Error(result?.error ?? `Upload failed for ${file.name}`)
				}
			}

			setUploadMessage(
				`${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'} uploaded.`,
			)
			setFilesVersion((version) => version + 1)
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.')
		} finally {
			setUploading(false)
		}
	}

	const createFolder = async () => {
		const name = folderName.trim()
		if (!name) {
			setFolderModalError('Enter a folder name.')
			return
		}
		if (/[\\/]/.test(name) || name === '.' || name === '..') {
			setFolderModalError('Enter a folder name without slashes.')
			return
		}
		if (!userEmail) {
			setFolderModalError('Your account email is still loading. Please try again.')
			return
		}

		setUploadMessage('')
		setUploadError('')
		setUploading(true)

		try {
			const prefix = `${userEmail}/`
			const response = await fetch(`${API_URL}/files`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					key: `${prefix}${name}/`,
					content: '',
					contentType: 'application/x-directory',
				}),
			})

			if (!response.ok) {
				const result = await response.json().catch(() => null)
				throw new Error(result?.error ?? 'Could not create folder.')
			}

			setUploadMessage(`Folder “${name}” created.`)
			setFilesVersion((version) => version + 1)
			setFolderName('')
			setFolderModalError('')
			setFolderModalOpen(false)
		} catch (error) {
			setFolderModalError(error instanceof Error ? error.message : 'Could not create folder.')
		} finally {
			setUploading(false)
		}
	}

	return (
		<section className="min-h-[calc(100vh-65px)]">

			<input
				accept={ACCEPTED_FILE_TYPES}
				className="hidden"
				onChange={(event) => {
					void uploadFiles(event.target.files)
					event.target.value = ''
				}}
				ref={filePicker}
				type="file"
			/>
			<input
				className="hidden"
				onChange={(event) => {
					void uploadFiles(event.target.files, true)
					event.target.value = ''
				}}
				ref={folderPicker}
				type="file"
				{...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>}
			/>

			<main className="p-4 sm:p-6">
				<DashboardHeader username={auth.username} />
				<FileFilters
					filePicker={filePicker}
					folderPicker={folderPicker}
					openFolderModal={() => {
						setFolderName('')
						setFolderModalError('')
						setFolderModalOpen(true)
					}}
				/>
				<FileList
					files={files}
					isLoading={loadingFiles}
					error={filesError}
					onOpen={(file) => void openFile(file)}
				/>
				<UploadStatus
					isUploading={uploading}
					message={uploadMessage}
					error={uploadError}
				/>
			</main>

			{folderModalOpen && (
				<NewFolderModal
					name={folderName}
					error={folderModalError}
					isBusy={uploading}
					onNameChange={(value) => {
						setFolderName(value)
						setFolderModalError('')
					}}
					onCancel={() => setFolderModalOpen(false)}
					onSubmit={(event) => {
						event.preventDefault()
						void createFolder()
					}}
				/>
			)}
			{selectedFile && (
				<FilePreviewModal
					file={selectedFile}
					preview={preview}
					isLoading={previewLoading}
					error={previewError}
					onClose={closePreview}
				/>
			)}
		</section>
	)
}

function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			if (typeof reader.result === 'string') resolve(reader.result)
			else reject(new Error('Could not read file'))
		}
		reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
		reader.readAsDataURL(file)
	})
}

function DashboardHeader({
	username,
}: {
	username: string | null
}) {
	return (
		<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
			<div>
				<p className="text-sm text-base-content/60">My Drive</p>
				<h1 className="text-2xl font-medium">Welcome back, {username}</h1>
			</div>
			<div className="flex items-center gap-2">
				<div className="join">
					<button aria-label="List view" aria-pressed="true" className="btn btn-sm join-item btn-active" type="button">☷</button>
					<button aria-label="Grid view" aria-pressed="false" className="btn btn-sm join-item" type="button">▦</button>
				</div>
			</div>
		</div>
	)
}

function FileFilters({
	filePicker,
	folderPicker,
	openFolderModal,
}: {
	filePicker: React.RefObject<HTMLInputElement | null>
	folderPicker: React.RefObject<HTMLInputElement | null>
	openFolderModal: () => void
}) {
	return (
		<div aria-label="File filters" className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
			<button className="btn btn-sm shrink-0 rounded-full" type="button">Type <span aria-hidden="true" className="opacity-50">⌄</span></button>
			<button className="btn btn-sm shrink-0 rounded-full" type="button">People <span aria-hidden="true" className="opacity-50">⌄</span></button>
			<button className="btn btn-sm shrink-0 rounded-full" type="button">Modified <span aria-hidden="true" className="opacity-50">⌄</span></button>
			<details className="dropdown dropdown-end ml-auto">
				<summary className="btn btn-primary btn-sm shrink-0 gap-2">
					<span aria-hidden="true">＋</span>
					New
				</summary>
				<ul className="menu dropdown-content z-20 mt-2 w-48 rounded-box border border-base-300 bg-base-100 p-2 shadow">
					<li><button onClick={() => filePicker.current?.click()} type="button">New file</button></li>
					<li><button onClick={openFolderModal} type="button">New folder</button></li>
					<li><button onClick={() => folderPicker.current?.click()} type="button">Upload folder</button></li>
				</ul>
			</details>
		</div>
	)
}

function FileList({
	files,
	isLoading,
	error,
	onOpen,
}: {
	files: DriveFile[]
	isLoading: boolean
	error: string
	onOpen: (file: DriveFile) => void
}) {
	return (
		<div className="card border border-base-300 bg-base-100 shadow-sm">
			<div className="card-body p-0">
				<div className="border-b border-base-300 px-5 py-4">
					<h2 className="font-medium">Files</h2>
				</div>

				{isLoading && <p className="p-5 text-sm text-base-content/60" role="status">Loading files…</p>}
				{error && <p className="alert alert-error m-4" role="alert">{error}</p>}
				{!isLoading && !error && files.length === 0 && (
					<p className="p-5 text-sm text-base-content/60">No files in this folder yet.</p>
				)}

				<ul className="divide-y divide-base-300 sm:hidden">
					{files.map((file) => (
						<li
							className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-base-200"
							key={file.key}
							onDoubleClick={() => onOpen(file)}
							title="Double-click to open"
						>
							<FileIcon size="large" />
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium">{file.name}</p>
								<p className="text-sm text-base-content/60">{file.lastModified ?? '—'}</p>
							</div>
							<button aria-label={`More options for ${file.name}`} className="btn btn-ghost btn-sm" type="button">⋮</button>
						</li>
					))}
				</ul>

				<div className="hidden overflow-x-auto sm:block">
					<table className="table table-hover">
						<thead>
							<tr><th>Name</th><th>Size</th><th>Last modified</th><th aria-label="Actions" /></tr>
						</thead>
						<tbody>
							{files.map((file) => (
								<tr
									key={file.key}
									className="cursor-pointer transition-colors hover:bg-base-200"
									onDoubleClick={() => onOpen(file)}
									title="Double-click to open"
								>
									<td>
										<div className="flex items-center gap-3">
											<FileIcon size="small" />
											<span className="font-medium">{file.name}</span>
										</div>
									</td>
									<td className="text-base-content/60">
										{file.size === undefined ? '—' : `${(file.size / 1024).toFixed(1)} KB`}
									</td>
									<td className="text-base-content/60">{file.lastModified ?? '—'}</td>
									<td>
										<button aria-label={`More options for ${file.name}`} className="btn btn-ghost btn-xs" type="button">⋮</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

function FilePreviewModal({
	file,
	preview,
	isLoading,
	error,
	onClose,
}: {
	file: DriveFile
	preview: FilePreview | null
	isLoading: boolean
	error: string
	onClose: () => void
}) {
	return (
		<div className="modal modal-open bg-gray-500/25 p-0" role="dialog" aria-modal="true" aria-labelledby="file-preview-title">
			<div className="modal-box flex h-screen max-h-none w-screen max-w-none flex-col rounded-none bg-gray-700/40 p-0 text-white shadow-none">
				<header className="flex shrink-0 items-center justify-between border-b border-white/20 px-5 py-3">
					<div className="min-w-0">
						<h2 className="truncate font-medium" id="file-preview-title">{file.name}</h2>
						<p className="text-sm text-white/60">{file.lastModified ?? ''}</p>
					</div>
					<div className="ml-4 flex shrink-0 items-center gap-2">
						{preview && <a className="btn btn-sm" download={file.name} href={preview.url}>Download</a>}
						<button aria-label="Close preview" className="btn btn-circle btn-sm" onClick={onClose} type="button">✕</button>
					</div>
				</header>

				<div className="grid min-h-0 flex-1 place-items-center overflow-auto p-4">
					{isLoading && <span className="loading loading-spinner loading-lg" aria-label="Loading file" />}
					{error && <p className="alert alert-error">{error}</p>}
					{preview && (
						<iframe
							className="h-full w-full bg-transparent"
							src={preview.url}
							title={`Preview of ${file.name}`}
						/>
					)}
				</div>
			</div>
			<button aria-label="Close preview" className="modal-backdrop" onClick={onClose} type="button" />
		</div>
	)
}

function FileIcon({ size }: { size: 'small' | 'large' }) {
	const dimensions = size === 'large' ? 'h-10 w-10' : 'h-8 w-8'
	return (
		<span aria-hidden="true" className={`grid ${dimensions} place-items-center rounded bg-primary/10 text-primary`}>
			▤
		</span>
	)
}

function UploadStatus({
	isUploading,
	message,
	error,
}: {
	isUploading: boolean
	message: string
	error: string
}) {
	return (
		<>
			{isUploading && (
				<div className="mt-6 alert bg-base-100 shadow-sm" role="status">
					<span className="loading loading-spinner loading-sm" />
					Uploading files…
				</div>
			)}
			{message && <div className="mt-6 alert alert-success" role="status">{message}</div>}
			{error && <div className="mt-6 alert alert-error" role="alert">{error}</div>}
		</>
	)
}

function NewFolderModal({
	name,
	error,
	isBusy,
	onNameChange,
	onCancel,
	onSubmit,
}: {
	name: string
	error: string
	isBusy: boolean
	onNameChange: (value: string) => void
	onCancel: () => void
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
	return (
		<div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="new-folder-title">
			<div className="modal-box">
				<h2 className="text-xl font-semibold" id="new-folder-title">Create a folder</h2>
				<form className="mt-5" onSubmit={onSubmit}>
					<label className="fieldset">
						<span className="fieldset-label">Folder name</span>
						<input
							autoFocus
							className="input input-bordered w-full"
							disabled={isBusy}
							onChange={(event) => onNameChange(event.target.value)}
							value={name}
						/>
					</label>
					{error && <p className="mt-2 text-sm text-error" role="alert">{error}</p>}
					<div className="modal-action">
						<button className="btn" disabled={isBusy} onClick={onCancel} type="button">Cancel</button>
						<button className="btn btn-primary" disabled={isBusy || !name.trim()} type="submit">
							{isBusy ? 'Creating…' : 'Create'}
						</button>
					</div>
				</form>
			</div>
			<button aria-label="Close dialog" className="modal-backdrop" disabled={isBusy} onClick={onCancel} type="button" />
		</div>
	)
}
