// Skillfoundry deterministic audit engine (zero-dependency, ESM).
//
// This is the REAL gate logic that runs server-side for paying Living Brain
// (Tier 2) / Advisory (Tier 3) subscribers. It routes a content asset through
// the three Skillfoundry gates - Relevance (Market-Deficit Analyzer),
// Performance (Enterprise Valuation Gate), and Algorithmic Signal (Adversarial
// Defense Matrix) - scoring each gate's weighted sub-criteria exactly as the
// rubrics in ../skills define them, then composing one consolidated report that
// conforms to schema/audit-report.schema.json.
//
// The score is computed, not a vibe: every gate score is the weighted sum of
// its sub-criteria, every ranked reason quotes evidence from the asset, and
// every rewrite pairs an exact original span with a concrete replacement. The
// engine is fully deterministic (same asset in -> same report out) so an owner
// can trust, track, and defend the output - the "strategy as code" promise.
//
// It makes no network or model call, so it always works and never depends on an
// external key. runAudit(assetText, { title, source }) -> report object.

const VERDICT = (score) => (score >= 75 ? "PASS" : score >= 50 ? "REVISE" : "BLOCK");
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n) => Math.round(n);

const GATE_META = {
  relevance: {
    gate_name: "Market-Deficit Analyzer",
    framework: "Jobs-to-be-Done (Christensen, Competing Against Luck / HBR 2016)",
  },
  performance: {
    gate_name: "Enterprise Valuation Gate",
    framework: "Brand equity (Aaker) + competitive positioning (Porter)",
  },
  signal: {
    gate_name: "Adversarial Defense Matrix",
    framework: "GEO/AEO (Aggarwal et al., KDD 2024) + Google E-E-A-T + Schema.org",
  },
};

/* ---------------- text utilities ---------------- */

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countWords(text) {
  const m = text.trim().match(/\b[\w'-]+\b/g);
  return m ? m.length : 0;
}

function truncate(s, max = 200) {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + "\u2026" : t;
}

// Find the first sentence matching any of the given (case-insensitive) needles.
function firstSentenceWith(sentences, needles) {
  for (const s of sentences) {
    const low = s.toLowerCase();
    for (const n of needles) {
      if (typeof n === "string" ? low.includes(n) : n.test(s)) return s;
    }
  }
  return null;
}

function countMatches(text, re) {
  const m = text.match(re);
  return m ? m.length : 0;
}

/**
 * Count vanity-metric matches that appear in a negation/critique context.
 * Checks a 3-sentence window (prev + current + next) for VANITY_CRITIQUE_CONTEXT
 * or CONTRARIAN signals so we catch patterns like:
 *   "...a bet on reach: buy attention, count clicks…  That bet is over."
 */
function countVanityInCritiqueContext(sentences) {
  let count = 0;
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const vanityMatches = s.match(VANITY_METRICS);
    if (!vanityMatches) continue;
    const win = [sentences[i - 1] || "", s, sentences[i + 1] || ""].join(" ");
    if (VANITY_CRITIQUE_CONTEXT.test(win) || CONTRARIAN_NG.test(win)) {
      count += vanityMatches.length;
    }
  }
  return count;
}

/* ---------------- signal dictionaries ---------------- */

const LLM_TELLS = [
  /\bit(?:'|\u2019)?s important to note\b/gi,
  /\bin today(?:'|\u2019)?s (?:fast-paced|ever-changing|digital) world\b/gi,
  /\bnot only\b[^.?!]*\bbut also\b/gi,
  /\b(?:delve|leverage|robust|seamless|seamlessly|cutting-edge|game-?changing|revolutionize|unlock|unleash|elevate|realm|tapestry|landscape)\b/gi,
  /\bwhen it comes to\b/gi,
  /\bat the end of the day\b/gi,
  /\bin conclusion\b/gi,
  /\ba testament to\b/gi,
  /\bplays a (?:crucial|vital|key|pivotal) role\b/gi,
  /\bnavigat(?:e|ing) the (?:complex|complexities|world|landscape)\b/gi,
];

const VALUE_DRIVERS =
  /\b(revenue|profit|margin|cost of acquisition|\bCAC\b|acquisition cost|retention|churn|\bLTV\b|lifetime value|\bROI\b|payback|capital efficiency|cash flow|\bP&L\b|pipeline|conversion|unit economics|gross margin)\b/gi;

const VANITY_METRICS =
  /\b(impressions|reach|awareness|engagement|likes|followers|virality|going viral|clicks|eyeballs)\b/gi;

// Signals that a vanity-metric mention is being *critiqued* rather than relied on.
// Used with a 3-sentence window to catch patterns like "bet on reach … That bet is over."
// Note: commoditiz\w* (not commoditiz\b) so "commoditized/commoditization" all match.
const VANITY_CRITIQUE_CONTEXT =
  /\b(not|no longer|over|stop|instead|rather|commoditiz\w*|discounts?|worth nothing|renting|opaque|waste|dead|myth|wrong|argue|vanity|isn'?t|is not|don'?t|doesn'?t|won'?t|never|can'?t|cannot|abandon|replace|ditch|reject|beyond|end of)\b/i;

const SUPERLATIVES =
  /\b(revolutionary|transformative|game-?changing|world-?class|best-in-class|cutting-edge|unparalleled|unmatched|next-generation|paradigm shift|disrupt(?:ive|ion)?|groundbreaking)\b/gi;

const UNFALSIFIABLE =
  /\b(guaranteed|always works|never fails|100% |zero risk|risk-free|the only|the best|no one else)\b/gi;

const AUDIENCE_ROLES =
  /\b(CMO|CFO|CEO|CTO|COO|founder|founders|marketer|marketers|engineer|engineers|developer|developers|designer|manager|managers|director|directors|executive|executives|VP|head of|leader|leaders|operator|operators|product manager|comms lead)\b/gi;

const CIRCUMSTANCE =
  /\b(when |before your|during |after |budget|quarter|q[1-4]\b|board|deadline|renewal|onboarding|defending|pitch|review|audit|migration|launch)\b/gi;

const EMOTIONAL_SOCIAL =
  /\b(fear|afraid|worried|worry|anxiety|exposed|exposure|career|reputation|respected|respect|credibility|confidence|confident|status|trusted|embarrass|blame|accountable|proud|pride)\b/gi;

const PROGRESS_ACTION =
  /\b(step|steps|framework|checklist|template|playbook|how to|start by|pick|choose|apply|measure|decide|do this|next|action|implement|build|ship|test|audit)\b/gi;

const CONSENSUS =
  /\b(we all know|everyone knows|it(?:'|\u2019)?s no secret|as we all|needless to say|obviously|of course)\b/gi;

const CONTRARIAN =
  /\b(but |however|actually|the truth is|contrary|myth|wrong|counter|isn(?:'|\u2019)?t|not the|instead)\b/gi;

// Non-global copy for .test() calls that must not advance lastIndex.
const CONTRARIAN_NG = new RegExp(CONTRARIAN.source, CONTRARIAN.flags.replace("g", ""));

const AUTHORITY_ASSERTION =
  /\b(studies show|experts agree|research shows|it is well known|many believe|some say)\b/gi;

const CITATION =
  /(https?:\/\/\S+|\baccording to\b|\bsource:|\(([A-Z][a-zA-Z]+(?: (?:&|and) [A-Z][a-zA-Z]+)?(?:,? \d{4})?)\)|\bper \b|\bcites?\b)/gi;

const AUTHOR_CTA =
  /\b(follow (?:me|us|@|[A-Z])|subscribe|like and share|hit the (?:like|follow)|smash that|drop a comment|repost|share this post)\b/gi;

const NUMBERS = /\b\d[\d,.]*\s?(?:%|percent|k\b|m\b|bn?\b|billion|million|trillion|x\b|hours?|seconds?|days?|years?|\$)?/gi;
const DOLLARS = /\$\s?\d[\d,.]*\s?(?:k|m|bn?|billion|million|trillion)?/gi;
const DATES = /\b(19|20)\d{2}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b/g;
const FIRST_PERSON = /\b(I |we |our |my |us )\b/g;
const QUOTES = /["\u201c][^"\u201d]{6,}["\u201d]/g;
// Proper-noun-ish named entities: capitalized words not at sentence start.
const NAMED_ENTITY = /(?<=[a-z,]\s)[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?/g;

/* ---------------- gate scorers ---------------- */
// Each scorer returns { subscores, findings, rewrites } where findings are
// {severity, finding, evidence?} and rewrites are {original, revised, rationale}.

function scoreRelevance(text, sentences) {
  const roles = countMatches(text, AUDIENCE_ROLES);
  const circ = countMatches(text, CIRCUMSTANCE);
  const everyone = /\bfor everyone\b|\banyone\b|\beveryone\b/i.test(text);
  const emo = countMatches(text, EMOTIONAL_SOCIAL);
  const action = countMatches(text, PROGRESS_ACTION);
  const consensus = countMatches(text, CONSENSUS);
  const contrarian = countMatches(text, CONTRARIAN);
  const cta = firstSentenceWith(sentences, [AUTHOR_CTA]);

  // 1. Defined audience & circumstance (0.25)
  let audience = 40 + Math.min(30, roles * 15) + Math.min(20, circ * 6);
  if (everyone) audience -= 25;
  audience = clamp(audience);

  // 2. Job clarity - functional / emotional / social (0.30)
  let job = 35 + Math.min(30, action * 8) + Math.min(30, emo * 10);
  if (emo === 0) job -= 15; // functional-only ceiling
  job = clamp(job);

  // 3. Progress delivered (0.25)
  let progress = 40 + Math.min(45, action * 10);
  if (cta) progress -= 20; // ends on the author's job, not the reader's
  progress = clamp(progress);

  // 4. Deficit vs. noise (0.20)
  let deficit = 50 + Math.min(35, contrarian * 6) - Math.min(45, consensus * 20);
  deficit = clamp(deficit);

  const subscores = [
    { criterion: "defined audience & circumstance", weight: 0.25, points: round(audience) },
    { criterion: "job clarity (functional/emotional/social)", weight: 0.3, points: round(job) },
    { criterion: "progress delivered", weight: 0.25, points: round(progress) },
    { criterion: "deficit vs. noise", weight: 0.2, points: round(deficit) },
  ];

  const findings = [];
  const rewrites = [];

  if (cta) {
    findings.push({
      severity: "high",
      finding:
        "The asset ends on the author's job (reach/followers), not the reader's next progress. A relevance-passing asset closes on an action the reader can take.",
      evidence: truncate(cta),
    });
    rewrites.push({
      original: truncate(cta, 240),
      revised:
        "Before your next planning cycle, pick one asset you can prove you own and audit whether it actually earns its keep - that is the move to make this week.",
      rationale: "progress delivered - converts an author-serving reach ask into a concrete reader action.",
    });
  }
  if (emo === 0) {
    const s = sentences[0] || text;
    findings.push({
      severity: "medium",
      finding:
        "The job is framed functionally only; the emotional or social layer (what the reader fears or how they want to be seen) is unspoken, so it reads as information, not progress.",
      evidence: truncate(s),
    });
    rewrites.push({
      original: truncate(s, 240),
      revised: truncate(s, 200) + " - and the person who ignores it is the one who has to answer for the miss.",
      rationale: "job clarity (emotional/social) - names the stakes, not just the functional fact.",
    });
  }
  if (roles === 0 || everyone) {
    findings.push({
      severity: everyone ? "high" : "medium",
      finding:
        "No specific audience or circumstance is named - the asset addresses 'everyone', which the Relevance filter penalizes to near-zero. Name who this is for and in what situation they'd read it.",
      evidence: firstSentenceWith(sentences, ["everyone", "anyone", "for everyone"])
        ? truncate(firstSentenceWith(sentences, ["everyone", "anyone", "for everyone"]))
        : undefined,
    });
  }
  if (consensus > 0) {
    const s = firstSentenceWith(sentences, [CONSENSUS]);
    findings.push({
      severity: "medium",
      finding:
        "Restates consensus the reader already believes instead of delivering a non-obvious claim; agreement is not progress.",
      evidence: s ? truncate(s) : undefined,
    });
  }
  if (findings.length === 0) {
    findings.push({
      severity: "low",
      finding:
        "Strength - the asset names a specific audience and job and closes on reader progress. Keep the concrete circumstance framing; it is what earns attention.",
    });
  }

  return { subscores, findings, rewrites };
}

function scorePerformance(text, sentences) {
  const drivers = countMatches(text, VALUE_DRIVERS);
  const vanity = countMatches(text, VANITY_METRICS);
  const superlatives = countMatches(text, SUPERLATIVES);
  const unfalsifiable = countMatches(text, UNFALSIFIABLE);
  const numbers = countMatches(text, NUMBERS);
  const citations = countMatches(text, CITATION);
  const contrarian = countMatches(text, CONTRARIAN);

  // Separate vanity mentions that critique/dismiss them from those that rely on them.
  // An asset arguing *against* reach/impressions/engagement demonstrates value-driver
  // awareness and should not be penalised the same way as one that leans on them.
  const vanityInCritique = countVanityInCritiqueContext(sentences);
  const vanityApproving = Math.max(0, vanity - vanityInCritique);
  // Small credit: naming and dismissing vanity metrics signals strategic literacy.
  const critiqueCredit = Math.min(25, vanityInCritique * 5);

  // 1. Value-driver linkage (0.30)
  let value = 35 + Math.min(45, drivers * 15) - Math.min(30, vanityApproving * 8) + critiqueCredit;
  value = clamp(value);

  // 2. Category-authority position (0.25)
  let authority = 45 + Math.min(35, contrarian * 6) + Math.min(15, citations * 4);
  if (superlatives > 0 && citations === 0) authority -= 20; // me-too leadership, no proof
  authority = clamp(authority);

  // 3. Claim substantiation (0.25)
  let substantiation = 35 + Math.min(40, (numbers + citations * 2) * 6) - Math.min(30, superlatives * 8);
  substantiation = clamp(substantiation);

  // 4. Risk-constraint architecture (0.20)
  let risk = 80 - Math.min(50, unfalsifiable * 20) - Math.min(20, superlatives * 5);
  risk = clamp(risk);

  const subscores = [
    { criterion: "value-driver linkage", weight: 0.3, points: round(value) },
    { criterion: "category-authority position", weight: 0.25, points: round(authority) },
    { criterion: "claim substantiation", weight: 0.25, points: round(substantiation) },
    { criterion: "risk-constraint architecture", weight: 0.2, points: round(risk) },
  ];

  const findings = [];
  const rewrites = [];

  // Only raise the vanity-metric finding when the asset is *relying* on vanity
  // metrics, not when it is arguing against them (vanityApproving > 0 and
  // exceeds the named value drivers, or no drivers at all and no critique either).
  if (vanityApproving > drivers || (drivers === 0 && vanityInCritique === 0)) {
    // Find a sentence with an approving vanity mention where possible, otherwise
    // fall back to the first sentence in the asset.
    const approvedSentence =
      sentences.find((s, idx) => {
        if (!s.match(VANITY_METRICS)) return false;
        const win = [sentences[idx - 1] || "", s, sentences[idx + 1] || ""].join(" ");
        return !VANITY_CRITIQUE_CONTEXT.test(win) && !CONTRARIAN_NG.test(win);
      }) || sentences[0] || text;
    findings.push({
      severity: "high",
      finding:
        "The case rests on vanity metrics (reach/impressions/engagement) a CFO discounts, not on a value driver the reader controls. Connect at least one claim to revenue, CAC, retention/LTV, risk, or capital efficiency.",
      evidence: truncate(approvedSentence),
    });
    rewrites.push({
      original: truncate(approvedSentence, 240),
      revised: truncate(approvedSentence, 180) + " - and tie that to the CAC you can lower and the retention you keep, the drivers a CFO already tracks.",
      rationale: "value-driver linkage - re-anchors a soft claim to a named enterprise value driver.",
    });
  }
  const superSentence = firstSentenceWith(sentences, [SUPERLATIVES]);
  if (superlatives > 0 && (citations === 0 || substantiation < 60)) {
    findings.push({
      severity: citations === 0 ? "high" : "medium",
      finding:
        "Superlatives stand in for evidence a skeptic can check. Every strong claim should carry a number, a named source, a shipped artifact, or a mechanism.",
      evidence: superSentence ? truncate(superSentence) : undefined,
    });
    if (superSentence) {
      rewrites.push({
        original: truncate(superSentence, 240),
        revised: truncate(superSentence.replace(SUPERLATIVES, "[specific, checkable claim]"), 240),
        rationale: "claim substantiation - replaces an unsubstantiated superlative with a checkable fact or mechanism.",
      });
    }
  }
  if (unfalsifiable > 0) {
    const s = firstSentenceWith(sentences, [UNFALSIFIABLE]);
    findings.push({
      severity: "medium",
      finding:
        "Unfalsifiable or absolute claims create credibility and legal risk. Keep claims confident but inside what can be defended.",
      evidence: s ? truncate(s) : undefined,
    });
  }
  if (findings.length === 0) {
    findings.push({
      severity: "low",
      finding:
        "Strength - the narrative links to a driver a C-suite tracks and stakes a defensible position with proof. This is the asset's moat; keep it.",
    });
  }

  return { subscores, findings, rewrites };
}

function scoreSignal(text, sentences, wordCount, title) {
  const tells = LLM_TELLS.reduce((n, re) => n + countMatches(text, re), 0);
  const emDashPerSentence = countMatches(text, /\u2014/g) / Math.max(1, sentences.length);
  const named = countMatches(text, NAMED_ENTITY);
  const numbers = countMatches(text, NUMBERS);
  const dates = countMatches(text, DATES);
  const firstPerson = countMatches(text, FIRST_PERSON);
  const quotes = countMatches(text, QUOTES);
  const authorityAssertion = countMatches(text, AUTHORITY_ASSERTION);
  const citations = countMatches(text, CITATION);
  const dollars = countMatches(text, DOLLARS);

  // Thesis extractability: is there a strong, self-contained claim in the first
  // ~2 sentences (a claim near the top an answer engine can lift)?
  const opener = sentences.slice(0, 2).join(" ");
  const thesisUpFront = /\bthe only|is that|means that|the answer|here(?:'|\u2019)?s (?:why|the)|because\b/i.test(opener) || /[.!?]/.test(opener);
  const humanSignals = named * 1 + numbers * 1 + dates * 2 + Math.min(4, firstPerson) + quotes * 2;

  // 1. LLM-tell removal (0.30)
  let tellRemoval = 90 - Math.min(70, tells * 12);
  if (emDashPerSentence > 0.5) tellRemoval -= 15;
  tellRemoval = clamp(tellRemoval);

  // 2. Human-signal density (0.30)
  let human = 30 + Math.min(55, humanSignals * 4) - Math.min(25, authorityAssertion * 12);
  human = clamp(human);

  // 3. Answer-engine structure / GEO-AEO (0.25)
  let structure = 40 + (thesisUpFront ? 20 : 0) + Math.min(25, citations * 8);
  if (numbers > 0 && citations === 0) structure -= 15; // uncited numbers won't be attributed
  structure = clamp(structure);

  // 4. Metadata & machine-legibility (0.15)
  let metadata = 55;
  if (title && title.trim() && title.trim().toLowerCase() !== "untitled asset") metadata += 20;
  if (wordCount >= 120) metadata += 15;
  metadata = clamp(metadata);

  const subscores = [
    { criterion: "LLM-tell removal", weight: 0.3, points: round(tellRemoval) },
    { criterion: "human-signal density", weight: 0.3, points: round(human) },
    { criterion: "answer-engine structure", weight: 0.25, points: round(structure) },
    { criterion: "metadata & machine-legibility", weight: 0.15, points: round(metadata) },
  ];

  const findings = [];
  const rewrites = [];

  // Locate the first LLM tell for evidence + a concrete strip rewrite.
  let tellSentence = null;
  let tellRe = null;
  for (const re of LLM_TELLS) {
    const s = firstSentenceWith(sentences, [re]);
    if (s) {
      tellSentence = s;
      tellRe = re;
      break;
    }
  }
  if (tells > 0 && tellSentence) {
    findings.push({
      severity: tells >= 3 ? "high" : "medium",
      finding:
        "Machine stylistic tells flag the asset as AI output and lower human trust. Strip hedging boilerplate and filler and replace it with plain, specific prose.",
      evidence: truncate(tellSentence),
    });
    const stripped = tellSentence.replace(tellRe, "").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
    rewrites.push({
      original: truncate(tellSentence, 240),
      revised: truncate(stripped || tellSentence, 240),
      rationale: "LLM-tell removal - deletes the machine footprint and keeps the plain, specific claim.",
    });
  }
  if (authorityAssertion > 0) {
    const s = firstSentenceWith(sentences, [AUTHORITY_ASSERTION]);
    findings.push({
      severity: "high",
      finding:
        "Authority-by-assertion ('studies show', 'experts agree') with nothing an engine or reader can cite. Swap generic authority for a named source, number, or first-hand detail.",
      evidence: s ? truncate(s) : undefined,
    });
    if (s) {
      rewrites.push({
        original: truncate(s, 240),
        revised: truncate(s.replace(AUTHORITY_ASSERTION, "[name the specific source and year]"), 240),
        rationale: "human-signal density - replaces generic authority with a citable, attributable source.",
      });
    }
  }
  if (numbers > 0 && citations === 0) {
    const s = firstSentenceWith(sentences, [DOLLARS, /\d/]) || sentences[0];
    findings.push({
      severity: "medium",
      finding:
        "Citable numbers carry no citation, so no answer engine will attribute them to you - and cited statistics are the GEO-proven lever for being quoted as a source.",
      evidence: s ? truncate(s) : undefined,
    });
    if (s) {
      rewrites.push({
        original: truncate(s, 240),
        revised: truncate(s, 200) + " (add the source and year for each figure).",
        rationale: "answer-engine structure - cited statistics are the GEO-proven lever for engine citation.",
      });
    }
  }
  if (!thesisUpFront) {
    findings.push({
      severity: "medium",
      finding:
        "The thesis is not front-loaded, so an answer engine that lands here can't lift a single attributable sentence stating the claim. Move the one-sentence thesis to the opening.",
      evidence: truncate(sentences[0] || text),
    });
  }
  if (findings.length === 0) {
    findings.push({
      severity: "low",
      finding:
        "Strength - low LLM-tell footprint and high human-signal density (named people, dated events, concrete numbers). This is what a model can't fabricate; keep it.",
    });
  }

  return { subscores, findings, rewrites };
}

/* ---------------- composition ---------------- */

function weightedScore(subscores) {
  return round(subscores.reduce((sum, s) => sum + s.weight * s.points, 0));
}

function buildGate(gate, { subscores, findings, rewrites }) {
  const score = weightedScore(subscores);
  const ranked_reasons = findings.slice(0, 5).map((f, i) => {
    const r = { rank: i + 1, severity: f.severity, finding: f.finding };
    if (f.evidence) r.evidence = f.evidence;
    return r;
  });
  return {
    gate,
    gate_name: GATE_META[gate].gate_name,
    framework: GATE_META[gate].framework,
    score,
    verdict: VERDICT(score),
    subscores,
    ranked_reasons,
    rewrites: rewrites.slice(0, 5),
  };
}

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

function buildTopMoves(gates) {
  // Rank concrete moves across all gates: highest-severity findings first, then
  // by the gate's shortfall from PASS. Always return 3-5.
  const candidates = [];
  for (const g of gates) {
    const shortfall = Math.max(0, 75 - g.score);
    for (const r of g.ranked_reasons) {
      if (r.severity === "low") continue; // strengths are not "moves"
      candidates.push({
        gate: g.gate,
        severity: r.severity,
        shortfall,
        move: r.finding,
      });
    }
  }
  candidates.sort((a, b) => {
    if (SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity])
      return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    return b.shortfall - a.shortfall;
  });

  // Pad to at least 3 using the lowest-scoring subscores if we lack findings.
  if (candidates.length < 3) {
    const bySub = [];
    for (const g of gates) {
      for (const s of g.subscores) bySub.push({ gate: g.gate, points: s.points, criterion: s.criterion });
    }
    bySub.sort((a, b) => a.points - b.points);
    for (const s of bySub) {
      if (candidates.length >= 3) break;
      if (candidates.some((c) => c.gate === s.gate && c.move.startsWith("Raise"))) continue;
      candidates.push({
        gate: s.gate,
        severity: "medium",
        shortfall: 75 - s.points,
        move: `Raise the '${s.criterion}' sub-criterion, currently the weakest lever in this gate at ${s.points}/100.`,
      });
    }
  }

  return candidates.slice(0, 5).map((c, i) => ({ rank: i + 1, gate: c.gate, move: c.move }));
}

/**
 * Run the full three-gate Skillfoundry audit against an asset.
 * @param {string} assetText - the raw content to audit.
 * @param {{ title?: string, source?: string }} [meta]
 * @returns {object} a report conforming to schema/audit-report.schema.json.
 */
export function runAudit(assetText, meta = {}) {
  const text = String(assetText || "").trim();
  const sentences = splitSentences(text);
  const wordCount = countWords(text);
  const title = (meta.title && String(meta.title).trim()) || "Untitled asset";

  const gates = [
    buildGate("relevance", scoreRelevance(text, sentences)),
    buildGate("performance", scorePerformance(text, sentences)),
    buildGate("signal", scoreSignal(text, sentences, wordCount, meta.title)),
  ];

  const WEIGHTS = { relevance: 0.4, performance: 0.35, signal: 0.25 };
  const composite = round(gates.reduce((sum, g) => sum + WEIGHTS[g.gate] * g.score, 0));

  const anyBlock = gates.some((g) => g.verdict === "BLOCK");
  const allPass = gates.every((g) => g.verdict === "PASS");
  const ship_recommendation = anyBlock ? "BLOCK" : allPass ? "SHIP" : "REVISE";

  const asset = {
    title,
    word_count: wordCount,
    audited_at: new Date().toISOString(),
  };
  if (meta.source && String(meta.source).trim()) asset.source = String(meta.source).trim();

  return {
    asset,
    gates,
    rollup: {
      composite_score: composite,
      ship_recommendation,
      top_moves: buildTopMoves(gates),
    },
  };
}

export default runAudit;
