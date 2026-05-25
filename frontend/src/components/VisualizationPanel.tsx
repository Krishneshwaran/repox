import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import ReactFlow, { Background, Controls, MiniMap, MarkerType, type Edge, type Node } from 'reactflow'
import mermaid from 'mermaid'
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

function toFlow(graph: VizGraphResponse): { nodes: Node[]; edges: Edge[] } {
  const stepX = 220
  const stepY = 110
  const nodes: Node[] = graph.nodes.map((node, idx) => ({
    id: node.id,
    position: { x: (idx % 4) * stepX, y: Math.floor(idx / 4) * stepY },
    data: {
      label: (
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{node.label}</div>
          <div style={{ fontSize: 11, color: 'var(--fg-4)' }}>{node.summary}</div>
        </div>
      ),
    },
    style: {
      border: '1px solid var(--line)',
      borderRadius: 10,
      padding: 8,
      width: 200,
      background: 'rgba(15,16,22,0.92)',
      color: 'var(--fg)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
    },
  }))

  const edges: Edge[] = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    markerEnd: { type: MarkerType.ArrowClosed },
    animated: edge.kind === 'api-flow',
    style: { stroke: edge.risk === 'high' ? '#f87171' : edge.risk === 'medium' ? '#fbbf24' : '#6b7280' },
    labelStyle: { fill: '#9ca3af', fontSize: 11 },
  }))

  return { nodes, edges }
}

export function VisualizationPanel({ repoName, cloneUrl, scanResult }: { repoName: string; cloneUrl: string | null; scanResult: ScanResult | null }) {
  const [mode, setMode] = useState<Mode>('architecture')
  const [graph, setGraph] = useState<VizGraphResponse | null>(null)
  const [timeline, setTimeline] = useState<TimelineResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [svg, setSvg] = useState('')

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'dark' })
  }, [])

  useEffect(() => {
    async function load() {
      if (!scanResult) return
      setLoading(true)
      setError('')
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
        const render = await mermaid.render(`m-${mode}-${Date.now()}`, g.mermaid)
        setSvg(render.svg)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Visualization failed')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [mode, repoName, cloneUrl, scanResult])

  const flow = useMemo(() => (graph ? toFlow(graph) : { nodes: [], edges: [] }), [graph])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-1)' }}
    >
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {(['architecture', 'repository-map', 'dependencies', 'api-flow'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              border: '1px solid var(--line)',
              background: mode === m ? 'var(--bg-2)' : 'transparent',
              color: mode === m ? 'var(--fg)' : 'var(--fg-3)',
              borderRadius: 8,
              padding: '6px 10px',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            {m}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--fg-4)', fontSize: 11 }}>Interactive Intelligence View</span>
      </div>

      {error && <div style={{ color: 'var(--warn)', padding: 12, borderBottom: '1px solid var(--line)' }}>{error}</div>}
      {loading && <div style={{ color: 'var(--fg-4)', padding: 12, borderBottom: '1px solid var(--line)' }}>Generating visualization...</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', minHeight: 460 }}>
        <div style={{ borderRight: '1px solid var(--line)', minHeight: 460 }}>
          <ReactFlow nodes={flow.nodes} edges={flow.edges} fitView proOptions={{ hideAttribution: true }}>
            <MiniMap style={{ background: '#0d1016' }} />
            <Controls />
            <Background gap={18} size={1} color="#222634" />
          </ReactFlow>
        </div>

        <div style={{ display: 'grid', gridTemplateRows: '1fr auto auto', minHeight: 460 }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--line)', overflowY: 'auto' }}>
            <div style={{ color: 'var(--fg-3)', fontSize: 11, marginBottom: 10 }}>AI ARCHITECTURE DIAGRAM</div>
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </div>

          <div style={{ padding: 12, borderBottom: '1px solid var(--line)', maxHeight: 160, overflowY: 'auto' }}>
            <div style={{ color: 'var(--fg-3)', fontSize: 11, marginBottom: 8 }}>DEPENDENCY AND RELATIONSHIP INTELLIGENCE</div>
            {(graph?.insights ?? []).map((insight, i) => (
              <div key={i} style={{ color: 'var(--fg-2)', fontSize: 12, marginBottom: 6 }}>- {insight}</div>
            ))}
          </div>

          <div style={{ padding: 12, maxHeight: 180, overflowY: 'auto' }}>
            <div style={{ color: 'var(--fg-3)', fontSize: 11, marginBottom: 8 }}>REPOSITORY TIMELINE INTELLIGENCE</div>
            {(timeline?.events ?? []).map((ev, i) => (
              <div key={`${ev.title}-${i}`} style={{ marginBottom: 10, borderLeft: '1px solid var(--line)', paddingLeft: 8 }}>
                <div style={{ color: 'var(--fg)', fontSize: 12.5 }}>{ev.title}</div>
                <div style={{ color: 'var(--fg-4)', fontSize: 11 }}>{ev.date_hint} | {ev.category}</div>
                <div style={{ color: 'var(--fg-3)', fontSize: 11.5 }}>{ev.detail}</div>
              </div>
            ))}
            {timeline?.summary && <div style={{ color: 'var(--fg-4)', fontSize: 11 }}>{timeline.summary}</div>}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
