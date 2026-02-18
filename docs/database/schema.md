# Database Schema & ERD

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Tenant     │       │    User      │       │    Role      │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)      │──┐    │ id (PK)      │       │ id (PK)      │
│ name         │  │    │ tenant_id(FK)│◄──┐   │ name         │
│ slug         │  │    │ email        │   │   │ permissions  │
│ plan         │  │    │ password_hash│   │   └──────┬───────┘
│ settings     │  │    │ name         │   │          │
│ created_at   │  │    │ role_id (FK) │───┘──────────┘
│ updated_at   │  │    │ avatar_url   │
└──────────────┘  │    │ is_active    │
                  │    │ last_login_at│
                  │    │ created_at   │
                  │    └──────┬───────┘
                  │           │
                  │    ┌──────┼──────────────────────────────┐
                  │    │      │                               │
                  │    │      │ (assigned_to)                 │
                  ▼    ▼      ▼                               │
┌──────────────────────────────────────┐                     │
│              Contact                  │                     │
├──────────────────────────────────────┤                     │
│ id (PK)                              │                     │
│ tenant_id (FK) ──────────────────────│─► Tenant            │
│ company_id (FK, nullable) ───────────│─► Company           │
│ owner_id (FK, nullable) ─────────────│─► User              │
│ first_name                           │                     │
│ last_name                            │                     │
│ email (unique per tenant)            │                     │
│ phone                                │                     │
│ title                                │                     │
│ source (enum)                        │                     │
│ status (enum: active/inactive/...)   │                     │
│ lead_score (0-100)                   │                     │
│ lifecycle_stage (enum)               │                     │
│ tags (text[])                        │                     │
│ custom_fields (jsonb)                │                     │
│ last_contacted_at                    │                     │
│ created_at                           │                     │
│ updated_at                           │                     │
└───────────┬──────────────────────────┘                     │
            │                                                 │
            │ 1:N                                             │
            ▼                                                 │
┌──────────────────────┐    ┌──────────────────────┐         │
│   Activity           │    │    Note               │         │
├──────────────────────┤    ├──────────────────────┤         │
│ id (PK)              │    │ id (PK)              │         │
│ tenant_id (FK)       │    │ tenant_id (FK)       │         │
│ contact_id (FK)      │    │ contact_id (FK)      │         │
│ user_id (FK)         │    │ user_id (FK)         │         │
│ type (enum)          │    │ body (text)          │         │
│ description          │    │ created_at           │         │
│ metadata (jsonb)     │    └──────────────────────┘         │
│ created_at           │                                      │
└──────────────────────┘                                      │
                                                              │
┌──────────────────────┐                                      │
│   Company            │                                      │
├──────────────────────┤                                      │
│ id (PK)              │                                      │
│ tenant_id (FK)       │                                      │
│ owner_id (FK) ───────│──────────────────────────────────────┘
│ name                 │
│ domain               │
│ industry             │
│ size (enum)          │
│ phone                │
│ address (jsonb)      │
│ website              │
│ tags (text[])        │
│ custom_fields (jsonb)│
│ created_at           │
│ updated_at           │
└──────────┬───────────┘
           │
           │ 1:N (contacts)
           ▼

┌──────────────────────────────────────────────────────────────┐
│                      DEAL PIPELINE                            │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│   Pipeline           │       │   Pipeline Stage     │
├──────────────────────┤       ├──────────────────────┤
│ id (PK)              │──┐    │ id (PK)              │
│ tenant_id (FK)       │  │    │ pipeline_id (FK) ────│──► Pipeline
│ name                 │  │    │ name                 │
│ is_default           │  │    │ position (int)       │
│ created_at           │  │    │ probability (0-100)  │
│ updated_at           │  │    │ is_won               │
└──────────────────────┘  │    │ is_lost              │
                          │    │ created_at           │
                          │    └──────────┬───────────┘
                          │               │
                          │               │ 1:N (deals in stage)
                          │               ▼
                          │    ┌──────────────────────┐
                          │    │   Deal               │
                          │    ├──────────────────────┤
                          │    │ id (PK)              │
                          │    │ tenant_id (FK)       │
                          └────│ pipeline_id (FK)     │
                               │ stage_id (FK) ───────│──► PipelineStage
                               │ contact_id (FK) ─────│──► Contact
                               │ company_id (FK) ─────│──► Company
                               │ owner_id (FK) ───────│──► User
                               │ title                │
                               │ value (decimal)      │
                               │ currency (char(3))   │
                               │ expected_close_date  │
                               │ actual_close_date    │
                               │ probability (0-100)  │
                               │ lost_reason          │
                               │ tags (text[])        │
                               │ custom_fields (jsonb)│
                               │ created_at           │
                               │ updated_at           │
                               └──────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    CAMPAIGN ENGINE                             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────────────┐
│  Email Template      │       │  Audience Segment            │
├──────────────────────┤       ├──────────────────────────────┤
│ id (PK)              │       │ id (PK)                      │
│ tenant_id (FK)       │       │ tenant_id (FK)               │
│ name                 │       │ name                         │
│ subject              │       │ description                  │
│ html_body            │       │ type (static/dynamic)        │
│ text_body            │       │ filter_criteria (jsonb)      │
│ variables (text[])   │       │ contact_count (cached int)   │
│ category             │       │ last_computed_at             │
│ thumbnail_url        │       │ created_at                   │
│ created_at           │       │ updated_at                   │
│ updated_at           │       └──────────────┬───────────────┘
└──────────┬───────────┘                      │
           │                                   │
           │                                   │
           ▼                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     Campaign                                 │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ tenant_id (FK)                                               │
│ created_by_id (FK) ──► User                                  │
│ template_id (FK) ──► EmailTemplate                           │
│ segment_id (FK) ──► AudienceSegment                          │
│ name                                                         │
│ type (enum: email, sms, whatsapp, multi_channel)             │
│ status (enum: draft, scheduled, sending, sent, paused, ...)  │
│ subject_line                                                 │
│ preview_text                                                 │
│ from_name                                                    │
│ from_email                                                   │
│ reply_to                                                     │
│ scheduled_at                                                 │
│ sent_at                                                      │
│ completed_at                                                 │
│ ab_test_config (jsonb, nullable)                             │
│ settings (jsonb)                                             │
│ created_at                                                   │
│ updated_at                                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ 1:N
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Campaign Recipient                          │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ campaign_id (FK) ──► Campaign                                │
│ contact_id (FK) ──► Contact                                  │
│ email                                                        │
│ status (enum: pending, sent, delivered, bounced, failed)     │
│ sent_at                                                      │
│ delivered_at                                                 │
│ opened_at                                                    │
│ clicked_at                                                   │
│ bounced_at                                                   │
│ unsubscribed_at                                              │
│ open_count (int)                                             │
│ click_count (int)                                            │
│ metadata (jsonb)                                             │
│ created_at                                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  Campaign Link Click                         │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ campaign_id (FK) ──► Campaign                                │
│ recipient_id (FK) ──► CampaignRecipient                      │
│ url                                                          │
│ clicked_at                                                   │
│ user_agent                                                   │
│ ip_address                                                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                       TASKS & AUTOMATION                      │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       Task                                   │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ tenant_id (FK)                                               │
│ assigned_to_id (FK) ──► User                                 │
│ created_by_id (FK) ──► User                                  │
│ contact_id (FK, nullable) ──► Contact                        │
│ deal_id (FK, nullable) ──► Deal                              │
│ title                                                        │
│ description                                                  │
│ type (enum: call, email, meeting, follow_up, custom)         │
│ priority (enum: low, medium, high, urgent)                   │
│ status (enum: pending, in_progress, completed, cancelled)    │
│ due_date                                                     │
│ completed_at                                                 │
│ created_by_agent (boolean) -- was this created by an AI agent│
│ agent_id (string, nullable) -- which agent created it        │
│ created_at                                                   │
│ updated_at                                                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    AGENT TRACKING                             │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Agent Action Log                            │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ tenant_id (FK)                                               │
│ agent_type (enum: supervisor, lead, campaign, analytics,     │
│             pipeline, support)                                │
│ action (string)                                              │
│ input (jsonb)                                                │
│ output (jsonb)                                               │
│ status (enum: started, completed, failed)                    │
│ duration_ms (int)                                            │
│ triggered_by (enum: user, agent, schedule, event)            │
│ parent_action_id (FK, nullable, self-ref) -- for chained     │
│ error (text, nullable)                                       │
│ created_at                                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│               Automation Workflow                             │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ tenant_id (FK)                                               │
│ name                                                         │
│ description                                                  │
│ trigger_type (enum: event, schedule, manual)                 │
│ trigger_config (jsonb)                                       │
│ actions (jsonb[]) -- ordered list of actions                 │
│ is_active (boolean)                                          │
│ last_run_at                                                  │
│ run_count (int)                                              │
│ created_at                                                   │
│ updated_at                                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Unsubscribe                                     │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                                                      │
│ tenant_id (FK)                                               │
│ contact_id (FK) ──► Contact                                  │
│ campaign_id (FK, nullable) ──► Campaign                      │
│ email                                                        │
│ reason (text, nullable)                                      │
│ created_at                                                   │
└─────────────────────────────────────────────────────────────┘
```

## Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ──────────────────────────────────────────────

enum ContactSource {
  WEB_FORM
  IMPORT
  API
  REFERRAL
  SOCIAL_MEDIA
  COLD_OUTREACH
  CAMPAIGN
  AGENT
  OTHER
}

enum ContactStatus {
  ACTIVE
  INACTIVE
  UNSUBSCRIBED
  BOUNCED
  ARCHIVED
}

enum LifecycleStage {
  SUBSCRIBER
  LEAD
  MQL
  SQL
  OPPORTUNITY
  CUSTOMER
  EVANGELIST
}

enum CompanySize {
  SOLO
  SMALL        // 2-10
  MEDIUM       // 11-50
  LARGE        // 51-200
  ENTERPRISE   // 201-1000
  CORPORATION  // 1000+
}

enum DealCurrency {
  USD
  EUR
  GBP
  INR
  JPY
  AUD
  CAD
}

enum CampaignType {
  EMAIL
  SMS
  WHATSAPP
  MULTI_CHANNEL
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  PAUSED
  CANCELLED
  FAILED
}

enum RecipientStatus {
  PENDING
  SENT
  DELIVERED
  BOUNCED
  FAILED
}

enum TaskType {
  CALL
  EMAIL
  MEETING
  FOLLOW_UP
  CUSTOM
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ActivityType {
  EMAIL_SENT
  EMAIL_RECEIVED
  CALL_MADE
  CALL_RECEIVED
  MEETING
  NOTE_ADDED
  DEAL_CREATED
  DEAL_STAGE_CHANGED
  DEAL_WON
  DEAL_LOST
  TASK_COMPLETED
  CAMPAIGN_SENT
  CAMPAIGN_OPENED
  CAMPAIGN_CLICKED
  FORM_SUBMITTED
  AGENT_ACTION
  CONTACT_CREATED
  CONTACT_UPDATED
}

enum AgentType {
  SUPERVISOR
  LEAD
  CAMPAIGN
  ANALYTICS
  PIPELINE
  SUPPORT
}

enum TriggerType {
  EVENT
  SCHEDULE
  MANUAL
}

enum SegmentType {
  STATIC
  DYNAMIC
}

// ─── MODELS ─────────────────────────────────────────────

model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      String   @default("free") // free, starter, pro, enterprise
  settings  Json     @default("{}")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  users               User[]
  contacts            Contact[]
  companies           Company[]
  deals               Deal[]
  pipelines           Pipeline[]
  campaigns           Campaign[]
  emailTemplates      EmailTemplate[]
  audienceSegments    AudienceSegment[]
  tasks               Task[]
  activities          Activity[]
  notes               Note[]
  agentActionLogs     AgentActionLog[]
  automationWorkflows AutomationWorkflow[]
  unsubscribes        Unsubscribe[]

  @@map("tenants")
}

model User {
  id            String    @id @default(cuid())
  tenantId      String    @map("tenant_id")
  email         String
  passwordHash  String    @map("password_hash")
  firstName     String    @map("first_name")
  lastName      String    @map("last_name")
  avatarUrl     String?   @map("avatar_url")
  role          String    @default("member") // admin, manager, member
  isActive      Boolean   @default(true) @map("is_active")
  lastLoginAt   DateTime? @map("last_login_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  tenant            Tenant     @relation(fields: [tenantId], references: [id])
  ownedContacts     Contact[]  @relation("ContactOwner")
  ownedCompanies    Company[]  @relation("CompanyOwner")
  ownedDeals        Deal[]     @relation("DealOwner")
  assignedTasks     Task[]     @relation("TaskAssignee")
  createdTasks      Task[]     @relation("TaskCreator")
  createdCampaigns  Campaign[] @relation("CampaignCreator")
  activities        Activity[]
  notes             Note[]

  @@unique([tenantId, email])
  @@map("users")
}

model Contact {
  id              String          @id @default(cuid())
  tenantId        String          @map("tenant_id")
  companyId       String?         @map("company_id")
  ownerId         String?         @map("owner_id")
  firstName       String          @map("first_name")
  lastName        String          @map("last_name")
  email           String
  phone           String?
  title           String?
  source          ContactSource   @default(OTHER)
  status          ContactStatus   @default(ACTIVE)
  leadScore       Int             @default(0) @map("lead_score")
  lifecycleStage  LifecycleStage  @default(SUBSCRIBER) @map("lifecycle_stage")
  tags            String[]        @default([])
  customFields    Json            @default("{}") @map("custom_fields")
  lastContactedAt DateTime?       @map("last_contacted_at")
  createdAt       DateTime        @default(now()) @map("created_at")
  updatedAt       DateTime        @updatedAt @map("updated_at")

  tenant              Tenant              @relation(fields: [tenantId], references: [id])
  company             Company?            @relation(fields: [companyId], references: [id])
  owner               User?               @relation("ContactOwner", fields: [ownerId], references: [id])
  deals               Deal[]
  activities          Activity[]
  notes               Note[]
  tasks               Task[]
  campaignRecipients  CampaignRecipient[]
  unsubscribes        Unsubscribe[]

  @@unique([tenantId, email])
  @@index([tenantId, leadScore])
  @@index([tenantId, lifecycleStage])
  @@index([tenantId, status])
  @@index([tenantId, createdAt])
  @@map("contacts")
}

model Company {
  id           String       @id @default(cuid())
  tenantId     String       @map("tenant_id")
  ownerId      String?      @map("owner_id")
  name         String
  domain       String?
  industry     String?
  size         CompanySize?
  phone        String?
  address      Json?
  website      String?
  tags         String[]     @default([])
  customFields Json         @default("{}") @map("custom_fields")
  createdAt    DateTime     @default(now()) @map("created_at")
  updatedAt    DateTime     @updatedAt @map("updated_at")

  tenant   Tenant    @relation(fields: [tenantId], references: [id])
  owner    User?     @relation("CompanyOwner", fields: [ownerId], references: [id])
  contacts Contact[]
  deals    Deal[]

  @@unique([tenantId, domain])
  @@map("companies")
}

model Pipeline {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  name      String
  isDefault Boolean  @default(false) @map("is_default")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant          @relation(fields: [tenantId], references: [id])
  stages PipelineStage[]
  deals  Deal[]

  @@map("pipelines")
}

model PipelineStage {
  id          String  @id @default(cuid())
  pipelineId  String  @map("pipeline_id")
  name        String
  position    Int
  probability Int     @default(0) // 0-100
  isWon       Boolean @default(false) @map("is_won")
  isLost      Boolean @default(false) @map("is_lost")
  createdAt   DateTime @default(now()) @map("created_at")

  pipeline Pipeline @relation(fields: [pipelineId], references: [id])
  deals    Deal[]

  @@unique([pipelineId, position])
  @@map("pipeline_stages")
}

model Deal {
  id                String    @id @default(cuid())
  tenantId          String    @map("tenant_id")
  pipelineId        String    @map("pipeline_id")
  stageId           String    @map("stage_id")
  contactId         String?   @map("contact_id")
  companyId         String?   @map("company_id")
  ownerId           String?   @map("owner_id")
  title             String
  value             Decimal   @default(0)
  currency          String    @default("USD")
  expectedCloseDate DateTime? @map("expected_close_date")
  actualCloseDate   DateTime? @map("actual_close_date")
  probability       Int       @default(0) // 0-100
  lostReason        String?   @map("lost_reason")
  tags              String[]  @default([])
  customFields      Json      @default("{}") @map("custom_fields")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  tenant   Tenant         @relation(fields: [tenantId], references: [id])
  pipeline Pipeline       @relation(fields: [pipelineId], references: [id])
  stage    PipelineStage  @relation(fields: [stageId], references: [id])
  contact  Contact?       @relation(fields: [contactId], references: [id])
  company  Company?       @relation(fields: [companyId], references: [id])
  owner    User?          @relation("DealOwner", fields: [ownerId], references: [id])
  tasks    Task[]

  @@index([tenantId, stageId])
  @@index([tenantId, ownerId])
  @@index([tenantId, expectedCloseDate])
  @@map("deals")
}

model EmailTemplate {
  id           String   @id @default(cuid())
  tenantId     String   @map("tenant_id")
  name         String
  subject      String
  htmlBody     String   @map("html_body")
  textBody     String?  @map("text_body")
  variables    String[] @default([])
  category     String?
  thumbnailUrl String?  @map("thumbnail_url")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  campaigns Campaign[]

  @@map("email_templates")
}

model AudienceSegment {
  id              String      @id @default(cuid())
  tenantId        String      @map("tenant_id")
  name            String
  description     String?
  type            SegmentType @default(DYNAMIC)
  filterCriteria  Json        @map("filter_criteria")
  contactCount    Int         @default(0) @map("contact_count")
  lastComputedAt  DateTime?   @map("last_computed_at")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  tenant    Tenant     @relation(fields: [tenantId], references: [id])
  campaigns Campaign[]

  @@map("audience_segments")
}

model Campaign {
  id            String         @id @default(cuid())
  tenantId      String         @map("tenant_id")
  createdById   String         @map("created_by_id")
  templateId    String?        @map("template_id")
  segmentId     String?        @map("segment_id")
  name          String
  type          CampaignType   @default(EMAIL)
  status        CampaignStatus @default(DRAFT)
  subjectLine   String?        @map("subject_line")
  previewText   String?        @map("preview_text")
  fromName      String?        @map("from_name")
  fromEmail     String?        @map("from_email")
  replyTo       String?        @map("reply_to")
  scheduledAt   DateTime?      @map("scheduled_at")
  sentAt        DateTime?      @map("sent_at")
  completedAt   DateTime?      @map("completed_at")
  abTestConfig  Json?          @map("ab_test_config")
  settings      Json           @default("{}") @map("settings")
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")

  tenant       Tenant             @relation(fields: [tenantId], references: [id])
  createdBy    User               @relation("CampaignCreator", fields: [createdById], references: [id])
  template     EmailTemplate?     @relation(fields: [templateId], references: [id])
  segment      AudienceSegment?   @relation(fields: [segmentId], references: [id])
  recipients   CampaignRecipient[]
  linkClicks   CampaignLinkClick[]
  unsubscribes Unsubscribe[]

  @@index([tenantId, status])
  @@index([tenantId, scheduledAt])
  @@map("campaigns")
}

model CampaignRecipient {
  id              String          @id @default(cuid())
  campaignId      String          @map("campaign_id")
  contactId       String          @map("contact_id")
  email           String
  status          RecipientStatus @default(PENDING)
  sentAt          DateTime?       @map("sent_at")
  deliveredAt     DateTime?       @map("delivered_at")
  openedAt        DateTime?       @map("opened_at")
  clickedAt       DateTime?       @map("clicked_at")
  bouncedAt       DateTime?       @map("bounced_at")
  unsubscribedAt  DateTime?       @map("unsubscribed_at")
  openCount       Int             @default(0) @map("open_count")
  clickCount      Int             @default(0) @map("click_count")
  metadata        Json            @default("{}") @map("metadata")
  createdAt       DateTime        @default(now()) @map("created_at")

  campaign   Campaign            @relation(fields: [campaignId], references: [id])
  contact    Contact             @relation(fields: [contactId], references: [id])
  linkClicks CampaignLinkClick[]

  @@unique([campaignId, contactId])
  @@index([campaignId, status])
  @@map("campaign_recipients")
}

model CampaignLinkClick {
  id          String   @id @default(cuid())
  campaignId  String   @map("campaign_id")
  recipientId String   @map("recipient_id")
  url         String
  clickedAt   DateTime @default(now()) @map("clicked_at")
  userAgent   String?  @map("user_agent")
  ipAddress   String?  @map("ip_address")

  campaign  Campaign          @relation(fields: [campaignId], references: [id])
  recipient CampaignRecipient @relation(fields: [recipientId], references: [id])

  @@index([campaignId])
  @@map("campaign_link_clicks")
}

model Task {
  id             String       @id @default(cuid())
  tenantId       String       @map("tenant_id")
  assignedToId   String?      @map("assigned_to_id")
  createdById    String       @map("created_by_id")
  contactId      String?      @map("contact_id")
  dealId         String?      @map("deal_id")
  title          String
  description    String?
  type           TaskType     @default(FOLLOW_UP)
  priority       TaskPriority @default(MEDIUM)
  status         TaskStatus   @default(PENDING)
  dueDate        DateTime?    @map("due_date")
  completedAt    DateTime?    @map("completed_at")
  createdByAgent Boolean      @default(false) @map("created_by_agent")
  agentId        String?      @map("agent_id")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  assignedTo User?    @relation("TaskAssignee", fields: [assignedToId], references: [id])
  createdBy  User     @relation("TaskCreator", fields: [createdById], references: [id])
  contact    Contact? @relation(fields: [contactId], references: [id])
  deal       Deal?    @relation(fields: [dealId], references: [id])

  @@index([tenantId, assignedToId, status])
  @@index([tenantId, dueDate])
  @@map("tasks")
}

model Activity {
  id          String       @id @default(cuid())
  tenantId    String       @map("tenant_id")
  contactId   String?      @map("contact_id")
  userId      String?      @map("user_id")
  type        ActivityType
  description String
  metadata    Json         @default("{}") @map("metadata")
  createdAt   DateTime     @default(now()) @map("created_at")

  tenant  Tenant   @relation(fields: [tenantId], references: [id])
  contact Contact? @relation(fields: [contactId], references: [id])
  user    User?    @relation(fields: [userId], references: [id])

  @@index([tenantId, contactId, createdAt])
  @@index([tenantId, type])
  @@map("activities")
}

model Note {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  contactId String   @map("contact_id")
  userId    String   @map("user_id")
  body      String
  createdAt DateTime @default(now()) @map("created_at")

  tenant  Tenant  @relation(fields: [tenantId], references: [id])
  contact Contact @relation(fields: [contactId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@map("notes")
}

model AgentActionLog {
  id              String    @id @default(cuid())
  tenantId        String    @map("tenant_id")
  agentType       AgentType @map("agent_type")
  action          String
  input           Json      @default("{}") @map("input")
  output          Json      @default("{}") @map("output")
  status          String    @default("started") // started, completed, failed
  durationMs      Int?      @map("duration_ms")
  triggeredBy     String    @map("triggered_by") // user, agent, schedule, event
  parentActionId  String?   @map("parent_action_id")
  error           String?
  createdAt       DateTime  @default(now()) @map("created_at")

  tenant       Tenant          @relation(fields: [tenantId], references: [id])
  parentAction AgentActionLog? @relation("ActionChain", fields: [parentActionId], references: [id])
  childActions AgentActionLog[] @relation("ActionChain")

  @@index([tenantId, agentType, createdAt])
  @@index([tenantId, triggeredBy])
  @@map("agent_action_logs")
}

model AutomationWorkflow {
  id            String      @id @default(cuid())
  tenantId      String      @map("tenant_id")
  name          String
  description   String?
  triggerType   TriggerType @map("trigger_type")
  triggerConfig Json        @map("trigger_config")
  actions       Json[]      @default([])
  isActive      Boolean     @default(false) @map("is_active")
  lastRunAt     DateTime?   @map("last_run_at")
  runCount      Int         @default(0) @map("run_count")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("automation_workflows")
}

model Unsubscribe {
  id         String   @id @default(cuid())
  tenantId   String   @map("tenant_id")
  contactId  String   @map("contact_id")
  campaignId String?  @map("campaign_id")
  email      String
  reason     String?
  createdAt  DateTime @default(now()) @map("created_at")

  tenant   Tenant    @relation(fields: [tenantId], references: [id])
  contact  Contact   @relation(fields: [contactId], references: [id])
  campaign Campaign? @relation(fields: [campaignId], references: [id])

  @@unique([tenantId, email])
  @@map("unsubscribes")
}
```

## Key Design Decisions

### 1. Multi-Tenancy via `tenant_id`
Every table includes a `tenant_id` foreign key. This enables:
- Row-level security policies in PostgreSQL
- Prisma middleware that auto-injects tenant context
- Complete data isolation between organizations

### 2. JSONB for Flexibility
`custom_fields`, `metadata`, `filter_criteria`, `settings`, and `ab_test_config` use JSONB columns. This allows:
- Per-tenant custom fields without schema changes
- Flexible segment filter definitions
- Extensible campaign settings

### 3. Soft Deletes (Recommended for Production)
The schema above uses hard deletes for simplicity. For production, add:
```prisma
deletedAt DateTime? @map("deleted_at")
```
And filter with `where: { deletedAt: null }` in queries.

### 4. Indexing Strategy
- Composite indexes on `(tenant_id, <frequently_filtered_column>)` for all tenant-scoped queries
- Indexes on foreign keys used in JOINs
- Indexes on `created_at` for time-based queries
- `lead_score` indexed for the Lead Agent's scoring queries

### 5. Agent Action Logging
The `AgentActionLog` table captures every AI agent action with:
- Hierarchical tracking via `parent_action_id` (for multi-step workflows)
- Input/output capture for debugging and auditing
- Duration tracking for performance monitoring
- Trigger source tracking (user request vs. automated)
