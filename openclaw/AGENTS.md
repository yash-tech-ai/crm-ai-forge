# CRM AI Forge — Agent Registry

This file defines the multi-agent system for CRM AI Forge. Each agent is a specialist
with defined responsibilities, model tier, and tool access policies.

## Architecture

```
User Input → Orchestrator (Opus) → Route to Specialist (Sonnet/Haiku)
                                 → Fan-out to multiple agents if needed
                                 → Return consolidated response
```

## Agents

### 🎯 Orchestrator Agent
- **Model**: Opus (highest reasoning capability)
- **Role**: Intent classification, routing, multi-agent coordination
- **Workspace**: `./orchestrator/`
- **Trigger**: Every user message
- **Can delegate to**: All other agents

### 👤 Lead Agent
- **Model**: Sonnet
- **Role**: Contact management, lead scoring, lifecycle tracking
- **Workspace**: `./lead-agent/`
- **Skills**: `crm-lead-management`
- **Reacts to**: `contact.created`, `form.submitted`, `email.opened`

### 📧 Campaign Agent
- **Model**: Sonnet
- **Role**: Campaign creation, scheduling, A/B testing, drip sequences
- **Workspace**: `./campaign-agent/`
- **Skills**: `crm-campaign-engine`
- **Reacts to**: `campaign.created`, `campaign.compliance_approved`

### 💼 Sales Agent
- **Model**: Sonnet
- **Role**: Deal management, call prep, pipeline recommendations
- **Workspace**: `./sales-agent/`
- **Skills**: `crm-deal-pipeline`
- **Reacts to**: `deal.created`, `deal.stage_changed`, `task.overdue`

### 📊 Insight Agent
- **Model**: Sonnet
- **Role**: Analytics, forecasting, anomaly detection, reporting
- **Workspace**: `./insight-agent/`
- **Skills**: `crm-analytics-reports`
- **Reacts to**: `cron:daily_summary`, `cron:weekly_report`

### 🔍 Enrichment Agent
- **Model**: Haiku (cost-efficient for batch operations)
- **Role**: Contact/company enrichment from external sources
- **Workspace**: `./enrichment-agent/`
- **Reacts to**: `contact.created`, `company.created`, `cron:batch_enrich`

### 🛡️ Compliance Agent
- **Model**: Sonnet (read-only veto power)
- **Role**: GDPR/CAN-SPAM/DPDPA compliance, campaign approval gate
- **Workspace**: `./compliance-agent/`
- **Reacts to**: `campaign.compliance_requested`
- **Special**: Can REJECT campaigns but cannot modify data

### 🎧 Support Agent
- **Model**: Sonnet
- **Role**: Customer support, FAQ handling, ticket creation
- **Workspace**: `./support-agent/`
- **Skills**: `crm-customer-support`
- **Reacts to**: `support.ticket_created`, direct user messages

## Model Tiering

| Tier | Model | Use Case | Cost/1M tokens |
|------|-------|----------|-----------------|
| Premium | Opus | Orchestrator routing, complex decisions | ~$15 |
| Standard | Sonnet | Specialist agents, domain tasks | ~$3 |
| Economy | Haiku | Enrichment, batch processing, scoring | ~$0.25 |

**Estimated 60-75% cost savings** vs. running all agents on Opus.

## Confidence Thresholds

| Score | Action |
|-------|--------|
| ≥ 0.9 | Auto-execute |
| 0.7 – 0.9 | Execute + notify user |
| 0.5 – 0.7 | Present options to user |
| < 0.5 | Escalate to human |
