import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import {
  createCampaignSchema,
  updateCampaignSchema,
  paginationSchema,
  idParamSchema,
} from "@crm-ai-forge/shared";
import { authenticate, getTenantId, getUserId } from "../middleware/auth.js";
import {
  validate,
  sendSuccess,
  sendPaginated,
  sendNotFound,
} from "../utils/response.js";
import { z } from "zod";
import { buildSegmentFilter } from "../utils/segment-filter.js";

const campaignFilterSchema = paginationSchema.extend({
  status: z
    .enum([
      "DRAFT",
      "PENDING_COMPLIANCE",
      "SCHEDULED",
      "SENDING",
      "SENT",
      "PAUSED",
      "CANCELLED",
      "FAILED",
    ])
    .optional(),
  type: z.enum(["EMAIL", "SMS", "WHATSAPP", "MULTI_CHANNEL"]).optional(),
});

export async function campaignRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Campaigns ──────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const filters = validate(campaignFilterSchema, request.query);
    const { page, limit, sortBy, sortOrder, ...where } = filters;

    const whereClause: any = {
      tenantId,
      ...(where.status && { status: where.status }),
      ...(where.type && { type: where.type }),
    };

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true },
          },
          template: { select: { id: true, name: true } },
          segment: { select: { id: true, name: true, contactCount: true } },
          _count: { select: { recipients: true } },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.campaign.count({ where: whereClause }),
    ]);

    sendPaginated(reply, campaigns, total, page, limit);
  });

  // ─── Get Campaign ────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        template: true,
        segment: true,
        _count: { select: { recipients: true, linkClicks: true } },
      },
    });

    if (!campaign) return sendNotFound(reply, "Campaign");
    sendSuccess(reply, campaign);
  });

  // ─── Create Campaign ─────────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = validate(createCampaignSchema, request.body);

    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        createdById: userId,
        ...body,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    sendSuccess(reply, campaign, 201);
  });

  // ─── Update Campaign ─────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(updateCampaignSchema, request.body);

    const existing = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Campaign");

    // Prevent editing sent/sending campaigns
    if (["SENT", "SENDING"].includes(existing.status)) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: "Cannot edit a campaign that has been sent or is sending",
        },
      });
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: body,
    });

    sendSuccess(reply, campaign);
  });

  // ─── Submit for Compliance ────────────────────────────
  app.post("/:id/submit-compliance", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) return sendNotFound(reply, "Campaign");

    if (campaign.status !== "DRAFT") {
      return reply.status(409).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Only draft campaigns can be submitted for compliance",
        },
      });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: "PENDING_COMPLIANCE",
        complianceStatus: "PENDING",
      },
    });

    sendSuccess(reply, updated);
  });

  // ─── Schedule Campaign ────────────────────────────────
  app.post("/:id/schedule", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(
      z.object({ scheduledAt: z.coerce.date() }),
      request.body
    );

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) return sendNotFound(reply, "Campaign");

    // Must be compliance-approved before scheduling
    if (campaign.complianceStatus !== "APPROVED") {
      return reply.status(409).send({
        success: false,
        error: {
          code: "COMPLIANCE_REQUIRED",
          message: "Campaign must be compliance-approved before scheduling",
        },
      });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        status: "SCHEDULED",
        scheduledAt: body.scheduledAt,
      },
    });

    sendSuccess(reply, updated);
  });

  // ─── Approve Compliance ─────────────────────────────
  app.post("/:id/approve-compliance", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = request.body as { notes?: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) return sendNotFound(reply, "Campaign");

    if (campaign.complianceStatus !== "PENDING") {
      return reply.status(409).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message: "Campaign is not pending compliance review",
        },
      });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: {
        complianceStatus: "APPROVED",
        complianceNotes: body.notes ?? null,
        complianceAt: new Date(),
      },
    });

    sendSuccess(reply, updated);
  });

  // ─── Send Campaign (populate recipients + queue) ───
  app.post("/:id/send", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        segment: true,
        template: true,
      },
    });
    if (!campaign) return sendNotFound(reply, "Campaign");

    // Must be scheduled or compliance-approved
    if (!["SCHEDULED", "PENDING_COMPLIANCE"].includes(campaign.status) &&
        campaign.complianceStatus !== "APPROVED") {
      // Allow sending draft campaigns directly in development
      if (campaign.status !== "DRAFT") {
        return reply.status(409).send({
          success: false,
          error: {
            code: "INVALID_STATE",
            message: "Campaign must be in DRAFT or SCHEDULED status to send",
          },
        });
      }
    }

    if (!campaign.template) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "MISSING_TEMPLATE",
          message: "Campaign must have an email template assigned",
        },
      });
    }

    // Get contacts from segment (or all contacts if no segment)
    let contactWhere: any = { tenantId, deletedAt: null, consentStatus: { not: "OPTED_OUT" } };
    if (campaign.segment) {
      contactWhere = buildSegmentFilter(
        campaign.segment.filterCriteria as Record<string, unknown>,
        tenantId
      );
      // Ensure opted-out contacts are excluded
      contactWhere.consentStatus = { not: "OPTED_OUT" };
    }

    const contacts = await prisma.contact.findMany({
      where: contactWhere,
      select: { id: true, email: true },
    });

    if (contacts.length === 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "NO_RECIPIENTS",
          message: "No eligible contacts found for this campaign",
        },
      });
    }

    // Check suppression list
    const suppressedEmails = await prisma.unsubscribe.findMany({
      where: { tenantId, email: { in: contacts.map((c) => c.email) } },
      select: { email: true },
    });
    const suppressedSet = new Set(suppressedEmails.map((s) => s.email));
    const eligibleContacts = contacts.filter((c) => !suppressedSet.has(c.email));

    // Create campaign recipients
    const recipients = await prisma.$transaction(
      eligibleContacts.map((contact) =>
        prisma.campaignRecipient.upsert({
          where: {
            campaignId_contactId: {
              campaignId: id,
              contactId: contact.id,
            },
          },
          create: {
            campaignId: id,
            contactId: contact.id,
            email: contact.email,
            status: "QUEUED",
          },
          update: {},
        })
      )
    );

    // Update campaign status
    await prisma.campaign.update({
      where: { id },
      data: {
        status: "SENDING",
        sentAt: new Date(),
      },
    });

    sendSuccess(reply, {
      campaignId: id,
      recipientCount: recipients.length,
      suppressedCount: suppressedSet.size,
      status: "SENDING",
      message: `Campaign queued for ${recipients.length} recipients`,
    });
  });

  // ─── Configure A/B Test ────────────────────────────
  app.post("/:id/ab-test", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const abTestSchema = z.object({
      enabled: z.boolean(),
      testType: z.enum(["subject", "content", "sender"]),
      variants: z
        .array(
          z.object({
            name: z.string(),
            weight: z.number().min(1).max(100),
            subjectLine: z.string().optional(),
            templateId: z.string().optional(),
            fromName: z.string().optional(),
          })
        )
        .min(2)
        .max(4),
      winnerCriteria: z
        .enum(["open_rate", "click_rate", "conversion"])
        .default("open_rate"),
      testDurationHours: z.number().min(1).max(72).default(4),
      testSamplePercent: z.number().min(10).max(50).default(20),
    });

    const body = validate(abTestSchema, request.body);

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) return sendNotFound(reply, "Campaign");

    if (!["DRAFT", "SCHEDULED"].includes(campaign.status)) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "INVALID_STATE",
          message:
            "A/B test can only be configured on draft or scheduled campaigns",
        },
      });
    }

    const totalWeight = body.variants.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "INVALID_WEIGHTS",
          message: `Variant weights must sum to 100 (currently ${totalWeight})`,
        },
      });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { abTestConfig: body },
    });

    sendSuccess(reply, updated);
  });

  // ─── Get A/B Test Results ──────────────────────────
  app.get("/:id/ab-test/results", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) return sendNotFound(reply, "Campaign");

    const abConfig = campaign.abTestConfig as {
      enabled?: boolean;
      variants?: { name: string; weight: number }[];
      winnerCriteria?: string;
    } | null;

    if (!abConfig?.enabled || !abConfig.variants) {
      return reply.status(400).send({
        success: false,
        error: {
          code: "NO_AB_TEST",
          message: "This campaign does not have an A/B test configured",
        },
      });
    }

    const variantResults = await Promise.all(
      abConfig.variants.map(async (variant) => {
        const recipients = await prisma.campaignRecipient.findMany({
          where: { campaignId: id, variant: variant.name },
          select: { status: true, openedAt: true, clickedAt: true },
        });

        const total = recipients.length;
        const opened = recipients.filter((r) => r.openedAt).length;
        const clicked = recipients.filter((r) => r.clickedAt).length;

        return {
          variant: variant.name,
          weight: variant.weight,
          recipients: total,
          opened,
          clicked,
          openRate: total > 0 ? ((opened / total) * 100).toFixed(1) : "0.0",
          clickRate:
            total > 0 ? ((clicked / total) * 100).toFixed(1) : "0.0",
        };
      })
    );

    const criteria = abConfig.winnerCriteria ?? "open_rate";
    const sorted = [...variantResults].sort((a, b) => {
      if (criteria === "click_rate")
        return parseFloat(b.clickRate) - parseFloat(a.clickRate);
      return parseFloat(b.openRate) - parseFloat(a.openRate);
    });

    sendSuccess(reply, {
      variants: variantResults,
      winner: sorted[0]?.variant ?? null,
      winnerCriteria: criteria,
    });
  });

  // ─── Delete Campaign ─────────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
    });
    if (!campaign) return sendNotFound(reply, "Campaign");

    if (["SENT", "SENDING"].includes(campaign.status)) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: "Cannot delete a sent or active campaign",
        },
      });
    }

    // Delete recipients first, then campaign
    await prisma.$transaction([
      prisma.campaignLinkClick.deleteMany({ where: { campaignId: id } }),
      prisma.campaignRecipient.deleteMany({ where: { campaignId: id } }),
      prisma.campaign.delete({ where: { id } }),
    ]);

    sendSuccess(reply, { deleted: true });
  });
}
