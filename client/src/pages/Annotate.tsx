import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDraft, updateDraft, finalizeDraftToPdf } from '../lib/api'

type Image = { id?: string; url: string; thumb?: string; filename?: string; note?: string }
type Finding = { imageUrl: string; severity?: string; issue?: string; comment?: string }
type DraftResponse = {
  id: string
  status: 'draft' | 'finalized'
  createdAt: string
  updatedAt: string
  payload: {
    media?: { images?: Image[] }
    findings?: Finding[]
    [k: string]: unknown
  }
}

const SEVERITIES = ['None', 'Low', 'Medium', 'High', 'Critical']

export default function Annotate() {
  const { draftId } = useParams<{ draftId: string }>()
  const [data, setData] = useState<DraftResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [finalizing, setFinalizing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!draftId) { setError('Missing draftId'); setLoading(false); return }
      try {
        setLoading(true)
        const json = await getDraft(draftId)
        if (!cancelled) setData(json as DraftResponse)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load draft')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [draftId])

  const images = useMemo(() => data?.payload?.media?.images ?? [], [data])
  const findings = useMemo(() => data?.payload?.findings ?? [], [data])

  const getFinding = (url: string): Finding => {
    return findings.find(f => f.imageUrl === url) || { imageUrl: url }
  }

  const updateFinding = async (url: string, patch: Partial<Finding>) => {
    if (!draftId || !data) return
    const existing = findings
    const next = existing.some(f => f.imageUrl === url)
      ? existing.map(f => f.imageUrl === url ? { ...f, ...patch } : f)
      : [...existing, { imageUrl: url, ...patch }]
    const nextData = { ...data, payload: { ...data.payload, findings: next } }
    setData(nextData)
    try {
      await updateDraft(draftId, { findings: next })
    } catch (e) {
      console.error('Failed to save finding', e)
    }
  }

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    SEVERITIES.forEach(s => { counts[s] = 0 })
    findings.forEach(f => {
      if (f.severity && counts[f.severity] !== undefined) {
        counts[f.severity]++
      }
    })
    return counts
  }, [findings])

  const onFinalize = async () => {
    if (!draftId) return
    try {
      setFinalizing(true)
      const blob = await finalizeDraftToPdf(draftId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${draftId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to finalize report')
      console.error(e)
    } finally {
      setFinalizing(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Annotate</h1>
          <p className="text-sm text-gray-500">
            Draft ID: <span className="font-mono">{draftId}</span>
            {data ? <> · Status: {data.status} · Updated: {new Date(data.updatedAt).toLocaleString()}</> : null}
          </p>
        </div>
        <button
          onClick={onFinalize}
          disabled={finalizing}
          className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {finalizing ? 'Generating…' : 'Finalize PDF'}
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto w-full space-y-8">
        {loading && <div className="rounded-lg border p-6 text-gray-500">Loading…</div>}
        {error && <div className="rounded-lg border p-6 text-red-600">Error: {error}</div>}
        {!loading && !error && (
          <>
            {/* Overview */}
            <section className="rounded-lg border p-4">
              <h2 className="text-lg font-semibold mb-3">Severity overview</h2>
              <ul className="flex gap-4 text-sm">
                {SEVERITIES.map(s => (
                  <li key={s}>
                    <span className="font-medium">{s}:</span> {severityCounts[s]}
                  </li>
                ))}
              </ul>
            </section>

            {/* Findings table */}
            {findings.length > 0 && (
              <section className="rounded-lg border p-4 overflow-x-auto">
                <h2 className="text-lg font-semibold mb-3">Findings</h2>
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2">Image</th>
                      <th className="p-2">Severity</th>
                      <th className="p-2">Issue</th>
                      <th className="p-2">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((f, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 max-w-[120px] truncate">{f.imageUrl}</td>
                        <td className="p-2">{f.severity}</td>
                        <td className="p-2">{f.issue}</td>
                        <td className="p-2">{f.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Media editor */}
            {images.length === 0 ? (
              <div className="rounded-lg border p-6 text-gray-500">No images in this draft yet.</div>
            ) : (
              <ul className="space-y-6">
                {images.map((img, i) => {
                  const f = getFinding(img.url)
                  return (
                    <li key={img.id || img.filename || img.url || i} className="rounded-lg border overflow-hidden">
                      <img
                        src={img.thumb || img.url}
                        alt={img.filename || 'image'}
                        className="w-full max-h-96 object-contain bg-gray-50"
                        loading="lazy"
                      />
                      <div className="p-3 text-sm text-gray-700 space-y-3">
                        <div className="font-medium truncate">{img.filename || img.url}</div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600">Severity</label>
                          <select
                            className="border rounded px-2 py-1 text-sm"
                            value={f.severity || 'None'}
                            onChange={e => updateFinding(img.url, { severity: e.target.value })}
                          >
                            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">Issue</label>
                          <input
                            className="w-full border rounded px-2 py-1 text-sm"
                            value={f.issue || ''}
                            onChange={e => updateFinding(img.url, { issue: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600">Comment</label>
                          <textarea
                            className="w-full border rounded px-2 py-1 text-sm"
                            rows={3}
                            value={f.comment || ''}
                            onChange={e => updateFinding(img.url, { comment: e.target.value })}
                          />
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}
