import path from "node:path";
import dotenv from "dotenv";

// Load env from repo root .env (safe if missing on Heroku)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express, { NextFunction, Request, Response } from "express";
import fs from "node:fs";
import healthRouter from "./routes/health";
import createDraftRouter from "./routes/createDraft";
import draftsRouter from "./routes/drafts";

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "50mb" }));

// API routes
app.use("/api", healthRouter);
app.use("/api", createDraftRouter);
app.use("/api", draftsRouter);

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

// Centralized error handler → JSON
// - Zod/validation: 400
// - Gotenberg/downstream: 502
// - else: 500
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const message = String(err?.message || "internal error");
  const statusExplicit = Number(err?.status);
  const isValidation = statusExplicit === 400 || /Invalid intake/i.test(message);
  const isGotenberg = /Gotenberg error/i.test(message);

  const status = isValidation ? 400 : isGotenberg ? 502 : 500;
  const body =
    isValidation
      ? { error: "validation", details: message }
      : isGotenberg
      ? { error: "renderer", message }
      : { error: "internal" };

  // Keep consistent content type
  res.status(status).type("application/json").send(body);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`listening :${port}`));
