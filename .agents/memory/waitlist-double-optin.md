---
name: Waitlist double opt-in
description: How the FDI site's confirmed-subscription (double opt-in) flow is structured and why.
---
# Waitlist double opt-in (site/)

New signups land **pending** (`confirmed_at IS NULL`) with a per-row
`confirm_token` + `confirm_sent_at`. Only a "Confirm your email" request is sent
up front; the welcome email + team notification are held until the subscriber
clicks `GET /api/waitlist/confirm?token=`.

**Why:** proving the address before mailing it cuts typos/bad addresses, protects
deliverability/sender reputation, and satisfies consent expectations (GDPR).

**How to apply / gotchas:**
- Confirm marking is idempotent — the UPDATE is guarded on `confirmed_at IS NULL`
  so a double-clicked link never fires the welcome email twice.
- Grandfathering: `ensureTable` runs a one-shot `UPDATE ... SET confirmed_at =
  created_at WHERE confirmed_at IS NULL AND confirm_token IS NULL`. It is safe to
  re-run because any genuinely pending row carries a `confirm_token`. If you ever
  insert pending rows WITHOUT a confirm_token, this migration would wrongly
  confirm them.
- Expiry is computed off `confirm_sent_at` (NOT `created_at`, so re-sends can
  extend the window without lying about signup time). Window = `WAITLIST_CONFIRM_DAYS`
  (default 7).
- Re-signing up while pending resends + refreshes `confirm_sent_at` but keeps the
  same token; re-signing up while confirmed sends nothing.
- The confirm page reuses the on-brand `noindex` unsubscribe shell (title param)
  and, like unsubscribe, never reveals whether an email exists.
- Team notification fires from `sendWelcomeEmails` (on confirm), not on raw
  signup, so the team only hears about proven addresses.
