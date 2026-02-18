# CRM AI Forge

**An AI-native CRM & Campaign Management Platform powered by OpenClaw Agents**

CRM AI Forge reimagines customer relationship management and marketing campaigns through intelligent AI agents. Instead of navigating complex menus and forms, users interact with autonomous agents that understand intent, execute tasks, and coordinate across CRM and campaign workflows — via conversational interfaces (WhatsApp, Slack, Telegram) or a modern web dashboard.

## What Makes This Different

| Traditional CRM | CRM AI Forge |
|-----------------|-------------|
| Click through 15 screens to launch a campaign | Say "Launch a re-engagement campaign for inactive customers" |
| Manually score and assign leads | AI agents score, qualify, and route leads automatically |
| Check dashboards for insights | Agents proactively alert you to trends and anomalies |
| Switch between CRM, email, analytics tools | Unified platform with agents coordinating across all modules |
| One-size-fits-all workflows | Agents learn your patterns and adapt |

## Core Capabilities

### CRM Module
- **Contact & Company Management** — Full contact lifecycle with activity tracking
- **Deal Pipeline** — Visual Kanban pipeline with AI-powered forecasting
- **Lead Scoring** — Automated lead qualification via behavioral signals
- **Task Management** — AI-assigned follow-ups and reminders
- **Activity Timeline** — Every interaction logged across all channels

### Campaign Module
- **Email Campaigns** — Template builder, A/B testing, send scheduling
- **Audience Segmentation** — Dynamic segments based on CRM data
- **Multi-Channel Campaigns** — Email, WhatsApp, SMS, Telegram
- **Campaign Analytics** — Open rates, click tracking, conversion attribution
- **Automation Workflows** — Trigger-based sequences (drip campaigns, nurture flows)

### AI Agent System
- **Supervisor Agent** — Routes requests, plans multi-step workflows
- **Lead Agent** — Scores, qualifies, and distributes leads
- **Campaign Agent** — Creates, optimizes, and manages campaigns
- **Analytics Agent** — Generates reports, identifies trends, suggests actions
- **Pipeline Agent** — Manages deals, forecasts revenue
- **Support Agent** — Handles inquiries, auto-responds, escalates

### Multi-Channel Access (via OpenClaw)
- WhatsApp, Telegram, Slack, Discord, SMS
- Web Dashboard (Next.js)
- WebChat widget for websites
- API for custom integrations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Agent Gateway | [OpenClaw](https://github.com/openclaw/openclaw) |
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend API | Node.js, Fastify, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Cache & Queues | Redis, BullMQ |
| Email Delivery | Nodemailer, AWS SES / SMTP |
| Authentication | NextAuth.js, JWT |
| File Storage | MinIO (S3-compatible) |
| Search | PostgreSQL full-text search + pg_trgm |

## Architecture Overview

```
Users ──► OpenClaw (WhatsApp/Slack/Telegram) ──► Supervisor Agent
Users ──► Next.js Dashboard ──────────────────► API Gateway
                                                     │
                              ┌───────────────────────┤
                              ▼                       ▼
                     AI Agent Orchestrator    Service Layer
                     (Lead, Campaign,         (Contact, Deal,
                      Analytics, Pipeline,     Campaign, Email,
                      Support Agents)          Task Services)
                              │                       │
                              └───────────┬───────────┘
                                          ▼
                                    Data Layer
                              (PostgreSQL, Redis, MinIO)
```

## Documentation

- [System Architecture](docs/architecture/system-architecture.md)
- [Database Schema & ERD](docs/database/schema.md)
- [API Specification](docs/api/api-spec.md)
- [AI Agent System Design](docs/agents/agent-system-design.md)
- [OpenClaw Integration Guide](docs/agents/openclaw-integration.md)
- [Project Structure](docs/architecture/project-structure.md)
- [Implementation Roadmap](docs/architecture/roadmap.md)

## Quick Start

> **Note:** This project is in the architecture and design phase. Implementation instructions will be added as development progresses.

```bash
# Clone the repository
git clone https://github.com/yash-tech-ai/crm-ai-forge.git
cd crm-ai-forge

# Installation instructions coming in Phase 1
```

## License

MIT
