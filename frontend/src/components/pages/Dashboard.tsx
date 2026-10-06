import { useEffect, useRef, useState } from 'react'
import { getCurrentUser } from 'aws-amplify/auth'
import type { DriveFile, AuthState } from '../../types'
import { getDisplayName } from '../../types'
import { FileActionsMenu } from '../ui/FileActionsMenu'
import { DownloadButton } from '../ui/DownloadButton'
import { RenameModal } from '../ui/RenameModal'
import { FolderBreadcrumbs } from '../ui/FolderBreadcrumbs'
import { apiFetch } from '../../utils/apiFetch'

const configuredApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const API_URL = (/^https?:\/\//i.test(configuredApiUrl)
	? configuredApiUrl
	: `http://${configuredApiUrl}`).replace(/\/+$/, '')
const downloadUrl = (key: string) => `${API_URL}/files/object?${new URLSearchParams({ key })}`
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
	const [deleteError, setDeleteError] = useState('')
	const [deletingKey, setDeletingKey] = useState<string | null>(null)
	const [renameTarget, setRenameTarget] = useState<DriveFile | null>(null)
	const deleteInProgress = useRef(false)
	const [uploading, setUploading] = useState(false)
	const [files, setFiles] = useState<DriveFile[]>([])
	const [userId, setUserId] = useState<string | null>(null)
	const [folderPath, setFolderPath] = useState('')
	const rootPrefix = userId ? `${userId}/` : ''
	const currentPrefix = rootPrefix + folderPath
	const [loadingFiles, setLoadingFiles] = useState(true)
	const [filesError, setFilesError] = useState('')
	const [filesVersion, setFilesVersion] = useState(0)
	const [page, setPage] = useState(1)
	const [fileTotals, setFileTotals] = useState<{ totalItems: number; totalPages: number } | null>(null)
	const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)
	const [preview, setPreview] = useState<FilePreview | null>(null)
	const [previewLoading, setPreviewLoading] = useState(false)
	const [previewError, setPreviewError] = useState('')
	const [folderName, setFolderName] = useState('')
	const [folderModalError, setFolderModalError] = useState('')
	const [folderModalOpen, setFolderModalOpen] = useState(false)
	const filePicker = useRef<HTMLInputElement>(null)
	const folderPicker = useRef<HTMLInputElement>(null)
	const newMenu = useRef<HTMLDetailsElement>(null)
	const previewRequest = useRef<AbortController | null>(null)
	const presignedUrlCache = useRef(new Map<string, { url: string; expiresAt: number }>())

	useEffect(() => {
		if (!uploadMessage && !uploadError) return
		const timeout = window.setTimeout(() => {
			setUploadMessage('')
			setUploadError('')
		}, 5000)
		return () => window.clearTimeout(timeout)
	}, [uploadMessage, uploadError])

	useEffect(() => {
		let cancelled = false
		const controller = new AbortController()

		const loadFiles = async () => {
			setLoadingFiles(true)
			setFilesError('')
			setFiles([])

			try {
				const user = await getCurrentUser()
				const accountId = user.userId
				if (!accountId) throw new Error('Could not find a user ID for this account.')
				if (!cancelled) setUserId(accountId)

				const filesUrl = new URL(`${API_URL}/files`)
				filesUrl.searchParams.set('prefix', `${accountId}/${folderPath}`)
				filesUrl.searchParams.set('page', String(page))
				const response = await apiFetch(filesUrl, { signal: controller.signal })
				const result = await response.json().catch(() => null)

				if (!response.ok) {
					throw new Error(result?.error ?? 'Could not load files.')
				}
				if (!cancelled) {
					setFiles(Array.isArray(result?.files) ? result.files : [])
					setFileTotals({ totalItems: result.totalItems, totalPages: result.totalPages })
					if (page > Math.max(1, result.totalPages)) setPage(Math.max(1, result.totalPages))
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
			controller.abort()
		}
	}, [auth.username, filesVersion, page, folderPath])

	const navigateToFolder = (prefix: string) => {
		if (!rootPrefix || !prefix.startsWith(rootPrefix) || prefix === currentPrefix) return
		setFolderPath(prefix.slice(rootPrefix.length))
		setPage(1)
		setFileTotals(null)
		setFiles([])
		setFilesError('')
		setLoadingFiles(true)
	}

	const changePage = (nextPage: number) => {
		if (loadingFiles || nextPage === page || nextPage < 1 || nextPage > (fileTotals?.totalPages ?? 1)) return

		setPage(nextPage)
		setLoadingFiles(true)
		setFiles([])
	}

	const refreshFiles = () => {
		setPage(1)
		setFileTotals(null)
		setFilesVersion((version) => version + 1)
	}

	const openFile = async (file: DriveFile) => {
		if (file.isDirectory) {
			navigateToFolder(file.key)
			return
		}
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
			const response = await apiFetch(requestUrl, { signal: controller.signal })
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

	const deleteFile = async (file: DriveFile) => {
		if (deleteInProgress.current) return
		deleteInProgress.current = true
		setDeletingKey(file.key)
		setDeleteError('')
		try {
			const requestUrl = new URL(`${API_URL}/files`)
			requestUrl.searchParams.set('key', file.key)
			const response = await apiFetch(requestUrl, { method: 'DELETE' })
			if (!response.ok) {
				const result = await response.json().catch(() => null)
				throw new Error(result?.error ?? `Could not delete ${file.name}.`)
			}
			presignedUrlCache.current.delete(file.key)
			if (selectedFile?.key === file.key) closePreview()
			setFilesVersion((version) => version + 1)
		} catch (error) {
			setDeleteError(error instanceof Error ? error.message : `Could not delete ${file.name}.`)
		} finally {
			deleteInProgress.current = false
			setDeletingKey(null)
		}
	}

	const renameFile = async (file: DriveFile, name: string) => {
		const response = await apiFetch(`${API_URL}/files/rename`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ key: file.key, name }),
		})
		const result = await response.json().catch(() => null)
		setFilesVersion((version) => version + 1)
		if (!response.ok) throw new Error(result?.error ?? 'Could not rename this item.')
		presignedUrlCache.current.clear()
		if (selectedFile?.key === file.key) closePreview()
	}

	const uploadFiles = async (selectedFiles: FileList | null, keepFolderPaths = false) => {
		if (!selectedFiles?.length) return
		if (!userId) {
			setUploadError('Your account is still loading. Please try again.')
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
				const key = `${currentPrefix}${relativeKey}`
				const response = await apiFetch(`${API_URL}/files`, {
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
			if (newMenu.current) newMenu.current.open = false
			refreshFiles()
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
		if (!userId) {
			setFolderModalError('Your account is still loading. Please try again.')
			return
		}

		setUploadMessage('')
		setUploadError('')
		setUploading(true)

		try {
			const prefix = currentPrefix
			const response = await apiFetch(`${API_URL}/files`, {
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
			refreshFiles()
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
		<section className="flex min-w-0 flex-1 flex-col pb-8">

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

			<div className="mx-auto w-full min-w-0 max-w-full flex-1 p-4 md:w-2/3 md:p-6 xl:w-2/3">
				<DashboardHeader username={getDisplayName(auth)} />
				<div className="mb-4 flex items-center gap-1 sm:gap-3">
					<FolderBreadcrumbs
						prefix={currentPrefix}
						rootPrefix={rootPrefix}
						onNavigate={navigateToFolder}
					/>
					<FileFilters
						newMenu={newMenu}
						filePicker={filePicker}
						folderPicker={folderPicker}
						openFolderModal={() => {
							setFolderName('')
							setFolderModalError('')
							setFolderModalOpen(true)
						}}
					/>
				</div>
				{deleteError && <p className="alert alert-error mb-4" role="alert">{deleteError}</p>}
				{deletingKey && <p className="mb-4 text-sm" role="status">Deleting…</p>}
				<FileList
					files={files}
					isLoading={loadingFiles}
					page={page}
					hasNextPage={page < (fileTotals?.totalPages ?? 1)}
					totals={fileTotals}
					onPageChange={changePage}
					error={filesError}
					onOpen={(file) => void openFile(file)}
					onDelete={(file) => void deleteFile(file)}
					onRename={setRenameTarget}
					isDeleting={deletingKey !== null}
				/>
				<UploadStatus
					isUploading={uploading}
					message={uploadMessage}
					error={uploadError}
					onDismissMessage={() => setUploadMessage('')}
					onDismissError={() => setUploadError('')}
				/>
			</div>

			{renameTarget && (
				<RenameModal key={renameTarget.key} file={renameTarget}
					onRename={(name) => renameFile(renameTarget, name)} onClose={() => setRenameTarget(null)} />
			)}
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
				<h1 className="break-words text-2xl font-medium">Welcome back, {username}</h1>
			</div>
			<div className="flex items-center gap-2">
				<div className="join flex max-w-full flex-wrap justify-center">
					<button aria-label="List view" aria-pressed="true" className="btn btn-sm join-item btn-active" type="button">☷</button>
					<button aria-label="Grid view" aria-pressed="false" className="btn btn-sm join-item" type="button">▦</button>
				</div>
			</div>
		</div>
	)
}

function FileFilters({
	newMenu,
	filePicker,
	folderPicker,
	openFolderModal,
}: {
	newMenu: React.RefObject<HTMLDetailsElement | null>
	filePicker: React.RefObject<HTMLInputElement | null>
	folderPicker: React.RefObject<HTMLInputElement | null>
	openFolderModal: () => void
}) {
	return (
		<div aria-label="File filters" className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
			<button className="btn btn-xs sm:btn-sm shrink-0 rounded-full" type="button">Type <span aria-hidden="true" className="opacity-50">⌄</span></button>
			<button className="btn btn-xs sm:btn-sm shrink-0 rounded-full" type="button">People <span aria-hidden="true" className="opacity-50">⌄</span></button>
			<button className="btn btn-xs sm:btn-sm shrink-0 rounded-full" type="button">Modified <span aria-hidden="true" className="opacity-50">⌄</span></button>
			<details ref={newMenu} className="dropdown dropdown-end ml-auto">
				<summary className="btn btn-primary btn-xs sm:btn-sm shrink-0 gap-1 sm:gap-2">
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

const sortableColumns = [
	{ key: 'name', label: 'Name' },
	{ key: 'size', label: 'Size' },
	{ key: 'lastModified', label: 'Last modified' },
] as const

type FileSortKey = typeof sortableColumns[number]['key']

function FileList({
	onRename,
	onDelete,
	isDeleting,
	files,
	isLoading,
	error,
	onOpen,
	page,
	hasNextPage,
	totals,
	onPageChange,
}: {
	files: DriveFile[]
	onDelete: (file: DriveFile) => void
	onRename: (file: DriveFile) => void
	isDeleting: boolean
	isLoading: boolean
	error: string
	onOpen: (file: DriveFile) => void
	page: number
	hasNextPage: boolean
	totals: { totalItems: number; totalPages: number } | null
	onPageChange: (page: number) => void
}) {
	const [sort, setSort] = useState<{ key: FileSortKey; ascending: boolean }>({
		key: 'name',
		ascending: true,
	})

	const sortBy = (key: FileSortKey) => {
		setSort((previous) => ({
			key,
			ascending: previous.key === key ? !previous.ascending : true,
		}))
	}

	const sortedFiles = [...files].sort((a, b) => {
		let comparison: number

		if (sort.key === 'name') {
			comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
		} else {
			const valueA = sort.key === 'size' ? a.size : Date.parse(a.lastModifiedAt ?? a.lastModified ?? '')
			const valueB = sort.key === 'size' ? b.size : Date.parse(b.lastModifiedAt ?? b.lastModified ?? '')
			const missingA = valueA === undefined || !Number.isFinite(valueA)
			const missingB = valueB === undefined || !Number.isFinite(valueB)

			if (missingA || missingB) {
				if (missingA !== missingB) return missingA ? 1 : -1
				comparison = 0
			} else {
				comparison = valueA! - valueB!
			}
		}

		return (sort.ascending ? comparison : -comparison) || a.key.localeCompare(b.key)
	})

	const pageFiles = sortedFiles

	return (
		<div className="card min-w-0 max-w-full border border-base-300 bg-base-100 shadow-sm">
			<div className="card-body min-w-0 p-0">
				{isLoading && <p className="p-5 text-sm text-base-content/60" role="status">Loading files…</p>}
				{error && <p className="alert alert-error m-4" role="alert">{error}</p>}
				{!isLoading && !error && files.length === 0 && (
					<p className="p-5 text-sm text-base-content/60">{page === 1 ? 'This folder is empty.' : 'No more items.'}</p>
				)}

				<ul className="divide-y divide-base-300 sm:hidden">
					{pageFiles.map((file) => (
						<li
							className="flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-base-200"
							key={file.key}
							onDoubleClick={() => onOpen(file)}
							title="Double-click to open"
						>
							<FileIcon fileName={file.name} isDirectory={file.isDirectory} size="large" />
							<div className="min-w-0 flex-1">
								<button className="block max-w-full truncate text-left font-medium hover:underline" onClick={() => onOpen(file)} onDoubleClick={(event) => event.stopPropagation()} type="button">{file.name}</button>
								<p className="text-sm text-base-content/60">{file.lastModified ?? '—'}</p>
							</div>
							<FileActionsMenu downloadUrl={downloadUrl(file.key)} isDirectory={file.isDirectory} fileName={file.name} onDelete={() => onDelete(file)} onRename={() => onRename(file)} isDeleting={isDeleting} />
						</li>
					))}
				</ul>

				<div className="hidden min-w-0 max-w-full sm:block">
					<table className="table table-fixed table-hover w-full">
						<colgroup>
							<col className="w-[42%]" />
							<col className="w-[18%]" />
							<col />
							<col className="w-14" />
						</colgroup>
						<thead>
							<tr>
								{sortableColumns.map(({ key, label }) => (
									<th
										key={key}
										scope="col"
										aria-sort={sort.key === key ? (sort.ascending ? 'ascending' : 'descending') : 'none'}
									>
										<button
											className="btn btn-ghost btn-xs -ml-2 gap-2"
											onClick={() => sortBy(key)}
											type="button"
											aria-label={`Sort this page by ${label}, ${sort.key === key && sort.ascending ? 'descending' : 'ascending'}`}
											title="Sort files on this page"
										>
											{label}
											<span aria-hidden="true">{sort.key === key ? (sort.ascending ? '↑' : '↓') : '↕'}</span>
										</button>
									</th>
								))}
								<th scope="col" aria-label="Actions" />
							</tr>
						</thead>
						<tbody>
							{pageFiles.map((file) => (
								<tr
									key={file.key}
									className="cursor-pointer transition-colors hover:bg-base-200"
									onDoubleClick={() => onOpen(file)}
									title="Double-click to open"
								>
									<td>
										<div className="flex items-center gap-3">
											<FileIcon fileName={file.name} isDirectory={file.isDirectory} size="small" />
											<button className="min-w-0 truncate text-left font-medium hover:underline" onClick={() => onOpen(file)} onDoubleClick={(event) => event.stopPropagation()} title={file.name} type="button">{file.name}</button>
										</div>
									</td>
									<td className="whitespace-normal break-words text-base-content/60">
										{file.size === undefined ? '—' : `${(file.size / 1024).toFixed(1)} KB`}
									</td>
									<td className="whitespace-normal break-words text-base-content/60">{file.lastModified ?? '—'}</td>
									<td>
										<FileActionsMenu downloadUrl={downloadUrl(file.key)} isDirectory={file.isDirectory} fileName={file.name} onDelete={() => onDelete(file)} onRename={() => onRename(file)} isDeleting={isDeleting} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<footer className="grid grid-cols-1 items-center gap-3 border-t border-base-300 p-4 text-center lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] lg:text-left">
					<p className="text-sm text-base-content/60" role="status">
						{isLoading ? 'Loading…' : error ? 'Page unavailable' : `${totals?.totalItems ?? 0} items total · Sort applies to this page`}
					</p>
					<nav aria-label="File pages" className="min-w-0 max-w-full justify-self-center">
						<div className="join flex max-w-full flex-wrap justify-center">
							<button
								aria-label="Previous page"
								className="btn btn-sm join-item"
								disabled={isLoading || page === 1}
								onClick={() => onPageChange(page - 1)}
								type="button"
							>
								«
							</button>
							{Array.from({ length: Math.max(1, totals?.totalPages ?? 1) }, (_, index) => index + 1).map((pageNumber) => (
								<button
									key={pageNumber}
									className={`join-item btn btn-sm ${page === pageNumber ? 'btn-active' : ''}`}
									aria-label={`Page ${pageNumber}`}
									aria-current={page === pageNumber ? 'page' : undefined}
									disabled={isLoading || !totals?.totalPages}
									onClick={() => onPageChange(pageNumber)}
									type="button"
								>
									{pageNumber}
								</button>
							))}
							<button
								aria-label="Next page"
								className="btn btn-sm join-item"
								disabled={isLoading || !hasNextPage}
								onClick={() => onPageChange(page + 1)}
								type="button"
							>
								»
							</button>
						</div>
					</nav>
				</footer>
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
	const isTextFile = file.name.toLowerCase().endsWith('.txt')

	return (
		<div className="modal modal-open bg-black/50 p-0" role="dialog" aria-modal="true" aria-labelledby="file-preview-title">
			<div className={`modal-box flex h-screen max-h-none w-screen max-w-none flex-col rounded-none p-0 shadow-none ${isTextFile ? 'bg-white text-gray-900' : 'bg-transparent text-white'}`}>
				<header className={`flex shrink-0 items-center justify-between border-b px-5 py-3 ${isTextFile ? 'border-gray-200' : 'border-white/20'}`}>
					<div className="min-w-0">
						<h2 className="truncate font-medium" id="file-preview-title">{file.name}</h2>
						<p className={`text-sm ${isTextFile ? 'text-gray-500' : 'text-white/60'}`}>{file.lastModified ?? ''}</p>
					</div>
					<div className="ml-4 flex shrink-0 items-center gap-2">
						<DownloadButton url={downloadUrl(file.key)} fileName={file.name} iconOnly />
						<button
							aria-label="Close preview"
							className="btn btn-circle btn-sm"
							onClick={onClose}
							title="Close preview"
							type="button"
						>
							<svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" strokeWidth="2" />
							</svg>
						</button>
					</div>
				</header>

				<div className="grid min-h-0 flex-1 place-items-center overflow-auto p-4">
					{isLoading && <span className="loading loading-spinner loading-lg" aria-label="Loading file" />}
					{error && <p className="alert alert-error">{error}</p>}
					{preview && (
						<iframe
							className={`h-full w-full ${isTextFile ? 'bg-white [color-scheme:light]' : 'bg-transparent'}`}
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

function FileIcon({ fileName, size, isDirectory }: { fileName: string; isDirectory?: boolean; size: 'small' | 'large' }) {
	const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
	const dimensions = size === 'large' ? 'h-10 w-10' : 'h-8 w-8'
	const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic']
	const videoExtensions = ['mp4', 'mov', 'webm', 'mkv', 'avi']
	const audioExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac']
	const spreadsheetExtensions = ['xls', 'xlsx', 'csv', 'ods']
	const presentationExtensions = ['ppt', 'pptx']
	const documentExtensions = ['doc', 'docx', 'rtf', 'odt']

	let icon = '📄'
	let colors = 'bg-primary/10 text-primary'
	if (isDirectory) {
		icon = '📁'
		colors = 'bg-amber-500/10 text-amber-600'
	} else if (imageExtensions.includes(extension)) {
		icon = '🖼️'
		colors = 'bg-sky-500/10 text-sky-600'
	} else if (videoExtensions.includes(extension)) {
		icon = '🎬'
		colors = 'bg-violet-500/10 text-violet-600'
	} else if (audioExtensions.includes(extension)) {
		icon = '🎵'
		colors = 'bg-pink-500/10 text-pink-600'
	} else if (extension === 'pdf') {
		icon = 'PDF'
		colors = 'bg-red-500/10 text-red-600'
	} else if (spreadsheetExtensions.includes(extension)) {
		icon = '▦'
		colors = 'bg-emerald-500/10 text-emerald-600'
	} else if (presentationExtensions.includes(extension)) {
		icon = '▧'
		colors = 'bg-amber-500/10 text-amber-600'
	} else if (documentExtensions.includes(extension)) {
		icon = '▤'
		colors = 'bg-blue-500/10 text-blue-600'
	}

	return (
		<span aria-hidden="true" className={`grid ${dimensions} place-items-center rounded ${colors}`}>
			{icon}
		</span>
	)
}

function UploadStatus({
	isUploading,
	message,
	error,
	onDismissMessage,
	onDismissError,
}: {
	isUploading: boolean
	message: string
	error: string
	onDismissMessage: () => void
	onDismissError: () => void
}) {
	if (!isUploading && !message && !error) return null

	return (
		<div className="fixed bottom-4 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:bottom-6 md:right-[calc(16.666667%+1.5rem)]">
			{isUploading && (
				<div className="alert bg-base-100 shadow-lg" role="status">
					<span className="loading loading-spinner loading-sm" />
					Uploading files…
				</div>
			)}
			{message && (
				<div className="alert alert-success flex justify-between shadow-lg" role="status">
					<span className="min-w-0 break-words">{message}</span>
					<button className="btn btn-ghost btn-circle shrink-0 text-3xl" type="button" aria-label="Dismiss upload notification" onClick={onDismissMessage}>×</button>
				</div>
			)}
			{error && (
				<div className="alert alert-error flex justify-between shadow-lg" role="alert">
					<span className="min-w-0 break-words">{error}</span>
					<button className="btn btn-ghost btn-circle shrink-0 text-3xl" type="button" aria-label="Dismiss upload error" onClick={onDismissError}>×</button>
				</div>
			)}
		</div>
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
