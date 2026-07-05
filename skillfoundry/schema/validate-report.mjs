#!/usr/bin/env node
/**
 * Skillfoundry audit-report validator CLI (zero-dependency).
 *
 * Validates a report JSON against schema/audit-report.schema.json and exits
 * non-zero on failure. This is the checker downstream automation can run in CI
 * to guarantee any Skillfoundry output conforms to the deterministic contract.
 *
 * Usage:
 *   node schema/validate-report.mjs <report.json> [schema.json]
 *   node schema/validate-report.mjs examples/thesis-article-audit.json
 *
 * With no report argument it defaults to the checked-in dogfood example so the
 * script doubles as a self-test.
 *
 * The validation logic lives in ./validate.mjs (single source of truth), shared
 * with the server-side audit engine so the same report validates identically in
 * CI and over the wire.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateReport } from "./validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`Cannot read/parse JSON at ${path}: ${e.message}`);
    process.exit(2);
  }
}

const reportArg = process.argv[2] || join(__dirname, "..", "examples", "thesis-article-audit.json");
const schemaArg = process.argv[3] || join(__dirname, "audit-report.schema.json");

const reportPath = resolve(reportArg);
const schemaPath = resolve(schemaArg);

const schema = readJson(schemaPath);
const report = readJson(reportPath);

const errors = validateReport(report, schema);

if (errors.length > 0) {
  console.error(`INVALID: ${reportPath}`);
  console.error(`  against ${schemaPath}`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`VALID: ${reportPath} conforms to ${schemaPath}`);
