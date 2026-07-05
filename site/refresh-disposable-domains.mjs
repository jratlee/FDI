import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/*
 * Refresh the bundled disposable / throwaway email domain blocklist.
 *
 * Why: the waitlist used a tiny hardcoded set of ~20 domains, which goes stale
 * as new throwaway providers appear. This script pulls a large, community-
 * maintained public list and writes it to a bundled data file that serve.mjs
 * loads at startup. Bundling (rather than fetching at request time) keeps the
 * hot path fast and offline-safe: the deploy always ships a known-good list.
 *
 * Source (override with DISPOSABLE_DOMAINS_URL): the widely-used
 * disposable-email-domains blocklist (one domain per line).
 *
 * Safety: the fetched list must clear a minimum-size sanity check before it
 * replaces the bundled file, so a truncated or failed download can never wipe
 * the list. The hardcoded CORE_DISPOSABLE_DOMAINS baseline is always merged in,
 * so the list can only ever grow past our known-bad minimum, never below it.
 *
 * Usage:
 *   node site/refresh-disposable-domains.mjs            # fetch + write
 *   node site/refresh-disposable-domains.mjs --dry-run  # report only
 *
 * Safe to run on a schedule (cron / Replit Scheduled Deployment). Logs counts
 * and the source URL only.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const OUTPUT_FILE = path.join(__dirname, "disposable-domains.txt");

// Known-bad baseline. Always merged into the written file so the list can never
// regress below these, even if the remote source is unreachable or shrinks.
export const CORE_DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "sharklasers.com",
  "grr.la",
  "10minutemail.com",
  "trashmail.com",
  "yopmail.com",
  "getnada.com",
  "temp-mail.org",
  "tempmail.com",
  "throwawaymail.com",
  "maildrop.cc",
  "dispostable.com",
  "fakeinbox.com",
  "mailnesia.com",
  "mohmal.com",
  "spam4.me",
  "tempinbox.com",
  "emailondeck.com",
];

const DEFAULT_SOURCE_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf";

// A well-maintained list has thousands of entries. Refuse to write anything
// smaller than this so a partial/failed download can't shrink the blocklist.
const MIN_ENTRIES = 1000;

// Lowercased hostname, at least one dot, only DNS-legal characters.
const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export function parseDomainList(text) {
  const out = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().toLowerCase();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    if (DOMAIN_RE.test(line)) out.add(line);
  }
  return out;
}

export async function fetchDisposableDomains(url = DEFAULT_SOURCE_URL) {
  const res = await fetch(url, {
    headers: { "User-Agent": "fdi-site/disposable-domains-refresh" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`source responded ${res.status}`);
  const text = await res.text();
  return parseDomainList(text);
}

export async function refreshDisposableDomains({
  url = process.env.DISPOSABLE_DOMAINS_URL || DEFAULT_SOURCE_URL,
  dry = false,
} = {}) {
  const fetched = await fetchDisposableDomains(url);
  if (fetched.size < MIN_ENTRIES) {
    throw new Error(
      `refusing to write: only ${fetched.size} domains fetched (min ${MIN_ENTRIES}); source may be truncated`,
    );
  }
  // Merge the known-bad baseline so we never lose our core coverage.
  for (const d of CORE_DISPOSABLE_DOMAINS) fetched.add(d);

  const sorted = [...fetched].sort();
  const previous = fs.existsSync(OUTPUT_FILE)
    ? parseDomainList(fs.readFileSync(OUTPUT_FILE, "utf8")).size
    : 0;

  if (!dry) {
    fs.writeFileSync(OUTPUT_FILE, sorted.join("\n") + "\n", "utf8");
  }
  return { count: sorted.length, previous, url, dry };
}

const isMain =
  process.argv[1] && process.argv[1].endsWith("refresh-disposable-domains.mjs");

if (isMain) {
  const dry = process.argv.includes("--dry-run");
  try {
    const out = await refreshDisposableDomains({ dry });
    console.log(
      `[disposable-domains] ${out.dry ? "dry run: would write" : "wrote"} ${out.count} domains ` +
        `(was ${out.previous}) from ${out.url}`,
    );
  } catch (err) {
    console.error("[disposable-domains] refresh failed:", err.message);
    process.exitCode = 1;
  }
}
