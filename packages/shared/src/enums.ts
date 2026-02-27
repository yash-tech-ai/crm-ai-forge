// ─── Contact ─────────────────────────────────────────────

export const ContactSource = {
  WEB_FORM: "WEB_FORM",
  IMPORT: "IMPORT",
  API: "API",
  REFERRAL: "REFERRAL",
  SOCIAL_MEDIA: "SOCIAL_MEDIA",
  COLD_OUTREACH: "COLD_OUTREACH",
  CAMPAIGN: "CAMPAIGN",
  WEBINAR: "WEBINAR",
  LINKEDIN: "LINKEDIN",
  AGENT: "AGENT",
  OTHER: "OTHER",
} as const;
export type ContactSource = (typeof ContactSource)[keyof typeof ContactSource];

export const ContactStatus = {
  NEW: "NEW",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  UNSUBSCRIBED: "UNSUBSCRIBED",
  BOUNCED: "BOUNCED",
  CHURNED: "CHURNED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ContactStatus = (typeof ContactStatus)[keyof typeof ContactStatus];

export const LifecycleStage = {
  SUBSCRIBER: "SUBSCRIBER",
  LEAD: "LEAD",
  MQL: "MQL",
  SQL: "SQL",
  OPPORTUNITY: "OPPORTUNITY",
  CUSTOMER: "CUSTOMER",
  EVANGELIST: "EVANGELIST",
} as const;
export type LifecycleStage =
  (typeof LifecycleStage)[keyof typeof LifecycleStage];

export const ConsentStatus = {
  PENDING: "PENDING",
  OPTED_IN: "OPTED_IN",
  OPTED_OUT: "OPTED_OUT",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type ConsentStatus =
  (typeof ConsentStatus)[keyof typeof ConsentStatus];

// ─── Company ─────────────────────────────────────────────

export const CompanySize = {
  SOLO: "SOLO",
  SMALL: "SMALL",
  MEDIUM: "MEDIUM",
  LARGE: "LARGE",
  ENTERPRISE: "ENTERPRISE",
  CORPORATION: "CORPORATION",
} as const;
export type CompanySize = (typeof CompanySize)[keyof typeof CompanySize];

// ─── Campaign ────────────────────────────────────────────

export const CampaignType = {
  EMAIL: "EMAIL",
  SMS: "SMS",
  WHATSAPP: "WHATSAPP",
  MULTI_CHANNEL: "MULTI_CHANNEL",
} as const;
export type CampaignType = (typeof CampaignType)[keyof typeof CampaignType];

export const CampaignStatus = {
  DRAFT: "DRAFT",
  PENDING_COMPLIANCE: "PENDING_COMPLIANCE",
  SCHEDULED: "SCHEDULED",
  SENDING: "SENDING",
  SENT: "SENT",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;
export type CampaignStatus =
  (typeof CampaignStatus)[keyof typeof CampaignStatus];

export const ComplianceStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type ComplianceStatus =
  (typeof ComplianceStatus)[keyof typeof ComplianceStatus];

export const RecipientStatus = {
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  OPENED: "OPENED",
  CLICKED: "CLICKED",
  BOUNCED: "BOUNCED",
  FAILED: "FAILED",
  UNSUBSCRIBED: "UNSUBSCRIBED",
} as const;
export type RecipientStatus =
  (typeof RecipientStatus)[keyof typeof RecipientStatus];

// ─── Task ────────────────────────────────────────────────

export const TaskType = {
  CALL: "CALL",
  EMAIL: "EMAIL",
  MEETING: "MEETING",
  FOLLOW_UP: "FOLLOW_UP",
  DEMO: "DEMO",
  CUSTOM: "CUSTOM",
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export const TaskStatus = {
  PENDING: "PENDING",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// ─── Activity ────────────────────────────────────────────

export const ActivityType = {
  EMAIL_SENT: "EMAIL_SENT",
  EMAIL_RECEIVED: "EMAIL_RECEIVED",
  EMAIL_OPENED: "EMAIL_OPENED",
  EMAIL_CLICKED: "EMAIL_CLICKED",
  CALL_MADE: "CALL_MADE",
  CALL_RECEIVED: "CALL_RECEIVED",
  MEETING: "MEETING",
  NOTE_ADDED: "NOTE_ADDED",
  DEAL_CREATED: "DEAL_CREATED",
  DEAL_STAGE_CHANGED: "DEAL_STAGE_CHANGED",
  DEAL_WON: "DEAL_WON",
  DEAL_LOST: "DEAL_LOST",
  TASK_COMPLETED: "TASK_COMPLETED",
  CAMPAIGN_SENT: "CAMPAIGN_SENT",
  CAMPAIGN_OPENED: "CAMPAIGN_OPENED",
  CAMPAIGN_CLICKED: "CAMPAIGN_CLICKED",
  FORM_SUBMITTED: "FORM_SUBMITTED",
  AGENT_ACTION: "AGENT_ACTION",
  CONTACT_CREATED: "CONTACT_CREATED",
  CONTACT_UPDATED: "CONTACT_UPDATED",
  ENRICHMENT_COMPLETED: "ENRICHMENT_COMPLETED",
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

// ─── Agent ───────────────────────────────────────────────

export const AgentType = {
  ORCHESTRATOR: "ORCHESTRATOR",
  LEAD: "LEAD",
  CAMPAIGN: "CAMPAIGN",
  SALES: "SALES",
  INSIGHT: "INSIGHT",
  ENRICHMENT: "ENRICHMENT",
  COMPLIANCE: "COMPLIANCE",
  SUPPORT: "SUPPORT",
} as const;
export type AgentType = (typeof AgentType)[keyof typeof AgentType];

// ─── Segment ─────────────────────────────────────────────

export const SegmentType = {
  STATIC: "STATIC",
  DYNAMIC: "DYNAMIC",
} as const;
export type SegmentType = (typeof SegmentType)[keyof typeof SegmentType];

// ─── Sequence ────────────────────────────────────────────

export const SequenceStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  EXITED: "EXITED",
  PAUSED: "PAUSED",
} as const;
export type SequenceStatus =
  (typeof SequenceStatus)[keyof typeof SequenceStatus];

// ─── User Role ───────────────────────────────────────────

export const UserRole = {
  ADMIN: "admin",
  MANAGER: "manager",
  MEMBER: "member",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ─── Tenant Plan ─────────────────────────────────────────

export const TenantPlan = {
  FREE: "free",
  STARTER: "starter",
  GROWTH: "growth",
  ENTERPRISE: "enterprise",
} as const;
export type TenantPlan = (typeof TenantPlan)[keyof typeof TenantPlan];
