# Project Structure & Tech Stack

## 1. Monorepo Structure

```
crm-ai-forge/
├── README.md
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm workspace definition
├── turbo.json                      # Turborepo build config
├── docker-compose.yml              # Local development services
├── docker-compose.prod.yml         # Production deployment
├── .env.example                    # Environment variables template
├── .gitignore
│
├── docs/                           # Architecture documentation
│   ├── architecture/
│   │   ├── system-architecture.md
│   │   ├── project-structure.md
│   │   └── roadmap.md
│   ├── api/
│   │   └── api-spec.md
│   ├── agents/
│   │   ├── agent-system-design.md
│   │   └── openclaw-integration.md
│   └── database/
│       └── schema.md
│
├── packages/                       # Shared packages
│   ├── shared/                     # Shared types, utils, constants
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── index.ts
│   │       │   ├── contact.ts
│   │       │   ├── company.ts
│   │       │   ├── deal.ts
│   │       │   ├── campaign.ts
│   │       │   ├── task.ts
│   │       │   └── agent.ts
│   │       ├── constants/
│   │       │   ├── index.ts
│   │       │   ├── enums.ts
│   │       │   └── config.ts
│   │       ├── utils/
│   │       │   ├── index.ts
│   │       │   ├── validation.ts
│   │       │   ├── formatting.ts
│   │       │   └── date.ts
│   │       └── index.ts
│   │
│   └── database/                   # Prisma schema & client
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts             # Seed data
│       └── src/
│           ├── client.ts           # Prisma client singleton
│           └── index.ts
│
├── apps/
│   ├── api/                        # Fastify backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── Dockerfile
│   │   └── src/
│   │       ├── index.ts            # Server entry point
│   │       ├── app.ts              # Fastify app setup
│   │       ├── config/
│   │       │   ├── index.ts        # Config loader
│   │       │   ├── env.ts          # Environment validation
│   │       │   └── cors.ts
│   │       ├── middleware/
│   │       │   ├── auth.ts         # JWT authentication
│   │       │   ├── tenant.ts       # Tenant context resolver
│   │       │   ├── rateLimit.ts    # Rate limiting
│   │       │   └── validate.ts     # Request validation
│   │       ├── routes/
│   │       │   ├── index.ts        # Route registrar
│   │       │   ├── auth.routes.ts
│   │       │   ├── contact.routes.ts
│   │       │   ├── company.routes.ts
│   │       │   ├── deal.routes.ts
│   │       │   ├── pipeline.routes.ts
│   │       │   ├── campaign.routes.ts
│   │       │   ├── segment.routes.ts
│   │       │   ├── template.routes.ts
│   │       │   ├── task.routes.ts
│   │       │   ├── analytics.routes.ts
│   │       │   ├── agent.routes.ts
│   │       │   └── settings.routes.ts
│   │       ├── services/
│   │       │   ├── auth.service.ts
│   │       │   ├── contact.service.ts
│   │       │   ├── company.service.ts
│   │       │   ├── deal.service.ts
│   │       │   ├── pipeline.service.ts
│   │       │   ├── campaign.service.ts
│   │       │   ├── segment.service.ts
│   │       │   ├── template.service.ts
│   │       │   ├── task.service.ts
│   │       │   ├── activity.service.ts
│   │       │   ├── analytics.service.ts
│   │       │   ├── email.service.ts
│   │       │   └── notification.service.ts
│   │       ├── agents/
│   │       │   ├── orchestrator.ts     # Agent orchestrator
│   │       │   ├── base.agent.ts       # Base agent class
│   │       │   ├── supervisor.agent.ts
│   │       │   ├── lead.agent.ts
│   │       │   ├── campaign.agent.ts
│   │       │   ├── analytics.agent.ts
│   │       │   ├── pipeline.agent.ts
│   │       │   ├── support.agent.ts
│   │       │   └── message-bus.ts      # Redis pub/sub agent bus
│   │       ├── jobs/
│   │       │   ├── queue.ts            # BullMQ queue setup
│   │       │   ├── campaign-send.job.ts
│   │       │   ├── lead-scoring.job.ts
│   │       │   ├── import.job.ts
│   │       │   └── analytics.job.ts
│   │       ├── events/
│   │       │   ├── emitter.ts          # Domain event emitter
│   │       │   ├── handlers.ts         # Event handlers
│   │       │   └── types.ts            # Event type definitions
│   │       ├── websocket/
│   │       │   ├── server.ts           # WebSocket server
│   │       │   └── handlers.ts
│   │       └── utils/
│   │           ├── errors.ts           # Custom error classes
│   │           ├── logger.ts           # Pino logger
│   │           └── pagination.ts       # Pagination helpers
│   │
│   ├── web/                        # Next.js frontend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── Dockerfile
│   │   ├── public/
│   │   │   └── images/
│   │   └── src/
│   │       ├── app/                    # Next.js App Router
│   │       │   ├── layout.tsx          # Root layout
│   │       │   ├── page.tsx            # Landing/login page
│   │       │   ├── (auth)/
│   │       │   │   ├── login/page.tsx
│   │       │   │   └── register/page.tsx
│   │       │   ├── (dashboard)/
│   │       │   │   ├── layout.tsx      # Dashboard shell (sidebar, header)
│   │       │   │   ├── dashboard/page.tsx
│   │       │   │   ├── contacts/
│   │       │   │   │   ├── page.tsx            # Contact list
│   │       │   │   │   └── [id]/page.tsx       # Contact detail
│   │       │   │   ├── companies/
│   │       │   │   │   ├── page.tsx
│   │       │   │   │   └── [id]/page.tsx
│   │       │   │   ├── deals/
│   │       │   │   │   ├── page.tsx            # Kanban pipeline view
│   │       │   │   │   └── [id]/page.tsx
│   │       │   │   ├── campaigns/
│   │       │   │   │   ├── page.tsx            # Campaign list
│   │       │   │   │   ├── new/page.tsx        # Campaign wizard
│   │       │   │   │   └── [id]/
│   │       │   │   │       ├── page.tsx        # Campaign detail
│   │       │   │   │       └── builder/page.tsx # Email builder
│   │       │   │   ├── analytics/page.tsx
│   │       │   │   ├── tasks/page.tsx
│   │       │   │   ├── inbox/page.tsx          # Unified inbox
│   │       │   │   └── settings/
│   │       │   │       ├── page.tsx
│   │       │   │       ├── team/page.tsx
│   │       │   │       ├── integrations/page.tsx
│   │       │   │       └── agents/page.tsx      # Agent configuration
│   │       │   └── api/                        # Next.js API routes (auth proxy)
│   │       │       └── auth/[...nextauth]/route.ts
│   │       ├── components/
│   │       │   ├── ui/                 # shadcn/ui components
│   │       │   │   ├── button.tsx
│   │       │   │   ├── input.tsx
│   │       │   │   ├── dialog.tsx
│   │       │   │   ├── table.tsx
│   │       │   │   ├── card.tsx
│   │       │   │   ├── badge.tsx
│   │       │   │   ├── select.tsx
│   │       │   │   ├── dropdown-menu.tsx
│   │       │   │   └── ...
│   │       │   ├── layout/
│   │       │   │   ├── sidebar.tsx
│   │       │   │   ├── header.tsx
│   │       │   │   ├── breadcrumb.tsx
│   │       │   │   └── mobile-nav.tsx
│   │       │   ├── contacts/
│   │       │   │   ├── contact-table.tsx
│   │       │   │   ├── contact-form.tsx
│   │       │   │   ├── contact-card.tsx
│   │       │   │   ├── activity-timeline.tsx
│   │       │   │   └── lead-score-badge.tsx
│   │       │   ├── deals/
│   │       │   │   ├── pipeline-board.tsx      # Kanban board
│   │       │   │   ├── deal-card.tsx
│   │       │   │   ├── deal-form.tsx
│   │       │   │   └── forecast-chart.tsx
│   │       │   ├── campaigns/
│   │       │   │   ├── campaign-list.tsx
│   │       │   │   ├── campaign-wizard.tsx
│   │       │   │   ├── email-builder.tsx
│   │       │   │   ├── segment-builder.tsx
│   │       │   │   └── campaign-analytics.tsx
│   │       │   ├── analytics/
│   │       │   │   ├── kpi-cards.tsx
│   │       │   │   ├── pipeline-funnel.tsx
│   │       │   │   ├── trend-chart.tsx
│   │       │   │   └── agent-activity.tsx
│   │       │   └── ai/
│   │       │       ├── chat-widget.tsx         # AI chat in dashboard
│   │       │       ├── agent-status.tsx
│   │       │       ├── suggestion-card.tsx
│   │       │       └── action-log.tsx
│   │       ├── hooks/
│   │       │   ├── use-contacts.ts
│   │       │   ├── use-deals.ts
│   │       │   ├── use-campaigns.ts
│   │       │   ├── use-analytics.ts
│   │       │   ├── use-websocket.ts
│   │       │   └── use-auth.ts
│   │       ├── lib/
│   │       │   ├── api-client.ts       # Axios/fetch wrapper
│   │       │   ├── auth.ts             # NextAuth config
│   │       │   └── utils.ts            # UI utilities
│   │       └── stores/
│   │           ├── auth.store.ts       # Zustand auth store
│   │           └── ui.store.ts         # UI state (sidebar, theme)
│   │
│   └── worker/                     # Background job worker
│       ├── package.json
│       ├── tsconfig.json
│       ├── Dockerfile
│       └── src/
│           ├── index.ts            # Worker entry point
│           ├── processors/
│           │   ├── campaign-send.processor.ts
│           │   ├── lead-scoring.processor.ts
│           │   ├── import.processor.ts
│           │   ├── segment-compute.processor.ts
│           │   └── analytics.processor.ts
│           └── utils/
│               └── email-sender.ts
│
├── openclaw/                       # OpenClaw configuration
│   ├── AGENTS.md
│   ├── SOUL.md
│   ├── TOOLS.md
│   └── skills/
│       ├── crm-lead-management/
│       │   ├── claw.json
│       │   └── SKILL.md
│       ├── crm-campaign-engine/
│       │   ├── claw.json
│       │   └── SKILL.md
│       ├── crm-deal-pipeline/
│       │   ├── claw.json
│       │   └── SKILL.md
│       ├── crm-analytics-reports/
│       │   ├── claw.json
│       │   └── SKILL.md
│       └── crm-customer-support/
│           ├── claw.json
│           └── SKILL.md
│
├── scripts/                        # Utility scripts
│   ├── setup.sh                    # First-time setup
│   ├── seed.ts                     # Database seeding
│   └── deploy.sh                   # Deployment script
│
└── .github/
    └── workflows/
        ├── ci.yml                  # CI: lint, type-check, test
        └── deploy.yml              # CD: build, push, deploy
```

## 2. Tech Stack Details

### Core Runtime & Language

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 22.x LTS | Runtime for API, worker, and build tools |
| **TypeScript** | 5.4+ | Type safety across the entire codebase |
| **pnpm** | 9.x | Fast, disk-efficient package manager with workspace support |

### Frontend

| Library | Version | Purpose |
|---------|---------|---------|
| **Next.js** | 14.x | React framework with App Router, SSR, API routes |
| **React** | 18.x | UI library |
| **Tailwind CSS** | 3.4+ | Utility-first CSS framework |
| **shadcn/ui** | latest | Accessible, customizable component library |
| **Zustand** | 4.x | Lightweight client state management |
| **TanStack Query** | 5.x | Server state, caching, and synchronization |
| **React Hook Form** | 7.x | Performant form handling |
| **Zod** | 3.x | Runtime validation (shared with API) |
| **Recharts** | 2.x | Charts and data visualization |
| **dnd-kit** | 6.x | Drag and drop (pipeline Kanban board) |
| **Lucide React** | latest | Icon library |
| **date-fns** | 3.x | Date manipulation |

### Backend

| Library | Version | Purpose |
|---------|---------|---------|
| **Fastify** | 4.x | High-performance web framework |
| **Prisma** | 5.x | Type-safe ORM for PostgreSQL |
| **BullMQ** | 5.x | Redis-based job queue for background processing |
| **Pino** | 8.x | Structured JSON logging |
| **bcrypt** | 5.x | Password hashing |
| **jsonwebtoken** | 9.x | JWT token generation and verification |
| **Nodemailer** | 6.x | Email sending (SMTP, SES) |
| **Zod** | 3.x | Request/response validation |
| **ioredis** | 5.x | Redis client |
| **@fastify/websocket** | 10.x | WebSocket support |
| **@fastify/cors** | 9.x | CORS handling |
| **@fastify/rate-limit** | 9.x | Rate limiting |

### Infrastructure

| Service | Version | Purpose |
|---------|---------|---------|
| **PostgreSQL** | 16.x | Primary database |
| **Redis** | 7.x | Cache, session store, job queues, pub/sub |
| **MinIO** | latest | S3-compatible object storage (self-hosted) |
| **OpenClaw** | latest | AI agent gateway and multi-channel messaging |

### Development & Build

| Tool | Purpose |
|------|---------|
| **Turborepo** | Monorepo build orchestration with caching |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Vitest** | Unit and integration testing |
| **Playwright** | E2E testing |
| **Docker** | Containerization |
| **GitHub Actions** | CI/CD |

## 3. Development Commands

```bash
# Install dependencies
pnpm install

# Start all services (Docker)
docker compose up -d

# Run database migrations
pnpm --filter @crm-ai-forge/database db:migrate

# Seed database
pnpm --filter @crm-ai-forge/database db:seed

# Start development (all apps)
pnpm dev

# Start individual apps
pnpm --filter @crm-ai-forge/api dev      # API on :3001
pnpm --filter @crm-ai-forge/web dev      # Frontend on :3000
pnpm --filter @crm-ai-forge/worker dev   # Background worker

# Build all
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## 4. Environment Variables

```bash
# .env.example

# ── Database ──
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm_ai_forge"

# ── Redis ──
REDIS_URL="redis://localhost:6379"

# ── Auth ──
JWT_SECRET="your-secure-secret-key-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-key-min-32-chars"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# ── API ──
API_URL="http://localhost:3001"
API_PORT=3001

# ── Email ──
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASS="your-sendgrid-api-key"
DEFAULT_FROM_EMAIL="noreply@yourdomain.com"
DEFAULT_FROM_NAME="CRM AI Forge"

# ── MinIO (File Storage) ──
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="crm-ai-forge"

# ── OpenClaw ──
OPENCLAW_API_URL="http://localhost:8484"
OPENCLAW_WEBHOOK_SECRET="your-webhook-secret"

# ── AI Provider ──
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."  # Fallback

# ── App ──
NODE_ENV="development"
LOG_LEVEL="debug"
```

## 5. Docker Compose (Development)

```yaml
# docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crm_ai_forge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  redis_data:
  minio_data:
```
