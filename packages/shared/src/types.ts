import type {
  ContactSource,
  ContactStatus,
  LifecycleStage,
  ConsentStatus,
  CompanySize,
  CampaignType,
  CampaignStatus,
  ComplianceStatus,
  RecipientStatus,
  TaskType,
  TaskPriority,
  TaskStatus,
  ActivityType,
  AgentType,
  SegmentType,
  SequenceStatus,
  UserRole,
  TenantPlan,
} from "./enums.js";

// ─── Base ────────────────────────────────────────────────

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeletable {
  deletedAt: Date | null;
}

export interface TenantScoped {
  tenantId: string;
}

// ─── Tenant ──────────────────────────────────────────────

export interface Tenant extends Timestamps {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  settings: Record<string, unknown>;
}

// ─── User ────────────────────────────────────────────────

export interface User extends Timestamps, TenantScoped {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
}

export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: UserRole;
}

// ─── Contact ─────────────────────────────────────────────

export interface Contact extends Timestamps, SoftDeletable, TenantScoped {
  id: string;
  companyId: string | null;
  ownerId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  title: string | null;
  department: string | null;
  source: ContactSource;
  status: ContactStatus;
  leadScore: number;
  lifecycleStage: LifecycleStage;
  tags: string[];
  customFields: Record<string, unknown>;
  consentStatus: ConsentStatus;
  consentDate: Date | null;
  consentSource: string | null;
  enrichedAt: Date | null;
  enrichmentData: Record<string, unknown>;
  lastContactedAt: Date | null;
  lastEngagedAt: Date | null;
}

// ─── Company ─────────────────────────────────────────────

export interface Company extends Timestamps, SoftDeletable, TenantScoped {
  id: string;
  ownerId: string | null;
  name: string;
  domain: string | null;
  industry: string | null;
  size: CompanySize | null;
  employeeCount: number | null;
  revenueRange: string | null;
  phone: string | null;
  address: Record<string, unknown> | null;
  website: string | null;
  country: string | null;
  city: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  techStack: string[];
  socialProfiles: Record<string, unknown>;
  enrichmentData: Record<string, unknown>;
  enrichedAt: Date | null;
}

// ─── Pipeline ────────────────────────────────────────────

export interface Pipeline extends Timestamps, TenantScoped {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  position: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: Date;
}

// ─── Deal ────────────────────────────────────────────────

export interface Deal extends Timestamps, SoftDeletable, TenantScoped {
  id: string;
  pipelineId: string;
  stageId: string;
  contactId: string | null;
  companyId: string | null;
  ownerId: string | null;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate: Date | null;
  actualCloseDate: Date | null;
  probability: number;
  lostReason: string | null;
  competitor: string | null;
  notes: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  stageChangedAt: Date;
}

// ─── Campaign ────────────────────────────────────────────

export interface Campaign extends Timestamps, TenantScoped {
  id: string;
  createdById: string;
  templateId: string | null;
  segmentId: string | null;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  objective: string | null;
  subjectLine: string | null;
  previewText: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  completedAt: Date | null;
  abTestConfig: Record<string, unknown> | null;
  settings: Record<string, unknown>;
  complianceStatus: ComplianceStatus;
  complianceNotes: string | null;
  complianceAt: Date | null;
  metrics: CampaignMetrics;
}

export interface CampaignMetrics {
  sent: number;
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  complained: number;
}

// ─── Task ────────────────────────────────────────────────

export interface Task extends Timestamps, TenantScoped {
  id: string;
  assignedToId: string | null;
  createdById: string;
  contactId: string | null;
  dealId: string | null;
  title: string;
  description: string | null;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: Date | null;
  completedAt: Date | null;
  createdByAgent: boolean;
  agentType: AgentType | null;
  outcome: string | null;
}

// ─── Activity ────────────────────────────────────────────

export interface Activity extends TenantScoped {
  id: string;
  contactId: string | null;
  dealId: string | null;
  campaignId: string | null;
  userId: string | null;
  type: ActivityType;
  subject: string | null;
  description: string;
  outcome: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ─── Agent ───────────────────────────────────────────────

export interface AgentActionLog extends TenantScoped {
  id: string;
  agentType: AgentType;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: "started" | "completed" | "failed";
  durationMs: number | null;
  tokensUsed: number | null;
  modelUsed: string | null;
  confidence: number | null;
  triggeredBy: "user" | "agent" | "cron" | "event" | "webhook";
  parentActionId: string | null;
  error: string | null;
  createdAt: Date;
}

// ─── API Response ────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Auth ────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
}
