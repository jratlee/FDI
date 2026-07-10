# Internal admin tools (token-gated)

All three tools share the `WAITLIST_ADMIN_TOKEN` auth. Summary lives in
`replit.md`.

## Process Defragmentation Report generator (NOT public)
- `site/defrag.mjs` (LLM engine + Postgres storage) and `site/defrag-report.mjs`
  (branded HTML template + headless-chromium PDF). Owner pastes a prospect's
  workflow doc at `GET /admin/defrag` (same `WAITLIST_ADMIN_TOKEN` auth/cookie
  as the waitlist admin); `POST /admin/defrag/generate` calls the Replit
  OpenAI integration (`AI_INTEGRATIONS_OPENAI_{BASE_URL,API_KEY}`, model
  `DEFRAG_MODEL` default `gpt-5`, `max_completion_tokens` kept high because
  gpt-5 burns hidden reasoning tokens first) with the report rubric as a system
  prompt. Injection defense: the doc is fenced as untrusted DATA (delimiters
  neutralized if smuggled in), the model is told to never follow instructions
  inside it, output is a fixed JSON shape that is validated/clamped
  (`normalizeReport`), and every string is HTML-escaped at render. Report =
  bottleneck diagnosis (severity), Audit-to-Kill candidates, Use/Compose/Build
  calls, readiness score 0-100 + rationale, recommendations; softened risk
  language + not-legal-advice disclaimer baked into the prompt and footer; no
  em-dashes. Cost/abuse controls: `DEFRAG_DAILY_LIMIT` (default 10 per 24h,
  counted from stored rows) and 200-24000 char input caps. Data posture (shown
  at the submission form): doc + report stored in `defrag_reports`, hard-deleted
  after `DEFRAG_RETENTION_DAYS` (default 90, opportunistic purge), per-report
  Delete button, no training on client data. Views: `/admin/defrag` (form +
  history + quota meter), `/admin/defrag/report?id=` (branded HTML with
  back/PDF toolbar), `/admin/defrag/report.pdf?id=` (flowing Letter PDF via
  puppeteer-core + Nix chromium, brand woff2 fonts base64-embedded), `POST
  /admin/defrag/delete`. Degrades gracefully: generation disabled with a notice
  if the AI env vars are unset.

## Revenue pipeline tracker
- Revenue pipeline tracker (internal, token-gated): `GET /admin/pipeline`
  (same `WAITLIST_ADMIN_TOKEN` auth + noindex adminShell) with targets CRUD
  (`POST /admin/pipeline/save|delete`; name, org, segment, stage, value USD,
  next action, notes), funnel chips Target→Contacted→Discovery→Audit/Proposal→
  Closed (+Lost), and a goal bar showing closed $ vs the $5,000 bi-weekly
  Aug 15 2026 goal (`GOAL` in `site/pipeline.mjs`, table `pipeline_targets`).

## Waitlist admin view
- Internal, token-gated signups view (NOT linked from public nav): `GET
  /admin/waitlist` shows a login form; on POST it timing-safe-compares the token
  against the `WAITLIST_ADMIN_TOKEN` secret and sets an httpOnly `wl_admin`
  cookie (12h). Once authed it lists all signups (email, source, created_at,
  newest first) with a "Download CSV" link, plus a row of per-source count chips
  (All + one per source, most signups first) that filter the table when clicked.
  Both the table and CSV honor an optional `?source=` filter (sanitized with the
  same allow-list as signup inserts); the filtered CSV filename includes the
  source and the download button targets the active filter. `GET
  /admin/waitlist.csv` streams the (optionally filtered) list as a dated CSV
  attachment. Auth accepts the cookie, a `Bearer` token, or a `?token=` query
  param. `/admin/logout` clears the cookie. Returns `503` if
  `WAITLIST_ADMIN_TOKEN` is unset. Pages carry `noindex, nofollow`. The view also
  has a "Data rights" section: `POST /admin/waitlist/delete` (authed) hard-deletes
  one signup by email for erasure requests (redirects back with a generic status,
  never logs the email), and `GET /admin/waitlist/record?email=` streams a single
  person's record as a JSON attachment for a data-access request (email, source,
  created_at only; the `unsub_token` is treated as a credential and excluded).
