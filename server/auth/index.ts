import { config } from "dotenv";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

config({ path: ".env.local" });
config({ path: ".env" });
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { account, session, user, userRole, verification, profile, twoFactor as twoFactorTable } from "../db/schema";
import { sendMail } from "../lib/mailer";
import { resetPasswordTemplate, verifyEmailTemplate, welcomeTemplate } from "../lib/email-templates";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Put a random 32+ char string in .env.local. " +
      "Generate one: openssl rand -base64 32"
  );
}

// Trusted origins: any local Vite dev port plus whatever the prod URL is.
// In single-origin deploys (Render serving both api + spa) baseURL is enough,
// but if a separate frontend domain is added later, append it to TRUSTED_ORIGINS
// (comma-separated) in the env.
//
// BetterAuth compares against request Origin headers which never carry a
// trailing slash, so strip any the operator pasted in by mistake — otherwise
// every session call gets rejected and the SPA hangs on a blank screen.
const stripSlash = (s: string) => s.replace(/\/+$/, "");
const PROD_URL = process.env.BETTER_AUTH_URL ? stripSlash(process.env.BETTER_AUTH_URL) : undefined;
const extraTrusted = (process.env.TRUSTED_ORIGINS ?? "")
  .split(",").map((s) => stripSlash(s.trim())).filter(Boolean);
const trustedOrigins = [
  "http://localhost:4173",
  "http://localhost:5173",
  "http://localhost:8080",
  ...(PROD_URL ? [PROD_URL] : []),
  ...extraTrusted,
];

const IS_PROD = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, twoFactor: twoFactorTable },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: PROD_URL ?? "http://localhost:3001",
  trustedOrigins,
  // In production cookies must be Secure (HTTPS-only) so the session can be set
  // on Render/any HTTPS host. SameSite=lax works for our single-origin deploy.
  advanced: {
    useSecureCookies: IS_PROD,
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: IS_PROD,
      httpOnly: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    // Require email verification before sign-in — keeps fake/typo emails from
    // creating usable accounts. Users still land on the app after clicking the
    // verification link (sendOnSignUp = true emits a verify email automatically).
    autoSignIn: true,
    minPasswordLength: 8,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      const tpl = resetPasswordTemplate(user.name ?? "", url);
      await sendMail({ to: user.email, subject: tpl.subject, html: tpl.html });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const tpl = verifyEmailTemplate(user.name ?? "", url);
      await sendMail({ to: user.email, subject: tpl.subject, html: tpl.html });
    },
  },
  plugins: [
    twoFactor({
      issuer: "Addison X Media",
      totpOptions: { period: 30, digits: 6 },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (newUser) => {
          // Mirror the supabase handle_new_user() trigger:
          // 1) create a profile row, 2) assign default 'agent' role.
          await db.insert(profile).values({
            userId: newUser.id,
            displayName: newUser.name || newUser.email.split("@")[0],
          });
          await db.insert(userRole).values({ userId: newUser.id, role: "agent" });
          // Fire-and-forget welcome email — don't block signup if Resend hiccups.
          const tpl = welcomeTemplate(newUser.name ?? "");
          sendMail({ to: newUser.email, subject: tpl.subject, html: tpl.html })
            .catch((e) => console.error("[welcome email]", e));
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
