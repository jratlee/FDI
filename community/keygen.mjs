/**
 * Agent keypair generator for the Growth Cartography Agent.
 *
 * Prints a fresh 64-char hex Nostr private key in the exact form the
 * deployment expects. Run once, store the value as the Replit secret
 * BUZZ_AGENT_PRIVATE_KEY, and never print it again.
 *
 * Run: node community/keygen.mjs
 */

import { randomBytes } from "node:crypto";

const priv = randomBytes(32).toString("hex");
console.log(`BUZZ_AGENT_PRIVATE_KEY=${priv}`);
console.log("");
console.log("Store this as a Replit secret named BUZZ_AGENT_PRIVATE_KEY.");
console.log("Do not commit it, paste it in chat, or reuse it elsewhere.");
