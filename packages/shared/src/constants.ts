// ─── Pagination Defaults ─────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Auth ────────────────────────────────────────────────

export const ACCESS_TOKEN_EXPIRY = "15m";
export const REFRESH_TOKEN_EXPIRY = "7d";
export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
export const REFRESH_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const BCRYPT_ROUNDS = 12;

// ─── Lead Scoring ────────────────────────────────────────

export const LEAD_SCORE_MAX = 100;
export const LEAD_SCORE_FIT_MAX = 50;
export const LEAD_SCORE_INTENT_MAX = 50;
export const LEAD_SCORE_DECAY_DAYS = 30;
export const LEAD_SCORE_DECAY_RATE = 0.05;

// ─── Agent Confidence Thresholds ─────────────────────────

export const CONFIDENCE_AUTO_EXECUTE = 0.9;
export const CONFIDENCE_NOTIFY_USER = 0.7;
export const CONFIDENCE_PRESENT_OPTIONS = 0.5;

// ─── Rate Limits ─────────────────────────────────────────

export const RATE_LIMIT_GENERAL = { max: 100, timeWindow: "1 minute" };
export const RATE_LIMIT_AUTH = { max: 10, timeWindow: "1 minute" };
export const RATE_LIMIT_SEARCH = { max: 30, timeWindow: "1 minute" };
export const RATE_LIMIT_BULK = { max: 5, timeWindow: "1 minute" };

// ─── Campaign Limits ─────────────────────────────────────

export const CAMPAIGN_MAX_RECIPIENTS_FREE = 500;
export const CAMPAIGN_MAX_RECIPIENTS_STARTER = 5000;
export const CAMPAIGN_MAX_RECIPIENTS_GROWTH = 50000;
export const CAMPAIGN_MAX_RECIPIENTS_ENTERPRISE = 500000;

// ─── File Upload ─────────────────────────────────────────

export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_IMPORT_TYPES = ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

// ─── BullMQ Queue Names ─────────────────────────────────

export const QUEUE_CAMPAIGN_SEND = "campaign:send";
export const QUEUE_CAMPAIGN_PROCESS = "campaign:process";
export const QUEUE_CONTACT_IMPORT = "contact:import";
export const QUEUE_ENRICHMENT = "enrichment:process";
export const QUEUE_AGENT_ACTION = "agent:action";
export const QUEUE_SEQUENCE_STEP = "sequence:step";
export const QUEUE_ANALYTICS = "analytics:compute";

// ─── Event Names ─────────────────────────────────────────

export const DOMAIN_EVENTS = {
  CONTACT_CREATED: "contact.created",
  CONTACT_UPDATED: "contact.updated",
  CONTACT_DELETED: "contact.deleted",
  DEAL_CREATED: "deal.created",
  DEAL_STAGE_CHANGED: "deal.stage_changed",
  DEAL_WON: "deal.won",
  DEAL_LOST: "deal.lost",
  CAMPAIGN_CREATED: "campaign.created",
  CAMPAIGN_SENT: "campaign.sent",
  CAMPAIGN_COMPLIANCE_REQUESTED: "campaign.compliance_requested",
  CAMPAIGN_COMPLIANCE_APPROVED: "campaign.compliance_approved",
  CAMPAIGN_COMPLIANCE_REJECTED: "campaign.compliance_rejected",
  TASK_CREATED: "task.created",
  TASK_COMPLETED: "task.completed",
  EMAIL_OPENED: "email.opened",
  EMAIL_CLICKED: "email.clicked",
  EMAIL_BOUNCED: "email.bounced",
  SEQUENCE_ENROLLED: "sequence.enrolled",
  SEQUENCE_STEP_EXECUTED: "sequence.step_executed",
  SEQUENCE_COMPLETED: "sequence.completed",
} as const;
export type DomainEvent =
  (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];
