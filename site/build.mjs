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
    <div class="grid cols-3">
      <article class="card featured">
        <span class="pill">Product</span>
        <h3>Skillfoundry</h3>
        <p>A strategic firewall for your content. Route any asset through three opinionated Signal-to-Value gates — Relevance, Performance, and Algorithmic Signal — as an Anthropic-standard plugin. Strategy as code.</p>
        <div class="card-foot"><a class="link-arrow" href="/skillfoundry">See how it works <span class="arrow">→</span></a></div>
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
      <div class="mod"><code>commands/</code><h4>Commands</h4><p>Slash commands like <code>/sf:full-audit</code> chain the three gates, plus one command per gate to route local files straight from your terminal.</p></div>
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
      <p>Three tiers, from a perpetual license to a strategic retainer. Billing and license validation arrive in the commercialization phase — join the waitlist to lock early access.</p>
    </div>
    <div class="price-grid">
      ${tier(
        "Tier 1 · Static",
        "Perpetual License",
        "One-time purchase of the V1.0 plugin.",
        [
          "The full three-gate plugin",
          "Skills, commands &amp; connector",
          "Run locally in any MCP client",
          "V1.0 perpetual license",
        ],
        false,
      )}
      ${tier(
        "Tier 2 · Dynamic",
        "Continuous Updates",
        "Recurring subscription with over-the-wire updates.",
        [
          "Everything in Static",
          "Continuous gate &amp; logic updates",
          "New market-structure modules",
          "Priority release channel",
        ],
        true,
      )}
      ${tier(
        "Tier 3 · Advisory",
        "Hybrid Retainer",
        "Subscription paired with a dedicated strategic retainer.",
        [
          "Everything in Dynamic",
          "Dedicated strategic retainer",
          "Custom gate calibration",
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
      <h2>Get Skillfoundry the day it ships.</h2>
      <p>Drop your email to join the waitlist. We'll reach out with early access, pricing, and the worked example — no spam.</p>
      <form class="waitlist" id="waitlist-form" novalidate>
        <label class="sr-only" for="wl-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);">Email address</label>
        <input type="email" id="wl-email" name="email" placeholder="you@company.com" autocomplete="email" required />
        <button class="btn btn-primary" type="submit">Join the waitlist <span class="arrow">→</span></button>
      </form>
      <p class="form-msg" id="wl-msg" role="status" aria-live="polite"></p>
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
  var form = document.getElementById("waitlist-form");
  if (form) {
    var btn = form.querySelector("button[type=submit]");
    function setMsg(msg, text, state) {
      msg.textContent = text;
      msg.classList.remove("is-ok", "is-error");
      if (state) msg.classList.add(state);
    }
    function mailtoFallback(email) {
      var subject = encodeURIComponent("Skillfoundry waitlist");
      var bodyTxt = encodeURIComponent("Please add me to the Skillfoundry waitlist.\\n\\nEmail: " + email);
      window.location.href = "mailto:${CONTACT}?subject=" + subject + "&body=" + bodyTxt;
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("wl-email");
      var msg = document.getElementById("wl-msg");
      var email = (input.value || "").trim();
      var ok = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
      if (!ok) { setMsg(msg, "Please enter a valid email address.", "is-error"); input.focus(); return; }
      if (btn) btn.disabled = true;
      setMsg(msg, "Adding you to the waitlist…", null);
      fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      }).then(function (res) {
        return res.json().then(function (data) { return { status: res.status, data: data }; });
      }).then(function (r) {
        if (r.status === 200 && r.data && r.data.ok) {
          form.reset();
          setMsg(msg, r.data.duplicate ? "You're already on the list — we'll be in touch." : "You're on the list. We'll reach out with early access.", "is-ok");
        } else if (r.status === 422) {
          setMsg(msg, "Please enter a valid email address.", "is-error");
          input.focus();
        } else {
          setMsg(msg, "Something went wrong — opening your email app instead.", "is-error");
          mailtoFallback(email);
        }
      }).catch(function () {
        setMsg(msg, "Couldn't reach the server — opening your email app instead.", "is-error");
        mailtoFallback(email);
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    });
  }
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

  console.log(
    `[build] wrote 3 pages, ${slideFiles.length} slides, assets → ${path.relative(ROOT, DIST)}`,
  );
}

main();
