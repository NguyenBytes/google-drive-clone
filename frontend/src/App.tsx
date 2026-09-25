import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router'
import { confirmSignUp, fetchUserAttributes, getCurrentUser, signIn, signOut, signUp, updateUserAttributes } from 'aws-amplify/auth'
import { isAuthConfigured } from './auth'

type AuthState = { status: 'loading' | 'signedOut' | 'signedIn'; username: string | null }
const messageFor = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.'

function App() {
	const [auth, setAuth] = useState<AuthState>({ status: 'loading', username: null })
	const refreshAuth = async () => {
		if (!isAuthConfigured) return setAuth({ status: 'signedOut', username: null })
		try {
			const user = await getCurrentUser()
			setAuth({ status: 'signedIn', username: user.username })
		} catch { setAuth({ status: 'signedOut', username: null }) }
	}

	useEffect(() => { void refreshAuth() }, [])

	return <BrowserRouter><Routes>
		<Route element={<Layout auth={auth} setAuth={setAuth} />}>
			<Route index element={<Home auth={auth} />} />
			<Route path="login" element={<Login auth={auth} refreshAuth={refreshAuth} />} />
			<Route element={<ProtectedRoute auth={auth} />}><Route path="dashboard" element={<Dashboard auth={auth} />} /><Route path="profile" element={<Profile auth={auth} />} /></Route>
			<Route path="*" element={<Navigate replace to="/" />} />
		</Route>
	</Routes></BrowserRouter>
}

function Layout({ auth, setAuth }: { auth: AuthState; setAuth: (value: AuthState) => void }) {
	const navigate = useNavigate()
	const logout = async () => { await signOut(); setAuth({ status: 'signedOut', username: null }); navigate('/') }
	return <div className="min-h-screen bg-base-200">
		<header className="navbar border-b border-base-300 bg-base-100 px-4 shadow-sm">
			<Link className="btn btn-ghost gap-3 px-2 text-xl normal-case" to={auth.status === 'signedIn' ? '/dashboard' : '/'}><span className="grid h-8 w-8 place-items-center rounded bg-primary text-sm font-black text-primary-content">D</span>Drivebox</Link>
			{auth.status === 'signedIn' && <label className="input input-bordered mx-auto hidden w-full max-w-xl items-center gap-2 rounded-full bg-base-200 md:flex"><svg aria-hidden="true" className="h-4 w-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" strokeWidth="2" /><path d="m20 20-4-4" strokeWidth="2" /></svg><input aria-label="Search Drivebox" placeholder="Search in Drivebox" type="search" /></label>}
			<nav className="ml-auto flex gap-2" aria-label="Primary navigation">
				{auth.status === 'signedIn' ? <details className="dropdown dropdown-end"><summary className="btn btn-ghost btn-circle avatar placeholder" aria-label="Open profile menu"><div className="w-9 rounded-full bg-primary text-primary-content"><span className="inline-block translate-y-1/4">{auth.username?.slice(0, 1).toUpperCase()}</span></div></summary><ul className="menu dropdown-content z-20 mt-3 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow"><li className="menu-title"><span className="truncate">{auth.username}</span></li><li><Link to="/profile">Profile settings</Link></li><li><button onClick={() => void logout()} type="button">Log out</button></li></ul></details> : <Link className="btn btn-primary btn-sm" to="/login">Log in</Link>}
			</nav>
		</header>
		<main><Outlet /></main>
	</div>
}

function Home({ auth }: { auth: AuthState }) {
	return <section className="hero min-h-[calc(100vh-65px)]"><div className="hero-content max-w-3xl text-center"><div>
		<div className="badge badge-primary badge-outline mb-5">Your files, in one place</div>
		<h1 className="text-5xl font-bold sm:text-6xl">Store, find, and share what matters.</h1>
		<p className="py-6 text-lg text-base-content/70">A simple personal drive built with React, Cognito, and AWS.</p>
		{auth.status === 'loading' ? <span aria-label="Checking session" className="loading loading-dots loading-md" /> : <Link className="btn btn-primary" to={auth.status === 'signedIn' ? '/dashboard' : '/login'}>{auth.status === 'signedIn' ? 'Open dashboard' : 'Get started'}</Link>}
	</div></div></section>
}

function Login({ auth, refreshAuth }: { auth: AuthState; refreshAuth: () => Promise<void> }) {
	const navigate = useNavigate()
	const [mode, setMode] = useState<'signIn' | 'signUp' | 'confirm'>('signIn')
	const [username, setUsername] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmationCode, setConfirmationCode] = useState('')
	const [notice, setNotice] = useState('')
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(false)
	if (auth.status === 'signedIn') return <Navigate replace to="/dashboard" />

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault(); setError(''); setNotice(''); setBusy(true)
		try {
			if (mode === 'signIn') {
				const result = await signIn({ username, password })
				if (result.isSignedIn) { await refreshAuth(); navigate('/dashboard') }
				else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') { setMode('confirm'); setNotice('Enter the code sent to your email.') }
				else setError('This sign-in requires an additional step that is not configured yet.')
			} else if (mode === 'signUp') {
				const result = await signUp({ username, password, options: { userAttributes: { email } } })
				if (result.nextStep.signUpStep === 'CONFIRM_SIGN_UP') { setMode('confirm'); setNotice('Check your email for a confirmation code.') }
				else { setMode('signIn'); setNotice('Account created. You can now log in.') }
			} else { await confirmSignUp({ username, confirmationCode }); setMode('signIn'); setNotice('Account confirmed. You can now log in.') }
		} catch (caught) { setError(messageFor(caught)) } finally { setBusy(false) }
	}

	const confirming = mode === 'confirm'
	return <section className="hero min-h-[calc(100vh-65px)] px-4 py-10"><form className="card w-full max-w-md bg-base-100 shadow-xl" onSubmit={(event) => void submit(event)}><div className="card-body gap-4">
		<div><div className="badge badge-primary badge-outline mb-3">{confirming ? 'Verify account' : 'Welcome'}</div><h1 className="card-title text-3xl">{mode === 'signIn' ? 'Log in to Drivebox' : mode === 'signUp' ? 'Create your account' : 'Confirm your account'}</h1></div>
		{!isAuthConfigured && <div className="alert alert-error text-sm">Authentication is not configured. Add the Cognito values to your frontend environment.</div>}
		{notice && <div className="alert alert-info text-sm">{notice}</div>}{error && <div className="alert alert-error text-sm">{error}</div>}
		<label className="fieldset"><span className="fieldset-label">Username</span><input className="input input-bordered w-full" autoComplete="username" disabled={busy || !isAuthConfigured} onChange={(event) => setUsername(event.target.value)} required value={username} /></label>
		{mode === 'signUp' && <label className="fieldset"><span className="fieldset-label">Email</span><input className="input input-bordered w-full" autoComplete="email" disabled={busy || !isAuthConfigured} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>}
		{confirming ? <label className="fieldset"><span className="fieldset-label">Confirmation code</span><input className="input input-bordered w-full" autoComplete="one-time-code" disabled={busy || !isAuthConfigured} inputMode="numeric" onChange={(event) => setConfirmationCode(event.target.value)} required value={confirmationCode} /></label> : <label className="fieldset"><span className="fieldset-label">Password</span><input className="input input-bordered w-full" autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'} disabled={busy || !isAuthConfigured} minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>}
		<button className="btn btn-primary w-full" disabled={busy || !isAuthConfigured} type="submit">{busy ? 'Working…' : confirming ? 'Confirm account' : mode === 'signIn' ? 'Log in' : 'Create account'}</button>
		{!confirming && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setError(''); setNotice(''); setMode(mode === 'signIn' ? 'signUp' : 'signIn') }} type="button">{mode === 'signIn' ? 'Need an account? Sign up' : 'Already have an account? Log in'}</button>}
	</div></form></section>
}

function ProtectedRoute({ auth }: { auth: AuthState }) {
	if (auth.status === 'loading') return <div className="grid min-h-[calc(100vh-65px)] place-items-center"><span aria-label="Checking session" className="loading loading-spinner loading-lg" /></div>
	return auth.status === 'signedIn' ? <Outlet /> : <Navigate replace to="/login" />
}

function Dashboard({ auth }: { auth: AuthState }) {
	const [uploadMessage, setUploadMessage] = useState('')
	const [uploadError, setUploadError] = useState('')
	const [uploading, setUploading] = useState(false)
	const [folderName, setFolderName] = useState('')
	const [folderModalError, setFolderModalError] = useState('')
	const [folderModalOpen, setFolderModalOpen] = useState(false)
	const filePicker = useRef<HTMLInputElement>(null)
	const folderPicker = useRef<HTMLInputElement>(null)
	const allowedExtensions = ['jpg','jpeg','png','gif','webp','bmp','heic','mp4','mov','webm','mkv','avi','mp3','wav','m4a','aac','ogg','flac','pdf','doc','docx','xls','xlsx','ppt','pptx','txt','csv','rtf','odt','ods']
	const uploadFiles = async (files: FileList | null, keepFolderPaths = false) => {
		if (!files?.length) return
		setUploadMessage(''); setUploadError(''); setUploading(true)
		try {
			for (const file of Array.from(files)) {
				const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
				if (!allowedExtensions.includes(extension)) throw new Error(`${file.name} is not an allowed file type.`)
				if (file.size > 18 * 1024 * 1024) throw new Error(`${file.name} exceeds the 18 MB limit.`)
				const dataUrl = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader()
					reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Could not read file'))
					reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
					reader.readAsDataURL(file)
				})
				const content = dataUrl.slice(dataUrl.indexOf(',') + 1)
				const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath
				const key = keepFolderPaths && relativePath ? relativePath : file.name
				const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/files`, {
					method: 'POST', headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ key, content, contentType: file.type || 'application/octet-stream' }),
				})
				if (!response.ok) {
					const result = await response.json().catch(() => null)
					throw new Error(result?.error ?? `Upload failed for ${file.name}`)
				}
			}
			setUploadMessage(`${files.length} ${files.length === 1 ? 'file' : 'files'} uploaded.`)
		} catch (error) {
			setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.')
		} finally { setUploading(false) }
	}
	const createFolder = async () => {
		const name = folderName.trim()
		if (!name) { setFolderModalError('Enter a folder name.'); return }
		if (/[\\/]/.test(name) || name === '.' || name === '..') { setFolderModalError('Enter a folder name without slashes.'); return }
		setUploadMessage(''); setUploadError(''); setUploading(true)
		try {
			const response = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/files`, {
				method: 'POST', headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: `${name}/`, content: '', contentType: 'application/x-directory' }),
			})
			if (!response.ok) { const result = await response.json().catch(() => null); throw new Error(result?.error ?? 'Could not create folder.') }
			setUploadMessage(`Folder “${name}” created.`)
			setFolderName(''); setFolderModalError(''); setFolderModalOpen(false)
		} catch (error) { setFolderModalError(error instanceof Error ? error.message : 'Could not create folder.') }
		finally { setUploading(false) }
	}
	const files = [
		['Project brief', 'Google Docs', 'Edited today'],
		['Design inspiration', 'Folder', 'Edited yesterday'],
		['Launch checklist', 'Google Sheets', 'Edited Sep 23'],
	]

	return <section className="flex min-h-[calc(100vh-65px)]">
		<aside aria-label="Drive navigation" className="hidden w-64 shrink-0 border-r border-base-300 bg-base-100 p-4 md:block">
			<details className="dropdown mb-6 w-full">
				<summary className="btn btn-primary w-full justify-start gap-3 rounded-2xl shadow-sm"><span aria-hidden="true" className="text-xl">＋</span>New</summary>
				<ul className="menu dropdown-content z-20 mt-2 w-full rounded-box border border-base-300 bg-base-100 p-2 shadow">
					<li><button onClick={() => filePicker.current?.click()} type="button">New file</button></li>
					<li><button onClick={() => { setFolderName(''); setFolderModalError(''); setFolderModalOpen(true) }} type="button">New folder</button></li>
					<li><button onClick={() => folderPicker.current?.click()} type="button">Upload folder</button></li>
				</ul>
			</details>
			<input accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.heic,.mp4,.mov,.webm,.mkv,.avi,.mp3,.wav,.m4a,.aac,.ogg,.flac,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods" className="hidden" onChange={(event) => { void uploadFiles(event.target.files); event.target.value = '' }} ref={filePicker} type="file" />
			<input className="hidden" onChange={(event) => { void uploadFiles(event.target.files, true); event.target.value = '' }} ref={folderPicker} type="file" {...{ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>} />
			{folderModalOpen && <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="new-folder-title"><div className="modal-box"><h2 className="text-xl font-semibold" id="new-folder-title">Create a folder</h2><form className="mt-5" onSubmit={(event) => { event.preventDefault(); void createFolder() }}><label className="fieldset"><span className="fieldset-label">Folder name</span><input autoFocus className="input input-bordered w-full" disabled={uploading} onChange={(event) => { setFolderName(event.target.value); setFolderModalError('') }} value={folderName} /></label>{folderModalError && <p className="mt-2 text-sm text-error" role="alert">{folderModalError}</p>}<div className="modal-action"><button className="btn" disabled={uploading} onClick={() => setFolderModalOpen(false)} type="button">Cancel</button><button className="btn btn-primary" disabled={uploading || !folderName.trim()} type="submit">{uploading ? 'Creating…' : 'Create'}</button></div></form></div><button aria-label="Close dialog" className="modal-backdrop" disabled={uploading} onClick={() => setFolderModalOpen(false)} type="button" /></div>}
			<ul className="menu gap-1 p-0 text-base-content/75">
				<li><button className="active" type="button"><span aria-hidden="true">▣</span>My Drive</button></li>
				<li><button type="button"><span aria-hidden="true">◷</span>Recent</button></li>
				<li><button type="button"><span aria-hidden="true">☆</span>Starred</button></li>
				<li><button type="button"><span aria-hidden="true">◁</span>Shared with me</button></li>
				<li><button type="button"><span aria-hidden="true">♲</span>Trash</button></li>
			</ul>
			<div className="mt-10 border-t border-base-300 pt-5">
				<div className="mb-2 flex justify-between text-xs"><span>Storage</span><span>0 GB of 15 GB</span></div>
				<progress aria-label="3 percent of available storage used" className="progress progress-primary w-full" max="100" value="3" />
				<button className="btn btn-ghost btn-xs mt-2">Get more storage</button>
			</div>
		</aside>
		<div className="min-w-0 flex-1 p-4 sm:p-6">
			<div className="mb-5 flex flex-wrap items-center justify-between gap-3">
				<div><p className="text-sm text-base-content/60">My Drive</p><h1 className="text-2xl font-medium">Welcome back, {auth.username}</h1></div>
				<div className="flex items-center gap-2"><details className="dropdown md:hidden"><summary className="btn btn-sm" aria-label="Open Drive navigation">Menu</summary><ul className="menu dropdown-content z-10 mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-2 shadow"><li><button className="active" type="button">My Drive</button></li><li><button type="button">Recent</button></li><li><button type="button">Starred</button></li><li><button type="button">Shared with me</button></li><li><button type="button">Trash</button></li></ul></details><div className="join"><button aria-label="List view" aria-pressed="true" className="btn btn-sm join-item btn-active" type="button">☷</button><button aria-label="Grid view" aria-pressed="false" className="btn btn-sm join-item" type="button">▦</button></div></div>
			</div>
			<div aria-label="File filters" className="mb-6 flex gap-2 overflow-x-auto pb-1"><button className="btn btn-sm shrink-0 rounded-full" type="button">Type <span aria-hidden="true" className="opacity-50">⌄</span></button><button className="btn btn-sm shrink-0 rounded-full" type="button">People <span aria-hidden="true" className="opacity-50">⌄</span></button><button className="btn btn-sm shrink-0 rounded-full" type="button">Modified <span aria-hidden="true" className="opacity-50">⌄</span></button></div>
			<div className="card border border-base-300 bg-base-100 shadow-sm"><div className="card-body p-0">
				<div className="border-b border-base-300 px-5 py-4"><h2 className="font-medium">Files</h2></div>
				<ul className="divide-y divide-base-300 sm:hidden">{files.map(([name, type, modified]) => <li className="flex items-center gap-3 p-4" key={name}><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded bg-primary/10 text-primary">{type === 'Folder' ? '□' : '▤'}</span><div className="min-w-0 flex-1"><p className="truncate font-medium">{name}</p><p className="text-sm text-base-content/60">{type} · {modified}</p></div><button aria-label={`More options for ${name}`} className="btn btn-ghost btn-sm" type="button">⋮</button></li>)}</ul>
				<div className="hidden overflow-x-auto sm:block"><table className="table table-hover"><thead><tr><th>Name</th><th>Type</th><th>Last modified</th><th aria-label="Actions" /></tr></thead><tbody>{files.map(([name, type, modified]) => <tr key={name}><td><div className="flex items-center gap-3"><span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded bg-primary/10 text-primary">{type === 'Folder' ? '□' : '▤'}</span><span className="font-medium">{name}</span></div></td><td className="text-base-content/60">{type}</td><td className="text-base-content/60">{modified}</td><td><button aria-label={`More options for ${name}`} className="btn btn-ghost btn-xs" type="button">⋮</button></td></tr>)}</tbody></table></div>
			</div></div>
			{uploading && <div className="mt-6 alert bg-base-100 shadow-sm" role="status"><span className="loading loading-spinner loading-sm" />Uploading files…</div>}
			{uploadMessage && <div className="mt-6 alert alert-success" role="status">{uploadMessage}</div>}
			{uploadError && <div className="mt-6 alert alert-error" role="alert">{uploadError}</div>}
		</div>
	</section>
}

function Profile({ auth }: { auth: AuthState }) {
	const [email, setEmail] = useState('')
	const [notice, setNotice] = useState('')
	const [error, setError] = useState('')
	const [busy, setBusy] = useState(true)

	useEffect(() => {
		const loadProfile = async () => {
			try {
				const attributes = await fetchUserAttributes()
				setEmail(attributes.email ?? '')
			} catch (caught) { setError(messageFor(caught)) } finally { setBusy(false) }
		}
		void loadProfile()
	}, [])

	const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault(); setError(''); setNotice(''); setBusy(true)
		try {
			const result = await updateUserAttributes({ userAttributes: { email } })
			const nextStep = result.email?.nextStep.updateAttributeStep
			setNotice(nextStep === 'CONFIRM_ATTRIBUTE_WITH_CODE' ? 'Check your new email for a verification code.' : 'Profile updated.')
		} catch (caught) { setError(messageFor(caught)) } finally { setBusy(false) }
	}

	return <section className="mx-auto max-w-2xl px-4 py-10 sm:py-16"><div className="mb-6"><div className="badge badge-primary badge-outline mb-3">Account</div><h1 className="text-3xl font-bold">Profile settings</h1><p className="mt-2 text-base-content/70">Manage the information associated with your Drivebox account.</p></div><form className="card bg-base-100 shadow-sm" onSubmit={(event) => void saveProfile(event)}><div className="card-body gap-5">{error && <div className="alert alert-error text-sm">{error}</div>}{notice && <div className="alert alert-success text-sm">{notice}</div>}<label className="fieldset"><span className="fieldset-label">Username</span><input className="input input-bordered w-full" disabled value={auth.username ?? ''} /></label><label className="fieldset"><span className="fieldset-label">Email address</span><input className="input input-bordered w-full" autoComplete="email" disabled={busy} onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label><div className="card-actions justify-end"><Link className="btn btn-ghost" to="/dashboard">Cancel</Link><button className="btn btn-primary" disabled={busy} type="submit">{busy ? 'Loading…' : 'Save changes'}</button></div></div></form></section>
}

export default App
