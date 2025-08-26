import express from "express"
import path from "node:path"
import { reports } from "./routes/reports"

const app = express()
app.use(express.json({ limit: "20mb" }))

app.use("/api", reports)

const pub = path.resolve(__dirname, "../public")
app.use(express.static(pub))

app.get("/health", (_req: express.Request, res: express.Response) => res.json({ ok: true }))

const port = Number(process.env.PORT || 3000)
app.listen(port, () => console.log(`listening :${port}`))
