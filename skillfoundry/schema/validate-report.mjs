#!/usr/bin/env node
/**
 * Skillfoundry audit-report validator (zero-dependency).
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
 * It implements the small slice of JSON Schema draft-07 the audit schema uses:
 * type, required, additionalProperties:false, properties, items, local $ref,
 * enum, minimum/maximum, minItems/maxItems, and integer-vs-number.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`Cannot read/parse JSON at ${path}: ${e.message}`);
    process.exit(2);
  }
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  if (typeof value === "number") return "number";
  return typeof value; // string | boolean | object | undefined
}

function matchesType(value, expected) {
  const actual = typeOf(value);
  if (expected === "number") return actual === "number" || actual === "integer";
  return actual === expected;
}

function resolveRef(ref, root) {
  if (!ref.startsWith("#/")) {
    throw new Error(`Only local $ref supported, got: ${ref}`);
  }
  return ref
    .slice(2)
    .split("/")
    .reduce((node, key) => {
      if (node == null || !(key in node)) {
        throw new Error(`Unresolvable $ref: ${ref}`);
      }
      return node[key];
    }, root);
}

function validate(value, schema, root, path, errors) {
  if (schema.$ref) {
    return validate(value, resolveRef(schema.$ref, root), root, path, errors);
  }

  if (schema.type && !matchesType(value, schema.type)) {
    errors.push(`${path}: expected type ${schema.type}, got ${typeOf(value)}`);
    return; // no point checking further constraints on the wrong type
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} not in enum [${schema.enum.join(", ")}]`);
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: ${value} < minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: ${value} > maximum ${schema.maximum}`);
    }
  }

  if (schema.type === "array" && Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: ${value.length} items < minItems ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: ${value.length} items > maxItems ${schema.maxItems}`);
    }
    if (schema.items) {
      value.forEach((item, i) => validate(item, schema.items, root, `${path}[${i}]`, errors));
    }
  }

  if (schema.type === "object" && typeOf(value) === "object") {
    for (const key of schema.required || []) {
      if (!(key in value)) errors.push(`${path}: missing required property '${key}'`);
    }
    const props = schema.properties || {};
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in props)) errors.push(`${path}: unexpected property '${key}'`);
      }
    }
    for (const [key, subSchema] of Object.entries(props)) {
      if (key in value) {
        validate(value[key], subSchema, root, `${path}/${key}`, errors);
      }
    }
  }
}

const reportArg = process.argv[2] || join(__dirname, "..", "examples", "thesis-article-audit.json");
const schemaArg = process.argv[3] || join(__dirname, "audit-report.schema.json");

const reportPath = resolve(reportArg);
const schemaPath = resolve(schemaArg);

const schema = readJson(schemaPath);
const report = readJson(reportPath);

const errors = [];
validate(report, schema, schema, "$", errors);

if (errors.length > 0) {
  console.error(`INVALID: ${reportPath}`);
  console.error(`  against ${schemaPath}`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(`VALID: ${reportPath} conforms to ${schemaPath}`);
