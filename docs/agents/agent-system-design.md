# AI Agent System Design

## 1. Overview

CRM AI Forge uses **8 specialized AI agents** that collaborate autonomously. The agents are the CRM — not assistants bolted onto a traditional app, but the primary intelligence that drives every operation.

```
                    +---------------------+
                    |     USER INPUT       |
                    |  (any channel)       |
                    +----------+----------+
                               |
                    +----------v----------+
                    |  ORCHESTRATOR        |
                    |  (Claude Opus 4.6)   |
                    |                      |
                    |  1. Classify intent  |
                    |  2. Plan execution   |
                    |  3. Spawn sub-agents |
                    |  4. Consolidate      |
                    +--+--+--+--+--+--+--+
                       |  |  |  |  |  |  |
          +------------+  |  |  |  |  |  +------------+
          v     v         v  |  v  |  v               v
       Lead  Campaign  Sales | Insight Enrichment  Compliance
       Agent  Agent   Agent  |  Agent   Agent       Agent
       [Sonnet] [Sonnet]     | [Sonnet] [Haiku]   [Sonnet]
                             v              (read-only,
                         Support             veto power)
                          Agent
                         [Sonnet]
```

## 2. Model Tiering Strategy

Not every task needs the most expensive model. We assign models based on task complexity:

| Tier | Model | Cost | Used By | Reasoning |
|------|-------|------|---------|-----------|
| **Orchestrator** | Claude Opus 4.6 | $$$ | Orchestrator only | Complex routing, multi-step planning, conflict resolution |
| **Specialist** | Claude Sonnet 4.5 | $$ | Lead, Campaign, Sales, Insight, Compliance, Support | Domain expertise with good quality/cost balance |
| **Background** | Claude Haiku 4.5 | $ | Enrichment, sub-agents for batch work | High-volume, simpler tasks (data lookup, categorization) |
| **Local** | Ollama (optional) | Free | Sentiment analysis, simple categorization | Zero cost for repetitive, low-complexity tasks |

**Estimated cost reduction vs using Opus for everything: 60-75%**

## 3. Agent Definitions

### 3.1 Orchestrator Agent (Router & Planner)

**Model:** Claude Opus 4.6 (best reasoning)
**Workspace:** `~/.openclaw/workspace-crm-orchestrator`
**Tools:** exec, read, write, edit, sessions_list, sessions_history, sessions_send, sessions_spawn, cron, browser, canvas

**Purpose:** The brain of the system. Receives all inbound requests, classifies intent, decomposes complex tasks, routes to specialist agents (as sub-agents), and consolidates responses.

**Intent Classification:**
```
LEAD_MANAGEMENT      -> Lead Agent
  create_contact, update_contact, search_contact, import_contacts
  score_lead, qualify_lead, assign_lead, show_leads

CAMPAIGN_OPERATIONS  -> Campaign Agent
  create_campaign, schedule_campaign, pause_campaign
  create_segment, create_template, ab_test, show_campaigns

SALES_OPERATIONS     -> Sales Agent
  call_prep, deal_update, pipeline_view, follow_up
  forecast, coaching, show_deals

ANALYTICS_QUERY      -> Insight Agent
  dashboard, report, metrics, trends, anomalies
  weekly_summary, comparison

DATA_ENRICHMENT      -> Enrichment Agent
  enrich_contact, find_linkedin, company_lookup
  verify_email, tech_stack_lookup

COMPLIANCE_CHECK     -> Compliance Agent
  audit_campaign, check_consent, gdpr_request
  suppression_list, compliance_report

SUPPORT_REQUEST      -> Support Agent
  customer_inquiry, ticket_create, auto_respond
  sentiment_check, escalation

MULTI_INTENT         -> Orchestrator decomposes, spawns multiple agents in parallel
  "Create a campaign for all leads scored above 80"
  -> Lead Agent (find leads) + Campaign Agent (create campaign) + Compliance Agent (verify)
```

### 3.2 Lead Agent

**Model:** Claude Sonnet 4.5
**Workspace:** `~/.openclaw/workspace-crm-leads`
**Tools:** exec, read, write, browser (deny: canvas, cron)

**Core Functions:**

| Function | Trigger | Actions |
|----------|---------|---------|
| `score_lead` | New contact, activity logged, periodic re-score | Calculate fit + intent + recency score, update via API |
| `qualify_lead` | Score threshold crossed | Transition lifecycle stage (MQL -> SQL), assign to rep |
| `assign_lead` | Lead qualified | Check team workload via API, assign to best-fit rep |
| `detect_duplicates` | New contact creation | Search by email/phone/company+name, suggest merge |
| `suggest_followup` | Daily digest, on-demand | Recommend next action based on score and activity |
| `enrich_trigger` | New contact missing data | Spawn Enrichment Agent as sub-agent |

**Lead Scoring Algorithm:**

```
Fit Score (0-50 points):
  +15  Title contains VP/Director/C-level/CTO/CXO
  +10  Company size > 100 employees
  +10  Target industry match
  +10  Budget indicated
  +5   Geographic match

Intent Score (0-50 points):
  +15  Visited pricing page
  +10  Downloaded content / attended webinar
  +10  Opened 3+ emails in last 30 days
  +10  Responded to outreach
  +5   Clicked campaign link

Decay Rule:
  -2 points per week of no engagement (minimum: 0)

Routing:
  80-100  HOT   -> Assign to senior rep, urgent call task, Slack notify
  60-79   WARM  -> Assign to available rep, start nurture sequence
  40-59   COOL  -> Add to nurture campaign, re-score in 2 weeks
  0-39    COLD  -> Add to long-term drip, re-score monthly
```

### 3.3 Campaign Agent

**Model:** Claude Sonnet 4.5
**Workspace:** `~/.openclaw/workspace-crm-campaigns`
**Tools:** exec, read, write, cron (deny: browser)

**Core Functions:**

| Function | Trigger | Actions |
|----------|---------|---------|
| `create_campaign` | User request (natural language) | Build audience, generate content, set schedule, request compliance approval |
| `build_audience` | Campaign creation | Create/refine segment via API |
| `generate_content` | Campaign creation | Draft subject lines (2-3 variants), body, CTAs using MJML |
| `optimize_send_time` | Campaign scheduling | Analyze historical open rates, recommend optimal time |
| `ab_test_setup` | Campaign creation (auto or requested) | Create variants, set test duration, define winner criteria |
| `ab_test_resolve` | Cron: every 30 min | Check running tests, select winner after threshold, send to remaining |
| `analyze_performance` | Post-send, on-demand | Generate campaign report with recommendations |
| `drip_processor` | Cron: every 15 min | Process active sequences, execute due steps |

**Campaign Creation Flow (AI-Driven):**
```
User: "Create a re-engagement campaign for customers who haven't
       purchased in 90 days, offer 15% discount"

Orchestrator -> Campaign Agent (sub-agent):

  Step 1 - Build Audience
    API: POST /api/v1/segments
    Result: 342 contacts match

  Step 2 - Generate Content (MJML)
    Subject A: "We miss you! Here's 15% off your next order"
    Subject B: "It's been a while -- come back for 15% savings"
    Subject C: "Your 15% discount is waiting, {{first_name}}"
    Body: Personalized with {{first_name}}, {{company}}
    CTA: "Shop Now" button

  Step 3 - Optimize Send Time
    API: GET /api/v1/analytics/campaigns?metric=open_rate_by_hour
    Result: Best opens historically on Tuesday 10:30 AM

  Step 4 - A/B Test Config
    15% audience per variant, winner after 4 hours by open rate

Orchestrator -> Compliance Agent (sub-agent, MANDATORY):

  Step 5 - Compliance Gate
    Check: All 342 contacts have valid consent? YES
    Check: Unsubscribe link present? YES
    Check: Physical address in footer? YES
    Check: Not on suppression list? 3 contacts flagged -> EXCLUDE
    Check: DPDPA consent for Indian contacts? YES
    APPROVED (339 contacts)

Orchestrator -> User:
  "Campaign 'Re-engagement 15%' approved & scheduled:
   - Audience: 339 contacts (3 excluded -- suppression list)
   - A/B testing 3 subject lines (winner at 2:30 PM)
   - Schedule: Tuesday 10:30 AM
   - Compliance: All checks passed
   Shall I confirm the schedule?"
```

### 3.4 Sales Agent

**Model:** Claude Sonnet 4.5
**Workspace:** `~/.openclaw/workspace-crm-sales`
**Tools:** exec, read, write, browser, canvas

**Purpose:** A world-class sales coach embedded in the CRM. Not just pipeline management — active coaching, call prep, and deal strategy.

**Core Functions:**

| Function | Trigger | Actions |
|----------|---------|---------|
| `call_prep` | User request, scheduled meeting approaching | Pull full history, generate briefing with talking points + objections |
| `deal_coaching` | On-demand, deal risk detected | Analyze deal, suggest strategy based on similar won deals |
| `follow_up_draft` | After call/meeting logged | Draft personalized follow-up email based on interaction notes |
| `pipeline_overview` | On-demand | Render pipeline on Canvas with probability-weighted revenue |
| `stale_deal_scan` | Cron: 9 AM and 3 PM weekdays | Flag stuck deals, suggest recovery actions, notify owners |
| `daily_priorities` | Cron: 8 AM weekdays | Generate prioritized task list for each rep |
| `forecast` | On-demand, weekly | Calculate weighted pipeline, compare to target |

**Call Prep Output Example:**
```
Call Prep: Priya Sharma, CTO @ TechNova
---
Background: 200 emp, Series B, AWS/React/Kafka stack
History: Attended AI webinar (Feb 5), opened 3 emails, demo scheduled
Deal: $250K -- Qualification stage

Key Talking Points:
1. Reference the webinar -- she asked about streaming analytics
2. Their stack (AWS/Kafka) aligns perfectly with our solution
3. Competitor risk: They're also evaluating Databricks

Questions to Ask:
- What's the timeline for the analytics project?
- Who else is involved in the decision?
- What's the budget range?

Potential Objections:
- "We're considering Databricks" -> Highlight on-prem flexibility + cost
- "Need to see ROI" -> Share similar customer case study (38% cost reduction)
```

### 3.5 Insight Agent (Analytics)

**Model:** Claude Sonnet 4.5
**Workspace:** `~/.openclaw/workspace-crm-insights`
**Tools:** exec, read, canvas (deny: write, browser, cron — read-only by design)

**Core Functions:**

| Function | Trigger | Actions |
|----------|---------|---------|
| `dashboard_summary` | On-demand, daily digest | Generate KPI overview with period comparison |
| `pipeline_analysis` | On-demand, weekly | Pipeline velocity, conversion rates, bottlenecks |
| `campaign_performance` | Post-campaign, on-demand | Open/click/bounce rates vs benchmarks |
| `trend_analysis` | Weekly cron | Identify patterns, seasonal effects |
| `anomaly_detection` | Continuous monitoring | Flag unusual spikes/drops, alert relevant agents |
| `agent_performance` | Weekly cron | Track AI agent effectiveness and accuracy |
| `revenue_forecast` | On-demand, monthly | Probability-weighted pipeline with confidence intervals |

**Proactive Alerts:**
```
Positive:
  "Campaign 'Insurance ROI' is performing 2.3x above average -- 48% open rate!"
  "Deal velocity improved 15% this month -- Discovery stage shortened by 2 days"

Negative:
  "Email bounce rate spiked to 8% (was 2%) -- Compliance Agent notified"
  "4 deals stuck in Proposal stage for 14+ days -- Sales Agent creating tasks"

Predictive:
  "Based on current pipeline, projected Q1 revenue: $450K (+/-10%)"
  "Webinar leads convert 2.3x faster -- recommend increasing webinar frequency"
  "At current lead volume, team will be at capacity by March"
```

### 3.6 Enrichment Agent

**Model:** Claude Haiku 4.5 (cost-effective for high-volume lookups)
**Workspace:** `~/.openclaw/workspace-crm-enrichment`
**Tools:** exec, read, write, browser (deny: canvas, cron)

**Purpose:** Finds and verifies contact and company data from external sources. Uses browser automation for LinkedIn and web scraping, plus API integrations.

**Core Functions:**

| Function | Trigger | Actions |
|----------|---------|---------|
| `enrich_contact` | New contact created, on-demand | LinkedIn lookup, Apollo/Clearbit API, update contact |
| `enrich_company` | New company created | Domain lookup, tech stack, employee count, funding |
| `verify_email` | Before campaign send | Check email validity, remove invalid |
| `batch_enrich` | Cron: 2 AM daily | Enrich up to 50 un-enriched contacts |
| `competitor_monitor` | Weekly cron (optional) | Browser-check competitor websites for changes |

**Enrichment Pipeline:**
```
New Contact: "Priya Sharma, priya@technova.in"
  |
  +-> Browser: LinkedIn lookup -> profile, title, connections
  +-> Apollo API: Company -> 200 employees, Series B, $5M revenue
  +-> Clearbit API: Tech stack -> AWS, React, Python, Kafka
  +-> Domain lookup: technova.in -> industry, location, social profiles
  |
  +-> API: PATCH /api/v1/contacts/{id}
      {
        title: "CTO",
        customFields: {
          linkedinUrl: "...",
          techStack: ["AWS", "React", "Python", "Kafka"]
        }
      }
  +-> API: PATCH /api/v1/companies/{id}
      {
        size: "MEDIUM",
        industry: "Technology",
        customFields: {
          funding: "Series B",
          revenue: "$5M",
          techStack: ["AWS", "React", "Kafka"]
        }
      }
  |
  +-> Lead Agent notified: re-score with enriched data
      Previous: 75 -> Updated: 85 (company size +10)
```

### 3.7 Compliance Agent

**Model:** Claude Sonnet 4.5
**Workspace:** `~/.openclaw/workspace-crm-compliance`
**Tools:** exec, read (deny: write, browser, canvas, cron — **read-only by design**)

**Purpose:** The mandatory compliance gate. No campaign sends without its approval. Has **veto power** — can block any campaign that violates compliance rules.

**Why read-only?** The Compliance Agent should never modify data — only inspect and approve/reject. This prevents it from being compromised to bypass its own rules.

**Core Functions:**

| Function | Trigger | Actions |
|----------|---------|---------|
| `campaign_gate` | Before any campaign send (MANDATORY) | Verify consent, unsubscribe links, suppression list, regulatory compliance |
| `consent_check` | Before adding contact to campaign | Verify opt-in status, GDPR/DPDPA consent records |
| `weekly_audit` | Cron: Monday 6 AM | Full compliance audit of all scheduled campaigns |
| `gdpr_request` | On-demand (data subject request) | Find all data for a contact, prepare deletion/export report |
| `suppression_check` | Before every send | Verify contact not on suppression list |

**Compliance Gate Checklist:**
```
For every campaign send:
  [ ] All contacts have valid consent (opt-in date recorded)
  [ ] Unsubscribe link present in template
  [ ] Physical address in footer (CAN-SPAM)
  [ ] Not on suppression/bounce list
  [ ] DPDPA consent for Indian contacts (if applicable)
  [ ] GDPR consent for EU contacts (if applicable)
  [ ] Email domain has valid SPF/DKIM/DMARC
  [ ] Bounce rate of segment < 5% (flag if higher)
  [ ] Send volume within daily limit

  -> APPROVED (with exclusions noted)
  -> REJECTED (with specific violations listed)
```

### 3.8 Support Agent

**Model:** Claude Sonnet 4.5
**Workspace:** `~/.openclaw/workspace-crm-support`
**Tools:** exec, read, write

**Core Functions:**

| Function | Trigger | Actions |
|----------|---------|---------|
| `handle_inquiry` | Inbound customer message | Lookup contact, review history, generate contextual response |
| `sentiment_analysis` | Every customer interaction | Detect tone, escalate if negative |
| `auto_respond` | Inbound message matching known patterns | Generate and send response, log activity |
| `route_ticket` | Complex or high-priority inquiry | Assign to appropriate team member |
| `escalate` | Low confidence, angry sentiment, billing issue | Hand off to human with full context |

**Escalation Rules:**
- Customer explicitly requests human -> escalate immediately
- Sentiment is angry/hostile -> escalate with empathy message
- Issue involves billing/refunds -> escalate to finance
- 2+ failed resolution attempts -> escalate to senior support
- Confidence below 0.5 -> escalate with explanation

## 4. Agent Collaboration Patterns

### Pattern 1: New Lead Processing Pipeline

```
USER: "New lead: Priya Sharma, CTO at TechNova, priya@technova.in,
       came from our AI webinar"

ORCHESTRATOR:
  |
  +-- 1. Spawn LEAD AGENT (sub-agent)
  |      +-- Check duplicate -> Not found
  |      +-- API: POST /api/v1/contacts (create)
  |      +-- Initial score: 75 (CTO=+15, tech=+10, webinar=+5, ...)
  |      +-- Classify as WARM
  |
  +-- 2. Spawn ENRICHMENT AGENT (sub-agent, PARALLEL)
  |      +-- Browser: LinkedIn lookup -> find profile
  |      +-- Apollo API: 200 employees, Series B, $5M revenue
  |      +-- Clearbit API: Tech stack -> AWS, React, Python, Kafka
  |      +-- API: PATCH /api/v1/contacts/{id} (update with enrichment)
  |      +-- API: PATCH /api/v1/companies/{id} (create/update org)
  |
  +-- 3. After enrichment -> LEAD AGENT recalculates
  |      +-- Updated score: 85 (200 emp = +10)
  |      +-- Reclassify as HOT
  |      +-- Assign to senior rep (Amit)
  |
  +-- 4. CAMPAIGN AGENT adds to "Hot Lead Fast-Track" sequence
  |      +-- Immediate personalized welcome email scheduled
  |
  +-- 5. SALES AGENT creates tasks
  |      +-- Call task for Amit (tomorrow 10 AM)
  |      +-- Draft call prep brief
  |
  +-- 6. ORCHESTRATOR announces back to user:
         "Lead created: Priya Sharma, CTO @ TechNova
          Score: 85 (HOT) | Assigned to: Amit
          Enriched: 200 emp, Series B, AWS/React stack
          Actions: Welcome email queued, call task created for tomorrow"
```

### Pattern 2: Campaign Launch with Compliance Gate

```
USER: "Launch email campaign 'Q1 Upsell' to all customers with
       deal value > $100K, send tomorrow 10 AM"

ORCHESTRATOR:
  |
  +-- 1. CAMPAIGN AGENT
  |      +-- API: POST /api/v1/segments (create segment)
  |      +-- Query segment: 47 contacts match
  |      +-- Generate email (3 subject line variants for A/B)
  |      +-- Set schedule: tomorrow 10 AM
  |      +-- Status: PENDING_COMPLIANCE
  |
  +-- 2. COMPLIANCE AGENT (automatic gate -- MANDATORY)
  |      +-- Check: All 47 contacts have valid consent? YES
  |      +-- Check: Unsubscribe link present? YES
  |      +-- Check: Physical address in footer? YES
  |      +-- Check: Not on suppression list? YES
  |      +-- Check: DPDPA consent for Indian contacts? YES
  |      +-- Flag: 3 contacts have bounced emails -> EXCLUDE
  |      +-- APPROVED (44 contacts)
  |
  +-- 3. CAMPAIGN AGENT updates
  |      +-- Exclude 3 bounced contacts
  |      +-- Schedule confirmed: 44 contacts, tomorrow 10 AM
  |      +-- A/B test: 15% per variant, winner at 2 PM
  |
  +-- 4. ORCHESTRATOR announces:
         "Campaign 'Q1 Upsell' approved & scheduled
          Audience: 44 contacts (3 excluded -- bounced emails)
          Schedule: Tomorrow 10 AM
          A/B Test: 3 subject lines, winner selected at 2 PM
          Compliance: All checks passed"
```

### Pattern 3: Proactive Deal Risk Alert (Cron-Triggered)

```
CRON (9 AM Monday) -> SALES AGENT activates

SALES AGENT:
  +-- API: GET /api/v1/deals?stale=true&staleDays=7
  |
  +-- Found 3 at-risk deals:
  |   +-- Deal #34: "Acme Data Hub" -- $450K -- Proposal -- 12 days stale
  |   +-- Deal #52: "Beta Analytics" -- $280K -- Negotiation -- 9 days stale
  |   +-- Deal #67: "Gamma AI Platform" -- $1.2M -- Qualification -- 8 days stale
  |
  +-- For each deal:
  |   +-- Analyze last interactions via API
  |   +-- Generate recommended next action
  |   +-- Draft re-engagement message
  |
  +-- Send to Slack #deal-alerts:
      "3 deals need attention this morning:

       [!] Acme Data Hub ($450K) -- Silent 12 days in Proposal
           Suggest: Send updated ROI analysis, offer pilot discount

       [!] Beta Analytics ($280K) -- 9 days in Negotiation
           Suggest: Call procurement contact, address pricing concern

       [!] Gamma AI Platform ($1.2M) -- 8 days in Qualification
           Suggest: Schedule technical demo with their VP Eng

       Reply with deal # to get full prep brief."
```

### Pattern 4: Fan-Out (Parallel Agent Execution)

```
USER: "Give me a full status update"

ORCHESTRATOR spawns ALL agents in parallel:
  |
  +-- LEAD AGENT:     "5 new leads today, 2 HOT"
  +-- SALES AGENT:    "Pipeline: $2.4M, 3 deals at risk"
  +-- CAMPAIGN AGENT: "2 campaigns active, 'Q1 Nurture' at 42% open rate"
  +-- INSIGHT AGENT:  "Revenue up 15% MoM, conversion rate improving"
  +-- SUPPORT AGENT:  "3 open tickets, avg response time: 12 min"
  |
  ORCHESTRATOR consolidates:
  "Here's your full status:

   Leads: 5 new today (2 HOT -- assigned to Amit and Sarah)
   Pipeline: $2.4M across 28 deals (3 at risk -- stale >7 days)
   Campaigns: 2 active ('Q1 Nurture': 42% open rate, 'Product Launch': sending)
   Revenue: Up 15% month-over-month, conversion rate: 23% (+3%)
   Support: 3 open tickets, avg response: 12 min

   Top priority: Deal #34 (Acme, $450K) has been silent 12 days.
   Want me to prep a recovery strategy?"
```

## 5. Agent State & Memory

```
+-----------------------------------------------+
| Agent Memory Architecture                      |
|                                                |
|  +------------+  TTL: 1 hour                   |
|  | Redis      |  Current conversation context  |
|  | (Hot)      |  In-flight operations           |
|  +-----+------+  Active session data            |
|        |                                        |
|  +-----v------+  TTL: 30 days                  |
|  | OpenClaw   |  Conversation history           |
|  | Sessions   |  Recent agent decisions         |
|  | (Warm)     |  User preferences per rep       |
|  +-----+------+  Compaction: safeguard mode     |
|        |                                        |
|  +-----v------+  Permanent                     |
|  | PostgreSQL |  All CRM data                   |
|  | + pgvector |  Agent action logs              |
|  | + OpenClaw |  Embeddings for semantic search  |
|  | Memory     |  Historical analytics           |
|  | (Cold)     |                                  |
|  +------------+                                 |
+-----------------------------------------------+
```

## 6. Confidence Scoring & Human Handoff

Every agent response includes a confidence score:

```typescript
interface AgentResponse {
  result: any;
  confidence: number;         // 0.0 - 1.0
  reasoning: string;          // Why this decision was made
  alternatives?: any[];       // Other options considered
  needsHumanReview: boolean;
}
```

| Confidence | Action |
|-----------|--------|
| >= 0.9 | Execute automatically |
| 0.7 - 0.9 | Execute with notification to user |
| 0.5 - 0.7 | Present options for user decision |
| < 0.5 | Escalate to human with context |

## 7. Error Handling & Fallback

```
Agent encounters error
    |
    +-- Retry (transient: API timeout, rate limit)
    |   Max 3 retries with exponential backoff
    |
    +-- Model fallback (primary model unavailable)
    |   Claude Sonnet -> GPT-4o -> DeepSeek (configurable chain)
    |
    +-- Partial result (some data unavailable)
    |   Return what's available, note gaps
    |
    +-- Escalate to Orchestrator (agent can't handle)
    |   Orchestrator tries alternative agent or approach
    |
    +-- Human handoff (all agents fail or low confidence)
        "I'm not confident in my answer. Connecting you
         with a team member. Here's the context: [...]"
```

## 8. Agent Security & Guardrails

### Per-Agent Tool Policies

| Agent | read | write | exec | browser | canvas | cron |
|-------|------|-------|------|---------|--------|------|
| Orchestrator | Y | Y | Y | Y | Y | Y |
| Lead Agent | Y | Y | Y | Y | N | N |
| Campaign Agent | Y | Y | Y | N | N | Y |
| Sales Agent | Y | Y | Y | Y | Y | N |
| Insight Agent | Y | N | Y | N | Y | N |
| Enrichment Agent | Y | Y | Y | Y | N | N |
| **Compliance Agent** | **Y** | **N** | **Y** | **N** | **N** | **N** |
| Support Agent | Y | Y | Y | N | N | N |

**Key principle:** Compliance Agent is read-only by design — it can never modify data, only inspect and approve/reject.

### Guardrails

1. **No unsupervised campaign sends** — Compliance Agent approval mandatory
2. **No bulk deletes** — Agents can never bulk-delete contacts or deals
3. **No raw SQL** — All data access through the authenticated API
4. **Rate limits** — Per-agent, per-tenant action limits
5. **Audit trail** — Every agent action logged in AgentActionLog
6. **Content moderation** — AI-generated campaign content reviewed before send
7. **PII protection** — Agents never expose raw PII in logs or cross-tenant
8. **Prompt injection defense** — User-provided data sanitized before agent processing
9. **Token budgets** — Per-agent daily token limits to prevent cost overruns
10. **Sandbox mode** — Non-main sessions run in Docker sandboxes
