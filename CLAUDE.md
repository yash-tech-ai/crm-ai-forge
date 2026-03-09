# CLAUDE.md — CRM AI Forge

## Project Overview

AI-native CRM and Campaign Management platform. Monorepo with pnpm workspaces + Turborepo.

## Architecture

```
apps/
  api/          Fastify 5 REST API (14 route modules, 60+ endpoints)
  web/          Next.js 14 App Router frontend (15+ pages)
  worker/       BullMQ background job processor (campaign send, sequences, imports)

packages/
  database/     Prisma ORM + PostgreSQL (20+ models, schema at prisma/schema.prisma)
  shared/       TypeScript types, Zod schemas, constants, queue names
```

## Tech Stack

- **Runtime:** Node.js 22+, pnpm 9, TypeScript 5.4
- **Backend:** Fastify 5, Prisma 6, PostgreSQL 16, Redis 7, BullMQ
- **Frontend:** Next.js 14 (App Router), React 18, Tailwind CSS 3, TanStack React Query 5, Zustand 5, Lucide icons
- **Email:** Nodemailer SMTP (falls back to JSON logging if no SMTP configured)
- **Auth:** JWT access (15m) + refresh (7d) tokens in localStorage
- **Multi-tenancy:** All queries scoped by `tenantId` extracted from JWT

## Common Commands

```bash
# Install dependencies
pnpm install

# Development (starts all apps)
pnpm dev

# Individual apps
pnpm --filter @crm-ai-forge/api dev      # API on :3001
pnpm --filter @crm-ai-forge/web dev      # Web on :3000
pnpm --filter @crm-ai-forge/worker dev   # Worker

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema (no migration)
pnpm db:seed          # Seed demo data
pnpm db:studio        # Open Prisma Studio

# Build & checks
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages

# Type check individual packages
pnpm --filter @crm-ai-forge/api typecheck
pnpm --filter @crm-ai-forge/web typecheck
pnpm --filter @crm-ai-forge/worker typecheck
```

## Build Order (Important)

Workspace packages must be built in order due to dependencies:

1. `pnpm db:generate` — Generate Prisma client first
2. `pnpm --filter @crm-ai-forge/shared build` — Build shared types
3. Then API/Web/Worker can build

Turborepo handles this automatically with `pnpm build`, but manual type-checking requires the above order.

## Environment Setup

Copy `.env.example` to `.env` at the project root. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Auth secrets (min 32 chars)
- `SMTP_HOST/PORT/USER/PASS` — Email (optional, falls back to logging)
- `API_PORT` — API port (default 3001)

## API Conventions

- All routes under `/api/v1/` require JWT auth (except `/api/v1/auth/*` and `/t/*` tracking routes)
- Responses follow `{ success: true, data: ... }` or `{ success: false, error: { code, message } }`
- Pagination: `?page=1&limit=20&sortBy=createdAt&sortOrder=desc`
- Multi-tenancy: tenantId auto-injected from JWT, never passed by client
- RBAC: role hierarchy `admin(3) > manager(2) > member(1)`, use `requireRole()` middleware

## Route Modules (apps/api/src/routes/)

| File | Prefix | Description |
|------|--------|-------------|
| auth.ts | /api/v1/auth | Register, login, refresh, me |
| contacts.ts | /api/v1/contacts | Contact CRUD with search/filter |
| companies.ts | /api/v1/companies | Company CRUD |
| deals.ts | /api/v1/deals | Deal CRUD with stage transitions |
| pipelines.ts | /api/v1/pipelines | Pipeline + stage management |
| tasks.ts | /api/v1/tasks | Task CRUD with completion |
| notes.ts | /api/v1/notes | Notes CRUD (author-only edit) |
| campaigns.ts | /api/v1/campaigns | Campaign CRUD, send, A/B test |
| templates.ts | /api/v1/templates | Email template CRUD + render |
| segments.ts | /api/v1/segments | Audience segment CRUD + preview |
| sequences.ts | /api/v1/sequences | Automation sequence CRUD + enroll |
| search.ts | /api/v1/search | Global search across entities |
| analytics.ts | /api/v1/analytics | Dashboard, pipeline, campaign stats |
| tracking.ts | /t | Open pixel, click redirect, unsubscribe (no auth) |

## Frontend Conventions

- Pages in `apps/web/src/app/dashboard/*/page.tsx` (App Router)
- API calls via `apiFetch()` from `@/lib/api` (auto-attaches JWT, handles refresh)
- State: React Query for server state, Zustand for client state
- Styling: Tailwind utility classes, no component library
- Icons: Lucide React exclusively
- Auth guard wraps all `/dashboard/*` routes

## Database

- Schema: `packages/database/prisma/schema.prisma`
- All models have `tenantId` for multi-tenancy
- Soft deletes via `deletedAt` on contacts, companies, deals
- Campaign metrics stored as JSONB, updated with raw SQL `jsonb_set`
- Sequence steps stored as JSON array on `AutomationSequence.steps`

## Worker Processors (apps/worker/src/processors/)

- `campaign-send.ts` — Renders template, injects tracking, sends via Nodemailer
- `sequence-step.ts` — Executes sequence steps (email, delay, condition, task, update_field)
- `contact-import.ts` — Bulk contact import from CSV/JSON

Worker also runs a 30-second scheduler for:
- Triggering scheduled campaigns when `scheduledAt` is due
- Advancing sequence enrollments when `nextActionAt` is due

## Phase Status

- **Phase 1 (Core CRM):** ~95% — Missing Redis Pub/Sub events, WebSocket
- **Phase 2 (Campaigns):** ~80% — Missing MJML, bounce handling, A/B test frontend
- **Phase 3 (AI Agents):** Not started
- **Phase 4 (Scale):** Not started

See `docs/GAP_ANALYSIS.md` for detailed status.
