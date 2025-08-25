import { useCallback, useMemo, useState } from "react"

type Media = { type: "image" | "video"; url: string; thumb: string; filename?: string; mime?: string; size?: number }

declare global {
  interface Window { uploadcare?: any }
}

// helpers
const isImage = (mime?: string) => !!mime && mime.startsWith("image/")
const isVideo = (mime?: string) => !!mime && mime.startsWith("video/")
const imgThumb = (cdnUrl: string) => `${cdnUrl}-/resize/1600x/-/quality/smart/`
const videoPoster = (cdnUrl: string) => `${cdnUrl}-/thumb/-/resize/1600x/`

export default function IntakeForm() {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [files, setFiles] = useState<Media[]>([])
  const [tier, setTier] = useState<"raw" | "polished">("raw")

  const fileCounts = useMemo(() => {
    let images = 0, videos = 0
    files.forEach(f => { if (f.type === "image") images++; else videos++; })
    return { images, videos }
  }, [files])

  const openUploader = useCallback(async () => {
    const uc = window.uploadcare
    if (!uc) { setErrorMsg("Uploader not initialized"); return }
    // open multiple file dialog; key can also be set globally but we pass explicitly
    const dialog = uc.openDialog(null, { publicKey: import.meta.env.VITE_UPLOADCARE_PUBLIC_KEY, multiple: true })
    const data = await dialog.done()
    // Classic widget returns a group if multiple selected
    const items: any[] = data.files ? await Promise.all(data.files()) : [await data.file()]
    const resolved: Media[] = []
    for (const it of items) {
      const f = await it
      const cdnUrl: string = f.cdnUrl // https://ucarecdn.com/<uuid>/
      const mime: string | undefined = f?.sourceInfo?.file?.type || f?.data?.mimeType || f?.mimeType
      const name: string | undefined = f?.name || f?.sourceInfo?.file?.name
      const size: number | undefined = f?.size
      if (isImage(mime)) {
        resolved.push({ type: "image", url: cdnUrl, thumb: imgThumb(cdnUrl), filename: name, mime, size })
      } else if (isVideo(mime)) {
        resolved.push({ type: "video", url: cdnUrl, thumb: videoPoster(cdnUrl), filename: name, mime, size })
      }
    }
    setFiles(prev => {
      const merged = [...prev, ...resolved]
      // enforce hard caps: ≤200 images, ≤3 videos
      const imgs = merged.filter(f => f.type === "image").slice(0, 200)
      const vids = merged.filter(f => f.type === "video").slice(0, 3)
      return [...imgs, ...vids]
    })
    setErrorMsg(null)
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg(null)

    const fd = new FormData(e.currentTarget)
    const contact = {
      email: String(fd.get("email") || ""),
      company: String(fd.get("company") || ""),
      project: String(fd.get("project") || ""),
    }
    const notes = String(fd.get("notes") || "")
    const brandColor = String(fd.get("brandColor") || "#1f2937")
    const logoUrl = String(fd.get("logoUrl") || "")

    if (!contact.email || !contact.project) {
      setErrorMsg("Email and project name are required.")
      return
    }
    if (files.length === 0) {
      setErrorMsg("Please add images or videos.")
      return
    }

    setLoading(true)
    try {
      const resp = await fetch("/api/create-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, notes, brandColor, logoUrl: logoUrl || undefined, files, tier })
      })
      if (!resp.ok) {
        const t = await resp.text()
        throw new Error(t || `Server error ${resp.status}`)
      }
      // expect PDF stream for RAW; for future POLISHED, backend could return JSON
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `DroneReport_${contact.project.replace(/\s+/g, "_")}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      setErrorMsg(err?.message || "Draft generation failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="intake" className="py-16 px-6 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Start a report</h2>

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Email*</label>
            <input name="email" type="email" required className="mt-1 w-full border rounded-lg p-3" />
          </div>
          <div>
            <label className="block text-sm font-medium">Company</label>
            <input name="company" className="mt-1 w-full border rounded-lg p-3" />
          </div>
          <div>
            <label className="block text-sm font-medium">Project name*</label>
            <input name="project" required className="mt-1 w-full border rounded-lg p-3" />
          </div>
          <div>
            <label className="block text-sm font-medium">Brand color</label>
            <input name="brandColor" type="text" placeholder="#1f2937" className="mt-1 w-full border rounded-lg p-3" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Notes / focus</label>
            <textarea name="notes" rows={4} className="mt-1 w-full border rounded-lg p-3" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Logo URL (optional)</label>
            <input name="logoUrl" type="url" placeholder="https://..." className="mt-1 w-full border rounded-lg p-3" />
          </div>
        </div>

        {/* Tier selector */}
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="tier" checked={tier === "raw"} onChange={() => setTier("raw")} />
            <span className="text-sm">Raw Draft</span>
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="tier" checked={tier === "polished"} onChange={() => setTier("polished")} />
            <span className="text-sm">Polished (manual review later)</span>
          </label>
        </div>

        {/* Uploadcare */}
        <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Media</div>
              <div className="text-xs text-gray-600">Images ≤200, Videos ≤3. Types: JPG, PNG, MP4.</div>
            </div>
            <button type="button" onClick={openUploader} className="px-4 py-2 rounded-md bg-gray-900 text-white hover:bg-gray-800">
              Select files
            </button>
          </div>

          {files.length > 0 && (
            <div className="mt-3 text-sm text-gray-700">
              Selected: {fileCounts.images} images, {fileCounts.videos} videos
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-60">
          {loading ? "Generating draft…" : "Generate Raw Draft"}
        </button>

        {errorMsg && <p className="text-sm text-red-600">Error: {errorMsg}</p>}
      </form>
    </section>
  )
}
