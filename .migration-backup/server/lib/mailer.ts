/**
 * Transactional email sender.
 *
 * Backed by Resend (https://resend.com). In production set:
 *   RESEND_API_KEY  — get from resend.com → API Keys
 *   RESEND_FROM     — verified sender, e.g. "Addison X Media <noreply@addisonxmedia.com>"
 *
 * If either env is missing (e.g. local dev before keys are wired) we fall back
 * to logging the email to stdout — useful for catching reset URLs without a
 * provider. Anywhere in the codebase: import { sendMail } from "../lib/mailer".
 */

import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const defaultFrom = process.env.RESEND_FROM ?? "Addison X Media <onboarding@resend.dev>";

const client = apiKey ? new Resend(apiKey) : null;

if (!apiKey) {
  console.warn(
    "[mailer] RESEND_API_KEY is not set. Emails will be logged to console instead of sent. " +
      "Set RESEND_API_KEY in your environment to enable real delivery."
  );
}

export type SendMailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

export type SendMailResult =
  | { ok: true; id: string; mode: "live" }
  | { ok: true; id: null; mode: "logged" }
  | { ok: false; error: string };

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const from = input.from ?? defaultFrom;
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!client) {
    console.log(
      `\n[mailer:logged] To: ${to.join(", ")}\n` +
        `              Subject: ${input.subject}\n` +
        `              Body:\n${input.text ?? stripHtml(input.html)}\n`
    );
    return { ok: true, id: null, mode: "logged" };
  }

  try {
    const result = await client.emails.send({
      from,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? stripHtml(input.html),
      replyTo: input.replyTo,
      tags: input.tags,
    });
    if (result.error) {
      console.error("[mailer]", result.error);
      return { ok: false, error: result.error.message ?? "Unknown Resend error" };
    }
    return { ok: true, id: result.data?.id ?? "", mode: "live" };
  } catch (e) {
    console.error("[mailer] threw:", e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Crude HTML → text fallback so logged emails are readable. */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
