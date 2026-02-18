# Cost & Risk Analysis

## 1. Monthly Operating Costs

### Mid-Scale (5,000 contacts, 50K emails/month, 5-10 users)

| Item | Estimated Cost (USD) | Notes |
|------|---------------------|-------|
| **LLM API Costs** | $150 - $300/month | Model tiering (see breakdown below) |
| **Server** (4 vCPU, 16GB, 200GB SSD) | $50 - $80/month | DigitalOcean/Hetzner/AWS Lightsail |
| **Amazon SES** (50K emails) | $5/month | $0.10 per 1,000 emails |
| **SMS** (5K messages via Twilio) | $50/month | $0.0075 per SMS (US) |
| **Domain + SSL** | $5/month | $60/year |
| **Enrichment APIs** (Apollo/Clearbit) | $0 - $100/month | Free tiers available, paid for volume |
| **Monitoring** (Grafana Cloud) | $0/month | Free tier sufficient |
| **MinIO Storage** | Included in server | Self-hosted |
| **Redis** | Included in server | Self-hosted |
| **PostgreSQL** | Included in server | Self-hosted |
| **Total** | **$260 - $540/month** | |

### LLM Cost Breakdown (Model Tiering)

This is the most important cost optimization. Without tiering, LLM costs would be 3-5x higher.

| Agent | Model | Est. Calls/Day | Avg Tokens/Call | Daily Cost | Monthly Cost |
|-------|-------|---------------|-----------------|------------|-------------|
| **Orchestrator** | Opus 4.6 | 50 | 2,000 | $3.00 | $90 |
| **Lead Agent** | Sonnet 4.5 | 30 | 1,500 | $0.45 | $14 |
| **Campaign Agent** | Sonnet 4.5 | 15 | 2,500 | $0.38 | $11 |
| **Sales Agent** | Sonnet 4.5 | 40 | 2,000 | $0.80 | $24 |
| **Insight Agent** | Sonnet 4.5 | 20 | 3,000 | $0.60 | $18 |
| **Enrichment Agent** | Haiku 4.5 | 50 | 1,000 | $0.13 | $4 |
| **Compliance Agent** | Sonnet 4.5 | 10 | 1,500 | $0.15 | $5 |
| **Support Agent** | Sonnet 4.5 | 20 | 1,500 | $0.30 | $9 |
| **Sub-agents** | Haiku 4.5 | 30 | 800 | $0.06 | $2 |
| **Total** | | **265 calls/day** | | **$5.87/day** | **$177/month** |

**Comparison without tiering (all Opus):** ~$530/month -> **67% savings with tiering**

### Cost Per Action (Unit Economics)

| Action | Estimated Cost |
|--------|---------------|
| Score a lead | $0.02 |
| Create a campaign (full flow) | $0.15 |
| Call prep briefing | $0.08 |
| Enrich a contact | $0.01 (Haiku) + API cost |
| Daily digest generation | $0.05 |
| Campaign compliance check | $0.03 |
| Full status update (fan-out to all agents) | $0.25 |

### Scaling Costs

| Scale | Contacts | Emails/Month | Users | Est. Monthly Cost |
|-------|----------|-------------|-------|------------------|
| Starter | 1,000 | 10K | 2 | $150 - $250 |
| Growth | 5,000 | 50K | 10 | $260 - $540 |
| Scale | 25,000 | 250K | 25 | $600 - $1,200 |
| Enterprise | 100,000+ | 1M+ | 50+ | $2,000 - $5,000 |

## 2. Cost Optimization Strategies

### Strategy 1: Model Tiering (Already Built In)
- Opus ONLY for the Orchestrator (complex routing)
- Sonnet for all specialist agents (quality + cost balance)
- Haiku for background work (enrichment, batch scoring)
- Optional: Ollama for sentiment analysis, simple categorization (free)

### Strategy 2: Response Caching
```
Cache common queries in Redis (TTL: 5-15 min):
- "Show me hot leads" -> cache lead list
- "Pipeline summary" -> cache pipeline data
- "Campaign performance" -> cache metrics

Expected savings: 20-30% fewer LLM calls
```

### Strategy 3: Batch Processing
```
Instead of scoring each lead individually (50 calls):
  Batch 50 leads into 1 call with structured output
  Cost: $0.04 instead of $1.00 -> 96% savings on scoring
```

### Strategy 4: Session Compaction
```
OpenClaw compaction mode: "safeguard"
  - Automatically compresses long conversation histories
  - Reduces token usage for context-heavy sessions
  - Prevents context window bloat (and cost overruns)
```

### Strategy 5: Token Budgets
```
Per-agent daily limits:
  Orchestrator: 100K tokens/day
  Specialists: 50K tokens/day each
  Haiku agents: 30K tokens/day each

If budget exceeded: degrade gracefully (use cheaper model)
```

## 3. Pricing Model (If Productized)

| Tier | Price | Includes |
|------|-------|---------|
| **Starter** | $49/month | 1,000 contacts, 10K emails, 2 users, basic agents |
| **Growth** | $149/month | 10,000 contacts, 100K emails, 10 users, all agents |
| **Enterprise** | Custom | Unlimited, dedicated instance, custom agents, SLA |

### Unit Economics at Growth Tier

```
Revenue:       $149/month
COGS:
  LLM costs:  $40
  Server:     $15 (shared infrastructure, amortized)
  Email:      $1
  Overhead:   $10
  ────────
  Total COGS: $66

Gross Margin: $83 (56%)
```

## 4. Risk Assessment & Mitigations

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **LLM hallucination** (wrong data written to CRM) | HIGH | Medium | Structured outputs, confirmation prompts for destructive actions, Compliance Agent gate |
| **Prompt injection** via lead data | HIGH | Medium | Sanitize all user-provided data, API-only data access (no raw SQL), input validation |
| **Agent token cost overrun** | MEDIUM | Medium | Per-agent daily token budgets, Haiku for background, usage monitoring alerts |
| **OpenClaw breaking changes** | MEDIUM | Low | Pin to specific version, test updates in staging, monitor release notes |
| **Agent conflict** (two agents modify same record) | MEDIUM | Low | Optimistic locking on critical tables, API-level concurrency control |
| **Context window exhaustion** | LOW | Medium | Session compaction (safeguard mode), per-session token limits |
| **Sub-agent spawn storms** | LOW | Low | maxConcurrent limits per agent (6 main, 12 sub-agents) |

### Business Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **Email deliverability degradation** | HIGH | Medium | Warm up sending domain over 4 weeks, dedicated IP, monitor reputation via SES dashboard, Compliance Agent checks |
| **Data privacy violation** (GDPR/DPDPA) | HIGH | Low | Compliance Agent as mandatory gate, consent tracking in DB, data encryption, audit logs |
| **User adoption resistance** | MEDIUM | Medium | Gradual rollout (start with 1 channel), provide dashboard as familiar fallback, training sessions |
| **Vendor dependency on OpenClaw** | MEDIUM | Low | OpenClaw is MIT-licensed, self-hosted; fork available as last resort |
| **LLM provider outage** | MEDIUM | Low | Model failover chain: Claude -> GPT -> DeepSeek; cache recent responses |
| **Competitor data in notes/fields** | LOW | Medium | Agent guardrails: never share competitive intel across tenants |

### Compliance Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| **Sending to unsubscribed contacts** | HIGH | Low | Unsubscribe table checked on every send, Compliance Agent validates |
| **Missing consent records** | HIGH | Low | `consent_status` field required, campaigns blocked without OPTED_IN |
| **Cross-tenant data leak** | CRITICAL | Very Low | tenant_id on every table, Prisma middleware, API-level isolation, agent sandboxing |
| **PII in agent logs** | MEDIUM | Medium | Structured logging with PII redaction, agent action logs store IDs not raw data |

## 5. Monitoring & Alerting

### Critical Alerts (Immediate Action)

| Condition | Alert Channel | Action |
|-----------|--------------|--------|
| Bounce rate > 5% on any campaign | Slack + Email to admin | Auto-pause campaign, notify Compliance Agent |
| Agent error rate > 10% | Slack #ops | Check model availability, switch to fallback |
| Daily LLM cost > 2x budget | Email to admin | Review token usage, throttle non-critical agents |
| Database connection pool > 80% | Grafana alert | Scale connection pool, check for query issues |
| Campaign send failure > 1% | Slack #campaigns | Check SES status, review bounce list |

### Weekly Review Metrics

| Metric | Target | Dashboard |
|--------|--------|-----------|
| Agent accuracy (correct actions taken) | > 95% | Agent performance dashboard |
| Average agent response time | < 5 seconds | Grafana |
| LLM cost per tenant | Within budget | Cost tracking dashboard |
| Email deliverability | > 95% | SES dashboard |
| User adoption (messages to CRM/day) | Growing week-over-week | Usage analytics |
| Campaign ROI | Positive | Campaign analytics |
