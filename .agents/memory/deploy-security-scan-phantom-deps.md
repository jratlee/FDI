---
name: Deploy security scan phantom deps
description: Why a never-installed Python transitive can block a Node-only Replit deployment, and how to fix it.
---

# Deploy security scan blocks on phantom optional/dev transitive deps

Replit's deployment security gate (scanner: `socket`, surfaced via
`runDependencyAudit()`) resolves a Python dependency **manifest** (`requirements.txt`)
and flags transitive dependencies **including optional / dev-only / environment-marker-gated
extras** — even ones that are never actually installed in this environment.

Real case: the public site deploys Node-only (`node site/serve.mjs`; build is pure
`npm ci` + a Node check). But the repo's `requirements.txt` (there only for the
internal, non-deployed Streamlit tool `app.py`) listed `plotly`. Plotly's package
metadata declares `fiona<=1.9.6; python_version <= "3.8" and extra == "dev"`. The
scanner resolved that phantom extra to `fiona@1.9.6` (a critical GHSA) and **blocked
the publish**, despite fiona never being installed (repl is Python 3.12) and the live
app having no Python at all.

**Why:** the scanner ignores the `python_version` and `extra` markers and resolves
optional extras; the block is on the *package graph declared by the manifest*, not on
what is actually installed. The deploy build log shows it as
`Deployment blocked: found N critical vulnerabilities`.

**How to apply / fix:**
- Do NOT try to pin the parent package to a "clean" version — plotly's fiona dev
  extra is present in every published version (checked latest 6.8.0), so pinning does nothing.
- Remove the offending package from the scanned manifest at its root: uninstall it
  (`uninstallLanguagePackages`) AND delete it from `requirements.txt`, then migrate any
  real usage. Here app.py's single `px.area` chart was moved to matplotlib (already a dep).
- Verify with `runDependencyAudit()` that the **critical** count is 0 (the deploy gate
  blocks on criticals; highs like a lingering `pyo3` do not block).
- Note the local `runDependencyAudit()` reads *installed* packages too, so it can still
  show a finding until you also uninstall — but the deploy manifest scan clears once the
  package leaves `requirements.txt`.
