import { marked } from "marked";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
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
const GITHUB_USER = "https://github.com/jratlee";
const LINKEDIN_USER = "https://www.linkedin.com/in/jratlee";
const CONTACT = "hello@falsedawn.industries";
/* SkillFoundry Stripe checkout is not live yet: while false, the tier CTAs
   route to the waitlist instead of the checkout flow. Flip to true once the
   purchase flow is proven in Stripe (see skillfoundry/STRIPE_SETUP.md). */
const CHECKOUT_LIVE = false;
/* MarCom Architecture Kit Stripe checkout: same pattern. While false, all kit
   tier CTAs stay waitlist links. Flip to true once the kit purchase flow is
   proven in Stripe (see exports/marcom-kit/STRIPE_SETUP.md). */
const KIT_CHECKOUT_LIVE = false;
/* Davos Decision Kit commerce demo: while true, an internal, noindex demo page
   is emitted at /davos-kit-demo (never linked from public nav) so the checkout
   flow can be screen-shared with a client. The buy button degrades to the
   page's own waitlist form until Stripe secrets are set. */
const DAVOS_DEMO = true;
const SITE_URL = "https://falsedawn.industries";
const MCP_URL = "https://modelcontextprotocol.io";
const AS_OF = "2026";

/* Primary sources verified for the Field Guide launch (see
   exports/field-guide-launch/citations-and-originality.md). Reused inline so
   headline claims carry a checkable citation. */
const CITE = {
  adspend:
    "https://www.warc.com/en/article/warc-global-ad-forecasts-upgraded-but-growth-concentrated-within-big-tech-9ed8089870e64fbe84b6bf2b1f8d6442",
  attention: "https://www.dentsu.com/us/en/attention-economy",
  belief: "https://www.ynharari.com/book/sapiens-2/",
};

/* Small superscript source link rendered after a factual claim. */
const cite = (href, label) =>
  `<a class="cite" href="${href}" target="_blank" rel="noopener" aria-label="Source: ${label}"><sup>[source]</sup></a>`;

/* honeypot: a hidden field bots fill but humans never see. Off-screen, not
   display:none (some bots skip hidden inputs), with autocomplete disabled and
   aria-hidden/tabindex so it's invisible to real users and assistive tech. */
const HONEYPOT = `<div aria-hidden="true" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;"><label>Company<input type="text" name="company" tabindex="-1" autocomplete="off" /></label></div>`;

function nav(active) {
  const link = (href, label, id) =>
    `<a href="${href}"${active === id ? ' aria-current="page"' : ""}>${label}</a>`;
  return `<header class="nav">
  <div class="wrap nav-inner">
    <a href="/" aria-label="False Dawn Industries home">${lockup()}</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation">Menu</button>
    <nav class="nav-links" id="nav-links">
      ${link("/marcom-kit", "MarCom Kit", "marcom-kit")}
      ${link("/skillfoundry", "SkillFoundry", "skillfoundry")}
      ${link("/field-guide", "Field Guide", "field-guide")}
      ${link("/#about", "About", "about")}
      <a class="btn btn-primary" href="/marcom-kit#waitlist">Join the waitlist</a>
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
        <p class="blurb">Owned marketing systems for aggregated, decentralized, and autonomous markets.</p>
      </div>
      <div>
        <h5>Explore</h5>
        <ul>
          <li><a href="/marcom-kit">MarCom Architecture Kit</a></li>
          <li><a href="/skillfoundry">SkillFoundry</a></li>
          <li><a href="/field-guide">Field Guide</a></li>
          <li><a href="/series">The Series</a></li>
          <li><a href="/#about">About</a></li>
        </ul>
      </div>
      <div>
        <h5>Connect</h5>
        <ul>
          <li><a href="${GITHUB}" rel="noopener">GitHub ↗</a></li>
          <li><a href="mailto:${CONTACT}">${CONTACT}</a></li>
          <li><a href="/marcom-kit#waitlist">Join the waitlist</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-base">
      <span>© 2026 False Dawn Industries</span>
      <span>Growth Cartography</span>
    </div>
  </div>
</footer>`;
}

function page({ title, description, active, body, canonical, jsonLd, noindex }) {
  const ld = (Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [])
    .map(
      (obj) =>
        `<script type="application/ld+json">${JSON.stringify(obj)}</script>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
${noindex ? '<meta name="robots" content="noindex, nofollow" />\n' : ""}<meta name="description" content="${description}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="/assets/li-article-header-1200x627.png" />
<meta name="twitter:card" content="summary_large_image" />
${canonical ? `<link rel="canonical" href="${canonical}" />` : ""}
${ld}
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

/* ---------------- structured data (JSON-LD) ---------------- */
const orgJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "False Dawn Industries",
  alternateName: "FDI",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/favicon.svg`,
  email: CONTACT,
  description:
    "False Dawn Industries builds owned marketing systems for aggregated, decentralized, and autonomous markets: a persistent identity and corpus you can prove.",
  sameAs: [GITHUB, GITHUB_USER],
});

const productJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SkillFoundry",
  applicationCategory: "BusinessApplication",
  operatingSystem: "MCP-compatible clients (cross-platform)",
  url: `${SITE_URL}/skillfoundry`,
  description:
    "SkillFoundry is a strategic firewall that routes any content asset through three Signal-to-Value gates (Relevance, Performance, and Algorithmic Signal), delivered as a plugin built on the open Model Context Protocol (MCP).",
  publisher: { "@type": "Organization", name: "False Dawn Industries", url: `${SITE_URL}/` },
  offers: {
    "@type": "Offer",
    price: "29.00",
    priceCurrency: "USD",
    description: "Perpetual License (Tier 1), one-time.",
  },
});

const faqJsonLd = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

const articleJsonLd = ({ headline, description }) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline,
  description,
  image: `${SITE_URL}/assets/li-article-header-1200x627.png`,
  author: { "@type": "Organization", name: "False Dawn Industries", url: `${SITE_URL}/` },
  publisher: {
    "@type": "Organization",
    name: "False Dawn Industries",
    logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
  },
  datePublished: "2026-07-01",
  dateModified: `${AS_OF}-07-01`,
  mainEntityOfPage: `${SITE_URL}/field-guide`,
});

/* ---------------- HOME ---------------- */
function home() {
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">Growth Cartography</span>
      <h1>Build the machine, <em>not the ad</em>.</h1>
      <p class="lede">The cost of making content just fell to zero. That is not the opportunity, it is the emergency. When reach is commoditized and platforms are black boxes, the only durable marketing assets are the ones you own and can prove.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/marcom-kit">Explore the MarCom Kit <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="/field-guide">Read the Field Guide</a>
      </div>
      <div class="hero-tags"><a href="/aggregated"><b>Aggregated</b></a><a href="/decentralized"><b>Decentralized</b></a><a href="/autonomous"><b>Autonomous</b></a></div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="statband" aria-label="The paradox funding modern marketing">
  <div class="wrap">
    <div class="stat"><div class="k"><span class="amber">$1.3T</span></div><div class="l">what the world will spend on advertising in 2026 ${cite(CITE.adspend, "WARC global ad forecast, Dec 2025")}</div></div>
    <div class="stat"><div class="k">2.5s</div><div class="l">active attention the average digital ad actually earns ${cite(CITE.attention, "Dentsu Attention Economy / Lumen Research")}</div></div>
    <div class="stat"><div class="k">70,000<span class="amber">yrs</span></div><div class="l">humans have coordinated around shared belief, and identity is still the bridge ${cite(CITE.belief, "Yuval Noah Harari, Sapiens")}</div></div>
  </div>
</section>

<section class="section" id="products">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The FDI Operating System</span>
      <h2>Tools and field guides for owned marketing systems.</h2>
      <p>False Dawn Industries maps the shift to aggregated, decentralized, and autonomous markets, then ships the working systems that let you own your place in them.</p>
    </div>
    <div class="grid cols-2">
      <article class="card featured">
        <span class="pill">Flagship · Structure as Code</span>
        <h3>The MarCom Architecture Kit</h3>
        <p>The blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system, shipped as a working kit instead of a slide deck. Structure as code.</p>
        <div class="card-foot"><a class="link-arrow" href="/marcom-kit">See the kit <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">Product · Strategy as Code</span>
        <h3>SkillFoundry</h3>
        <p>The enforcement engine inside the kit: a strategic firewall that routes any asset through three Signal-to-Value gates (Relevance, Performance, and Algorithmic Signal) as a plugin built on the open Model Context Protocol (MCP). It is how the kit's Riverbank rules run on every asset, every day.</p>
        <div class="card-foot"><a class="link-arrow" href="/skillfoundry">See how it works <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">Field Guide 001</span>
        <h3>The CMO's Field Guide</h3>
        <p>System and cohort dynamics: why every cohort decays on day one, why last-click is gameable, and why identity is the last durable infrastructure. The article, visuals, and deck, in one place.</p>
        <div class="card-foot"><a class="link-arrow" href="/field-guide">Read the guide <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">The series</span>
        <h3>Aggregated · Decentralized · Autonomous</h3>
        <p>Three more field guides map the market structures reshaping discovery, knowledge, and machine-to-machine commerce, each grounded in real, working code.</p>
        <div class="card-foot"><a class="link-arrow" href="/series">See the series <span class="arrow">→</span></a></div>
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
      <p>Two working builds show what owned systems look like in practice, the same trust architecture that runs through everything FDI makes.</p>
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
        <p>A Hybrid GraphRAG system that turns thousands of scattered legal XML files into one citable knowledge graph, answering with both meaning and structure, section numbers attached, exposed through an MCP server other agents can query directly.</p>
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
      <p>False Dawn Industries is building the thesis that when reach is commoditized and platforms are opaque, persistent identity, legible to machines, portable across communities, and verifiable by agents, becomes the ultimate infrastructure.</p>
    </div>
    <div class="social-badges">
      <a class="social-badge" href="${LINKEDIN_USER}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
        LinkedIn
      </a>
      <a class="social-badge" href="${GITHUB_USER}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.25 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"/></svg>
        GitHub
      </a>
    </div>
    <div class="hero-cta">
      <a class="btn btn-primary" href="/marcom-kit#waitlist">Join the waitlist <span class="arrow">→</span></a>
      <a class="btn btn-ghost" href="mailto:${CONTACT}">Get in touch</a>
    </div>
  </div>
</section>`;
  return page({
    title: "False Dawn Industries | Owned Marketing Systems for the AI Age",
    description:
      "Reach is commoditized and ad platforms are black boxes. FDI builds owned marketing systems: a persistent identity and corpus you can prove. Read the Field Guide and explore SkillFoundry.",
    active: "home",
    jsonLd: orgJsonLd(),
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
      <img src="/assets/li-article-header-1200x627.png" alt="False Dawn Industries: Build the machine, not the ad. Aggregated, Decentralized, Autonomous." width="1200" height="627" />
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
    </div>
    <div class="slides-strip">
      ${slidesStrip(slideFiles)}
    </div>
  </div>
</section>`;
  const fgDescription =
    "The FDI thesis on owned marketing systems for aggregated, decentralized, and autonomous markets, with the launch deck, visuals, and working-code proof.";
  return page({
    title: "Build the Machine, Not the Ad | FDI Field Guide",
    description: fgDescription,
    active: "field-guide",
    jsonLd: articleJsonLd({
      headline: "Build the Machine, Not the Ad",
      description: fgDescription,
    }),
    body,
    canonical: `${SITE_URL}/field-guide`,
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

  const tier = (name, title, model, price, feats, mid, cta) => {
    const btnClass = mid ? "btn-primary" : "btn-ghost";
    const foot = cta && cta.tier && CHECKOUT_LIVE
      ? `<button type="button" class="btn ${btnClass} js-buy" data-tier="${cta.tier}" data-fallback="#waitlist">${cta.label} <span class="arrow">→</span></button>
         <p class="form-msg js-buy-msg" role="status" aria-live="polite"></p>`
      : `<a class="btn ${btnClass}" href="#waitlist">Join the waitlist <span class="arrow">→</span></a>`;
    return `
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
      <div class="tier-foot">${foot}</div>
    </article>`;
  };

  const faqs = [
    {
      q: "What is SkillFoundry?",
      a: "SkillFoundry is a strategic firewall for content: a plugin, built on the open Model Context Protocol (MCP), that routes any asset through three Signal-to-Value gates (Relevance, Performance, and Algorithmic Signal) and returns the optimized asset plus a structured audit. It is built by False Dawn Industries.",
    },
    {
      q: "How does SkillFoundry work?",
      a: "You point an MCP-compatible client at the plugin (or load its .mcp.json connector) and run a slash command such as /skillfoundry:strategic-audit on pasted text or a file. The asset passes through the Relevance, Performance, and Algorithmic Signal gates and comes back with the optimized asset and three audits.",
    },
    {
      q: "Is SkillFoundry affiliated with Anthropic?",
      a: "No. SkillFoundry is built on the Model Context Protocol, an open standard documented at modelcontextprotocol.io. It is not affiliated with or endorsed by Anthropic.",
    },
    {
      q: "How much does SkillFoundry cost?",
      a: "There are three tiers: a Perpetual License (Tier 1) from $29 one-time, Continuous Updates (Tier 2) from $49 per month, and a Hybrid Retainer (Tier 3) from $2,500 per month. Launch pricing is available to waitlist members.",
    },
  ];
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">A False Dawn Industries product · As of ${AS_OF}</span>
      <h1>SkillFoundry: <em>strategy as code</em>.</h1>
      <p class="lede">Modern comms teams have automated execution but lost strategic oversight. SkillFoundry is an agnostic strategic firewall: it routes any content asset through three opinionated gates before it ships, so automated output actually drives enterprise value.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#waitlist">Join the waitlist <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="#gates">See the three gates</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="section" id="what">
  <div class="wrap">
    <p class="definition"><b>SkillFoundry is a strategic firewall for content.</b> It is a plugin, built on the open Model Context Protocol (MCP), that routes any asset (pasted text or a file) through three Signal-to-Value gates, Relevance, Performance, and Algorithmic Signal, and returns the optimized asset plus a structured audit you can defend to the C-suite. Built by False Dawn Industries. As of ${AS_OF}.</p>
  </div>
</section>

<section class="section" id="gates">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The Signal-to-Value framework</span>
      <h2>Three gates every asset has to earn.</h2>
      <p>SkillFoundry evaluates content across three opinionated filters. Each returns the optimized asset plus a structured audit you can defend to the C-suite.</p>
    </div>
    <div class="grid cols-3">
      ${gate(
        1,
        "Market-Deficit Analyzer",
        "The Relevance Filter",
        "Filters raw text through a Jobs-to-be-Done lens, stripping hollow impression-farming hooks and forcing the asset to solve a specific functional, emotional, or social problem for a defined audience, not generic industry noise.",
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
        "Signal and Optimization Audit",
      )}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="architecture">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Built on the open Model Context Protocol</span>
      <h2>Modular by design. Native to your workflow.</h2>
      <p>SkillFoundry ships as a plugin built on the <a href="${MCP_URL}" target="_blank" rel="noopener">open Model Context Protocol (MCP)</a>, so it drops into MCP-compatible clients, terminals, and CMS platforms with no glue code.</p>
    </div>
    <div class="arch">
      <div class="mod"><code>skills/</code><h4>Skills</h4><p>Markdown files encoding the prompt logic and reasoning for the Market-Deficit, Enterprise Valuation, and Adversarial Defense gates.</p></div>
      <div class="mod"><code>commands/</code><h4>Commands</h4><p>Slash commands like <code>/skillfoundry:strategic-audit</code> chain the three gates, plus one command per gate to route local files straight from your terminal.</p></div>
      <div class="mod"><code>.mcp.json</code><h4>Connectors</h4><p>A connector definition that loads the plugin natively into MCP-compatible clients, existing workflows, CMS platforms, and design tools.</p></div>
    </div>
    <p class="flowline">Asset in &nbsp;→&nbsp; <b>Relevance</b> &nbsp;→&nbsp; <b>Performance</b> &nbsp;→&nbsp; <b>Algorithmic Signal</b> &nbsp;→&nbsp; deployable asset + three audits out</p>
    <p class="flowline" style="margin-top:14px;color:var(--muted);">Every gate is built from publicly documented strategy frameworks, cited in the plugin. Model Context Protocol is an open standard; this product is not affiliated with or endorsed by Anthropic.</p>
  </div>
</section>

<hr class="divider" />

<section class="section" id="commands">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">How to run it</span>
      <h2>Four commands. One firewall.</h2>
      <p>Point any MCP-compatible client (Claude Code, or another client via the <code>.mcp.json</code> connector) at the plugin and route any asset (pasted text or a path to a <code>.md</code>/<code>.txt</code> file) through the gates. No backend, no glue code.</p>
    </div>
    <div class="cmds">
      <div class="cmd cmd-hero">
        <div class="cmd-hd"><code class="cmd-name">/skillfoundry:strategic-audit</code><span class="cmd-tag">Hero</span></div>
        <p>Runs the asset through all three gates in order and returns one consolidated strategic audit report, scored, ranked, with line-level rewrites you can defend to the C-suite.</p>
      </div>
      <div class="cmd">
        <div class="cmd-hd"><code class="cmd-name">/skillfoundry:relevance-gate</code></div>
        <p>Runs only Gate 1, the Market-Deficit Analyzer, scoring the asset through a Jobs-to-be-Done lens and returning its Relevance GateResult.</p>
      </div>
      <div class="cmd">
        <div class="cmd-hd"><code class="cmd-name">/skillfoundry:performance-gate</code></div>
        <p>Runs only Gate 2, the Enterprise Valuation Gate, auditing brand equity and competitive positioning and returning its Performance GateResult.</p>
      </div>
      <div class="cmd">
        <div class="cmd-hd"><code class="cmd-name">/skillfoundry:signal-gate</code></div>
        <p>Runs only Gate 3, the Adversarial Defense Matrix, checking GEO/AEO and human-signal density and returning its Algorithmic-Signal GateResult.</p>
      </div>
    </div>
    <p class="cmd-eg">Example &nbsp;→&nbsp; <code>/skillfoundry:strategic-audit ./drafts/launch-post.md</code></p>
  </div>
</section>

<hr class="divider" />

<section class="section" id="pricing">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The pricing ladder</span>
      <h2>Own it, subscribe to it, or run it with us.</h2>
      <p>Three tiers, from a perpetual license to a strategic retainer. Prices are set, and checkout arrives in the commercialization phase, so join the waitlist to lock launch pricing.</p>
    </div>
    <p class="price-anchor">One strategist hour runs <b>$150 to $400</b>. SkillFoundry Tier 1 runs the same three-gate audit as many times as you like, for the price of lunch.</p>
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
        { tier: "tier1", label: "Buy now" },
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
        { tier: "tier2", label: "Subscribe" },
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
        { tier: "tier3", label: "Start retainer" },
      )}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="faq">
  <div class="wrap">
    <div class="faq">
      ${faqs
        .map(
          (f) => `<details class="faq-item"><summary>${f.q}</summary><p>${f.a}</p></details>`,
        )
        .join("\n      ")}
    </div>
  </div>
</section>

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Join the waitlist</span>
      <h2>Get SkillFoundry the day it ships.</h2>
      <p>Drop your email to join the waitlist. We'll reach out with early access, pricing, and the worked example. No spam.</p>
      <form class="waitlist js-capture" data-source="skillfoundry" data-subject="SkillFoundry waitlist" data-success="Almost there. Check your inbox and click the confirmation link to join the waitlist." data-mail-body="Please add me to the SkillFoundry waitlist." novalidate>
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
    title: "SkillFoundry: Strategy as Code | False Dawn Industries",
    description:
      "SkillFoundry is a strategic firewall that routes content through three Signal-to-Value gates (Relevance, Performance, and Algorithmic Signal) as a plugin built on the open Model Context Protocol (MCP). Join the waitlist.",
    active: "skillfoundry",
    jsonLd: [productJsonLd(), faqJsonLd(faqs)],
    body,
    canonical: `${SITE_URL}/skillfoundry`,
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
      <span class="eyebrow">A False Dawn Industries product · As of ${AS_OF}</span>
      <h1>Top Call: <em>signal as code</em>.</h1>
      <p class="lede">Executive-intelligence monitoring is usually a disposable weekly brief, read once, then gone. Top Call is the owned radar: the sibling to SkillFoundry that turns every signal you grade into a provenance-stamped corpus, a knowledge graph, and a verifiable interface agents can query. SkillFoundry is strategy as code; Top Call is signal as code.</p>
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
      <h2>Start with the prompt-pack. See the thesis, and its ceiling.</h2>
      <p>The Top Call prompt-pack is a complete, agent-ready system for tracking executive moves from free, public sources: a working demonstration of the FDI thesis. It also demonstrates its own ceiling: a prompt-pack is a recipe anyone can copy, and every run starts from a blank page. That gap is exactly what the owned system below is built to close.</p>
    </div>
    <div class="grid cols-2">
      <article class="card featured">
        <span class="tag">The lead magnet</span>
        <h3>Top Call Prompt-Pack</h3>
        <p>Copilot/agent instructions, an executive-moves model, a source-authority policy, a no-paid-ingestion playbook, a search-query library, and worked output templates. Drop your email and the download starts immediately. No spam.</p>
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
        <p>A prompt-pack is stateless. It re-derives the same relationships every run, keeps no memory of which sources you trusted, and can be copied verbatim by anyone who receives it. It proves the method, but the method is not the moat.</p>
        <p style="margin-top:16px;">The non-replicable asset is the graded, provenance-stamped corpus that accumulates behind it, plus the gated interface agents can trust. That is the owned system.</p>
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
        "The repeatable read skills are exposed as MCP tools built on the same open Model Context Protocol (MCP) as SkillFoundry, so an agent can call them and get answers stamped with source, tier, and confidence.",
        "Becomes",
        "Answers stamped source · tier · confidence",
      )}
    </div>
    <p class="flowline" style="margin-top:40px;">Source in &nbsp;→&nbsp; <b>graded by tier</b> &nbsp;→&nbsp; <b>written to the corpus</b> &nbsp;→&nbsp; <b>linked in the graph</b> &nbsp;→&nbsp; provenance-stamped answer out</p>
    <p class="flowline" style="margin-top:14px;color:var(--muted);">The moat compounds: when a Tier 1 trade later corroborates a move first seen in a Tier 2 release, the move's confidence upgrades automatically, permanently, and traceably.</p>
  </div>
</section>

<hr class="divider" />

<section class="section" id="architecture">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Built on the open Model Context Protocol</span>
      <h2>Same conventions as SkillFoundry. A radar an agent can trust.</h2>
      <p>Top Call ships as a plugin built on the <a href="${MCP_URL}" target="_blank" rel="noopener">open Model Context Protocol (MCP)</a>, with the same modular layout as SkillFoundry. Where SkillFoundry composes prompts, Top Call reads a persistent corpus and returns real, provenance-stamped answers.</p>
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
      <p>Three tiers, from a self-hosted engine to a managed intelligence retainer. Prices are set, and checkout arrives in the commercialization phase, so join the waitlist to lock launch pricing.</p>
    </div>
    <p class="price-anchor">A managed competitive-intelligence subscription runs <b>$5,000 to $50,000 a year</b>. Top Call Engine is a one-time license that runs the same owned radar on your own machine, forever.</p>
    <div class="price-grid">
      ${tier(
        "Tier 1 · Engine",
        "Self-Hosted Corpus",
        "One-time license for the ingestion engine, graph, and MCP interface.",
        {
          amount: "$149",
          unit: "one-time",
          anchor: "$199",
          note: "Launch price <b>$99</b> for early adopters.",
        },
        [
          "Corpus + knowledge-graph engine",
          "Source-authority tiering &amp; validator",
          "The four MCP read tools",
          "Run locally in any MCP client",
          "Single operator",
        ],
        false,
      )}
      ${tier(
        "Tier 2 · Feed",
        "Managed Corpus",
        "Recurring subscription with a continuously ingested, hosted corpus.",
        {
          amount: "$99",
          unit: "/mo",
          note: "Founding rate <b>$79/mo</b> · <b>$990/yr</b> annual.",
        },
        [
          "Everything in Engine, plus:",
          "Continuously ingested source feeds",
          "Hosted, always-current corpus",
          "Priority release channel",
          "Team seats",
        ],
        true,
      )}
      ${tier(
        "Tier 3 · Desk",
        "Intelligence Retainer",
        "Managed corpus paired with a dedicated analyst retainer.",
        {
          amount: "$3,500",
          unit: "/mo",
          note: "Limited to ~5 clients · custom onboarding.",
        },
        [
          "Everything in Feed, plus:",
          "Dedicated analyst retainer",
          "Custom source &amp; tier calibration",
          "Direct line to FDI",
          "Quarterly intelligence review",
        ],
        false,
      )}
    </div>
  </div>
</section>

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Join the waitlist</span>
      <h2>Get the Top Call owned system the day it ships.</h2>
      <p>Drop your email to join the waitlist for the paid owned system. We'll reach out with early access, pricing, and a worked corpus. No spam.</p>
      <form class="waitlist js-capture" data-source="topcall" data-subject="Top Call waitlist" data-success="Almost there. Check your inbox and click the confirmation link to join the waitlist." data-mail-body="Please add me to the Top Call waitlist." novalidate>
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
    title: "Top Call: Signal as Code, the Owned Radar | False Dawn Industries",
    description:
      "Top Call turns executive-intelligence monitoring into an owned asset: a provenance-stamped corpus, a knowledge graph, and a verifiable MCP interface. Get the free prompt-pack, then the owned system.",
    active: "topcall",
    body,
    canonical: `${SITE_URL}/topcall`,
  });
}

/* ---------------- MARCOM ARCHITECTURE KIT ---------------- */
function marcomKit() {
  const kitJsonLd = () => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: "FDI Agentic MarCom Architecture Kit",
    url: `${SITE_URL}/marcom-kit`,
    description:
      "The FDI Agentic MarCom Architecture Kit is the blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system, shipped as a working kit of templates, calculators, and checklists.",
    brand: { "@type": "Organization", name: "False Dawn Industries", url: `${SITE_URL}/` },
    offers: {
      "@type": "Offer",
      price: "149.00",
      priceCurrency: "USD",
      description: "MarCom Foundation Playbook (Tier 1), one-time.",
    },
  });

  // Same CTA pattern as the SkillFoundry tiers: when kit checkout is live the
  // buttons start Stripe Checkout (with waitlist fallback via js-buy); until
  // then every CTA is a waitlist link. `ctas` is a list so a card can carry a
  // primary buy button plus secondary variants (annual, agency, sprint).
  const tier = (name, title, model, price, feats, mid, ctas) => {
    const btnClass = mid ? "btn-primary" : "btn-ghost";
    const foot =
      ctas && ctas.length && KIT_CHECKOUT_LIVE
        ? ctas
            .map(
              (c, i) =>
                `<button type="button" class="btn ${i === 0 ? btnClass : "btn-ghost"} js-buy" data-tier="${c.tier}" data-fallback="#waitlist">${c.label} <span class="arrow">→</span></button>`,
            )
            .join("\n         ") +
          `\n         <p class="form-msg js-buy-msg" role="status" aria-live="polite"></p>`
        : `<a class="btn ${btnClass}" href="#waitlist">Join the waitlist <span class="arrow">→</span></a>`;
    return `
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
      <div class="tier-foot">${foot}</div>
    </article>`;
  };

  const pillar = (n, name, role, desc, outLbl, outVal) => `
    <article class="gate">
      <span class="gnum">Pillar ${n}</span>
      <h3>${name}</h3>
      <span class="role">${role}</span>
      <p>${desc}</p>
      <div class="out"><div class="lbl">${outLbl}</div><div class="val">${outVal}</div></div>
    </article>`;

  const faqs = [
    {
      q: "What is the FDI Agentic MarCom Architecture Kit?",
      a: "The kit is the blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system, shipped as a working kit of templates, calculators, and checklists rather than a slide deck. It is built by False Dawn Industries.",
    },
    {
      q: "How is the kit different from hiring a consultancy?",
      a: "A consultancy sells you a deck and leaves. The kit is structure as code: editable blueprints, a scoring calculator, governance templates, and an audit checklist you run yourself, with SkillFoundry available as the running enforcement engine for the rules you set. Higher tiers add a fixed-scope sprint or a fractional architect retainer if you want hands-on help.",
    },
    {
      q: "How much does the MarCom Architecture Kit cost?",
      a: "Three tiers: the MarCom Foundation Playbook (Tier 1) from $149 one-time, the Living Architecture subscription (Tier 2) from $199 per month, and the Architecture Partner retainer (Tier 3) from $5,000 per month or a $10,000 fixed four-week sprint. A standalone Governance Risk Audit runs $1,500 to $2,500. Launch pricing is available to waitlist members.",
    },
    {
      q: "Is the kit legal or compliance advice?",
      a: "No. The kit provides organizational design frameworks, governance templates, and risk checklists as strategic guidance. It is not legal, compliance, or professional advice, and you should review regulated-industry decisions with your own counsel.",
    },
    {
      q: "What does the kit do with my data?",
      a: "The Tier 1 playbook is a set of documents and calculators you run entirely on your own machines; nothing is sent to FDI. Where a workflow touches an LLM backend, the kit's data-handling posture applies: you choose the model provider, your content is processed under your own accounts and keys, and FDI never stores or trains on your assets.",
    },
  ];

  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">The FDI flagship · As of ${AS_OF}</span>
      <h1>The MarCom Architecture Kit: <em>structure as code</em>.</h1>
      <p class="lede">AI did not just change marketing tools, it broke the marketing org chart. The kit is the blueprint for what replaces it: the Hourglass organization, a capability calculator that tells you what to use, compose, or build, and a governance Riverbank that keeps autonomous output inside the brand. Shipped as working documents, not a deck.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#starter-pack">Get the free starter pack <span class="arrow">↓</span></a>
        <a class="btn btn-ghost" href="#pillars">See what is inside</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="section" id="what">
  <div class="wrap">
    <p class="definition"><b>The FDI Agentic MarCom Architecture Kit is the blueprint for an AI-era marketing organization.</b> It packages the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system into editable templates, calculators, and checklists you run yourself, with SkillFoundry as the running enforcement engine for the rules you set. Built by False Dawn Industries. As of ${AS_OF}.</p>
  </div>
</section>

<section class="section" id="starter-pack">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Free · The starter pack</span>
      <h2>Start with the Use, Compose, Build starter.</h2>
      <p>The free FDI MarCom Starter Pack contains a working slice of the kit: the Use, Compose, Build starter calculator and a Riverbank starter template, so you can score one capability and write one governance rule before you spend a dollar.</p>
    </div>
    <div class="grid cols-2">
      <article class="card featured">
        <span class="tag">The lead magnet</span>
        <h3>FDI MarCom Starter Pack</h3>
        <p>The Use, Compose, Build starter calculator, a Riverbank starter governance template, and a read-me that maps both onto the full kit. Drop your email and the download starts immediately. No spam.</p>
        <form class="waitlist js-capture" data-source="marcom-kit-starter" data-subject="MarCom starter pack" data-download="/assets/fdi-marcom-starter-pack.zip" data-mail-body="Please send me the FDI MarCom starter pack." novalidate style="margin-top:22px;">
          <label class="sr-only" for="mk-lm-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
          ${HONEYPOT}
          <input type="email" id="mk-lm-email" name="email" placeholder="you@company.com" autocomplete="email" required />
          <button class="btn btn-primary" type="submit">Email me the pack <span class="arrow">↓</span></button>
        </form>
        <p class="form-msg" role="status" aria-live="polite"></p>
        <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer a direct link? <a href="/assets/fdi-marcom-starter-pack.zip" download>Download the ZIP</a>.</p>
      </article>
      <article class="card">
        <span class="tag">Why structure first</span>
        <h3>Tools do not fix a broken org chart</h3>
        <p>Most teams bolt AI tools onto a factory-era structure and get faster chaos. The bottleneck is not the model, it is the shape of the team, the make-or-buy logic, and the absence of guardrails that machines can actually enforce.</p>
        <p style="margin-top:16px;">The kit fixes the structure first: who sits where (Hourglass), what you build versus buy (Use, Compose, Build), and what may ship (the Riverbank). Then the tools compound instead of colliding.</p>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="pillars">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Inside the kit</span>
      <h2>Three pillars, one working playbook.</h2>
      <p>The Tier 1 MarCom Foundation Playbook ships all three pillars as editable documents plus the Audit to Kill checklist that turns them into a quarterly operating rhythm.</p>
    </div>
    <div class="grid cols-3">
      ${pillar(
        1,
        "The Hourglass Organization",
        "The org blueprint",
        "A staffing blueprint shaped like an hourglass: broad strategic direction on top, a narrow waist of human editors-in-chief, and a wide base of agentic execution. Includes role charters, reporting lines, and a migration path from the org you have today.",
        "Ships as",
        "Editable org blueprint + role charters",
      )}
      ${pillar(
        2,
        "Use, Compose, Build",
        "The capability calculator",
        "A scoring calculator that decides, per capability, whether you should use an off-the-shelf tool, compose existing pieces, or build owned infrastructure. Stops both over-buying SaaS and over-building vanity systems.",
        "Ships as",
        "Scoring calculator + decision log",
      )}
      ${pillar(
        3,
        "The Riverbank",
        "The governance system",
        "Governance templates that define the banks your autonomous output flows between: brand rules, escalation triggers, and kill criteria, written so both humans and agents can enforce them. SkillFoundry is the running enforcement engine for these rules.",
        "Ships as",
        "Governance templates + kill criteria",
      )}
    </div>
    <p class="flowline" style="margin-top:40px;">Structure &nbsp;→&nbsp; <b>Hourglass</b> &nbsp;→&nbsp; <b>Use, Compose, Build</b> &nbsp;→&nbsp; <b>Riverbank</b> &nbsp;→&nbsp; audited every quarter with Audit to Kill</p>
    <p class="flowline" style="margin-top:14px;color:var(--muted);">The kit provides strategic frameworks and templates. It is not legal, compliance, or professional advice; review regulated-industry decisions with your own counsel.</p>
  </div>
</section>

<hr class="divider" />

<section class="section" id="outcomes">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">What changes</span>
      <h2>Mapped from today to tomorrow.</h2>
      <p>Each pillar replaces a familiar failure mode with an owned, auditable structure.</p>
    </div>
    <div class="grid cols-3">
      <article class="card"><h3>Today: the pyramid</h3><p>Headcount stacked around manual production, AI bolted on at the edges, and a review process that cannot keep up with machine-speed output.</p></article>
      <article class="card"><h3>Tomorrow: the Hourglass</h3><p>Strategy on top, a small human waist of editors-in-chief with real kill authority, and agentic execution underneath, each layer with a written charter.</p></article>
      <article class="card"><h3>Every quarter: Audit to Kill</h3><p>A standing checklist that scores every capability, campaign, and tool against the Riverbank and retires what fails, so the structure stays lean instead of accreting.</p></article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="pricing">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The pricing ladder</span>
      <h2>Own the blueprint, subscribe to it, or build it with us.</h2>
      <p>Three tiers, from a one-time playbook to a fractional architecture partner. Prices are set, and checkout arrives in the commercialization phase, so join the waitlist to lock launch pricing.</p>
    </div>
    <p class="price-anchor">A boutique org-design engagement runs <b>$25,000 to $150,000</b>. The Foundation Playbook ships the same structural frameworks as editable working documents, for the price of a team lunch.</p>
    <div class="price-grid">
      ${tier(
        "Tier 1 · Playbook",
        "MarCom Foundation Playbook",
        "One-time purchase of the complete foundation playbook.",
        {
          amount: "$149",
          unit: "one-time",
          note: "Launch price <b>$99</b> for early adopters.",
        },
        [
          "Hourglass org blueprint + role charters",
          "Use, Compose, Build calculator",
          "Riverbank governance templates",
          "Audit to Kill checklist",
          "The Wedge Manifesto",
          "Yours forever, edit everything",
        ],
        false,
        [{ tier: "mk1", label: "Buy the playbook" }],
      )}
      ${tier(
        "Tier 2 · Living Architecture",
        "Continuous Updates",
        "Recurring subscription that keeps the blueprint current.",
        {
          amount: "$199",
          unit: "/mo",
          note: "Founding rate <b>$149/mo</b> · <b>$1,500/yr</b> annual · Agency Team <b>$399/mo</b> with white-label rights.",
        },
        [
          "Everything in the Playbook, plus:",
          "Quarterly framework updates",
          "New templates as the field moves",
          "Priority async Q&amp;A",
          "Team seats",
          "White-label rights on the Agency tier only",
        ],
        true,
        [
          { tier: "mk2", label: "Subscribe monthly" },
          { tier: "mk2-annual", label: "Go annual" },
          { tier: "mk2-agency", label: "Agency Team" },
        ],
      )}
      ${tier(
        "Tier 3 · Architecture Partner",
        "Fractional Architect",
        "A retainer or fixed sprint with FDI as your fractional MarCom architect.",
        {
          amount: "$5,000",
          unit: "/mo",
          note: "Limited to ~3 clients · or a one-time <b>$10,000</b> fixed four-week sprint.",
        },
        [
          "Everything in Living Architecture, plus:",
          "Hands-on Hourglass migration",
          "Custom Riverbank calibration",
          "Fixed four-week sprint option",
          "Direct line to FDI",
        ],
        false,
        [
          { tier: "mk3", label: "Start the retainer" },
          { tier: "mk-sprint", label: "Book the sprint" },
        ],
      )}
    </div>
    <div class="grid cols-2" style="margin-top:28px;">
      <article class="card">
        <span class="tag">The bridge offer</span>
        <h3>Governance Risk Audit · $1,500 to $2,500</h3>
        <p>A fixed-scope, standalone audit of your current AI content operation against the Riverbank framework: where autonomous output can drift off-brand, which approvals are missing, and a prioritized fix list. Credited toward Tier 3 if you upgrade within 90 days.</p>
        ${
          KIT_CHECKOUT_LIVE
            ? `<div class="card-foot"><button type="button" class="btn btn-ghost js-buy" data-tier="mk-audit" data-fallback="#waitlist">Buy the audit <span class="arrow">→</span></button><p class="form-msg js-buy-msg" role="status" aria-live="polite"></p></div>`
            : `<div class="card-foot"><a class="link-arrow" href="#waitlist">Ask about the audit <span class="arrow">→</span></a></div>`
        }
      </article>
      <article class="card">
        <span class="tag">The enforcement engine</span>
        <h3>Runs with SkillFoundry</h3>
        <p>The Riverbank defines the rules; <a href="/skillfoundry">SkillFoundry</a> enforces them at machine speed, routing every asset through the Relevance, Performance, and Algorithmic Signal gates before it ships. The kit works standalone, and compounds with the engine.</p>
        <div class="card-foot"><a class="link-arrow" href="/skillfoundry">See SkillFoundry <span class="arrow">→</span></a></div>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="faq">
  <div class="wrap">
    <div class="faq">
      ${faqs
        .map(
          (f) => `<details class="faq-item"><summary>${f.q}</summary><p>${f.a}</p></details>`,
        )
        .join("\n      ")}
    </div>
  </div>
</section>

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Join the waitlist</span>
      <h2>Get the MarCom Architecture Kit the day it ships.</h2>
      <p>Drop your email to join the waitlist. We'll reach out with early access, launch pricing, and the starter pack walkthrough. No spam.</p>
      <form class="waitlist js-capture" data-source="marcom-kit" data-subject="MarCom Kit waitlist" data-success="Almost there. Check your inbox and click the confirmation link to join the waitlist." data-mail-body="Please add me to the MarCom Architecture Kit waitlist." novalidate>
        <label class="sr-only" for="mk-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="mk-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
      <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    </div>
  </div>
</section>`;
  return page({
    title: "The MarCom Architecture Kit: Structure as Code | False Dawn Industries",
    description:
      "The FDI Agentic MarCom Architecture Kit is the blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build calculator, and the Riverbank governance system, shipped as a working kit. Get the free starter pack.",
    active: "marcom-kit",
    jsonLd: [kitJsonLd(), faqJsonLd(faqs)],
    body,
    canonical: `${SITE_URL}/marcom-kit`,
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
    var successText = form.getAttribute("data-success") || "Almost there. Check your inbox for a confirmation link to finish signing up.";
    var dupText = form.getAttribute("data-duplicate") || "You're already on the list. We'll be in touch.";
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
            setMsg("Thanks. Your download is starting. Check your downloads folder.", "is-ok");
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
          setMsg("Something went wrong. Opening your email app instead.", "is-error");
          mailtoFallback(email);
        }
      }).catch(function () {
        setMsg("Couldn't reach the server. Opening your email app instead.", "is-error");
        mailtoFallback(email);
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    });
  });

  // Buy buttons start Stripe Checkout for a tier. On any failure (checkout
  // not live yet, network error) fall back to the waitlist so intent is kept.
  var buys = document.querySelectorAll(".js-buy");
  Array.prototype.forEach.call(buys, function (buy) {
    var tier = buy.getAttribute("data-tier");
    var fallback = buy.getAttribute("data-fallback") || "#waitlist";
    var bmsg = buy.parentNode.querySelector(".js-buy-msg");
    function setBuyMsg(text, state) {
      if (!bmsg) return;
      bmsg.textContent = text;
      bmsg.classList.remove("is-ok", "is-error");
      if (state) bmsg.classList.add(state);
    }
    function toWaitlist() {
      var el = document.querySelector(fallback);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.location.hash = fallback;
    }
    buy.addEventListener("click", function () {
      buy.disabled = true;
      setBuyMsg("Opening secure checkout…", null);
      fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tier })
      }).then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      }).then(function (r) {
        if (r.status === 200 && r.data && r.data.url) {
          window.location.href = r.data.url;
          return;
        }
        buy.disabled = false;
        setBuyMsg((r.data && r.data.message) || "Checkout isn't live yet. Join the waitlist below.", "is-error");
        toWaitlist();
      }).catch(function () {
        buy.disabled = false;
        setBuyMsg("Couldn't reach checkout. Join the waitlist below.", "is-error");
        toWaitlist();
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

  // MarCom Kit free starter pack (lead magnet)
  const starterPack = path.join(ROOT, "exports", "marcom-kit", "fdi-marcom-starter-pack.zip");
  if (fs.existsSync(starterPack)) {
    copy(starterPack, path.join(DIST, "assets", "fdi-marcom-starter-pack.zip"));
  } else {
    console.warn("[build] fdi-marcom-starter-pack.zip not found, lead-magnet download will 404");
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

// Build the gated Skillfoundry plugin package. It lives OUTSIDE dist/ (which is
// fully public) so the only way to obtain it is a valid, active license key via
// GET /api/skillfoundry/download. Uses the system `zip` CLI; if it's missing we
// warn rather than fail the build (checkout/webhook still work; only the Tier 1
// download would 503 until the package exists).
function buildPluginZip() {
  const srcDir = path.join(ROOT, "skillfoundry");
  if (!fs.existsSync(srcDir)) {
    console.warn("[build] skillfoundry/ not found, skipping plugin package");
    return;
  }
  const outDir = path.join(__dirname, "private");
  const outZip = path.join(outDir, "skillfoundry-plugin.zip");
  mkdir(outDir);
  rm(outZip);
  try {
    execFileSync(
      "zip",
      [
        "-r",
        "-q",
        outZip,
        "skillfoundry",
        "-x",
        "skillfoundry/examples/*",
        "-x",
        "*/node_modules/*",
        "-x",
        "*/.DS_Store",
      ],
      { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] },
    );
    const kb = Math.round(fs.statSync(outZip).size / 1024);
    console.log(`[build] plugin package → ${path.relative(ROOT, outZip)} (${kb} KB)`);
  } catch (err) {
    console.warn("[build] plugin package build failed:", err.message);
  }
}

// Build the gated MarCom Kit Tier 1 playbook package from exports/marcom-kit.
// Same posture as the SkillFoundry plugin: it lives OUTSIDE public dist/, so
// the only way to obtain it is an active kit key via GET /api/marcom-kit/download.
// The free starter-pack ZIP (the lead magnet) is excluded; it is served
// publicly from /assets instead.
function buildKitZip() {
  const srcDir = path.join(ROOT, "exports", "marcom-kit");
  if (!fs.existsSync(srcDir)) {
    console.warn("[build] exports/marcom-kit/ not found, skipping kit package");
    return;
  }
  const outDir = path.join(__dirname, "private");
  const outZip = path.join(outDir, "marcom-kit-playbook.zip");
  mkdir(outDir);
  rm(outZip);
  try {
    execFileSync(
      "zip",
      [
        "-r",
        "-q",
        outZip,
        "marcom-kit",
        "-x",
        "marcom-kit/fdi-marcom-starter-pack.zip",
        "-x",
        "marcom-kit/STRIPE_SETUP.md",
        "-x",
        "*/.DS_Store",
      ],
      { cwd: path.join(ROOT, "exports"), stdio: ["ignore", "ignore", "inherit"] },
    );
    const kb = Math.round(fs.statSync(outZip).size / 1024);
    console.log(`[build] kit package → ${path.relative(ROOT, outZip)} (${kb} KB)`);
  } catch (err) {
    console.warn("[build] kit package build failed:", err.message);
  }
}

// Build the gated Davos Decision Kit package from exports/davos-decision-kit.
// Same posture as the other gated packages: it lives OUTSIDE public dist/, so
// the only way to obtain it is an active dk1 key via GET /api/davos-kit/download.
// The pre-existing convenience zip inside the source dir is excluded (the
// gated package IS the zip), as is the internal go-live checklist.
function buildDavosZip() {
  const srcDir = path.join(ROOT, "exports", "davos-decision-kit");
  if (!fs.existsSync(srcDir)) {
    console.warn("[build] exports/davos-decision-kit/ not found, skipping davos package");
    return;
  }
  const outDir = path.join(__dirname, "private");
  const outZip = path.join(outDir, "davos-decision-kit.zip");
  mkdir(outDir);
  rm(outZip);
  try {
    execFileSync(
      "zip",
      [
        "-r",
        "-q",
        outZip,
        "davos-decision-kit",
        "-x",
        "davos-decision-kit/davos-decision-kit.zip",
        "-x",
        "davos-decision-kit/GO_LIVE_CHECKLIST.md",
        "-x",
        "*/.DS_Store",
      ],
      { cwd: path.join(ROOT, "exports"), stdio: ["ignore", "ignore", "inherit"] },
    );
    const kb = Math.round(fs.statSync(outZip).size / 1024);
    console.log(`[build] davos package → ${path.relative(ROOT, outZip)} (${kb} KB)`);
  } catch (err) {
    console.warn("[build] davos package build failed:", err.message);
  }
}

/* ---------------- SERIES + CONCEPT PAGES ---------------- */
const CONCEPTS = {
  aggregated: {
    slug: "aggregated",
    eyebrow: "The series · Aggregated markets",
    h1: "Aggregated",
    lede:
      "When discovery is mediated by a handful of aggregators, attention pools where the algorithm points. The durable move is to own a corpus and an identity the aggregator cannot revoke.",
    definition:
      "An aggregated market is one where a few intermediaries sit between makers and audiences and set the terms of discovery. In aggregated markets, the winning strategy is owning assets (a corpus, a provenance trail, a persistent identity) that keep their value if the aggregator changes the rules.",
    points: [
      {
        h: "The pattern",
        p: "Reach is commoditized and gatekept at the same time. You can make infinite content for near-zero cost, yet who sees it is decided by a black box you do not control.",
      },
      {
        h: "The FDI answer",
        p: "Build owned systems whose value does not depend on any single channel: a graded corpus, verifiable provenance, and an identity legible to both people and agents.",
      },
      {
        h: "In the wild",
        p: 'Ben Thompson\'s <a href="https://stratechery.com/aggregation-theory/" target="_blank" rel="noopener">Aggregation Theory</a> maps this exactly: platforms that own demand commoditize the suppliers behind them and set the terms of discovery. The durable countermove is owning assets the aggregator cannot revoke.',
      },
    ],
    kit: {
      name: "The Aggregator-Resilient Org",
      p: "In aggregated markets the org itself is the exposure: teams staffed around a single channel collapse when the algorithm turns. The MarCom Architecture Kit's Hourglass blueprint and Use, Compose, Build calculator structure the team around owned capabilities, so no aggregator rule change can zero out the operation.",
    },
  },
  decentralized: {
    slug: "decentralized",
    eyebrow: "The series · Decentralized markets",
    h1: "Decentralized",
    lede:
      "Knowledge and community are fragmenting across countless surfaces. Structure, not scale, is what makes a scattered corpus usable and citable.",
    definition:
      "A decentralized market is one where audiences, knowledge, and trust are spread across many independent surfaces rather than one platform. In decentralized markets, the winning strategy is turning scattered sources into one structured, citable knowledge graph.",
    points: [
      {
        h: "The pattern",
        p: "There is no single feed to win. Value lives in the relationships between sources, and those relationships are lost every time they are re-derived from scratch.",
      },
      {
        h: "The FDI answer",
        p: "Preserve structure. Write every source and relationship into a persistent knowledge graph so meaning compounds instead of evaporating.",
      },
      {
        h: "In the wild",
        p: '<a href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a> is the pattern in public: it turns scattered, independently maintained facts into one structured, queryable, citable knowledge graph that other systems build on instead of re-deriving from scratch.',
      },
    ],
    kit: {
      name: "The Cross-Functional Graph Org",
      p: "In decentralized markets the org chart has to mirror the knowledge graph: small cross-functional pods connected by shared structure, not silos connected by meetings. The MarCom Architecture Kit's Hourglass design and Riverbank governance give those pods one set of rules and one citable source of truth to build on.",
    },
  },
  autonomous: {
    slug: "autonomous",
    eyebrow: "The series · Autonomous markets",
    h1: "Autonomous",
    lede:
      "Agents are becoming the buyers, readers, and routers. The durable asset is an interface they can query and verify, with source, tier, and confidence attached to every answer.",
    definition:
      "An autonomous market is one where software agents discover, evaluate, and transact on behalf of people. In autonomous markets, the winning strategy is exposing verifiable interfaces (built on the open Model Context Protocol) that agents can trust and cite.",
    points: [
      {
        h: "The pattern",
        p: "Machine-to-machine discovery and commerce need machine-readable trust. An answer with no provenance is worthless to an agent that has to defend it.",
      },
      {
        h: "The FDI answer",
        p: "Expose your corpus through a verifiable interface built on the open Model Context Protocol (MCP), so every answer carries its source, tier, and confidence.",
      },
      {
        h: "In the wild",
        p: 'The open <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener">Model Context Protocol</a> is the pattern in public: it gives agents a verifiable interface to call tools and retrieve answers with their sources attached, rather than trusting unprovenanced text.',
      },
    ],
    kit: {
      name: "The Agent-Ready Org",
      p: "In autonomous markets your organization is judged by machines: agents route budget to operations they can query and verify. The MarCom Architecture Kit's Riverbank writes your brand rules so agents can enforce them, and the Hourglass puts human kill authority exactly where machine-speed output needs it.",
    },
  },
};

function conceptPage(key) {
  const c = CONCEPTS[key];
  const source = `series-${c.slug}`;
  const body = `
<section class="hero concept-hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">${c.eyebrow} · As of ${AS_OF}</span>
      <h1>${c.h1}, <em>owned</em>.</h1>
      <p class="lede">${c.lede}</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#waitlist">Join the waitlist <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="/field-guide">Read the Field Guide</a>
      </div>
      <div class="hero-tags"><a href="/aggregated"${key === "aggregated" ? ' aria-current="page"' : ""}><b>Aggregated</b></a><a href="/decentralized"${key === "decentralized" ? ' aria-current="page"' : ""}><b>Decentralized</b></a><a href="/autonomous"${key === "autonomous" ? ' aria-current="page"' : ""}><b>Autonomous</b></a></div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <p class="definition"><b>What is a ${c.h1.toLowerCase()} market?</b> ${c.definition}</p>
  </div>
</section>

<hr class="divider" />

<section class="section">
  <div class="wrap">
    <div class="grid cols-3">
      ${c.points
        .map(
          (pt) =>
            `<article class="card"><h3>${pt.h}</h3><p>${pt.p}</p></article>`,
        )
        .join("\n      ")}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="own-the-structure">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Own the structure</span>
      <h2>${c.kit.name}.</h2>
      <p>Owning the assets is half the answer. The other half is an organization shaped to run them.</p>
    </div>
    <div class="grid cols-2">
      <article class="card featured">
        <span class="pill">The kit's branch for this market</span>
        <h3>${c.kit.name}</h3>
        <p>${c.kit.p}</p>
        <div class="card-foot"><a class="link-arrow" href="/marcom-kit">See the MarCom Architecture Kit <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">Structure as code</span>
        <h3>Blueprints, not slide decks</h3>
        <p>The MarCom Architecture Kit ships the Hourglass org blueprint, the Use, Compose, Build capability calculator, and the Riverbank governance system as editable working documents, with a free starter pack to try before you buy.</p>
        <div class="card-foot"><a class="link-arrow" href="/marcom-kit#starter-pack">Get the free starter pack <span class="arrow">→</span></a></div>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Join the waitlist</span>
      <h2>Get the ${c.h1} field guide the day it ships.</h2>
      <p>Drop your email to follow the series. We'll reach out when the ${c.h1} field guide and its working code are live. No spam.</p>
      <form class="waitlist js-capture" data-source="${source}" data-subject="FDI series: ${c.h1}" data-success="Almost there. Check your inbox and click the confirmation link to finish signing up." data-mail-body="Please add me to the FDI ${c.h1} series waitlist." novalidate>
        <label class="sr-only" for="cp-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="cp-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
      <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    </div>
  </div>
</section>`;
  return page({
    title: `${c.h1} Markets | The FDI Series`,
    description: c.definition,
    active: "series",
    jsonLd: faqJsonLd([
      { q: `What is a ${c.h1.toLowerCase()} market?`, a: c.definition },
    ]),
    body,
    canonical: `${SITE_URL}/${c.slug}`,
  });
}

function seriesPage() {
  const card = (key) => {
    const c = CONCEPTS[key];
    return `<article class="card"><span class="tag">${c.h1}</span><h3>${c.h1} markets</h3><p>${c.lede}</p><div class="card-foot"><a class="link-arrow" href="/${c.slug}">Read the one-pager <span class="arrow">→</span></a></div></article>`;
  };
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">The series · As of ${AS_OF}</span>
      <h1>Aggregated. Decentralized. <em>Autonomous.</em></h1>
      <p class="lede">Three market structures are reshaping discovery, knowledge, and machine-to-machine commerce. The FDI series maps each one and ships the working code that proves the thesis.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/field-guide">Read the Field Guide <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="#waitlist">Follow the series</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Three market structures</span>
      <h2>One thesis, three field guides.</h2>
      <p>Each guide maps a market structure and grounds it in a real, working build you can pressure-test.</p>
    </div>
    <div class="grid cols-3">
      ${card("aggregated")}
      ${card("decentralized")}
      ${card("autonomous")}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Join the waitlist</span>
      <h2>Follow the FDI series.</h2>
      <p>Drop your email and we'll reach out as each field guide and its working code ship. No spam.</p>
      <form class="waitlist js-capture" data-source="series" data-subject="FDI series waitlist" data-success="Almost there. Check your inbox and click the confirmation link to finish signing up." data-mail-body="Please add me to the FDI series waitlist." novalidate>
        <label class="sr-only" for="series-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="series-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
      <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    </div>
  </div>
</section>`;
  return page({
    title: "The FDI Series | Aggregated, Decentralized, Autonomous",
    description:
      "The FDI series maps three market structures reshaping discovery, knowledge, and machine-to-machine commerce: aggregated, decentralized, and autonomous, each grounded in working code.",
    active: "series",
    body,
    canonical: `${SITE_URL}/series`,
  });
}

/* ---------------- ROADMAP ----------------
   Public feature tracker (Now / Next / Later). This is the single, editable
   source of truth for the /roadmap page: add or update an item here and the
   page rerenders on the next build. Keep items to a short title + one-line
   description + a status tag (In progress / Committed / Exploring / Live). */
const ROADMAP = {
  northStar:
    "Become a forward research organization: publish owned-marketing-systems research at a cadence, monetized through productized tools and community, with internal research capability as the long-term moat.",
  goal: {
    label: "This-quarter goal",
    value: "$5,000/month in revenue by August 15, 2026",
    detail:
      "Funded by a self-sustaining publishing engine, powered by the products we already have.",
  },
  columns: [
    {
      key: "now",
      title: "Now",
      blurb: "The revenue engine: make the existing products buyable and the funnel convert.",
      items: [
        {
          title: "SkillFoundry is for sale",
          desc: "Finalized pricing live on the page and checkout that actually takes money.",
          status: "In progress",
          link: "/skillfoundry",
        },
        {
          title: "Top Call, the free lead magnet",
          desc: "The on-thesis prompt-pack owned system that pulls people into the funnel.",
          status: "Live",
          link: "/topcall",
        },
        {
          title: "Email delivery and nurture",
          desc: "Signups and lead-magnet users receive their asset plus a welcome, turning capture into a channel.",
          status: "In progress",
        },
        {
          title: "A site that converts and gets cited",
          desc: "Copy, brand, and GEO polish so pages read human, stay on-brand, and surface in AI answer engines.",
          status: "In progress",
        },
        {
          title: "First customers",
          desc: "A researched Tier 1 US prospect list plus outreach to land the first sales and sharpen the higher-tier pitch.",
          status: "In progress",
        },
      ],
    },
    {
      key: "next",
      title: "Next",
      blurb: "The publishing engine: turn research into a cadence and a community.",
      items: [
        {
          title: "The Growth Cartography series ships",
          desc: "The three field guides (Aggregated, Decentralized, Autonomous), each backed by a deep-research report, published as real destinations.",
          status: "Committed",
          link: "/series",
        },
        {
          title: "A research library",
          desc: "A home and index for the field guides so new drops have somewhere to live and the cadence is visible.",
          status: "Committed",
        },
        {
          title: "Top Call corpus compounds",
          desc: "Live source ingestion so the owned system grows on its own (the Feed tier direction).",
          status: "Exploring",
        },
        {
          title: "Audience operations",
          desc: "One place to see and export who signed up for each product, so the community can be nurtured deliberately.",
          status: "Committed",
        },
      ],
    },
    {
      key: "later",
      title: "Later",
      blurb: "The research house: the long-term moat.",
      items: [
        {
          title: "Internal research capability and tooling",
          desc: "Durable data corpora, Top Call as a standing model, and the System Dynamics Engine turned into a real research instrument.",
          status: "Exploring",
        },
        {
          title: "Research membership and community",
          desc: "A research subscription and a community built around the work.",
          status: "Exploring",
        },
        {
          title: "Automated research-to-publishing pipeline",
          desc: "A pipeline from research to published drop so the cadence scales.",
          status: "Exploring",
        },
      ],
    },
  ],
};

function roadmapPage() {
  const statusClass = (s) =>
    "st-" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const item = (it) => {
    const inner = `<div class="rm-item-hd"><h3>${it.title}</h3><span class="rm-status ${statusClass(
      it.status,
    )}">${it.status}</span></div><p>${it.desc}</p>${
      it.link
        ? `<div class="rm-item-foot"><a class="link-arrow" href="${it.link}">Learn more <span class="arrow">→</span></a></div>`
        : ""
    }`;
    return `<li class="rm-item">${inner}</li>`;
  };
  const column = (col) => `<section class="rm-col rm-col-${col.key}">
        <div class="rm-col-hd">
          <span class="rm-col-label">${col.title}</span>
          <p class="rm-col-blurb">${col.blurb}</p>
        </div>
        <ul class="rm-list">
          ${col.items.map(item).join("\n          ")}
        </ul>
      </section>`;
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">Roadmap · As of ${AS_OF}</span>
      <h1>Where FDI is <em>headed</em>.</h1>
      <p class="lede">${ROADMAP.northStar}</p>
      <div class="rm-goal">
        <span class="rm-goal-label">${ROADMAP.goal.label}</span>
        <span class="rm-goal-value">${ROADMAP.goal.value}</span>
        <span class="rm-goal-detail">${ROADMAP.goal.detail}</span>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The tracker</span>
      <h2>Now, Next, Later.</h2>
      <p>The customer and community-facing themes we are building toward the goal. Statuses move as work lands. This is the public view; the full backlog lives with the team.</p>
    </div>
    <div class="rm-board">
      ${ROADMAP.columns.map(column).join("\n      ")}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="cta" id="follow">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Follow along</span>
      <h2>Watch the roadmap turn into shipped work.</h2>
      <p>Join the waitlist and we'll reach out as each milestone lands. No spam.</p>
      <form class="waitlist js-capture" data-source="roadmap" data-subject="FDI roadmap follower" data-success="Almost there. Check your inbox and click the confirmation link to finish signing up." data-mail-body="Please add me to the FDI roadmap updates list." novalidate>
        <label class="sr-only" for="rm-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="rm-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
      <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    </div>
  </div>
</section>`;
  return page({
    title: "Roadmap | False Dawn Industries",
    description:
      "The FDI public roadmap: a Now / Next / Later tracker of the customer and community-facing work toward $5,000/month in revenue by August 15, 2026, and the long-term goal of a forward research organization.",
    active: "roadmap",
    body,
    canonical: `${SITE_URL}/roadmap`,
  });
}

/* Plain-text guide for AI crawlers and LLMs (served at /llms.txt). */
function llmsTxt() {
  return `# False Dawn Industries (FDI)

> False Dawn Industries builds owned marketing systems for aggregated, decentralized, and autonomous markets: a persistent identity and corpus you can prove. As of ${AS_OF}.

False Dawn Industries (FDI) publishes the Field Guide thesis and ships working products that let organizations own their place in AI-mediated markets.

## Products
- The FDI Agentic MarCom Architecture Kit (${SITE_URL}/marcom-kit): the flagship. The blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system, shipped as a working kit of templates, calculators, and checklists. Structure as code. A free starter pack is available on the page.
- SkillFoundry (${SITE_URL}/skillfoundry): the kit's running enforcement engine and a standalone strategic firewall for content. A plugin built on the open Model Context Protocol (MCP) that routes any asset through three Signal-to-Value gates (Relevance, Performance, and Algorithmic Signal) and returns the optimized asset plus a structured audit. Strategy as code.

## The Field Guide
- Build the Machine, Not the Ad (${SITE_URL}/field-guide): the FDI thesis on owned marketing systems, with the launch deck and working-code proof.

## The series
- Aggregated markets (${SITE_URL}/aggregated): a few intermediaries set the terms of discovery; own assets that survive rule changes.
- Decentralized markets (${SITE_URL}/decentralized): knowledge is scattered; turn it into one structured, citable knowledge graph.
- Autonomous markets (${SITE_URL}/autonomous): agents transact; expose verifiable MCP interfaces they can trust and cite.

## Notes
- Model Context Protocol (MCP) is an open standard documented at ${MCP_URL}. FDI is not affiliated with or endorsed by Anthropic.
- Contact: ${CONTACT}
`;
}

/* ---------------- temporary page gating ----------------
 * Some pages are built but held back from public view pending review. Their
 * full builders (topcall(), roadmapPage()) stay intact above so they can be
 * switched back on by removing the route from GATED. While gated, the route is
 * still emitted (so links/routes resolve) but renders a neutral, noindex
 * holding page with no gated detail. */
const GATED = new Set(["topcall", "roadmap"]);

function holdingPage({ title, active }) {
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">False Dawn Industries</span>
      <h1>Coming back <em>soon</em>.</h1>
      <p class="lede">This page is being refined and is temporarily offline. It will be back shortly. In the meantime, explore our work below or join the waitlist and we will let you know when it returns.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/skillfoundry#waitlist">Join the waitlist <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="/">Back to home</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>`;
  return page({
    title,
    description:
      "This False Dawn Industries page is being refined and is temporarily offline. It will be back soon.",
    active,
    body,
    canonical: `${SITE_URL}/${active}`,
    noindex: true,
  });
}

/* ---------------- DAVOS KIT DEMO PAGE (internal, noindex) ---------------- */
// Never linked from public nav or the footer. Emitted only while DAVOS_DEMO is
// true so the commerce flow can be screen-shared with a client.
function davosDemoPage() {
  const body = `${nav("davos-kit-demo")}
<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-copy">
      <span class="eyebrow">Internal demo · Not a public page</span>
      <h1>The Davos Decision Kit</h1>
      <p class="lede">A self-serve decision system for executives weighing a Davos week: a weighted go or no-go scorecard, a twelve-month runway, a budget calculator with public-range estimates, and meeting-request templates. One-time purchase, instant download, license key emailed on checkout.</p>
      <div class="hero-cta">
        <button type="button" class="btn btn-primary js-buy" data-tier="dk1" data-fallback="#waitlist">Buy the kit · $199 launch <span class="arrow">→</span></button>
        <a class="btn btn-ghost" href="#inside">See what's inside</a>
      </div>
      <p class="form-msg js-buy-msg" role="status" aria-live="polite"></p>
      <p style="color:var(--muted);font-size:13px;margin-top:10px;">$299 list, $199 launch price. Secure Stripe checkout with tax calculated at purchase. If checkout is not live yet, the button falls back to the waitlist below.</p>
    </div>
  </div>
</section>
<section class="wrap section" id="inside">
  <span class="eyebrow">What's inside</span>
  <h2>Five working documents, one decision.</h2>
  <div class="grid cols-2">
    <article class="card"><h3>Go/No-Go Scorecard</h3><p>Six weighted factors, scoring guidance, and thresholds that resolve to a clear recommendation tier plus a one-page recommendation you can put in front of a board.</p></article>
    <article class="card"><h3>Twelve-Month Runway</h3><p>A month-by-month plan working back from the January week: when side-event lists close, when calendars fill, and what to do each month so the week is earned, not improvised.</p></article>
    <article class="card"><h3>Budget Calculator</h3><p>Line-by-line low and high estimates built from public ranges, three scenario profiles, and a total range you can defend in a budget review.</p></article>
    <article class="card"><h3>Visibility Plan Templates</h3><p>Meeting-request scripts, a model week, and follow-up cadences ready to instantiate for your own targets.</p></article>
  </div>
  <p style="color:var(--muted);font-size:13px;margin-top:18px;">The kit is an independent product of False Dawn Industries. It is not affiliated with or endorsed by the World Economic Forum. All costs are public-range estimates. Nothing in the kit is legal or financial advice.</p>
</section>
<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Join the waitlist</span>
      <h2>Not ready to buy? Get launch updates.</h2>
      <p>Drop your email and we will reach out with launch pricing and the worked example. No spam.</p>
      <form class="waitlist js-capture" data-source="davos-kit-demo" data-subject="Davos Decision Kit waitlist" data-success="Almost there. Check your inbox and click the confirmation link to join the waitlist." data-mail-body="Please add me to the Davos Decision Kit waitlist." novalidate>
        <label class="sr-only" for="dk-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="dk-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
      <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    </div>
  </div>
</section>`;
  return page({
    title: "Davos Decision Kit (demo) | False Dawn Industries",
    description:
      "Internal demo page for the Davos Decision Kit commerce flow.",
    active: "davos-kit-demo",
    body,
    canonical: `${SITE_URL}/davos-kit-demo`,
    noindex: true,
  });
}

function renderRoute(active, builder) {
  return GATED.has(active)
    ? holdingPage({ title: "Coming soon | False Dawn Industries", active })
    : builder();
}

function main() {
  rm(DIST);
  mkdir(DIST);
  const slideFiles = copyAssets();
  buildPluginZip();
  buildKitZip();
  buildDavosZip();

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
  fs.writeFileSync(path.join(DIST, "marcom-kit.html"), marcomKit());
  fs.writeFileSync(path.join(DIST, "topcall.html"), renderRoute("topcall", topcall));
  fs.writeFileSync(path.join(DIST, "series.html"), seriesPage());
  fs.writeFileSync(path.join(DIST, "aggregated.html"), conceptPage("aggregated"));
  fs.writeFileSync(
    path.join(DIST, "decentralized.html"),
    conceptPage("decentralized"),
  );
  fs.writeFileSync(path.join(DIST, "autonomous.html"), conceptPage("autonomous"));
  fs.writeFileSync(path.join(DIST, "roadmap.html"), renderRoute("roadmap", roadmapPage));
  if (DAVOS_DEMO) {
    fs.writeFileSync(path.join(DIST, "davos-kit-demo.html"), davosDemoPage());
  }
  fs.writeFileSync(path.join(DIST, "llms.txt"), llmsTxt());

  console.log(
    `[build] wrote 10 pages + llms.txt, ${slideFiles.length} slides, assets → ${path.relative(ROOT, DIST)}`,
  );
}

main();
