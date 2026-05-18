import { config } from "dotenv";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

config({ path: ".env.local" });
config({ path: ".env" });
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db/client";
import { account, session, user, userRole, verification, profile, twoFactor as twoFactorTable } from "../db/schema";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET is not set. Put a random 32+ char string in .env.local. " +
      "Generate one: openssl rand -base64 32"
  );
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, twoFactor: twoFactorTable },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
  trustedOrigins: ["http://localhost:4173", "http://localhost:5173", "http://localhost:8080"],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    // No email provider wired yet — log the reset URL to the server console so
    // dev can copy-paste it. Replace with Resend/Postmark/SES in production.
    sendResetPassword: async ({ user, url }) => {
      console.log(
        `\n[Better Auth] Password reset requested for ${user.email}\n` +
          `Reset URL (valid ~1h): ${url}\n` +
          `Wire up an email provider in server/auth/index.ts to send this for real.\n`
      );
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
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
