import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ReactFlow, { Background, Controls, MarkerType, type Edge, type Node } from 'reactflow'
import 'reactflow/dist/style.css'

import {
  fetchVisualizationApiFlow,
  fetchVisualizationArchitecture,
  fetchVisualizationDependencies,
  fetchVisualizationRepositoryMap,
  fetchVisualizationTimeline,
  type ScanResult,
  type TimelineResponse,
  type VizGraphResponse,
} from '../api'

type Mode = 'architecture' | 'repository-map' | 'dependencies' | 'api-flow'

const KIND_COLOR: Record<string, string> = {
  frontend: '#3178c6',
  backend: '#3572A5',
  database: '#e97627',
  infra: '#6e40c9',
  api: 'oklch(0.82 0.17 142)',
  service: '#f59e0b',
  unknown: '#4b5563',
}

function toFlow(graph: VizGraphResponse): { nodes: Node[]; edges: Edge[] } {
  const cols = Math.min(4, graph.nodes.length)
  const stepX = 230
  const stepY = 120
  const nodes: Node[] = graph.nodes.map((node, idx) => ({
    id: node.id,
    position: { x: (idx % cols) * stepX + 20, y: Math.floor(idx / cols) * stepY + 20 },
    data: {
      label: (
        <div style={{ display: 'grid', gap: 3 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.label}
          </div>
          <div style={{ fontSize: 10.5, color: KIND_COLOR[node.kind] ?? KIND_COLOR.unknown, fontFamily: "'JetBrains Mono', monospace" }}>
            {node.kind}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--fg-4)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {node.summary}
          </div>
        </div>
      ),
    },
    style: {
      border: `1px solid ${KIND_COLOR[node.kind] ?? '#2c2c3c'}44`,
      borderRadius: 10,
      padding: '8px 10px',
      width: 200,
      background: 'rgba(13,13,18,0.95)',
      color: 'var(--fg)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    },
  }))

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    animated: edge.kind === 'api-flow',
    style: {
      stroke: edge.risk === 'high' ? '#f87171' : edge.risk === 'medium' ? '#fbbf24' : '#374151',
      strokeWidth: 1.5,
    },
    labelStyle: { fill: '#9ca3af', fontSize: 10 },
    labelBgStyle: { fill: 'rgba(8,8,12,0.85)', fillOpacity: 1 },
  }))

  return { nodes, edges }
}

// ─── Icon helpers ────────────────────────────────────────────
function IconExpand() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

function IconCollapse() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="10" y1="14" x2="3" y2="21" />
      <line x1="21" y1="3" x2="14" y2="10" />
    </svg>
  )
}

// ─── Shared canvas + info panel ──────────────────────────────
function VizCanvas({
  flow,
  graph,
  timeline,
  scanResult,
  canvasHeight,
}: {
  flow: { nodes: Node[]; edges: Edge[] }
  graph: VizGraphResponse | null
  timeline: TimelineResponse | null
  scanResult: ScanResult | null
  canvasHeight: number  // 0 = flex (fullscreen)
}) {
  const flex = canvasHeight === 0

  if (!scanResult) {
    return (
      <div style={{ height: flex ? undefined : canvasHeight, flex: flex ? 1 : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-4)', fontSize: 12.5 }}>
        Run analysis first to generate visualization.
      </div>
    )
  }

  return (
    <>
      <div style={{ height: flex ? undefined : canvasHeight, flex: flex ? 1 : undefined, position: 'relative', minHeight: flex ? 400 : undefined }}>
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          style={{ background: 'var(--bg)' }}
        >
          <Controls style={{ background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8 }} />
          <Background gap={20} size={1} color="#1c1c24" />
        </ReactFlow>
      </div>

      {(graph || timeline) && (
        <div style={{ borderTop: '1px solid var(--line)', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <div style={{ padding: '12px 14px', borderRight: '1px solid var(--line)', maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ color: 'var(--fg-4)', fontSize: 10, letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
              RELATIONSHIP INSIGHTS
            </div>
            {(graph?.insights ?? []).length === 0 && <div style={{ color: 'var(--fg-4)', fontSize: 12 }}>No insights generated.</div>}
            {(graph?.insights ?? []).map((insight, i) => (
              <div key={i} style={{ color: 'var(--fg-2)', fontSize: 12, marginBottom: 6, lineHeight: 1.5, borderLeft: '2px solid var(--line-2)', paddingLeft: 8 }}>
                {insight}
              </div>
            ))}
          </div>
          <div style={{ padding: '12px 14px', maxHeight: 200, overflowY: 'auto' }}>
            <div style={{ color: 'var(--fg-4)', fontSize: 10, letterSpacing: '0.12em', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 }}>
              TIMELINE INTELLIGENCE
            </div>
            {(timeline?.events ?? []).length === 0 && <div style={{ color: 'var(--fg-4)', fontSize: 12 }}>No timeline data.</div>}
            {(timeline?.events ?? []).map((ev, i) => (
              <div key={`${ev.title}-${i}`} style={{ marginBottom: 10, borderLeft: '2px solid var(--line-2)', paddingLeft: 8 }}>
                <div style={{ color: 'var(--fg)', fontSize: 12, fontWeight: 500 }}>{ev.title}</div>
                <div style={{ color: 'var(--fg-4)', fontSize: 10.5, marginTop: 2 }}>{ev.date_hint} · {ev.category}</div>
                <div style={{ color: 'var(--fg-3)', fontSize: 11.5, marginTop: 3, lineHeight: 1.45 }}>{ev.detail}</div>
              </div>
            ))}
            {timeline?.summary && (
              <div style={{ color: 'var(--fg-4)', fontSize: 11, marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--line-soft)' }}>
                {timeline.summary}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ─── Main component ──────────────────────────────────────────
export function VisualizationPanel({
  repoName,
  cloneUrl,
  scanResult,
}: {
  repoName: string
  cloneUrl: string | null
  scanResult: ScanResult | null
}) {
  const [mode, setMode] = useState<Mode>('architecture')
  const [graph, setGraph] = useState<VizGraphResponse | null>(null)
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    async function load() {
      if (!scanResult) return
      setLoading(true)
      setError('')
      setGraph(null)
      setTimeline(null)
      try {
        const payload = { repo_name: repoName, clone_url: cloneUrl, scan_result: scanResult }
        const [g, t] = await Promise.all([
          mode === 'architecture'
            ? fetchVisualizationArchitecture(payload)
            : mode === 'repository-map'
              ? fetchVisualizationRepositoryMap(payload)
              : mode === 'dependencies'
                ? fetchVisualizationDependencies(payload)
                : fetchVisualizationApiFlow(payload),
          fetchVisualizationTimeline(payload),
        ])
        setGraph(g)
        setTimeline(t)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Visualization failed')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [mode, repoName, cloneUrl, scanResult])

  // Close on Escape
  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [expanded])

  const flow = useMemo(() => (graph ? toFlow(graph) : { nodes: [], edges: [] }), [graph])

  const tabBar = (
    <div style={{
      padding: '10px 14px',
      borderBottom: '1px solid var(--line)',
      display: 'flex',
      gap: 6,
      alignItems: 'center',
      flexWrap: 'wrap',
      flexShrink: 0,
    }}>
      {(['architecture', 'repository-map', 'dependencies', 'api-flow'] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          style={{
            border: `1px solid ${mode === m ? 'var(--accent-dim)' : 'var(--line)'}`,
            background: mode === m ? 'rgba(130,200,130,0.08)' : 'transparent',
            color: mode === m ? 'var(--accent)' : 'var(--fg-3)',
            borderRadius: 7,
            padding: '5px 10px',
            fontSize: 11.5,
            fontFamily: "'JetBrains Mono', monospace",
            cursor: 'pointer',
            transition: 'all .15s',
          }}
        >
          {m}
        </button>
      ))}
      <span style={{ marginLeft: 'auto', color: 'var(--fg-4)', fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace" }}>
        INTELLIGENCE VIEW
      </span>
      <button
        onClick={() => setExpanded((v) => !v)}
        title={expanded ? 'Collapse' : 'Expand fullscreen'}
        style={{
          background: 'transparent',
          border: '1px solid var(--line)',
          borderRadius: 6,
          color: 'var(--fg-3)',
          cursor: 'pointer',
          padding: '4px 6px',
          display: 'flex',
          alignItems: 'center',
          transition: 'color .15s',
        }}
      >
        {expanded ? <IconCollapse /> : <IconExpand />}
      </button>
    </div>
  )

  const statusBar = (error || loading) && (
    <div style={{ color: error ? 'var(--warn)' : 'var(--fg-4)', padding: '8px 14px', fontSize: 12, borderBottom: '1px solid var(--line)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
      {error || 'Generating visualization…'}
    </div>
  )

  // ── Fullscreen overlay via portal ────────────────────────────
  const fullscreenOverlay = expanded && createPortal(
    <AnimatePresence>
      <motion.div
        key="viz-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false) }}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            width: '100%',
            maxWidth: 1280,
            height: '90vh',
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
          }}
        >
          {tabBar}
          {statusBar}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <VizCanvas
              flow={flow}
              graph={graph}
              timeline={timeline}
              scanResult={scanResult}
              canvasHeight={0}
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )

  // ── Inline (collapsed) view ──────────────────────────────────
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
        style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-1)' }}
      >
        {tabBar}
        {statusBar}
        <VizCanvas
          flow={flow}
          graph={graph}
          timeline={timeline}
          scanResult={scanResult}
          canvasHeight={320}
        />
      </motion.div>

      {fullscreenOverlay}
    </>
  )
}
