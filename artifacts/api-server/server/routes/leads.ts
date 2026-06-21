/**
 * Public lead capture — landing-page "free templates" signups.
 *
 *   POST /api/leads/templates   → store { email, source, createdAt }
 *
 * No auth: this is a public marketing form. Email is captured server-side so
 * no lead is ever lost, even if the visitor never sends the (secondary)
 * WhatsApp message the form also opens. Dedupe is on email (unique index);
 * a repeat submission is a no-op that still returns ok. Rate-limited per IP
 * so the endpoint can't be spammed.
 */

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { db } from "../db/client";
import { templateLead } from "../db/schema";
import { rateLimit } from "../middleware/rateLimit";
import { sendMail } from "../lib/mailer";
import logger from "../lib/logger";

const app = new Hono();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Fire-and-forget confirmation so the visitor instantly gets the template pack
// link in their inbox. Best-effort: never blocks or fails the request.
const sendTemplatePackEmail = async (email: string): Promise<boolean> => {
  const res = await sendMail({
    to: email,
    subject: "Aapke 50+ Hindi WhatsApp templates 🎉",
    html:
      `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">` +
      `<h2 style="color:#FF6A1F;margin:0 0 12px">AddisonX Media</h2>` +
      `<p>Namaste! 🙏</p>` +
      `<p>Aapne <strong>50+ Hindi WhatsApp templates</strong> ke liye request kiya hai. ` +
      `Hamari team aapko jaldi hi WhatsApp par poora template pack bhej degi.</p>` +
      `<p>Agar abhi chahiye, to humein seedha WhatsApp karein: ` +
      `<a href="https://wa.me/916206153116">+91 62061 53116</a>.</p>` +
      `<p style="color:#666;font-size:13px;margin-top:24px">— Team AddisonX, Ranchi</p>` +
      `</div>`,
    text:
      "Namaste! Aapne 50+ Hindi WhatsApp templates ke liye request kiya hai. " +
      "Hamari team aapko jaldi hi WhatsApp par poora template pack bhej degi. " +
      "Abhi chahiye? WhatsApp karein: +91 62061 53116. — Team AddisonX, Ranchi",
    tags: [{ name: "type", value: "template_lead" }],
  }).catch((e): { ok: false; error: string } => ({ ok: false, error: String(e) }));
  return res.ok;
};

app.post(
  "/leads/templates",
  rateLimit({ scope: "leads", windowMs: 10 * 60_000, max: 10 }),
  async (c) => {
    const body = await c.req
      .json<{ email?: string; source?: string }>()
      .catch(() => ({} as { email?: string; source?: string }));

    const email = (body.email || "").trim().toLowerCase().slice(0, 200);
    const source = (body.source || "landing_templates").trim().slice(0, 60);

    if (!EMAIL_RE.test(email)) {
      return c.json({ error: "Please provide a valid email" }, 400);
    }

    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ua = c.req.header("user-agent") || null;
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);

    // Dedupe on email: a repeat signup is a no-op but still returns ok so the
    // visitor's experience is identical and no error leaks the dedupe state.
    const [inserted] = await db
      .insert(templateLead)
      .values({ email, source, ipHash, userAgent: ua })
      .onConflictDoNothing({ target: templateLead.email })
      .returning({ id: templateLead.id });

    // Only email on the first capture (inserted is undefined on a dupe).
    if (inserted) {
      void sendTemplatePackEmail(email)
        .then((sent) => {
          if (sent) {
            return db
              .update(templateLead)
              .set({ emailedAt: new Date() })
              .where(eq(templateLead.id, inserted.id));
          }
        })
        .catch((e) => logger.error({ err: e }, "[leads] template email failed"));
    }

    return c.json({ ok: true });
  },
);

export default app;
