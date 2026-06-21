# Addison X Media

Full-stack CRM + WhatsApp Business automation + e-commerce platform built for Indian SMBs. Manage contacts, run ad campaigns, handle orders and bookings, and automate customer conversations -- all from a single dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui (Radix UI), TanStack React Query |
| Backend | Hono (Node.js), Better Auth (sessions), Zod validation |
| Database | PostgreSQL (Neon serverless), Drizzle ORM |
| AI | OpenAI (reply suggestions, ad copy generation) |
| Payments | Cashfree, UPI deep-links |
| Messaging | Meta WhatsApp Cloud API |
| Ads | Meta Marketing API |
| Deployment | Render.com (render.yaml) |

## Prerequisites

- Node.js 20+
- PostgreSQL database (Neon recommended)
- npm (ships with Node.js)

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url> && cd addisonxmedia_main

# 2. Copy environment file and fill in values
cp .env.example .env

# 3. At minimum, set these in .env:
#    DATABASE_URL       - Neon Postgres connection string
#    BETTER_AUTH_SECRET - 32+ char random (openssl rand -base64 32)
#    BETTER_AUTH_URL    - http://localhost:3001 for local dev
#    MASTER_KEY         - 64 hex chars (openssl rand -hex 32)

# 4. Install dependencies
npm install

# 5. Run database migrations
npm run db:migrate

# 6. Start dev server (frontend + API concurrently)
npm run dev
```

The frontend runs on `http://localhost:5173` and the API on `http://localhost:3001`. Vite proxies `/api/*` requests to the backend in development.

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend + API in parallel (dev mode) |
| `npm run build` | Build the Vite frontend for production |
| `npm start` | Run production server (serves static + API) |
| `npm test` | Run all tests with Vitest |
| `npm run test:server` | Run server-side tests only |
| `npm run db:push` | Push schema changes directly (dev) |
| `npm run db:generate` | Generate a new migration |
| `npm run db:migrate` | Apply pending SQL migrations |
| `npm run lint` | Run ESLint |

## Project Structure

```
.
├── server/                 # Hono backend
│   ├── routes/            # API route handlers (crm, inbox, ads, billing, etc.)
│   ├── middleware/        # Auth, rate limiting, admin guards
│   ├── db/
│   │   ├── schema.ts      # Drizzle ORM schema (source of truth)
│   │   ├── client.ts      # Database connection
│   │   └── migrations/    # Numbered SQL migration files
│   ├── integrations/      # Third-party APIs (Meta, Cashfree, Resend)
│   └── lib/               # Shared server utilities (AI, crypto, jobs)
├── src/                    # React frontend
│   ├── pages/             # Route-level page components
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # shadcn/ui primitives
│   │   └── admin/         # Admin panel components
│   ├── hooks/             # Custom React hooks (auth, queries)
│   └── lib/               # API client, types, utilities
├── scripts/               # Database utility scripts
├── public/                # Static assets
├── render.yaml            # Render.com deployment config
├── drizzle.config.ts      # Drizzle Kit configuration
└── vite.config.ts         # Vite bundler configuration
```

## Environment Variables

See `.env.example` for the full list with descriptions. Key variables:

- **`DATABASE_URL`** - Neon PostgreSQL connection string (required)
- **`BETTER_AUTH_SECRET`** - Session signing secret (required)
- **`BETTER_AUTH_URL`** - Public URL of the auth/API server (required)
- **`MASTER_KEY`** - Encryption key for sensitive DB columns (required)
- **`OPENAI_API_KEY`** - Enables AI features (optional)
- **`META_APP_ID` / `META_APP_SECRET`** - Meta OAuth for ads (optional)
- **`RESEND_API_KEY`** - Transactional email delivery (optional)
- **`CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_UPLOAD_PRESET`** - Image uploads (optional)

## Deployment

The project is configured for deployment on [Render.com](https://render.com) using the included `render.yaml` blueprint:

```bash
# Deploy via Render Dashboard:
# 1. Connect your GitHub repo
# 2. Render auto-detects render.yaml
# 3. Set environment variables in the Render dashboard
# 4. Deploy
```

The build command (`npm run build`) produces a static frontend bundle. In production, the Hono server serves both the API and the static files from the same origin.

## License

Proprietary. All rights reserved.
