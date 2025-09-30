// server/src/index.ts
import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";

// --- Load env from repo root .env (stable in dev & dist) ---
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import express, { NextFunction, Request, Response } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { jsonDefault } from "./middleware/jsonDefault";

import healthRouter from "./routes/health";
import draftsRouter from "./routes/drafts";
import previewRouter from "./routes/preview";
import authRouter from "./routes/auth";
import templatesRouter from "./routes/templates";

const app = express();
app.set("trust proxy", true);

// CORS for browser auth cookies (supports comma-separated origins)
const ORIGINS = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // non-browser clients
      cb(null, ORIGINS.includes(origin));
    },
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
// Default JSON content-type for API and other JSON responses
app.use(jsonDefault);

// Static uploads (stable path relative to dist)
const ROOT = path.resolve(__dirname, ".."); // server/dist
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(ROOT, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR, { fallthrough: false }));

// API routes
app.use("/api", healthRouter);
app.use("/api", authRouter);
app.use("/api", templatesRouter);
app.use("/api/drafts", draftsRouter);
app.use("/api", previewRouter);

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
  if (req.path.startsWith("/api")) return res.status(404).type("application/json").send({ error: "not_found" });
  if (staticDir) return res.sendFile(path.join(staticDir, "index.html"));
  return res.status(404).type("text/plain").send("Client not built");
});

// Centralized error handler → JSON
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

  console.error("[api error]", message, err?.stack || err);

  res.status(status).type("application/json").send(body);
});

const port = Number(process.env.PORT || 3000);
console.log(`listening :${port}`, "CORS origins:", ORIGINS.join(", "));
app.listen(port);
