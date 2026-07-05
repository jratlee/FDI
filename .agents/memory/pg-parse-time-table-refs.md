---
name: Postgres parse-time table references
description: Why a to_regclass runtime guard can't protect a SQL statement that references a missing table
---

# Postgres parses the whole statement before running it

You cannot guard an optional table reference inside a single SQL statement with
`to_regclass(...) IS NULL OR NOT EXISTS (SELECT 1 FROM that_table ...)`. Postgres
parses and plans the *entire* statement up front, so it errors with
`relation "..." does not exist` even though the runtime `OR` would short-circuit.

**Why:** planning happens before execution; the planner must resolve every
referenced relation regardless of runtime branch conditions.

**How to apply:** check existence first in the app layer
(`SELECT to_regclass('public.tbl') AS t`), then conditionally build the SQL
string to include the join/subquery only when the table exists. Used in
`site/purge.mjs` to make the "converted = in skillfoundry_entitlements" exemption
safe when the commerce table was never created.
