# Top Call sample sources (illustrative seed data)

These files are **illustrative sample data** used to seed and demonstrate the Top
Call corpus. Company names are real (they are the tracked universe), but the
executive names, appointments, and quotes are **fictional** and included only to
exercise the ingestion, grading, and provenance pipeline. Do not treat them as
factual reporting.

They are written in the Top Call source format the ingestion pipeline reads:

- one `---` frontmatter block per file: `publication`, `url`, `date`, `access`;
- one `## headline` block per move, with `move_type`, `company`, `sector`,
  `category`, `executive` (optional), `summary`, `so_what`, `implication`.

The set is deliberately built to show the corpus **compounding**:

- `02-company-press-releases.md` (Business Wire, Tier 2) first records Jordan
  Avery's Kroger appointment at **medium** confidence.
- `03-adage-trade.md` (Ad Age, Tier 1B) later corroborates the same underlying
  move, which **upgrades it to high** — the audit compounds instead of being
  re-derived.
- `04-vendor-blog.md` is a Tier 3 vendor blog: it stays **low** confidence and is
  flagged as discovery-only, kept out of the main brief.

Drop your own newsletters, article exports, and watchlists here (in the same
format) and re-run `node bin/topcall.mjs ingest` to grow your owned corpus.
