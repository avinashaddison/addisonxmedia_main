/**
 * Inline HTML email templates — poster-aesthetic to match the product.
 *
 * Email client CSS support is famously limited: stick to inline styles, tables,
 * web-safe fonts. Test changes in the Resend dashboard preview before shipping.
 *
 * Each template returns { subject, html } so callers can hand the whole thing
 * to sendMail() unchanged.
 */

const BRAND = {
  name: "Addison X Media",
  url: "https://addisonxmedia.com",
  supportEmail: "Contact@addisonxmedia.com",
  // Poster palette — keep in sync with src/index.css
  cream: "#FFF6E8",
  saffron: "#FF6A1F",
  saffronShadow: "#B8420A",
  emerald: "#0E8A4B",
  magenta: "#D4308E",
  ink: "#1F1B16",
};

function shell(opts: { preheader?: string; title: string; bodyHtml: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;color:transparent;">${escape(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:2px solid ${BRAND.emerald};border-radius:18px;box-shadow:0 4px 0 0 ${BRAND.emerald};overflow:hidden;">
      <tr><td style="background:${BRAND.emerald};color:#fff;padding:18px 24px;font-weight:900;font-size:18px;letter-spacing:.5px;">
        <span style="background:${BRAND.saffron};color:#fff;padding:4px 10px;border-radius:8px;margin-right:10px;display:inline-block;font-size:12px;letter-spacing:1.2px;">ADDISON X</span>
        ${escape(BRAND.name)}
      </td></tr>
      <tr><td style="padding:28px 28px 22px;">
        ${opts.bodyHtml}
      </td></tr>
      <tr><td style="border-top:1px dashed #E8B968;padding:18px 28px;font-size:11px;color:#7A6B55;">
        Sent by ${escape(BRAND.name)} · Ranchi, Jharkhand · <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.emerald};">${BRAND.supportEmail}</a><br/>
        If you didn't expect this email you can ignore it safely.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${BRAND.saffron};color:#fff;font-weight:800;text-decoration:none;padding:13px 22px;border-radius:12px;box-shadow:0 3px 0 0 ${BRAND.saffronShadow};font-size:15px;">${escape(label)}</a>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ───────────────────────── Templates ───────────────────────── */

export function verifyEmailTemplate(name: string, url: string) {
  return {
    subject: "Confirm your email for Addison X Media",
    html: shell({
      title: "Confirm your email",
      preheader: "One click to confirm your email and finish signup.",
      bodyHtml: `
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;">Hi ${escape(name || "there")} 👋</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">Welcome to <strong>${escape(BRAND.name)}</strong>! Tap the button below to confirm this email address so we can finish setting up your workspace.</p>
        <p style="margin:0 0 24px;">${button("Confirm email", url)}</p>
        <p style="margin:0 0 6px;font-size:12px;color:#7A6B55;">Or paste this link into your browser:</p>
        <p style="margin:0;font-size:11px;word-break:break-all;color:#7A6B55;">${escape(url)}</p>
        <p style="margin:20px 0 0;font-size:12px;color:#7A6B55;">This link expires in about 1 hour.</p>
      `,
    }),
  };
}

export function resetPasswordTemplate(name: string, url: string) {
  return {
    subject: "Reset your Addison X Media password",
    html: shell({
      title: "Reset your password",
      preheader: "We got a request to reset your password.",
      bodyHtml: `
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;">Reset your password</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.55;">Hi ${escape(name || "there")} — someone requested a password reset for your account. If that was you, tap the button below to choose a new one.</p>
        <p style="margin:0 0 24px;">${button("Reset password", url)}</p>
        <p style="margin:0 0 6px;font-size:12px;color:#7A6B55;">Or paste this link into your browser:</p>
        <p style="margin:0;font-size:11px;word-break:break-all;color:#7A6B55;">${escape(url)}</p>
        <p style="margin:20px 0 0;font-size:12px;color:#7A6B55;">This link expires in about 1 hour. If you didn't request this, ignore this email — your password won't change.</p>
      `,
    }),
  };
}

export function welcomeTemplate(name: string) {
  return {
    subject: "Welcome to Addison X Media — let's get started",
    html: shell({
      title: "Welcome",
      preheader: "Your workspace is ready. Here's how to get the most out of Addison X.",
      bodyHtml: `
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;">Welcome, ${escape(name || "there")} 🎉</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Your Addison X Media workspace is live. Here's a quick checklist to get rolling:</p>
        <ul style="margin:0 0 22px;padding-left:18px;font-size:14px;line-height:1.7;">
          <li>Connect your WhatsApp Business number under <strong>Settings → Integrations</strong>.</li>
          <li>Import contacts (CSV) on the Contacts page.</li>
          <li>Turn on Addison AI for auto-replies in 12 Indian languages.</li>
          <li>Send your first broadcast — start with a 100-contact test segment.</li>
        </ul>
        <p style="margin:0 0 24px;">${button("Open your workspace", `${BRAND.url}/app`)}</p>
        <p style="margin:0;font-size:13px;color:#7A6B55;">Stuck on anything? Reply to this email — a human will read it.</p>
      `,
    }),
  };
}

export function staffInviteTemplate(adminName: string, role: string, loginUrl: string) {
  return {
    subject: `You're now a ${role} on Addison X Media`,
    html: shell({
      title: "You've been added to the team",
      preheader: `You now have ${role} access on the Addison X admin panel.`,
      bodyHtml: `
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;">Welcome to the team</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">${escape(adminName || "An admin")} has added you to the <strong>${escape(BRAND.name)}</strong> admin panel with the role <strong>${escape(role)}</strong>.</p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.55;">Sign in with your existing account to access the panel. If you don't have an account yet, the email this was sent to is the one that needs to be used at signup.</p>
        <p style="margin:0 0 24px;">${button("Open admin panel", loginUrl)}</p>
        <p style="margin:0;font-size:12px;color:#7A6B55;">If you weren't expecting this, just ignore the email — it grants nothing on its own.</p>
      `,
    }),
  };
}

export function suspensionTemplate(name: string, reason: string, appealEmail: string) {
  return {
    subject: "Your Addison X workspace has been suspended",
    html: shell({
      title: "Workspace suspended",
      preheader: "Important — your account access is paused.",
      bodyHtml: `
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;color:${BRAND.magenta};">Workspace suspended</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Hi ${escape(name || "there")} — we've suspended your <strong>${escape(BRAND.name)}</strong> workspace.</p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.55;"><strong>Reason:</strong> ${escape(reason || "Policy violation")}</p>
        <p style="margin:0 0 18px;font-size:14px;line-height:1.55;">While suspended you can't send broadcasts, receive new WhatsApp messages, or invite team members. Your data is safe and retained.</p>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.55;">If you believe this was a mistake, reply to <a href="mailto:${appealEmail}" style="color:${BRAND.emerald};">${appealEmail}</a> with details and we'll investigate within one business day.</p>
      `,
    }),
  };
}

export function refundTemplate(name: string, amountInr: number, reason: string) {
  return {
    subject: `Refund of ₹${amountInr.toLocaleString("en-IN")} initiated`,
    html: shell({
      title: "Refund initiated",
      preheader: `We've started a refund of ₹${amountInr.toLocaleString("en-IN")} to your original payment method.`,
      bodyHtml: `
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:900;">Refund on the way</h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.55;">Hi ${escape(name || "there")} — we've initiated a refund on your <strong>${escape(BRAND.name)}</strong> account.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;border:1px solid #E8B968;border-radius:10px;background:#FFF1D6;padding:14px 16px;">
          <tr><td style="font-size:13px;color:#7A6B55;">Amount</td><td style="text-align:right;font-size:16px;font-weight:900;">₹${amountInr.toLocaleString("en-IN")}</td></tr>
          <tr><td colspan="2" style="padding-top:8px;font-size:13px;color:#7A6B55;">Reason: ${escape(reason || "—")}</td></tr>
        </table>
        <p style="margin:0;font-size:13px;color:#7A6B55;">It usually shows up in your bank/UPI within 5–7 working days. We'll send a confirmation once the payment provider settles it.</p>
      `,
    }),
  };
}
