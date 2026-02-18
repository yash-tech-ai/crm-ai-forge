# Implementation Roadmap

## Overview

CRM AI Forge is built in **4 phases**, each delivering deployable value. The approach: **agent-first, dashboard-second** — get conversational CRM working before building the visual UI.

```
Phase 1 (Weeks 1-6)     Phase 2 (Weeks 7-12)    Phase 3 (Weeks 13-18)   Phase 4 (Weeks 19-24)
"Walk"                   "Run"                    "Fly"                    "Soar"
Foundation + Core CRM    Campaign Engine          Agent Intelligence       Scale & Polish
Talk to CRM via chat     Create & send campaigns  Proactive AI coaching    Production-ready
```

---

## Phase 1: Foundation & Core CRM — "Walk"

**Goal:** Sales team can manage contacts and deals by messaging the bot on WhatsApp/Slack.

### Week 1-2: Infrastructure & Skeleton

- [ ] Monorepo scaffolding (pnpm workspaces + Turborepo)
- [ ] Docker Compose (PostgreSQL 16 + pgvector, Redis 7, MinIO)
- [ ] Prisma schema (all core models from schema.md)
- [ ] Database migrations + seed script (demo data)
- [ ] Fastify app setup (CORS, rate limit, JWT auth, tenant middleware)
- [ ] Shared package (types, constants, Zod schemas)
- [ ] CI pipeline (GitHub Actions: lint, typecheck, test)

### Week 2-3: Auth & Core API

- [ ] Registration endpoint (creates tenant + admin user + default pipeline)
- [ ] Login/logout/refresh token flow
- [ ] Tenant context middleware (auto-inject tenant_id in all queries)
- [ ] Contact CRUD API (create, read, update, soft-delete, search, filter)
- [ ] Company CRUD API
- [ ] Deal CRUD API (with stage transitions + activity logging)
- [ ] Pipeline API (with stages)
- [ ] Task CRUD API
- [ ] Activity timeline API
- [ ] Notes API
- [ ] Domain event emitter (Redis Pub/Sub)

### Week 3-4: OpenClaw Setup

- [ ] Install OpenClaw, configure openclaw.json with Orchestrator agent
- [ ] Create workspace: AGENTS.md, SOUL.md, TOOLS.md
- [ ] Build `crm-core` skill (CRUD via API calls)
- [ ] Build `lead-management` skill (basic scoring + routing)
- [ ] Build `sales-assistant` skill (basic deal management)
- [ ] Connect first channel (WhatsApp or Slack)
- [ ] Test: "Add a new lead: John Doe, john@test.com, Acme Inc"
- [ ] Test: "Show me all leads"
- [ ] Test: "Update deal #X to Proposal stage"

### Week 5-6: Basic Dashboard

- [ ] Next.js 14 app setup (App Router, Tailwind, shadcn/ui)
- [ ] Auth pages (login, register)
- [ ] Dashboard shell (sidebar, header, navigation)
- [ ] Contact list page (table with search, filters, pagination)
- [ ] Contact detail page (with activity timeline)
- [ ] Deal pipeline page (Kanban board with drag-and-drop)
- [ ] Task list page
- [ ] WebSocket connection for real-time updates
- [ ] Basic dashboard KPI cards (placeholder data)

**Phase 1 Deliverable:** Sales team can manage contacts, deals, and tasks via WhatsApp/Slack AND a web dashboard. Basic AI scoring and routing works.

---

## Phase 2: Campaign Engine — "Run"

**Goal:** Marketing can create, send, and analyze email campaigns via chat or dashboard.

### Week 7-8: Email Templates & Segments

- [ ] EmailTemplate CRUD API
- [ ] MJML template compilation (MJML -> HTML)
- [ ] Variable interpolation engine ({{first_name}}, {{company}}, etc.)
- [ ] Template rendering/preview endpoint
- [ ] Starter template library (5 pre-built templates)
- [ ] AudienceSegment CRUD API
- [ ] Dynamic segment filter engine (filter criteria JSON -> Prisma query)
- [ ] Segment contact preview endpoint
- [ ] Segment contact count caching + auto-recompute (BullMQ job)
- [ ] Frontend: Template editor (MJML source + HTML preview)
- [ ] Frontend: Segment builder (visual filter UI)

### Week 9-10: Campaign Sending

- [ ] Campaign CRUD API
- [ ] Campaign scheduling endpoint
- [ ] BullMQ campaign send worker (batch 100/send, rate-limited)
- [ ] Email sending via Nodemailer (SES/SMTP)
- [ ] Open tracking (tracking pixel)
- [ ] Click tracking (link rewriting + redirect endpoint)
- [ ] Bounce handling (SES webhook)
- [ ] Unsubscribe management (one-click unsubscribe link + Unsubscribe table)
- [ ] Campaign pause/resume
- [ ] Build `campaign-builder` skill for OpenClaw
- [ ] Test: "Create a campaign for inactive customers with 15% discount"

### Week 11-12: Campaign Analytics & Compliance

- [ ] Campaign analytics aggregation (per-recipient -> campaign-level metrics)
- [ ] A/B testing engine (variant splitting, winner detection)
- [ ] Build `compliance-agent` skill (mandatory campaign gate)
- [ ] Campaign compliance status workflow (DRAFT -> PENDING_COMPLIANCE -> SCHEDULED)
- [ ] Drip campaign sequences (AutomationSequence + SequenceEnrollment)
- [ ] Drip processor cron job (every 15 min)
- [ ] Frontend: Campaign list with status badges
- [ ] Frontend: Campaign creation wizard (segment -> template -> settings -> review)
- [ ] Frontend: Campaign analytics dashboard
- [ ] Frontend: A/B test results view

**Phase 2 Deliverable:** Full email campaign management — segments, MJML templates, scheduling, A/B tests, compliance gate, drip sequences, analytics.

---

## Phase 3: Agent Intelligence — "Fly"

**Goal:** Agents become proactive — they score leads, coach sales, optimize campaigns, and alert users without being asked.

### Week 13-14: Enrichment & Advanced Scoring

- [ ] Build Enrichment Agent skill (LinkedIn browser automation + APIs)
- [ ] Apollo/Clearbit API integration
- [ ] Batch enrichment cron job (2 AM daily, 50 contacts)
- [ ] Advanced lead scoring (fit + intent + recency with decay)
- [ ] Automatic lead qualification (MQL -> SQL transitions)
- [ ] Lead assignment engine (round-robin, workload-based)
- [ ] Lead re-scoring cron job (every 4 hours)

### Week 15-16: Sales Coaching & Proactive Alerts

- [ ] Sales Agent: call prep generation (full briefing)
- [ ] Sales Agent: follow-up email drafting (post-call)
- [ ] Sales Agent: stale deal detection cron (9 AM, 3 PM weekdays)
- [ ] Sales Agent: daily priority list cron (8 AM weekdays)
- [ ] Pipeline forecasting (probability-weighted revenue)
- [ ] Canvas dashboard rendering (pipeline funnel, KPIs)
- [ ] Morning digest cron (8 AM: new leads, tasks, deal updates)
- [ ] Weekly executive summary cron (Friday 5 PM)

### Week 17-18: Analytics Intelligence & Agent Dashboard

- [ ] Insight Agent: natural language -> analytics query
- [ ] Insight Agent: trend detection (week-over-week patterns)
- [ ] Insight Agent: anomaly alerts (bounce spike, deal stagnation)
- [ ] Campaign Agent: send time optimization (historical analysis)
- [ ] Campaign Agent: auto A/B test resolution (every 30 min)
- [ ] Campaign Agent: post-campaign recommendations
- [ ] pgvector setup: contact embeddings for semantic search
- [ ] Agent action logging (AgentActionLog table, parent-child chains)
- [ ] Frontend: Agent activity log
- [ ] Frontend: AI suggestion cards in contact/deal detail pages
- [ ] Frontend: Chat widget for AI interaction in dashboard

**Phase 3 Deliverable:** Agents proactively score leads, prep calls, detect risks, optimize campaigns, and generate reports. Canvas dashboards. Semantic search.

---

## Phase 4: Scale & Polish — "Soar"

**Goal:** Production-ready, multi-tenant capable, with multi-channel support and enterprise features.

### Week 19-20: Multi-Channel & Support

- [ ] WhatsApp Business API integration (campaigns + inbox)
- [ ] Telegram channel integration
- [ ] SMS campaign support (Twilio)
- [ ] Unified inbox model (multi-channel per contact)
- [ ] Support Agent skill (inquiry handling, sentiment, escalation)
- [ ] Frontend: Unified inbox UI
- [ ] Frontend: Multi-channel reply

### Week 21-22: Automation & Integrations

- [ ] AutomationWorkflow engine (event -> condition -> action)
- [ ] Frontend: Visual workflow builder (basic)
- [ ] Webhook system (outbound webhooks on events)
- [ ] Web form lead capture webhook handler
- [ ] Google Calendar sync (optional)
- [ ] CSV import/export with progress tracking
- [ ] API key authentication (for third-party access)

### Week 23-24: Production Hardening

- [ ] Multi-tenant OpenClaw provisioning (shared vs dedicated)
- [ ] Performance testing and optimization
- [ ] Security audit (OWASP top 10 checklist)
- [ ] Rate limiting tuning (per-tenant quotas)
- [ ] Monitoring setup (Grafana + Prometheus + Pino)
- [ ] Token budget enforcement and alerting
- [ ] Backup strategy (PostgreSQL + MinIO)
- [ ] Documentation (user guide, API docs, deployment guide)
- [ ] Docker production compose with health checks
- [ ] Kubernetes manifests (optional)

**Phase 4 Deliverable:** Production platform with multi-channel messaging, support automation, workflows, monitoring, and enterprise hardening.

---

## Quick Start Guide (First 48 Hours)

### Day 1: Setup OpenClaw + Core

```bash
# 1. Install OpenClaw
npm install -g openclaw@latest
openclaw onboard --install-daemon

# 2. Start infrastructure
git clone https://github.com/yash-tech-ai/crm-ai-forge.git
cd crm-ai-forge
docker compose up -d    # PostgreSQL, Redis, MinIO

# 3. Initialize database
pnpm install
pnpm --filter @crm-ai-forge/database db:migrate
pnpm --filter @crm-ai-forge/database db:seed

# 4. Configure OpenClaw agents
cp -r openclaw/* ~/.openclaw/

# 5. Set environment variables
cp .env.example .env
# Edit .env: add ANTHROPIC_API_KEY, DATABASE_URL, etc.

# 6. Start the API server
pnpm --filter @crm-ai-forge/api dev

# 7. Connect a channel
openclaw channels login    # Follow prompts for WhatsApp or Slack

# 8. Test!
# Send a message: "Add a new lead: Priya Sharma, CTO, priya@technova.in"
```

### Day 2: First Agent Interactions

```bash
# Test the pipeline:
# "Show me all leads"
# "Score this lead: VP of Engineering at a 500-person fintech"
# "Create a task to call John Doe tomorrow at 10 AM"
# "How's my pipeline looking?"
# "Show me deals stuck for more than a week"

# Verify agents are working:
openclaw agent --list
openclaw sessions --list

# Start the frontend:
pnpm --filter @crm-ai-forge/web dev
# Open http://localhost:3000
```

---

## Milestone Summary

| Phase | Duration | Deliverable | Value |
|-------|----------|-------------|-------|
| **Walk** | Weeks 1-6 | CRM + chat + basic dashboard | Manage contacts/deals via messaging |
| **Run** | Weeks 7-12 | Campaign engine + compliance | Create, send, track email campaigns |
| **Fly** | Weeks 13-18 | Intelligent agents + Canvas | Proactive scoring, coaching, optimization |
| **Soar** | Weeks 19-24 | Multi-channel + production | Enterprise-ready platform |

## Priority Matrix

```
                          Business Impact
                    Low <------------------> High
                    |                         |
         Low effort |  Template Library    |  Contact/Deal CRUD     |
                    |  Custom Fields       |  Auth & Tenancy        |
                    |                      |  OpenClaw Basic Setup  |
                    |----------------------|------------------------|
        High effort |  White-labeling      |  8-Agent System        |
                    |  SSO/SAML            |  Campaign Engine       |
                    |  Workflow Builder     |  Multi-Channel         |
                    |  Calendar Sync       |  Compliance Gate       |
                    |                         |
```

**Start with:** High impact, low effort (Phase 1 core CRM + OpenClaw).
**Build toward:** High impact, high effort (Phase 2 campaigns, Phase 3 agents).
**Defer:** Low impact, high effort (enterprise features).
