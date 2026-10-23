/**
 * App mail, through Resend: from hello@tinyfloor.com, signed for the main
 * domain (Resend's DKIM key beside Zoho's; bounces go to send.tinyfloor.com,
 * so the main domain's SPF stays Zoho's alone), with replies going to
 * support@tinyfloor.com, the inbox people actually read (Zoho, where hello@ is
 * an alias too). Sign-in codes are few and expected, so they're safe on the
 * main domain; bulk mail (news) belongs on a subdomain of its own, so its
 * complaints can't weigh on this. Only mail the app has a reason to send: no
 * reminders or nudges. Without RESEND_API_KEY (locally) nothing is sent; what
 * would have been is logged.
 */

const FROM = "TinyFloor <hello@tinyfloor.com>";
const REPLY_TO = "support@tinyfloor.com";
const LOGO = "https://app.tinyfloor.com/icon-192.png";
/**
 * Blank space after the preview text, so an inbox list shows only it and not
 * the email's first words after it, which repeat the subject.
 */
const PREVIEW_PAD = "&#847;&zwnj;&nbsp;".repeat(60);

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** What kind of mail it is, for Resend's logs: code, office, trial, pro, test. */
  kind: string;
  /** The same key sends once, however often it's asked (a retried request, a cron run twice). */
  key?: string;
}

/** Sends it; false when it couldn't be (no key, or Resend said no, which is in the worker's logs). */
export async function sendEmail(env: Env, email: Email): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.log("email not sent (no RESEND_API_KEY)", { kind: email.kind, to: email.to, subject: email.subject });
    return false;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(email.key ? { "Idempotency-Key": email.key } : {}),
    },
    body: JSON.stringify({
      from: FROM,
      to: [email.to],
      reply_to: REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
      tags: [{ name: "kind", value: email.kind }],
    }),
  });
  if (!response.ok) {
    console.warn("email not sent", { kind: email.kind, status: response.status, body: (await response.text()).slice(0, 300) });
    return false;
  }
  return true;
}

/** What one email says: a heading, a few short paragraphs, at most one button, and a quiet line under it. */
export interface Letter {
  /** Shown beside the subject in the inbox list, before it's opened. */
  preview: string;
  heading: string;
  paragraphs: string[];
  /** A code to type in, set large under the paragraphs. */
  code?: string;
  button?: { label: string; url: string };
  /** Why they got it, or what to do if it wasn't them. */
  footnote?: string;
}

/** The app's own colours (web-shared/src/app/ui.css), warm rather than the usual cool greys. */
const INK = "#1a1a18";
const BODY = "#45453f";
const MUTED = "#6b6b65";
const RULE = "#e7e6e1";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Helvetica,Arial,sans-serif";

/**
 * Every app email looks the same, the way the mail people trust from the
 * services they use does: a letter on white, not a card on grey. TinyFloor's
 * mark at the top left, a large plain heading, readable text, one ink button
 * (the app's own) with no link spelled out under it, and below a hairline,
 * who it's from and how to reach us. A code is set large as plain text, so
 * mail apps can offer to copy it. The
 * same words go as plain text too, for clients that show only that (and for
 * spam filters, which trust mail that has both).
 */
export function letter({ preview, heading, paragraphs, code, button, footnote }: Letter): { html: string; text: string } {
  const body = paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;font-size:16px;line-height:26px;color:${BODY};">${escape(paragraph)}</p>`)
    .join("");
  const codeBlock = code
    ? `<p style="margin:8px 0 28px;font-size:42px;line-height:50px;font-weight:700;letter-spacing:8px;color:${INK};">${escape(code)}</p>`
    : "";
  const action = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 28px;"><tr><td style="border-radius:999px;background:${INK};">
<a href="${escape(button.url)}" style="display:inline-block;padding:14px 26px;font-size:15px;line-height:20px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escape(button.label)}</a>
</td></tr></table>`
    : "";
  const note = footnote ? `<p style="margin:8px 0 0;font-size:14px;line-height:22px;color:${MUTED};">${escape(footnote)}</p>` : "";
  const link = (href: string, label: string) => `<a href="${href}" style="color:${MUTED};text-decoration:underline;">${label}</a>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preview)}${PREVIEW_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:40px 24px 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:${FONT};text-align:left;">
<tr><td style="padding:0 0 36px;"><a href="https://tinyfloor.com" style="text-decoration:none;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:middle;"><img src="${LOGO}" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px;"></td>
<td style="vertical-align:middle;padding-left:10px;font-size:18px;line-height:24px;font-weight:700;letter-spacing:-0.2px;color:${INK};">TinyFloor</td>
</tr></table></a></td></tr>
<tr><td>
<h1 style="margin:0 0 20px;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.4px;color:${INK};">${escape(heading)}</h1>
${body}${codeBlock}${action}${note}
</td></tr>
<tr><td style="padding:40px 0 0;"><div style="border-top:1px solid ${RULE};font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td style="padding:24px 0 0;font-size:13px;line-height:21px;color:${MUTED};">
<p style="margin:0 0 12px;"><b style="color:${INK};">TinyFloor</b>, a virtual office your remote team can walk around in.<br>Questions? Reply to this email. A person reads every one.</p>
<p style="margin:0;">${link("https://tinyfloor.com", "tinyfloor.com")} &nbsp;·&nbsp; ${link("https://tinyfloor.com/privacy", "Privacy")} &nbsp;·&nbsp; ${link("https://tinyfloor.com/terms", "Terms")}</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    heading,
    "",
    ...paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(code ? [code, ""] : []),
    ...(button ? [`${button.label}: ${button.url}`, ""] : []),
    ...(footnote ? [footnote, ""] : []),
    "--",
    "TinyFloor, a virtual office your remote team can walk around in.",
    "Questions? Reply to this email. A person reads every one.",
    "https://tinyfloor.com",
  ].join("\n");

  return { html, text };
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
