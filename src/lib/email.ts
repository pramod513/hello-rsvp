// Sends invite and reminder emails through Resend's HTTP API.
// Optional: when RESEND_API_KEY is not set, the dashboard falls back to
// opening the host's own email app with a ready-made message.

import { SITE_NAME } from "./site";

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}

/**
 * Sends up to 100 emails in one request with Resend's batch endpoint, which
 * keeps large guest lists well inside rate limits and serverless time limits.
 */
export async function sendEmailBatch(
  emails: OutgoingEmail[],
): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, error: "Email sending isn't set up." };
  if (emails.length === 0) return { ok: true, sent: 0 };

  let sent = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100).map((e) => ({
      from,
      to: [e.to],
      subject: e.subject,
      html: e.html,
      text: e.text,
      reply_to: e.replyTo || undefined,
    }));
    try {
      const response = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk),
      });
      if (!response.ok) {
        const detail = await response.text();
        return sent > 0
          ? { ok: false, error: `Sent ${sent}, then the email service returned ${response.status}: ${detail.slice(0, 160)}` }
          : { ok: false, error: `The email service returned ${response.status}: ${detail.slice(0, 160)}` };
      }
      sent += chunk.length;
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Network error" };
    }
  }
  return { ok: true, sent };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** A simple, widely compatible HTML email (tables and inline styles only). */
export function inviteEmailHtml(input: {
  message: string;
  title: string;
  when: string;
  where: string;
  hostName: string | null;
  link: string;
  coverImageUrl: string | null;
  buttonLabel: string;
}): string {
  const message = escapeHtml(input.message).replaceAll("\n", "<br>");
  const cover = input.coverImageUrl
    ? `<tr><td><img src="${escapeHtml(input.coverImageUrl)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border-radius:12px 12px 0 0"></td></tr>`
    : "";
  const host = input.hostName
    ? `<p style="margin:0 0 16px;color:#4a6463;font-size:15px">Hosted by ${escapeHtml(input.hostName)}</p>`
    : "";
  const where = input.where
    ? `<p style="margin:0 0 4px;color:#12302f;font-size:16px">${escapeHtml(input.where)}</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:24px 12px;background:#f3f6f4;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;border:1px solid #d9e3e0">
${cover}
<tr><td style="padding:28px 28px 8px">
<p style="margin:0 0 20px;color:#12302f;font-size:16px;line-height:1.5">${message}</p>
<h1 style="margin:0 0 8px;color:#12302f;font-family:Georgia,serif;font-size:26px;font-weight:normal">${escapeHtml(input.title)}</h1>
${host}
<p style="margin:0 0 4px;color:#12302f;font-size:16px">${escapeHtml(input.when)}</p>
${where}
</td></tr>
<tr><td style="padding:16px 28px 28px">
<a href="${escapeHtml(input.link)}" style="display:inline-block;background:#0f6e6a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 24px;border-radius:8px">${escapeHtml(input.buttonLabel)}</a>
<p style="margin:16px 0 0;color:#7f9493;font-size:13px">Or open this link: <a href="${escapeHtml(input.link)}" style="color:#0f6e6a">${escapeHtml(input.link)}</a></p>
</td></tr>
</table>
<p style="margin:16px 0 0;color:#7f9493;font-size:12px">Sent with ${SITE_NAME} on behalf of ${escapeHtml(input.hostName || "your host")}.</p>
</td></tr></table>
</body></html>`;
}
