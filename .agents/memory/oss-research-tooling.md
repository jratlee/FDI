---
name: OSS research tooling & Plan-mode network limits
description: How to run GitHub/library research in this repo — webSearch return shape, Plan-mode network block, and the unauthenticated REST API fallback.
---

# Running OSS / GitHub research here

**`webSearch` returns synthesized prose, not structured results.** The callback
returns `{ searchAnswer: <markdown> }` (a synthesized answer with tables/links),
NOT a `.results`/`.items` array. Parse the `searchAnswer` text; don't look for an
array. Its star counts / adoption figures are often wrong or conflated (e.g. it
reported AgentKit at ~5k when it was ~1.3k, and quoted x402 *protocol* adoption
as if it were repo stars). Treat them as leads, then verify.

**Plan mode blocks `gh` and network shell commands.** The command classifier
tags `gh search`/`gh api` (any network shell) as "mutating" in Plan mode and
refuses it. `code_execution` `webSearch`/`webFetch` still work in Plan mode.
Switch to Build mode to run `gh`/curl.

**Verify repo health with the unauthenticated GitHub REST API (Build mode).**
`gh` here is NOT logged in (`gh auth status` fails; no GH_TOKEN). Fastest path is
curl against `api.github.com` — unauthenticated core limit ~60/hr is plenty for a
20-repo health sweep:
- `curl -s https://api.github.com/repos/OWNER/REPO` → `.stargazers_count`,
  `.pushed_at`, `.open_issues_count`, `.license.spdx_id`, `.archived`.
- `license.spdx_id == "NOASSERTION"` / `"Other"` just means GitHub's detector saw
  a modified/dual/transitioning LICENSE. Decode `/repos/.../license` `.content`
  (base64) and read the header to identify it.

**Why:** repeatedly hit these three (empty webSearch parse, blocked gh, needing
real numbers) during an OSS discovery task; this is the working recipe.
