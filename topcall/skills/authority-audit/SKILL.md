---
name: authority-audit
description: Repeatable process to audit every source in the Top Call corpus by authority tier, flag paywalled/low-authority sources, and produce a source log.
---

# Skill — Source Authority Audit

Grade the evidence base itself. This is the trust layer made visible: which
sources the corpus rests on, how authoritative they are, and what to caveat
before a human clicks a link.

## Process

1. Load the corpus and select all `source` nodes.
2. For each source, report: publication, tier + tier label, access
   (open/paywalled/registration/limited), and how many moves it supports.
3. Flag:
   - **Tier 3** sources as discovery-only — keep out of the main brief unless
     corroborated;
   - **Tier 2** sources as primary — confirm facts, not interpretation;
   - any non-open **access** (paywalled / registration / gift / limited) so the
     label is shown *before* the user clicks.
4. Sort by authority (Tier 1A first).

## Interfaces

- CLI: `node bin/topcall.mjs audit [--json]`
- MCP tool: `authority_audit()`

## Rule

Vendor blogs, SEO pages, and unknown newsletters do not drive the brief. They may
appear in the audit as low-confidence context, clearly labeled. Numerical
forecasts and market-size claims must come from named Tier 1C analyst/trade-body
sources.
