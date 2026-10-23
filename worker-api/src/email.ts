/**
 * App mail, through Resend: from TinyFloor at mail.tinyfloor.com (its own
 * subdomain, signed there, so it never weighs on the main domain), with
 * replies going to support@tinyfloor.com, the inbox people actually read
 * (Zoho). Only mail the app has a reason to send: no reminders or nudges.
 * Without RESEND_API_KEY (locally) nothing is sent; what would have been is logged.
 */

const FROM = "TinyFloor <hello@mail.tinyfloor.com>";
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

/**
 * Every app email looks the same: TinyFloor's mark, a white card, plain short
 * text and one dark button, as the app's own buttons are; and the same words
 * as plain text, for clients that show only that (and for spam filters, which
 * trust mail that has both).
 */
export function letter({ preview, heading, paragraphs, code, button, footnote }: Letter): { html: string; text: string } {
  const body = paragraphs.map((paragraph) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;">${escape(paragraph)}</p>`).join("");
  const codeBlock = code
    ? `<p style="margin:8px 0 24px;padding:16px;border-radius:12px;background:#f4f4f5;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:30px;font-weight:600;letter-spacing:8px;color:#18181b;">${escape(code)}</p>`
    : "";
  const action = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:999px;background:#18181b;">
<a href="${escape(button.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escape(button.label)}</a>
</td></tr></table>
<p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#71717a;">Or open this link: <a href="${escape(button.url)}" style="color:#71717a;word-break:break-all;">${escape(button.url)}</a></p>`
    : "";
  const note = footnote ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#71717a;">${escape(footnote)}</p>` : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escape(heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preview)}${PREVIEW_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<tr><td style="padding:0 4px 20px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td><img src="${LOGO}" width="28" height="28" alt="" style="display:block;border-radius:8px;"></td>
<td style="padding-left:10px;font-size:16px;font-weight:600;color:#18181b;">TinyFloor</td>
</tr></table></td></tr>
<tr><td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:16px;padding:32px 28px;">
<h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;font-weight:600;color:#18181b;">${escape(heading)}</h1>
${body}${codeBlock}${action}${note}
</td></tr>
<tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.5;color:#a1a1aa;">TinyFloor · <a href="https://tinyfloor.com" style="color:#a1a1aa;">tinyfloor.com</a> · Questions? Just reply to this email.</td></tr>
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
    "TinyFloor · tinyfloor.com · Questions? Just reply to this email.",
  ].join("\n");

  return { html, text };
}

function escape(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
