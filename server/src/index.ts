import express from "express";
import path from "node:path";
import fs from "node:fs";
import healthRouter from "./routes/health";
import createDraftRouter from "./routes/createDraft";

const app = express();
app.use(express.json({ limit: "20mb" }));

// Health + PDF draft
app.use("/", healthRouter);
app.use("/", createDraftRouter);

// Static serving: SERVER_PUBLIC (via SERVE_DIR) → server/public → client/dist
const candidates = [
  process.env.SERVE_DIR && path.resolve(process.cwd(), process.env.SERVE_DIR),
  path.resolve(__dirname, "../public"),
  path.resolve(__dirname, "../../client/dist"),
].filter(Boolean) as string[];

const staticDir = candidates.find(
  (p) => fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))
);

app.use(staticDir ? express.static(staticDir) : (_req, res, next) => next());

// SPA fallback (preserve API 404s)
app.get("*", (req: express.Request, res: express.Response) => {
  if (req.path.startsWith("/api")) return res.status(404).send("Not found");
  if (staticDir) return res.sendFile(path.join(staticDir, "index.html"));
  return res.status(404).send("Client not built");
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`listening :${port}`));
