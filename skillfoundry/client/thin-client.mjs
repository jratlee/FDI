#!/usr/bin/env node
// Skillfoundry Tier 2 (Living Brain) thin client.
//
// The Living Brain tier keeps the latest gate logic SERVER-SIDE. This client is
// deliberately thin: it holds no proprietary logic, only a subscription key and
// the address of the Skillfoundry backend. Every run POSTs the key; the backend
// validates it is active (subscription in good standing) before returning a
// result. A cancelled/expired subscription gets a 402 refusal here, not a stale
// local copy of the logic — that is the whole point of the recurring tier.
//
// Config (env):
//   SKILLFOUNDRY_KEY      — your subscription key (SFS-XXXX-...). Required.
//   SKILLFOUNDRY_API_URL  — backend base URL, e.g. https://falsedawn.industries
//
// Usage:
//   SKILLFOUNDRY_KEY=SFS-... node thin-client.mjs "<asset text to audit>"
//   ... | node thin-client.mjs         (reads the asset from stdin)

const KEY = (process.env.SKILLFOUNDRY_KEY || "").trim();
const API = (process.env.SKILLFOUNDRY_API_URL || "https://falsedawn.industries")
  .trim()
  .replace(/\/+$/, "");

function fail(msg, code = 1) {
  console.error(`skillfoundry: ${msg}`);
  process.exit(code);
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  if (!KEY) {
    fail(
      "SKILLFOUNDRY_KEY is not set. Export your subscription key first:\n" +
        "  export SKILLFOUNDRY_KEY=SFS-XXXX-XXXX-XXXX-XXXX",
      2,
    );
  }
  const asset = (process.argv.slice(2).join(" ") || (await readStdin())).trim();
  if (!asset) fail("no asset provided (pass text as an argument or via stdin).", 2);

  let res;
  try {
    res = await fetch(`${API}/api/skillfoundry/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: KEY, asset }),
    });
  } catch (err) {
    fail(`could not reach the Skillfoundry backend at ${API}: ${err.message}`, 3);
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON body */
  }

  if (res.status === 402) {
    fail(
      data.message ||
        "your Skillfoundry subscription is not active. Renew or update billing to continue.",
      4,
    );
  }
  if (!res.ok || !data.ok) {
    fail(data.error || `backend returned HTTP ${res.status}.`, 5);
  }

  // Entitlement gate passed — print whatever the server returned.
  process.stdout.write(JSON.stringify(data.result, null, 2) + "\n");
}

main();
