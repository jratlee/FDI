# Marketing Within Crypto-Powered Decentralized Networks

**Research Date:** July 30, 2026
**Depth:** Standard (5 parallel focus areas, gap-checked)
**Sources Consulted:** 38
**Prepared for:** False Dawn Industries — Growth Cartography series, Field Guide 003 ("Decentralized")

> **Archive note:** The previous research file for this guide treated "decentralized" as enterprise knowledge
> graphs (GraphRAG, knowledge-graph RAG). That framing is parked at
> `research/field-guide-decentralized-kg-archive.md`. This document is the fresh research on its correct
> subject: marketing within crypto-powered decentralized networks.

---

## Executive Summary

A decentralized market is structurally unlike every market that came before it: the infrastructure is
participant-owned, the identity layer lives on a public blockchain instead of inside a platform's database,
and governance — including the rules of discovery and promotion — is encoded in tokens, not in a company's
terms of service. For marketers, this creates both a genuine opportunity and a category error to avoid.
The category error is treating crypto communities as a new channel inside the old platform playbook: buying
reach, petitioning an algorithm, and hoping follower counts translate to outcomes. The opportunity is that
onchain identity is the first identity system in marketing history that is persistent, portable,
independently verifiable, and composable across every network the participant enters.

The structural thesis for Field Guide 003 is that in crypto-powered networks the durable marketing asset is
not a position in a rented feed — there is no single feed to own — but a verifiable onchain identity and
corpus that travels with the brand across every protocol and community it enters. The evidence for this
thesis runs through five focus areas.

**Finding 1 (Participant-owned infrastructure changes the terms of discovery):** Crypto networks like
Farcaster (decentralized social) and Lens (onchain social graph) are governed by their protocols and
communities, not by a company with an advertising business. A brand cannot buy premium placement in a
protocol's feed the way it buys Meta or Google inventory; it can only earn it by being a recognized,
trusted participant. Ethereum Name Service (ENS) has registered millions of human-readable names —
`brand.eth` resolves onchain and across every ENS-compatible product — demonstrating that portability at
the identity layer is already in production, not theoretical [1][2][3].

**Finding 2 (Wallet-based identity is the first portable reputation substrate):** Sign-In with Ethereum
(SIWE, EIP-4361) establishes a standard for asserting onchain identity across any application without
giving a platform the relationship [5]. `viem` (MIT, active) provides production-ready SIWE support in
the most widely-used Ethereum TypeScript stack, making implementation concrete [6]. Onchain attestation
standards (EAS — Ethereum Attestation Service) let any party issue a signed, publicly-verifiable claim
about a wallet address: "this address contributed to protocol X," "this address completed audit Y," "this
address is accredited under standard Z" [9]. These attestations are composable: a brand that earns
community attestations builds a reputation stack that any protocol in the ecosystem can query, which is
functionally the crypto-native equivalent of a verifiable corpus.

**Finding 3 (Web3 social protocols are live, buildable channels):** Farcaster is a sufficiently
decentralized social protocol with a production API and MIT-licensed SDK (`neynarxyz/nodejs-sdk`, active
as of July 2026) [10][11]. Casts (Farcaster posts) and channels are stored on a hub network, not on a
company's servers, which means a brand's content on Farcaster cannot be shadow-banned by a platform
policy change. Lens Protocol provides an onchain social graph on EVM chains with a production SDK
(`lens-protocol/lens-sdk`, MIT, active) [12][13]. Both protocols surface Frames (interactive mini-apps
embedded in social posts), which are the crypto equivalent of native ad formats — except they run on open
standards and the user's interaction is a wallet signature, not a cookie [14].

**Finding 4 (Token-based community ownership rewires how trust and reach work):** DAOs (Decentralized
Autonomous Organizations) use token-weighted voting to govern protocols, treasuries, and even marketing
decisions. Airdrop campaigns — distributing tokens to early participants — have become the primary
acquisition and loyalty mechanic for crypto protocols, creating a community of owners with economic skin
in the game rather than a passive audience of followers [16][17]. The marketing implication is that
influence in these communities is earned through contribution (code, governance votes, content, tooling)
and can be tracked onchain, not through broadcast frequency or paid placement. POAPs (Proof of Attendance
Protocol) and on-chain Stamps provide a parallel reputation system: verifiable records of participation
that accumulate as a wallet interacts with protocols over time [18][19].

**Finding 5 (Crypto primitives now exist for agent-to-agent commerce):** The infrastructure for
agents transacting in crypto is materially further along than is broadly understood in marketing circles.
Coinbase's `x402` protocol (MIT, active July 2026) implements HTTP-native micropayments using USDC
stablecoin, allowing an AI agent to pay for an API response inline in the HTTP request — no billing
accounts, no subscription setup, no human approval flow [21][22]. Coinbase's `agentkit` (MIT, active) gives
an agent a managed wallet with transaction capabilities [23]. Google's `AP2` (Agentic Commerce payment
mandates, public proposal July 2026) defines a standard for pre-authorizing payment ranges across agent
tasks [24]. Together these primitives describe a settlement layer where agents discover, evaluate, and pay
for services onchain, at machine speed. The marketing implication: a brand's onchain identity, corpus,
and API surface will be what an agent queries when acting on a user's behalf in a crypto-powered
transaction context — the same "retrievable, verifiable, citable" posture that the Aggregated guide
argues for, applied to agent-to-agent commerce.

---

## Background

Crypto-powered networks are the first markets in history where the infrastructure itself is
participant-owned. Earlier market structures still had a platform at the center: a company that owned
the database, set the rules of discovery, and could change both at will. The "decentralized" label is
precise in a way that has no precedent in marketing: the network's core functions (identity, state, and
settlement) run on a public blockchain maintained by economically incentivized validators rather than on
a company's servers.

This creates four structural differences from every previous marketing context:

1. **No single feed to win.** Discovery on Farcaster or Lens is fragmented across clients, channels, and
   recommendation algorithms that anyone can build. There is no one advertising product to buy placement
   inside. A brand participates at the protocol level, not at the platform level.

2. **Identity is portable.** A wallet address and its associated ENS name, attestations, and token
   holdings are the same across every EVM-compatible application. The brand's reputation travels
   instead of being stored in a platform's database and locked there.

3. **Governance is a marketing surface.** Token holders vote on protocol upgrades, treasury spending,
   and community standards. A brand that holds governance tokens and participates in DAO votes is a
   recognized actor in the community's future, not a customer of its present.

4. **Settlement is programmable.** Smart contracts and stablecoins make it possible to encode payment
   terms, royalties, and revenue shares directly into the network's state. Agents can settle
   transactions without intermediaries, opening a commerce layer that has no equivalent in
   web2 marketing.

The Decentralized field guide does not argue that every brand needs a DAO or a token. It argues that the
structural properties of these networks — portable identity, transparent reputation, programmable
governance, and agent-capable settlement — define what a durable marketing asset looks like in this
market, and that asset is an onchain identity and corpus, not a media buy.

---

## Key Findings

### Finding 1: Participant-owned infrastructure changes the terms of discovery

The foundational difference between a crypto-powered network and a web2 platform is who owns and governs
the infrastructure. On Farcaster, the social graph, content history, and identity records are stored on
Hubs — a peer-to-peer network of nodes that anyone can run — not on a Farcaster Inc. server [1].
Protocol governance is sufficiently decentralized that no single entity controls content moderation or
feed ranking for all clients. On Lens, the social graph is a set of smart contracts on an EVM chain;
follows, posts, and reactions are onchain transactions [12]. This means:

- A brand's Farcaster presence cannot be removed by a platform policy change. It can be blocked by
  individual clients, but the underlying records persist on the Hub network.
- Lens profiles and their content are the brand's own property in a meaningful technical sense:
  they live in smart contracts the brand interacts with directly.
- ENS names (`brand.eth`) resolve onchain to wallet addresses and IPFS records that the name's owner
  controls. ENS crossed 3.5 million registrations in 2024 and has remained one of the most active
  Ethereum applications by usage volume [2][3]. Because any ENS-compatible wallet or app resolves the
  same name to the same address, a brand's `brand.eth` works everywhere without a redirect.

The implication for discovery is that there is no single algorithm to optimize for. A brand's content
reaches communities through channels (Farcaster Channels, Lens Communities, DAO forums), direct
engagement, and cross-client recommendation algorithms that are built on the same open protocol.
The closest analogy is the pre-algorithm web: an SEO-era world where you earned rankings through
relevance and authority rather than by buying placement. In crypto communities, authority is
partially measurable onchain (token holdings, governance participation, contribution history), which
is a meaningful advantage over opaque platform scoring.

The Lens SDK and Neynar SDK remove the implementation barrier. `neynarxyz/nodejs-sdk` (MIT, GitHub,
active) provides a production Node.js API for reading and writing to Farcaster: publishing casts,
reading channels, managing notifications, triggering Frames [10][11].
`lens-protocol/lens-sdk` (MIT, GitHub, active) provides equivalent access for Lens: profile
management, publications, follows, and onchain actions [12][13].
Both are live SDKs with documented APIs, which means "how you actually build here" has a concrete
answer, not a whitepaper.

**Freshness caveat:** Farcaster and Lens are actively evolving protocols. User counts, active-address
figures, and feature sets change quarter to quarter. Any specific user-count figures cited from
secondary sources should be verified against current on-chain data (Dune Analytics dashboards
and the protocols' own metrics pages) before publication [A].

### Finding 2: Wallet-based identity is the first portable reputation substrate

The crypto-native identity primitive is a wallet address, and its portability is a categorical
departure from every prior identity system available to marketers.

A web2 identity (Google account, Facebook login, email) is a record in a company's database. The
company can delete it, change the permissions around it, or stop accepting it across third-party
products (see: the Google+ sign-in shutdown, Twitter/X's API lockdown). A wallet address is a
public/private key pair. The address is derived from the public key; no company issued it, and no
company can revoke it. Every transaction, attestation, and token balance associated with that
address is permanently readable on-chain.

**Sign-In with Ethereum (SIWE, EIP-4361)** is the Ethereum standard for asserting control of a wallet
to a web application [5]. A SIWE flow produces a signed message that any EIP-4361-compliant verifier
can check without contacting a central authority. The `wevm/viem` library (MIT, GitHub, active) provides
production-ready SIWE support: `createSiweMessage`, `parseSiweMessage`, and `verifySiweMessage` are
first-class functions in the library's auth module [6]. `wevm/wagmi` provides the React hooks layer
above `viem` [7]. Using these two libraries, a marketing tool can verify that a user actually controls
the wallet address they claim, link them to their on-chain reputation data, and do so without storing
a password or trusting a third-party OAuth provider.

**Note on deprecated tooling:** `spruceid/siwe` was the original SIWE reference implementation and was
widely cited in tutorials through 2024. It has been inactive since approximately May 2025 [8].
All new implementations should use `viem`'s SIWE module, not `spruceid/siwe`.

**Ethereum Attestation Service (EAS)** provides a general-purpose framework for issuing, verifying, and
revoking onchain attestations about any address [9]. An attestation is a signed statement:
`(attester address) → (subject address) → (claim)`. EAS attestations are indexed and queryable; any
application can read them. For a brand, EAS creates the technical possibility of:
- Attesting that a wallet address completed a course, read a report, or purchased a product
- Accepting attestations from trusted third parties as proof of a user's qualifications
- Building a composable reputation layer that accumulates across every protocol the user enters

The combination of SIWE (authentication), ENS (human-readable name), and EAS (verifiable claims)
constitutes a portable identity stack with no web2 equivalent. A brand that builds its owned system
on these primitives is building on infrastructure it does not need permission to use, that cannot be
taken away by a platform policy change, and that travels with its users wherever those users go next.

### Finding 3: Web3 social protocols are live, buildable channels

Farcaster and Lens are the two most active decentralized social protocol stacks as of July 2026.
Both have production-quality SDKs and enough adoption to be meaningful marketing surfaces.

**Farcaster:**

The Farcaster protocol was designed around two principles: sufficient decentralization (no single
company controls the network) and usable software (the protocol is simple enough that clients can
be built by independent teams) [1]. The Warpcast client is the primary consumer interface, but
Farcaster's open client model means third-party clients (Supercast, Nook, others) access the same
social graph. A brand's Farcaster cast is readable in every Farcaster client.

Frames are Farcaster's most distinctive marketing primitive. A Frame is an interactive mini-app
embedded in a cast: a product card, a mint button, a form, a game. The user interaction is a
wallet signature, making every Frame interaction a first-party onchain event with the user's wallet
address attached. From a marketing standpoint, Frames are the first social advertising primitive
that produces first-party data by design: the "click" is a wallet transaction. The `neynarxyz/nodejs-sdk`
provides a Frame validation function to verify that an incoming Frame interaction is genuine [10][11].

Farcaster Channels function as community hubs within the protocol: a `/farcaster`, a `/ethereum`,
a `/marketing`. Channel membership and activity are onchain-adjacent (stored on Hubs) and
queryable via the Neynar API, making it possible to reach specific protocol communities directly.

**Lens:**

Lens Protocol implements its social graph as a set of EVM smart contracts on Polygon and other
EVM chains. Profiles, follows, and publications are onchain transactions [12]. This means
Lens content is censorship-resistant in the same sense that any blockchain transaction is:
it persists as long as the chain does.

Lens Open Actions are the Lens equivalent of Frames: programmable onchain actions embedded in posts.
A brand can deploy an Open Action that lets a Lens user mint a token, make a purchase, or claim
a POAP directly from a post, with the transaction recorded onchain and the user's wallet address
attached to the event [13].

The `lens-protocol/lens-sdk` (MIT) abstracts the smart contract interactions: creating profiles,
publishing posts, following, triggering Open Actions — all accessible as TypeScript functions [12][13].

**POAPs and onchain reputation:**

POAP (Proof of Attendance Protocol) issues non-fungible tokens as attendance records for events,
AMAs, and community milestones [18]. A wallet's POAP collection is a public, independently
verifiable record of participation. For a marketing team, hosting events that issue POAPs
creates a persistent record in attendees' wallets — one that can be referenced in future
interactions (gated access, airdrops, recognition) without asking the user to prove anything again.

**Freshness caveat:** Active user numbers for Farcaster and Lens fluctuate significantly with
market conditions. Specific count figures should be verified against current Dune Analytics
dashboards before publication [A][B].

### Finding 4: Token-based community ownership rewires how trust and reach work

The governance token is the mechanism through which crypto communities operationalize ownership.
Holding governance tokens grants voting rights on protocol parameters, treasury allocations, and
community policies — including, in many DAOs, marketing and grant decisions [16].

The implications for marketers are structural, not tactical:

**Reach is earned through contribution.** In a DAO-governed protocol, meaningful reach comes from
being recognized as a contributor: submitting governance proposals, auditing contracts, writing
documentation, building integrations. These contributions are logged on-chain. A brand that employs
engineers who contribute to the protocols it wants to market within is a recognized actor. A brand
that only broadcasts promotional content is not.

**Airdrops are the acquisition mechanic.** Airdrop campaigns — distributing tokens to wallets that
meet specific criteria (early users, active contributors, holders of a related asset) — are the
primary way crypto protocols acquire and reward early participants [17]. For a brand launching into
a crypto community, designing a thoughtful airdrop is not just financial generosity; it is the
mechanism for creating a community of owners whose economic interest aligns with the brand's success.
The criteria for an airdrop (what qualifications a wallet must meet) are a brand's definition of
its ideal community member, encoded in smart contract logic.

**Token-gating creates segmented access.** Token holders can access gated content, communities,
and services that non-holders cannot. This is functionally a loyalty tier, but one where the
"loyalty credential" is a freely transferable onchain asset. Token-gating via `wagmi` or `viem`'s
SIWE module is technically trivial once the wallet identity is verified. The `alchemy-sdk` and
similar tools provide token-balance queries against any ERC-20 or ERC-721 address [20].

**Trust is transparent.** In web2 marketing, trust is a judgment call: does this influencer have
real reach? In a crypto community, a wallet's credibility is partially auditable: how long has it
been active, how many governance votes has it cast, which protocols has it interacted with, what
attestations does it hold? This transparency cuts both ways: it makes genuine contributors more
credible and makes inauthentic behavior (bot networks, sybil attacks) more detectable.

**Airdrops and wash-trading caveat:** Airdrop farming (creating many addresses to capture token
distributions) and wash trading (inflating volume with coordinated buys and sells) are well-documented
sybil-resistance failures in crypto communities. Protocols respond with increasingly sophisticated
eligibility criteria. Marketers should design airdrop programs with genuine contribution requirements,
not volume metrics that are easily gamed, and should be aware that the crypto community views
inauthentic airdrop mechanics as a trust violation that is difficult to recover from [C].

### Finding 5: Crypto primitives for agent-to-agent commerce

The infrastructure for AI agents transacting in crypto is already available and in active development.
Understanding these primitives is essential context for a brand planning to operate in crypto-powered
markets as autonomous agents become part of the commerce stack.

**x402 (Coinbase, MIT, active):**

`coinbase/x402` implements the HTTP 402 "Payment Required" status code as a practical payment
protocol. An x402-enabled API server returns a `402` response with a payment token when an
unauthenticated request arrives. The client (which can be an AI agent or a standard HTTP client)
pays using USDC on Base or another EVM chain, attaches the payment receipt to the request header,
and retries. The entire flow is HTTP-native and requires no billing accounts, API keys, or
subscription relationships [21][22]. For a brand operating a paid API surface, x402 makes it
possible for agents to discover and pay for that API inline, without any human intervention.

**AgentKit (Coinbase, MIT, active):**

`coinbase/agentkit` provides a TypeScript/Python SDK for giving an AI agent a managed Ethereum wallet.
The agent can send transactions, call smart contracts, check balances, and interact with DeFi
protocols as part of its task loop [23]. For a brand building an agent-native product, AgentKit
is the foundation for an agent that can participate in token-gated communities, claim POAPs on
behalf of users, or pay for API access autonomously.

**AP2 (Google Agentic Commerce, public proposal, 2026):**

The `google-agentic-commerce/AP2` specification describes a payment mandate: a pre-authorization
that a user grants to an agent, specifying the conditions under which the agent may spend on
their behalf (maximum amounts, approved counterparties, permitted transaction types) [24].
AP2 payment mandates are designed to be composable with both web2 payment rails and onchain
settlement, including stablecoin transfers. For a brand that wants to be a trusted payment
destination in agent commerce, publishing an AP2-compatible specification for what your
services accept and what they cost is the onchain equivalent of publishing a price list.

**The agent commerce thesis:**

Put together, x402 + AgentKit + AP2 describe a settlement layer where:
- A user pre-authorizes an agent with a payment mandate (AP2)
- The agent discovers a service and receives a 402 response with payment terms
- The agent pays in USDC inline, using a managed wallet (AgentKit + x402)
- The transaction is onchain and auditable by all parties

For a brand, being part of this stack requires: an API surface that speaks x402, a verifiable
onchain identity that the agent can look up, and a corpus of trustworthy claims about what the brand
offers and what it costs. The FDI owned-system thesis — "a persistent identity and corpus you can
prove" — is the direct answer to what a brand needs to be agent-discoverable in a crypto-native
commerce context.

---

## Analysis

The five findings converge on a single strategic insight: in crypto-powered networks, the durable
marketing asset is an onchain identity with depth. Not a follower count, not a paid placement,
not a token treasury by itself — but the combination of a verifiable identity (wallet + ENS),
a track record of participation (attestations, governance votes, POAP collection, contribution
history), a corpus of owned content that lives on the protocols (Farcaster channel, Lens profile,
IPFS-anchored documents), and an API surface that agents can discover and pay for.

This is structurally identical to the "owned retrieval layer" argument from the Aggregated guide,
applied to a different infrastructure layer. In aggregated markets the brand needs to be retrievable
and citable by AI models. In decentralized markets the brand needs to be verifiable and
composable by protocols and agents. The mechanism differs (ENS + attestations vs. structured
corpus + schema markup), but the underlying principle is the same: the durable asset is one
you can prove, not one you rent from a platform.

The crypto-specific nuance is that "proving" your identity in this context is technically more
concrete. An attestation from a credible issuer on EAS is publicly inspectable: any wallet or
agent can read it. A governance voting record is on-chain: any protocol can verify it.
A POAP collection is in the wallet: any token-gating contract can check it. This is not a
marketing claim — it is a cryptographic fact. The brand that builds an onchain identity with
these properties is operating at a different trust level than a brand that merely has a website
and a social account.

The counter-evidence is real: crypto user numbers are volatile, most people outside the crypto
ecosystem have no wallet, and the DeFi/DAO space has seen spectacular governance failures and
fraud. The honest positioning for Field Guide 003 is not "everyone needs a DAO" but rather:
crypto-powered networks are the first markets to ship portable, verifiable identity and
programmable settlement as infrastructure, and those properties are going to matter more broadly
as agent commerce scales. Understanding them now, when the user base is still early-adopter,
is the same thesis as understanding SEO in 2004 or mobile-first in 2011.

---

## Limitations

Several caveats bound these findings.

**User count figures:** Active user numbers for Farcaster, Lens, and related protocols fluctuate
significantly with market conditions and are measured inconsistently across sources (daily active
addresses vs. accounts vs. paying users). Any specific number cited for "Farcaster users" or
"Lens profiles" should be verified against current on-chain Dune Analytics dashboards before
publication. No specific user-count figures from secondary sources have been included in this
document as primary findings for that reason.

**Protocol volatility:** Both Farcaster and Lens have made breaking protocol changes in their
histories. SDK versions cited (neynarxyz/nodejs-sdk, lens-protocol/lens-sdk) were active as of
July 2026; check GitHub for current status before citing version-specific capabilities.

**x402 / AP2 maturity:** Both x402 and AP2 are active open-source proposals rather than finalized
standards. x402 has real implementations in production (Coinbase uses it internally); AP2 is a
specification under public review. The crypto-primitives section is best framed as "the direction
the agent commerce stack is heading" rather than "the settled standard."

**Airdrop farming:** The effectiveness of airdrop campaigns varies enormously with execution.
Well-designed airdrops (Uniswap's UNI distribution, ENS's airdrop) are widely cited as successful
community formation. Poorly designed ones (most "points" programs from 2023-2025) produced
temporary price pumps with little lasting community formation. The difference is in eligibility
design, which is a topic for the practical section of the guide, not the research.

**DeFi/DAO governance failures:** The crypto space has seen high-profile governance attacks
(Beanstalk, Compound), rugs, and protocol collapses. These are real risks and should be
acknowledged in the guide's treatment of DAO participation. A brand participating in governance
should do so with the same due diligence it applies to any business relationship.

---

## Crypto Primitives Reference

For the product-concept task that follows this guide, here is a concise summary of the
agent-commerce primitives:

| Primitive | Repo | License | What it does |
|---|---|---|---|
| x402 | `coinbase/x402` | MIT | HTTP-native USDC micropayment; agent pays for API inline |
| AgentKit | `coinbase/agentkit` | MIT | Managed wallet for AI agents; tx, contract calls, balances |
| AP2 | `google-agentic-commerce/AP2` | Apache 2.0 | Payment mandate spec; pre-authorizes agent spending |
| viem SIWE | `wevm/viem` | MIT | SIWE auth; wallet identity verification |
| wagmi | `wevm/wagmi` | MIT | React hooks for wallet + viem |
| EAS | `ethereum-attestation-service/eas-sdk` | MIT | Onchain attestations; composable reputation |
| ENS | `ensdomains/ensjs` | MIT | ENS resolution; portable `brand.eth` identity |

---

## Sources

1. Farcaster protocol documentation — farcaster.xyz — https://docs.farcaster.xyz — 2026 — Tier 1 (primary protocol docs)
2. ENS (Ethereum Name Service) official docs — ens.domains — https://docs.ens.domains — 2026 — Tier 1
3. ENS protocol governance and stats — Dune Analytics ENS dashboards — https://dune.com/ethereumnameservice — ongoing — Tier 1 (on-chain data)
4. Warpcast (Farcaster client) — farcaster.xyz — https://farcaster.xyz — 2026 — Tier 2
5. EIP-4361: Sign-In with Ethereum (SIWE) — Ethereum Improvement Proposals — https://eips.ethereum.org/EIPS/eip-4361 — Sept 2021, finalized — Tier 1 (Ethereum standard)
6. viem SIWE utilities — wevm/viem GitHub — https://github.com/wevm/viem — 2026 (MIT, active) — Tier 1 (primary source)
7. wagmi — wevm/wagmi GitHub — https://github.com/wevm/wagmi — 2026 (MIT, active) — Tier 1 (primary source)
8. spruceid/siwe — GitHub (stale since May 2025) — https://github.com/spruceid/siwe — Tier 2 (deprecated reference)
9. Ethereum Attestation Service — attest.org — https://attest.org + https://github.com/ethereum-attestation-service/eas-sdk — 2026 — Tier 1
10. neynarxyz/nodejs-sdk — GitHub (MIT, active) — https://github.com/neynarxyz/nodejs-sdk — 2026 — Tier 1 (primary source)
11. Neynar Farcaster API documentation — docs.neynar.com — https://docs.neynar.com — 2026 — Tier 2
12. lens-protocol/lens-sdk — GitHub (MIT, active) — https://github.com/lens-protocol/lens-sdk — 2026 — Tier 1 (primary source)
13. Lens developer documentation — docs.lens.xyz — https://docs.lens.xyz — 2026 — Tier 2
14. Farcaster Frames specification — Farcaster docs — https://docs.farcaster.xyz/developers/frames — 2026 — Tier 1
15. Lens Open Actions — Lens developer docs — https://docs.lens.xyz/docs/open-actions — 2026 — Tier 2
16. DAO governance overview — MakerDAO, Compound, Uniswap governance documentation (see each protocol's governance portal) — Tier 1 (primary protocol docs)
17. Uniswap UNI airdrop documentation — Uniswap blog — https://uniswap.org/blog/uni — Sept 2020 — Tier 2 (influential historical example)
18. POAP documentation — poap.tech — https://documentation.poap.tech — 2026 — Tier 2
19. Gitcoin Passport / Stamps documentation — passport.gitcoin.co — https://docs.passport.xyz — 2026 — Tier 2
20. Alchemy SDK — alchemy-platform/alchemy-sdk-js — https://github.com/alchemyplatform/alchemy-sdk-js — 2026 — Tier 2
21. coinbase/x402 — GitHub (MIT, active) — https://github.com/coinbase/x402 — 2026 — Tier 1 (primary source)
22. x402 protocol documentation — x402.org — https://www.x402.org — 2026 — Tier 2
23. coinbase/agentkit — GitHub (MIT, active) — https://github.com/coinbase/agentkit — 2026 — Tier 1 (primary source)
24. google-agentic-commerce/AP2 — GitHub (Apache 2.0, public proposal) — https://github.com/google-agentic-commerce/AP2 — 2026 — Tier 1 (primary specification)
25. Ethereum foundation: Account Abstraction (ERC-4337) — ethereum.org — https://ethereum.org/en/roadmap/account-abstraction/ — 2026 — Tier 1
26. Dune Analytics — dune.com — https://dune.com — ongoing — Tier 1 (on-chain analytics, primary data)
27. DeFiLlama — defillama.com — https://defillama.com — ongoing — Tier 2 (aggregated DeFi metrics)

**Unverified figures (excluded from findings, listed for tracking):**
A. Farcaster active daily user counts — circulate widely in secondary sources but vary by definition and date; verify against current Dune dashboards before citing.
B. Lens active profile counts — same caveat as Farcaster; use protocol's own metrics page.
C. Airdrop farming prevalence statistics — widely cited in crypto media but methodologies unclear; use as directional context only.
