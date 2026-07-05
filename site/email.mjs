// Transactional email for waitlist signups.
// Uses the Resend integration via Replit Connectors (see the `integrations`
// skill / Resend blueprint). The SDK handles identity + token refresh; never
// cache the client. `proxy()` returns a standard fetch Response.
import { ReplitConnectors } from "@replit/connectors-sdk";

// Where confirmation/welcome mail is sent FROM. Must be an address on a domain
// verified in the connected Resend account, e.g.
// "False Dawn Industries <hello@falsedawn.example>". If unset, subscriber
// confirmation is skipped (logged) so a signup never fails for want of email.
const FROM = (process.env.RESEND_FROM || "").trim();
// Optional internal address notified of each new signup. If unset, no team
// notification is sent.
const NOTIFY = (process.env.WAITLIST_NOTIFY_EMAIL || "").trim();
// Optional reply-to for subscriber mail (defaults to FROM's address).
const REPLY_TO = (process.env.RESEND_REPLY_TO || "").trim();

// Brand tokens (locked FDI palette — see replit.md).
const C = {
  bg: "#0D0B08",
  panel: "#15120c",
  border: "#2a2418",
  cream: "#F0E8D5",
  faded: "#A8997B",
  amber: "#FFB12B",
  amberSoft: "#FFCB6B",
};

// Per-source copy. `source` is the sanitized waitlist tag from the form.
const SOURCES = {
  skillfoundry: {
    product: "Skillfoundry",
    subject: "You're on the Skillfoundry waitlist",
    heading: "You're on the list",
    lead: "Thanks for joining the Skillfoundry waitlist. Skillfoundry turns your signal into value with an Anthropic-standard modular architecture — we'll reach out with early access before we open the doors.",
  },
  topcall: {
    product: "Top Call",
    subject: "You're on the Top Call waitlist",
    heading: "You're on the list",
    lead: "Thanks for joining the Top Call waitlist. Top Call is \u201CSignal as Code\u201D \u2014 a source-authority-graded corpus, knowledge graph, and verifiable MCP interface. We'll be in touch with early access.",
  },
  "topcall-prompt-pack": {
    product: "Top Call",
    subject: "Your Top Call prompt-pack",
    heading: "Your prompt-pack is on its way",
    lead: "Thanks for grabbing the free Top Call prompt-pack. Your download should have started in your browser \u2014 if it didn't, head back to the Top Call page and click through again. We'll also keep you posted on Top Call as it ships.",
  },
  site: {
    product: "False Dawn Industries",
    subject: "You're on the False Dawn Industries list",
    heading: "You're on the list",
    lead: "Thanks for signing up. We build owned marketing systems for aggregated, decentralized, and autonomous markets \u2014 we'll keep you posted on what's next.",
  },
};

function copyFor(source) {
  return SOURCES[source] || SOURCES.site;
}

function subscriberHtml({ heading, lead, product }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.panel};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
      <tr><td style="padding:32px 32px 8px;">
        <p style="margin:0 0 20px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${C.faded};">Growth Cartography</p>
        <h1 style="margin:0 0 14px;font-family:'Space Grotesk',Arial,sans-serif;font-size:24px;line-height:1.2;color:${C.cream};">${heading}</h1>
        <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${C.cream};">${lead}</p>
      </td></tr>
      <tr><td style="padding:0 32px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${C.faded};">\u2014 False Dawn Industries</p>
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.faded};">You received this because you signed up for ${product} at False Dawn Industries.</p>
  </td></tr>
</table>
</body></html>`;
}

function subscriberText({ heading, lead, product }) {
  return `${heading}\n\n${lead}\n\n\u2014 False Dawn Industries\n\nYou received this because you signed up for ${product} at False Dawn Industries.`;
}

async function send(message) {
  // Fresh client per call — tokens expire, never cache. (Resend integration)
  const connectors = new ReplitConnectors();
  const res = await connectors.proxy("resend", "/emails", {
    method: "POST",
    body: message,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = res.statusText;
    }
    throw new Error(`resend ${res.status}: ${detail}`);
  }
  return res.json();
}

// Per-tier copy for the post-purchase entitlement email.
const TIER_EMAIL = {
  tier1: {
    product: "Skillfoundry — Perpetual License",
    subject: "Your Skillfoundry license key",
    heading: "Your license is ready",
    lead: "Thanks for buying the Skillfoundry Perpetual License. Your license key is below — keep it safe. Use the download link on your confirmation page to get the plugin.",
  },
  tier2: {
    product: "Skillfoundry — Living Brain",
    subject: "Your Skillfoundry subscription key",
    heading: "Your subscription is live",
    lead: "Thanks for subscribing to Skillfoundry Living Brain. Your subscription key is below — the thin client sends it to our backend, which validates it before every run so you always get the latest gate logic.",
  },
  tier3: {
    product: "Skillfoundry — Advisory",
    subject: "Your Skillfoundry Advisory access",
    heading: "Welcome to Advisory",
    lead: "Thanks for joining Skillfoundry Advisory. Your subscription key is below. A strategist will reach out shortly to schedule your hands-on onboarding — there is nothing to download.",
  },
};

function entitlementHtml({ heading, lead, product, key, keyType, needsOnboarding }) {
  const label = keyType === "license" ? "License key" : "Subscription key";
  const onboard = needsOnboarding
    ? `<p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${C.faded};">We'll be in touch to arrange your onboarding — no self-serve download for this tier.</p>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.panel};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
      <tr><td style="padding:32px 32px 8px;">
        <p style="margin:0 0 20px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${C.faded};">Growth Cartography</p>
        <h1 style="margin:0 0 14px;font-family:'Space Grotesk',Arial,sans-serif;font-size:24px;line-height:1.2;color:${C.cream};">${heading}</h1>
        <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${C.cream};">${lead}</p>
        <p style="margin:0 0 6px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${C.faded};">${label}</p>
        <p style="margin:0 0 22px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:20px;letter-spacing:.06em;color:${C.amberSoft};background:${C.bg};border:1px solid ${C.border};border-radius:10px;padding:14px 16px;">${key}</p>
        ${onboard}
      </td></tr>
      <tr><td style="padding:0 32px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${C.faded};">\u2014 False Dawn Industries</p>
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.faded};">You received this because you purchased ${product} at False Dawn Industries.</p>
  </td></tr>
</table>
</body></html>`;
}

function entitlementText({ heading, lead, product, key, keyType, needsOnboarding }) {
  const label = keyType === "license" ? "License key" : "Subscription key";
  const onboard = needsOnboarding
    ? "\n\nWe'll be in touch to arrange your onboarding — no self-serve download for this tier."
    : "";
  return `${heading}\n\n${lead}\n\n${label}: ${key}${onboard}\n\n\u2014 False Dawn Industries\n\nYou received this because you purchased ${product} at False Dawn Industries.`;
}

// Best-effort: email the buyer their license/subscription key after purchase.
// Never throws — delivery is a courtesy; the success page always shows the key.
export async function sendEntitlementEmail({
  email,
  tier,
  keyType,
  key,
  hasDownload,
  needsOnboarding,
}) {
  const copy = TIER_EMAIL[tier] || TIER_EMAIL.tier1;
  if (!FROM) {
    console.warn(
      "[email] RESEND_FROM not set — skipping entitlement email for",
      email,
    );
    return;
  }
  const model = { ...copy, key, keyType, needsOnboarding };
  try {
    await send({
      from: FROM,
      to: [email],
      subject: copy.subject,
      html: entitlementHtml(model),
      text: entitlementText(model),
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    });
  } catch (err) {
    console.error("[email] entitlement email failed:", err.message);
  }
}

// Fire-and-forget: send the subscriber confirmation and (optionally) a team
// notification. Never throws — email is best-effort and must not break signup.
export async function sendSignupEmails({ email, source }) {
  const copy = copyFor(source);

  if (!FROM) {
    console.warn(
      "[email] RESEND_FROM not set — skipping subscriber confirmation for",
      email,
    );
  } else {
    try {
      await send({
        from: FROM,
        to: [email],
        subject: copy.subject,
        html: subscriberHtml(copy),
        text: subscriberText(copy),
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      });
    } catch (err) {
      console.error("[email] subscriber confirmation failed:", err.message);
    }
  }

  if (FROM && NOTIFY) {
    try {
      await send({
        from: FROM,
        to: [NOTIFY],
        subject: `New ${copy.product} signup: ${email}`,
        text: `New signup on False Dawn Industries.\n\nEmail:  ${email}\nSource: ${source}\nProduct: ${copy.product}\nTime:   ${new Date().toISOString()}`,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      });
    } catch (err) {
      console.error("[email] team notification failed:", err.message);
    }
  }
}

export const emailConfigured = Boolean(FROM);
