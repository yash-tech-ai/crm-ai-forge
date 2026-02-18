# System Architecture

## 1. Architecture Principles

1. **AI-First** — Every feature is designed to be agent-accessible, not just UI-accessible
2. **Multi-Tenant** — Complete data isolation between tenants at the database level
3. **Event-Driven** — Core operations emit events that agents and services can react to
4. **Channel-Agnostic** — Business logic is decoupled from the communication channel
5. **Self-Hosted** — Full deployment on customer infrastructure with no external dependencies
6. **Modular** — CRM and Campaign modules are independently deployable but integrated

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│                                                                     │
│  ┌──────────────┐  ┌───────────────────────────────────────────┐   │
│  │  Next.js App │  │  OpenClaw Gateway                         │   │
│  │  (Dashboard) │  │  ┌─────────┐ ┌────────┐ ┌──────────┐    │   │
│  │              │  │  │WhatsApp │ │Telegram│ │  Slack   │    │   │
│  │  - CRM UI   │  │  │         │ │        │ │          │    │   │
│  │  - Campaign  │  │  │  ...    │ │  ...   │ │  ...     │    │   │
│  │    Builder   │  │  └────┬────┘ └───┬────┘ └────┬─────┘    │   │
│  │  - Analytics │  │       └──────────┼───────────┘           │   │
│  │  - Settings  │  │                  ▼                        │   │
│  └──────┬───────┘  │    ┌─────────────────────┐               │   │
│         │          │    │  Supervisor Agent    │               │   │
│         │          │    │  (Intent Router)     │               │   │
│         │          │    └──────────┬────────────┘               │   │
│         │          └───────────────┼───────────────────────────┘   │
└─────────┼──────────────────────────┼───────────────────────────────┘
          │                          │
          ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                  │
│                                                                     │
│  Fastify Server (Node.js + TypeScript)                              │
│                                                                     │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ REST API   │ │ WebSocket  │ │ OpenClaw     │ │ Webhook      │  │
│  │ /api/v1/*  │ │ /ws        │ │ Tool API     │ │ Receiver     │  │
│  │            │ │            │ │ /agent/*     │ │ /hooks/*     │  │
│  └──────┬─────┘ └─────┬──────┘ └──────┬───────┘ └──────┬───────┘  │
│         └──────────────┼───────────────┼────────────────┘          │
│                        ▼               ▼                            │
│              ┌──────────────────────────────┐                      │
│              │  Auth Middleware (JWT)        │                      │
│              │  Rate Limiter                 │                      │
│              │  Request Validator            │                      │
│              │  Tenant Context Resolver      │                      │
│              └──────────────┬───────────────┘                      │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    AI AGENT ORCHESTRATOR                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  SUPERVISOR AGENT                            │   │
│  │  - Intent Classification (NLU)                              │   │
│  │  - Task Decomposition & Planning                            │   │
│  │  - Agent Selection & Routing                                │   │
│  │  - Response Consolidation                                   │   │
│  │  - Conflict Resolution                                      │   │
│  └─────────┬──────────┬──────────┬──────────┬─────────────────┘   │
│            │          │          │          │                       │
│  ┌─────────▼──┐ ┌─────▼────┐ ┌──▼───────┐ ┌▼──────────┐          │
│  │ Lead Agent │ │ Campaign │ │Analytics │ │ Pipeline  │          │
│  │            │ │ Agent    │ │ Agent    │ │ Agent     │          │
│  │ - Score    │ │          │ │          │ │           │          │
│  │ - Qualify  │ │ - Create │ │ - Report │ │ - Manage  │          │
│  │ - Assign   │ │ - Target │ │ - Trend  │ │ - Forecast│          │
│  │ - Nurture  │ │ - Send   │ │ - Alert  │ │ - Automate│          │
│  └─────┬──────┘ └────┬─────┘ └────┬─────┘ └────┬──────┘          │
│        └──────────────┼────────────┼────────────┘                  │
│                       ▼            ▼                                │
│              ┌──────────────────────────┐                          │
│              │  Agent Message Bus       │                          │
│              │  (Redis Pub/Sub)         │                          │
│              └──────────────────────────┘                          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                                  │
│                                                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │ Contact    │ │ Company    │ │ Deal       │ │ Pipeline   │      │
│  │ Service    │ │ Service    │ │ Service    │ │ Service    │      │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │
│                                                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │ Campaign   │ │ Email      │ │ Template   │ │ Segment    │      │
│  │ Service    │ │ Service    │ │ Service    │ │ Service    │      │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │
│                                                                     │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐      │
│  │ Task       │ │ Activity   │ │ Report     │ │ Notification│     │
│  │ Service    │ │ Service    │ │ Service    │ │ Service    │      │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘      │
│                                                                     │
│  ┌──────────────────────────────────────────────────┐              │
│  │ Event Emitter (Domain Events)                     │              │
│  │ contact.created, deal.stage_changed,              │              │
│  │ campaign.sent, lead.scored, task.overdue           │              │
│  └──────────────────────────────────────────────────┘              │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                                    │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  PostgreSQL       │  │  Redis        │  │  MinIO (S3)        │    │
│  │                   │  │               │  │                    │    │
│  │  - CRM entities   │  │  - Sessions   │  │  - Email templates │    │
│  │  - Campaign data  │  │  - Cache      │  │  - Attachments     │    │
│  │  - User accounts  │  │  - Job queues │  │  - Campaign assets │    │
│  │  - Audit logs     │  │  - Pub/Sub    │  │  - Contact imports │    │
│  │  - Tenant data    │  │  - Rate limits│  │                    │    │
│  └──────────────────┘  └──────────────┘  └────────────────────┘    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  OpenClaw Memory Store                                       │   │
│  │  - Agent conversation history                                │   │
│  │  - Workspace files for RAG (BM25 + vector search)            │   │
│  │  - Session state per agent per tenant                        │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 3. Component Details

### 3.1 Presentation Layer

#### Next.js Dashboard
- **Framework:** Next.js 14 with App Router
- **Styling:** Tailwind CSS + shadcn/ui component library
- **State Management:** Zustand for client state, React Query for server state
- **Real-time:** WebSocket connection for live updates (deal changes, new leads, campaign status)
- **Auth:** NextAuth.js with JWT tokens, SSO support (Google, Microsoft)

**Key Pages:**
| Page | Purpose |
|------|---------|
| `/dashboard` | Overview with KPIs, recent activity, AI suggestions |
| `/contacts` | Contact list with search, filters, bulk actions |
| `/contacts/[id]` | Contact detail with activity timeline |
| `/companies` | Company management |
| `/deals` | Kanban pipeline view |
| `/campaigns` | Campaign list, creation wizard |
| `/campaigns/[id]` | Campaign detail with analytics |
| `/campaigns/[id]/builder` | Email template builder |
| `/analytics` | Reports and dashboards |
| `/settings` | Tenant settings, integrations, agent config |
| `/inbox` | Unified multi-channel inbox |

#### OpenClaw Channels
- Users interact via WhatsApp, Telegram, Slack, etc.
- Messages routed through OpenClaw Gateway to the Supervisor Agent
- Supervisor delegates to specialist agents
- Responses sent back through the originating channel

### 3.2 API Gateway

#### Fastify Server
- **Why Fastify over Express:** 2-3x faster, built-in schema validation, TypeScript-first
- **Port:** 3001 (API), 3000 (Next.js frontend)
- **API versioning:** `/api/v1/*`

#### Route Structure
```
/api/v1/
├── auth/
│   ├── POST   /login
│   ├── POST   /register
│   ├── POST   /refresh
│   └── POST   /logout
├── contacts/
│   ├── GET    /                    # List (paginated, filterable)
│   ├── POST   /                    # Create
│   ├── GET    /:id                 # Get by ID
│   ├── PATCH  /:id                 # Update
│   ├── DELETE /:id                 # Soft delete
│   ├── POST   /:id/notes           # Add note
│   ├── GET    /:id/activities      # Activity timeline
│   └── POST   /import              # Bulk import (CSV)
├── companies/
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   └── DELETE /:id
├── deals/
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── PATCH  /:id/stage           # Move to stage
├── pipelines/
│   ├── GET    /
│   ├── POST   /
│   └── GET    /:id/stages
├── campaigns/
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   ├── POST   /:id/schedule        # Schedule send
│   ├── POST   /:id/send            # Send immediately
│   ├── POST   /:id/pause           # Pause campaign
│   ├── GET    /:id/analytics        # Campaign metrics
│   └── POST   /:id/test            # Send test email
├── segments/
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── GET    /:id/contacts         # Preview segment contacts
│   └── PATCH  /:id
├── templates/
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   └── POST   /:id/render          # Render with sample data
├── tasks/
│   ├── GET    /
│   ├── POST   /
│   ├── PATCH  /:id
│   └── PATCH  /:id/complete
├── analytics/
│   ├── GET    /dashboard            # Dashboard KPIs
│   ├── GET    /pipeline             # Pipeline metrics
│   ├── GET    /campaigns            # Campaign performance
│   └── GET    /agents               # Agent performance
├── agent/                           # OpenClaw Tool API
│   ├── POST   /execute              # Agent action endpoint
│   ├── GET    /status               # Agent health check
│   └── POST   /webhook              # Inbound from OpenClaw
└── settings/
    ├── GET    /tenant
    ├── PATCH  /tenant
    ├── GET    /integrations
    └── PATCH  /integrations/:id
```

### 3.3 AI Agent Orchestrator

See [Agent System Design](../agents/agent-system-design.md) for detailed documentation.

### 3.4 Service Layer

Each service follows the same pattern:

```typescript
interface ServicePattern<T> {
  list(tenantId: string, filters: FilterParams): Promise<PaginatedResult<T>>;
  getById(tenantId: string, id: string): Promise<T | null>;
  create(tenantId: string, data: CreateDTO): Promise<T>;
  update(tenantId: string, id: string, data: UpdateDTO): Promise<T>;
  delete(tenantId: string, id: string): Promise<void>;
}
```

**Domain Events** are emitted by services and consumed by:
- Agent Orchestrator (to trigger AI actions)
- Notification Service (to send alerts)
- Activity Service (to log timeline entries)
- Analytics Service (to update real-time metrics)

### 3.5 Data Layer

See [Database Schema](../database/schema.md) for the complete ERD and schema.

## 4. Security Architecture

### Authentication Flow
```
Client → POST /api/v1/auth/login
       → Server validates credentials
       → Server issues JWT (access token: 15min, refresh token: 7d)
       → Client stores tokens
       → All subsequent requests include Authorization: Bearer <token>
       → Middleware validates token + resolves tenant context
```

### Multi-Tenancy Strategy
- **Row-Level Security (RLS)** via PostgreSQL policies
- Every table includes a `tenant_id` column
- Prisma middleware automatically injects `tenant_id` in all queries
- API tokens are scoped to a single tenant
- OpenClaw agents are provisioned per-tenant with isolated workspaces

### Data Protection
- Passwords hashed with bcrypt (cost factor 12)
- Sensitive fields (API keys, SMTP passwords) encrypted at rest with AES-256
- All API communication over HTTPS
- CORS restricted to allowed origins
- Rate limiting: 100 req/min for API, 10 req/min for auth endpoints
- Input validation via JSON Schema on all endpoints
- SQL injection prevented by Prisma ORM (parameterized queries)
- XSS prevented by React's default escaping + CSP headers

## 5. Deployment Architecture

### Self-Hosted (Docker Compose)
```yaml
services:
  app:         # Next.js + Fastify (single container)
  postgres:    # PostgreSQL 16
  redis:       # Redis 7
  minio:       # MinIO for file storage
  openclaw:    # OpenClaw Gateway
  worker:      # BullMQ worker for background jobs
```

### Production (Kubernetes)
```
┌─────────────────────────────────────────┐
│  Ingress (nginx / traefik)              │
│  ┌──────────┐  ┌──────────────────┐     │
│  │ Frontend  │  │ API (3 replicas) │     │
│  │ (CDN)     │  │                  │     │
│  └──────────┘  └──────────────────┘     │
│                                          │
│  ┌──────────────────┐ ┌──────────────┐  │
│  │ Worker (2 pods)   │ │ OpenClaw     │  │
│  │ (campaign sends)  │ │ (1 per tenant│  │
│  └──────────────────┘ │  or shared)  │  │
│                        └──────────────┘  │
│                                          │
│  ┌──────────┐ ┌───────┐ ┌──────────┐   │
│  │PostgreSQL│ │ Redis │ │  MinIO   │   │
│  │(primary +│ │(cluster│ │(replicated│  │
│  │ replica) │ │  mode) │ │  mode)   │   │
│  └──────────┘ └───────┘ └──────────┘   │
└─────────────────────────────────────────┘
```

## 6. Scalability Considerations

| Concern | Strategy |
|---------|----------|
| Database scaling | Read replicas for analytics queries, connection pooling via PgBouncer |
| Campaign sends | BullMQ workers with configurable concurrency, batch processing (100/batch) |
| Real-time updates | WebSocket with Redis Pub/Sub for horizontal scaling |
| File uploads | Direct-to-MinIO uploads with presigned URLs |
| Search | PostgreSQL full-text initially, Elasticsearch/Meilisearch when needed |
| Agent load | One OpenClaw instance per tenant (enterprise) or shared with session isolation |
| API rate | Redis-based sliding window rate limiter, per-tenant quotas |

## 7. Monitoring & Observability

| Layer | Tool | Metrics |
|-------|------|---------|
| Application | Pino (structured logging) | Request latency, error rates, agent actions |
| Infrastructure | Prometheus + Grafana | CPU, memory, disk, network |
| Database | pg_stat_statements | Query performance, slow queries |
| Queues | BullMQ Dashboard | Job throughput, failure rates, queue depth |
| Agents | Custom dashboard | Agent response times, task completion rates, accuracy |
| Uptime | Healthcheck endpoints | `/health`, `/ready` on all services |
