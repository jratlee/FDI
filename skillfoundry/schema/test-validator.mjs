#!/usr/bin/env node
/**
 * Validator regression test.
 *
 * Proves that validate-report.mjs:
 *   - exits 0 on the checked-in valid example
 *   - exits non-zero on every invalid fixture
 *
 * Run:
 *   node skillfoundry/schema/test-validator.mjs
 *
 * Exits 0 if all assertions pass, 1 if any fail.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const validator = join(__dirname, "validate-report.mjs");
const examples = join(__dirname, "..", "examples");
const fixtures = join(examples, "fixtures");

function run(reportPath) {
  return spawnSync(process.execPath, [validator, reportPath], {
    encoding: "utf8",
  });
}

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

// ── Happy path ────────────────────────────────────────────────────────────────
console.log("\nHappy path (should pass):");
{
  const valid = join(examples, "thesis-article-audit.json");
  const result = run(valid);
  assert(
    "valid example exits 0",
    result.status === 0,
    `exit ${result.status}\n${result.stderr}`
  );
}

// ── Invalid fixtures (each must be rejected with exit 1) ──────────────────────
const invalidFixtures = [
  {
    file: "missing-required.json",
    label: "missing required field (asset.word_count)",
  },
  {
    file: "bad-enum.json",
    label: "out-of-enum verdict value",
  },
  {
    file: "extra-property.json",
    label: "additionalProperties violation at root",
  },
  {
    file: "wrong-type.json",
    label: "wrong type (score is string, not integer)",
  },
];

console.log("\nInvalid fixtures (each should be rejected):");
for (const { file, label } of invalidFixtures) {
  const result = run(join(fixtures, file));
  assert(
    label,
    result.status !== 0,
    `expected non-zero exit, got ${result.status}\n${result.stdout}`
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${passed + failed} checks: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(
    "\nFAIL — validator regression test detected a weakened check."
  );
  process.exit(1);
}

console.log("\nPASS — validator correctly accepts valid input and rejects all invalid fixtures.");
