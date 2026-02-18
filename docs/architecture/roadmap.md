# Implementation Roadmap

## Overview

The CRM AI Forge platform is built in 5 phases, each delivering incrementally usable value. Each phase ends with a deployable milestone.

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 5
Foundation   Campaign    Agent       Multi-      Enterprise
& Core CRM  Engine      Intelligence Channel
```

---

## Phase 1: Foundation & Core CRM

**Goal:** A working CRM with contact management, deal pipeline, task management, and basic AI integration via OpenClaw.

### 1.1 Project Setup
- [x] Architecture documentation
- [ ] Monorepo scaffolding (pnpm workspaces + Turborepo)
- [ ] Docker Compose for local development (PostgreSQL, Redis, MinIO)
- [ ] Shared package: types, constants, validation schemas
- [ ] CI pipeline (GitHub Actions: lint, typecheck, test)

### 1.2 Database & Backend Foundation
- [ ] Prisma schema (all core models)
- [ ] Database migrations
- [ ] Seed script (demo data for development)
- [ ] Fastify app setup with plugins (CORS, rate limit, JWT)
- [ ] Auth middleware (JWT verification, tenant context)
- [ ] Base service pattern (CRUD + pagination + filtering)
- [ ] Domain event emitter

### 1.3 Authentication & Multi-Tenancy
- [ ] Registration endpoint (creates tenant + admin user)
- [ ] Login/logout/refresh token flow
- [ ] Tenant context middleware (auto-inject tenant_id)
- [ ] Role-based access control (admin, manager, member)
- [ ] NextAuth.js integration in frontend

### 1.4 Contact & Company Management
- [ ] Contact CRUD API (create, read, update, soft-delete)
- [ ] Contact search (full-text via PostgreSQL)
- [ ] Contact filtering (status, lifecycle, score, tags, date range)
- [ ] Company CRUD API
- [ ] Contact-Company association
- [ ] Activity timeline API
- [ ] Notes API
- [ ] CSV import (BullMQ background job)
- [ ] Frontend: Contact list with table, filters, search
- [ ] Frontend: Contact detail page with activity timeline
- [ ] Frontend: Company list and detail pages
- [ ] Frontend: Contact/Company create and edit forms

### 1.5 Deal Pipeline
- [ ] Pipeline CRUD API (with stages)
- [ ] Deal CRUD API
- [ ] Deal stage transition API (with activity logging)
- [ ] Default pipeline seeding (Qualification → Discovery → Proposal → Negotiation → Won/Lost)
- [ ] Frontend: Kanban board with drag-and-drop
- [ ] Frontend: Deal detail page
- [ ] Frontend: Deal create/edit form

### 1.6 Task Management
- [ ] Task CRUD API
- [ ] Task assignment and status transitions
- [ ] Overdue task detection
- [ ] Frontend: Task list with filters
- [ ] Frontend: Task create/edit form
- [ ] Frontend: Tasks in contact/deal detail pages

### 1.7 Dashboard Shell
- [ ] Frontend: Sidebar navigation
- [ ] Frontend: Header with user menu, notifications
- [ ] Frontend: Dashboard page with placeholder KPIs
- [ ] Frontend: Responsive layout (desktop + mobile)
- [ ] WebSocket connection for real-time updates

### 1.8 Basic OpenClaw Integration
- [ ] OpenClaw workspace setup (AGENTS.md, SOUL.md, TOOLS.md)
- [ ] Agent execute API endpoint
- [ ] Single "Supervisor" skill that can query contacts and deals
- [ ] Basic conversational CRM access via one channel (e.g., WebChat)

**Phase 1 Deliverable:** A fully functional CRM with contacts, companies, deals, tasks, and basic AI chat — accessible via web dashboard and one messaging channel.

---

## Phase 2: Campaign Engine

**Goal:** Complete email campaign management with templates, segmentation, scheduling, and analytics.

### 2.1 Email Templates
- [ ] Template CRUD API
- [ ] Variable interpolation engine ({{first_name}}, {{company}}, etc.)
- [ ] Template rendering/preview endpoint
- [ ] Frontend: Template list
- [ ] Frontend: Template editor (HTML + preview pane)
- [ ] Starter template library (5-10 pre-built templates)

### 2.2 Audience Segmentation
- [ ] Segment CRUD API
- [ ] Dynamic segment filter engine (query builder → SQL)
- [ ] Segment contact preview endpoint
- [ ] Segment contact count caching
- [ ] Auto-recompute on schedule (BullMQ job)
- [ ] Frontend: Segment builder (visual filter UI)
- [ ] Frontend: Segment contact preview

### 2.3 Campaign Management
- [ ] Campaign CRUD API
- [ ] Campaign scheduling endpoint
- [ ] Campaign send orchestration (BullMQ)
- [ ] Batch email sending (100/batch, rate-limited)
- [ ] Campaign pause/resume functionality
- [ ] Unsubscribe management (list + one-click unsubscribe link)
- [ ] Bounce handling (webhook from email provider)
- [ ] Frontend: Campaign list with status badges
- [ ] Frontend: Campaign creation wizard (segment → template → settings → review)
- [ ] Frontend: Campaign detail page

### 2.4 Campaign Analytics
- [ ] Open tracking (tracking pixel)
- [ ] Click tracking (link rewriting + redirect)
- [ ] Campaign analytics aggregation
- [ ] Per-recipient status tracking
- [ ] Frontend: Campaign analytics dashboard (open rate, CTR, bounces, etc.)
- [ ] Frontend: Hourly engagement chart

### 2.5 A/B Testing
- [ ] A/B test configuration (subject line, content, send time)
- [ ] Variant splitting logic
- [ ] Winner detection (auto-select after threshold)
- [ ] Frontend: A/B test setup in campaign wizard
- [ ] Frontend: A/B results comparison view

**Phase 2 Deliverable:** Full email campaign management — create segments, design templates, schedule campaigns, track performance, run A/B tests.

---

## Phase 3: Agent Intelligence

**Goal:** Specialist AI agents that autonomously handle CRM operations — lead scoring, campaign optimization, deal forecasting, and proactive alerts.

### 3.1 Agent Infrastructure
- [ ] Agent orchestrator service
- [ ] Base agent class with standard interface
- [ ] Agent message bus (Redis Pub/Sub)
- [ ] Agent action logging (AgentActionLog table)
- [ ] Agent confidence scoring framework
- [ ] Error handling and fallback chain

### 3.2 Lead Agent
- [ ] Lead scoring algorithm implementation
- [ ] Automatic lead qualification (MQL → SQL transitions)
- [ ] Lead assignment logic (round-robin, workload-based)
- [ ] Duplicate contact detection
- [ ] OpenClaw skill: crm-lead-management
- [ ] Scheduled re-scoring job (daily cron)

### 3.3 Campaign Agent
- [ ] Campaign creation from natural language
- [ ] Send time optimization (historical analysis)
- [ ] Content suggestions (subject lines, CTAs)
- [ ] Post-campaign analysis with recommendations
- [ ] OpenClaw skill: crm-campaign-engine

### 3.4 Pipeline Agent
- [ ] Revenue forecasting (weighted pipeline)
- [ ] Stale deal detection and alerts
- [ ] Stage transition recommendations
- [ ] Win/loss pattern analysis
- [ ] OpenClaw skill: crm-deal-pipeline

### 3.5 Analytics Agent
- [ ] Natural language query → SQL/analytics
- [ ] Dashboard summary generation
- [ ] Trend detection and anomaly alerts
- [ ] Proactive insight notifications
- [ ] OpenClaw skill: crm-analytics-reports

### 3.6 Agent Dashboard
- [ ] Frontend: Agent activity log
- [ ] Frontend: Agent performance metrics
- [ ] Frontend: AI suggestions in context (contacts, deals, campaigns)
- [ ] Frontend: Chat widget with agent interaction

**Phase 3 Deliverable:** Intelligent agents that score leads, suggest campaigns, forecast revenue, and proactively alert users — accessible via dashboard and messaging channels.

---

## Phase 4: Multi-Channel Communication

**Goal:** Unified communication across email, WhatsApp, Telegram, Slack, and SMS — all managed through a single inbox.

### 4.1 Channel Integration
- [ ] WhatsApp integration via OpenClaw
- [ ] Telegram integration via OpenClaw
- [ ] Slack integration via OpenClaw
- [ ] SMS integration (Twilio or similar)
- [ ] Channel-specific message formatting

### 4.2 Unified Inbox
- [ ] Conversation threading model (multi-channel per contact)
- [ ] Real-time message synchronization
- [ ] Frontend: Unified inbox UI (conversations list + chat view)
- [ ] Frontend: Channel indicator per message
- [ ] Frontend: Reply from any channel

### 4.3 Support Agent
- [ ] Customer inquiry classification
- [ ] Auto-response generation
- [ ] Sentiment analysis
- [ ] Escalation rules engine
- [ ] OpenClaw skill: crm-customer-support

### 4.4 Multi-Channel Campaigns
- [ ] WhatsApp campaign support
- [ ] SMS campaign support
- [ ] Channel selection in campaign wizard
- [ ] Per-channel template variants
- [ ] Cross-channel analytics

**Phase 4 Deliverable:** Unified inbox with multi-channel messaging. Support agent handles inquiries. Campaigns run across email, WhatsApp, and SMS.

---

## Phase 5: Enterprise & Advanced Features

**Goal:** Enterprise-ready features for scaling to larger teams and more complex workflows.

### 5.1 Automation Workflows
- [ ] Visual workflow builder (trigger → condition → action)
- [ ] Event-triggered workflows (contact created, deal stage changed, etc.)
- [ ] Time-based triggers (delays, schedules)
- [ ] Multi-step workflows with branching logic
- [ ] Workflow templates library
- [ ] Frontend: Drag-and-drop workflow builder

### 5.2 Advanced Analytics
- [ ] Custom report builder
- [ ] Scheduled report delivery (email)
- [ ] Export reports (PDF, CSV)
- [ ] Sales team performance leaderboard
- [ ] Revenue attribution (which campaigns drive deals)
- [ ] Cohort analysis

### 5.3 Integrations
- [ ] REST API with API key authentication (for third-party)
- [ ] Webhook system (outbound webhooks on events)
- [ ] Zapier/Make integration
- [ ] Google Calendar sync
- [ ] Google/Microsoft email sync
- [ ] Slack app (slash commands, notifications)

### 5.4 Enterprise Features
- [ ] SSO (SAML 2.0, OIDC)
- [ ] Audit log viewer
- [ ] Custom roles and permissions
- [ ] White-labeling (custom branding, domain)
- [ ] Data export and portability
- [ ] GDPR compliance tools (consent management, data deletion)
- [ ] Multi-language support (i18n)

### 5.5 Performance & Scale
- [ ] Read replicas for analytics queries
- [ ] Connection pooling (PgBouncer)
- [ ] Elasticsearch/Meilisearch for advanced search
- [ ] CDN for static assets
- [ ] Kubernetes deployment manifests
- [ ] Horizontal auto-scaling

**Phase 5 Deliverable:** Enterprise-ready platform with workflow automation, advanced analytics, third-party integrations, SSO, and horizontal scaling.

---

## Milestone Summary

| Phase | Key Milestone | Core Value Delivered |
|-------|--------------|---------------------|
| **Phase 1** | Working CRM + basic AI chat | Manage contacts, deals, tasks with AI assistance |
| **Phase 2** | Full campaign engine | Create, send, track email campaigns |
| **Phase 3** | Intelligent agents | Autonomous lead scoring, forecasting, optimization |
| **Phase 4** | Multi-channel unified inbox | WhatsApp, Telegram, SMS + support automation |
| **Phase 5** | Enterprise platform | Workflows, integrations, SSO, scale |

## Priority Matrix

```
                          Business Impact
                    Low ◄─────────────────► High
                    │                         │
         Low effort │  Templates Library   │  Contact CRUD       │
                    │  Custom Fields       │  Deal Pipeline      │
                    │                      │  Auth & Tenancy     │
                    ├──────────────────────┼──────────────────────┤
        High effort │  White-labeling      │  AI Agent System    │
                    │  SSO/SAML            │  Campaign Engine    │
                    │  Workflow Builder     │  Multi-Channel      │
                    │                         │
```

**Start with:** High impact, low effort (Phase 1 core CRM).
**Build toward:** High impact, high effort (Phase 3 agents, Phase 2 campaigns).
**Defer:** Low impact, high effort (Phase 5 enterprise features).
