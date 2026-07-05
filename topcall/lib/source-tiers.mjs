/**
 * Top Call source-authority trust layer.
 *
 * Encodes the Source Authority Policy (Tiers 1A / 1B / 1C / 2 / 3) as code so
 * every ingested claim is graded the same way every run. This is the
 * non-replicable asset: the classification and the confidence math travel with
 * the corpus, they do not evaporate when a chat ends.
 *
 * A publication maps to exactly one tier. Unknown publications fall through to
 * Tier 3 (discovery only) so nothing silently inherits authority it did not earn.
 */

// tier -> { rank (lower = more authoritative), label, base confidence for a lone source }
export const TIERS = {
  "1A": { rank: 1, label: "High-authority business / news media", base: "high" },
  "1B": { rank: 2, label: "Brand-name advertising / marketing / media trade", base: "high" },
  "1C": { rank: 3, label: "Reputable analyst / trade body / measurement", base: "high" },
  "2": { rank: 4, label: "Primary source (confirms facts, not interpretation)", base: "medium" },
  "3": { rank: 5, label: "Supplemental / discovery only", base: "low" },
};

// publication (normalized) -> tier
const TIER_1A = [
  "reuters", "associated press", "ap", "bloomberg", "cnbc", "wall street journal",
  "wsj", "financial times", "ft", "new york times", "nyt", "washington post",
  "the economist", "fortune", "forbes", "business insider", "variety",
  "hollywood reporter", "deadline", "sports business journal",
];
const TIER_1B = [
  "ad age", "adage", "adweek", "campaign", "the drum", "digiday", "marketing dive",
  "retail dive", "modern retail", "retail brew", "emarketer", "insider intelligence",
  "the current", "mediapost", "exchangewire", "adexchanger", "marketing brew",
  "business of fashion", "restaurant dive", "food dive", "glossy",
];
const TIER_1C = [
  "ana", "iab", "iab tech lab", "4a's", "4as", "arf", "warc", "forrester",
  "gartner", "nielsen", "kantar", "comscore", "circana", "conference board",
  "cannes lions", "lions", "ces", "newfronts",
];
const TIER_2_HINTS = [
  "press release", "investor relations", "newsroom", "official blog",
  "sec filing", "business wire", "businesswire", "pr newswire", "prnewswire",
  "linkedin", "speaker page",
];

function normalize(name) {
  return String(name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Classify a publication string into a source tier. */
export function classifyTier(publication) {
  const n = normalize(publication);
  if (!n) return "3";
  if (TIER_1A.includes(n)) return "1A";
  if (TIER_1B.includes(n)) return "1B";
  if (TIER_1C.includes(n)) return "1C";
  // Tier 2 primary sources are usually described, not brand-named.
  if (TIER_2_HINTS.some((h) => n.includes(h))) return "2";
  return "3";
}

export function tierLabel(tier) {
  return (TIERS[tier] || TIERS["3"]).label;
}

export function tierRank(tier) {
  return (TIERS[tier] || TIERS["3"]).rank;
}

/** Confidence for a single source of a given tier. */
export function baseConfidence(tier) {
  return (TIERS[tier] || TIERS["3"]).base;
}

const CONF_RANK = { high: 3, medium: 2, low: 1 };

/**
 * Combined confidence for a claim supported by MANY sources — this is where the
 * corpus compounds. Corroboration by higher-authority sources upgrades a claim
 * that first arrived from a weaker one; it never launders a pile of Tier 3 noise
 * into a Tier 1 fact.
 */
export function combinedConfidence(tiers) {
  const list = (tiers || []).filter(Boolean);
  if (list.length === 0) return { level: "low", rationale: "no sources" };

  const hasTier1 = list.some((t) => t.startsWith("1"));
  const hasTier2 = list.some((t) => t === "2");
  const count = list.length;
  const distinct = new Set(list).size;

  if (hasTier1) {
    if (count >= 2) {
      return {
        level: "high",
        rationale: `Tier 1 source corroborated by ${count} sources across ${distinct} tier(s)`,
      };
    }
    return { level: "high", rationale: "Tier 1 reported coverage" };
  }
  if (hasTier2) {
    if (count >= 2) {
      return {
        level: "medium",
        rationale: `${count} primary sources agree, but no Tier 1 third-party validation`,
      };
    }
    return { level: "medium", rationale: "primary source confirms facts; interpretation is ours" };
  }
  return {
    level: "low",
    rationale:
      count >= 2
        ? `${count} supplemental sources only — keep out of the main brief until corroborated`
        : "supplemental / discovery source only",
  };
}

export function confRank(level) {
  return CONF_RANK[level] || 0;
}
