import { pgClient } from "../server/db/client";

async function run() {
  console.log("Applying workspace table migration directly...");
  try {
    await pgClient`
      CREATE TABLE IF NOT EXISTS "workspace" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "owner_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "workspace_user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `;
    console.log("Workspace table created or already exists!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pgClient.end();
  }
}

run();
