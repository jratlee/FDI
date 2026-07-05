# 05 · Lead Capture & SkillFoundry Follow-Up

The workshop reuses the site's existing waitlist mechanism so no new registration
code is required (building a bespoke event-registration page is out of scope and a
possible later task).

## What already exists (reuse this)

- `POST /api/waitlist` accepts `{ email, source }`, validates the email, sanitizes
  `source` against an allow-list of `[a-z0-9._-]` (anything else falls back to
  `site`), and upserts into the durable `waitlist_signups` Postgres table with
  `ON CONFLICT DO NOTHING`.
- Any front-end `form.js-capture` with a `data-source` attribute POSTs there, with
  a `mailto:` fallback on failure.
- A genuinely new signup triggers a best-effort, source-aware welcome email via
  Resend, and (if `WAITLIST_NOTIFY_EMAIL` is set) a plain-text notification to the
  FDI team. Every confirmation email carries a one-click unsubscribe link and RFC
  8058 headers, so capture is compliant out of the box.
- Signups are visible in the token-gated admin view at `/admin/waitlist`, which
  filters by source and exports CSV per source.

**Implication:** in-room capture is just a QR code pointing at a waitlist form
whose `data-source` is set to a per-session workshop tag. The confirmation email,
team notification, dedupe, unsubscribe, and admin reporting all work already.

## In-room capture

**Primary: the table-tent QR.**

- Put a QR on every table tent and on the closing slide. It resolves to the
  existing waitlist form with the session's source tag.
- Use one tag per session so the admin view segments the room cleanly:
  - Session 0 → `workshop-terrain`
  - Session 1 (flagship) → `workshop-aggregated`
  - Session 2 → `workshop-decentralized`
  - Session 3 → `workshop-autonomous`
  - A generic recurring open table → `workshop`
- All tags satisfy the `[a-z0-9._-]` allow-list, so no server change is needed.
- **When to capture:** during Beat 1 (arrival), before the content starts. Capture
  rate is highest before people are absorbed. The facilitator and floater both
  prompt it (see `03`).

**Backup: index cards.** If venue Wi-Fi fails, collect name + email on index cards
and add them to the waitlist afterward through the admin flow with the right source
tag. Never let a room go uncaptured because of connectivity.

**Consent, kept clean.** The QR form is a genuine opt-in ("send me tonight's
worksheet and the follow-up"). The existing welcome email's one-click unsubscribe
and List-Unsubscribe headers mean every attendee can leave in one tap. Do not
pre-check anything or add people who did not opt in; the index-card fallback is
still an explicit hand-written opt-in.

## The follow-up sequence (routes warm leads to SkillFoundry)

A five-touch sequence over ~2 weeks, tuned to the beachhead's habits (they run
their own newsletters and buy $29 tools the same afternoon). The Day 0 touch is the
existing Resend welcome; the rest can run from the same list export or any email
tool, segmented by the session source tag.

| Touch | Timing | Purpose | Content |
|---|---|---|---|
| **1 · Confirmation** | Day 0, automatic | Deliver the promise, set the funnel | Existing Resend welcome, source-aware. Attach/link tonight's worksheet (`04`) and the take-home one-pager. |
| **2 · The thesis** | Day 1 | Deepen belief | "Here is the full map behind what you built." Link the Field Guide + the free Top Call prompt-pack. Ask the one thesis-validation question again by reply (feeds `06`). |
| **3 · The ceiling** | Day 4 | Create the pull | "Did you notice the answer object starts evaporating the moment you close the notebook?" Name the by-hand ceiling. Soft intro SkillFoundry as *repeat and prove what you did in the room*. |
| **4 · The offer** | Day 7 | Convert Tier 1 | Direct SkillFoundry invite: a short demo link or the $29 one-time license. Position as the repeatable, provable version of the workshop skill. One clear CTA. |
| **5 · The loop** | Day 12 | Re-engage + refer | "Next Table is Decentralized." Invite them back, invite them to bring a peer (they are referral nodes into Tier 2/3), and share one attendee win from the session. |

**Segmentation:** because every signup carries its session source tag, you can
tailor Touch 5 (which session to invite them back to) and measure conversion per
session from the admin CSV.

**Tone / brand:** FDI master brand and Growth Cartography framing lead every email;
warm two-tone palette if HTML; Signal Orange only in the logo mark; no em-dashes in
public-facing copy (rewrite sentences instead), consistent with the site.

## Tying the room to the funnel (the whole loop)

1. Attendee scans QR → lands on the tagged waitlist form → opts in.
2. Genuinely new signup → durable Postgres row + source-aware Resend welcome +
   team notification.
3. Five-touch sequence walks belief (thesis) to pull (ceiling) to conversion
   (SkillFoundry Tier 1) to loop (return + refer).
4. Admin view segments by `workshop-*` tag to measure conversion per session and
   feed the thesis-validation report (`06`).
5. Converters and returners become the standing "Table" cohort and referral nodes
   into the Tier 2 (in-house) and Tier 3 (enterprise / agency) motions.

## Metrics to watch per session (all available from existing tooling)

- **Scan / capture rate:** signups with the session tag ÷ attendee count.
- **Thesis lift:** entry vs. exit thesis-validation score (see `06`).
- **Funnel actions in 10 days:** SkillFoundry demo clicks, licenses bought, paid
  waitlist joins, attributable to the session tag.
- **Return rate:** attendees who show up to the next session.
- **Referral:** new signups who name a prior attendee as their source.
