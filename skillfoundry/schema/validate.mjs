// Skillfoundry audit-report validator (zero-dependency, reusable core).
//
// This module implements the small slice of JSON Schema draft-07 the audit
// schema uses: type, required, additionalProperties:false, properties, items,
// local $ref, enum, minimum/maximum, minItems/maxItems, and integer-vs-number.
//
// It is the single source of truth for validation. The CLI wrapper
// (validate-report.mjs) and the server-side audit engine both import from here,
// so a report that validates in CI validates the same way over the wire.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = join(__dirname, "audit-report.schema.json");

let cachedSchema = null;

export function loadSchema() {
  if (!cachedSchema) {
    cachedSchema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  }
  return cachedSchema;
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

function validateNode(value, schema, root, path, errors) {
  if (schema.$ref) {
    return validateNode(value, resolveRef(schema.$ref, root), root, path, errors);
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
      value.forEach((item, i) => validateNode(item, schema.items, root, `${path}[${i}]`, errors));
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
        validateNode(value[key], subSchema, root, `${path}/${key}`, errors);
      }
    }
  }
}

// Validate `report` against `schema` (defaults to the bundled audit schema).
// Returns an array of human-readable error strings; empty means valid.
export function validateReport(report, schema = loadSchema()) {
  const errors = [];
  validateNode(report, schema, schema, "$", errors);
  return errors;
}
