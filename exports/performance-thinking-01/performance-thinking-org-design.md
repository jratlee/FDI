# The Hourglass Bet
### Performance Thinking · On org design for the agentic era

The cheapest org decision you can make this year is cutting juniors. It is also the one that bankrupts you by 2034.

Here's the setup. Agentic AI flipped software from a tool you operate into a participant that acts. The marginal cost of producing content just hit zero, which means the assembly-line MarCom department, with its handoffs from strategist to copywriter to designer to media buyer, is now overhead pretending to be process. Everyone can see this. The tempting response is to do the spreadsheet math: AI does entry-level work at a fraction of the cost, so delete the entry level.

I spent the last few weeks working through the research on what actually happens next, and the short version is: that math is a trap with a ten-year fuse.

## The four shapes an org can take

An AWS Events talk on team structures in an agentic world lays out four shapes, and once you see them you can't unsee them in your own org chart:

- **The Pyramid.** The legacy shape. Lots of juniors doing manual work under a few seniors. Too slow and too heavy for agentic workflows.
- **The Diamond.** The trap. You cut the junior base, bulk up the middle to "manage the AI," keep a thin top. Feels efficient. Quietly destroys the learning pipeline.
- **The Inverted Pyramid.** Pods of 3 to 5 senior generalists running AI. Maximum output today, zero pathway for anyone to become senior tomorrow.
- **The Hourglass.** High-velocity senior pods at the top, a lean middle, and a deliberately protected base of juniors at the bottom whose job is not output. Their job is to build judgment.

The reason the Hourglass wins is boring and human: expert judgment is not innate. It gets built by a decade of friction, mistakes, and edge cases. If nobody junior is in the system doing real work today, nobody senior exists in 2034. The researchers call this the deskilling trap. I call it eating your seed corn because the harvest looked expensive.

The uncomfortable part for leadership: holding an unproductive-looking junior base on the balance sheet while your competitors post record margins takes actual conviction. This is the tension a modern CMO is paid to hold.

## What the people at the top of the hourglass do

They stop being specialists. The research converges on the "expert generalist": one person who owns an end-to-end workflow, with AI agents filling in as on-demand domain experts. When you hire for this, the filters change completely. Ask yourself about your last five hires:

- Could they rebuild a solution from first principles, or did they pattern-match to a playbook that expired last quarter?
- Do they show system-level curiosity, poking at how one change ripples through a multi-agent workflow?
- Do they have taste? Fiona Fung, Director of Engineering at Anthropic, makes this point well: when the AI produces something technically correct but aesthetically dead, a human with product taste is the only fix.
- Can they orchestrate both people and agents, treating the agent as a sub-agent that needs management and feedback, not a vending machine?

Certifications age in months. Polymaths compound.

## From prompting to loops

The second shift is operational. Manual prompting is artisanal work; the leverage is in loop engineering, a practice formalized by LangChain and Addy Osmani. Loops climb four levels:

1. **Agent Loop.** One model calls tools until a task is done.
2. **Verification Loop.** Output gets scored against a rubric; fail means retry with feedback.
3. **Event-Driven Loop.** Real-world signals trigger runs without a human initiating.
4. **Hill-Climbing Loop.** The system studies its own production traces and improves itself.

In MarCom terms: an SEO and GEO loop that audits your entity footprint continuously and rolls back anything that hurts visibility. An ads loop that generates variants, checks them against brand and compliance rules before they ship, then reallocates budget on live ROAS. A narrative loop that recalibrates itself when its read on customer sentiment drifts below a threshold.

One thing the loop never supplies: wisdom. It executes the conditions a human set. Which is exactly why the junior base matters. Someone has to grow into the person who knows which conditions to set.

## The riverbank

Running autonomous loops without governance is how you end up in a breach report. Gartner (via CodiLime) expects 25% of enterprise breaches by 2028 to trace back to AI agent abuse, and BigID found 47% of organizations currently have no AI-specific security controls at all. A written policy or a system prompt is not a control. Prompts are suggestions.

The metaphor I keep coming back to: agents are the river, policy as code is the riverbank. The river finds the fastest path; the bank decides where flooding is impossible. In practice that means permissions scoped at the OS or container level, brand and budget rules compiled into executable policy (Open Policy Agent is the usual engine), and logging what an agent intended, not just what it did. Governance stops being a ticket queue and becomes infrastructure.

## Proof beats promise

The output side inverted too. The old comms ratio, 80% vision to 20% substance, is dead. a16z crypto's new comms playbook calls the replacement the Proof Stack: partnerships with real deployed integrations, hard metrics that survive third-party scrutiny, organic traction that predates your PR push, and validation you didn't pay for. The Financial Times found 74% of business leaders have delayed decisions because they didn't know which data to trust, and 82% trust a source more when it challenges their assumptions. Lead with the thousand real users, not the hypothetical million.

And increasingly the reader isn't a person. LLMs cite only 2 to 7 domains per query, so getting your brand into that citation set (the shift from SEO to GEO and LEO) is a zero-sum fight for entity authority. One step further out, the buyer is software: agent-to-agent commerce over open standards like MCP and A2A, settled by x402 micropayments. Your marketing system has to be something another machine can query and trust.

## The learning agenda

If I were running a MarCom department today, my next 90 days would look like the research's plan, compressed:

- **Days 1 to 30:** Map your org's shape honestly. Freeze middle-heavy hiring. Find your two or three latent polymaths and pull them into a pod. Stand up the riverbank before any agent touches production.
- **Days 31 to 60:** Ship a Verification Loop first, then an SEO/GEO loop with automated rollback. Strip visionary rhetoric out of every pending campaign and re-sequence it around proof.
- **Days 61 to 90:** Move to pods plus a shared platform. Retrain the SEO and PR teams on citation authority instead of traffic. And launch the sandboxed junior program, because that is the whole bet.

This is the thesis I'm building False Dawn Industries around: structure as code, not slides. We shipped the blueprint as a working kit, MarCom OS, with the Hourglass org design, the capability calculator, and the riverbank governance templates inside it. If you want it when it ships, join the waitlist at [falsedawn.industries/marcom-kit](https://falsedawn.industries/marcom-kit).

Credit where it belongs: the frameworks above draw on an AWS Events talk on agentic team structures, Fiona Fung at Anthropic, LangChain and Addy Osmani on loop engineering, a16z crypto's comms playbook, the Financial Times' New Dimensions of Influence study, CodiLime, BigID, Profound, and Brandpipers. Sources are named in the deck.

#CMO #OrgDesign #AgenticAI #MarketingLeadership #GrowthMarketing
