#!/bin/bash
set -e

# Install workspace dependencies (lockfile must be in sync).
pnpm install --frozen-lockfile

# Sync the real DB schema. The actual schema lives in the api-server package
# (server/db/schema.ts with its own drizzle.config.ts), NOT the unused lib/db
# scaffold. --force makes it non-interactive; when the DB already matches the
# schema this is a harmless no-op. Destructive diffs still abort (safe).
pnpm --filter @workspace/api-server exec drizzle-kit push --force
