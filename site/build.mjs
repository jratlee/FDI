import { marked } from "marked";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(__dirname, "dist");
const SRC = path.join(__dirname, "src");

const EXPORTS = path.join(ROOT, "exports", "field-guide-launch");
const FONTS = path.join(ROOT, "artifacts", "mockup-sandbox", "public", "fonts");

/* ---------------- helpers ---------------- */
const rm = (p) => fs.rmSync(p, { recursive: true, force: true });
const mkdir = (p) => fs.mkdirSync(p, { recursive: true });
const copy = (from, to) => {
  mkdir(path.dirname(to));
  fs.copyFileSync(from, to);
};

/* ---------------- brand mark + shared chrome ---------------- */
const MARK = `<svg class="mark" viewBox="0 0 100 100" fill="none" aria-hidden="true"><path class="arc" d="M12 50 A38 38 0 0 1 88 50"/><path class="fill" d="M12 50 A38 38 0 0 0 88 50 Z"/></svg>`;
const lockup = (tag = "span") =>
  `<${tag} class="lockup"><span class="wm">False Dawn Industries</span>${MARK}</${tag}>`;

const GITHUB = "https://github.com/jratlee/FDI";
const CONTACT = "hello@falsedawn.industries";

/* honeypot: a hidden field bots fill but humans never see. Off-screen, not
   display:none (some bots skip hidden inputs), with autocomplete disabled and
   aria-hidden/tabindex so it's invisible to real users and assistive tech. */
const HONEYPOT = `<div aria-hidden="true" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off" /></label></div>`;

function nav(active) {
  const link = (href, label, id) =>
    `<a href="${href}"${active === id ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="nav">
  <div class="wrap nav-inner">
    <a href="/" aria-label="False Dawn Industries — home">${lockup()}</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation">Menu</button>
    <nav class="nav-links" id="nav-links">
      ${link("/field-guide", "Field Guide", "field-guide")}
      ${link("/skillfoundry", "Skillfoundry", "skillfoundry")}
      ${link("/topcall", "Top Call", "topcall")}
      ${link("/#about", "About", "about")}
      <a class="btn btn-primary" href="/skillfoundry#waitlist">Request access</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        ${lockup()}
        <p class="blurb">Owned marketing systems for aggregated, decentralized, and autonomous markets. We map the machine that decides who gets seen — and build the tools to own your place in it.</p>
      </div>
      <div>
        <h5>Explore</h5>
        <ul>
          <li><a href="/field-guide">The Field Guide</a></li>
          <li><a href="/skillfoundry">Skillfoundry</a></li>
          <li><a href="/topcall">Top Call</a></li>
          <li><a href="/#products">Product line</a></li>
          <li><a href="/#about">About</a></li>
        </ul>
      </div>
      <div>
        <h5>Connect</h5>
        <ul>
          <li><a href="${GITHUB}" rel="noopener">GitHub ↗</a></li>
          <li><a href="mailto:${CONTACT}">${CONTACT}</a></li>
          <li><a href="/skillfoundry#waitlist">Join the waitlist</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-base">
      <span>© 2026 False Dawn Industries</span>
      <span>Growth Cartography · Aggregated · Decentralized · Autonomous</span>
    </div>
  </div>
</footer>`;
}

function page({ title, description, active, body, canonical }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${description}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="/assets/li-article-header-1200x627.png" />
<meta name="twitter:card" content="summary_large_image" />
${canonical ? `<link rel="canonical" href="${canonical}" />` : ""}
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preload" as="font" type="font/woff2" href="/fonts/space-grotesk-600-latin.woff2" crossorigin />
<link rel="preload" as="font" type="font/woff2" href="/fonts/inter-400-latin.woff2" crossorigin />
<link rel="stylesheet" href="/site.css" />
</head>
<body>
${nav(active)}
<main id="main">
${body}
</main>
${footer()}
<script src="/site.js" defer></script>
</body>
</html>`;
}

/* the network/machine motif reused from the launch header */
const MACHINE = `<svg viewBox="0 0 200 200" role="img" aria-label="A network graph: buying reach lights a single edge; building the machine lights the whole system.">
  <path class="m-ed" d="M40 40 L100 100 M160 40 L100 100 M40 160 L100 100 M160 160 L100 100"/>
  <path class="m-ed on" d="M40 40 L160 40 M160 40 L160 160 M40 160 L100 100"/>
  <path class="m-ed" d="M40 40 L40 160 M160 160 L40 160"/>
  <circle class="m-nd" cx="40" cy="40" r="13"/>
  <circle class="m-nd on" cx="160" cy="40" r="13"/>
  <circle class="m-nd" cx="40" cy="160" r="13"/>
  <circle class="m-nd" cx="160" cy="160" r="13"/>
  <circle class="m-nd on" cx="100" cy="100" r="20"/>
  <circle class="m-core" cx="100" cy="100" r="8"/>
</svg>`;

/* ---------------- HOME ---------------- */
function home() {
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">Growth Cartography · The Thesis</span>
      <h1>Build the machine, <em>not the ad</em>.</h1>
      <p class="lede">The cost of making content just fell to zero. That's not the opportunity — it's the emergency. When reach is commoditized and platforms are black boxes, the only durable marketing assets are the ones you own and can prove.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/field-guide">Read the Field Guide <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="/skillfoundry">Explore Skillfoundry</a>
      </div>
      <div class="hero-tags"><span><b>Aggregated</b></span><span><b>Decentralized</b></span><span><b>Autonomous</b></span></div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="statband" aria-label="The paradox funding modern marketing">
  <div class="wrap">
    <div class="stat"><div class="k"><span class="amber">$1.3T</span></div><div class="l">what the world will spend on advertising in 2026</div></div>
    <div class="stat"><div class="k">2.5s</div><div class="l">active attention the average digital ad actually earns</div></div>
    <div class="stat"><div class="k">70,000<span class="amber">yrs</span></div><div class="l">humans have coordinated around shared belief — identity is still the bridge</div></div>
  </div>
</section>

<section class="section" id="products">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The FDI product line</span>
      <h2>Tools and field guides for owned marketing systems.</h2>
      <p>False Dawn Industries maps the shift to aggregated, decentralized, and autonomous markets — and ships the working systems that let you own your place in them.</p>
    </div>
    <div class="grid cols-2">
      <article class="card featured">
        <span class="pill">Product · Strategy as Code</span>
        <h3>Skillfoundry</h3>
        <p>A strategic firewall for your content. Route any asset through three opinionated Signal-to-Value gates — Relevance, Performance, and Algorithmic Signal — as an Anthropic-standard plugin. Strategy as code.</p>
        <div class="card-foot"><a class="link-arrow" href="/skillfoundry">See how it works <span class="arrow">→</span></a></div>
      </article>
      <article class="card featured">
        <span class="pill">Product · Signal as Code</span>
        <h3>Top Call</h3>
        <p>The owned radar for executive intelligence. Every source you grade is written into a provenance-stamped corpus and knowledge graph that compounds — queryable through a verifiable MCP interface. Free prompt-pack in, owned system out.</p>
        <div class="card-foot"><a class="link-arrow" href="/topcall">See how it works <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">Field Guide 001</span>
        <h3>The CMO's Field Guide</h3>
        <p>System &amp; cohort dynamics: why every cohort decays on day one, why last-click is gameable, and why identity is the last durable infrastructure. The article, visuals, and deck — in one place.</p>
        <div class="card-foot"><a class="link-arrow" href="/field-guide">Read the guide <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">The series</span>
        <h3>Aggregated · Decentralized · Autonomous</h3>
        <p>Three more field guides map the market structures reshaping discovery, knowledge, and machine-to-machine commerce — each grounded in real, working code.</p>
        <div class="card-foot"><a class="link-arrow" href="${GITHUB}" rel="noopener">Pressure-test the code ↗</a></div>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="proof">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Proof, not slides</span>
      <h2>A thesis you can't ship is just a slide.</h2>
      <p>Two working builds show what owned systems look like in practice — the same trust architecture that runs through everything FDI makes.</p>
    </div>
    <div class="grid cols-2">
      <article class="card">
        <span class="tag">Build · Aggregated</span>
        <h3>Pile</h3>
        <p>A pay-per-question answer engine where trust has an architecture: the free preview and the paid answer are literally the same bytes, every delivery carries a SHA-256 proof-of-delivery hash, and low-confidence answers warn you before you pay. Provable honesty as the product.</p>
      </article>
      <article class="card">
        <span class="tag">Build · Decentralized &amp; Autonomous</span>
        <h3>Talk to NYC</h3>
        <p>A Hybrid GraphRAG system that turns thousands of scattered legal XML files into one citable knowledge graph — answering with both meaning and structure, section numbers attached, exposed through an MCP server other agents can query directly.</p>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="about">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">About FDI</span>
      <h2>Belief lives in culture. Trust lives in experience. Identity is the bridge.</h2>
      <p>False Dawn Industries is building the thesis that when reach is commoditized and platforms are opaque, persistent identity — legible to machines, portable across communities, and verifiable by agents — becomes the ultimate infrastructure. We publish the map (the Field Guides) and build the instruments (Skillfoundry and the working systems behind it).</p>
    </div>
    <div class="hero-cta">
      <a class="btn btn-primary" href="/skillfoundry#waitlist">Join the Skillfoundry waitlist <span class="arrow">→</span></a>
      <a class="btn btn-ghost" href="mailto:${CONTACT}">Get in touch</a>
    </div>
  </div>
</section>`;
  return page({
    title: "False Dawn Industries | Owned Marketing Systems for the AI Age",
    description:
      "Reach is commoditized and ad platforms are black boxes. FDI builds owned marketing systems — a persistent identity and corpus you can prove. Read the Field Guide and explore Skillfoundry.",
    active: "home",
    body,
    canonical: "https://falsedawn.industries/",
  });
}

/* ---------------- FIELD GUIDE ---------------- */
function parseArticle(md) {
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const subMatch = md.match(/^###\s+(.+)$/m);
  const attrMatch = md.match(/\*\*Attribution note:\*\*\s*(.+)/);
  const title = titleMatch ? titleMatch[1].trim() : "Field Guide";
  const subtitle = subMatch ? subMatch[1].trim() : "";
  const attribution = attrMatch ? attrMatch[1].trim() : "";
  // body = everything after the first horizontal rule that follows the metadata block
  const parts = md.split(/\n---\n/);
  const body = parts.slice(1).join("\n---\n").trim();
  return { title, subtitle, attribution, body };
}

function renderArticleBody(bodyMd) {
  const renderer = new marked.Renderer();
  renderer.image = ({ href, text }) => {
    const file = href.split("/").pop();
    const dims = file.match(/-(\d+)x(\d+)\./);
    const size = dims ? ` width="${dims[1]}" height="${dims[2]}"` : "";
    return `<figure><img src="/assets/${file}" alt="${text || ""}"${size} loading="lazy" decoding="async" /></figure>`;
  };
  renderer.link = ({ href, title, text }) => {
    const ext = /^https?:/i.test(href);
    const attrs = ext ? ' rel="noopener"' : "";
    const t = title ? ` title="${title}"` : "";
    return `<a href="${href}"${t}${attrs}>${text}</a>`;
  };
  let html = marked.parse(bodyMd, { renderer });
  // marked wraps a lone image in <p>…</p>; unwrap the figure back to block level
  html = html.replace(/<p>(\s*<figure>[\s\S]*?<\/figure>\s*)<\/p>/g, "$1");
  // fold the italic caption paragraph that follows a figure into a <figcaption>
  html = html.replace(
    /<\/figure>\s*<p><em>([\s\S]*?)<\/em><\/p>/g,
    "<figcaption>$1</figcaption></figure>",
  );
  return html;
}

function slidesStrip(slideFiles) {
  return slideFiles
    .map(
      (f, i) =>
        `<a href="/assets/deck-slides/${f}" target="_blank" rel="noopener" aria-label="Open slide ${i + 1} full size"><img src="/assets/deck-slides/${f}" alt="Field Guide deck, slide ${i + 1}" loading="lazy" /></a>`,
    )
    .join("\n");
}

function fieldGuide({ title, subtitle, attribution, bodyHtml }, slideFiles) {
  const body = `
<article class="article">
  <div class="wrap">
    <div class="article-head">
      <span class="eyebrow">Growth Cartography · The Thesis</span>
      <h1>${title}</h1>
      <p class="sub">${subtitle}</p>
      <p class="byline">${attribution}</p>
    </div>
    <div class="article-cover">
      <img src="/assets/li-article-header-1200x627.png" alt="False Dawn Industries — Build the machine, not the ad. Aggregated, Decentralized, Autonomous." width="1200" height="627" />
    </div>
    <div class="prose">
      ${bodyHtml}
    </div>
  </div>
</article>

<section class="deck section" id="deck">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The launch deck</span>
      <h2>The CMO's Field Guide to System &amp; Cohort Dynamics</h2>
      <p>The full 13-slide deck, built on the reusable FDI slide system. View it inline, download the PDF, or browse the slides.</p>
    </div>
    <div class="deck-frame">
      <iframe src="/assets/fdi-field-guide-deck.pdf#view=FitH" title="FDI Field Guide deck (PDF)" loading="lazy"></iframe>
    </div>
    <div class="deck-actions">
      <a class="btn btn-primary" href="/assets/fdi-field-guide-deck.pdf" download>Download the deck (PDF) <span class="arrow">↓</span></a>
      <a class="btn btn-ghost" href="/assets/fdi-field-guide-launch-bundle.zip" download>Download the full launch bundle</a>
    </div>
    <div class="slides-strip">
      ${slidesStrip(slideFiles)}
    </div>
  </div>
</section>`;
  return page({
    title: "Build the Machine, Not the Ad | FDI Field Guide",
    description:
      "The FDI thesis on owned marketing systems for aggregated, decentralized, and autonomous markets — with the launch deck, visuals, and working-code proof.",
    active: "field-guide",
    body,
    canonical: "https://falsedawn.industries/field-guide",
  });
}

/* ---------------- SKILLFOUNDRY ---------------- */
function skillfoundry() {
  const gate = (n, name, role, desc, outLbl, outVal) => `
    <article class="gate">
      <span class="gnum">Gate ${n}</span>
      <h3>${name}</h3>
      <span class="role">${role}</span>
      <p>${desc}</p>
      <div class="out"><div class="lbl">${outLbl}</div><div class="val">${outVal}</div></div>
    </article>`;

  const tier = (name, title, model, price, feats, mid) => `
    <article class="tier${mid ? " mid" : ""}">
      ${mid ? '<span class="pill">Most popular</span>' : ""}
      <span class="tname">${name}</span>
      <h3>${title}</h3>
      <div class="tprice">
        ${price.anchor ? `<span class="tprice-anchor">${price.anchor}</span>` : ""}
        <span class="tprice-amt">${price.amount}</span>
        ${price.unit ? `<span class="tprice-unit">${price.unit}</span>` : ""}
      </div>
      ${price.note ? `<p class="tprice-note">${price.note}</p>` : ""}
      <p class="model">${model}</p>
      <ul>${feats.map((f) => `<li>${f}</li>`).join("")}</ul>
      <div class="tier-foot"><a class="btn ${mid ? "btn-primary" : "btn-ghost"}" href="#waitlist">Join the waitlist</a></div>
    </article>`;

  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">A False Dawn Industries product</span>
      <h1>Skillfoundry: <em>strategy as code</em>.</h1>
      <p class="lede">Modern comms teams have automated execution but lost strategic oversight. Skillfoundry is an agnostic strategic firewall — it routes any content asset through three opinionated gates before it ships, so automated output actually drives enterprise value.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#waitlist">Join the waitlist <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="#gates">See the three gates</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="section" id="gates">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The Signal-to-Value framework</span>
      <h2>Three gates every asset has to earn.</h2>
      <p>Skillfoundry evaluates content across three opinionated filters. Each returns the optimized asset plus a structured audit you can defend to the C-suite.</p>
    </div>
    <div class="grid cols-3">
      ${gate(
        1,
        "Market-Deficit Analyzer",
        "The Relevance Filter",
        "Filters raw text through a Jobs-to-be-Done lens, stripping hollow impression-farming hooks and forcing the asset to solve a specific functional, emotional, or social problem for a defined audience — not generic industry noise.",
        "Returns",
        "Relevance Score",
      )}
      ${gate(
        2,
        "Enterprise Valuation Gate",
        "The Performance Filter",
        "Translates soft PR metrics into C-suite KPIs and enforces a risk-constraint architecture. It audits the narrative to claim undisputed category authority and grounds every claim in measurable enterprise value drivers.",
        "Returns",
        "Performance Delta Log",
      )}
      ${gate(
        3,
        "Adversarial Defense Matrix",
        "The Algorithmic-Signal Filter",
        "A distribution defense against programmatic AI noise: it strips LLM stylistic footprints, injects high-density human signal, and structures AEO/GEO metadata so AI search engines cite the brand as a definitive source.",
        "Returns",
        "Signal &amp; Optimization Audit",
      )}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="architecture">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Built to the Anthropic standard</span>
      <h2>Modular by design. Native to your workflow.</h2>
      <p>Skillfoundry ships as an open-standard knowledge-work plugin, so it drops into MCP-compatible clients, terminals, and CMS platforms with no glue code.</p>
    </div>
    <div class="arch">
      <div class="mod"><code>skills/</code><h4>Skills</h4><p>Markdown files encoding the prompt logic and reasoning for the Market-Deficit, Enterprise Valuation, and Adversarial Defense gates.</p></div>
      <div class="mod"><code>commands/</code><h4>Commands</h4><p>Slash commands like <code>/skillfoundry:strategic-audit</code> chain the three gates, plus one command per gate to route local files straight from your terminal.</p></div>
      <div class="mod"><code>.mcp.json</code><h4>Connectors</h4><p>A connector definition that loads the plugin natively into MCP-compatible clients, existing workflows, CMS platforms, and design tools.</p></div>
    </div>
    <p class="flowline">Asset in &nbsp;→&nbsp; <b>Relevance</b> &nbsp;→&nbsp; <b>Performance</b> &nbsp;→&nbsp; <b>Algorithmic Signal</b> &nbsp;→&nbsp; deployable asset + three audits out</p>
    <p class="flowline" style="margin-top:14px;color:var(--muted);">Clean-room IP: all gate logic is original and self-contained — no third-party confidential or proprietary material.</p>
  </div>
</section>

<hr class="divider" />

<section class="section" id="pricing">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The pricing ladder</span>
      <h2>Own it, subscribe to it, or run it with us.</h2>
      <p>Three tiers, from a perpetual license to a strategic retainer. Prices are set — checkout arrives in the commercialization phase, so join the waitlist to lock launch pricing.</p>
    </div>
    <p class="price-anchor">One strategist hour runs <b>$150–$400</b>. Skillfoundry Tier 1 runs the same three-gate audit as many times as you like — for the price of lunch.</p>
    <div class="price-grid">
      ${tier(
        "Tier 1 · Perpetual",
        "Perpetual License",
        "One-time purchase of the frozen V1.0 plugin.",
        {
          amount: "$29",
          unit: "one-time",
          anchor: "$49",
          note: "Launch price <b>$19</b> for early adopters.",
        },
        [
          "Frozen V1.0 gate logic",
          "Runs locally in any MCP client",
          "Text-only asset auditing",
          "Consolidated markdown report",
          "Single operator",
          "<code>/sf:</code> slash commands",
        ],
        false,
      )}
      ${tier(
        "Tier 2 · Living Brain",
        "Continuous Updates",
        "Recurring subscription with over-the-wire updates.",
        {
          amount: "$49",
          unit: "/mo",
          note: "Founding rate <b>$39/mo</b> · <b>$490/yr</b> annual · Team <b>$149/mo</b>.",
        },
        [
          "Everything in Perpetual, plus:",
          "Continuous over-the-wire updates",
          "Latest multimodal models",
          "Machine-readable JSON output",
          "Higher rate limits",
          "Re-audit history",
          "Team seats",
        ],
        true,
      )}
      ${tier(
        "Tier 3 · Advisory",
        "Hybrid Retainer",
        "Subscription paired with a dedicated strategic retainer.",
        {
          amount: "$2,500",
          unit: "/mo",
          note: "Limited to ~5 clients · or a one-time <b>$5k–$10k</b> Foundry Sprint.",
        },
        [
          "Everything in Living Brain, plus:",
          "Dedicated strategist retainer",
          "Custom-tuned gates",
          "Hands-on onboarding",
          "Private async channel",
          "Quarterly strategy session",
        ],
        false,
      )}
    </div>
  </div>
</section>

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Request access</span>
      <h2>Get Skillfoundry the day it ships.</h2>
      <p>Drop your email to join the waitlist. We'll reach out with early access, pricing, and the worked example — no spam.</p>
      <form class="waitlist js-capture" data-source="skillfoundry" data-subject="Skillfoundry waitlist" data-success="You're on the list. We'll reach out with early access." data-mail-body="Please add me to the Skillfoundry waitlist." novalidate>
        <label class="sr-only" for="wl-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="wl-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
      <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    </div>
  </div>
</section>`;
  return page({
    title: "Skillfoundry — Strategy as Code | False Dawn Industries",
    description:
      "Skillfoundry is a strategic firewall that routes content through three Signal-to-Value gates — Relevance, Performance, and Algorithmic Signal — as an Anthropic-standard plugin. Join the waitlist.",
    active: "skillfoundry",
    body,
    canonical: "https://falsedawn.industries/skillfoundry",
  });
}

/* ---------------- TOP CALL ---------------- */
function topcall() {
  const construct = (n, thesis, name, desc, outLbl, outVal) => `
    <article class="gate">
      <span class="gnum">${thesis}</span>
      <h3>${name}</h3>
      <span class="role">Construct ${n}</span>
      <p>${desc}</p>
      <div class="out"><div class="lbl">${outLbl}</div><div class="val">${outVal}</div></div>
    </article>`;

  const tier = (name, title, model, feats, mid) => `
    <article class="tier${mid ? " mid" : ""}">
      ${mid ? '<span class="pill">Most popular</span>' : ""}
      <span class="tname">${name}</span>
      <h3>${title}</h3>
      <p class="model">${model}</p>
      <ul>${feats.map((f) => `<li>${f}</li>`).join("")}</ul>
      <div class="tier-foot"><a class="btn ${mid ? "btn-primary" : "btn-ghost"}" href="#waitlist">Request access</a></div>
    </article>`;

  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">A False Dawn Industries product</span>
      <h1>Top Call: <em>signal as code</em>.</h1>
      <p class="lede">Executive-intelligence monitoring is usually a disposable weekly brief — read once, then gone. Top Call is the owned radar: the sibling to Skillfoundry that turns every signal you grade into a provenance-stamped corpus, a knowledge graph, and a verifiable interface agents can query. Skillfoundry is strategy as code; Top Call is signal as code.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#prompt-pack">Get the free prompt-pack <span class="arrow">↓</span></a>
        <a class="btn btn-ghost" href="#constructs">See the owned system</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="section" id="prompt-pack">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Free · Field-Guide companion</span>
      <h2>Start with the prompt-pack. See the thesis — and its ceiling.</h2>
      <p>The Top Call prompt-pack is a complete, agent-ready system for tracking executive moves from free, public sources — a working demonstration of the FDI thesis. It also demonstrates its own ceiling: a prompt-pack is a recipe anyone can copy, and every run starts from a blank page. That gap is exactly what the owned system below is built to close.</p>
    </div>
    <div class="grid cols-2">
      <article class="card featured">
        <span class="tag">The lead magnet</span>
        <h3>Top Call Prompt-Pack</h3>
        <p>Copilot/agent instructions, an executive-moves model, a source-authority policy, a no-paid-ingestion playbook, a search-query library, and worked output templates. Drop your email and the download starts immediately — no spam.</p>
        <form class="waitlist js-capture" data-source="topcall-prompt-pack" data-subject="Top Call prompt-pack" data-download="/assets/top-call-prompt-pack.zip" data-mail-body="Please send me the Top Call prompt-pack." novalidate style="margin-top:22px;">
          <label class="sr-only" for="tc-lm-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
          ${HONEYPOT}
          <input type="email" id="tc-lm-email" name="email" placeholder="you@company.com" autocomplete="email" required />
          <button class="btn btn-primary" type="submit">Email me the pack <span class="arrow">↓</span></button>
        </form>
        <p class="form-msg" role="status" aria-live="polite"></p>
        <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer a direct link? <a href="/assets/top-call-prompt-pack.zip" download>Download the ZIP</a>.</p>
      </article>
      <article class="card">
        <span class="tag">The ceiling</span>
        <h3>Why a prompt-pack can't compound</h3>
        <p>A prompt-pack is stateless. It re-derives the same relationships every run, keeps no memory of which sources you trusted, and can be copied verbatim by anyone who receives it. It proves the method — but the method is not the moat.</p>
        <p style="margin-top:16px;">The non-replicable asset is the graded, provenance-stamped corpus that accumulates behind it — and the gated interface agents can trust. That is the owned system.</p>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="constructs">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The thesis, in code</span>
      <h2>Three constructs turn signal into an owned asset.</h2>
      <p>Top Call maps the FDI thesis directly onto working infrastructure. Every source you grade is written into a store that compounds instead of evaporating.</p>
    </div>
    <div class="grid cols-3">
      ${construct(
        1,
        "Aggregated",
        "A citable corpus",
        "Every source is classified into a source-authority tier (1A/1B/1C/2/3) at ingest and written into a persistent, provenance-stamped store. Re-running is cumulative: known moves gain provenance instead of duplicating.",
        "Becomes",
        "Owned, provenance-stamped store",
      )}
      ${construct(
        2,
        "Decentralized",
        "A knowledge graph",
        "Executives, companies, moves, categories, implications, and sources become a queryable node/edge graph. Relationships are preserved and traceable, never re-derived from scratch.",
        "Becomes",
        "Queryable node/edge graph",
      )}
      ${construct(
        3,
        "Autonomous",
        "A verifiable MCP interface",
        "The repeatable read skills are exposed as MCP tools built to the same Anthropic standard as Skillfoundry — so an agent can call them and get answers stamped with source, tier, and confidence.",
        "Becomes",
        "Answers stamped source · tier · confidence",
      )}
    </div>
    <p class="flowline" style="margin-top:40px;">Source in &nbsp;→&nbsp; <b>graded by tier</b> &nbsp;→&nbsp; <b>written to the corpus</b> &nbsp;→&nbsp; <b>linked in the graph</b> &nbsp;→&nbsp; provenance-stamped answer out</p>
    <p class="flowline" style="margin-top:14px;color:var(--muted);">The moat compounds: when a Tier 1 trade later corroborates a move first seen in a Tier 2 release, the move's confidence upgrades — automatically, permanently, and traceably.</p>
  </div>
</section>

<hr class="divider" />

<section class="section" id="architecture">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Built to the Anthropic standard</span>
      <h2>Same conventions as Skillfoundry. A radar an agent can trust.</h2>
      <p>Top Call ships as an open-standard plugin with the same modular layout as Skillfoundry — but where Skillfoundry composes prompts, Top Call reads a persistent corpus and returns real, provenance-stamped answers.</p>
    </div>
    <div class="arch">
      <div class="mod"><code>skills/</code><h4>Skills</h4><p>Markdown files encoding the corpus contract and the repeatable reads: exec-move scan, authority audit, and brief generation.</p></div>
      <div class="mod"><code>commands/</code><h4>Commands</h4><p>Slash commands like <code>/topcall:exec-move-scan</code>, <code>/topcall:authority-audit</code>, and <code>/topcall:brief</code> run the reads straight from your terminal.</p></div>
      <div class="mod"><code>.mcp.json</code><h4>Connectors</h4><p>An MCP server that loads natively into MCP-compatible clients and answers with source, tier, and confidence attached to every line.</p></div>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="pricing">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The pricing ladder</span>
      <h2>Own the radar, subscribe to it, or run it with us.</h2>
      <p>Three tiers, from a self-hosted engine to a managed intelligence retainer. Billing and license validation arrive in the commercialization phase — join the waitlist to lock early access.</p>
    </div>
    <div class="price-grid">
      ${tier(
        "Tier 1 · Engine",
        "Self-Hosted Corpus",
        "One-time license for the ingestion engine, graph, and MCP interface.",
        [
          "Corpus + knowledge-graph engine",
          "Source-authority tiering &amp; validator",
          "The four MCP read tools",
          "Run locally in any MCP client",
        ],
        false,
      )}
      ${tier(
        "Tier 2 · Feed",
        "Managed Corpus",
        "Recurring subscription with a continuously ingested, hosted corpus.",
        [
          "Everything in Engine",
          "Continuously ingested source feeds",
          "Hosted, always-current corpus",
          "Priority release channel",
        ],
        true,
      )}
      ${tier(
        "Tier 3 · Desk",
        "Intelligence Retainer",
        "Managed corpus paired with a dedicated analyst retainer.",
        [
          "Everything in Feed",
          "Dedicated analyst retainer",
          "Custom source &amp; tier calibration",
          "Direct line to FDI",
        ],
        false,
      )}
    </div>
  </div>
</section>

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Request access</span>
      <h2>Get the Top Call owned system the day it ships.</h2>
      <p>Drop your email to join the waitlist for the paid owned system. We'll reach out with early access, pricing, and a worked corpus — no spam.</p>
      <form class="waitlist js-capture" data-source="topcall" data-subject="Top Call waitlist" data-success="You're on the list. We'll reach out with early access." data-mail-body="Please add me to the Top Call waitlist." novalidate>
        <label class="sr-only" for="tc-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="tc-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
      <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    </div>
  </div>
</section>`;
  return page({
    title: "Top Call — Signal as Code, the Owned Radar | False Dawn Industries",
    description:
      "Top Call turns executive-intelligence monitoring into an owned asset: a provenance-stamped corpus, a knowledge graph, and a verifiable MCP interface. Get the free prompt-pack, then the owned system.",
    active: "topcall",
    body,
    canonical: "https://falsedawn.industries/topcall",
  });
}

/* ---------------- client JS ---------------- */
const SITE_JS = `(function () {
  var toggle = document.querySelector(".nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.getAttribute("data-open") === "true";
      links.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        links.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }
  var EMAIL_RE = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  var forms = document.querySelectorAll("form.js-capture");
  Array.prototype.forEach.call(forms, function (form) {
    var btn = form.querySelector("button[type=submit]");
    var input = form.querySelector("input[type=email]");
    var honeypot = form.querySelector("input[name=company]");
    var msg = form.parentNode.querySelector(".form-msg");
    var source = form.getAttribute("data-source") || "site";
    var subject = form.getAttribute("data-subject") || "FDI waitlist";
    var successText = form.getAttribute("data-success") || "You're on the list. We'll reach out with early access.";
    var dupText = form.getAttribute("data-duplicate") || "You're already on the list — we'll be in touch.";
    var download = form.getAttribute("data-download") || "";
    var mailBody = form.getAttribute("data-mail-body") || ("Please add me to the " + source + " list.");

    function setMsg(text, state) {
      if (!msg) return;
      msg.textContent = text;
      msg.classList.remove("is-ok", "is-error");
      if (state) msg.classList.add(state);
    }
    function mailtoFallback(email) {
      var s = encodeURIComponent(subject);
      var b = encodeURIComponent(mailBody + "\\n\\nEmail: " + email);
      window.location.href = "mailto:${CONTACT}?subject=" + s + "&body=" + b;
    }
    function triggerDownload() {
      if (!download) return;
      var a = document.createElement("a");
      a.href = download;
      a.setAttribute("download", "");
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = ((input && input.value) || "").trim();
      if (!EMAIL_RE.test(email)) { setMsg("Please enter a valid email address.", "is-error"); if (input) input.focus(); return; }
      if (btn) btn.disabled = true;
      setMsg(download ? "Preparing your download…" : "Adding you to the list…", null);
      fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, source: source, company: (honeypot && honeypot.value) || "" })
      }).then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      }).then(function (r) {
        if (r.status === 200 && r.data && r.data.ok) {
          form.reset();
          if (download) {
            setMsg("Thanks — your download is starting. Check your downloads folder.", "is-ok");
            triggerDownload();
          } else {
            setMsg(r.data.duplicate ? dupText : successText, "is-ok");
          }
        } else if (r.status === 429) {
          setMsg((r.data && r.data.message) || "Too many attempts. Please try again later.", "is-error");
        } else if (r.status === 422) {
          setMsg((r.data && r.data.message) || "Please enter a valid email address.", "is-error");
          if (input) input.focus();
        } else {
          setMsg("Something went wrong — opening your email app instead.", "is-error");
          mailtoFallback(email);
        }
      }).catch(function () {
        setMsg("Couldn't reach the server — opening your email app instead.", "is-error");
        mailtoFallback(email);
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    });
  });
})();`;

/* ---------------- build ---------------- */
function copyAssets() {
  // fonts
  const fontFiles = fs.readdirSync(FONTS).filter((f) => f.endsWith("-latin.woff2"));
  for (const f of fontFiles) copy(path.join(FONTS, f), path.join(DIST, "fonts", f));

  // launch images + deck
  const assetFiles = [
    "li-article-header-1200x627.png",
    "viz-identity-bridge-1200x620.png",
    "viz-two-builds-1200x700.png",
    "viz-three-markets-1200x680.png",
    "fdi-field-guide-deck.pdf",
    "fdi-field-guide-launch-bundle.zip",
    "top-call-prompt-pack.zip",
  ];
  for (const f of assetFiles) {
    const from = path.join(EXPORTS, f);
    if (fs.existsSync(from)) copy(from, path.join(DIST, "assets", f));
  }

  // deck slides
  const slidesDir = path.join(EXPORTS, "deck-slides");
  const slideFiles = fs
    .readdirSync(slidesDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  for (const f of slideFiles)
    copy(path.join(slidesDir, f), path.join(DIST, "assets", "deck-slides", f));

  // static: css, js, favicon
  copy(path.join(SRC, "site.css"), path.join(DIST, "site.css"));
  fs.writeFileSync(path.join(DIST, "site.js"), SITE_JS);
  const favicon = path.join(ROOT, "artifacts", "mockup-sandbox", "public", "favicon.svg");
  if (fs.existsSync(favicon)) copy(favicon, path.join(DIST, "favicon.svg"));

  return slideFiles;
}

function main() {
  rm(DIST);
  mkdir(DIST);
  const slideFiles = copyAssets();

  const md = fs.readFileSync(
    path.join(EXPORTS, "linkedin-thesis-article.md"),
    "utf8",
  );
  const parsed = parseArticle(md);
  const bodyHtml = renderArticleBody(parsed.body);

  fs.writeFileSync(path.join(DIST, "index.html"), home());
  fs.writeFileSync(
    path.join(DIST, "field-guide.html"),
    fieldGuide({ ...parsed, bodyHtml }, slideFiles),
  );
  fs.writeFileSync(path.join(DIST, "skillfoundry.html"), skillfoundry());
  fs.writeFileSync(path.join(DIST, "topcall.html"), topcall());

  console.log(
    `[build] wrote 4 pages, ${slideFiles.length} slides, assets → ${path.relative(ROOT, DIST)}`,
  );
}

main();
