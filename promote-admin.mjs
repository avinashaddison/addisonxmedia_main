// One-shot helper: promote a user to super_admin by email.
//   node promote-admin.mjs <email>
import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const email = process.argv[2];
if (!email) { console.error("usage: node promote-admin.mjs <email>"); process.exit(1); }
const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });
const result = await sql`
  UPDATE "user"
     SET is_staff = true, admin_role = 'super_admin', admin_last_login_at = NOW()
   WHERE email = ${email}
   RETURNING id, email, is_staff, admin_role
`;
if (result.length === 0) console.error(`No user with email "${email}" — sign up first`);
else console.log("Promoted:", result[0]);
await sql.end();
