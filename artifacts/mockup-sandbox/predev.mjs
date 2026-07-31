#!/usr/bin/env node
/**
 * predev.mjs – Free the Vite dev-server port before startup.
 *
 * When a previous process (orphaned Vite instance, crashed runner, etc.)
 * still holds the port, `vite --strictPort` would hard-fail.  This script
 * sends SIGTERM (then SIGKILL after a brief wait) to any process listening
 * on the required port, so a clean restart is always possible without
 * changing the port number that canvas iframe URLs depend on.
 */

import fs from "node:fs";
import path from "node:path";

const rawPort = process.env.PORT;
if (!rawPort) {
  console.error("[predev] PORT env var not set – skipping port cleanup.");
  process.exit(0);
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  console.error(`[predev] Invalid PORT "${rawPort}" – skipping port cleanup.`);
  process.exit(0);
}

/**
 * Read /proc/net/tcp (and tcp6) to find socket inodes listening on `port`.
 * Each non-header line has the form:
 *   sl  local_address  rem_address  st  ...  inode
 * local_address is "XXXXXXXX:PPPP" where PPPP is the port in hex.
 * State 0A = TCP_LISTEN.
 */
function listeningInodes(port) {
  const hexPort = port.toString(16).toUpperCase().padStart(4, "0");
  const inodes = new Set();

  for (const file of ["/proc/net/tcp", "/proc/net/tcp6"]) {
    let content;
    try {
      content = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const line of content.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 10) continue;
      const localAddr = cols[1]; // e.g. "0000000000000000FFFF00000100007F:5C44"
      const state = cols[3];     // "0A" = LISTEN
      if (state !== "0A") continue;
      // The port is always the last 4 hex chars after the colon
      const portHex = localAddr.split(":").pop();
      if (portHex === hexPort) {
        inodes.add(cols[9]);
      }
    }
  }

  return inodes;
}

/**
 * Map socket inodes → PIDs by reading /proc/<pid>/fd/* symlinks.
 * Each symlink target looks like "socket:[<inode>]".
 */
function inodesToPids(inodes) {
  if (inodes.size === 0) return [];
  const pids = new Set();

  let procEntries;
  try {
    procEntries = fs.readdirSync("/proc");
  } catch {
    return [];
  }

  for (const entry of procEntries) {
    // Only numeric entries are PIDs
    if (!/^\d+$/.test(entry)) continue;
    const fdDir = `/proc/${entry}/fd`;
    let fds;
    try {
      fds = fs.readdirSync(fdDir);
    } catch {
      // No permission or process already gone
      continue;
    }
    for (const fd of fds) {
      let target;
      try {
        target = fs.readlinkSync(path.join(fdDir, fd));
      } catch {
        continue;
      }
      // target looks like "socket:[12345678]"
      const m = target.match(/^socket:\[(\d+)\]$/);
      if (m && inodes.has(m[1])) {
        pids.add(Number(entry));
        break; // one fd match is enough for this pid
      }
    }
  }

  return [...pids];
}

// --- Main ---

const inodes = listeningInodes(port);
const pids = inodesToPids(inodes);

if (pids.length === 0) {
  console.log(`[predev] Port ${port} is free – nothing to clean up.`);
  process.exit(0);
}

console.log(`[predev] Port ${port} held by PID(s): ${pids.join(", ")} – terminating…`);

for (const pid of pids) {
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // process may have already exited
  }
}

// Give processes up to 2 s to exit gracefully, then SIGKILL stragglers.
await new Promise((resolve) => setTimeout(resolve, 2000));

for (const pid of pids) {
  try {
    process.kill(pid, 0); // throws if already gone
    console.log(`[predev] PID ${pid} still alive – sending SIGKILL.`);
    process.kill(pid, "SIGKILL");
  } catch {
    // already gone – good
  }
}

// Brief pause to let the OS reclaim the socket before Vite binds it.
await new Promise((resolve) => setTimeout(resolve, 300));

console.log(`[predev] Port ${port} released – starting Vite.`);
