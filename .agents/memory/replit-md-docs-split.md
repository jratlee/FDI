---
name: replit.md split into docs/
description: replit.md is a summary/index; deep detail lives verbatim in docs/*.md
---
Rule: keep `replit.md` compact (it truncates in agent context past ~8k tokens). Deep detail for each area lives in `docs/public-site.md`, `docs/waitlist-email.md`, `docs/commerce.md`, `docs/admin-tools.md`, `docs/export-assets.md` — read the relevant one before working in that area, and update it (not just replit.md) when facts change.

**Why:** user preference is strict "never trim content" from project docs; the oversized replit.md was getting truncated, which itself lost context. Splitting preserves everything and keeps the index fully loaded.

**How to apply:** new durable detail goes to the matching docs/ file; replit.md gets only the one-line summary/flag if it's a locked rule or live/off switch.
