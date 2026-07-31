# The Ads Are for the Robots Now
### Time is selling ads to AI bots. Cloudflare wants to meter the crawl. Parallel wants to pay you your Shapley value. All three roads lead to the same starting point.

**Header image:** `agentic-web-header-1200x627.png` *(image slot — to be produced separately)*
**Attribution note:** Credits Sara Guaglione / Digiday (the Time–Mobian agent-ads report, July 30, 2026) and Ben Thompson / Stratechery (interviews with Matthew Prince, September 2025; Meredith Kopit Levien, April 9, 2026; and Parag Agarwal, May 21, 2026). All direct quotes are verified against the source documents; see the companion citations file.

**SEO title (60 chars):** Three Models for the Agentic Web | False Dawn Industries
**SEO description (155 chars):** Time sells ads to AI bots, Cloudflare meters the crawl, Parallel pays Shapley values. Every agentic-web model converges on one input: human expertise.
**Primary keyword:** agentic web

---

Time has started serving ads to AI bots. Ally Bank and the Project Management Institute are the first buyers. The ads are FAQs, written for machines, embedded in stripped-down markdown copies of Time's pages, labeled as sponsored content, and priced at a premium.

Strange as that sounds, Digiday's Sara Guaglione reports the logic plainly: Time now sees more bot traffic than human traffic most days, mirroring Cloudflare data showing more than half of all web traffic is bots. If the audience is machines, sell to the machines. As Mobian CEO Jonah Goodhart, whose ad tech powers the product, put it: "Maybe it's more important to influence the agent than even the human, because with a human you influence one person. When you influence ChatGPT, you're influencing potentially all of ChatGPT."

That one story is the visible tip of a much bigger question: what is the business model of a web where the reader is a robot? Three serious answers are now on the table, and they disagree about everything except one thing.

**Model one: sell influence to the agents.**

This is the Time–Mobian play. Convert your pages to markdown so agents can read them, then charge brands to place trusted, structured information in the path of the bots. Time's COO Mark Howard is explicit about why anyone would pay a premium for this: AI bot impressions on authoritative content are scarce and valuable, and that scarcity gives advertisers the opening to shape what LLMs retrieve. "This is an obvious extension of list sponsorship or franchise sponsorship," Howard said, pointing to the bot spikes that follow every Time100 launch, "given that domain authority, the volume, the ability to flight a campaign and to target it accordingly."

It's rational. It's also, by Howard's own admission, an experiment: "We don't know yet because this is brand new, and we believe that we are paving the first path forward here." BCG X's Rob Derow flags the unpriced risk: if LLMs ever decide that markdown pages carrying content humans don't see constitute cloaking, those pages could be penalized rather than indexed. Call this what it is — a clever monetization tactic on top of a business, not a business model.

**Model two: meter and charge the crawl.**

Cloudflare's Matthew Prince starts from the broken bargain. Google's quid pro quo — "We get a copy of your content and in exchange we'll send you traffic and help you monetize that traffic" — dies when search engines become answer engines. His numbers are brutal: over the last decade it became 10 times harder to get a click from Google for the same content; it's 750 times harder with OpenAI and 30,000 times harder with Anthropic.

His answer is pay-per-crawl: block the bots, create scarcity, and let a market form. "All markets require scarcity, you can't have a market if you don't have scarcity." And what does that market pay for? Prince says each AI company should rank content "scored on two different axis, which is how reputable is this, and then how novel is it?" His proof point is Reddit, which blocked scrapers and extracted $120 million from Google in 2024 — roughly seven times what The New York Times' comparable token count commands — because "if you don't have Reddit, you don't have Reddit." His conclusion: "the more unique it is, the more you'll get paid for it, I think that that's just inevitable."

**Model three: get paid your marginal contribution.**

Parallel founder Parag Agrawal goes furthest. His Index scores every site on four axes — Impressions, Citations, Value, Uniqueness — and pays content owners their Shapley value: their computed marginal contribution to the work agents actually do at inference time. The gloves example he gave Ben Thompson is the whole model in miniature: one seller has the only left glove, two sellers have identical right gloves; the math pays the left glove 4x. "Shapley value will then disproportionately reward high reputation, high quality, and unique/differentiated content."

What pops out of Parallel's data? Local news. nyc.gov. Authoritative factual content nobody else has. And Agrawal expects the incentive to work backwards into creation itself: "people will change behavior knowing that there are gaps in the content available to agents that I can show up and fill and extract by being unique and differentiated."

**Now notice what all three models quietly require.**

Time can charge a premium only because of domain authority and the editorial franchises — Time100 and its siblings — that make bots spike in the first place. Humans build the franchise, humans run the GEO product, humans review and approve every agent ad before it ships.

Cloudflare's market clears on "reputable and novel." Reputation is accumulated human editorial judgment. Novelty is someone going and finding out something the world didn't know. Prince is even recruiting academic economists to design the market mechanics — humans architecting the marketplace that pays humans. His stated goal for the whole system: reward "who is actually filling in human knowledge," not who is rage-baiting.

Parallel's Shapley math pays for uniqueness, and uniqueness compounds from editorial taste — from choosing to harvest the facts on the ground in the niche where you have no competition.

And the fourth reference point makes the thesis explicit. New York Times CEO Meredith Kopit Levien, asked by Thompson why the Times succeeded: "we kept investing in journalism, that's it. Good times, bad times, we kept investing in the journalism." Her formula, borrowed from publisher AG Sulzberger: "It's value and values." Her description of everything the Times makes, down to the games: "Humans with expertise are making these things and in some cases harnessing technology to do that even better." The Times isn't hedging against the agentic web. It's making the purest version of the bet every other model depends on: humans with expertise, working a professional process, are the only durable source of content that is scarce, authoritative, and worth paying for.

That's the convergence. Sell influence, meter access, or price marginal value — every model is a different pricing mechanism bolted onto the same underlying asset. None of them creates the asset. If your content is substitutable, the agent ad has no premium, the crawl market pays you commodity rates, and your Shapley value rounds to zero.

**So what should a publisher — or any brand that publishes — actually do?**

The Digiday piece, read carefully, is a checklist. But the order matters.

1. **First, fund the expertise.** Everything below is a multiplier on zero without differentiated human knowledge — beats, franchises, proprietary data, on-the-ground facts nobody else has.
2. **Make it machine-readable.** Time converted its pages to markdown; Mobian's data shows about 15% of brands already power their own markdown pages. Agents can't pay for what they can't parse.
3. **Treat bot traffic as inventory, with disclosure.** Time labels every agent ad as sponsored content even though no policy yet requires it — because the cloaking risk is real and trust with the models is the whole game.
4. **Measure your AI visibility.** Mobian tracks visibility, favorability, and accuracy scores over time; Parallel's Index will show you your Uniqueness score whether you like it or not.
5. **Then, and only then, layer on monetization** — agent ads, crawl fees, marketplace payouts — as tactics on top of the expertise base, not substitutes for it.

Time's move is a rational hedge and I expect it to make money. But a hedge is not a strategy. The strategy is the thing Kopit Levien said in one sentence and the other three models assume without saying: invest in humans with expertise first. That's the owned system — the identity, the corpus, the earned authority that machines can verify and can't replicate. The agentic web isn't going to change who gets paid. It's going to make brutally legible, in Shapley math and crawl prices, who was worth paying all along.

Build the expertise. The robots will find it.

---

*False Dawn Industries maps how marketing survives aggregated, decentralized, and autonomous markets. Follow FDI for the Field Guide series, and pressure-test the thinking against real, working code at github.com/jratlee/FDI.*
