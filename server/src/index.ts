import path from "node:path";
import dotenv from "dotenv";

// Load env from repo root .env **before** importing routes that may read env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express from "express";
import fs from "node:fs";
import healthRouter from "./routes/health";
import createDraftRouter from "./routes/createDraft";

const app = express();
app.use(express.json({ limit: "20mb" }));

// API routes
app.use("/api", healthRouter);
app.use("/api", createDraftRouter);

// Static serving: SERVE_DIR → server/public → client/dist
const candidates = [
  process.env.SERVE_DIR && path.resolve(process.cwd(), process.env.SERVE_DIR),
  path.resolve(__dirname, "../public"),
  path.resolve(__dirname, "../../client/dist"),
].filter(Boolean) as string[];

const staticDir = candidates.find(
  (p) => fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))
);

if (staticDir) app.use(express.static(staticDir));

// SPA fallback (preserve API 404s)
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).send("Not found");
  if (staticDir) return res.sendFile(path.join(staticDir, "index.html"));
  return res.status(404).send("Client not built");
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`listening :${port}`));
