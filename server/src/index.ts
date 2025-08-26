import express from "express"
import path from "node:path"
import fs from "node:fs"
import { reports } from "./routes/reports"

const app = express()
app.use(express.json({ limit: "20mb" }))

// API
app.use("/api", reports)

// static
const pub = path.resolve(__dirname, "../public")
app.use(express.static(pub))

// health
app.get("/health", (_req: express.Request, res: express.Response) => res.json({ ok: true }))

// SPA fallback for non-API routes
const indexFile = path.join(pub, "index.html")
app.get("*", (req: express.Request, res: express.Response) => {
  if (req.path.startsWith("/api")) return res.status(404).send("Not found")
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile)
  return res.status(404).send("Client not built")
})

const port = Number(process.env.PORT || 3000)
app.listen(port, () => console.log(`listening :${port}`))
