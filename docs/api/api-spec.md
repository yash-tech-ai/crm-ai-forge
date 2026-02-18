# API Specification

## Base URL
```
http://localhost:3001/api/v1
```

## Authentication

All API requests (except `/auth/login` and `/auth/register`) require a Bearer token.

```
Authorization: Bearer <jwt_token>
X-Tenant-ID: <tenant_id>
```

### Token Structure (JWT Payload)
```json
{
  "sub": "user_cuid",
  "tenantId": "tenant_cuid",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1708300000,
  "exp": 1708300900
}
```

### Token Lifecycle
| Token | TTL | Storage |
|-------|-----|---------|
| Access Token | 15 minutes | Memory / httpOnly cookie |
| Refresh Token | 7 days | httpOnly cookie |

---

## Common Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Must be a valid email address" }
    ]
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/params validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Duplicate resource (e.g., email exists) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoints

### Auth

#### POST /auth/register
Create a new tenant and admin user.

**Request:**
```json
{
  "tenantName": "Acme Corp",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@acme.com",
  "password": "SecurePass123!"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "clx1abc...",
      "email": "john@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin"
    },
    "tenant": {
      "id": "clx1def...",
      "name": "Acme Corp",
      "slug": "acme-corp"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

#### POST /auth/login
**Request:**
```json
{
  "email": "john@acme.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "...", "firstName": "...", "lastName": "...", "role": "admin" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

#### POST /auth/refresh
**Request:** (refresh token sent via httpOnly cookie)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG..."
  }
}
```

#### POST /auth/logout
**Response:** `200 OK` (clears refresh token cookie)

---

### Contacts

#### GET /contacts
List contacts with filtering, sorting, and pagination.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `search` | string | — | Search in name, email, phone |
| `status` | enum | — | Filter by status |
| `lifecycleStage` | enum | — | Filter by lifecycle stage |
| `source` | enum | — | Filter by source |
| `ownerId` | string | — | Filter by owner |
| `companyId` | string | — | Filter by company |
| `minLeadScore` | int | — | Minimum lead score |
| `maxLeadScore` | int | — | Maximum lead score |
| `tags` | string | — | Comma-separated tag filter |
| `sortBy` | string | createdAt | Sort field |
| `sortOrder` | asc/desc | desc | Sort direction |
| `createdAfter` | ISO date | — | Created after date |
| `createdBefore` | ISO date | — | Created before date |

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx1ghi...",
      "firstName": "Sarah",
      "lastName": "Connor",
      "email": "sarah@skynet.com",
      "phone": "+1-555-0123",
      "title": "VP of Engineering",
      "source": "WEB_FORM",
      "status": "ACTIVE",
      "leadScore": 85,
      "lifecycleStage": "SQL",
      "tags": ["enterprise", "tech"],
      "company": {
        "id": "clx1jkl...",
        "name": "Skynet Corp"
      },
      "owner": {
        "id": "clx1mno...",
        "firstName": "John",
        "lastName": "Doe"
      },
      "lastContactedAt": "2026-02-15T10:30:00Z",
      "createdAt": "2026-01-15T08:00:00Z",
      "updatedAt": "2026-02-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

#### POST /contacts
**Request:**
```json
{
  "firstName": "Sarah",
  "lastName": "Connor",
  "email": "sarah@skynet.com",
  "phone": "+1-555-0123",
  "title": "VP of Engineering",
  "source": "WEB_FORM",
  "companyId": "clx1jkl...",
  "ownerId": "clx1mno...",
  "tags": ["enterprise", "tech"],
  "customFields": {
    "linkedinUrl": "https://linkedin.com/in/sarah-connor",
    "preferredContactMethod": "email"
  }
}
```

**Validation Rules:**
- `firstName`: required, 1-100 chars
- `lastName`: required, 1-100 chars
- `email`: required, valid email, unique per tenant
- `phone`: optional, valid phone format
- `source`: optional, must be valid enum

**Response:** `201 Created`

#### GET /contacts/:id
**Response:** `200 OK` — Full contact object with company and owner populated.

#### PATCH /contacts/:id
**Request:** (partial update — only include fields to change)
```json
{
  "leadScore": 92,
  "lifecycleStage": "SQL",
  "tags": ["enterprise", "tech", "hot-lead"]
}
```

**Response:** `200 OK`

#### DELETE /contacts/:id
Soft delete (sets `deletedAt` timestamp).

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { "message": "Contact archived successfully" }
}
```

#### POST /contacts/:id/notes
**Request:**
```json
{
  "body": "Had a great discovery call. Interested in enterprise plan. Follow up next week with proposal."
}
```

**Response:** `201 Created`

#### GET /contacts/:id/activities
**Query Parameters:** `page`, `limit`, `type` (activity type filter)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx1pqr...",
      "type": "EMAIL_SENT",
      "description": "Sent proposal follow-up email",
      "metadata": { "subject": "Your Custom Proposal", "templateId": "..." },
      "user": { "id": "...", "firstName": "John", "lastName": "Doe" },
      "createdAt": "2026-02-15T10:30:00Z"
    },
    {
      "id": "clx1stu...",
      "type": "AGENT_ACTION",
      "description": "Lead Agent scored contact at 85 (was 72)",
      "metadata": { "agentType": "LEAD", "previousScore": 72, "newScore": 85 },
      "createdAt": "2026-02-14T06:00:00Z"
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 24, "totalPages": 2 }
}
```

#### POST /contacts/import
Bulk import contacts from CSV.

**Request:** `multipart/form-data`
- `file`: CSV file (max 10MB)
- `mappings`: JSON string mapping CSV columns to contact fields
- `duplicateStrategy`: `skip` | `update` | `create_new`

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "processing",
    "totalRows": 500,
    "message": "Import started. Check status at GET /contacts/import/job_abc123"
  }
}
```

---

### Companies

#### GET /companies
**Query Parameters:** `page`, `limit`, `search`, `industry`, `size`, `sortBy`, `sortOrder`

#### POST /companies
```json
{
  "name": "Skynet Corp",
  "domain": "skynet.com",
  "industry": "Technology",
  "size": "ENTERPRISE",
  "phone": "+1-555-9999",
  "website": "https://skynet.com",
  "address": {
    "street": "123 AI Boulevard",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94105",
    "country": "US"
  }
}
```

#### GET /companies/:id
#### PATCH /companies/:id
#### DELETE /companies/:id

---

### Deals

#### GET /deals
**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `page`, `limit` | int | Pagination |
| `pipelineId` | string | Filter by pipeline |
| `stageId` | string | Filter by stage |
| `ownerId` | string | Filter by deal owner |
| `contactId` | string | Filter by contact |
| `minValue` | decimal | Minimum deal value |
| `maxValue` | decimal | Maximum deal value |
| `stale` | boolean | Only stale deals (no update in 14d) |
| `staleDays` | int | Custom stale threshold |
| `sortBy` | string | Sort field |
| `sortOrder` | asc/desc | Sort direction |

#### POST /deals
```json
{
  "title": "Skynet Corp - Enterprise Plan",
  "pipelineId": "clx1...",
  "stageId": "clx1...",
  "contactId": "clx1...",
  "companyId": "clx1...",
  "value": 50000,
  "currency": "USD",
  "expectedCloseDate": "2026-03-30",
  "probability": 60,
  "tags": ["enterprise", "annual"]
}
```

#### GET /deals/:id
#### PATCH /deals/:id

#### PATCH /deals/:id/stage
Move a deal to a different pipeline stage.

**Request:**
```json
{
  "stageId": "clx1_negotiation_stage",
  "reason": "Proposal accepted, moving to negotiation"
}
```

**Side Effects:**
- Creates `DEAL_STAGE_CHANGED` activity
- Updates `deal.probability` to match stage default
- Triggers Pipeline Agent for forecast update
- If moved to won/lost stage, sets `actualCloseDate`

#### DELETE /deals/:id

---

### Pipelines

#### GET /pipelines
Returns all pipelines for the tenant with their stages.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx1...",
      "name": "Sales Pipeline",
      "isDefault": true,
      "stages": [
        { "id": "s1", "name": "Qualification", "position": 0, "probability": 10, "isWon": false, "isLost": false },
        { "id": "s2", "name": "Discovery", "position": 1, "probability": 30, "isWon": false, "isLost": false },
        { "id": "s3", "name": "Proposal", "position": 2, "probability": 60, "isWon": false, "isLost": false },
        { "id": "s4", "name": "Negotiation", "position": 3, "probability": 80, "isWon": false, "isLost": false },
        { "id": "s5", "name": "Closed Won", "position": 4, "probability": 100, "isWon": true, "isLost": false },
        { "id": "s6", "name": "Closed Lost", "position": 5, "probability": 0, "isWon": false, "isLost": true }
      ],
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /pipelines
#### GET /pipelines/:id/stages

---

### Campaigns

#### GET /campaigns
**Query Parameters:** `page`, `limit`, `status`, `type`, `createdById`, `sortBy`, `sortOrder`

#### POST /campaigns
```json
{
  "name": "February Re-engagement",
  "type": "EMAIL",
  "templateId": "clx1...",
  "segmentId": "clx1...",
  "subjectLine": "We miss you! Here's 15% off",
  "previewText": "Come back and save on your next order",
  "fromName": "Acme Team",
  "fromEmail": "marketing@acme.com",
  "replyTo": "support@acme.com",
  "settings": {
    "trackOpens": true,
    "trackClicks": true,
    "includeUnsubscribe": true
  }
}
```

#### GET /campaigns/:id
#### PATCH /campaigns/:id

#### POST /campaigns/:id/schedule
```json
{
  "scheduledAt": "2026-02-25T10:00:00Z"
}
```

**Validation:**
- Campaign must be in `DRAFT` status
- `scheduledAt` must be at least 15 minutes in the future
- Template and segment must be set
- Subject line and from email must be set

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx1...",
    "status": "SCHEDULED",
    "scheduledAt": "2026-02-25T10:00:00Z",
    "estimatedRecipients": 342
  }
}
```

#### POST /campaigns/:id/send
Send campaign immediately (same validations as schedule).

#### POST /campaigns/:id/pause
Pause a sending campaign. Only works if status is `SENDING`.

#### GET /campaigns/:id/analytics
```json
{
  "success": true,
  "data": {
    "campaignId": "clx1...",
    "name": "February Re-engagement",
    "status": "SENT",
    "sentAt": "2026-02-25T10:00:00Z",
    "completedAt": "2026-02-25T10:45:00Z",
    "metrics": {
      "totalRecipients": 342,
      "sent": 340,
      "delivered": 332,
      "bounced": 8,
      "opened": 112,
      "clicked": 34,
      "unsubscribed": 5,
      "openRate": 33.7,
      "clickRate": 10.2,
      "bounceRate": 2.4,
      "unsubscribeRate": 1.5
    },
    "topLinks": [
      { "url": "https://acme.com/shop", "clicks": 22 },
      { "url": "https://acme.com/deals", "clicks": 12 }
    ],
    "hourlyOpens": [
      { "hour": "10:00", "count": 45 },
      { "hour": "11:00", "count": 32 },
      { "hour": "12:00", "count": 18 }
    ]
  }
}
```

#### POST /campaigns/:id/test
Send a test email to verify template rendering.

**Request:**
```json
{
  "testEmails": ["marketing-team@acme.com"],
  "sampleContactId": "clx1..."
}
```

---

### Segments

#### GET /segments
#### POST /segments
```json
{
  "name": "Inactive Customers (90+ days)",
  "description": "Customers who haven't been contacted in 90+ days",
  "type": "DYNAMIC",
  "filterCriteria": {
    "logic": "AND",
    "conditions": [
      {
        "field": "lifecycleStage",
        "operator": "eq",
        "value": "CUSTOMER"
      },
      {
        "field": "lastContactedAt",
        "operator": "lt",
        "value": "90_days_ago"
      },
      {
        "field": "status",
        "operator": "eq",
        "value": "ACTIVE"
      }
    ]
  }
}
```

**Supported Filter Operators:**
| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `status eq ACTIVE` |
| `neq` | Not equals | `status neq ARCHIVED` |
| `gt` | Greater than | `leadScore gt 50` |
| `gte` | Greater or equal | `leadScore gte 80` |
| `lt` | Less than | `lastContactedAt lt 90_days_ago` |
| `lte` | Less or equal | `leadScore lte 20` |
| `in` | In array | `lifecycleStage in [MQL, SQL]` |
| `nin` | Not in array | `source nin [OTHER]` |
| `contains` | String contains | `tags contains enterprise` |
| `exists` | Field exists | `phone exists true` |

#### GET /segments/:id
#### PATCH /segments/:id
#### GET /segments/:id/contacts
Preview contacts matching the segment. Returns paginated contact list.

---

### Templates

#### GET /templates
**Query Parameters:** `page`, `limit`, `category`, `search`

#### POST /templates
```json
{
  "name": "Re-engagement Template",
  "subject": "We miss you, {{first_name}}!",
  "htmlBody": "<html><body><h1>Welcome back, {{first_name}}!</h1><p>It's been a while since we last connected. Here's a special offer just for you...</p><a href='{{cta_url}}'>Shop Now</a><p><a href='{{unsubscribe_url}}'>Unsubscribe</a></p></body></html>",
  "textBody": "Welcome back, {{first_name}}! It's been a while...",
  "variables": ["first_name", "cta_url", "unsubscribe_url"],
  "category": "re-engagement"
}
```

#### GET /templates/:id
#### PATCH /templates/:id
#### POST /templates/:id/render
Render template with sample data for preview.

**Request:**
```json
{
  "sampleData": {
    "first_name": "Sarah",
    "cta_url": "https://acme.com/shop",
    "unsubscribe_url": "https://acme.com/unsubscribe/abc"
  }
}
```

---

### Tasks

#### GET /tasks
**Query Parameters:** `page`, `limit`, `assignedToId`, `status`, `priority`, `type`, `dueDate`, `overdue` (boolean)

#### POST /tasks
```json
{
  "title": "Follow up with Sarah on proposal",
  "description": "She requested pricing for enterprise plan",
  "type": "FOLLOW_UP",
  "priority": "HIGH",
  "assignedToId": "clx1...",
  "contactId": "clx1...",
  "dealId": "clx1...",
  "dueDate": "2026-02-20T17:00:00Z"
}
```

#### PATCH /tasks/:id
#### PATCH /tasks/:id/complete
**Response:** `200 OK` — Sets `status: COMPLETED` and `completedAt: now()`

---

### Analytics

#### GET /analytics/dashboard
**Query Parameters:** `period` (7d, 30d, 90d, 12m), `compareWith` (previous_period)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "kpis": {
      "newContacts": { "value": 142, "change": 23.4, "direction": "up" },
      "activeDeals": { "value": 28, "totalValue": 1200000 },
      "dealsWon": { "value": 5, "totalValue": 320000, "change": 15.2, "direction": "up" },
      "dealsLost": { "value": 3, "totalValue": 180000 },
      "winRate": { "value": 62.5, "change": 7.5, "direction": "up" },
      "campaignsSent": { "value": 4 },
      "avgOpenRate": { "value": 28.3, "industryAvg": 21.0 },
      "avgCtr": { "value": 4.1, "industryAvg": 2.6 },
      "tasksCompleted": { "value": 89, "total": 102, "completionRate": 87.3 },
      "agentActions": { "value": 234, "automated": 198, "humanAssisted": 36 }
    },
    "recentActivity": [ ... ],
    "topPerformingReps": [ ... ],
    "aiInsights": [
      "Deal velocity improved 15% — Discovery stage shortened by 2 days",
      "3 deals at risk: no activity in 14+ days",
      "Re-engagement campaign underperforming — consider refreshing content"
    ]
  }
}
```

#### GET /analytics/pipeline
Pipeline-specific metrics: stage conversion rates, velocity, forecast.

#### GET /analytics/campaigns
Campaign performance: best/worst campaigns, trend over time.

#### GET /analytics/agents
AI agent performance: actions taken, success rate, response times.

---

### Agent API (OpenClaw Integration)

#### POST /agent/execute
Called by OpenClaw tools to execute CRM actions.

**Request:**
```json
{
  "agentType": "LEAD",
  "action": "score_lead",
  "payload": {
    "contactId": "clx1..."
  },
  "context": {
    "tenantId": "clx1...",
    "sessionId": "session_abc",
    "triggeredBy": "user"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "result": {
      "contactId": "clx1...",
      "previousScore": 45,
      "newScore": 82,
      "factors": {
        "demographic": 30,
        "behavioral": 35,
        "recency": 17
      },
      "recommendation": "Qualified as SQL. Assign to sales rep."
    },
    "confidence": 0.91,
    "actionLogId": "clx1..."
  }
}
```

#### GET /agent/status
Health check for all agents.

#### POST /agent/webhook
Inbound webhook from OpenClaw Gateway for event notifications.

---

### Settings

#### GET /settings/tenant
#### PATCH /settings/tenant
```json
{
  "companyName": "Acme Corp",
  "timezone": "America/New_York",
  "dateFormat": "MM/DD/YYYY",
  "currency": "USD",
  "emailSettings": {
    "smtpHost": "smtp.sendgrid.net",
    "smtpPort": 587,
    "smtpUser": "apikey",
    "fromEmail": "noreply@acme.com",
    "fromName": "Acme Team",
    "dailyEmailLimit": 10000
  },
  "agentSettings": {
    "autoScoreLeads": true,
    "autoAssignLeads": true,
    "requireCampaignApproval": true,
    "staleDealThresholdDays": 14,
    "maxDailyAgentActions": 500
  }
}
```

#### GET /settings/integrations
#### PATCH /settings/integrations/:id

---

## WebSocket Events

Connect to `ws://localhost:3001/ws` with auth token.

### Client → Server
```json
{ "type": "subscribe", "channels": ["contacts", "deals", "campaigns", "agents"] }
{ "type": "unsubscribe", "channels": ["agents"] }
```

### Server → Client
```json
{ "type": "contact.created", "data": { "id": "...", "firstName": "...", ... } }
{ "type": "deal.stage_changed", "data": { "dealId": "...", "fromStage": "...", "toStage": "..." } }
{ "type": "campaign.status_changed", "data": { "campaignId": "...", "status": "SENDING" } }
{ "type": "agent.action", "data": { "agentType": "LEAD", "action": "score_lead", "result": { ... } } }
{ "type": "notification", "data": { "title": "Hot Lead!", "message": "Sarah Connor scored 92" } }
```

---

## Rate Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Authentication | 10 requests | 1 minute |
| Read (GET) | 200 requests | 1 minute |
| Write (POST/PATCH/DELETE) | 60 requests | 1 minute |
| Import/Bulk | 5 requests | 1 minute |
| Agent Execute | 30 requests | 1 minute |
| Campaign Send | 3 requests | 1 minute |

Rate limit headers included in every response:
```
X-RateLimit-Limit: 200
X-RateLimit-Remaining: 195
X-RateLimit-Reset: 1708300060
```
