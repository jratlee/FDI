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
const EXPORTS002 = path.join(ROOT, "exports", "field-guide-002-aggregated");
const EXPORTS003 = path.join(ROOT, "exports", "field-guide-003-decentralized");
const EXPORTSPT02 = path.join(ROOT, "exports", "performance-thinking-02");
const EXPORTS004 = path.join(ROOT, "exports", "field-guide-004-autonomous");
const FONTS = path.join(ROOT, "artifacts", "mockup-sandbox", "public", "fonts");

/* ---------------- helpers ---------------- */
const rm = (p) => {
  /* Tolerant of concurrent builds (several workflows run build.mjs at startup):
     another process re-creating files mid-delete raises ENOTEMPTY/EBUSY. Retry
     with backoff and, for those race-class codes only, warn and continue on
     final failure instead of crashing the whole build. Any other error
     (permissions, corruption, bad path) still throws so real problems surface. */
  const RACE_CODES = new Set(["ENOTEMPTY", "EBUSY", "EPERM"]);
  for (let attempt = 0; ; attempt++) {
    try {
      fs.rmSync(p, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
      return;
    } catch (err) {
      if (!RACE_CODES.has(err.code)) throw err;
      if (attempt >= 4) {
        console.warn(`[build] warn: could not remove ${p} (${err.code}); continuing`);
        return;
      }
    }
  }
};
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
const CONTACT = "john@ratcliffe-lee.com";
/* SkillFoundry Stripe checkout is not live yet: while false, the tier CTAs
   route to the waitlist instead of the checkout flow. Flip to true once the
   purchase flow is proven in Stripe (see skillfoundry/STRIPE_SETUP.md). */
const CHECKOUT_LIVE = false;
/* MarCom OS Stripe checkout: same pattern. While false, all kit
   tier CTAs stay waitlist links. Flip to true once the kit purchase flow is
   proven in Stripe (see exports/marcom-kit/STRIPE_SETUP.md). */
const KIT_CHECKOUT_LIVE = true;
/* Davos Decision Kit commerce demo: while true, an internal, noindex demo page
   is emitted at /davos-kit-demo (never linked from public nav) so the checkout
   flow can be screen-shared with a client. The buy button degrades to the
   page's own waitlist form until Stripe secrets are set. */
const DAVOS_DEMO = true;
/* Open Cartography Lab community: set COMMUNITY_URL to the hosted Buzz web
   client URL (e.g. https://lab.falsedawn.industries) once the relay is live.
   While unset, the /community page shows the concept and a waitlist form. */
const COMMUNITY_URL = (process.env.COMMUNITY_URL || "").trim();
const COMMUNITY_LIVE = !!COMMUNITY_URL;
const SITE_URL = "https://falsedawn.industries";
/* Search-console ownership verification (Task: register with Google Search
   Console + Bing Webmaster Tools). Set these env vars in the deployment to
   the content values from Google Search Console ("HTML tag" method) and Bing
   Webmaster Tools ("Meta tag" / HTML meta option); the tags are then baked
   into every page head at build time so verification survives rebuilds. They
   are NOT secrets: the values are public in the served HTML by design. When
   unset (e.g. local dev), no tag is emitted. */
const GOOGLE_SITE_VERIFICATION = (process.env.GOOGLE_SITE_VERIFICATION || "")
  .trim()
  .replace(/["<>]/g, "");
const BING_SITE_VERIFICATION = (process.env.BING_SITE_VERIFICATION || "")
  .trim()
  .replace(/["<>]/g, "");
const MCP_URL = "https://modelcontextprotocol.io";
const AS_OF = "2026";

/* Primary sources verified for the Field Guide launch (see
   exports/field-guide-launch/citations-and-originality.md). Reused inline so
   headline claims carry a checkable citation. */
const CITE = {
  /* WARC Dec 2025 forecast: $1.19trn in 2025 growing 9.1% in 2026 = ~$1.30trn. */
  adspend:
    "https://www.warc.com/en/article/warc-global-ad-forecasts-upgraded-but-growth-concentrated-within-big-tech-9ed8089870e64fbe84b6bf2b1f8d6442",
  /* Dr Karen Nelson-Field's attention-memory threshold (her company Amplified
     is the primary source): 2.5s of active attention is where an ad starts to
     stick in memory, and ~85% of digital ads never reach it. */
  attention:
    "https://www.amplified.co/insight/why-does-the-attention-memory-threshold-matter",
  /* ynharari.com/book/sapiens-2/ silently redirects to the 21 Lessons page;
     /book/sapiens/ is the real Sapiens page. */
  belief: "https://www.ynharari.com/book/sapiens/",
  /* FT New Dimensions of Influence, 2026: survey of 500+ global decision-makers.
     Key findings: 74% held back decisions due to data-trust failures; 85% concerned
     AI content makes credibility harder to assess; 4 in 5 say trusted sources are
     now more important than two years ago; decision-makers are 10x more likely to
     trust evidenced, independently produced information than speedy information. */
  ftipa:
    "https://aboutus.ft.com/press_release/ft-new-dimensions-of-influence",
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
      ${link("/marcom-kit", "MarCom OS", "marcom-kit")}
      ${link("/skillfoundry", "SkillFoundry", "skillfoundry")}
      ${link("/field-guide", "Field Guide", "field-guide")}
      ${link("/engine", "Engine", "engine")}
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
        <p class="blurb">Reach is commoditized; platforms are opaque. False Dawn Industries builds the systems that let a brand do what a person does: show up with one consistent, coherent identity in every new space, legible to machines, portable across communities, and verifiable by agents.</p>
      </div>
      <div>
        <h5>Explore</h5>
        <ul>
          <li><a href="/marcom-kit">MarCom OS</a></li>
          <li><a href="/skillfoundry">SkillFoundry</a></li>
          <li><a href="/field-guide">Field Guide</a></li>
          <li><a href="/engine">Growth Engine</a></li>
          <li><a href="/fdcp">The FDCP Report</a></li>
          <li><a href="/series">The Series</a></li>
          <li><a href="/community">The Lab</a></li>
          <li><a href="/workshop">Workshops</a></li>
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

function page({ title, description, active, body, canonical, jsonLd, noindex, ogImage, extraHead }) {
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
<meta property="og:image" content="${ogImage || "/assets/li-article-header-1200x627.png"}" />
<meta name="twitter:card" content="summary_large_image" />
${GOOGLE_SITE_VERIFICATION ? `<meta name="google-site-verification" content="${GOOGLE_SITE_VERIFICATION}" />\n` : ""}${BING_SITE_VERIFICATION ? `<meta name="msvalidate.01" content="${BING_SITE_VERIFICATION}" />\n` : ""}${canonical ? `<link rel="canonical" href="${canonical}" />` : ""}
${ld}
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="preload" as="font" type="font/woff2" href="/fonts/space-grotesk-600-latin.woff2" crossorigin />
<link rel="preload" as="font" type="font/woff2" href="/fonts/inter-400-latin.woff2" crossorigin />
<link rel="stylesheet" href="/site.css" />
${extraHead || ""}
</head>
<body>
<div class="watermark" aria-hidden="true">${MARK}</div>
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

const articleJsonLd = ({ headline, description, image, route, datePublished }) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline,
  description,
  image: `${SITE_URL}${image || "/assets/li-article-header-1200x627.png"}`,
  author: { "@type": "Organization", name: "False Dawn Industries", url: `${SITE_URL}/` },
  publisher: {
    "@type": "Organization",
    name: "False Dawn Industries",
    logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
  },
  datePublished: datePublished || "2026-07-01",
  dateModified: datePublished || `${AS_OF}-07-01`,
  mainEntityOfPage: `${SITE_URL}${route || "/field-guide"}`,
});

/* ---------------- HOME ---------------- */
function home() {
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">Growth Cartography</span>
      <h1>Build the machine, <em>not the ad</em>.</h1>
      <p class="lede">Owned marketing systems for aggregated, decentralized, and autonomous markets. We map the machine that decides who gets seen and build the tools to own your place in it.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="/marcom-kit">Explore MarCom OS <span class="arrow">→</span></a>
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
    <div class="stat"><div class="k">2.5s</div><div class="l">of active attention before an ad even starts to stick in memory. Most digital ads never get there ${cite(CITE.attention, "Dr Karen Nelson-Field / Amplified, the attention-memory threshold")}</div></div>
    <div class="stat"><div class="k">70,000<span class="amber">yrs</span></div><div class="l">humans have coordinated around shared belief, and identity is still the bridge ${cite(CITE.belief, "Yuval Noah Harari, Sapiens")}</div></div>
    <div class="stat"><div class="k">74<span class="amber">%</span></div><div class="l">of business leaders held back a decision because they did not know what data to trust. Trusted sources are now more important for strategic decisions than they were two years ago ${cite(CITE.ftipa, "FT New Dimensions of Influence, 2026")}</div></div>
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
        <h3>MarCom OS</h3>
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
        <span class="tag">The series · All three guides live</span>
        <h3>Aggregated · Decentralized · Autonomous</h3>
        <p>Three field guides map the markets reshaping marketing, and all three are live: Field Guide 002 on today's platforms and the AI platforms whose rules are not yet understood, Field Guide 003 on crypto-powered decentralized networks, and Field Guide 004 on agent-to-agent marketplaces scaling toward the size of Meta and Google today.</p>
        <div class="card-foot"><a class="link-arrow" href="/series">See the series <span class="arrow">→</span></a></div>
      </article>
    </div>
  </div>
</section>

<div class="roadmap-callout">
  <div class="wrap roadmap-callout-inner">
    <span class="eyebrow">Community</span>
    <p class="roadmap-callout-text">The Open Cartography Lab: a public, agent-staffed space where growth-modeling questions get computed answers. Free. No paywall.</p>
    <a class="link-arrow" href="/community">Join the Lab <span class="arrow">→</span></a>
  </div>
</div>

<div class="roadmap-callout">
  <div class="wrap roadmap-callout-inner">
    <span class="eyebrow">Roadmap</span>
    <p class="roadmap-callout-text">FDI is building in public. See what's live, what's in progress, and what's coming next.</p>
    <a class="link-arrow" href="/roadmap">See where FDI is headed <span class="arrow">→</span></a>
  </div>
</div>

<section class="section" style="padding:clamp(40px,5vw,64px) 0;">
  <div class="wrap">
    <div class="eng-teaser">
      <span class="eyebrow">Growth Cartography · System Dynamics Engine</span>
      <h3>Model your network before you build it.</h3>
      <p>Enter your growth parameters and see the math: how cohorts decay, how stability beats spikes, and how many units you actually need to hit your target. Then get a personalised PDF Growth Report.</p>
      <a class="btn btn-primary" href="/engine">Try the Engine <span class="arrow">→</span></a>
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
        <span class="tag">Build · Open Source</span>
        <h3><a href="https://github.com/jratlee/nyc-chat" target="_blank" rel="noopener">Talk to NYC</a></h3>
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
      <p>Reach is commoditized; platforms are opaque. False Dawn Industries builds the systems that let a brand do what a person does: show up with one consistent, coherent identity in every new space, legible to machines, portable across communities, and verifiable by agents.</p>
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

function slidesStrip(slideFiles, dir = "deck-slides") {
  return slideFiles
    .map(
      (f, i) =>
        `<a href="/assets/${dir}/${f}" target="_blank" rel="noopener" aria-label="Open slide ${i + 1} full size"><img src="/assets/${dir}/${f}" alt="Field Guide deck, slide ${i + 1}" loading="lazy" /></a>`,
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
      <form class="waitlist js-capture" data-source="field-guide-deck" data-subject="Field Guide deck PDF" data-download="/assets/fdi-field-guide-deck.pdf" data-mail-body="Please send me the FDI Field Guide deck PDF." novalidate style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <label class="sr-only" for="fg-deck-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="fg-deck-email" name="email" placeholder="you@company.com" autocomplete="email" required style="flex:1;min-width:200px;" />
        <button class="btn btn-primary" type="submit">Download the deck (PDF) <span class="arrow">↓</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </div>
    <div class="slides-strip">
      ${slidesStrip(slideFiles)}
    </div>
  </div>
</section>

<section class="section" id="next-guide">
  <div class="wrap">
    <div class="grid cols-3">
      <article class="card featured">
        <span class="pill">Next in the series</span>
        <h3>Field Guide 002 · Aggregated: The Model Decides If You Exist</h3>
        <p>Three platforms take 62.3% of the world's digital ad spending, organic reach is a rounding error, and an answer layer above the platforms now absorbs the click. The second guide maps the aggregated market in both halves.</p>
        <div class="card-foot"><a class="link-arrow" href="/field-guide-002">Read Field Guide 002 <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="pill">Also available</span>
        <h3>Field Guide 003 · Decentralized: The Network Is the Product</h3>
        <p>In crypto-powered networks there is no feed to buy. Reach is earned through verifiable onchain participation: Farcaster, Lens, ENS, wallet-based identity, and the agent settlement layer.</p>
        <div class="card-foot"><a class="link-arrow" href="/field-guide-003">Read Field Guide 003 <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="pill">Also available</span>
        <h3>Field Guide 004 · Autonomous: When the Buyer Is Software</h3>
        <p>Agents transacting with agents on the live open protocol stack (MCP, A2A, AP2, x402): agent-market dynamics, the growth curve toward marketplaces at the scale of Meta and Google today, and why machine-legibility advantages compound at machine speed.</p>
        <div class="card-foot"><a class="link-arrow" href="/field-guide-004">Read Field Guide 004 <span class="arrow">→</span></a></div>
      </article>
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

function fieldGuide002({ title, subtitle, attribution, bodyHtml }, slideFiles) {
  const body = `
<article class="article">
  <div class="wrap">
    <div class="article-head">
      <span class="eyebrow">Growth Cartography · Field Guide 002 · Aggregated</span>
      <h1>${title}</h1>
      <p class="sub">${subtitle}</p>
      <p class="byline">${attribution}</p>
    </div>
    <div class="article-cover">
      <img src="/assets/fg002-cover-1200x627.png" alt="False Dawn Industries Field Guide 002: The model decides if you exist. Aggregated markets." width="1200" height="627" />
    </div>
    <div class="prose">
      ${bodyHtml}
    </div>
  </div>
</article>

<section class="deck section" id="deck">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The deck</span>
      <h2>Field Guide 002: the aggregated market in 13 slides</h2>
      <p>The full deck, built on the reusable FDI slide system. View it inline, download the PDF, or browse the slides.</p>
    </div>
    <div class="deck-frame">
      <iframe src="/assets/fdi-field-guide-002-deck.pdf#view=FitH" title="FDI Field Guide 002 deck (PDF)" loading="lazy"></iframe>
    </div>
    <div class="deck-actions">
      <form class="waitlist js-capture" data-source="field-guide-002-deck" data-subject="Field Guide 002 deck PDF" data-download="/assets/fdi-field-guide-002-deck.pdf" data-mail-body="Please send me the FDI Field Guide 002 deck PDF." novalidate style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <label class="sr-only" for="fg002-deck-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="fg002-deck-email" name="email" placeholder="you@company.com" autocomplete="email" required style="flex:1;min-width:200px;" />
        <button class="btn btn-primary" type="submit">Download the deck (PDF) <span class="arrow">↓</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </div>
    <div class="slides-strip">
      ${slidesStrip(slideFiles, "deck-slides-002")}
    </div>
  </div>
</section>

<section class="section" id="prev-guide">
  <div class="wrap">
    <div class="grid cols-2">
      <article class="card">
        <span class="tag">Start of the series</span>
        <h3>Field Guide 001: Build the Machine, Not the Ad</h3>
        <p>The general case: when content is free to make and platforms are opaque, the only durable marketing assets are the ones you own and can prove.</p>
        <div class="card-foot"><a class="link-arrow" href="/field-guide">Read the thesis <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">The market one-pager</span>
        <h3>Aggregated markets, mapped</h3>
        <p>The short version of this guide: the definition, the pattern, and the FDI answer for markets where a few platforms set the terms of discovery.</p>
        <div class="card-foot"><a class="link-arrow" href="/aggregated">See the one-pager <span class="arrow">→</span></a></div>
      </article>
    </div>
  </div>
</section>`;
  const description =
    "Three platforms take 62% of digital ad spend, organic reach is a rounding error, and AI answers absorb the click. The response: own your identity and corpus.";
  return page({
    title: "The Aggregated Market: Field Guide 002 | False Dawn Industries",
    description,
    active: "field-guide",
    jsonLd: articleJsonLd({
      headline: "The Model Decides If You Exist",
      description,
      image: "/assets/fg002-cover-1200x627.png",
      route: "/field-guide-002",
      datePublished: "2026-07-13",
    }),
    body,
    canonical: `${SITE_URL}/field-guide-002`,
    ogImage: "/assets/fg002-cover-1200x627.png",
  });
}

function fieldGuide003({ title, subtitle, attribution, bodyHtml }, slideFiles) {
  const body = `
<article class="article">
  <div class="wrap">
    <div class="article-head">
      <span class="eyebrow">Growth Cartography · Field Guide 003 · Decentralized</span>
      <h1>${title}</h1>
      <p class="sub">${subtitle}</p>
      <p class="byline">${attribution}</p>
    </div>
    <div class="article-cover">
      <img src="/assets/fg003-cover-1200x627.png" alt="False Dawn Industries Field Guide 003: The network is the product. Decentralized markets." width="1200" height="627" />
    </div>
    <div class="prose">
      ${bodyHtml}
    </div>
  </div>
</article>

<section class="deck section" id="deck">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The deck</span>
      <h2>Field Guide 003: the decentralized market in 13 slides</h2>
      <p>The full deck, built on the reusable FDI slide system. View it inline, download the PDF, or browse the slides.</p>
    </div>
    <div class="deck-frame">
      <iframe src="/assets/fdi-field-guide-003-deck.pdf#view=FitH" title="FDI Field Guide 003 deck (PDF)" loading="lazy"></iframe>
    </div>
    <div class="deck-actions">
      <form class="waitlist js-capture" data-source="field-guide-003-deck" data-subject="Field Guide 003 deck PDF" data-download="/assets/fdi-field-guide-003-deck.pdf" data-mail-body="Please send me the FDI Field Guide 003 deck PDF." novalidate style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <label class="sr-only" for="fg003-deck-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="fg003-deck-email" name="email" placeholder="you@company.com" autocomplete="email" required style="flex:1;min-width:200px;" />
        <button class="btn btn-primary" type="submit">Download the deck (PDF) <span class="arrow">↓</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </div>
    <div class="slides-strip">
      ${slidesStrip(slideFiles, "deck-slides-003")}
    </div>
  </div>
</section>

<section class="section" id="prev-guide">
  <div class="wrap">
    <div class="grid cols-2">
      <article class="card">
        <span class="tag">Previous in the series</span>
        <h3>Field Guide 002: The Model Decides If You Exist</h3>
        <p>Three platforms take 62.3% of digital ad spending, organic reach is a rounding error, and an AI answer layer absorbs the click. The aggregated market, mapped.</p>
        <div class="card-foot"><a class="link-arrow" href="/field-guide-002">Read Field Guide 002 <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">The market one-pager</span>
        <h3>Decentralized markets, mapped</h3>
        <p>The short version: participant-owned rails, wallet-based identity, and onchain reputation — and the three crypto primitives that power agent-to-agent commerce.</p>
        <div class="card-foot"><a class="link-arrow" href="/decentralized">See the one-pager <span class="arrow">→</span></a></div>
      </article>
    </div>
  </div>
</section>`;
  const description =
    "In crypto-powered networks, participants own the rails and there is no feed to buy. The durable asset is a verifiable onchain identity and corpus — Farcaster, Lens, ENS, x402, and the agent settlement layer.";
  return page({
    title: "The Decentralized Market: Field Guide 003 | False Dawn Industries",
    description,
    active: "field-guide",
    jsonLd: articleJsonLd({
      headline: "The Network Is the Product",
      description,
      image: "/assets/fg003-cover-1200x627.png",
      route: "/field-guide-003",
      datePublished: "2026-07-30",
    }),
    body,
    canonical: `${SITE_URL}/field-guide-003`,
    ogImage: "/assets/fg003-cover-1200x627.png",
  });
}

function fdcpPage({ title, subtitle, attribution, bodyHtml }, slideFiles) {
  const body = `
<article class="article">
  <div class="wrap">
    <div class="article-head">
      <span class="eyebrow">Growth Cartography · Performance Thinking · The FDCP</span>
      <h1>${title}</h1>
      <p class="sub">${subtitle}</p>
      <p class="byline">${attribution}</p>
    </div>
    <div class="article-cover">
      <img src="/assets/fdcp-cover-1280x720.png" alt="False Dawn Industries Performance Thinking: the Forward-Deployed Communications Professional. One operator, a fleet of agents, ownership of the whole workflow." width="1280" height="720" />
    </div>
    <div class="prose">
      ${bodyHtml}
    </div>
  </div>
</article>

<section class="deck section" id="deck">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The deck</span>
      <h2>The FDCP argument in 12 slides</h2>
      <p>The full deck, built on the reusable FDI slide system. View it inline, download the PDF, or browse the slides.</p>
    </div>
    <div class="deck-frame">
      <iframe src="/assets/fdi-fdcp-deck.pdf#view=FitH" title="FDI FDCP deck (PDF)" loading="lazy"></iframe>
    </div>
    <div class="deck-actions">
      <form class="waitlist js-capture" data-source="fdcp-deck" data-subject="FDCP deck PDF" data-download="/assets/fdi-fdcp-deck.pdf" data-mail-body="Please send me the FDI FDCP deck PDF." novalidate style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <label class="sr-only" for="fdcp-deck-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="fdcp-deck-email" name="email" placeholder="you@company.com" autocomplete="email" required style="flex:1;min-width:200px;" />
        <button class="btn btn-primary" type="submit">Download the deck (PDF) <span class="arrow">↓</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </div>
    <div class="slides-strip">
      ${slidesStrip(slideFiles, "deck-slides-fdcp")}
    </div>
  </div>
</section>

<section class="section" id="related">
  <div class="wrap">
    <div class="grid cols-2">
      <article class="card">
        <span class="tag">The thesis</span>
        <h3>Field Guide 001: Build the Machine, Not the Ad</h3>
        <p>The general case: when content is free to make and platforms are opaque, the only durable marketing assets are the ones you own and can prove.</p>
        <div class="card-foot"><a class="link-arrow" href="/field-guide">Read the thesis <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">The market</span>
        <h3>Autonomous markets, mapped</h3>
        <p>The market the FDCP is built for: agents transacting with agents, and the growth curve as those marketplaces scale toward the size of Meta and Google today.</p>
        <div class="card-foot"><a class="link-arrow" href="/autonomous">See the one-pager <span class="arrow">→</span></a></div>
      </article>
    </div>
  </div>
</section>`;
  const description =
    "How the Forward-Deployed Communications Professional (FDCP) runs AI agent fleets: loop engineering, policy as code, and marketing to machine buyers. Report plus 12-slide deck.";
  return page({
    title: "The FDCP: Marketing's Operator Role for AI Agent Markets | False Dawn Industries",
    description,
    active: "field-guide",
    jsonLd: articleJsonLd({
      headline: "The Forward-Deployed Communicator",
      description,
      image: "/assets/fdcp-cover-1280x720.png",
      route: "/fdcp",
      datePublished: "2026-07-15",
    }),
    body,
    canonical: `${SITE_URL}/fdcp`,
    ogImage: "/assets/fdcp-cover-1280x720.png",
  });
}

function fieldGuide004({ title, subtitle, attribution, bodyHtml }, slideFiles) {
  const body = `
<article class="article">
  <div class="wrap">
    <div class="article-head">
      <span class="eyebrow">Growth Cartography · Field Guide 004 · Autonomous</span>
      <h1>${title}</h1>
      <p class="sub">${subtitle}</p>
      <p class="byline">${attribution}</p>
    </div>
    <div class="article-cover">
      <img src="/assets/fg004-cover-1200x627.png" alt="False Dawn Industries Field Guide 004: When the buyer is software. Autonomous markets, agent-to-agent dynamics, and the growth curve." width="1200" height="627" />
    </div>
    <div class="prose">
      ${bodyHtml}
    </div>
  </div>
</article>

<section class="deck section" id="deck">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The deck</span>
      <h2>Field Guide 004: agent-to-agent dynamics in 13 slides</h2>
      <p>The full deck, built on the reusable FDI slide system. View it inline, download the PDF, or browse the slides.</p>
    </div>
    <div class="deck-frame">
      <iframe src="/assets/fdi-field-guide-004-deck.pdf#view=FitH" title="FDI Field Guide 004 deck (PDF)" loading="lazy"></iframe>
    </div>
    <div class="deck-actions">
      <form class="waitlist js-capture" data-source="field-guide-004-deck" data-subject="Field Guide 004 deck PDF" data-download="/assets/fdi-field-guide-004-deck.pdf" data-mail-body="Please send me the FDI Field Guide 004 deck PDF." novalidate style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
        <label class="sr-only" for="fg004-deck-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="fg004-deck-email" name="email" placeholder="you@company.com" autocomplete="email" required style="flex:1;min-width:200px;" />
        <button class="btn btn-primary" type="submit">Download the deck (PDF) <span class="arrow">↓</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
    </div>
    <div class="slides-strip">
      ${slidesStrip(slideFiles, "deck-slides-004")}
    </div>
  </div>
</section>

<section class="section" id="prev-guide">
  <div class="wrap">
    <div class="grid cols-2">
      <article class="card">
        <span class="tag">The companion report</span>
        <h3>The FDCP</h3>
        <p>How the Forward-Deployed Communications Professional runs AI agent fleets: loop engineering, policy as code, and marketing to machine buyers.</p>
        <div class="card-foot"><a class="link-arrow" href="/fdcp">Read the FDCP report <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">The market one-pager</span>
        <h3>Autonomous markets, mapped</h3>
        <p>The short version of this guide: the definition, the pattern, and the FDI answer for markets where agents transact with agents at machine speed.</p>
        <div class="card-foot"><a class="link-arrow" href="/autonomous">See the one-pager <span class="arrow">→</span></a></div>
      </article>
    </div>
  </div>
</section>`;
  const description =
    "Agents are already buying at scale, the protocols are open, and the growth curve points toward Meta-sized agent marketplaces. The response: become a callable, citable, machine-legible interface.";
  return page({
    title: "The Autonomous Market: Field Guide 004 | False Dawn Industries",
    description,
    active: "field-guide",
    jsonLd: articleJsonLd({
      headline: "When the Buyer Is Software",
      description,
      image: "/assets/fg004-cover-1200x627.png",
      route: "/field-guide-004",
      datePublished: "2026-07-30",
    }),
    body,
    canonical: `${SITE_URL}/field-guide-004`,
    ogImage: "/assets/fg004-cover-1200x627.png",
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
        <div class="cmd-hd"><code class="cmd-name">/skillfoundry:strategic-audit</code><span class="cmd-tag">Hero</span><button class="cmd-copy" data-cmd="/skillfoundry:strategic-audit" aria-label="Copy command /skillfoundry:strategic-audit">Copy</button></div>
        <p>Runs the asset through all three gates in order and returns one consolidated strategic audit report, scored, ranked, with line-level rewrites you can defend to the C-suite.</p>
      </div>
      <div class="cmd">
        <div class="cmd-hd"><code class="cmd-name">/skillfoundry:relevance-gate</code><button class="cmd-copy" data-cmd="/skillfoundry:relevance-gate" aria-label="Copy command /skillfoundry:relevance-gate">Copy</button></div>
        <p>Runs only Gate 1, the Market-Deficit Analyzer, scoring the asset through a Jobs-to-be-Done lens and returning its Relevance GateResult.</p>
      </div>
      <div class="cmd">
        <div class="cmd-hd"><code class="cmd-name">/skillfoundry:performance-gate</code><button class="cmd-copy" data-cmd="/skillfoundry:performance-gate" aria-label="Copy command /skillfoundry:performance-gate">Copy</button></div>
        <p>Runs only Gate 2, the Enterprise Valuation Gate, auditing brand equity and competitive positioning and returning its Performance GateResult.</p>
      </div>
      <div class="cmd">
        <div class="cmd-hd"><code class="cmd-name">/skillfoundry:signal-gate</code><button class="cmd-copy" data-cmd="/skillfoundry:signal-gate" aria-label="Copy command /skillfoundry:signal-gate">Copy</button></div>
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
      <h1>Top Call: <em>the owned authority layer</em>.</h1>
      <p class="lede">85% of business leaders are concerned that AI-generated content makes it harder to know what is credible. The leaders who get cited are not producing more content. They are building the graded corpus, the traceable knowledge graph, and the verifiable interface that gives a model or a boardroom a reason to trust them. Top Call is that infrastructure: the owned authority layer that makes your brand's expertise citeable by AI and by the people who brief it.</p>
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
      <h2>Three pillars. Three reasons a source gets trusted.</h2>
      <p>FT research finds decision-makers are ten times more likely to trust evidenced, independently produced information than speedy information. Top Call maps those requirements onto working infrastructure: a citable corpus, a traceable graph, and a verifiable interface agents and executives can rely on. ${cite(CITE.ftipa, "FT New Dimensions of Influence, 2026")}</p>
    </div>
    <div class="grid cols-3">
      ${construct(
        1,
        "Corpus",
        "Evidence that withstands scrutiny",
        "Every source is classified into a source-authority tier (1A/1B/1C/2/3) at ingest and written into a persistent, provenance-stamped store. The chain of evidence is preserved from ingest to answer, so every claim a model or executive sees can be checked against the source that justified it.",
        "Becomes",
        "Owned, provenance-stamped store",
      )}
      ${construct(
        2,
        "Graph",
        "Independent, traceable oversight",
        "Executives, companies, moves, categories, implications, and sources become a queryable node/edge graph. Relationships are independently traceable and never re-derived from scratch on demand. When a Tier 1 source corroborates a move first seen in a Tier 2 release, confidence upgrades automatically and the audit trail is always there.",
        "Becomes",
        "Queryable node/edge graph",
      )}
      ${construct(
        3,
        "Interface",
        "Human review, built in",
        "The repeatable read skills are exposed as MCP tools built on the open Model Context Protocol (MCP) so an agent can call them and get answers stamped with source, tier, and confidence. Nothing is a black box. Every answer is checkable by a human before anyone acts on it.",
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
    title: "Top Call: The Owned Authority Layer | False Dawn Industries",
    description:
      "Top Call is the owned authority layer that makes your brand's expertise citeable by AI and by the people who brief it. A provenance-stamped corpus, a traceable knowledge graph, and a verifiable MCP interface. Get the free prompt-pack, then the owned system.",
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
    name: "FDI MarCom OS",
    url: `${SITE_URL}/marcom-kit`,
    description:
      "MarCom OS is the blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system, shipped as a working kit of templates, calculators, and checklists.",
    brand: { "@type": "Organization", name: "False Dawn Industries", url: `${SITE_URL}/` },
    offers: {
      "@type": "Offer",
      price: "149.00",
      priceCurrency: "USD",
      description: "MarCom OS Foundation Playbook (Tier 1), one-time.",
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
      q: "What is MarCom OS?",
      a: "MarCom OS is the blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system, shipped as a working kit of templates, calculators, and checklists rather than a slide deck. It is built by False Dawn Industries.",
    },
    {
      q: "How is the kit different from hiring a consultancy?",
      a: "A consultancy sells you a deck and leaves. The kit is structure as code: editable blueprints, a scoring calculator, governance templates, and an audit checklist you run yourself, with SkillFoundry available as the running enforcement engine for the rules you set. Higher tiers add a fixed-scope sprint or a fractional architect retainer if you want hands-on help.",
    },
    {
      q: "How much does MarCom OS cost?",
      a: "Three tiers: the MarCom OS Foundation Playbook (Tier 1) from $149 one-time, the Living Architecture subscription (Tier 2) from $199 per month, and the Architecture Partner retainer (Tier 3) from $5,000 per month or a $10,000 fixed four-week sprint. A standalone Governance Risk Audit runs $1,500 to $2,500. Launch pricing is available to waitlist members.",
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
      <h1>MarCom OS: <em>structure as code</em>.</h1>
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
    <p class="definition"><b>MarCom OS is the blueprint for an AI-era marketing organization.</b> It packages the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system into editable templates, calculators, and checklists you run yourself, with SkillFoundry as the running enforcement engine for the rules you set. Built by False Dawn Industries. As of ${AS_OF}.</p>
  </div>
</section>

<section class="section" id="starter-pack">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Free · The starter pack</span>
      <h2>Start with the Use, Compose, Build starter.</h2>
      <p>The free FDI MarCom OS Starter Pack contains a working slice of the kit: the Use, Compose, Build starter calculator and a Riverbank starter template, so you can score one capability and write one governance rule before you spend a dollar.</p>
    </div>
    <div class="grid cols-2">
      <article class="card featured">
        <span class="tag">The lead magnet</span>
        <h3>FDI MarCom OS Starter Pack</h3>
        <p>The Use, Compose, Build starter calculator, a Riverbank starter governance template, and a read-me that maps both onto the full kit. Drop your email and the download starts immediately. No spam.</p>
        <form class="waitlist js-capture" data-source="marcom-kit-starter" data-subject="MarCom OS starter pack" data-download="/assets/fdi-marcom-starter-pack.zip" data-mail-body="Please send me the FDI MarCom OS starter pack." novalidate style="margin-top:22px;">
          <label class="sr-only" for="mk-lm-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
          ${HONEYPOT}
          <input type="email" id="mk-lm-email" name="email" placeholder="you@company.com" autocomplete="email" required />
          <button class="btn btn-primary" type="submit">Email me the pack <span class="arrow">↓</span></button>
        </form>
        <p class="form-msg" role="status" aria-live="polite"></p>
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
      <p>The Tier 1 MarCom OS Foundation Playbook ships all three pillars as editable documents plus the Audit to Kill checklist that turns them into a quarterly operating rhythm.</p>
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
        "MarCom OS Foundation Playbook",
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
      <h2>Get MarCom OS the day it ships.</h2>
      <p>Drop your email to join the waitlist. We'll reach out with early access, launch pricing, and the starter pack walkthrough. No spam.</p>
      <form class="waitlist js-capture" data-source="marcom-kit" data-subject="MarCom OS waitlist" data-success="Almost there. Check your inbox and click the confirmation link to join the waitlist." data-mail-body="Please add me to MarCom OS waitlist." novalidate>
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
    title: "MarCom OS: Structure as Code | False Dawn Industries",
    description:
      "MarCom OS is the blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build calculator, and the Riverbank governance system, shipped as a working kit. Get the free starter pack.",
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

  // Copy-to-clipboard for command cards (.cmd-copy buttons)
  function cmdCopyFallback(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }
  var copies = document.querySelectorAll(".cmd-copy");
  Array.prototype.forEach.call(copies, function (btn) {
    btn.addEventListener("click", function () {
      var cmd = btn.getAttribute("data-cmd") || "";
      function confirm() {
        btn.textContent = "Copied";
        btn.setAttribute("aria-label", "Copied");
        btn.classList.add("is-copied");
        setTimeout(function () {
          btn.textContent = "Copy";
          btn.setAttribute("aria-label", "Copy command " + cmd);
          btn.classList.remove("is-copied");
        }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmd).then(confirm).catch(function () {
          cmdCopyFallback(cmd, confirm);
        });
      } else {
        cmdCopyFallback(cmd, confirm);
      }
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
    "fdi-linkedin-thesis-package.zip",
    "top-call-prompt-pack.zip",
  ];
  for (const f of assetFiles) {
    const from = path.join(EXPORTS, f);
    if (fs.existsSync(from)) copy(from, path.join(DIST, "assets", f));
  }

  // MarCom OS free starter pack (lead magnet) — built fresh from sources
  buildStarterPackZip();

  // deck slides
  const slidesDir = path.join(EXPORTS, "deck-slides");
  const slideFiles = fs
    .readdirSync(slidesDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  for (const f of slideFiles)
    copy(path.join(slidesDir, f), path.join(DIST, "assets", "deck-slides", f));

  // Field Guide 002 (Aggregated) images + deck
  const assetFiles002 = [
    "fg002-cover-1200x627.png",
    "viz-triopoly-2026-1200x680.png",
    "viz-reach-collapse-1200x640.png",
    "viz-answer-layer-1200x700.png",
    "fdi-field-guide-002-deck.pdf",
  ];
  for (const f of assetFiles002) {
    const from = path.join(EXPORTS002, f);
    if (fs.existsSync(from)) copy(from, path.join(DIST, "assets", f));
  }
  const slidesDir002 = path.join(EXPORTS002, "deck-slides");
  const slideFiles002 = fs.existsSync(slidesDir002)
    ? fs
        .readdirSync(slidesDir002)
        .filter((f) => f.endsWith(".png"))
        .sort()
    : [];
  for (const f of slideFiles002)
    copy(path.join(slidesDir002, f), path.join(DIST, "assets", "deck-slides-002", f));

  // Field Guide 003 (Decentralized) images + deck
  const assetFiles003 = [
    "fg003-cover-1200x627.png",
    "viz-protocol-ownership-1200x680.png",
    "viz-wallet-identity-1200x640.png",
    "viz-agent-settlement-1200x700.png",
    "fdi-field-guide-003-deck.pdf",
  ];
  for (const f of assetFiles003) {
    const from = path.join(EXPORTS003, f);
    if (fs.existsSync(from)) copy(from, path.join(DIST, "assets", f));
  }
  const slidesDir003 = path.join(EXPORTS003, "deck-slides");
  const slideFiles003 = fs.existsSync(slidesDir003)
    ? fs
        .readdirSync(slidesDir003)
        .filter((f) => f.endsWith(".png"))
        .sort()
    : [];
  for (const f of slideFiles003)
    copy(path.join(slidesDir003, f), path.join(DIST, "assets", "deck-slides-003", f));

  // Performance Thinking 02 (FDCP) images + deck
  const assetFilesFdcp = [
    "fdcp-cover-1280x720.png",
    "viz-fdcp-pod-1200x1500.png",
    "viz-four-dimensions-1200x1500.png",
    "viz-proof-stack-order-1200x1500.png",
    "viz-m2m-agentcards-1200x1500.png",
  ];
  for (const f of assetFilesFdcp) {
    const from = path.join(EXPORTSPT02, "images", f);
    if (fs.existsSync(from)) copy(from, path.join(DIST, "assets", f));
  }
  const fdcpPdf = path.join(EXPORTSPT02, "fdi-fdcp-deck.pdf");
  if (fs.existsSync(fdcpPdf)) copy(fdcpPdf, path.join(DIST, "assets", "fdi-fdcp-deck.pdf"));
  const slidesDirFdcp = path.join(EXPORTSPT02, "deck-slides");
  const slideFilesFdcp = fs.existsSync(slidesDirFdcp)
    ? fs
        .readdirSync(slidesDirFdcp)
        .filter((f) => f.endsWith(".png"))
        .sort()
    : [];
  for (const f of slideFilesFdcp)
    copy(path.join(slidesDirFdcp, f), path.join(DIST, "assets", "deck-slides-fdcp", f));

  // Field Guide 004 (Autonomous) images + deck
  const assetFiles004 = [
    "fg004-cover-1200x627.png",
    "viz-fg004-stack-1200x700.png",
    "fdi-field-guide-004-deck.pdf",
  ];
  for (const f of assetFiles004) {
    const from = path.join(EXPORTS004, f);
    if (fs.existsSync(from)) copy(from, path.join(DIST, "assets", f));
  }
  const slidesDir004 = path.join(EXPORTS004, "deck-slides");
  const slideFiles004 = fs.existsSync(slidesDir004)
    ? fs
        .readdirSync(slidesDir004)
        .filter((f) => f.endsWith(".png"))
        .sort()
    : [];
  for (const f of slideFiles004)
    copy(path.join(slidesDir004, f), path.join(DIST, "assets", "deck-slides-004", f));

  // Davos demo end-user journey screenshots (private page assets)
  const davosShots = path.join(SRC, "assets", "davos-demo");
  if (fs.existsSync(davosShots)) {
    for (const f of fs.readdirSync(davosShots).filter((f) => f.endsWith(".png"))) {
      copy(path.join(davosShots, f), path.join(DIST, "assets", "davos-demo", f));
    }
  }

  // static: css, js, favicon
  copy(path.join(SRC, "site.css"), path.join(DIST, "site.css"));
  fs.writeFileSync(path.join(DIST, "site.js"), SITE_JS);
  // engine interactivity — only loaded on /engine
  copy(path.join(SRC, "engine.js"), path.join(DIST, "engine.js"));
  const favicon = path.join(ROOT, "artifacts", "mockup-sandbox", "public", "favicon.svg");
  if (fs.existsSync(favicon)) copy(favicon, path.join(DIST, "favicon.svg"));

  return { slideFiles, slideFiles002, slideFiles003, slideFilesFdcp, slideFiles004 };
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

// Build the free MarCom OS starter-pack zip from exports/marcom-kit-lead-magnet/*.md.
// The zip is emitted to dist/assets/ so it is served publicly at
// /assets/fdi-marcom-starter-pack.zip — the URL referenced by the lead-magnet form.
// Building from sources at every build ensures the zip can never drift from the
// markdown copy (the near-miss that prompted this: the old product name was still
// inside the zip after a rename because only the static file was forgotten).
function buildStarterPackZip() {
  const srcDir = path.join(ROOT, "exports", "marcom-kit-lead-magnet");
  if (!fs.existsSync(srcDir)) {
    console.warn("[build] exports/marcom-kit-lead-magnet/ not found, skipping starter pack zip");
    return;
  }
  const outDir = path.join(DIST, "assets");
  const outZip = path.join(outDir, "fdi-marcom-starter-pack.zip");
  mkdir(outDir);
  rm(outZip);
  try {
    // Collect only .md files so stray editor artefacts or OS metadata never
    // slip into the download.
    const mdFiles = fs
      .readdirSync(srcDir)
      .filter((f) => f.endsWith(".md"))
      .sort();
    if (mdFiles.length === 0) {
      console.warn("[build] no .md files in marcom-kit-lead-magnet/, skipping starter pack zip");
      return;
    }
    execFileSync(
      "zip",
      ["-q", outZip, ...mdFiles],
      { cwd: srcDir, stdio: ["ignore", "ignore", "inherit"] },
    );
    const kb = Math.round(fs.statSync(outZip).size / 1024);
    console.log(`[build] starter pack → dist/assets/fdi-marcom-starter-pack.zip (${kb} KB)`);
  } catch (err) {
    console.warn("[build] starter pack zip build failed:", err.message);
  }
}

// Build the gated MarCom OS Tier 1 playbook package from exports/marcom-kit.
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
  // Refresh the Claude Skill's document copies from the canonical kit files
  // so the pre-built skill folder can never drift from the shipped documents.
  const skillDocsDir = path.join(
    srcDir, "claude-skill", "davos-decision-advisor", "documents",
  );
  const SKILL_DOCS = [
    "go-no-go-scorecard.md",
    "budget-calculator.md",
    "twelve-month-runway.md",
    "visibility-plan-templates.md",
    "worked-example.md",
  ];
  if (fs.existsSync(path.dirname(skillDocsDir))) {
    rm(skillDocsDir);
    mkdir(skillDocsDir);
    for (const f of SKILL_DOCS) {
      fs.copyFileSync(path.join(srcDir, f), path.join(skillDocsDir, f));
    }
  }
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
      "Marketing within today's platforms: Meta, Google, TikTok. And now the AI platforms like ChatGPT, where the rules for who gets seen are not yet understood.",
    definition:
      "An aggregated market is one where a few platforms (Meta, Google, TikTok) sit between makers and audiences and set the terms of discovery. Aggregated marketing is marketing within those platforms, plus the newest aggregators, AI platforms like ChatGPT, where how visibility is earned is not yet understood. The winning strategy is owning assets (a corpus, a provenance trail, a persistent identity) that keep their value when any platform changes the rules.",
    points: [
      {
        h: "The pattern",
        p: 'Three platforms are forecast to take <a href="https://www.emarketer.com/press-releases/meta-to-surpass-google-in-digital-ad-revenues-for-first-time-ever/" target="_blank" rel="noopener">62.3% of worldwide digital ad spending in 2026</a> (eMarketer), with Meta passing Google for the first time. Meanwhile the reach you thought you owned is a rounding error: the average Facebook page post reaches about <a href="https://www.socialinsider.io/blog/social-media-reach/" target="_blank" rel="noopener">1.65% of followers organically</a>, and on TikTok the Following feed delivers roughly 0.3% of views while the For You algorithm delivers 85.1%.',
      },
      {
        h: "The squeeze",
        p: 'Paying does not restore control. Meta\'s own <a href="https://www.prnewswire.com/news-releases/meta-reports-fourth-quarter-and-full-year-2025-results-302673127.html" target="_blank" rel="noopener">full-year 2025 results</a> report the average price per ad up 9% while impressions grew 12%. And the same structure is arriving one layer up: about <a href="https://www.bain.com/insights/goodbye-clicks-hello-ai-zero-click-search-redefines-marketing/" target="_blank" rel="noopener">60% of searches now end with no click</a> (Bain), and only about <a href="https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/" target="_blank" rel="noopener">1% of users click a source cited in an AI summary</a> (Pew Research Center). At the same time, 85% of business leaders are concerned that AI-generated content makes it harder to know what is credible ${cite(CITE.ftipa, "FT New Dimensions of Influence, 2026")}: the squeeze is not just on reach, it is on trust.',
      },
      {
        h: "The FDI answer",
        p: 'Master the platforms you can measure, and instrument the ones you cannot yet. Build owned systems whose value does not depend on any single channel: a graded corpus, verifiable provenance, and an identity legible to both people and machines. Ben Thompson\'s <a href="https://stratechery.com/aggregation-theory/" target="_blank" rel="noopener">Aggregation Theory</a> maps the trap; the durable countermove is owning assets the aggregator cannot revoke.',
      },
    ],
    guide: {
      href: "/field-guide-002",
      num: "Field Guide 002",
      title: "The Model Decides If You Exist",
      label: "Read Field Guide 002",
      note: "The Aggregated field guide is live: the full article, three data visuals, and the 13-slide deck.",
    },
    faqs: [
      {
        q: "Who controls digital ad spending in 2026?",
        a: "eMarketer forecasts that Meta, Google, and Amazon will take a combined 62.3% of worldwide digital ad spending in 2026, with Meta at $243.5 billion passing Google at $239.5 billion in ad revenue for the first time.",
      },
      {
        q: "What is average organic reach on Facebook, Instagram, and TikTok?",
        a: "Socialinsider's 2025 benchmarks put average organic reach per post at about 1.65% of followers on Facebook and 3.50% on Instagram. On TikTok, a 31,059-post traffic-source study by quso.ai found the For You algorithm delivers 85.1% of views while the Following feed delivers roughly 0.3%.",
      },
      {
        q: "How is AI search changing marketing?",
        a: "Bain finds roughly 60% of searches now end without a click to any website, and Pew Research Center found only about 1% of users click a source cited inside an AI summary. Discovery is moving behind AI answer layers, which is why FDI recommends owning a corpus and identity that models can retrieve, verify, and cite.",
      },
    ],
    kit: {
      name: "The Aggregator-Resilient Org",
      p: "In aggregated markets the org itself is the exposure: teams staffed around a single channel collapse when the algorithm turns. MarCom OS's Hourglass blueprint and Use, Compose, Build calculator structure the team around owned capabilities, so no aggregator rule change can zero out the operation.",
    },
  },
  decentralized: {
    slug: "decentralized",
    eyebrow: "The series · Decentralized markets",
    h1: "Decentralized",
    lede:
      "Marketing within crypto-powered networks — Farcaster, Lens, DAOs, onchain identity, and the agent settlement layer — where the participants own the rails and no single company controls the feed.",
    definition:
      "A decentralized market is one where the infrastructure is participant-owned: crypto-powered protocols, tokens, and onchain communities instead of one company's database. There is no feed to buy and no platform to petition. Reach is earned through verifiable contribution, and the durable marketing asset is an onchain identity — wallet, ENS name, attestations, and corpus — that travels across every network the brand enters.",
    points: [
      {
        h: "No feed to win",
        p: 'Discovery on <a href="https://www.farcaster.xyz" target="_blank" rel="noopener">Farcaster</a> and <a href="https://lens.xyz" target="_blank" rel="noopener">Lens</a> is distributed across open protocols and community channels. There is no advertising product to buy placement inside. Reach is earned through participation, contribution, and the on-chain reputation that accumulates from both.',
      },
      {
        h: "Wallet-based identity",
        p: 'A wallet address and its associated <a href="https://ens.domains" target="_blank" rel="noopener">ENS</a> name, attestations, and token holdings are the same across every EVM-compatible protocol. <b>brand.eth</b> resolves everywhere. SIWE (EIP-4361, implemented in <code>wevm/viem</code>) lets any application verify wallet ownership without storing a password or trusting a platform.',
      },
      {
        h: "The agent layer",
        p: 'Three open primitives are building the agent-to-agent commerce stack: <a href="https://github.com/coinbase/x402" target="_blank" rel="noopener"><code>coinbase/x402</code></a> for HTTP-native USDC payment, <a href="https://github.com/coinbase/agentkit" target="_blank" rel="noopener"><code>coinbase/agentkit</code></a> for managed agent wallets, and <a href="https://github.com/google-agentic-commerce/AP2" target="_blank" rel="noopener"><code>google-agentic-commerce/AP2</code></a> for pre-authorized payment mandates. Agents can now discover, verify, and pay for services onchain — no human in the loop.',
      },
    ],
    guide: {
      href: "/field-guide-003",
      num: "Field Guide 003",
      title: "The Network Is the Product",
      label: "Read Field Guide 003",
      note: "Field Guide 003 is live: the full argument for marketing within crypto-powered networks, six moves for the decentralized market, and the three agent-commerce primitives — with the 13-slide deck.",
    },
    faqs: [
      {
        q: "What is a decentralized market?",
        a: "A decentralized market is one where the infrastructure is owned by its participants: crypto-powered protocols, tokens, and onchain communities instead of one company's database. There is no single feed to buy and no platform to petition. Reach is earned through verifiable contribution, and the durable marketing asset is a portable, onchain identity.",
      },
      {
        q: "How do Farcaster and Lens differ from web2 social platforms?",
        a: "On Farcaster, the social graph and content are stored on a peer-to-peer Hub network — no single company controls or can censor them. On Lens, posts and follows are EVM smart contract transactions the brand interacts with directly, not records in a platform's database. Both have production-ready open-source SDKs (neynarxyz/nodejs-sdk and lens-protocol/lens-sdk, both MIT).",
      },
      {
        q: "What are x402, AgentKit, and AP2?",
        a: "Three open-source primitives for agent-to-agent commerce in crypto: x402 (coinbase/x402, MIT) implements HTTP-native USDC micropayments so an AI agent can pay for an API inline in the request — no billing accounts. AgentKit (coinbase/agentkit, MIT) gives an agent a managed Ethereum wallet. AP2 (google-agentic-commerce/AP2, Apache 2.0) defines a payment mandate an agent carries, pre-authorized by the user.",
      },
    ],
    kit: {
      name: "The Network-Native Org",
      p: "In decentralized markets the org operates across many participant-owned networks without a platform playbook. MarCom OS's Hourglass design and Riverbank governance give the team one set of brand rules and one source of truth that hold in every network it shows up in — and in every agent interaction that queries it.",
    },
  },
  autonomous: {
    slug: "autonomous",
    eyebrow: "The series · Autonomous markets",
    h1: "Autonomous",
    lede:
      "Agents transacting with agents. The open protocol stack (MCP → A2A → AP2 → x402) is live; the growth curve points toward marketplaces at the scale of Meta and Google today.",
    definition:
      "An autonomous market is one where software agents discover, evaluate, and transact with other agents on behalf of people. The open stack is already in production: MCP exposes callable tools, A2A lets agents find each other at runtime, AP2 authorizes payments with cryptographic proof of user intent, and x402 settles in stablecoins. Autonomous marketing is building the gated, citable, machine-legible interface those agents can call — before the compounding selection dynamics close the window.",
    points: [
      {
        h: "The pattern",
        p: 'The commerce protocols are live and open. On September 29, 2025, Stripe and OpenAI published <a href="https://stripe.com/blog/developing-an-open-standard-for-agentic-commerce" target="_blank" rel="noopener">ACP</a> and switched on agent checkout in ChatGPT for 700 million weekly users. Two weeks earlier, Google launched <a href="https://cloud.google.com/blog/products/ai-machine-learning/announcing-agents-to-payments-ap2-protocol" target="_blank" rel="noopener">AP2</a> with 60+ payments partners. The assumption that "a human is directly clicking buy" is already broken.',
      },
      {
        h: "The growth curve",
        p: "Selection, pricing, and reputation run at machine speed with no human latency in the loop. Small early advantages in machine-legibility and citation signals compound into structural moats — faster than the organic-reach collapse on social platforms, because the evaluation loop has no human slowdown.",
      },
      {
        h: "The FDI answer",
        p: 'Build the gated, citable, machine-legible interface agents can call: an <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener">MCP</a>-exposed corpus with provenance, structured so every answer carries its source and confidence. The same callable identity that agents verify over MCP is the identity that travels onchain through the crypto-settlement layer.',
      },
    ],
    guide: {
      href: "/field-guide-004",
      num: "Field Guide 004",
      title: "When the Buyer Is Software",
      label: "Read Field Guide 004",
      note: "Field Guide 004 is live: the full article on agent-market dynamics and the growth curve, three data visuals, and the 13-slide deck.",
    },
    kit: {
      name: "The Agent-Ready Org",
      p: "In autonomous markets your organization is judged by machines: agents route budget to operations they can query and verify. MarCom OS's Riverbank writes your brand rules so agents can enforce them, and the Hourglass puts human kill authority exactly where machine-speed output needs it.",
    },
    faqs: [
      {
        q: "What is agentic commerce and is it live yet?",
        a: "Agentic commerce is the purchase of goods and services by AI agents acting under delegated user authority. It is live: Stripe and OpenAI published the Agentic Commerce Protocol (ACP) in September 2025 and enabled agent checkout in ChatGPT for over 700 million weekly users. Google launched the Agent Payments Protocol (AP2) with 60+ partners including Mastercard, PayPal, and Coinbase the same month. Morgan Stanley reported roughly 23% of Americans had already made a purchase using AI by December 2025.",
      },
      {
        q: "What is the open agent protocol stack?",
        a: "Four Apache-licensed, foundation-governed standards now layer into an end-to-end agent commerce stack: MCP (Model Context Protocol) exposes tools and data as callable agent interfaces; A2A (Agent2Agent) lets agents discover and delegate to each other at runtime; AP2 (Agent Payments Protocol) authorizes payments with cryptographically signed user mandates; and x402 enables stablecoin settlement over standard HTTP. All four are under Linux Foundation governance.",
      },
    ],
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
        ${c.guide
          ? `<a class="btn btn-primary" href="${c.guide.href}">${c.guide.label} <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="#waitlist">Join the waitlist</a>`
          : `<a class="btn btn-primary" href="#waitlist">Join the waitlist <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="/field-guide">Read the Field Guide</a>`}
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
        <div class="card-foot"><a class="link-arrow" href="/marcom-kit">See MarCom OS <span class="arrow">→</span></a></div>
      </article>
      <article class="card">
        <span class="tag">Structure as code</span>
        <h3>Blueprints, not slide decks</h3>
        <p>MarCom OS ships the Hourglass org blueprint, the Use, Compose, Build capability calculator, and the Riverbank governance system as editable working documents, with a free starter pack to try before you buy.</p>
        <div class="card-foot"><a class="link-arrow" href="/marcom-kit#starter-pack">Get the free starter pack <span class="arrow">→</span></a></div>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="continue-the-series">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Continue the series</span>
      <h2>The other two markets.</h2>
      <p>Each market has a one-pager and a full field guide. Move through the series in any order.</p>
    </div>
    <div class="grid cols-2">
      ${Object.keys(CONCEPTS)
        .filter((k) => k !== key)
        .map((k) => {
          const s = CONCEPTS[k];
          const links = s.guide
            ? `<a class="link-arrow" href="${s.guide.href}">${s.guide.label}: ${s.guide.title} <span class="arrow">→</span></a><br /><a class="link-arrow" href="/${s.slug}">Read the ${s.h1} one-pager <span class="arrow">→</span></a>`
            : `<a class="link-arrow" href="/${s.slug}">Read the ${s.h1} one-pager <span class="arrow">→</span></a>`;
          return `<article class="card">${s.guide ? `<span class="pill">${s.guide.num} · Live</span>` : `<span class="tag">${s.h1}</span>`}<h3>${s.h1} markets</h3><p>${s.lede}</p><div class="card-foot">${links}</div></article>`;
        })
        .join("\n      ")}
    </div>
  </div>
</section>

${key === "autonomous" ? `<hr class="divider" />

<section class="section">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The Open Cartography Lab</span>
      <h2>Bring your autonomous-market numbers to the agent.</h2>
      <p>A public community where growth-modeling questions get computed answers: the retention curve, the stated assumptions, and the two levers to pull first. Agent economy, node decay, CAC defensibility. Free. No paywall.</p>
    </div>
    <div class="hero-cta" style="margin-top:0;">
      <a class="btn btn-primary" href="/community">Join the Lab <span class="arrow">→</span></a>
    </div>
  </div>
</section>` : ""}

<hr class="divider" />

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Join the waitlist</span>
      ${c.guide
        ? `<h2>The ${c.h1} field guide is live. Get the next one first.</h2>
      <p>${c.guide.note} Drop your email to follow the series and we'll reach out the day the next guide ships. No spam.</p>`
        : `<h2>Get the ${c.h1} field guide the day it ships.</h2>
      <p>Drop your email to follow the series. We'll reach out when the ${c.h1} field guide and its working code are live. No spam.</p>`}
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
      ...(c.faqs || []),
    ]),
    body,
    canonical: `${SITE_URL}/${c.slug}`,
  });
}

function seriesPage() {
  const card = (key) => {
    const c = CONCEPTS[key];
    const status = c.guide
      ? `<span class="pill">${c.guide.num} · Live</span>`
      : `<span class="tag">${c.h1}</span>`;
    const foot = c.guide
      ? `<a class="link-arrow" href="${c.guide.href}">${c.guide.label}: ${c.guide.title} <span class="arrow">→</span></a><br /><a class="link-arrow" href="/${c.slug}">Read the ${c.h1} one-pager <span class="arrow">→</span></a>`
      : `<a class="link-arrow" href="/${c.slug}">Read the one-pager <span class="arrow">→</span></a>`;
    return `<article class="card${c.guide ? " featured" : ""}">${status}<h3>${c.h1} markets</h3><p>${c.lede}</p><div class="card-foot">${foot}</div></article>`;
  };
  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">The series · As of ${AS_OF}</span>
      <h1>Aggregated. Decentralized. <em>Autonomous.</em></h1>
      <p class="lede">Three market structures are reshaping marketing: today's platforms and the AI platforms whose rules are not yet understood, crypto-powered decentralized networks, and agent-to-agent marketplaces scaling toward the size of Meta and Google. All three field guides are live, each grounded in working code that proves the thesis.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#guides">Read the guides <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="/field-guide">Start with Field Guide 001</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="section" id="guides">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Three market structures</span>
      <h2>One thesis, three field guides. All live.</h2>
      <p>Each guide maps a market structure and grounds it in a real, working build you can pressure-test. Read the full guide, or start with the market's one-pager.</p>
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
      <p>All three guides are live. Drop your email and we'll reach out as the series grows: new guides, updated data, and the working code that ships with each one. No spam.</p>
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
      "The FDI series maps three market structures reshaping marketing: aggregated (today's platforms plus AI platforms like ChatGPT), decentralized (crypto-powered networks), and autonomous (agents transacting with agents), each grounded in working code.",
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
          status: "Live",
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

/* ---------------- COMMUNITY: OPEN CARTOGRAPHY LAB ---------------- */
function communityPage() {
  const enterCta = COMMUNITY_LIVE
    ? `<a class="btn btn-primary" href="${COMMUNITY_URL}" rel="noopener">Enter the Lab <span class="arrow">→</span></a>`
    : `<a class="btn btn-primary" href="#waitlist">Join the waitlist <span class="arrow">→</span></a>`;

  const EXAMPLE_EXCHANGES = [
    {
      q: "We have 8% monthly churn on 4,200 paying users. We add 300 new users a month at $38 CAC. Where does the network stabilize and is the CAC defensible?",
      a: "At 8% monthly churn with 300 new users entering, equilibrium sits at roughly 3,750 active users (300 / 0.08). You are above that today, so the network is contracting toward that floor, not growing. CAC defensibility depends on LTV: if average revenue per user per month is at least $3.80 (a 10x LTV/CAC ratio in 10 months), the economics hold at equilibrium. Below that, each replacement user costs more than the cohort earns before it churns. The model flags two levers: cut churn below 6.7% to stabilize at current scale, or raise new user volume above 420/month to grow through the decay.",
      label: "Churn floor"
    },
    {
      q: "Token network. Day-1 retention 25%, day-7 retention 12%, day-30 retention 6%. We are planning a 50,000-node airdrop event on day 15 of a 90-day window. Model the sustained node count versus a steady 500-node/day drip.",
      a: "The airdrop spike lands hard and decays fast. By day 30, the 50k event contributes roughly 3,000 surviving nodes (6% day-30 retention). The steady 500/day drip at the same 6% day-30 rate has already compounded to about 4,200 nodes by that same date and keeps compounding. By day 60, drip beats spike by nearly 2x on sustained Daily Active Nodes. Airdrop economics are not wrong: they are a liquidity event, not a retention strategy. The model recommends treating the event as a search-and-filter mechanism: identify the 6% who stay and optimize onboarding for that cohort, not the 94% who leave.",
      label: "Airdrop vs drip"
    },
    {
      q: "Agent marketplace. CPO (cost per onboarded agent) is $0.12 via API subsidy. Micro-transaction volume averages $0.004 per agent per day. What daily agent acquisition rate makes this break-even in 90 days?",
      a: "An agent retained for 90 days at $0.004/day generates $0.36 in transaction volume. CPO is $0.12, so a retained agent is profitable at 3x by day 90. The problem is retention: at typical early autonomous-market decay (day-1 30%, day-30 8%), an agent acquired today contributes roughly $0.11 in cumulative volume by day 90, just below CPO. Break-even requires either holding day-30 retention at 10% or above, or reducing CPO below $0.09. The model runs both levers and plots the break-even frontier. At your current numbers, 200 new agents per day generates a network that crosses break-even at month 4, not month 3.",
      label: "Agent economy"
    }
  ];

  const examplesHtml = EXAMPLE_EXCHANGES.map(
    (ex, i) => `<div class="lab-exchange">
      <div class="lab-q"><span class="lab-tag">Question ${i + 1} ${ex.label ? "/ " + ex.label : ""}</span><p>${ex.q}</p></div>
      <div class="lab-a"><span class="lab-tag agent">Growth Cartography Agent</span><p>${ex.a}</p></div>
    </div>`
  ).join("\n");

  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">Growth Cartography</span>
      <h1>The Open <em>Cartography Lab</em>.</h1>
      <p class="lede">A public, agent-staffed community where every growth-modeling question gets a modeled answer with curves, stated assumptions, and sensitivity notes, as a citable thread you can link, verify, and build on.</p>
      <div class="hero-cta">
        ${enterCta}
        <a class="btn btn-ghost" href="#charter">Read the charter</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="statband" aria-label="Why an owned community">
  <div class="wrap">
    <div class="stat"><div class="k"><span class="amber">Ring 1</span></div><div class="l">The Lab. Public channels where anyone can post a growth scenario and receive a modeled answer from the resident agent.</div></div>
    <div class="stat"><div class="k">Ring 2</div><div class="l">The Guild (later phase). Members register their own agents, and FDI publishes the observed autonomous-market dynamics as research.</div></div>
    <div class="stat"><div class="k"><span class="amber">Owned</span></div><div class="l">Self-hosted on an open-source relay (Buzz, by Block). Not a platform. Not a Discord. Every thread is a signed, permanent, citable record.</div></div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="agent">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Resident Staff</span>
      <h2>The Growth Cartography Agent.</h2>
      <p>Always-on. Every answer is computed, not composed. The agent parses the scenario, runs the compounding cohort-decay model (the same engine that powers the System Dynamics Engine), and replies with the retention curve, the stated assumptions it used, and two or three sensitivity observations. It does not guess. When it cannot parse the scenario, it asks for the missing parameters.</p>
    </div>
    <div class="grid cols-2">
      <article class="card">
        <span class="tag">What it answers</span>
        <h3>Growth-modeling questions</h3>
        <p>Churn floors. CAC defensibility. Cohort maturity timelines. Airdrop vs drip dynamics. Agent-economy break-even. Any scenario that has a unit (users, nodes, agents), an acquisition rate, and a retention profile.</p>
      </article>
      <article class="card">
        <span class="tag">What it always shows</span>
        <h3>Receipts, not assertions</h3>
        <p>The parameters it used, the equilibrium it calculated, the curve it generated, and the two or three levers it would pull first. Every answer is a thread. Every thread is citable. The work is in the open.</p>
      </article>
      <article class="card">
        <span class="tag">What it does not do</span>
        <h3>Fabricate or forecast</h3>
        <p>The model is a cohort-decay engine, not a trend predictor. It tells you where the math points given your numbers, not what your numbers will be. The assumptions are stated. The model is deterministic.</p>
      </article>
      <article class="card">
        <span class="tag">The infrastructure</span>
        <h3>Signal as signed events</h3>
        <p>The community runs on a self-hosted Buzz relay (open-source, by Block). Every message is a cryptographically signed Nostr event. No algorithm decides what you see. No platform decides what stays.</p>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="examples">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Worked Examples</span>
      <h2>What a Lab thread looks like.</h2>
      <p>Three example exchanges from the three markets in the FDI series. Aggregated (user-cohort SaaS), Decentralized (token network), and Autonomous (agent economy). The agent answers with numbers, curves, and the lever it would pull first.</p>
    </div>
    <div class="lab-exchanges">
      ${examplesHtml}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section rotated" id="charter">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Community Charter</span>
      <h2>What the Lab is, and is not.</h2>
    </div>
    <div class="grid cols-2">
      <div>
        <h3>What it is</h3>
        <ul class="check-list">
          <li>A public workspace for growth modeling across aggregated, decentralized, and autonomous markets.</li>
          <li>An always-on agent that answers modeling questions with computed curves and stated assumptions.</li>
          <li>A citable, permanent record of every exchange, signed to a keypair, not a platform account.</li>
          <li>Free. No paywall. No waitlist gatekeeping for Ring 1. The agent answers everyone.</li>
        </ul>
      </div>
      <div>
        <h3>House rules</h3>
        <ul class="check-list">
          <li>Bring a real scenario with real numbers. The agent cannot model vague directions.</li>
          <li>Cite your threads. That is the point: public, verifiable, linkable work.</li>
          <li>No promotion. The community is for modeling, not distribution.</li>
          <li>The agent's answers reflect its model, not investment or legal advice.</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="waitlist">
  <div class="wrap" style="max-width:640px;margin:0 auto;text-align:center;">
    <span class="eyebrow">Get Early Access</span>
    ${COMMUNITY_LIVE
      ? `<h2>The Lab is open.</h2><p>Connect directly or leave your email to receive onboarding notes and context on how to get the most out of the agent.</p>`
      : `<h2>Join the waitlist.</h2><p>The Lab is being set up. Leave your email and we will send you the onboarding link when the first ring opens, plus context on what to bring to the agent.</p>`}
    <form class="waitlist js-capture" data-source="community" data-subject="Open Cartography Lab waitlist" data-success="Almost there. Check your inbox and click the confirmation link to join the waitlist." data-mail-body="Please add me to the Open Cartography Lab waitlist." novalidate style="margin-top:28px;">
      <label class="sr-only" for="comm-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
      ${HONEYPOT}
      <input type="email" id="comm-email" name="email" placeholder="you@company.com" autocomplete="email" required />
      <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
    </form>
    <p class="form-msg" role="status" aria-live="polite"></p>
    <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    ${COMMUNITY_LIVE ? `<div style="margin-top:28px;"><a class="btn btn-ghost" href="${COMMUNITY_URL}" rel="noopener">Enter the Lab now <span class="arrow">→</span></a></div>` : ""}
  </div>
</section>`;

  return page({
    title: "The Open Cartography Lab | False Dawn Industries",
    description:
      "A public, agent-staffed community where growth-modeling questions get computed answers with curves, stated assumptions, and sensitivity notes, as citable threads on an owned relay.",
    active: "community",
    body,
    canonical: `${SITE_URL}/community`,
    jsonLd: [
      orgJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "CommunityForum",
        name: "The Open Cartography Lab",
        url: `${SITE_URL}/community`,
        description:
          "A public, agent-staffed community for growth modeling across aggregated, decentralized, and autonomous markets. Powered by a self-hosted Buzz relay.",
        publisher: { "@type": "Organization", name: "False Dawn Industries", url: `${SITE_URL}/` },
      },
    ],
  });
}

/* Plain-text guide for AI crawlers and LLMs (served at /llms.txt). */
function llmsTxt() {
  return `# False Dawn Industries (FDI)

> False Dawn Industries builds owned marketing systems for aggregated, decentralized, and autonomous markets: a persistent identity and corpus you can prove. As of ${AS_OF}.

False Dawn Industries (FDI) publishes the Field Guide thesis and ships working products that let organizations own their place in AI-mediated markets.

## Products
- MarCom OS (${SITE_URL}/marcom-kit): the flagship. The blueprint for an AI-era marketing organization: the Hourglass org design, the Use, Compose, Build capability calculator, and the Riverbank governance system, shipped as a working kit of templates, calculators, and checklists. Structure as code. A free starter pack is available on the page.
- SkillFoundry (${SITE_URL}/skillfoundry): the kit's running enforcement engine and a standalone strategic firewall for content. A plugin built on the open Model Context Protocol (MCP) that routes any asset through three Signal-to-Value gates (Relevance, Performance, and Algorithmic Signal) and returns the optimized asset plus a structured audit. Strategy as code.

## The Field Guide
- Build the Machine, Not the Ad (${SITE_URL}/field-guide): the FDI thesis on owned marketing systems, with the launch deck and working-code proof.
- The Model Decides If You Exist (${SITE_URL}/field-guide-002): Field Guide 002 on the aggregated market. Three platforms are forecast to take 62.3% of worldwide digital ad spending in 2026 (eMarketer), organic reach is a rounding error, and AI answer layers absorb the click; the response is owning an identity and corpus machines can retrieve, verify, and cite. Includes three data visuals and a 13-slide deck.
- The Network Is the Product (${SITE_URL}/field-guide-003): Field Guide 003 on the decentralized market. In crypto-powered networks (Farcaster, Lens, DAOs) there is no feed to buy and no platform to petition — reach is earned through verifiable onchain contribution. Wallet-based identity (ENS + SIWE via wevm/viem) is the portable reputation substrate. Includes the agent-commerce primitives (coinbase/x402, coinbase/agentkit, google-agentic-commerce/AP2), four visuals, and a 13-slide deck.
- When the Buyer Is Software (${SITE_URL}/field-guide-004): Field Guide 004 on the autonomous market. Agents transacting with agents on the live open protocol stack (MCP, A2A, AP2, x402): agent-market dynamics, the growth curve toward marketplaces at the scale of Meta and Google today, and why machine-legibility advantages compound at machine speed. Includes three data visuals and a 13-slide deck.
- The Forward-Deployed Communicator (${SITE_URL}/fdcp): the Performance Thinking report on the Forward-Deployed Communications Professional (FDCP), the operator role for agent-mediated markets. One person, a fleet of AI agents on a governed platform, and ownership of the whole workflow: loop engineering, policy as code, a receipts-first proof stack, and machine-to-machine communications. Includes four visuals and a 12-slide deck.

## The series
- Aggregated markets (${SITE_URL}/aggregated): marketing within today's platforms (Meta, Google, TikTok) plus what is not yet understood about AI platforms like ChatGPT; own assets that survive rule changes. Field Guide 002 covers this market in full.
- Decentralized markets (${SITE_URL}/decentralized): marketing within crypto-powered decentralized networks (Farcaster, Lens, DAOs, onchain identity, agent settlement). Field Guide 003 covers this market in full.
- Autonomous markets (${SITE_URL}/autonomous): agents transacting with agents; the dynamics and growth curve as those marketplaces scale toward the size of Meta and Google today. Field Guide 004 covers this market in full.

## The System Dynamics Engine
- Growth Engine (${SITE_URL}/engine): an interactive, browser-native cohort-decay modelling tool. Model compounding network liquidity targets, volatility versus steady acquisition, and cohort maturity value extraction across three market paradigms (Aggregated/SaaS, Decentralized/Web3, Autonomous AI). Enter a growth goal and get a personalised PDF Growth Report by email. Free. No login required.

## The Open Cartography Lab
- Community (${SITE_URL}/community): a public, agent-staffed community where growth-modeling questions get computed answers with curves, stated assumptions, and sensitivity notes, as citable threads on a self-hosted relay. The resident Growth Cartography Agent wraps the FDI System Dynamics Engine (compounding cohort-decay model). Free. No paywall.

## Workshops
- The Cartographers' Table (${SITE_URL}/workshop): a four-part in-person workshop series that runs the FDI thesis live. Each session produces one real artifact for a real client: an answer object (Session 1), a knowledge graph (Session 2), a tool-call spec (Session 3). Session 1 (Aggregated) is the flagship and cleanest standalone entry point.

## Notes
- Model Context Protocol (MCP) is an open standard documented at ${MCP_URL}. FDI is not affiliated with or endorsed by Anthropic.
- Buzz is an open-source relay by Block, Inc. FDI is not affiliated with or endorsed by Block.
- Contact: ${CONTACT}
`;
}

/* ---------------- ENGINE PAGE (/engine) ----------------
 * Interactive System Dynamics Engine: cohort-decay modelling for SaaS,
 * Web3, and Autonomous AI markets. Serves as a lead magnet; visitors
 * configure a growth scenario and exchange their email for a PDF report. */
function enginePage() {
  const sliderRow = (id, label, min, max, step, def, unit) => {
    const numId = `${id}-num`;
    const unitHtml = unit ? ` <span style="color:var(--muted);font-size:10px;">(${unit})</span>` : "";
    return `<div class="eng-input-row">
      <label class="eng-input-label" for="${id}">${label}${unitHtml}</label>
      <div class="eng-slider-pair">
        <input type="range" class="eng-slider" id="${id}" min="${min}" max="${max}" step="${step}" value="${def}" aria-label="${label}" />
        <input type="number" class="eng-num" id="${numId}" min="${min}" max="${max}" step="${step}" value="${def}" aria-label="${label} value" />
      </div>
    </div>`;
  };

  const outCard = (id, label) => `<div class="eng-output-card">
    <div class="eng-out-label">${label}</div>
    <div class="eng-out-value" id="${id}">—</div>
  </div>`;

  const retAdv = (prefix, r1 = 82, r7 = 55, r30 = 32) => `<div class="eng-advanced">
    <button type="button" class="eng-advanced-toggle" aria-expanded="false"
      onclick="var c=document.getElementById('${prefix}-adv');var open=c.hidden;c.hidden=!open;this.textContent=(open?'▾':'▸')+' Retention curve anchors';">
      ▸ Retention curve anchors
    </button>
    <div class="eng-advanced-content" id="${prefix}-adv" hidden>
      ${sliderRow(`${prefix}-r1`, "Day 1 retention (%)", 0, 100, 1, r1)}
      ${sliderRow(`${prefix}-r7`, "Day 7 retention (%)", 0, 100, 1, r7)}
      ${sliderRow(`${prefix}-r30`, "Day 30 retention (%)", 0, 100, 1, r30)}
    </div>
  </div>`;

  const body = `
<section class="eng-hero">
  <div class="wrap">
    <span class="eyebrow">Growth Cartography · System Dynamics Engine</span>
    <h1>Model your network <em>before you build it</em>.</h1>
    <p class="lede">Enter your growth parameters and see the math: how cohorts decay, how stability beats spikes, and how many units you actually need to hit your target. Then get your personalised Growth Report.</p>

    <div class="eng-paradigm" role="group" aria-label="Select market paradigm">
      <button class="eng-par-btn active" data-paradigm="saas" type="button">Aggregated / SaaS</button>
      <button class="eng-par-btn" data-paradigm="web3" type="button">Decentralized / Web3</button>
      <button class="eng-par-btn" data-paradigm="autonomous" type="button">Autonomous AI</button>
    </div>

    <div class="eng-goal-wrap">
      <label class="eng-goal-label" for="eng-goal">What&rsquo;s your growth goal?</label>
      <textarea class="eng-goal-input" id="eng-goal" placeholder="e.g. Reach 10K daily active users in 90 days, reduce churn below 20%, or launch in a new vertical&hellip;" rows="2"></textarea>
    </div>
  </div>
</section>

<section class="eng-tabs-section">
  <div class="wrap">
    <div class="eng-tabs" role="tablist" aria-label="Engine tabs">
      <button class="eng-tab active" role="tab" aria-selected="true" data-tab="0">
        <span class="eng-tab-num">01</span> Network Liquidity Target
      </button>
      <button class="eng-tab" role="tab" aria-selected="false" data-tab="1">
        <span class="eng-tab-num">02</span> Volatility vs. Stability
      </button>
      <button class="eng-tab" role="tab" aria-selected="false" data-tab="2">
        <span class="eng-tab-num">03</span> Cohort Maturity &amp; Value
      </button>
    </div>

    <!-- Tab 0: Network Liquidity Target -->
    <div class="eng-panel active" data-panel="0" role="tabpanel">
      <p class="eng-panel-desc">Enter a target <span data-par-label="unitLabelPlural">Daily Active Users</span>, a timeline, and a cost-per-unit. The engine back-calculates how many new units per day you need and the total capital required, accounting for cohort decay.</p>
      <div class="eng-panel-grid">
        <div class="eng-inputs">
          ${sliderRow("t0-target-dau", '<span data-par-label="unitLabel">DAU</span> target', 0, 100000, 500, 10000, "units")}
          ${sliderRow("t0-timeline", "Timeline (days)", 1, 365, 1, 90)}
          ${sliderRow("t0-cost", '<span data-par-label="acqLabel">CAC</span> cost per unit', 0, 5000, 5, 45, "$")}
          ${retAdv("t0")}
        </div>
        <div class="eng-outputs">
          ${outCard("t0-out-units", '<span data-par-label="unitLabel">DAU</span> units required')}
          ${outCard("t0-out-new-per-day", "New units / day required")}
          ${outCard("t0-out-capital", "Total capital required")}
          <div class="eng-chart" id="t0-chart">
            <div class="eng-chart-label">Retention decay curve (day 0–60)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 1: Volatility vs. Stability -->
    <div class="eng-panel" data-panel="1" role="tabpanel" hidden>
      <p class="eng-panel-desc">Compare a steady daily drip against a one-day spike of the same total volume. The chart shows how network size diverges &mdash; and why spikes are a poor substitute for compounding acquisition.</p>
      <div class="eng-panel-grid">
        <div class="eng-inputs">
          ${sliderRow("t1-base", "Steady drip (units / day)", 1, 5000, 10, 80)}
          ${sliderRow("t1-spike-day", "Spike occurs on day&hellip;", 0, 89, 1, 0)}
          ${sliderRow("t1-horizon", "Horizon (days)", 7, 180, 1, 60)}
          ${retAdv("t1")}
        </div>
        <div class="eng-outputs">
          ${outCard("t1-out-stable", 'Steady <span data-par-label="unitLabel">DAU</span> at horizon')}
          ${outCard("t1-out-vol", 'Spike <span data-par-label="unitLabel">DAU</span> at horizon')}
          ${outCard("t1-out-delta", "Difference (steady minus spike)")}
          <div class="eng-chart" id="t1-chart">
            <div class="eng-chart-label">Cumulative network size — steady vs. spike</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Cohort Maturity & Value -->
    <div class="eng-panel" data-panel="2" role="tabpanel" hidden>
      <p class="eng-panel-desc">Model the cohort maturity threshold: units that have survived past your milestone unlock yield. Adjust new units per day, the maturity milestone, and the yield rate to project aged <span data-par-label="unitLabel">DAU</span> and total revenue.</p>
      <div class="eng-panel-grid">
        <div class="eng-inputs">
          ${sliderRow("t2-new-per-day", "New units per day", 1, 5000, 10, 100)}
          ${sliderRow("t2-maturity", "Maturity milestone (days)", 1, 180, 1, 30)}
          ${sliderRow("t2-yield-rate", "Yield rate (%)", 0, 100, 1, 12, "%")}
          ${sliderRow("t2-yield-value", '<span data-par-label="valueLabel">LTV</span> / unit / day', 0, 500, 0.5, 49, "$")}
          ${sliderRow("t2-horizon", "Horizon (days)", 7, 365, 1, 90)}
          ${retAdv("t2")}
        </div>
        <div class="eng-outputs">
          ${outCard("t2-out-aged", 'Matured <span data-par-label="unitLabel">DAU</span> at horizon')}
          ${outCard("t2-out-daily-rev", "Revenue / day (at horizon)")}
          ${outCard("t2-out-revenue", "Projected total revenue")}
          <div class="eng-chart" id="t2-chart">
            <div class="eng-chart-label">Total vs. matured <span data-par-label="unitLabel">DAU</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="eng-cta-inline" id="get-report">
  <div class="wrap">
    <div class="eng-cta-inner">
      <div class="eng-cta-copy">
        <span class="eyebrow">Get your Growth Report</span>
        <h2>Take the model with you.</h2>
        <p>Enter your email and we&rsquo;ll send a personalised PDF Growth Report: your session summary, the three headline metrics from your scenario, and one concrete tactic per market type matched to your stated goal.</p>
        <p style="color:var(--muted);font-size:13px;margin-top:10px;">Directional, not predictive. Assumptions are explicit in the report. Not financial advice.</p>
      </div>
      <div class="eng-cta-form-wrap">
        <div class="eng-out-label" style="margin-bottom:16px;">Your personalised Growth Report, emailed to you</div>
        <form class="eng-cta-form" novalidate>
          ${HONEYPOT}
          <label style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);" for="eng-cta-email">Email address</label>
          <input type="email" id="eng-cta-email" name="email" class="eng-cta-email" placeholder="you@company.com" autocomplete="email" required />
          <button class="btn btn-primary" type="submit">Get my Growth Report <span class="arrow">&rarr;</span></button>
        </form>
        <p class="eng-form-msg" role="status" aria-live="polite" style="margin-top:14px;font-family:'JetBrains Mono',monospace;font-size:12.5px;min-height:1.4em;"></p>
        <p class="eng-cta-note" style="margin-top:12px;">Confirmation email first, then the report. One click, no spam.</p>
      </div>
    </div>
  </div>
</section>

<div class="eng-sticky-cta">
  <span style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--faded);flex:1;">Run your scenario</span>
  <a class="btn btn-primary" href="#get-report" style="padding:10px 18px;font-size:13px;">Get report <span class="arrow">&rarr;</span></a>
</div>`;

  return page({
    title: "System Dynamics Engine | False Dawn Industries",
    description:
      "Model compounding cohort decay across SaaS, Web3, and Autonomous AI markets. Enter your growth parameters and get a personalised PDF Growth Report.",
    active: "engine",
    body,
    canonical: `${SITE_URL}/engine`,
    extraHead: `<script src="/engine.js" defer></script>`,
    jsonLd: [
      orgJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "FDI System Dynamics Engine",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser (cross-platform)",
        url: `${SITE_URL}/engine`,
        description:
          "Interactive cohort-decay modelling tool for SaaS, Web3, and Autonomous AI markets. Free. No login required.",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: {
          "@type": "Organization",
          name: "False Dawn Industries",
          url: `${SITE_URL}/`,
        },
      },
    ],
  });
}

/* ---------------- WORKSHOP PAGE (/workshop) ----------------
 * The Cartographers' Table: a four-part in-person workshop series that runs the
 * FDI thesis live. Feeds the existing waitlist via data-source="workshop". */

function workshopPage() {
  const SESSIONS = [
    {
      num: "0",
      title: "The Terrain: Build the Machine, Not the Ad",
      tag: "Session 0",
      maps: "The thesis and diagnosis",
      artifact: "A one-page map of where your marketing rents reach versus owning a system",
      next: "The Field Guide and the free Top Call prompt pack",
    },
    {
      num: "1",
      title: "Aggregated: Become the Answer the Machine Cites",
      tag: "Session 1 / Flagship",
      maps: "Aggregated market",
      artifact: "One graded source list and one owned answer object for a real high-intent question",
      next: "SkillFoundry source-authority grading as repeatable code",
    },
    {
      num: "2",
      title: "Decentralized: Turn Scattered Knowledge into an Owned Graph",
      tag: "Session 2",
      maps: "Decentralized market",
      artifact: "A hand-drawn mini knowledge graph of one entity's relationships",
      next: "SkillFoundry and the Top Call graph layer",
    },
    {
      num: "3",
      title: "Autonomous: Make Your System Something an Agent Can Trust",
      tag: "Session 3",
      maps: "Autonomous market",
      artifact: "A spec for one tool call an agent could make against your system, with trust boundaries",
      next: "Top Call MCP interface and SkillFoundry Tier 2/3",
    },
  ];

  const sessionsHtml = SESSIONS.map(
    (s) => `<article class="card">
      <span class="tag">${s.tag}</span>
      <h3>${s.title}</h3>
      <p><strong>Maps to:</strong> ${s.maps}</p>
      <p><strong>You build:</strong> ${s.artifact}</p>
      <p><strong>Opens:</strong> ${s.next}</p>
    </article>`
  ).join("\n");

  const BEATS = [
    { n: "1", title: "Arrival and capture", time: "15 min", note: "Name tags, table tents, QR scan, coffee" },
    { n: "2", title: "Cold open", time: "15 min", note: "One live demonstration of the problem for this market" },
    { n: "3", title: "The map", time: "20 min", note: "Short teach: the FDI framing for this market from the Field Guide" },
    { n: "4", title: "The build", time: "55 min", note: "You produce one real artifact for a real client, in pairs" },
    { n: "5", title: "The share", time: "20 min", note: "Three or four attendees show their artifact; facilitator reacts" },
    { n: "6", title: "The bridge", time: "15 min", note: "The by-hand artifact, made repeatable and provable. Live product moment." },
    { n: "7", title: "Exit ticket and close", time: "10 min", note: "Thesis-validation vote, exit card, and the next-session tease" },
  ];

  const beatsHtml = BEATS.map(
    (b) => `<div class="timeline-beat">
      <div class="beat-num">${b.n}</div>
      <div class="beat-body">
        <strong>${b.title}</strong> <span class="beat-time">${b.time}</span>
        <p>${b.note}</p>
      </div>
    </div>`
  ).join("\n");

  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">Growth Cartography</span>
      <h1>The <em>Cartographers' Table</em>.</h1>
      <p class="lede">A curated cohort of senior marketing leaders navigating the same shift, in the same room. The sessions deliver a real artifact for a real client, every time. The peer network is what makes you come back: a named cohort of AI-forward practitioners building owned systems alongside you.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#register">Register your interest <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="#sessions">See the sessions</a>
      </div>
    </div>
    <div class="hero-machine">${MACHINE}</div>
  </div>
</section>

<section class="statband" aria-label="Workshop at a glance">
  <div class="wrap">
    <div class="stat"><div class="k"><span class="amber">4</span></div><div class="l">Sessions. One per market: the thesis, Aggregated, Decentralized, and Autonomous. Attend one or the full season.</div></div>
    <div class="stat"><div class="k">2.5 hr</div><div class="l">Per session. Seven-beat spine, same structure every time. Only the market and the artifact change.</div></div>
    <div class="stat"><div class="k"><span class="amber">1</span></div><div class="l">Real artifact per session. Built in the room, for a real client, in pairs. You leave with the work done.</div></div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="why">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Why it works</span>
      <h2>The peer network is the product.</h2>
      <p>The session content gives every attendee a credible reason to be in the room: a working methodology, a real artifact, proof they did something. FT research found four in five senior leaders say trusted sources are now more important for strategic decisions than two years ago, and they are five times more likely to rely on a trusted peer than an AI tool or social feed. ${cite(CITE.ftipa, "FT New Dimensions of Influence, 2026")} The Table is that peer group.</p>
    </div>
    <div class="grid cols-2">
      <article class="card">
        <span class="tag">The peer cohort</span>
        <h3>A curated cohort of senior marketing leaders</h3>
        <p>Returning attendees become "the Table" for that city: a standing peer group of AI-forward strategists navigating the same shift. The methodology is the entry ticket. The cohort is what compounds. Belonging is a return force that a one-off content event never earns.</p>
      </article>
      <article class="card">
        <span class="tag">The credibility signal</span>
        <h3>Content that justifies the room</h3>
        <p>The sessions are not the product; they are the reason the room is credible. Each session delivers one real artifact for a real client: something attendees can show, not just describe. The content earns the peer trust. The peer trust earns the return.</p>
      </article>
      <article class="card">
        <span class="tag">Artifacts that stack</span>
        <h3>One system, built across four sessions</h3>
        <p>Session 1's answer object becomes a node in Session 2's graph, which becomes a callable tool in Session 3's agent spec. Miss a session and your system has a hole. Attend the season and you walk away with something coherent and provable.</p>
      </article>
      <article class="card">
        <span class="tag">A living scoreboard</span>
        <h3>Proof compounds alongside the artifacts</h3>
        <p>Each session opens by revisiting the previous thesis-validation vote and any attendee wins. Who got cited by an LLM since last time? The cohort tracks it together, which makes the wins visible and the thesis verifiable in public.</p>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="sessions">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">The season arc</span>
      <h2>Four sessions. One per market.</h2>
      <p>The series mirrors the FDI thesis exactly: one session to name the problem, then one session per market. Session 1 is the flagship and the cleanest standalone entry point. The citation audit is the most visceral demonstration of the thesis, and a newcomer who attends only Session 1 still gets a complete, satisfying loop.</p>
    </div>
    <div class="grid cols-2">
      ${sessionsHtml}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section rotated" id="spine">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Session format</span>
      <h2>The seven-beat spine.</h2>
      <p>Every session follows the same structure so a facilitator can re-skin it in an afternoon. Only beats 2 through 4 and beat 6 change per market. Beats 1, 5, and 7 are fixed infrastructure built once.</p>
    </div>
    <div class="timeline">
      ${beatsHtml}
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="formats">
  <div class="wrap">
    <div class="section-hd">
      <span class="eyebrow">Format variants</span>
      <h2>Same spine, different length.</h2>
    </div>
    <div class="grid cols-3">
      <article class="card">
        <span class="tag">90-minute</span>
        <h3>Lunch-and-learn</h3>
        <p>Compress beats 3 through 6, single-question build, skip the share round-robin. The facilitator narrates two examples instead.</p>
      </article>
      <article class="card">
        <span class="tag">Half-day</span>
        <h3>Intensive</h3>
        <p>Two adjacent market themes back to back, for example Aggregated and Decentralized. You leave with an answer object and the graph it feeds.</p>
      </article>
      <article class="card">
        <span class="tag">Remote</span>
        <h3>Live cohort</h3>
        <p>Identical spine over video. Build happens in breakout pairs, share uses screen-share, capture is a link rather than a QR. The fallback when the target segment is geographically sparse.</p>
      </article>
    </div>
  </div>
</section>

<hr class="divider" />

<section class="section" id="register">
  <div class="wrap" style="max-width:640px;margin:0 auto;text-align:center;">
    <span class="eyebrow">Register your interest</span>
    <h2>Tell us where you want a Table.</h2>
    <p>We are scheduling the first season now. Leave your email and we will send you the date and location once confirmed, along with the Field Guide so you arrive ready to build.</p>
    <form class="waitlist js-capture" data-source="workshop" data-subject="The Cartographers' Table workshop interest" data-success="You are on the list. We will send the first date as soon as it is confirmed." data-mail-body="Please add me to The Cartographers' Table workshop list." novalidate style="margin-top:28px;">
      <label class="sr-only" for="workshop-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
      ${HONEYPOT}
      <input type="email" id="workshop-email" name="email" placeholder="you@company.com" autocomplete="email" required />
      <button class="btn btn-primary" type="submit">Register interest <span class="arrow">→</span></button>
    </form>
    <p class="form-msg" role="status" aria-live="polite"></p>
    <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
  </div>
</section>`;

  return page({
    title: "The Cartographers' Table | False Dawn Industries",
    description:
      "A four-part in-person workshop series that runs the FDI thesis live. Each session you build one real artifact for a real client. Attend the season and leave with a coherent, owned marketing system.",
    active: "workshop",
    body,
    canonical: `${SITE_URL}/workshop`,
    jsonLd: [
      orgJsonLd(),
      {
        "@context": "https://schema.org",
        "@type": "Event",
        name: "The Cartographers' Table",
        description:
          "A four-part in-person workshop series running the FDI thesis live: the Terrain, Aggregated, Decentralized, and Autonomous markets. Each session produces one owned artifact.",
        organizer: {
          "@type": "Organization",
          name: "False Dawn Industries",
          url: SITE_URL,
        },
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        eventStatus: "https://schema.org/EventScheduled",
        url: `${SITE_URL}/workshop`,
      },
    ],
  });
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

/* ---------------- crawler discovery: sitemap.xml + robots.txt ----------------
 * Indexable public routes only: gated holding pages and the private
 * /davos-kit-demo page are noindex, so they are deliberately left out of the
 * sitemap. "" is the homepage (renders as SITE_URL/). */
const SITEMAP_ROUTES = [
  "",
  "field-guide",
  "field-guide-002",
  "field-guide-003",
  "field-guide-004",
  "fdcp",
  "skillfoundry",
  "marcom-kit",
  "topcall",
  "series",
  "aggregated",
  "decentralized",
  "autonomous",
  "roadmap",
  "community",
  "workshop",
  "engine",
].filter((r) => !GATED.has(r));

/* One honest lastmod for all pages: every page is regenerated from build.mjs
 * (plus the stylesheet and the Field Guide article source), so the newest
 * mtime of those inputs is when the site content last actually changed.
 * Using the build timestamp instead would falsely signal freshness on every
 * deploy. */
function lastModDate() {
  const sources = [
    fileURLToPath(import.meta.url),
    path.join(SRC, "site.css"),
    path.join(EXPORTS, "linkedin-thesis-article.md"),
    path.join(EXPORTS002, "field-guide-002-article.md"),
    path.join(EXPORTS003, "field-guide-003-article.md"),
    path.join(EXPORTSPT02, "fdcp-report.md"),
  ];
  let latest = 0;
  for (const f of sources) {
    try {
      latest = Math.max(latest, fs.statSync(f).mtimeMs);
    } catch {
      /* missing source file: fall through to the others */
    }
  }
  return new Date(latest || Date.now()).toISOString().slice(0, 10);
}

function sitemapXml() {
  const lastmod = lastModDate();
  const urls = SITEMAP_ROUTES.map(
    (r) =>
      `  <url>\n    <loc>${SITE_URL}/${r}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`,
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function robotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml

# Guide for AI crawlers and LLMs: ${SITE_URL}/llms.txt
`;
}

/* ---------------- DAVOS KIT DEMO PAGE (private, password-gated) ---------------- */
// A private, client-facing demonstration of the custom build FDI proposes for
// The Content Bureau. Never linked from public nav or the footer, noindex, and
// served ONLY behind the DAVOS_DEMO_PASSWORD gate in serve.mjs. Emitted while
// DAVOS_DEMO is true.

// Solvra worked-example data (fictional; see exports/davos-decision-kit/worked-example.md)
const SOLVRA_FACTORS = [
  { n: 1, name: "Strategic visibility goals", weight: 5, score: 4, got: 20, max: 25, why: "Two live, named objectives (Series D raise, EU policy position) depend on audiences that gather that week." },
  { n: 2, name: "Audience fit", weight: 4, score: 3, got: 12, max: 20, why: "The right categories attend, but warm paths exist to only 4 of a draft top-20 list today." },
  { n: 3, name: "Story readiness", weight: 4, score: 3, got: 12, max: 20, why: "A defensible point of view exists internally but is barely published: one byline, no anchor report." },
  { n: 4, name: "Budget reality", weight: 3, score: 4, got: 12, max: 15, why: "The promenade-only range fits inside the existing events budget, but consumes the full contingency." },
  { n: 5, name: "Calendar cost", weight: 2, score: 4, got: 8, max: 10, why: "January 2027 is protectable now; the raise process may compress December." },
  { n: 6, name: "Alternatives comparison", weight: 2, score: 3, got: 6, max: 10, why: "A Brussels dinner series plus one climate-finance event is comparable for the policy goal at roughly half the cost." },
];

const SOLVRA_BUDGET = [
  { line: "WEF badge or membership", low: 0, high: 0, note: "Deliberate no-badge decision" },
  { line: "Side-event access", low: 0, high: 6000, note: "Two climate-finance houses, one policy dinner" },
  { line: "Lodging (2 people, 5 nights)", low: 8000, high: 22000, note: "Village high end vs down-valley" },
  { line: "Travel", low: 3500, high: 9000, note: "Amsterdam to Zurich x2 plus transfers" },
  { line: "Ground logistics", low: 700, high: 2500, note: "Transport, winter gear, contingency" },
  { line: "Hosted moments", low: 0, high: 0, note: "None in this scenario" },
  { line: "Content and design", low: 2000, high: 8000, note: "Briefing docs, one-pagers, talk track" },
  { line: "PR and advance support", low: 800, high: 10000, note: "Brokering and outreach; internal time at the low end" },
];

const SOLVRA_RUNWAY = [
  { days: "Days 1 to 15", label: "Decide and position", detail: "Circulate the one-page recommendation. Name the single point of view. Audit the CEO's public footprint: the gap is the anchor report." },
  { days: "Days 16 to 45", label: "Publish and map", detail: "Commission the anchor report with a named analyst. Place a flagship byline. Build the 40-to-60-person target list." },
  { days: "Days 46 to 75", label: "Build access", detail: "Convert the target list to warm paths through the board and investors. Goal: 7+ warm paths into the top 20." },
  { days: "Days 76 to 90", label: "Re-score", detail: "Rerun the scorecard with fresh evidence. At 75+ move to the full runway. Below 75, redirect the envelope to the Brussels series." },
];

const TCB_INSERTIONS = [
  { when: "Week 1", what: "The working session", time: "90 to 120 min", fdi: "Draft scorecard, budget lines from public ranges, draft runway", tcb: "Validate weights and thresholds against real client outcomes. Correct ranges and calendar timing from ground truth." },
  { when: "Week 1", what: "Async follow-ups", time: "60 to 90 min", fdi: "Script skeletons, briefing-doc structure, model-week grid", tcb: "Real, anonymized patterns: which framings get replies, the model week as your practice actually runs it." },
  { when: "Week 2", what: "The red-line pass", time: "60 to 90 min", fdi: "The full revised kit", tcb: "Veto anything that overpromises, conflicts with advisory positioning, or leaks proprietary method." },
  { when: "Week 2", what: "Sign-off", time: "15 to 30 min", fdi: "Final packaged kit, launch copy, product page draft", tcb: "A yes or a short punch list. Nothing ships under your brand without your final word." },
  { when: "Week 3", what: "Commerce check (add-on)", time: "30 min", fdi: "Checkout, gated download, and email capture wired and tested", tcb: "One test purchase walkthrough on a screen share. You see what a buyer sees first." },
];

const usd = (n) => "$" + n.toLocaleString("en-US");

function solvraScoreboard() {
  const rows = SOLVRA_FACTORS.map(
    (f) => `<div class="sb-row">
      <div class="sb-meta"><span class="sb-name">${f.n}. ${f.name}</span><span class="sb-w">weight x${f.weight}</span><span class="sb-val">${f.got} / ${f.max}</span></div>
      <div class="sb-track"><div class="sb-fill" style="width:${Math.round((f.got / f.max) * 100)}%"></div></div>
      <p class="sb-why">${f.why}</p>
    </div>`,
  ).join("\n");
  return `<div class="scoreboard">
    <div class="sb-total">
      <div class="sb-total-num">70<span>/100</span></div>
      <div class="sb-total-label"><span class="pill">Conditional go</span><p>Per the scorecard rule: fix the lowest-scoring high-weight factors (warm paths, story readiness), re-score in 60 days, commit only at 75 or above.</p></div>
    </div>
    ${rows}
  </div>`;
}

function solvraBudgetBars() {
  const scale = 22000; // largest single line high
  const rows = SOLVRA_BUDGET.map((b) => {
    const lo = Math.round((b.low / scale) * 100);
    const hi = Math.max(Math.round((b.high / scale) * 100), b.high > 0 ? 3 : 0);
    return `<div class="bb-row">
      <div class="bb-meta"><span class="bb-name">${b.line}</span><span class="bb-range">${b.high === 0 ? "$0" : `${usd(b.low)} to ${usd(b.high)}`}</span></div>
      <div class="bb-track">${b.high === 0 ? '<span class="bb-zero">zero by design</span>' : `<div class="bb-band" style="left:${lo}%;width:${Math.max(hi - lo, 3)}%"></div>`}</div>
      <p class="bb-note">${b.note}</p>
    </div>`;
  }).join("\n");
  return `<div class="budgetbars">
    ${rows}
    <div class="bb-total"><span>Total envelope</span><b>${usd(15000)} to ${usd(57500)}</b><span class="bb-total-note">Reserve, do not spend; release only on a Go re-score. Hidden time line: ~$30,000 of internal preparation at a loaded executive-day value of $5,000.</span></div>
  </div>`;
}

function solvraTimeline() {
  return `<ol class="runway">
    ${SOLVRA_RUNWAY.map(
      (p, i) => `<li class="rw-phase">
      <span class="rw-days">${p.days}</span>
      <span class="rw-dot" aria-hidden="true"></span>
      <h4>${p.label}</h4>
      <p>${p.detail}</p>
    </li>`,
    ).join("\n")}
  </ol>`;
}

function tcbInsertionSteps() {
  return `<ol class="steps">
    ${TCB_INSERTIONS.map(
      (s, i) => `<li class="step">
      <div class="step-hd"><span class="step-num">${i + 1}</span><div><span class="step-when">${s.when} · ${s.time}</span><h4>${s.what}</h4></div></div>
      <p><b>FDI brings:</b> ${s.fdi}</p>
      <p><b>TCB inserts:</b> ${s.tcb}</p>
    </li>`,
    ).join("\n")}
  </ol>
  <p class="steps-total">Total time required from the TCB team: about 4 to 6 hours across the 2 to 3 week build. FDI drafts first, your team corrects; nothing proprietary leaves without consent.</p>`;
}

/* End-user journey screenshots. Only rendered if the captures exist in
   site/src/assets/davos-demo/ (copied to /assets/davos-demo/ by copyAssets). */
const DEMO_SHOTS = [
  { file: "journey-1-product-page.png", title: "1 · The product page", cap: "The buyer lands on the kit page (shown here under the FDI demo brand; the real build ships under TCB's brand) and clicks Buy the kit." },
  { file: "journey-2-checkout.png", title: "2 · Secure checkout", cap: "Stripe Checkout collects card and billing address; tax is calculated automatically at purchase." },
  { file: "journey-3-success-key.png", title: "3 · The license key", cap: "The success page issues the buyer's license key instantly and emails a copy for safekeeping." },
  { file: "journey-4-download.png", title: "4 · The gated download", cap: "The key unlocks the kit zip. The download is served only to an active license, never from a public URL." },
  { file: "journey-5-documents.png", title: "5 · The delivered documents", cap: "Inside the zip: the scorecard, runway, calculator, templates, and worked example, plus the Start Here AI prompt sheet and a pre-built Claude Skill folder, ready to run in a 45-minute session." },
];

function demoJourney() {
  const dir = path.join(SRC, "assets", "davos-demo");
  const available = DEMO_SHOTS.filter((s) => fs.existsSync(path.join(dir, s.file)));
  if (!available.length) return "";
  const figs = available
    .map(
      (s) => `<figure class="shot">
      <img src="/assets/davos-demo/${s.file}" alt="${s.title.replace(/^\d+ · /, "")}" loading="lazy" />
      <figcaption><b>${s.title}</b> ${s.cap}</figcaption>
    </figure>`,
    )
    .join("\n");
  return `<section class="wrap section" id="journey">
  <div class="section-hd">
    <span class="eyebrow">The buyer's journey</span>
    <h2>What the end user actually sees.</h2>
    <p>Real screenshots from the working build: from landing on the page to opening the delivered documents. This is the flow the $2,500 commerce add-on wires into TCB's own site.</p>
  </div>
  <div class="shots">${figs}</div>
</section>`;
}

function davosDemoPage() {
  const body = `<section class="hero">
  <div class="wrap hero-inner">
    <div class="hero-copy">
      <span class="eyebrow">Private demonstration · Prepared for The Content Bureau</span>
      <h1>The <em>Davos Decision Kit</em>: a custom build for TCB.</h1>
      <p class="lede">This is not an FDI product for sale. It is a working demonstration of the kit False Dawn Industries proposes to build for The Content Bureau: a self-serve decision system, delivered under TCB's brand, in TCB's voice, that monetizes the gap between your free Davos Curious briefing and five-figure advisory.</p>
      <div class="hero-cta">
        <a class="btn btn-primary" href="#solvra">See it working <span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="#demo">Try the live checkout</a>
      </div>
      <p style="color:var(--muted);font-size:13px;margin-top:24px;">Everything on this page is built and running today. The example buyer, Solvra, is fictional. All costs are public-range estimates. Nothing here is legal or financial advice, and the kit claims no affiliation with or endorsement by the World Economic Forum.</p>
    </div>
  </div>
</section>

<section class="wrap section" id="gap">
  <div class="section-hd">
    <span class="eyebrow">The gap</span>
    <h2>Your Davos practice has two doors. The buyers live between them.</h2>
    <p>The free door, the Davos Curious briefing, leaves the attendee with notes, not a system. The big door, high-touch advisory, is a five-figure first step. The kit is the middle door: it monetizes the curious who never convert, qualifies the ones who will, and hands you a warm, pre-educated pipeline. The people who buy a $199 decision kit and then decide to go are exactly the people who need advisory.</p>
  </div>
  <div class="grid cols-3">
    <article class="card"><span class="tag">Door 1 · Free</span><h3>The briefing</h3><p>Generous and effective, but the attendee leaves with notes. No system, no next step, no revenue.</p></article>
    <article class="card featured"><span class="tag">The middle door · $299, $199 launch</span><h3>The Decision Kit</h3><p>A one-time purchase, instantly downloadable. Every document ends at the same next step: book a strategy session with TCB.</p></article>
    <article class="card"><span class="tag">Door 2 · Advisory</span><h3>High-touch engagement</h3><p>The right answer for committed clients, and exactly where kit buyers who score a Go end up.</p></article>
  </div>
</section>
<hr class="divider" />

<section class="wrap section" id="inside">
  <div class="section-hd">
    <span class="eyebrow">What FDI builds</span>
    <h2>Five working documents, one decision.</h2>
    <p>TCB and FDI align together on what these working documents should be, and the substance is mostly all TCB input: your ranges, your calendars, your scripts, your judgment. FDI drafts the five documents from that input, then works with your team to validate and refine each one until it is your final product. FDI's real job here is the system build and the product wiring; the expertise inside the documents is yours.</p>
  </div>
  <div class="grid cols-2">
    <article class="card"><span class="num">01</span><h3>Go/No-Go Scorecard</h3><p>Six weighted factors and thresholds that resolve to a board-defensible go, conditional go, or no-go, plus a five-line recommendation page.</p></article>
    <article class="card"><span class="num">02</span><h3>Twelve-Month Runway</h3><p>The month-by-month plan working backward from the January week: decide, position, publish, build access, sharpen, lock, prepare, execute, convert.</p></article>
    <article class="card"><span class="num">03</span><h3>Budget Calculator</h3><p>Line-by-line low and high estimates from public ranges, the hidden time line, and three scenario totals from promenade-only to badged.</p></article>
    <article class="card"><span class="num">04</span><h3>Visibility Plan Templates</h3><p>Meeting-request scripts, the one-page-per-day briefing doc, a model high-impact week, and the follow-up system where the ROI lives.</p></article>
    <article class="card" style="grid-column:1/-1;"><span class="num">05</span><h3>The worked example</h3><p>A fully worked fictional buyer (Solvra, below) running the entire kit end to end, so every purchaser sees exactly what good looks like before their own 45-minute session.</p></article>
  </div>
</section>
<hr class="divider" />

<section class="wrap section" id="solvra">
  <div class="section-hd">
    <span class="eyebrow">The product, working</span>
    <h2>Solvra runs the kit.</h2>
    <p>Solvra is a fictional Series C climate-fintech (~180 people, Amsterdam) weighing Davos January 2027 ahead of a Q3 raise. Here is the kit's actual output, visualized. Any resemblance to a real company or person is coincidental.</p>
  </div>

  <h3 class="viz-hd">Step 1 · The scorecard: six weighted factors, one defensible answer</h3>
  ${solvraScoreboard()}

  <h3 class="viz-hd">Step 2 · The budget: a lined, carryable range instead of "roughly fifty grand?"</h3>
  <p class="viz-sub">Promenade-only scenario, two people, five nights, no badge, no hosted moment. Public-range estimates as of the 2026 cycle.</p>
  ${solvraBudgetBars()}

  <h3 class="viz-hd">Step 3 · The runway, condensed to Solvra's next 90 days</h3>
  ${solvraTimeline()}

  <h3 class="viz-hd">Step 4 · One meeting-request script, instantiated</h3>
  <blockquote class="script">
    <p class="script-sub">Subject: Intro to Dr. Elin Sørheim ahead of January?</p>
    <p>Pieter, I will be in Davos the week of January 18 and Dr. Sørheim is at the top of my list. We are both working on carbon-market settlement integrity; I published our "Missing Layer" report on exactly this. Would you be open to a two-line introduction? Happy to send you the note to forward.</p>
    <footer>The template forced the ask to wait until the anchor report existed to reference. Script quality is downstream of runway discipline, which is the kit's core argument.</footer>
  </blockquote>
</section>
<hr class="divider" />

<section class="wrap section" id="process">
  <div class="section-hd">
    <span class="eyebrow">The build process</span>
    <h2>Where TCB's expertise goes in.</h2>
    <p>The kit's credibility is your expertise, so the working documents are defined together and filled with mostly TCB input: what the ranges really are, when the calendars really fill, which scripts really get replies. FDI drafts, your team validates and refines, and FDI handles the part that is genuinely ours: the scoring math, the document architecture, the packaging, and the commerce plumbing.</p>
  </div>
  ${tcbInsertionSteps()}
</section>
<hr class="divider" />

${demoJourney()}
<hr class="divider" />

<section class="wrap section" id="ai-advisor">
  <div class="section-hd">
    <span class="eyebrow">After the download</span>
    <h2>The kit becomes an AI advisor, not a folder of files.</h2>
    <p>The documents are plain text on purpose: the most portable format there is for AI assistants. The buyer does not install anything. They load the kit into the AI tool they already use and it turns from worksheets into an interactive advisor that interviews them, scores them, and plans with them. A Start Here prompt sheet ships in the zip so this works with zero prompting skill.</p>
  </div>
  <div class="grid cols-2">
    <article class="card"><span class="tag">Step 6 · Load it in</span><h3>Upload once, keep it all year</h3><p>ChatGPT (Projects), Claude (Projects), and Microsoft Copilot (Notebooks) all let the buyer upload reference files once so they stay attached to every future conversation. The buyer uploads the five documents to one project, names it "Davos Advisor," and returns to it for twelve months. The quick path also works: drag one document into any chat and paste the matching prompt from the Start Here sheet.</p></article>
    <article class="card"><span class="tag">Step 7 · Work the system</span><h3>The kit interviews the buyer</h3><p>Each document ships with a copy-paste prompt. The scorecard prompt makes the AI interview the buyer one criterion at a time, then calculate the weighted score and draft the five-line board recommendation. The runway prompt compresses the twelve months to the time the buyer actually has. The buyer's answers stay in their own AI account, not on anyone's server.</p></article>
  </div>
  <h3 class="viz-hd">Advanced applications: for buyers on paid AI plans</h3>
  <p class="viz-sub">The kit is plain markdown, so it climbs the capability ladder with the buyer. Everything below is a buyer-side option using tools they already pay for; none of it requires anything from TCB. Feature names and availability vary by vendor and plan.</p>
  <div class="grid cols-2">
    <article class="card"><span class="tag">Claude Pro / Max / Team</span><h3>A pre-built Skill ships in the zip</h3><p>Beyond Projects, Claude supports Skills, and the kit ships one ready-made: a folder holding the advisor instruction file plus the five documents, so installing it is one drag where the buyer's plan supports Skills. Claude then loads the Davos advisor on demand across the Claude apps, Claude Code, and Cowork. In Cowork, the buyer drops the same folder into a session and Claude works the documents against their real files: scoring the scorecard from their strategy memo, or filling the budget calculator from their draft spreadsheet.</p></article>
    <article class="card"><span class="tag">Microsoft 365 Copilot</span><h3>A shared team agent in Teams and Office</h3><p>Beyond Notebooks, buyers on Microsoft 365 Copilot can use the agent builder or Copilot Studio to create a declarative "Davos Advisor" agent grounded in the kit documents, shared with the whole comms team inside Teams and Office. A simple flow can send runway reminders on schedule, so the twelve-month plan pings the team instead of waiting to be opened.</p></article>
    <article class="card"><span class="tag">ChatGPT Plus / Team</span><h3>A custom GPT for the whole team</h3><p>Instead of a personal Project, the buyer builds a custom GPT from the kit documents and the Start Here instructions, then shares it with their team (or keeps it private). Everyone gets the same advisor with the same grounding, and the kit's next-step language, book a strategy session with TCB, is baked into every conversation.</p></article>
    <article class="card"><span class="tag">Or any similar system</span><h3>Plain markdown goes anywhere</h3><p>Gemini (Gems), Notion AI, or an enterprise RAG stack: any tool that accepts reference documents can run the kit. Feature names and availability vary by vendor and plan, but the format never blocks the buyer. That is the point of shipping text instead of an app.</p></article>
  </div>
  <div class="chat-demo">
    <p class="chat-demo-hd">What that looks like in practice (Solvra, in their own AI workspace):</p>
    <div class="chat-msg chat-user"><span class="chat-who">Solvra</span><p>It's the first week of October. We scored a 70, conditional go. What does the runway say we should be doing right now?</p></div>
    <div class="chat-msg chat-ai"><span class="chat-who">Davos Advisor (their AI, running the kit)</span><p>With a conditional go in October you are on the condensed runway, not the twelve-month one. The three urgent items: 1) lock accommodation this week, October pricing is the last sane window; 2) your anchor report has to publish by mid-November or your meeting-request scripts have nothing to reference; 3) start the top-ten conversation list now, because badge-holder calendars fill from late November. Want me to build the week-by-week version through January?</p></div>
    <p class="chat-demo-note">Illustrative exchange based on the kit's actual runway and scorecard logic. Every answer is grounded in the documents TCB validated, in TCB's voice.</p>
  </div>
  <aside class="roadmap-kicker">
    <span class="tag">Roadmap · A possible later iteration</span>
    <p>Version one deliberately meets buyers inside the AI tools they already use: zero build cost, and their answers stay in their own account. If the kit proves demand, a natural next step is a hosted chat advisor living on <a href="https://contentbureau.com/" rel="noopener">contentbureau.com</a> itself: the same documents behind a TCB-branded chat, with every conversation becoming a qualified lead for the advisory practice. Not in this proposal's scope or price; on the table when the numbers say so.</p>
  </aside>
</section>
<hr class="divider" />

<section class="wrap section" id="terms">
  <div class="section-hd">
    <span class="eyebrow">The proposal</span>
    <h2>Scope, timeline, and investment.</h2>
    <p>Two to three weeks from working session to delivered kit. All assets in editable form under TCB's brand, yours outright. No open-ended consulting tail: the engagement ends at delivery.</p>
  </div>
  <div class="price-grid">
    <div class="tier mid">
      <span class="tname">The build</span>
      <h3>Product, packaging, launch copy</h3>
      <div class="tprice"><span class="tprice-amt">$7,500</span><span class="tprice-unit">fixed</span></div>
      <p class="model">Half on signing, half on delivery.</p>
      <ul>
        <li>Week 1: working session; FDI drafts all five assets plus read-me and packaging</li>
        <li>Week 2: your review pass; FDI revises, finalizes launch copy, delivers the packaged kit</li>
        <li>Launch copy: product page, launch email, two social posts</li>
      </ul>
    </div>
    <div class="tier">
      <span class="tname">Add-on</span>
      <h3>Commerce plumbing</h3>
      <div class="tprice"><span class="tprice-amt">$2,500</span><span class="tprice-unit">optional week 3</span></div>
      <p class="model">Exactly what this page demonstrates, wired into your site.</p>
      <ul>
        <li>Checkout, license keys, gated download</li>
        <li>Email capture and buyer notifications</li>
        <li>Tested end to end before launch</li>
      </ul>
    </div>
    <div class="tier">
      <span class="tname">Alternative structure</span>
      <h3>Shared upside</h3>
      <div class="tprice"><span class="tprice-amt">$5,000</span><span class="tprice-unit">+ 20% of kit revenue, 12 months</span></div>
      <p class="model">If preferred: lower fixed fee, shared outcome.</p>
      <ul>
        <li>Same scope and timeline as the fixed build</li>
        <li>Suggested buyer pricing: $299 one-time, $199 launch</li>
        <li>Low enough for a corporate card, high enough to signal senior advice</li>
      </ul>
    </div>
  </div>
  <p style="color:var(--muted);font-size:13px;margin-top:18px;">This page is a demonstration of a proposal, not a contract. No claim of WEF affiliation appears in any asset; all cost figures are framed as public ranges; nothing in the kit is legal or financial advice.</p>
</section>
<hr class="divider" />

<section class="wrap section" id="demo">
  <div class="section-hd">
    <span class="eyebrow">Live demo</span>
    <h2>The commerce flow, running now.</h2>
    <p>This button drives the same engine the add-on delivers: a real Stripe test-mode checkout that issues a license key, sends the buyer email, and unlocks the gated download. Use test card 4242 4242 4242 4242 with any future expiry.</p>
  </div>
  <button type="button" class="btn btn-primary js-buy" data-tier="dk1" data-fallback="#waitlist">Run the demo purchase · $199 <span class="arrow">→</span></button>
  <p class="form-msg js-buy-msg" role="status" aria-live="polite"></p>
  <p style="color:var(--muted);font-size:13px;margin-top:10px;">Test mode: no real card is charged. If checkout is not configured in this environment, the button falls back to the contact form below.</p>
</section>

<section class="cta" id="waitlist">
  <div class="wrap section">
    <div class="cta-box">
      <span class="eyebrow" style="justify-content:center;">Next step</span>
      <h2>Ready to put your name on it?</h2>
      <p>Leave an email and FDI will follow up on the proposal, or write us directly.</p>
      <form class="waitlist js-capture" data-source="davos-kit-demo" data-subject="Davos Decision Kit proposal" data-success="Thanks. Check your inbox for a confirmation link and we will follow up on the proposal." data-mail-body="Following up on the Davos Decision Kit proposal." novalidate>
        <label class="sr-only" for="dk-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        ${HONEYPOT}
        <input type="email" id="dk-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Follow up with me <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" role="status" aria-live="polite"></p>
      <p class="waitlist-note" style="color:var(--muted);font-size:13px;margin-top:6px;">Prefer email? Write us at <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
    </div>
  </div>
</section>`;
  return page({
    title: "Davos Decision Kit · A custom build for The Content Bureau | False Dawn Industries",
    description:
      "Private demonstration of the Davos Decision Kit custom build proposed for The Content Bureau.",
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
  const { slideFiles, slideFiles002, slideFiles003, slideFilesFdcp, slideFiles004 } = copyAssets();
  buildPluginZip();
  buildKitZip();
  buildDavosZip();

  const md = fs.readFileSync(
    path.join(EXPORTS, "linkedin-thesis-article.md"),
    "utf8",
  );
  const parsed = parseArticle(md);
  const bodyHtml = renderArticleBody(parsed.body);

  const md002 = fs.readFileSync(
    path.join(EXPORTS002, "field-guide-002-article.md"),
    "utf8",
  );
  const parsed002 = parseArticle(md002);
  const bodyHtml002 = renderArticleBody(parsed002.body);

  const md003 = fs.readFileSync(
    path.join(EXPORTS003, "field-guide-003-article.md"),
    "utf8",
  );
  const parsed003 = parseArticle(md003);
  const bodyHtml003 = renderArticleBody(parsed003.body);

  const md004 = fs.readFileSync(
    path.join(EXPORTS004, "field-guide-004-article.md"),
    "utf8",
  );
  const parsed004 = parseArticle(md004);
  const bodyHtml004 = renderArticleBody(parsed004.body);

  fs.writeFileSync(path.join(DIST, "index.html"), home());
  fs.writeFileSync(
    path.join(DIST, "field-guide.html"),
    fieldGuide({ ...parsed, bodyHtml }, slideFiles),
  );
  fs.writeFileSync(
    path.join(DIST, "field-guide-002.html"),
    fieldGuide002({ ...parsed002, bodyHtml: bodyHtml002 }, slideFiles002),
  );
  fs.writeFileSync(
    path.join(DIST, "field-guide-003.html"),
    fieldGuide003({ ...parsed003, bodyHtml: bodyHtml003 }, slideFiles003),
  );
  const mdFdcp = fs.readFileSync(path.join(EXPORTSPT02, "fdcp-report.md"), "utf8");
  const parsedFdcp = parseArticle(mdFdcp);
  const bodyHtmlFdcp = renderArticleBody(parsedFdcp.body);
  fs.writeFileSync(
    path.join(DIST, "fdcp.html"),
    fdcpPage({ ...parsedFdcp, bodyHtml: bodyHtmlFdcp }, slideFilesFdcp),
  );
  fs.writeFileSync(
    path.join(DIST, "field-guide-004.html"),
    fieldGuide004({ ...parsed004, bodyHtml: bodyHtml004 }, slideFiles004),
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
  fs.writeFileSync(path.join(DIST, "community.html"), communityPage());
  fs.writeFileSync(path.join(DIST, "workshop.html"), workshopPage());
  fs.writeFileSync(path.join(DIST, "engine.html"), enginePage());
  if (DAVOS_DEMO) {
    fs.writeFileSync(path.join(DIST, "davos-kit-demo.html"), davosDemoPage());
  }
  fs.writeFileSync(path.join(DIST, "llms.txt"), llmsTxt());
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), sitemapXml());
  fs.writeFileSync(path.join(DIST, "robots.txt"), robotsTxt());

  console.log(
    `[build] wrote 16 pages + llms.txt + sitemap.xml + robots.txt, ${slideFiles.length}+${slideFiles002.length}+${slideFiles003.length}+${slideFilesFdcp.length}+${slideFiles004.length} slides, assets → ${path.relative(ROOT, DIST)}`,
  );
}

main();
