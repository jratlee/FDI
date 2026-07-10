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
    lead: "Thanks for joining the Skillfoundry waitlist. Skillfoundry turns your signal into value with a modular architecture built on the open Model Context Protocol, so it runs in any MCP-compatible client. We'll reach out with early access before we open the doors.",
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

function subscriberHtml({ heading, lead, product, unsubscribeUrl }) {
  const unsub = unsubscribeUrl
    ? `<br>Don't want these emails? <a href="${unsubscribeUrl}" style="color:${C.amber};">Remove me from the list</a>.`
    : "";
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
    <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:${C.faded};">You received this because you signed up for ${product} at False Dawn Industries.${unsub}</p>
  </td></tr>
</table>
</body></html>`;
}

function subscriberText({ heading, lead, product, unsubscribeUrl }) {
  const unsub = unsubscribeUrl
    ? `\n\nDon't want these emails? Remove yourself from the list: ${unsubscribeUrl}`
    : "";
  return `${heading}\n\n${lead}\n\n\u2014 False Dawn Industries\n\nYou received this because you signed up for ${product} at False Dawn Industries.${unsub}`;
}

// Double opt-in: the first message a new signup receives. Asks them to click a
// unique, expiring link to prove the address is theirs before we send anything
// else. The welcome email only goes out once they confirm.
function confirmHtml({ product, confirmUrl, unsubscribeUrl, days }) {
  const unsub = unsubscribeUrl
    ? `<br>Didn't sign up? You can safely ignore this email, or <a href="${unsubscribeUrl}" style="color:${C.amber};">remove this address</a>.`
    : "Didn't sign up? You can safely ignore this email.";
  return `<!doctype html><html><body style="margin:0;padding:0;background:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${C.panel};border:1px solid ${C.border};border-radius:14px;overflow:hidden;">
      <tr><td style="padding:32px 32px 8px;">
        <p style="margin:0 0 20px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${C.faded};">Growth Cartography</p>
        <h1 style="margin:0 0 14px;font-family:'Space Grotesk',Arial,sans-serif;font-size:24px;line-height:1.2;color:${C.cream};">Confirm your email</h1>
        <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${C.cream};">Please confirm your email address to finish joining ${product}. Click the button below and you're all set.</p>
        <p style="margin:0 0 22px;"><a href="${confirmUrl}" style="display:inline-block;background:${C.amber};color:${C.bg};font-family:'Space Grotesk',Arial,sans-serif;font-weight:600;font-size:15px;text-decoration:none;padding:13px 24px;border-radius:10px;">Confirm my email</a></p>
        <p style="margin:0 0 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${C.faded};">This link expires in ${days} days. If the button doesn't work, copy and paste this link into your browser:<br><span style="color:${C.amberSoft};word-break:break-all;">${confirmUrl}</span></p>
      </td></tr>
      <tr><td style="padding:0 32px 32px;">
        <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${C.faded};">\u2014 False Dawn Industries</p>
      </td></tr>
    </table>
    <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:${C.faded};">You received this because this address was used to sign up for ${product} at False Dawn Industries.${unsub}</p>
  </td></tr>
</table>
</body></html>`;
}

function confirmText({ product, confirmUrl, unsubscribeUrl, days }) {
  const unsub = unsubscribeUrl
    ? `\n\nDidn't sign up? You can safely ignore this email, or remove this address: ${unsubscribeUrl}`
    : "\n\nDidn't sign up? You can safely ignore this email.";
  return `Confirm your email\n\nPlease confirm your email address to finish joining ${product}. Open the link below and you're all set:\n\n${confirmUrl}\n\nThis link expires in ${days} days.\n\n\u2014 False Dawn Industries\n\nYou received this because this address was used to sign up for ${product} at False Dawn Industries.${unsub}`;
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
  /* ---- MarCom Architecture Kit (kit copy rules: no em-dashes) ---- */
  mk1: {
    product: "MarCom Architecture Kit — Foundation Playbook",
    subject: "Your MarCom Foundation Playbook",
    heading: "Your playbook is ready",
    lead: "Thanks for buying the MarCom Foundation Playbook. Your license key is below. Keep it safe: use the download link on your confirmation page to get the complete playbook package any time.",
  },
  mk2: {
    product: "MarCom Architecture Kit — Living Architecture",
    subject: "Your Living Architecture subscription key",
    heading: "Your subscription is live",
    lead: "Thanks for subscribing to Living Architecture. Your subscription key is below. It unlocks the playbook download plus quarterly framework updates and new templates as they ship.",
  },
  "mk2-annual": {
    product: "MarCom Architecture Kit — Living Architecture (annual)",
    subject: "Your Living Architecture subscription key",
    heading: "Your annual subscription is live",
    lead: "Thanks for subscribing to Living Architecture on the annual plan. Your subscription key is below. It unlocks the playbook download plus quarterly framework updates and new templates as they ship.",
  },
  "mk2-agency": {
    product: "MarCom Architecture Kit — Agency Team",
    subject: "Your Agency Team subscription key",
    heading: "Your Agency Team subscription is live",
    lead: "Thanks for subscribing to the Agency Team tier. Your subscription key is below. It unlocks the playbook download, quarterly updates, team seats, and white-label rights, which are exclusive to this tier.",
  },
  mk3: {
    product: "MarCom Architecture Kit — Architecture Partner",
    subject: "Welcome to the Architecture Partner retainer",
    heading: "Welcome aboard",
    lead: "Thanks for starting the Architecture Partner retainer. Your subscription key is below. We will reach out shortly to schedule your kickoff and hands-on Hourglass migration. There is nothing to download.",
  },
  "mk-sprint": {
    product: "MarCom Architecture Kit — Transformation Sprint",
    subject: "Your Transformation Sprint is booked",
    heading: "Your sprint is booked",
    lead: "Thanks for booking the fixed four-week Transformation Sprint. Your order key is below for reference. We will reach out shortly to schedule the kickoff and scope the four weeks.",
  },
  "mk-audit": {
    product: "MarCom Architecture Kit — Governance Risk Audit",
    subject: "Your Governance Risk Audit is confirmed",
    heading: "Your audit is confirmed",
    lead: "Thanks for purchasing the Governance Risk Audit. Your order key is below for reference. We will reach out shortly to collect what we need and schedule the review. The full fee is credited toward Tier 3 if you upgrade within 90 days.",
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

// Manual-fulfillment purchases (retainer, sprint, audit) notify the team so a
// human starts onboarding. Best-effort; never throws.
export async function sendPurchaseNotification({ email, tierLabel, product, key }) {
  if (!FROM || !NOTIFY) {
    if (!FROM) console.warn("[email] RESEND_FROM not set — skipping purchase notification");
    return;
  }
  try {
    await send({
      from: FROM,
      to: [NOTIFY],
      subject: `Manual fulfillment needed: ${tierLabel}`,
      text: `A purchase that needs manual fulfillment just landed.\n\nProduct: ${product}\nTier:    ${tierLabel}\nBuyer:   ${email || "(no email on session)"}\nKey:     ${key}\nTime:    ${new Date().toISOString()}\n\nReach out to the buyer to start onboarding.`,
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    });
  } catch (err) {
    console.error("[email] purchase notification failed:", err.message);
  }
}

// Double opt-in step 1: ask a brand-new signup to confirm their address.
// Fire-and-forget — never throws, so a mail hiccup never breaks the signup.
// This is the ONLY message an unconfirmed signup receives; the welcome email
// (below) is held back until they click the confirm link.
export async function sendConfirmationRequest({
  email,
  source,
  confirmUrl,
  unsubscribeUrl,
  days,
}) {
  const product = copyFor(source).product;
  if (!FROM) {
    console.warn(
      "[email] RESEND_FROM not set — skipping confirmation request for",
      email,
    );
    return;
  }
  const model = { product, confirmUrl, unsubscribeUrl, days };
  try {
    await send({
      from: FROM,
      to: [email],
      subject: `Confirm your email for ${product}`,
      html: confirmHtml(model),
      text: confirmText(model),
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      // One-click unsubscribe (RFC 8058): even a pending signup can opt out
      // before confirming, and it keeps us out of spam folders.
      ...(unsubscribeUrl
        ? {
            headers: {
              "List-Unsubscribe": `<${unsubscribeUrl}>`,
              "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
          }
        : {}),
    });
  } catch (err) {
    console.error("[email] confirmation request failed:", err.message);
  }
}

// Immediate heads-up to the team when a brand-new signup lands (still
// PENDING confirmation). Sent only for new rows, never on duplicate/resend
// paths, so the team sees each address at most once at this stage. This goes
// to the owner's own address, so it works even while RESEND_FROM is the
// Resend shared test sender (which can't deliver to other recipients).
// Never throws — best-effort like all other mail.
export async function sendPendingSignupNotification({ email, source }) {
  if (!FROM || !NOTIFY) {
    if (!FROM) console.warn("[email] RESEND_FROM not set — skipping pending-signup notification");
    return;
  }
  const copy = copyFor(source);
  try {
    await send({
      from: FROM,
      to: [NOTIFY],
      subject: `New waitlist signup (pending confirmation): ${email}`,
      text: `New signup on False Dawn Industries — PENDING email confirmation.\n\nEmail:  ${email}\nSource: ${source}\nProduct: ${copy.product}\nTime:   ${new Date().toISOString()}\n\nA separate "confirmed" notification follows if they click the confirmation link.`,
      ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
    });
  } catch (err) {
    console.error("[email] pending-signup notification failed:", err.message);
  }
}

// Double opt-in step 2: once the address is confirmed, send the real welcome
// to the subscriber and (optionally) notify the team. Firing team notification
// here (not at signup) means the team only hears about proven, real addresses.
// Never throws — email is best-effort and must not break the confirm flow.
export async function sendWelcomeEmails({ email, source, unsubscribeUrl }) {
  const copy = { ...copyFor(source), unsubscribeUrl };

  if (!FROM) {
    console.warn(
      "[email] RESEND_FROM not set — skipping welcome email for",
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
        // One-click unsubscribe (RFC 8058) so mailbox providers surface a
        // native "Unsubscribe" control alongside the in-body link.
        ...(unsubscribeUrl
          ? {
              headers: {
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }
          : {}),
      });
    } catch (err) {
      console.error("[email] welcome email failed:", err.message);
    }
  }

  if (FROM && NOTIFY) {
    try {
      await send({
        from: FROM,
        to: [NOTIFY],
        subject: `New confirmed ${copy.product} signup: ${email}`,
        text: `New CONFIRMED signup on False Dawn Industries.\n\nEmail:  ${email}\nSource: ${source}\nProduct: ${copy.product}\nTime:   ${new Date().toISOString()}`,
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      });
    } catch (err) {
      console.error("[email] team notification failed:", err.message);
    }
  }
}

export const emailConfigured = Boolean(FROM);
