import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "dist");
const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

/* ---------------- waitlist storage (Postgres) ---------------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
  : null;
let dbReady = null;

function ensureTable() {
  if (!pool) return Promise.resolve(false);
  if (!dbReady) {
    dbReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS waitlist_signups (
           id BIGSERIAL PRIMARY KEY,
           email TEXT NOT NULL UNIQUE,
           source TEXT,
           created_at TIMESTAMPTZ NOT NULL DEFAULT now()
         )`,
      )
      .then(() => true)
      .catch((err) => {
        console.error("[waitlist] table init failed:", err.message);
        dbReady = null; // allow a retry on next request
        throw err;
      });
  }
  return dbReady;
}

function readBody(req, limit = 4096) {
  return new Promise((resolve, reject) => {
    let data = "";
    let over = false;
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > limit) {
        over = true;
        req.destroy();
      }
    });
    req.on("end", () => (over ? reject(new Error("payload too large")) : resolve(data)));
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

async function handleWaitlist(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }
  if (!pool) {
    sendJson(res, 503, { ok: false, error: "storage_unavailable" });
    return;
  }
  let email;
  try {
    const raw = await readBody(req);
    const parsed = raw ? JSON.parse(raw) : {};
    email = String(parsed.email || "").trim().toLowerCase();
  } catch {
    sendJson(res, 400, { ok: false, error: "bad_request" });
    return;
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    sendJson(res, 422, { ok: false, error: "invalid_email" });
    return;
  }
  try {
    await ensureTable();
    const result = await pool.query(
      `INSERT INTO waitlist_signups (email, source)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [email, "skillfoundry"],
    );
    sendJson(res, 200, { ok: true, duplicate: result.rowCount === 0 });
  } catch (err) {
    console.error("[waitlist] insert failed:", err.message);
    sendJson(res, 500, { ok: false, error: "server_error" });
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

if (!fs.existsSync(path.join(DIST, "index.html"))) {
  console.error(
    "[serve] dist/ not built. Run `node build.mjs` first (or `npm run build`).",
  );
  process.exit(1);
}

function resolveFile(urlPath) {
  // strip query/hash, decode, prevent traversal
  let p;
  try {
    p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  } catch {
    return null; // malformed URI encoding -> treat as bad request
  }
  if (p.endsWith("/")) p += "index.html";
  const candidates = [p];
  if (!path.extname(p)) candidates.push(p + ".html"); // /field-guide -> field-guide.html
  for (const c of candidates) {
    const full = path.normalize(path.join(DIST, c));
    if (
      (full === DIST || full.startsWith(DIST + path.sep)) &&
      fs.existsSync(full) &&
      fs.statSync(full).isFile()
    )
      return full;
  }
  return null;
}

const server = http.createServer((req, res) => {
  const rawPath = (req.url || "/").split("?")[0].split("#")[0];
  try {
    decodeURIComponent(rawPath);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("400 Bad Request");
    return;
  }
  if (rawPath === "/api/waitlist") {
    handleWaitlist(req, res);
    return;
  }
  const file = resolveFile(req.url || "/");
  if (!file) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      "<!doctype html><meta charset=utf-8><title>404</title><body style='background:#0D0B08;color:#F0E8D5;font-family:system-ui;padding:60px'><h1>404 — not found</h1><p><a style='color:#FFB12B' href='/'>Back to False Dawn Industries</a></p>",
    );
    return;
  }
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const immutable = ["/fonts/", "/assets/"].some((d) =>
    req.url.startsWith(d),
  );
  const headers = { "Content-Type": type };
  headers["Cache-Control"] = immutable
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300";
  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[serve] False Dawn Industries site on http://${HOST}:${PORT}`);
});
