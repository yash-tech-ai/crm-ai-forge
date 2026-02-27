import { z } from "zod";
import {
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

// ─── Helpers ─────────────────────────────────────────────

const cuid = z.string().min(1);
const email = z.string().email().max(255);
const phone = z.string().max(50).optional();

function enumSchema<T extends Record<string, string>>(enumObj: T) {
  const values = Object.values(enumObj) as [string, ...string[]];
  return z.enum(values);
}

// ─── Pagination ──────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

// ─── Auth ────────────────────────────────────────────────

export const loginSchema = z.object({
  email,
  password: z.string().min(8).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email,
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  tenantName: z.string().min(1).max(200),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─── Contact ─────────────────────────────────────────────

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email,
  phone,
  title: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
  companyId: cuid.optional(),
  ownerId: cuid.optional(),
  source: enumSchema(ContactSource).default("OTHER"),
  status: enumSchema(ContactStatus).default("NEW"),
  lifecycleStage: enumSchema(LifecycleStage).default("SUBSCRIBER"),
  consentStatus: enumSchema(ConsentStatus).default("PENDING"),
  consentSource: z.string().max(100).optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

export const updateContactSchema = createContactSchema.partial();
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

export const contactFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: enumSchema(ContactStatus).optional(),
  source: enumSchema(ContactSource).optional(),
  lifecycleStage: enumSchema(LifecycleStage).optional(),
  ownerId: cuid.optional(),
  companyId: cuid.optional(),
  tags: z.array(z.string()).optional(),
  minLeadScore: z.coerce.number().int().min(0).optional(),
  maxLeadScore: z.coerce.number().int().max(100).optional(),
});
export type ContactFilterInput = z.infer<typeof contactFilterSchema>;

// ─── Company ─────────────────────────────────────────────

export const createCompanySchema = z.object({
  name: z.string().min(1).max(300),
  domain: z.string().max(255).optional(),
  industry: z.string().max(200).optional(),
  size: enumSchema(CompanySize).optional(),
  employeeCount: z.number().int().min(0).optional(),
  revenueRange: z.string().max(100).optional(),
  phone,
  website: z.string().url().max(500).optional(),
  country: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.record(z.unknown()).optional(),
  ownerId: cuid.optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
  techStack: z.array(z.string()).default([]),
  socialProfiles: z.record(z.unknown()).default({}),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial();
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

export const companyFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  industry: z.string().optional(),
  size: enumSchema(CompanySize).optional(),
  country: z.string().optional(),
  ownerId: cuid.optional(),
});
export type CompanyFilterInput = z.infer<typeof companyFilterSchema>;

// ─── Pipeline ────────────────────────────────────────────

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(200),
  isDefault: z.boolean().default(false),
  stages: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        position: z.number().int().min(0),
        probability: z.number().int().min(0).max(100).default(0),
        isWon: z.boolean().default(false),
        isLost: z.boolean().default(false),
      })
    )
    .min(1),
});
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;

// ─── Deal ────────────────────────────────────────────────

export const createDealSchema = z.object({
  pipelineId: cuid,
  stageId: cuid,
  contactId: cuid.optional(),
  companyId: cuid.optional(),
  ownerId: cuid.optional(),
  title: z.string().min(1).max(300),
  value: z.number().min(0).default(0),
  currency: z.string().length(3).default("USD"),
  expectedCloseDate: z.coerce.date().optional(),
  probability: z.number().int().min(0).max(100).default(0),
  competitor: z.string().max(300).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
  customFields: z.record(z.unknown()).default({}),
});
export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = createDealSchema.partial();
export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const dealFilterSchema = paginationSchema.extend({
  search: z.string().optional(),
  pipelineId: cuid.optional(),
  stageId: cuid.optional(),
  ownerId: cuid.optional(),
  minValue: z.coerce.number().min(0).optional(),
  maxValue: z.coerce.number().min(0).optional(),
});
export type DealFilterInput = z.infer<typeof dealFilterSchema>;

// ─── Campaign ────────────────────────────────────────────

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(300),
  type: enumSchema(CampaignType).default("EMAIL"),
  objective: z.string().max(200).optional(),
  templateId: cuid.optional(),
  segmentId: cuid.optional(),
  subjectLine: z.string().max(500).optional(),
  previewText: z.string().max(500).optional(),
  fromName: z.string().max(200).optional(),
  fromEmail: z.string().email().max(255).optional(),
  replyTo: z.string().email().max(255).optional(),
  scheduledAt: z.coerce.date().optional(),
  abTestConfig: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).default({}),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.partial();
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

// ─── Email Template ──────────────────────────────────────

export const createEmailTemplateSchema = z.object({
  name: z.string().min(1).max(300),
  subject: z.string().min(1).max(500),
  htmlBody: z.string().min(1),
  mjmlBody: z.string().optional(),
  textBody: z.string().optional(),
  variables: z.array(z.string()).default([]),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).default([]),
});
export type CreateEmailTemplateInput = z.infer<
  typeof createEmailTemplateSchema
>;

// ─── Task ────────────────────────────────────────────────

export const createTaskSchema = z.object({
  contactId: cuid.optional(),
  dealId: cuid.optional(),
  assignedToId: cuid.optional(),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  type: enumSchema(TaskType).default("FOLLOW_UP"),
  priority: enumSchema(TaskPriority).default("MEDIUM"),
  dueDate: z.coerce.date().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial().extend({
  status: enumSchema(TaskStatus).optional(),
  outcome: z.string().max(200).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

// ─── Activity ────────────────────────────────────────────

export const createActivitySchema = z.object({
  contactId: cuid.optional(),
  dealId: cuid.optional(),
  campaignId: cuid.optional(),
  type: enumSchema(ActivityType),
  subject: z.string().max(300).optional(),
  description: z.string().min(1),
  outcome: z.string().max(200).optional(),
  metadata: z.record(z.unknown()).default({}),
});
export type CreateActivityInput = z.infer<typeof createActivitySchema>;

// ─── Note ────────────────────────────────────────────────

export const createNoteSchema = z.object({
  contactId: cuid,
  body: z.string().min(1),
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

// ─── Audience Segment ────────────────────────────────────

export const createSegmentSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  type: enumSchema(SegmentType).default("DYNAMIC"),
  filterCriteria: z.record(z.unknown()),
});
export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;

// ─── Automation Sequence ─────────────────────────────────

export const createSequenceSchema = z.object({
  name: z.string().min(1).max(300),
  description: z.string().optional(),
  triggerEvent: z.string().min(1),
  triggerConditions: z.record(z.unknown()).default({}),
  steps: z
    .array(
      z.object({
        delay: z.number().int().min(0),
        action: z.string(),
        templateId: z.string().optional(),
        condition: z.record(z.unknown()).optional(),
      })
    )
    .default([]),
});
export type CreateSequenceInput = z.infer<typeof createSequenceSchema>;

// ─── ID Param ────────────────────────────────────────────

export const idParamSchema = z.object({
  id: cuid,
});
export type IdParam = z.infer<typeof idParamSchema>;
