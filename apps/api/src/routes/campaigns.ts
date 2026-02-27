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
