# Waitlist, email & data rights

Full detail for signup capture, double opt-in, transactional email, deletion,
spam defense, and retention. Summary lives in `replit.md`.

## Email-capture forms
- All email-capture forms use one generic handler: any `form.js-capture` with
  `data-source` (waitlist tag), `data-subject`/`data-mail-body` (mailto fallback),
  optional `data-download` (success triggers a file download instead of a "you're
  on the list" message), and a sibling `.form-msg` for inline status. POSTs to
  `/api/waitlist` (durable Postgres), with `mailto:` fallback on failure.

## Double opt-in (confirmed subscriptions)
- A new signup lands as **pending**
  (`confirmed_at IS NULL`) with a per-signup `confirm_token` + `confirm_sent_at`.
  The only mail it triggers is a brand-styled "Confirm your email" request
  (`sendConfirmationRequest` in `site/email.mjs`) with a unique link to `GET
  /api/waitlist/confirm?token=`. Clicking it marks the row confirmed
  (idempotently, guarded on `confirmed_at IS NULL`) and only THEN sends the
  welcome email + optional team notification (`sendWelcomeEmails`). Links expire
  after `WAITLIST_CONFIRM_DAYS` days (default 7, computed off `confirm_sent_at`);
  the confirm page (reuses the on-brand `noindex` unsubscribe shell) shows
  distinct confirmed / already-confirmed / expired / invalid states and never
  reveals whether an email exists. Re-signing up with a still-pending address
  resends the confirmation and extends the window (keeps the same token);
  re-signing up with an already-confirmed address sends nothing. Pre-double-opt-in
  rows are grandfathered to confirmed once in `ensureTable` (safe/idempotent:
  only rows with no `confirm_token` are touched). Form success copy now reads
  "check your inbox for a confirmation link"; the admin view has a Status column
  (Confirmed/Pending badges), a "N confirmed, M pending" summary, and the CSV +
  single-record export carry `status` + `confirmed_at`.

## Transactional email (Resend)
- Post-confirmation the subscriber gets a best-effort transactional welcome email
  via the **Resend** integration (`site/email.mjs`, Replit Connectors proxy): a
  brand-styled, source-aware welcome to the subscriber and, if
  `WAITLIST_NOTIFY_EMAIL` is set, a plain-text notification to the FDI team (only
  fired on confirmed, proven addresses). Mail runs after the HTTP response and
  never blocks or fails a signup/confirm. Requires `RESEND_FROM`
  (an address on a Resend-verified domain, e.g. `FDI <hello@yourdomain>`); if
  unset, the confirmation is skipped and logged. Optional `RESEND_REPLY_TO`
  (currently set to `john@ratcliffe-lee.com`, as is `WAITLIST_NOTIFY_EMAIL`).
  Until a domain is verified in Resend, `RESEND_FROM` falls back to the Resend
  shared test sender (`onboarding@resend.dev`), which only delivers to the
  Resend account owner's own address — subscriber confirmations to any other
  recipient return a 403 that's caught and logged (team notifications to the
  owner still work). Swap `RESEND_FROM` to a verified-domain address to enable
  confirmations for all subscribers.

## Self-serve deletion (data-subject rights)
- Every `waitlist_signups` row carries
  an unguessable per-signup `unsub_token` (64 hex chars, generated on insert;
  pre-existing rows backfilled in `ensureTable`). The subscriber confirmation
  email includes a one-click "Remove me from the list" link plus RFC 8058
  `List-Unsubscribe`/`List-Unsubscribe-Post` headers pointing at
  `/unsubscribe?token=`. `GET|POST /unsubscribe` validates the token server-side,
  hard-deletes only that row (a token can never touch another record), and renders
  a responsive, on-brand, `noindex` confirmation page. Invalid/used tokens get a
  generic "link no longer active" page (never reveals whether an email exists);
  the email is never logged. Deletion is idempotent.

## Spam / bot defense
- Signup defense: a hidden `company` honeypot field, a per-IP
  rate limit, and a disposable-email-domain blocklist. The blocklist is NOT a
  hardcoded ~20-entry set anymore: `serve.mjs` loads a large, community-
  maintained list from the bundled `site/disposable-domains.txt` at startup and
  always merges in a `CORE_DISPOSABLE_DOMAINS` baseline (so it degrades to the
  known-bad core if the file is missing). Refresh the bundled list with `node
  site/refresh-disposable-domains.mjs` (`--dry-run` to preview); it fetches the
  public disposable-email-domains blocklist (override with
  `DISPOSABLE_DOMAINS_URL`), refuses to write a suspiciously small result, and
  is safe to schedule. Optional deliverability gate: set `WAITLIST_MX_CHECK=1`
  to also reject domains that authoritatively can't receive mail (MX then A/AAAA
  lookup, 6h cache); it fails OPEN so transient DNS errors never block a real
  address.

## Retention
- Waitlist emails are not kept forever. `site/purge.mjs` hard-deletes
  signups older than the window that have NOT converted (converted = the email
  appears in `skillfoundry_entitlements`; the join is skipped if that table
  doesn't exist). Window is `WAITLIST_RETENTION_DAYS` (default 730 = ~24 months;
  a value of 0 or below is rejected and falls back to the default as a safety).
  Run `node site/purge.mjs` (or `--dry-run` to report the count only); logs counts
  and the window only, never emails. Safe to schedule.
