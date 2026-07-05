# Skillfoundry

**A strategic firewall for content.** Route any text asset through three
opinionated Signal-to-Value gates — **Relevance**, **Performance**, and
**Algorithmic Signal** — and get back a scored, structured audit with line-level
rewrites. Strategy as code.

Skillfoundry is a False Dawn Industries product, built on the open Model Context
Protocol (MCP): `skills/` (the gate rubrics), `commands/` (the audit command plus
per-gate commands), and an `.mcp.json` connector so it loads in any MCP-compatible
client. This is the MVP — text-first, no backend, no
billing. It exists to prove the rubric quality, not the plumbing.

## The three gates

| Gate | Name | Filter | Public framework |
|---|---|---|---|
| 1 | Market-Deficit Analyzer | Relevance | Jobs-to-be-Done (Christensen) |
| 2 | Enterprise Valuation Gate | Performance | Brand equity (Aaker) + positioning (Porter) |
| 3 | Adversarial Defense Matrix | Algorithmic Signal | GEO/AEO (KDD 2024) + E-E-A-T + Schema.org |

Every gate returns the **same contract** (`skills/shared-audit-contract`): a
0-100 score computed from weighted sub-criteria, ranked reasons that quote the
asset, and specific line-level rewrites — never vague prose. The machine-readable
version is `schema/audit-report.schema.json`.

## Layout

```
skillfoundry/
  .claude-plugin/plugin.json   plugin manifest
  .mcp.json                    MCP connector (points at server/mcp-server.mjs)
  commands/                    strategic-audit + one thin command per gate
  skills/                      the four rubrics (shared contract + three gates)
  schema/                      the deterministic output schema (JSON Schema)
                               + validate-report.mjs (zero-dependency checker)
  server/mcp-server.mjs        zero-dependency stdio MCP server
  examples/                    dogfood: the FDI thesis article, audited
                               (Markdown + machine-readable JSON)
```

## Install & run

There are two ways to run Skillfoundry; both use the same rubrics.

### A. As a plugin in Claude Code (native commands)

Point Claude Code at this directory as a plugin, then use the slash commands:

```
/skillfoundry:strategic-audit  <paste text, or a path to a .md/.txt file>
/skillfoundry:relevance-gate   <asset>
/skillfoundry:performance-gate <asset>
/skillfoundry:signal-gate      <asset>
```

The commands read the skills and produce the report — no server process needed.

### B. As an MCP server in any MCP-compatible client

The connector is `.mcp.json`. It launches the bundled stdio server, which exposes
the same four operations as **both** MCP prompts (surfaced as commands) and MCP
tools (callable by agents):

- prompts / tools: `strategic-audit` (`strategic_audit`), `relevance-gate`,
  `performance-gate`, `signal-gate` — each takes one argument, `asset`.

Register it with your client (path is resolved by the client via
`${CLAUDE_PLUGIN_ROOT}`; when configuring by hand, point at
`server/mcp-server.mjs`):

```json
{
  "mcpServers": {
    "skillfoundry": {
      "command": "node",
      "args": ["/absolute/path/to/skillfoundry/server/mcp-server.mjs"]
    }
  }
}
```

The server needs only Node 18+ and has **zero dependencies**. It does not call a
model itself — it composes the rubric + contract + your asset into one payload and
hands it to your client's model, which does the reasoning and returns the report.
That is what keeps it a pure "strategy as code" artifact with no backend.

Smoke-test the server directly:

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{}}}' \
  '{"jsonrpc":"2.0","id":2,"method":"prompts/list"}' \
  | node server/mcp-server.mjs
```

## Interpreting the report

- **Composite score** — weighted mean of the three gates (relevance 0.40,
  performance 0.35, signal 0.25). Relevance is weighted highest: an asset that
  solves no real job can't be rescued by framing or distribution polish.
- **Recommendation** — `SHIP` only if all three gates PASS; `BLOCK` if any gate
  BLOCKs; otherwise `REVISE`.
- **Per-gate verdict** — `PASS` (>= 75), `REVISE` (50-74), `BLOCK` (< 50).
- **Top moves** — the 3-5 highest-leverage changes across all gates. Start here.
- **Rewrites** — each is an exact `original` span paired with a concrete `revised`
  replacement and the rubric criterion it satisfies. Accept or reject them one by
  one; the audit is a proposal, not an auto-edit.

See `examples/thesis-article-audit.md` for a full run on a real published asset.
Its machine-readable twin is `examples/thesis-article-audit.json` — the same
audit as a JSON report that automation can consume directly.

## Machine-readable output

Any Skillfoundry gate or the consolidated audit can emit JSON conforming to
`schema/audit-report.schema.json` (ask the MCP tool/prompt for machine output).
`examples/thesis-article-audit.json` is a checked-in, validated report teams can
build and test against. Verify any report with the zero-dependency checker:

```bash
node schema/validate-report.mjs examples/thesis-article-audit.json
# → VALID: ... conforms to ...   (exit 0; non-zero on any schema violation)

node schema/validate-report.mjs path/to/your-report.json   # in CI
```

The checker needs only Node 18+ (no dependencies) and reports every violation —
missing/unexpected properties, wrong types, out-of-range scores, bad enums, and
wrong gate counts — so downstream automation can gate on a clean exit code.

## Clean-room provenance note

Every gate is written from **publicly documented frameworks**, cited in each
skill file:

- **Relevance** — Christensen et al., *"Know Your Customers' Jobs to Be Done"*
  (HBR, 2016) and *Competing Against Luck* (2016).
- **Performance** — Aaker, *Managing Brand Equity* (1991) / *Building Strong
  Brands* (1996); Porter, *Competitive Strategy* (1980) and *"What Is Strategy?"*
  (HBR, 1996).
- **Algorithmic Signal** — Aggarwal, Murahari et al., *"GEO: Generative Engine
  Optimization"* (KDD 2024); Google Search Central E-E-A-T guidance; the
  Schema.org vocabulary.

The gate rubrics, weights, scoring bands, naming, and output contract are original
to Skillfoundry and self-contained. **No prior-employer proprietary framework,
wording, weighting, or trade secret is reproduced here.** Where a design choice
touched a strategy concept, it was rewritten from the cited public source above.

## Scope (MVP)

In scope: the plugin (skills / commands / `.mcp.json`), the deterministic output
contract, and the dogfood proof. Out of scope for this MVP: a secure backend,
license-key validation, Stripe billing, crypto settlement, binary/multimodal
payloads, and private-repo entitlement — all deferred to commercialization.

MIT licensed. © 2026 False Dawn Industries.
