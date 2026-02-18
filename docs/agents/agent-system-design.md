# AI Agent System Design

## 1. Overview

CRM AI Forge uses a **multi-agent architecture** where specialized AI agents collaborate to handle CRM and campaign operations. The agents are powered by OpenClaw's runtime and communicate through a Supervisor Agent that acts as the orchestrator.

```
                    ┌─────────────────────┐
                    │     USER INPUT       │
                    │  (any channel)       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  SUPERVISOR AGENT    │
                    │                     │
                    │  1. Parse intent    │
                    │  2. Plan execution  │
                    │  3. Route to agents │
                    │  4. Consolidate     │
                    └──┬───┬───┬───┬──┬──┘
                       │   │   │   │  │
            ┌──────────┘   │   │   │  └──────────┐
            ▼              ▼   │   ▼              ▼
    ┌──────────────┐ ┌────────┐│┌────────┐ ┌──────────────┐
    │  Lead Agent  │ │Campaign││ │Pipeline│ │Support Agent │
    │              │ │ Agent  │││ Agent  │ │              │
    └──────────────┘ └────────┘│└────────┘ └──────────────┘
                               ▼
                        ┌──────────────┐
                        │  Analytics   │
                        │  Agent       │
                        └──────────────┘
```

## 2. Agent Definitions

### 2.1 Supervisor Agent (Router & Planner)

**Purpose:** The Supervisor is the brain of the system. It receives all inbound requests (from OpenClaw channels or the dashboard), classifies intent, decomposes complex tasks, routes to specialist agents, and consolidates responses.

**Capabilities:**
- Natural language intent classification
- Multi-step task decomposition
- Agent selection and parallel execution
- Conflict resolution between agent recommendations
- Context preservation across conversation turns
- Fallback to human handoff when confidence is low

**Intent Classification Categories:**
```
CONTACT_MANAGEMENT   → Lead Agent
  - create_contact, update_contact, search_contact, import_contacts
  - score_lead, qualify_lead, assign_lead

DEAL_MANAGEMENT      → Pipeline Agent
  - create_deal, update_deal, move_stage, forecast
  - win_deal, lose_deal

CAMPAIGN_OPERATIONS  → Campaign Agent
  - create_campaign, schedule_campaign, pause_campaign
  - create_segment, create_template, ab_test

ANALYTICS_QUERY      → Analytics Agent
  - dashboard_summary, pipeline_report, campaign_performance
  - trend_analysis, forecast_revenue

SUPPORT_REQUEST      → Support Agent
  - customer_inquiry, ticket_create, auto_respond

MULTI_INTENT         → Supervisor decomposes and routes to multiple agents
  - "Create a campaign for all leads scored above 80"
    → Lead Agent (find leads) + Campaign Agent (create campaign)

GENERAL_QUERY        → Supervisor handles directly
  - help, status, settings
```

**Decision Matrix for Agent Routing:**
```
┌────────────────────┬────────┬──────────┬───────────┬──────────┬─────────┐
│ Signal             │ Lead   │ Campaign │ Analytics │ Pipeline │ Support │
├────────────────────┼────────┼──────────┼───────────┼──────────┼─────────┤
│ "lead" or "contact"│  ██    │          │           │          │         │
│ "campaign"/"email" │        │    ██    │           │          │         │
│ "report"/"metric"  │        │          │    ██     │          │         │
│ "deal"/"pipeline"  │        │          │           │    ██    │         │
│ "help"/"issue"     │        │          │           │          │   ██    │
│ "score"/"qualify"  │  ██    │          │           │          │         │
│ "segment"/"audience│        │    ██    │           │          │         │
│ "forecast"/"revenue│        │          │    ██     │    ██    │         │
│ "follow up"        │  ██    │          │           │    ██    │         │
│ "send"/"schedule"  │        │    ██    │           │          │         │
│ "dashboard"        │        │          │    ██     │          │         │
└────────────────────┴────────┴──────────┴───────────┴──────────┴─────────┘
```

### 2.2 Lead Agent

**Purpose:** Manages the entire lead lifecycle — from capture to qualification to conversion.

**Core Functions:**

| Function | Description | Trigger |
|----------|-------------|---------|
| `score_lead` | Calculate lead score based on behavioral and demographic data | New contact, contact updated, periodic re-score |
| `qualify_lead` | Determine if lead meets qualification criteria (MQL → SQL) | Score threshold reached |
| `assign_lead` | Match lead to best-fit sales rep based on criteria | Lead qualified, round-robin, territory |
| `enrich_contact` | Augment contact data from external sources | New contact created |
| `suggest_followup` | Recommend next best action for a contact | Daily digest, on-demand |
| `detect_duplicates` | Find and merge duplicate contacts | Import, new creation |

**Lead Scoring Model:**
```
Score Components (0-100 total):

Demographic Fit (0-40 points):
  ├── Job title matches ICP           +15
  ├── Company size in target range    +10
  ├── Industry match                  +10
  └── Geography match                  +5

Behavioral Signals (0-40 points):
  ├── Email opened (last 30 days)      +5 per (max +15)
  ├── Link clicked                     +8 per (max +16)
  ├── Form submitted                  +10
  ├── Meeting scheduled               +15
  └── Website visit (tracked)          +3 per (max +9)

Engagement Recency (0-20 points):
  ├── Last activity < 7 days          +20
  ├── Last activity 7-14 days         +15
  ├── Last activity 14-30 days        +10
  ├── Last activity 30-60 days         +5
  └── Last activity > 60 days          +0
```

**Agent Decision Tree:**
```
New Contact Created
    │
    ├── Score >= 80 ──► HOT LEAD
    │   ├── Assign to top-performing rep
    │   ├── Create urgent follow-up task
    │   └── Notify rep via preferred channel
    │
    ├── Score 50-79 ──► WARM LEAD
    │   ├── Assign to available rep (round-robin)
    │   ├── Add to nurture campaign
    │   └── Schedule follow-up in 3 days
    │
    ├── Score 20-49 ──► COLD LEAD
    │   ├── Add to awareness campaign
    │   └── Re-score in 14 days
    │
    └── Score < 20 ──► UNQUALIFIED
        ├── Add to general newsletter
        └── Re-score in 30 days
```

### 2.3 Campaign Agent

**Purpose:** Creates, manages, optimizes, and analyzes marketing campaigns across all channels.

**Core Functions:**

| Function | Description | Trigger |
|----------|-------------|---------|
| `create_campaign` | Build campaign from natural language description | User request |
| `build_audience` | Create/refine audience segment from criteria | Campaign creation, user request |
| `generate_content` | Draft email subject lines, body, CTAs | Campaign creation |
| `optimize_send_time` | Determine best send time based on historical data | Campaign scheduling |
| `ab_test_setup` | Configure A/B test variants | User request |
| `analyze_performance` | Generate campaign performance report | Post-send, on-demand |
| `suggest_improvements` | Recommend changes based on past performance | Post-campaign analysis |

**Campaign Creation Flow (AI-Driven):**
```
User: "Create a re-engagement campaign for customers who haven't
       purchased in 90 days, offer 15% discount"
                    │
                    ▼
Supervisor Agent: Parse intent → Route to Campaign Agent
                    │
                    ▼
Campaign Agent: Step 1 - Build Audience
  │  Query: contacts WHERE lifecycle_stage = 'CUSTOMER'
  │         AND last_contacted_at < (now - 90 days)
  │  Result: 342 contacts match
  │
  ├── Step 2 - Generate Content
  │  Subject A: "We miss you! Here's 15% off your next order"
  │  Subject B: "It's been a while — come back for 15% savings"
  │  Body: Personalized with {{first_name}}, {{last_purchase}}
  │  CTA: "Shop Now" button
  │
  ├── Step 3 - Optimize Send Time
  │  Analysis: Best open rates historically on Tuesday 10am
  │  Recommendation: Schedule for next Tuesday at 10:00 AM
  │
  ├── Step 4 - Configure A/B Test
  │  Variant A: Subject line A (50%)
  │  Variant B: Subject line B (50%)
  │  Winner criteria: Open rate after 4 hours
  │
  └── Step 5 - Present for Approval
     "I've prepared a re-engagement campaign:
      - Audience: 342 inactive customers (90+ days)
      - A/B testing two subject lines
      - Scheduled: Tuesday 10:00 AM
      - Offer: 15% discount
      Shall I schedule it?"
                    │
                    ▼
User: "Yes, go ahead"  →  Campaign Agent: Schedule campaign
```

### 2.4 Analytics Agent

**Purpose:** Transforms raw data into actionable insights. Generates reports, identifies trends, detects anomalies, and proactively suggests optimizations.

**Core Functions:**

| Function | Description | Trigger |
|----------|-------------|---------|
| `dashboard_summary` | Generate KPI overview | Daily, on-demand |
| `pipeline_report` | Pipeline velocity, conversion rates | On-demand, weekly |
| `campaign_performance` | Open rates, CTR, conversions | Post-campaign, on-demand |
| `trend_analysis` | Identify patterns over time | Weekly, on-demand |
| `anomaly_detection` | Flag unusual patterns | Continuous monitoring |
| `revenue_forecast` | Predict revenue based on pipeline | On-demand, monthly |
| `agent_performance` | Track AI agent effectiveness | Weekly |

**Proactive Alerts:**
```
Analytics Agent monitors continuously and alerts when:

📈 Positive:
  - Campaign open rate > 2x average → "Your latest campaign is performing 2x better!"
  - Deal velocity increased → "Deals are closing 15% faster this month"
  - Lead score threshold → "5 new hot leads scored above 80 today"

📉 Negative:
  - Bounce rate spike → "Email bounce rate jumped to 8% (was 2%)"
  - Pipeline stagnation → "12 deals haven't moved stages in 14+ days"
  - Campaign underperformance → "Re-engagement campaign CTR is 50% below average"

🔮 Predictive:
  - Revenue forecast → "Based on current pipeline, projected Q1 revenue: $450K (±10%)"
  - Churn risk → "3 customers showing disengagement signals"
  - Capacity alert → "At current lead volume, team will be at capacity by March"
```

### 2.5 Pipeline Agent

**Purpose:** Manages deals through the sales pipeline, automates stage transitions, and provides revenue forecasting.

**Core Functions:**

| Function | Description | Trigger |
|----------|-------------|---------|
| `create_deal` | Create deal from conversation or form | User request, lead qualified |
| `move_stage` | Advance or regress deal stage | User request, criteria met |
| `auto_transition` | Automatically move deals based on rules | Meeting completed, contract signed |
| `forecast_revenue` | Calculate weighted pipeline value | On-demand, periodic |
| `stale_deal_check` | Identify deals that haven't progressed | Daily check |
| `suggest_actions` | Recommend next steps for deals | On-demand, daily digest |
| `win_loss_analysis` | Analyze patterns in won/lost deals | Deal closed |

**Pipeline Automation Rules:**
```
Rule: Auto-advance on meeting completion
  Trigger: Activity(type=MEETING, deal_id=X) created
  Condition: Deal.stage = "Discovery"
  Action: Move deal to "Proposal" stage

Rule: Stale deal alert
  Trigger: Daily cron (9:00 AM)
  Condition: Deal.updated_at > 14 days ago AND stage != won/lost
  Action:
    1. Notify deal owner
    2. Create follow-up task
    3. If no action in 7 more days → flag for manager review

Rule: Auto-create deal from qualified lead
  Trigger: Contact.lifecycle_stage changed to SQL
  Action:
    1. Create deal with estimated value
    2. Assign to contact owner
    3. Set initial stage to "Qualification"
```

### 2.6 Support Agent

**Purpose:** Handles inbound customer inquiries, routes tickets, suggests responses, and maintains customer satisfaction.

**Core Functions:**

| Function | Description | Trigger |
|----------|-------------|---------|
| `auto_respond` | Generate contextual response to inquiry | Inbound message |
| `route_ticket` | Assign inquiry to appropriate team/person | New inquiry |
| `suggest_response` | Provide response options for human agent | Inquiry received |
| `sentiment_analysis` | Detect customer sentiment | Every interaction |
| `escalate` | Escalate to human when needed | Low confidence, negative sentiment |
| `update_contact` | Update contact record with interaction data | After resolution |

## 3. Inter-Agent Communication Protocol

### Message Format
```typescript
interface AgentMessage {
  id: string;                    // Unique message ID
  from: AgentType;               // Sending agent
  to: AgentType;                 // Target agent
  type: 'request' | 'response' | 'event' | 'broadcast';
  action: string;                // e.g., "find_leads", "create_campaign"
  payload: Record<string, any>;  // Action-specific data
  context: {
    tenantId: string;
    userId?: string;
    sessionId: string;
    conversationId: string;
    parentMessageId?: string;    // For chained requests
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timestamp: string;             // ISO 8601
}
```

### Communication Patterns

**1. Request-Response (Synchronous)**
```
Supervisor ──request──► Lead Agent
Supervisor ◄──response── Lead Agent
```

**2. Fan-Out (Parallel)**
```
Supervisor ──request──► Lead Agent
           ──request──► Campaign Agent
           ──request──► Analytics Agent

Supervisor ◄──response── Lead Agent
           ◄──response── Campaign Agent
           ◄──response── Analytics Agent

Supervisor: Consolidate all responses → Reply to user
```

**3. Chain (Sequential)**
```
Supervisor ──request──► Lead Agent: "Find inactive customers"
Supervisor ◄──response── Lead Agent: [342 contacts]
Supervisor ──request──► Campaign Agent: "Create campaign for these 342"
Supervisor ◄──response── Campaign Agent: "Campaign draft ready"
Supervisor → User: "Campaign ready for 342 contacts. Approve?"
```

**4. Event-Driven (Asynchronous)**
```
Deal Service emits: deal.stage_changed
  │
  ├──► Pipeline Agent: Update forecast
  ├──► Analytics Agent: Log metric
  └──► Lead Agent: Update contact lifecycle stage
```

### Agent Message Bus (Redis Pub/Sub)
```
Channels:
  agent:supervisor    # Supervisor inbox
  agent:lead          # Lead Agent inbox
  agent:campaign      # Campaign Agent inbox
  agent:analytics     # Analytics Agent inbox
  agent:pipeline      # Pipeline Agent inbox
  agent:support       # Support Agent inbox
  agent:broadcast     # All agents
  events:domain       # Domain events (deal.created, contact.updated, etc.)
```

## 4. Agent State Management

Each agent maintains state through:

1. **Short-term memory** (Redis): Current conversation context, in-flight operations
2. **Medium-term memory** (OpenClaw session): Conversation history, recent decisions
3. **Long-term memory** (PostgreSQL + OpenClaw workspace): Historical patterns, learned preferences

```
┌─────────────────────────────────────────────┐
│ Agent Memory Architecture                    │
│                                              │
│  ┌──────────┐  TTL: 1 hour                  │
│  │ Redis    │  Current conversation context  │
│  │ (Hot)    │  In-flight operations          │
│  └────┬─────┘  Active session data           │
│       │                                      │
│  ┌────▼─────┐  TTL: 30 days                 │
│  │ OpenClaw │  Conversation history           │
│  │ Sessions │  Recent agent decisions        │
│  │ (Warm)   │  User preferences              │
│  └────┬─────┘                                │
│       │                                      │
│  ┌────▼─────┐  Permanent                    │
│  │PostgreSQL│  All CRM data                  │
│  │+OpenClaw │  Agent action logs             │
│  │ Memory   │  Learned scoring models        │
│  │ (Cold)   │  Historical analytics          │
│  └──────────┘                                │
└─────────────────────────────────────────────┘
```

## 5. Error Handling & Fallback Strategy

```
Agent encounters error
    │
    ├── Retry (transient error: API timeout, rate limit)
    │   └── Max 3 retries with exponential backoff
    │
    ├── Fallback to alternative (model unavailable)
    │   └── Claude → GPT → DeepSeek (model failover)
    │
    ├── Partial result (some data unavailable)
    │   └── Return what's available + note gaps
    │
    ├── Escalate to Supervisor (agent can't handle)
    │   └── Supervisor tries alternative agent or approach
    │
    └── Human handoff (all agents fail or low confidence)
        └── "I'm not confident in my answer. Let me
             connect you with a team member."
```

## 6. Agent Confidence Scoring

Every agent response includes a confidence score:

```typescript
interface AgentResponse {
  result: any;
  confidence: number;        // 0.0 - 1.0
  reasoning: string;         // Explanation of the decision
  alternatives?: any[];      // Alternative suggestions
  needsHumanReview: boolean; // Flag for uncertain decisions
}
```

**Confidence thresholds:**
- `>= 0.9` — Execute automatically
- `0.7 - 0.9` — Execute with notification to user
- `0.5 - 0.7` — Present options to user for decision
- `< 0.5` — Escalate to human

## 7. Security & Guardrails

### Agent Permissions (Per Tenant)
```typescript
interface AgentPermissions {
  canCreateContacts: boolean;
  canDeleteContacts: boolean;     // Default: false
  canSendCampaigns: boolean;
  canModifyDeals: boolean;
  canAccessFinancials: boolean;
  maxCampaignSize: number;        // Max recipients per campaign
  requireApprovalForSend: boolean;// Campaign send requires human OK
  maxDailyEmails: number;         // Rate limit
  allowedChannels: string[];      // Which messaging channels
}
```

### Guardrails
1. **No unsupervised campaign sends** — All campaigns require human approval (configurable)
2. **No bulk deletes** — Agents can never bulk-delete contacts or deals
3. **Rate limits** — Per-agent, per-tenant action limits
4. **Audit trail** — Every agent action logged in `AgentActionLog`
5. **Content moderation** — AI-generated campaign content reviewed before send
6. **PII protection** — Agents never expose raw PII in logs or to unauthorized channels
