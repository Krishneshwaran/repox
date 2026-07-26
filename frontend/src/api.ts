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
  readme_analysis: { exists?: boolean; score?: number; readability_score?: number; completeness_score?: number; sections?: Record<string, boolean>; missing_sections?: string[] }
  quality: { source_file_count?: number; test_file_count?: number; has_tests?: boolean; build_files?: string[]; has_build_configuration?: boolean; ci_workflows?: string[] }
  security: { status?: string; finding_count?: number; findings?: Array<{ type: string; file: string; line: number; severity: string }>; note?: string }
  api_routes: Array<{ method: string; path: string; file: string; framework: string }>
  commit_history: { analyzed_commits?: number; weekly_activity?: number[]; active_weeks?: number; contributors?: Array<{ name: string; commits: number }>; latest_commit_at?: string | null; latest_commit_message?: string | null; history_depth?: string }
  data_sources: Record<string, string>
}

export type ScanRunResponse = {
  scan_id: string
  status: string
  result: ScanResult
}

export type ScannerStats = {
  total_scans: number
}

export type ScanHistoryItem = {
  scan_id: string
  repo_name: string
  version: number
  frontend_framework: string
  backend_framework: string
  languages: string[]
  created_at: string
  status: string
}

export type ScannerHistoryResponse = {
  items: ScanHistoryItem[]
}

export type ScannerDiffResponse = {
  from_scan_id: string
  to_scan_id: string
  repo_name: string
  summary: string[]
  changed_fields: Record<string, Record<string, unknown>>
}

export type AIRequest = {
  repo_name: string
  clone_url: string | null
  scan_id?: string
  scan_result?: ScanResult
  user_api_key?: string
  user_model?: string
  user_provider?: string
}

export function getAIConfig(): { user_api_key?: string; user_model?: string; user_provider?: string } {
  const key = localStorage.getItem('repox_ai_key') ?? ''
  const model = localStorage.getItem('repox_ai_model') ?? ''
  const provider = localStorage.getItem('repox_ai_provider') ?? ''
  return {
    ...(key ? { user_api_key: key } : {}),
    ...(model ? { user_model: model } : {}),
    ...(provider ? { user_provider: provider } : {}),
  }
}

export type AskMessage = {
  role: 'user' | 'assistant'
  content: string
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

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    credentials: 'include',
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
  return apiGet<Repo[]>('/github/repos')
}

export async function runScanner(repo_name: string, clone_url: string | null): Promise<ScanRunResponse> {
  return apiPost<ScanRunResponse>('/scanner/scan', { repo_name, clone_url })
}

export async function fetchScannerStats(): Promise<ScannerStats> {
  return apiGet<ScannerStats>('/scanner/stats')
}

export async function fetchScannerHistory(limit = 50): Promise<ScannerHistoryResponse> {
  return apiGet<ScannerHistoryResponse>(`/scanner/history?limit=${limit}`)
}

export async function fetchRepoScannerHistory(repoName: string, limit = 50): Promise<ScannerHistoryResponse> {
  return apiGet<ScannerHistoryResponse>(`/scanner/history/${encodeURIComponent(repoName)}?limit=${limit}`)
}

export async function diffScannerSnapshots(from_scan_id: string, to_scan_id: string): Promise<ScannerDiffResponse> {
  return apiPost<ScannerDiffResponse>('/scanner/diff', { from_scan_id, to_scan_id })
}

export async function summarizeRepository(payload: AIRequest): Promise<{ summary: string }> {
  return apiPost<{ summary: string }>('/ai/summarize', { ...getAIConfig(), ...payload })
}

export async function analyzeArchitecture(payload: AIRequest): Promise<{ architecture: string }> {
  return apiPost<{ architecture: string }>('/ai/architecture', { ...getAIConfig(), ...payload })
}

export async function analyzeReadme(payload: AIRequest): Promise<{ analysis: string; scores: { readme_score: number; readability_score: number; completeness_score: number } }> {
  return apiPost<{ analysis: string; scores: { readme_score: number; readability_score: number; completeness_score: number } }>('/ai/readme-analysis', { ...getAIConfig(), ...payload })
}

export async function generateInsights(payload: AIRequest): Promise<{ insights: string }> {
  return apiPost<{ insights: string }>('/ai/insights', { ...getAIConfig(), ...payload })
}

export async function askRepository(payload: AIRequest & { question: string; history?: AskMessage[] }): Promise<{ answer: string }> {
  return apiPost<{ answer: string }>('/ai/ask', { ...getAIConfig(), ...payload })
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

export async function fetchRepoLanguages(fullName: string): Promise<Record<string, number>> {
  const [owner, repo] = fullName.split('/')
  return apiGet<Record<string, number>>(`/github/repos/${owner}/${repo}/languages`)
}

export async function fetchRepoActivity(fullName: string): Promise<number[]> {
  const [owner, repo] = fullName.split('/')
  return apiGet<number[]>(`/github/repos/${owner}/${repo}/activity`)
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => undefined)
}
