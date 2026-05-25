const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export type Repo = {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  language: string | null
  stargazers_count: number
  private: boolean
}

export function githubLoginUrl(): string {
  return `${API_BASE_URL}/auth/github/login`
}

export async function fetchRepositories(): Promise<Repo[]> {
  const response = await fetch(`${API_BASE_URL}/github/repos`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(payload.detail || 'Failed to fetch repositories')
  }

  return response.json() as Promise<Repo[]>
}
