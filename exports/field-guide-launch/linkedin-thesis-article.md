# Build the Machine, Not the Ad
### A case for building owned marketing systems in aggregated, decentralized, and autonomous markets

**Header image:** `li-article-header-1200x627.png`
**Attribution note:** Credits Ben Thompson / Stratechery, Eric Seufert / DeCANT (Mobile Dev Memo), Alice Lassman (Disillusionomics), and Yuval Noah Harari (Sapiens).

**SEO title (62 chars):** Owned Marketing Systems for the AI Age | False Dawn Industries
**SEO description (157 chars):** Reach is commoditized and ad platforms are black boxes. The durable play is owned marketing systems: a persistent identity and corpus you can prove. Read on.
**Primary keyword:** owned marketing systems

---

The cost of content falling to zero is not an opportunity, it is an emergency. For thirty years, marketing has been a bet on reach: buy (or earn) attention, count clicks, repeat. That bet is over.

In "[Content and Community](https://stratechery.com/2025/content-and-community/)," [Ben Thompson](https://tw.linkedin.com/in/benjaminjthompson) builds on his earlier "[AI Unbundling](https://stratechery.com/2022/the-ai-unbundling/)," as he traces how every wave of technology removes one bottleneck in the chain from idea to audience: first writing, then the printing press, then the internet. Each time the bottleneck moved, the money moved with it. AI removes the final one, the substantiation of the idea itself. We have reached total content commoditization. A chatbot will now produce any ad, any article, any image, on command. If content is free to make, then making it is worth nothing.

What stays scarce is everything around it: provenance, trust, and the system that decides who sees what.

[Eric Seufert](https://www.linkedin.com/in/ericseufert)'s master's thesis in Applied Computation at Harvard, [DeCANT](https://mobiledevmemo.com/introducing-decant-a-context-conditioned-attention-based-multimodal-architecture-for-creative-pre-testing/), starts from a hard truth: ad platforms have collapsed into black boxes. You feed in a budget and a creative, and past that event horizon, light does not escape. You have one or two levers left, and that's it. The clear answer is not to surrender and "embrace the void." It's to build your own model, distilled from the platform's own behavior, so you can predict and measure before you spend. Own a system instead of renting an outcome.

When reach is commoditized and platforms are opaque, the only durable marketing assets are the ones you own and can prove. A persistent identity. A proprietary corpus. Systems that other machines can query and trust.

[Our first Field Guide made the diagnosis](https://www.linkedin.com/posts/the-cmos-field-guide-to-system-cohort-ugcPost-7478499200716959745-Zp2F/). The world will spend $1.3 trillion on advertising in 2026, and the average digital ad earns about 2.5 seconds of active attention. Worse, people now price in persuasion the moment they can see it. The economist [Alice Lassman](https://uk.linkedin.com/in/alice-lassman-436085128) calls this [Disillusionomics](https://www.theguardian.com/commentisfree/2025/oct/03/us-economy-gen-z-stability-disillusion): every tactic a consumer can detect is a tactic they quietly discount. Where does that leave you? At the beginning. In [Sapiens](https://www.ynharari.com/book/sapiens/), Yuval Noah Harari explains how humans have coordinated around shared belief for roughly 70,000 years. Belief lives in culture, trust lives in experience, and identity is the connective tissue between the two.

![Identity is the ultimate infrastructure: the bridge between culture and code](viz-identity-bridge-1200x620.png)

*Belief lives in culture, trust lives in experience, and identity is the connective tissue between the two.*

[Pile](https://askthepile.com) is a pay-per-question answer engine. You ask, you see a free preview, and you pay only if the answer earns it: $0.99 for a quick answer, $1.99 for a deep one. The interesting part isn't the retrieval; underneath it's a fairly standard RAG system running on Postgres with pgvector. The interesting part is that trust has an architecture. The previewed answer and the paid answer are literally the same bytes, generated once and stored, so the preview can never be a bait-and-switch. Every delivery carries a SHA-256 proof-of-delivery hash. If confidence is low, the buyer is warned before they pay, not after. In a Disillusionomics world, provable honesty is the product.

[Talk to NYC](https://github.com/jratlee/nyc-chat) answers plain-English questions about [New York City law](https://www.nyc.gov/site/law/public-resources/laws-of-the-city-of-new-york.page). It's a Hybrid GraphRAG system: it aggregates thousands of scattered legal XML files into one knowledge graph, then answers using both vector search (for meaning) and graph traversal (for how one rule cites another). Every answer keeps its section numbers attached, so you can check the work. And it exposes that graph through an MCP server, which means other AI agents can query it directly, as a tool inside their own workflows.

Neither are perfect, there are probably kinks. [It is hard](https://futurism.com/artificial-intelligence/ai-chatbot-mamdani).

![Two builds: Pile stores trust as a relational database constraint; Talk to NYC stores shared reality as a citable graph](viz-two-builds-1200x700.png)

*Same goal from two directions: Pile puts honesty in a database constraint, Talk to NYC puts shared reality in a graph you can check.*

These early proofs are just a preview of the three market structures that the next [Field Guides](https://www.linkedin.com/feed/update/urn:li:activity:7477801122485870593) cover, and why each one is urgent now:

### Aggregated

Discovery is moving behind recommenders and chat assistants. More and more, your customer asks a model, not a search box, and the model decides whether you exist. You don't get to negotiate reach with an aggregator. What you can own is a persistent identity and a corpus of trustworthy answers, the way [Pile](https://askthepile.com) turns a private folder into something a machine can retrieve and cite.

### Decentralized

Your knowledge is scattered across documents, product data, support logs, and policies that don't talk to each other. The winners will stitch those fragments into one owned, queryable graph, with the relationships between them preserved and citable, the way [Talk to NYC](https://github.com/jratlee/nyc-chat) turns a heap of XML into a graph you can actually reason over. Retrieval you own beats targeting you rent.

### Autonomous

Agents are about to transact on your customers' behalf, and on yours. That means your marketing system needs to be something another agent can safely call. Talk to NYC's MCP server and Pile's gated agent API are early versions of exactly that, with the trust boundaries that make it survivable: treat every retrieved document as hostile input, sanitize everything that goes out, and never let data become a command.

![Three markets, three new forms brand identity has to take: Aggregated, Decentralized, and Autonomous](viz-three-markets-1200x680.png)

*Three shifts, happening at once, each answered by the same move: own the identity, the corpus, and the interface instead of renting reach.*

These three shifts aren't tidy predictions for later this decade. They are happening at once, right now, and they compound. Every quarter you spend buying commoditized reach is a quarter you didn't spend building the identity, the corpus, and the interfaces that will still be yours when the aggregators and the agents finish rearranging the market. The window to build owned marketing systems closes the moment a competitor's system becomes the default your customers' agents reach for first.

You can keep feeding the black box. Or you can build the machine.

Three Field Guides are on the way. Aggregated, Decentralized, Autonomous. Follow [False Dawn Industries](https://www.linkedin.com/company/false-dawn-industries) to get each one the day it drops, and pressure-test the thinking against real, working code at [github.com/jratlee/FDI](https://github.com/jratlee/FDI).
