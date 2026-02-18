# System Architecture

## 1. Architecture Principles

1. **Agent-First** — Agents ARE the CRM, not an add-on. Every feature is designed to be agent-driven first, UI-accessible second
2. **OpenClaw-Native** — Built on top of OpenClaw's runtime, not beside it. Leverage sessions, memory, cron, browser, Canvas, sub-agents natively
3. **Dual Access** — Conversational (messaging channels) and Visual (Next.js dashboard) paths to the same data and operations
4. **Multi-Tenant** — Complete data isolation between tenants at the database level from Day 1
5. **Model-Tiered** — Right model for the right task: Opus for orchestration, Sonnet for specialists, Haiku for background work
6. **Event-Driven** — Domain events trigger agent reactions, not just user commands
7. **Compliance-Gated** — No campaign sends without Compliance Agent approval (mandatory, not optional)
8. **Self-Hosted** — All data on your infrastructure, zero vendor lock-in

## 2. High-Level Architecture

```
+-----------------------------------------------------------------------+
|                      USER INTERACTION LAYER                            |
|                                                                        |
|  +---------------+  +-----------------------------------------------+ |
|  |  Next.js App  |  |  OpenClaw Gateway                             | |
|  |  (Dashboard)  |  |  +--------+ +--------+ +------+ +----------+ | |
|  |               |  |  |WhatsApp| |Telegram| |Slack | | WebChat  | | |
|  |  - Pipeline   |  |  +--------+ +--------+ +------+ +----------+ | |
|  |  - Campaigns  |  |  +--------+ +--------+ +------+ +----------+ | |
|  |  - Analytics  |  |  |Discord | | Teams  | |Signal| | Canvas   | | |
|  |  - AI Chat    |  |  +--------+ +--------+ +------+ | (A2UI)   | | |
|  +-------+-------+  |                                  +----------+ | |
|          |           +---------------------+-------------------------+ |
+----------+-----------------------------+-------------------------------+
           |                             |
           v                             v
+-----------------------------------------------------------------------+
|                     OPENCLAW CONTROL PLANE                             |
|                                                                        |
|  +-------------+  +------------+  +-----------+  +-----------------+  |
|  |  Session     |  |  Routing   |  |   Cron    |  |  Webhook        |  |
|  |  Manager     |  |  Engine    |  | Scheduler |  |  Receiver       |  |
|  +-------------+  +------------+  +-----------+  +-----------------+  |
|                                                                        |
|  +-------------+  +------------+  +-----------+  +-----------------+  |
|  |  Memory      |  |   Auth     |  |  Browser  |  |  Canvas (A2UI)  |  |
|  |  (BM25+Vec)  |  |  Profiles  |  |  (CDP)    |  |  Renderer       |  |
|  +-------------+  +------------+  +-----------+  +-----------------+  |
+----------------------------------+------------------------------------+
                                   |
                    +--------------v--------------+
                    |     AGENT ROUTING            |
                    |  (bindings -> agentId match) |
                    +--------------+--------------+
                                   |
        +---------+---------+------+------+---------+---------+
        |         |         |      |      |         |         |
        v         v         v      v      v         v         v
   +----------+--------+--------+-----+--------+----------+-------+
   | Orchest- | Lead   |Campaign|Sales|Insight |Enrichment|Compli-|
   | rator    | Agent  | Agent  |Agent| Agent  | Agent    |ance   |
   | (Opus)   |(Sonnet)|(Sonnet)|     |(Sonnet)| (Haiku)  |Agent  |
   +----------+--------+--------+-----+--------+----------+-------+
   |                                                       |
   |  +--------------------------------------------------+ |
   |  |        Support Agent (Sonnet)                     | |
   |  +--------------------------------------------------+ |
   +---+-----+-----+------+-----+-----+-----+------+-----+
       |     |     |      |     |     |     |      |
       +-----+-----+------+-----+-----+-----+-----+
                           |
                           v
+-----------------------------------------------------------------------+
|                        API GATEWAY                                     |
|                                                                        |
|  Fastify Server (Node.js + TypeScript)                                 |
|                                                                        |
|  +----------+  +----------+  +-------------+  +--------------------+  |
|  | REST API |  | WebSocket|  | Agent Tool  |  | Webhook Handlers   |  |
|  | /api/v1  |  | /ws      |  | API /agent  |  | /hooks (forms,     |  |
|  |          |  |          |  |             |  |  email events, etc.)|  |
|  +----------+  +----------+  +-------------+  +--------------------+  |
|                                                                        |
|  +------------------------------------------------------------------+ |
|  |  Middleware Stack                                                  | |
|  |  JWT Auth -> Tenant Resolver -> Rate Limiter -> Validator         | |
|  +------------------------------------------------------------------+ |
+----------------------------------+------------------------------------+
                                   |
+----------------------------------v------------------------------------+
|                       SERVICE LAYER                                    |
|                                                                        |
|  +-----------+ +-----------+ +-----------+ +-----------+              |
|  | Contact   | | Company   | | Deal      | | Pipeline  |              |
|  | Service   | | Service   | | Service   | | Service   |              |
|  +-----------+ +-----------+ +-----------+ +-----------+              |
|                                                                        |
|  +-----------+ +-----------+ +-----------+ +-----------+              |
|  | Campaign  | | Email     | | Template  | | Segment   |              |
|  | Service   | | Service   | | Service   | | Service   |              |
|  +-----------+ +-----------+ +-----------+ +-----------+              |
|                                                                        |
|  +-----------+ +-----------+ +-----------+ +-----------+              |
|  | Task      | | Activity  | | Analytics | | Sequence  |              |
|  | Service   | | Service   | | Service   | | Service   |              |
|  +-----------+ +-----------+ +-----------+ +-----------+              |
|                                                                        |
|  +------------------------------------------------------------------+ |
|  | Domain Event Emitter                                              | |
|  | contact.created, deal.stage_changed, campaign.sent,               | |
|  | lead.scored, task.overdue, compliance.approved/rejected           | |
|  +------------------------------------------------------------------+ |
+----------------------------------+------------------------------------+
                                   |
+----------------------------------v------------------------------------+
|                        DATA LAYER                                      |
|                                                                        |
|  +----------------+  +--------------+  +----------------------------+ |
|  | PostgreSQL 16  |  | Redis 7      |  | MinIO (S3)                 | |
|  | + pgvector     |  |              |  |                            | |
|  | + Prisma ORM   |  | - Sessions   |  | - MJML email templates     | |
|  |                |  | - Cache      |  | - Attachments              | |
|  | - CRM entities |  | - Job queues |  | - Campaign assets          | |
|  | - Campaign data|  | - Agent bus  |  | - Contact imports          | |
|  | - Consent/GDPR |  | - Rate limits|  | - Agent-generated reports  | |
|  | - Audit logs   |  | - Pub/Sub    |  |                            | |
|  | - Embeddings   |  |              |  |                            | |
|  +----------------+  +--------------+  +----------------------------+ |
|                                                                        |
|  +------------------------------------------------------------------+ |
|  | OpenClaw Memory Store (per-agent workspace)                       | |
|  | - Conversation history per session                                | |
|  | - Agent-specific context and preferences                          | |
|  | - Markdown-based persistent memory (BM25 + vector search)         | |
|  +------------------------------------------------------------------+ |
+-----------------------------------------------------------------------+
```

## 3. The Two Access Paths

### Path 1: Conversational (Primary — Agent-First)

```
Sales Rep on WhatsApp:
  "Prep me for the 10 AM call with Priya from TechNova"
       |
       v
  OpenClaw Gateway receives message
       |
       v
  Session Router -> matches binding -> Orchestrator Agent
       |
       v
  Orchestrator classifies intent: "call_prep"
  Routes to: Sales Agent (as sub-agent)
       |
       v
  Sales Agent:
    1. Calls API: GET /api/v1/contacts?search=priya+technova
    2. Calls API: GET /api/v1/contacts/{id}/activities?limit=20
    3. Calls API: GET /api/v1/deals?contactId={id}
    4. Generates call prep brief with talking points
       |
       v
  Orchestrator consolidates -> sends back via WhatsApp
```

### Path 2: Visual (Companion — Dashboard)

```
Marketing Manager on Dashboard:
  Opens /campaigns -> clicks "New Campaign"
       |
       v
  Next.js frontend calls: POST /api/v1/campaigns
       |
       v
  Fastify API validates, saves to PostgreSQL via Prisma
       |
       v
  Domain Event emitted: campaign.created
       |
       v
  Agent Orchestrator picks up event:
    - Campaign Agent: "New campaign detected. Analyzing audience..."
    - Compliance Agent: "Checking consent records for segment..."
       |
       v
  Dashboard receives WebSocket update:
    "AI Suggestion: Optimal send time is Tuesday 10:30 AM based on
     this segment's historical engagement"
```

### Path 3: Canvas (A2UI — Agent-Driven Visuals)

```
Business Owner on Telegram:
  "Show me the weekly executive summary"
       |
       v
  Orchestrator -> Insight Agent
       |
       v
  Insight Agent:
    1. Calls API: GET /api/v1/analytics/dashboard?period=7d
    2. Calls API: GET /api/v1/analytics/pipeline
    3. Calls API: GET /api/v1/analytics/campaigns
    4. Renders Canvas (A2UI) dashboard
       |
       v
  Live visual dashboard rendered on user's device:
  +----------------------------------------------------+
  |         WEEK 7/2026 -- EXECUTIVE SUMMARY           |
  +----------------------------------------------------+
  | Pipeline:  $2.4M (+$38K from last week)            |
  | Won:       $180K (2 deals closed)                  |
  | Forecast:  $450K expected to close in Feb          |
  |                                                    |
  | Leads:     28 new (+12% vs last week)              |
  | Qualified: 15 (54% qualification rate)             |
  |                                                    |
  | Campaigns: 3 active, 1 completed                   |
  | Best:      'Insurance ROI' -- 48% open rate        |
  |                                                    |
  | !! Attention: 4 deals stuck >14 days               |
  | ** Insight: Webinar leads convert 2.3x faster      |
  +----------------------------------------------------+
```

## 4. Security Architecture

### Authentication Flow (Dashboard)

```
Client -> POST /api/v1/auth/login
       -> Server validates credentials (bcrypt, cost 12)
       -> Server issues JWT (access: 15min, refresh: 7d)
       -> All subsequent requests: Authorization: Bearer <token>
       -> Middleware: validate token -> resolve tenant -> inject context
```

### Authentication Flow (OpenClaw Channels)

```
User sends DM on WhatsApp
       -> OpenClaw DM Pairing: unknown senders get pairing code
       -> Admin approves: openclaw pairing approve whatsapp <code>
       -> Session created with tenant context
       -> All agent operations scoped to tenant via API token
```

### Multi-Tenancy Strategy

- **Row-Level Security (RLS)** via PostgreSQL policies
- Every table includes `tenant_id` column (NOT NULL, indexed)
- Prisma middleware auto-injects `tenant_id` in all queries
- API tokens scoped to single tenant
- OpenClaw agents provisioned per-tenant (shared instance: session isolation, enterprise: dedicated instance)
- **Never expose data cross-tenant** — enforced at database, API, and agent levels

### Data Protection

| Concern | Protection |
|---------|-----------|
| Passwords | bcrypt (cost 12) |
| Sensitive fields (API keys, SMTP creds) | AES-256 encryption at rest |
| API communication | HTTPS only |
| CORS | Restricted to allowed origins |
| Rate limiting | Redis sliding window (per-tenant quotas) |
| Input validation | Zod schemas on all endpoints |
| SQL injection | Prisma ORM (parameterized queries) — agents NEVER run raw SQL |
| XSS | React default escaping + CSP headers |
| Prompt injection via lead data | Sanitize all user-provided data before passing to agents |
| Agent data access | Per-agent tool policies (Compliance Agent: read-only) |

### Why Agents Call the API (Not Raw SQL)

The other architectural option is agents running SQL directly via shell scripts. We explicitly reject this because:

1. **SQL injection via prompt injection** — A lead named `'; DROP TABLE contacts; --` in a form submission could be passed to an agent that constructs SQL
2. **No tenant isolation** — Raw SQL bypasses Prisma's tenant middleware
3. **No audit trail** — API calls are logged, rate-limited, and validated; raw SQL is not
4. **No type safety** — Prisma catches schema mismatches at compile time

**Rule: All data access flows through the Fastify API, authenticated and tenant-scoped.**

## 5. Event-Driven Agent Reactions

Agents don't just respond to user messages — they react to system events.

```
Domain Event                    Agent Reactions
-----------                    ---------------
contact.created         ->     Lead Agent: calculate initial score
                               Enrichment Agent: lookup LinkedIn + company data
                               Campaign Agent: check if contact matches any active segment

deal.stage_changed      ->     Sales Agent: suggest next action
                               Insight Agent: update pipeline metrics
                               Campaign Agent: add/remove from relevant campaigns

campaign.sent           ->     Compliance Agent: verify send was approved
                               Insight Agent: start tracking metrics

lead.scored             ->     Lead Agent: route if score crossed threshold
(score >= 80)                  Sales Agent: create urgent task for assigned rep
                               Campaign Agent: add to fast-track sequence

task.overdue            ->     Sales Agent: remind assignee via preferred channel
                               Insight Agent: flag in daily digest

compliance.rejected     ->     Campaign Agent: pause campaign immediately
                               Orchestrator: notify campaign creator with reason

email.bounced           ->     Lead Agent: update contact status
                               Campaign Agent: update campaign metrics
                               Compliance Agent: flag if bounce rate > 5%
```

## 6. Deployment Architecture

### Development (Docker Compose)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crm_ai_forge
    volumes: [postgres_data:/var/lib/postgresql/data]
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]

  api:
    build: ./apps/api
    depends_on: [postgres, redis]
    ports: ["3001:3001"]
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/crm_ai_forge
      REDIS_URL: redis://redis:6379

  web:
    build: ./apps/web
    depends_on: [api]
    ports: ["3000:3000"]

  worker:
    build: ./apps/worker
    depends_on: [postgres, redis]

  # OpenClaw runs on host (daemon mode) — not containerized
  # It connects to the API at http://localhost:3001
```

### Production (Kubernetes)

```
+-------------------------------------------+
|  Ingress (nginx/traefik)                  |
|  +----------+  +---------------------+   |
|  | Frontend |  | API (3 replicas)     |   |
|  | (CDN)    |  | + Agent Tool API     |   |
|  +----------+  +---------------------+   |
|                                           |
|  +-------------------+ +---------------+ |
|  | Worker (2 pods)    | | OpenClaw      | |
|  | (campaign sends,   | | (1 per tenant | |
|  |  enrichment batch) | |  or shared)   | |
|  +-------------------+ +---------------+ |
|                                           |
|  +----------+ +-------+ +-------------+  |
|  |PostgreSQL| | Redis | | MinIO       |  |
|  |(primary+ | |(cluster| |(replicated) |  |
|  | replica) | | mode) | |             |  |
|  +----------+ +-------+ +-------------+  |
+-------------------------------------------+
```

### OpenClaw Multi-Tenant Strategy

| Tier | Strategy | Isolation | Cost |
|------|----------|-----------|------|
| **Starter/Growth** | Shared OpenClaw instance, session-level tenant isolation | Medium | Low |
| **Enterprise** | Dedicated OpenClaw instance per tenant, separate workspaces | Full | Higher |

## 7. Scalability Considerations

| Concern | Strategy |
|---------|----------|
| Database scaling | Read replicas for analytics, PgBouncer for connection pooling |
| Campaign sends | BullMQ workers with configurable concurrency, batch processing (100/batch) |
| Real-time updates | WebSocket + Redis Pub/Sub for horizontal scaling |
| File uploads | Direct-to-MinIO with presigned URLs |
| Search | PostgreSQL full-text + pgvector initially; Meilisearch when needed |
| Agent load | Sub-agent spawning for parallel work; model tiering for cost control |
| API rate | Redis sliding window rate limiter, per-tenant quotas |
| LLM costs | Haiku for background, Sonnet for specialists, Opus only for orchestrator; response caching |
| Context bloat | OpenClaw session compaction (safeguard mode) |

## 8. Monitoring & Observability

| Layer | Tool | Key Metrics |
|-------|------|-------------|
| Application | Pino (structured JSON) | Request latency, error rates, agent actions per tenant |
| Infrastructure | Prometheus + Grafana | CPU, memory, disk, network, container health |
| Database | pg_stat_statements | Query performance, slow queries, connection pool utilization |
| Queues | BullMQ Dashboard | Job throughput, failure rates, queue depth |
| Agents | Custom dashboard + Canvas | Response times, task completion rates, model costs per agent |
| LLM Costs | Token tracking middleware | Tokens used per agent per day, cost per action |
| Email | SES/Mailgun dashboard | Deliverability, bounce rate, complaint rate, domain reputation |
| Uptime | Health endpoints | `/health`, `/ready` on all services |
