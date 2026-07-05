# /exec-move-scan

Scan the Top Call corpus for executive moves, provenance-stamped.

Runs the `exec-move-scan` skill against the owned corpus and returns each move
with its source, tier, and confidence. Filter with `company`, `category`, `type`,
or `min_tier`.

- MCP tool: `exec_move_scan`
- CLI: `node bin/topcall.mjs scan [--company X] [--category Y] [--type T] [--min-tier 1B]`
