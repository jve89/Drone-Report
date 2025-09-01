import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getDraft } from '../lib/api'

type Image = { id?: string; url: string; thumb?: string; filename?: string; note?: string }
type Video = { url: string; thumb?: string; filename?: string }
type DraftResponse = {
  id: string
  status: 'draft' | 'finalized'
  createdAt: string
  updatedAt: string
  payload: {
    media?: { images?: Image[]; videos?: Video[] }
    [k: string]: unknown
  }
}

export default function Annotate() {
  const { draftId } = useParams<{ draftId: string }>()
  const [data, setData] = useState<DraftResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

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

  const items = useMemo(() => {
    const imgs = (data?.payload?.media?.images ?? []).map(i => ({ kind: 'image' as const, ...i }))
    const vids = (data?.payload?.media?.videos ?? []).map(v => ({ kind: 'video' as const, ...v }))
    return [...imgs, ...vids]
  }, [data])

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4">
        <h1 className="text-xl font-semibold">Annotate</h1>
        <p className="text-sm text-gray-500">
          Draft ID: <span className="font-mono">{draftId}</span>
          {data ? <> · Status: {data.status} · Updated: {new Date(data.updatedAt).toLocaleString()}</> : null}
        </p>
      </header>

      <main className="p-6 max-w-6xl mx-auto w-full">
        {loading && <div className="rounded-lg border p-6 text-gray-500">Loading…</div>}
        {error && <div className="rounded-lg border p-6 text-red-600">Error: {error}</div>}
        {!loading && !error && (
          items.length === 0 ? (
            <div className="rounded-lg border p-6 text-gray-500">No media in this draft yet.</div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m: any, i: number) => (
                <li key={m.id || m.filename || m.url || i} className="rounded-lg border overflow-hidden">
                  {m.kind === 'image' ? (
                    <img src={m.thumb || m.url} alt={m.filename || 'image'} className="w-full h-56 object-cover" loading="lazy" />
                  ) : (
                    <video src={m.url} className="w-full h-56 object-cover" controls preload="metadata" />
                  )}
                  <div className="p-3 text-sm text-gray-700">
                    <div className="font-medium truncate">{m.filename || m.url}</div>
                    <div className="text-gray-500">{m.kind}</div>
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </main>
    </div>
  )
}
