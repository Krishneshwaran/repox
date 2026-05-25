const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export type Repo = {
  id: number
  name: string
  full_name: string
  html_url: string
  clone_url: string | null
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  private: boolean
  updated_at: string | null
  default_branch: string | null
  size: number
  topics: string[]
}

export type ScanResult = {
  repo_name: string
  languages: string[]
  frontend_framework: string
  backend_framework: string
  package_managers: string[]
  docker: boolean
  github_actions: boolean
  documentation: {
    readme: boolean
  }
  structure: Record<string, boolean>
  important_files: string[]
  dependencies: string[]
}

export type ScanRunResponse = {
  scan_id: string
  status: string
  result: ScanResult
}

export type AIRequest = {
  repo_name: string
  clone_url: string | null
  scan_id?: string
  scan_result?: ScanResult
}

export type VizNode = {
  id: string
  label: string
  kind: string
  importance: number
  summary: string
  technologies: string[]
}

export type VizEdge = {
  id: string
  source: string
  target: string
  label: string
  kind: string
  risk: string
}

export type VizGraphResponse = {
  nodes: VizNode[]
  edges: VizEdge[]
  mermaid: string
  insights: string[]
}

export type TimelineEvent = {
  title: string
  date_hint: string
  detail: string
  category: string
}

export type TimelineResponse = {
  events: TimelineEvent[]
  summary: string
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error((payload as { detail?: string }).detail ?? 'Request failed')
  }

  return response.json() as Promise<T>
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
    throw new Error((payload as { detail?: string }).detail ?? 'Failed to fetch repositories')
  }

  return response.json() as Promise<Repo[]>
}

export async function runScanner(repo_name: string, clone_url: string | null): Promise<ScanRunResponse> {
  return apiPost<ScanRunResponse>('/scanner/scan', { repo_name, clone_url })
}

export async function summarizeRepository(payload: AIRequest): Promise<{ summary: string }> {
  return apiPost<{ summary: string }>('/ai/summarize', payload)
}

export async function analyzeArchitecture(payload: AIRequest): Promise<{ architecture: string }> {
  return apiPost<{ architecture: string }>('/ai/architecture', payload)
}

export async function analyzeReadme(payload: AIRequest): Promise<{ analysis: string; scores: { readme_score: number; readability_score: number; completeness_score: number } }> {
  return apiPost<{ analysis: string; scores: { readme_score: number; readability_score: number; completeness_score: number } }>('/ai/readme-analysis', payload)
}

export async function generateInsights(payload: AIRequest): Promise<{ insights: string }> {
  return apiPost<{ insights: string }>('/ai/insights', payload)
}

export async function askRepository(payload: AIRequest & { question: string }): Promise<{ answer: string }> {
  return apiPost<{ answer: string }>('/ai/ask', payload)
}

export async function fetchVisualizationArchitecture(payload: AIRequest): Promise<VizGraphResponse> {
  return apiPost<VizGraphResponse>('/visualization/architecture', payload)
}

export async function fetchVisualizationDependencies(payload: AIRequest): Promise<VizGraphResponse> {
  return apiPost<VizGraphResponse>('/visualization/dependencies', payload)
}

export async function fetchVisualizationApiFlow(payload: AIRequest): Promise<VizGraphResponse> {
  return apiPost<VizGraphResponse>('/visualization/api-flow', payload)
}

export async function fetchVisualizationRepositoryMap(payload: AIRequest): Promise<VizGraphResponse> {
  return apiPost<VizGraphResponse>('/visualization/repository-map', payload)
}

export async function fetchVisualizationTimeline(payload: AIRequest): Promise<TimelineResponse> {
  return apiPost<TimelineResponse>('/visualization/timeline', payload)
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined)
}
