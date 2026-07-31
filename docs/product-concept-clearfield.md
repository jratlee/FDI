# Clearfield — Product Concept

**Working title:** Clearfield  
**Document status:** Concept draft for review — no implementation  
**Date:** July 30, 2026  
**Author:** FDI / False Dawn Industries  

---

## 1. Executive Summary

Clearfield is the third FDI owned-system product, sitting alongside SkillFoundry and Top Call as the
settlement and identity layer for agent-to-agent commerce. Where SkillFoundry makes a marketing system
machine-callable and Top Call makes it verifiably authoritative, Clearfield makes it
**cryptographically trustworthy and autonomously transactable**: a brand's onchain identity,
API surface, and attestation corpus that an AI agent can discover, verify, and pay for
without any human in the loop.

The core thesis — drawn from the convergence of the Decentralized and Autonomous research — is that
the next competitive moat is not content visibility or social reach but **settlement authority**: the
credential stack that lets an agent decide "this source can be trusted and paid." Clearfield is the
product that builds, manages, and monetizes that stack for B2B marketing teams and independent
operators who are early-moving into the agent economy.

---

## 2. The Thesis: Where Decentralized Meets Autonomous

The two Field Guide research streams point at the same moment from opposite directions.

**From Decentralized (Field Guide 003):** Crypto-powered networks are the first infrastructure to
ship portable, verifiable identity and programmable settlement as open standards. An onchain identity
(wallet + ENS name + EAS attestations) is not a platform account that can be revoked — it is a
cryptographic fact that travels with the brand everywhere. The primitives for agents transacting
onchain already exist: `x402` for HTTP-native USDC micropayments, `AgentKit` for managed agent
wallets, `AP2` for pre-authorized payment mandates.

**From Autonomous (Field Guide 004):** AI agents are already transacting with real money at scale
(23% of Americans bought via AI in December 2025; AI retail traffic up 393% YoY; $190B–$385B US
e-commerce projected by 2030). The interface stack has standardized: MCP for callable tools, A2A
for agent-to-agent coordination, ACP/AP2 for payment authorization. Adobe's primary measurement
shows most brand surfaces are machine-illegible — that gap is the present competitive opportunity.

**The convergence point:** When agents are the buyers, the "brand asset" is not a
high-ranking page or a follower count. It is a **gated, citable, machine-legible, cryptographically
verifiable interface** — discoverable via an Agent Card, callable via MCP, settleable via x402/AP2,
and authenticated via SIWE + EAS attestations. Clearfield is the product that assembles and operates
that interface for a brand.

The "agents settle in crypto" throughline is precise: payment over x402 uses USDC stablecoin settled
on-chain, meaning every transaction is auditable, trustless, and intermediary-free. An agent with an
AgentKit wallet and an AP2 mandate from its user can discover a Clearfield-registered brand API,
receive a 402 payment prompt, pay inline, get a cryptographically signed response, and have the
entire chain of custody on-chain — no billing portal, no account manager, no human approval flow.

---

## 3. Problem Statement

### For the brand / marketer

Today's marketing systems are built for human discovery: SEO for search algorithms, social content
for platform feeds, landing pages for human eyeballs. None of these surfaces are callable by an
agent. When an AI agent acts on a user's behalf — researching vendors, comparing services,
completing purchases — most brands are structurally invisible: their content is either not
machine-legible (Adobe: "major portions of US retail websites are not readable by machines") or
not transactable (no x402 or ACP endpoint). Being left out of an agent's consideration set is worse
than a bad ad; it means the brand doesn't even exist in the transaction.

Beyond discoverability, there is a trust problem. An agent vetting a service provider needs more
than a website; it needs verifiable proof: who attested to this brand's credentials? What is their
onchain track record? What does their API surface cost and promise? Without an onchain identity
and attestation corpus, a brand is just a URL to an agent — no different from any other URL.

### For the operator / builder

Teams building agent-facing products face a fragmented infrastructure problem: wallets, attestation
issuers, identity standards (SIWE, ENS), payment protocols (x402, ACP, AP2), and agent-callable
APIs (MCP, A2A Agent Cards) are all separate, open-source, or early-stage. Assembling them into a
coherent, maintained, brandable system is weeks of engineering that most marketing teams and
early-stage builders cannot do.

---

## 4. Target User

**Primary:** B2B marketing operators at companies already thinking about agent-mediated discovery —
typically SaaS, professional services, research/data products, or developer tools — who want to be
in the agent economy before the window closes. These are the same buyer archetype as SkillFoundry
Tier 2/3: technical enough to understand the stakes, resource-constrained enough to want a system
rather than building from scratch.

**Secondary:** Independent operators (consultants, researchers, niche API publishers) who have a
valuable knowledge or data product and want to expose it as an agent-transactable surface without
hiring a crypto engineer.

**Non-target (for v1):** Consumer brands, physical goods, anyone whose product requires more than
an API call to fulfill. Clearfield v1 is for information, access, and service products that can be
delivered over HTTP.

**Psychographic signal:** These users already believe the autonomous market is real (they've seen
the Autonomous Field Guide framing resonate) and they are ready to act before it's obvious. They
are the "understand now, build before the window closes" cohort FDI addresses across every product.

---

## 5. Value Proposition

**Core promise:** Clearfield gives your product an onchain identity, a verifiable credential stack,
and an agent-transactable API surface — so AI agents can find you, trust you, and pay you without
a human in the loop.

**Three-line version:**
- Your brand gets a wallet, an ENS name, and an EAS attestation corpus: the crypto-native identity
  that agents can verify onchain.
- Your API gets x402 payment rails and an AP2-compatible mandate spec: the settlement layer that
  lets an agent pay for your product in USDC inline.
- Your agent card gets registered: an A2A-compatible discovery entry that any agent can find at
  runtime, with your capabilities, pricing, and trust credentials attached.

**The differentiation:** Clearfield is not a crypto wallet product or a DeFi tool. It is an owned
marketing infrastructure product, continuous with FDI's existing thesis. The difference is that
"ownership" here means cryptographic control — nobody can revoke your ENS name, nobody can alter
your EAS attestations, nobody can take your API offline from an agent's perspective — and "corpus"
means your reputation stack is on-chain and queryable, not held in a platform's database.

---

## 6. Product Mechanics

### 6.1 The identity layer

**Onchain identity:** A brand or operator gets a managed Ethereum wallet (powered by `coinbase/agentkit`
under the hood) tied to an ENS name (`brand.eth`). The wallet is the root identity: every
attestation, transaction, and API interaction is signed by it. ENS provides the human-readable
name that resolves onchain across every EVM-compatible product.

**Attestation corpus (EAS):** Clearfield issues and indexes EAS (Ethereum Attestation Service)
attestations on behalf of the brand: completed audits, verified product tiers, confirmed
counterparty relationships, community contributions. Third parties (clients, partners, protocol
communities) can also issue attestations to the brand's wallet. Over time, the attestation corpus
becomes the brand's machine-verifiable reputation — the onchain equivalent of the "proof stack"
FDI already argues for in the web2 context.

**Authentication (SIWE):** Human users who interact with the Clearfield dashboard authenticate via
Sign-In with Ethereum (EIP-4361), using `wevm/viem`'s SIWE utilities. This keeps the identity
layer consistent: the same wallet controls both the onchain corpus and the product dashboard.

### 6.2 The settlement layer

**x402 payment rails:** Any API a brand registers with Clearfield gets an x402 wrapper: when an
unauthenticated request arrives, the server returns HTTP 402 with a USDC payment token (on Base
or another EVM chain). An agent with an `agentkit` wallet pays inline in the HTTP request and
retries with the payment receipt. No subscription, no API key, no billing portal.

**AP2 mandate compatibility:** Clearfield publishes an AP2-compatible "mandate spec" for each
registered API: what it accepts, what it costs, what actions are permitted, and the maximum
authorization amounts. A user who pre-authorizes their agent via AP2 can then have the agent
transact with any Clearfield-registered API within the mandate limits.

**USDC settlement on Base:** All transactions settle in USDC on Base (Coinbase's L2), chosen for
low fees, fast finality, and direct `agentkit` support. Every payment is on-chain, auditable, and
non-reversible — the brand receives funds directly to its wallet, not through a processor.

### 6.3 The discoverability layer

**Agent Card registration:** Clearfield registers an A2A-compatible Agent Card for each brand at
`brand.clearfield.xyz/.well-known/agent.json` (or the brand's own domain). The card declares
the brand's identity (wallet + ENS), capabilities (what its API does), pricing (x402 payment
terms), and trust credentials (EAS attestation links). Any A2A-compatible agent can discover this
card at runtime.

**MCP server surface:** Each brand's API is optionally exposed as an MCP tool server, so agents
using MCP-native orchestration (Claude, ChatGPT, Gemini, VS Code Copilot) can invoke it directly
as a tool, with payment handled transparently via x402 under the hood.

**Onchain social presence (optional module):** For brands entering Farcaster or Lens communities,
Clearfield provides an onchain social identity management layer: publishing signed casts or Lens
posts, issuing POAPs for brand events, and accumulating governance participation records — all
tied to the same root wallet and queryable by agents vetting the brand's community standing.

---

## 7. Fit with the FDI Owned-System Thesis

FDI's thesis is that in each of its three markets — Aggregated, Decentralized, Autonomous — the
durable marketing asset is an **owned system, not a rented platform position**. Clearfield is the
product that operationalizes this thesis for the Decentralized + Autonomous intersection.

| Layer | SkillFoundry | Top Call | **Clearfield** |
|---|---|---|---|
| **What it owns** | Skill corpus + enforcement rules | Source-graded knowledge graph | Onchain identity + attestation corpus |
| **How it's called** | MCP tools (skills) | MCP server (stdio) + API | A2A Agent Card + MCP + x402 API |
| **How it earns trust** | Riverbank governance rules | Source authority scoring | EAS attestations + onchain track record |
| **How it transacts** | Stripe (human) | Stripe (human) | x402 USDC (agent-native, no human) |
| **Primary market** | Aggregated (platform-first) | Aggregated + early Autonomous | **Decentralized + Autonomous** |

The three products are composable: a brand could run all three simultaneously — SkillFoundry
governing the content-creation process, Top Call providing the verifiable knowledge base, and
Clearfield exposing both to the agent economy through a trusted onchain identity and payment rail.

**The strategic logic:** SkillFoundry and Top Call live in the human-to-agent interface layer
(content and knowledge that humans create and agents retrieve). Clearfield lives in the
agent-to-agent interface layer (identity and settlement that agents rely on without human
intermediation). Together they span the full stack of the FDI thesis: owned content → owned
knowledge → owned settlement identity.

---

## 8. Open-Source Building Blocks

The implementation is a composition of open-licensed, active libraries — no novel cryptographic
primitives needed.

| Component | Library | License | Role |
|---|---|---|---|
| Agent wallet + tx | `coinbase/agentkit` | MIT + CDP ToS | Managed wallet; on-chain actions for the brand |
| Payment rail | `coinbase/x402` | MIT | HTTP 402 USDC micropayment; pay-per-call agent API |
| Payment mandates | `google-agentic-commerce/AP2` | Apache 2.0 | Agent authorization spec; intent/cart/payment |
| Agent coordination | `a2aproject/A2A` | Apache 2.0 | Agent Cards; agent discovery substrate |
| Wallet auth | `wevm/viem` | MIT | SIWE authentication; EVM wallet interactions |
| React wallet hooks | `wevm/wagmi` | MIT | React UI for wallet connect + SIWE |
| Attestations | `ethereum-attestation-service/eas-sdk` | MIT | Issue and query EAS attestations |
| ENS identity | `ensdomains/ensjs` | MIT | ENS name resolution and management |
| Social (optional) | `neynarxyz/nodejs-sdk` | MIT | Farcaster integration |
| Social (optional) | `lens-protocol/lens-sdk` | MIT | Lens Protocol integration |

**Key notes:**
- `coinbase/agentkit` carries Coinbase Developer Platform (CDP) Terms of Service for production
  use. Review before go-live.
- `coinbase/x402` has low repository stars (~110 on the coinbase repo); the protocol is newer
  than its open-source footprint suggests. Confirm the canonical repo (vs. `x402-foundation/x402`)
  before building.
- `spruceid/siwe` is deprecated (stale since May 2025); use `viem`'s SIWE utilities exclusively.
- All core picks are Apache-2.0 or MIT — commercially safe.

---

## 9. Competitive Landscape

**Direct competitors (agent-wallet / agent-payment products):**

- **Coinbase CDP / AgentKit directly:** Coinbase's developer platform is the closest analog —
  it provides exactly the wallet and x402 primitives Clearfield would build on. The difference is
  that Coinbase CDP is infrastructure for developers; Clearfield is a product for marketing
  operators who are not crypto engineers. The abstraction layer and the FDI-branded "owned
  marketing system" framing are what Clearfield adds.

- **Thirdweb AI / Crossmint:** Both offer wallet-as-a-service with API wrappers. Thirdweb AI
  (`thirdweb-dev/ai`) is early-stage (approximately 20 GitHub stars as of the reference check).
  Crossmint offers wallet-as-a-service REST. Neither is positioned as a marketing identity and
  reputation product; both are developer tools.

**Adjacent competitors (agent-callable API products):**

- **Neon / Browserbase / similar x402 API wrappers:** Several infrastructure players are building
  x402-enabled APIs. None package the full identity + attestation + settlement stack as a unified
  product for marketers.

- **Crossmint (wallet-as-a-service):** Closer to a payments-for-agents play; no reputation or
  attestation layer.

**Structural moat:**

The FDI moat is not the crypto primitives — those are open-source and anyone can compose them. The
moat is the **integration of the onchain identity layer with the marketing reputation concept** FDI
has already established through the Field Guides, SkillFoundry, and Top Call. Clearfield's
addressable audience is the same early-mover cohort that has already bought into the FDI thesis.
The buy decision is not "which wallet product should I use" but "which owned-system product
understands the marketing stakes of the agent economy" — and that is a question Clearfield answers
where no competitor currently does.

**The non-obvious threat:** The real risk is not a competing product but timing. If Coinbase
launches a polished "agent identity for brands" product, or if a major marketing platform
(HubSpot, Salesforce) ships a first-party x402 integration before Clearfield establishes the FDI
framing, the window shrinks fast. Speed to the first credible deployment matters more than
feature completeness.

---

## 10. Risks

### Technical risks

**Protocol immaturity:** x402 and AP2 are active proposals, not finalized standards. x402 has
real Coinbase production use but thin external ecosystem. AP2 is under public review. Building on
them now is a bet on the direction, not on a settled standard. Mitigation: implement with clean
abstraction layers so the payment rail can be swapped as the standard settles.

**Wallet and key management:** A managed wallet for a brand is an operational security surface.
Key loss or compromise means loss of onchain identity. Mitigation: use delegated signing (AgentKit's
CDP custody) rather than raw key management for v1; build in multi-sig for production deployments.

**EAS attestation quality:** An attestation corpus is only as valuable as the attesters. If
Clearfield issues all its own attestations with no third-party verification, the corpus is
circular. Mitigation: design the attestation schema from the start to be issuable by third parties
(clients, auditors, protocol communities), with the brand's wallet as the subject rather than
the issuer.

### Market risks

**Timing:** The agent economy is real but the mainstream B2B marketing buyer is probably 12–24
months from acting on it. Clearfield targets early movers — but if the cohort is too early, the
product sits without a paid market. Mitigation: the FDI Field Guide + waitlist model tests
demand before full build. Price the early cohort for learning, not for revenue.

**Crypto skepticism in the marketing buyer:** The FDI audience is marketing-first, not crypto-native.
The "you need a wallet" step is a significant friction point for users who have never used crypto.
Mitigation: abstract the wallet so users see "your brand's verified identity" not "your Ethereum
address," and handle the custody layer for them in v1. The crypto plumbing should be invisible
until the user is ready to see it.

**Regulatory / compliance:** USDC payments for API access sit in a gray zone in several
jurisdictions. Ongoing MiCA (EU) and US stablecoin regulation will affect what "pay-per-call in
USDC" means for business users. Mitigation: position v1 as early-access / experimental; add
traditional Stripe fallback; note the regulatory uncertainty explicitly in onboarding.

### Execution risks

**Three-product complexity:** Running SkillFoundry, Top Call, and Clearfield simultaneously
requires clear product positioning boundaries. The risk is that a potential customer sees three
similar "agent-ready marketing infrastructure" products and gets confused. Mitigation: the
three-column matrix in Section 7 is the answer — each product has a clear lane and they are
explicitly composable, not competing.

**CDP Terms of Service:** AgentKit's Coinbase Developer Platform ToS includes usage restrictions
that may affect white-labeling or resale. Review before using AgentKit as the wallet backbone for
a product that other brands use to operate their own wallets.

---

## 11. Phased Build + GTM Outline

### Phase 0: Validation (4–6 weeks; no code)

**Goal:** Confirm that the target cohort — FDI waitlist, SkillFoundry early users, Field Guide
003/004 readers — will pay for Clearfield before building.

- Publish the concept framing as a Field Guide companion piece or a standalone article ("Your brand
  needs a wallet. Here's why, and what it looks like.") behind the FDI waitlist capture.
- Run a small-batch direct offer to the warmest existing contacts: "We're building the agent
  settlement layer for marketing systems. Here's what it does. Would you pay $X/month for early
  access?"
- Track intent signal: clicks, waitlist signups, reply rates, specific questions. A meaningful
  "yes" threshold is 10–15 genuine expressions of intent from qualified buyers, not download counts.

**Done looks like:** A clear picture of who says yes, what they're actually solving for, and
whether the framing lands. If demand is weak, park Clearfield and invest more in SkillFoundry/Top Call
before the agent market matures further.

### Phase 1: Identity MVP (8–12 weeks; minimal build)

**Goal:** A Clearfield account gives a brand a managed wallet, an ENS name, and a first EAS
attestation — nothing more.

**Build:**
- Clearfield onboarding: create a managed wallet (AgentKit CDP), register `brand.eth` via ENS,
  issue a first-party "verified onboarding" EAS attestation.
- SIWE-authenticated dashboard: the user sees their wallet address, their ENS name, and their
  attestation list.
- Agent Card: generate a minimal `/.well-known/agent.json` for the brand's domain with identity
  and contact information.

**What this does NOT include in Phase 1:** x402 payment rails, AP2 mandate spec, MCP server,
onchain social integration. Those are Phase 2+.

**GTM:**
- Early-access cohort from Phase 0 validation. Monthly flat fee ($49–$99/month) for the identity
  layer alone.
- Framing: "Your brand's onchain identity — ENS name, verified credentials, Agent Card — set up
  and managed for you."
- The proof of value at this stage is not revenue; it is that the brand's Agent Card is
  discoverable by any A2A agent and its attestations are queryable on EAS. Show this live in
  demos.

### Phase 2: Settlement Layer (12–16 weeks after Phase 1)

**Goal:** A Clearfield-registered API gets x402 payment rails and an AP2 mandate spec. An agent
with an AgentKit wallet can pay for API access without human intervention.

**Build:**
- x402 middleware wrapper: any HTTP API a customer registers gets automatic 402 payment prompts
  with USDC/Base settlement.
- AP2 manifest generator: based on the customer's API docs + pricing, auto-generate an AP2
  mandate spec and publish it linked from the Agent Card.
- Transaction ledger: on-chain transaction history in the dashboard; per-call revenue tracking.

**GTM:**
- Upgrade existing Phase 1 accounts to a higher tier ($199–$399/month) that includes the
  settlement layer.
- Case study: run one Clearfield customer through a live agent-pays-API demo and document it as
  a Field Guide companion.
- Target the Top Call and SkillFoundry audience explicitly: "Your Top Call corpus can now charge
  agents directly."

### Phase 3: Full Stack (ongoing)

**Goal:** MCP tool server wrapper, Farcaster/Lens onchain social identity module, third-party
attestation flows (client-issued credentials, audit badges, governance participation records).

- MCP server surface on top of the x402 API, so any MCP-native agent can invoke the API as a tool.
- Attestation marketplace: trusted third parties (FDI itself, audit partners, protocol communities)
  can issue attestations to Clearfield-registered brands, building the multi-party reputation corpus.
- Composability bridge: a SkillFoundry corpus or a Top Call knowledge graph can be connected to a
  Clearfield identity + x402 rail in one configuration step.

**GTM:**
- Launch the "FDI Agent Commerce Stack" bundle: SkillFoundry + Top Call + Clearfield as a combined
  offering for the full agent-facing owned system.
- Anchor on the "three-column" framing (content governance, verifiable knowledge, onchain
  settlement) as the complete answer to becoming callable in the agent economy.

---

## 12. Open Questions for the User to Resolve

These require a decision before Phase 0 begins; the concept cannot resolve them:

1. **Product name:** "Clearfield" is a working title. Does it fit the FDI brand? Alternatives
   worth considering: **Warrant** (authorization framing), **Solder** (joining things with heat/trust),
   **Provenance** (verified origins), **Manifest** (ship's declaration of cargo). Or hold the name
   until Phase 0 signal clarifies positioning.

2. **Custody model:** Does the user want FDI to hold the wallets on behalf of customers (custodial,
   simpler UX, more liability) or route through Coinbase CDP's custody (non-custodial for FDI,
   standard UX, CDP ToS dependency)? This is a day-one architectural choice.

3. **Relationship to SkillFoundry:** SkillFoundry already has an MCP interface. Does Clearfield
   wrap SkillFoundry's MCP with x402 payment rails (deeply integrated), or does it run as a
   separate product that can optionally connect? Integrated is more compelling but harder to
   market separately.

4. **Crypto visibility for customers:** How much of the blockchain layer is visible to a Phase 1
   customer? The recommendation here is "as little as possible" — they see a verified identity
   and an Agent Card, not an Ethereum address — but the user may have a different view.

5. **Regulatory posture:** Is FDI prepared to flag USDC payment acceptance as experimental and
   jurisdiction-limited in onboarding? This is low-risk for a small early-access cohort but should
   be explicit before any public launch.

---

## Appendix: The "agents settle in crypto" throughline, in one paragraph

The Decentralized research established that crypto-powered networks are the first to ship portable
onchain identity (wallet + ENS + EAS), programmable settlement (smart contracts + stablecoins),
and the specific agent-commerce primitives (x402 HTTP payments, AgentKit wallets, AP2 mandates)
that make it possible for software to transact without human intermediaries. The Autonomous
research established that agents are already transacting at scale, that the interface has
standardized (MCP, A2A, ACP/AP2), and that most brands are invisible to agents because their
surfaces are neither machine-legible nor callable. Clearfield sits at the intersection: it takes
the onchain identity and settlement primitives from the Decentralized stack and uses them to solve
the machine-legibility and callability gap the Autonomous research identifies. The result is a
brand asset that is not content to be seen, but an interface to be called — one that an autonomous
agent can discover via an Agent Card, verify via EAS attestations, invoke via MCP, and pay via
x402 in USDC, all on-chain, all auditable, and none of it dependent on a platform's permission.
That is what "agents settle in crypto" means as a product concept.
