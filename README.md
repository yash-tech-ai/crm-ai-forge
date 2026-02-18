# CRM AI Forge

**An OpenClaw-Native, AI-Agentic CRM + Campaign Platform**

> *What Zoho does with menus and forms, CRM AI Forge does with intelligent agents that observe, reason, decide, and execute — working in tandem like a coordinated sales & marketing team.*

CRM AI Forge is built **on top of** OpenClaw's open-source agent infrastructure — not as a traditional web app with AI bolted on, but as an **agent-first platform** where specialized AI agents ARE the CRM. Users interact through the messaging apps they already use (WhatsApp, Slack, Telegram), while a production-grade API and web dashboard serve as the visual companion.

## Why This Exists

| Traditional CRM (Zoho/HubSpot) | CRM AI Forge (OpenClaw) |
|------|------|
| Web dashboard you must log into | Talk to your CRM on WhatsApp/Slack/Telegram |
| Rules-based automation (if-then) | Agents reason about what to do and when |
| User configures every workflow | Agents observe patterns and suggest/auto-create workflows |
| Separate tools bolted together | Single unified agent brain across CRM + Campaigns |
| Cloud-locked, vendor-dependent | Self-hosted, open-source, data stays yours |
| One-size-fits-all engagement | Hyper-personalized per-contact strategy |
| Reactive (triggers fire after events) | Proactive (agents anticipate and act ahead) |

## How OpenClaw Powers Everything

| OpenClaw Capability | How We Leverage It |
|---|---|
| **Multi-Agent Routing** — isolated agents with separate workspaces, sessions, memory | Each CRM function = a specialized agent (Lead, Campaign, Sales, etc.) |
| **Multi-Channel Inbox** — WhatsApp, Telegram, Slack, Discord, Teams, Signal, WebChat | Sales reps interact with CRM via the messaging app they already use |
| **Skills System** — modular SKILL.md packages with tools | Each CRM module = a custom skill (lead-management, campaign-builder, etc.) |
| **Cron + Webhooks** — scheduled tasks and event-driven triggers | Automated scoring, campaign scheduling, daily digests, deal risk alerts |
| **Browser Control** — CDP-based Chrome automation | Data enrichment, LinkedIn scraping, competitor monitoring |
| **Sub-agents** — spawn background workers for long tasks | Parallel campaign sends, bulk enrichment, report generation |
| **Canvas (A2UI)** — agent-driven visual workspace | Live dashboards, pipeline views, campaign analytics |
| **Model Agnostic** — Claude, GPT, local models | Cost-optimize: Opus for routing, Sonnet for specialists, Haiku for background |

## The Agent Team (8 Specialist Agents)

| Agent | Model | Role |
|-------|-------|------|
| **Orchestrator** | Claude Opus 4.6 | Routes requests, decomposes complex tasks, coordinates all agents |
| **Lead Agent** | Claude Sonnet 4.5 | Scores, qualifies, routes, and nurtures leads |
| **Campaign Agent** | Claude Sonnet 4.5 | Creates, schedules, optimizes, and analyzes campaigns |
| **Sales Agent** | Claude Sonnet 4.5 | Call prep, deal coaching, follow-up drafting, pipeline management |
| **Insight Agent** | Claude Sonnet 4.5 | Analytics, reports, trend detection, anomaly alerts |
| **Enrichment Agent** | Claude Haiku 4.5 | Data enrichment via APIs + browser automation (cost-effective) |
| **Compliance Agent** | Claude Sonnet 4.5 | GDPR/CAN-SPAM/DPDPA compliance gate with **veto power** |
| **Support Agent** | Claude Sonnet 4.5 | Customer inquiries, auto-response, sentiment analysis, escalation |

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Agent Platform** | OpenClaw (self-hosted) | Multi-agent, multi-channel, skills, cron, browser, Canvas |
| **Orchestrator LLM** | Claude Opus 4.6 | Best reasoning for routing complex requests |
| **Specialist LLMs** | Claude Sonnet 4.5 | Quality + cost balance for domain tasks |
| **Background LLMs** | Claude Haiku 4.5 | Cost-effective for enrichment, scoring, categorization |
| **Backend API** | Node.js + Fastify + TypeScript | High-perf API for dashboard + agent access |
| **Database** | PostgreSQL 16 + pgvector + Prisma ORM | CRM data + vector search + type safety |
| **Cache & Queues** | Redis 7 + BullMQ | Sessions, job queues, agent message bus, real-time metrics |
| **Frontend** | Next.js 14 + Tailwind + shadcn/ui | Visual dashboard companion to conversational UI |
| **Email** | MJML templates + AWS SES / SMTP | Responsive emails + reliable delivery |
| **File Storage** | MinIO (S3-compatible) | Self-hosted templates, attachments, reports |
| **Vector Search** | pgvector | "Find contacts similar to our best customer" |
| **Monitoring** | Pino + Grafana + Prometheus | Agent health, API costs, performance |

## Architecture at a Glance

```
USERS ──► WhatsApp / Slack / Telegram / WebChat / Canvas
                         │
                         ▼
              ┌─────────────────────┐
              │   OPENCLAW GATEWAY   │
              │   Session Routing    │
              │   Cron Scheduler     │
              │   Webhook Receiver   │
              │   Memory (BM25+Vec) │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   ORCHESTRATOR       │  (Opus — best reasoning)
              │   Intent → Plan →    │
              │   Route → Consolidate│
              └──┬──┬──┬──┬──┬──┬──┘
                 │  │  │  │  │  │
    ┌────────────┘  │  │  │  │  └────────────┐
    ▼     ▼         ▼  │  ▼         ▼        ▼
  Lead  Campaign  Sales │ Insight  Enrichment Compliance
  Agent  Agent   Agent  │  Agent    Agent      Agent
                        ▼                  (veto power)
                    Support
                     Agent
                 │  │  │  │  │  │
                 └──┴──┴──┼──┴──┘
                          ▼
              ┌─────────────────────┐
              │   FASTIFY API        │  (REST + WebSocket)
              │   Auth / Tenancy     │
              │   Rate Limiting      │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    PostgreSQL       Redis           MinIO
    + pgvector    (cache/queue)    (files)
    + Prisma
```

**Two paths to the same data:**
1. **Conversational** — User → OpenClaw → Orchestrator → Specialist Agent → API → Database
2. **Visual** — User → Next.js Dashboard → API → Database → (agents react to events)

## Documentation

| Document | Description |
|----------|-------------|
| [System Architecture](docs/architecture/system-architecture.md) | Full layered architecture, security, deployment, scalability |
| [Agent System Design](docs/agents/agent-system-design.md) | 8 agents, model tiering, collaboration patterns, guardrails |
| [OpenClaw Integration](docs/agents/openclaw-integration.md) | Full openclaw.json, skills, cron, webhooks, Canvas |
| [Database Schema & ERD](docs/database/schema.md) | Prisma schema, pgvector, consent tracking, multi-tenancy |
| [API Specification](docs/api/api-spec.md) | 50+ endpoints, auth, WebSocket, rate limits |
| [User Experience Stories](docs/ux/user-stories.md) | Day-in-the-life for sales rep, marketer, business owner |
| [Project Structure](docs/architecture/project-structure.md) | Monorepo layout, tech stack, environment setup |
| [Cost & Risk Analysis](docs/architecture/cost-and-risk.md) | Operating costs, model tiering, risk mitigations |
| [Implementation Roadmap](docs/architecture/roadmap.md) | 4 phases with quick-start guide |

## Quick Start (First 48 Hours)

```bash
# 1. Clone and setup
git clone https://github.com/yash-tech-ai/crm-ai-forge.git
cd crm-ai-forge
pnpm install

# 2. Start infrastructure
docker compose up -d   # PostgreSQL + Redis + MinIO

# 3. Initialize database
pnpm db:migrate && pnpm db:seed

# 4. Install & configure OpenClaw
npm install -g openclaw@latest
openclaw onboard --install-daemon
# Copy openclaw/ configs to ~/.openclaw/

# 5. Connect your first channel
openclaw channels login   # WhatsApp, Slack, or Telegram

# 6. Start the API server
pnpm dev

# 7. Test — send a message on your connected channel:
#    "Add a new lead: Priya Sharma, CTO at TechNova, priya@technova.in"
```

## License

MIT
