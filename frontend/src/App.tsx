import { useEffect, useMemo, useState } from 'react'
import { fetchRepositories, githubLoginUrl, type Repo } from './api'

type ViewState = 'idle' | 'loading' | 'ready' | 'error'

function App() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [state, setState] = useState<ViewState>('idle')
  const [error, setError] = useState<string>('')

  const authStatus = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('auth')
  }, [])

  useEffect(() => {
    if (authStatus) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (authStatus === 'error') {
      setState('error')
      setError('Authentication failed. Please try again.')
      return
    }

    void loadRepositories(false)
  }, [authStatus])

  async function loadRepositories(showUnauthorizedError = true) {
    setState('loading')
    setError('')

    try {
      const data = await fetchRepositories()
      setRepos(data)
      setState('ready')
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Unknown error'
      if (!showUnauthorizedError && message.toLowerCase().includes('not authenticated')) {
        setState('idle')
        return
      }
      setError(message)
      setState('error')
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#161b24_0%,_#090b0f_55%)] px-5 py-12 text-slate-200">
      <div className="mx-auto grid max-w-5xl gap-6">
        <header>
          <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-400">repoX</p>
          <h1 className="my-2 text-3xl font-semibold text-white">Repository Intelligence Foundation</h1>
          <p className="m-0 text-slate-400">Authenticate with GitHub and load your repositories.</p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="mb-4 flex flex-wrap gap-3">
            <a
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 no-underline"
              href={githubLoginUrl()}
            >
              Login with GitHub
            </a>
            <button
              className="rounded-lg border border-slate-700 bg-transparent px-4 py-2 text-sm text-slate-200"
              onClick={() => void loadRepositories()}
            >
              Refresh Repositories
            </button>
          </div>

          {state === 'idle' && <p className="text-slate-400">Sign in to view repositories.</p>}
          {state === 'loading' && <p className="text-slate-400">Loading repositories...</p>}
          {state === 'error' && <p className="text-red-400">{error}</p>}

          {state === 'ready' && (
            <ul className="m-0 grid list-none gap-3 p-0">
              {repos.map((repo) => (
                <li key={repo.id} className="rounded-lg border border-slate-700 bg-slate-800/70 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-slate-100 no-underline"
                    >
                      {repo.full_name}
                    </a>
                    <span className="text-xs text-slate-300">? {repo.stargazers_count}</span>
                  </div>
                  <p className="my-2 text-slate-300">{repo.description || 'No description provided.'}</p>
                  <p className="m-0 text-xs text-slate-400">
                    {repo.language || 'Unknown'} • {repo.private ? 'Private' : 'Public'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
