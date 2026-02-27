import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import {
  createDealSchema,
  updateDealSchema,
  dealFilterSchema,
  idParamSchema,
} from "@crm-ai-forge/shared";
import { authenticate, getTenantId, getUserId } from "../middleware/auth.js";
import {
  validate,
  sendSuccess,
  sendPaginated,
  sendNotFound,
} from "../utils/response.js";

export async function dealRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Deals ──────────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const filters = validate(dealFilterSchema, request.query);
    const { page, limit, sortBy, sortOrder, search, ...where } = filters;

    const whereClause: any = {
      tenantId,
      deletedAt: null,
      ...(where.pipelineId && { pipelineId: where.pipelineId }),
      ...(where.stageId && { stageId: where.stageId }),
      ...(where.ownerId && { ownerId: where.ownerId }),
      ...(where.minValue !== undefined && {
        value: { gte: where.minValue },
      }),
      ...(where.maxValue !== undefined && {
        value: {
          ...(where.minValue !== undefined ? { gte: where.minValue } : {}),
          lte: where.maxValue,
        },
      }),
      ...(search && {
        title: { contains: search, mode: "insensitive" },
      }),
    };

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where: whereClause,
        include: {
          pipeline: { select: { id: true, name: true } },
          stage: { select: { id: true, name: true, probability: true } },
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          company: { select: { id: true, name: true } },
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.deal.count({ where: whereClause }),
    ]);

    sendPaginated(reply, deals, total, page, limit);
  });

  // ─── Get Deal ────────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const deal = await prisma.deal.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        pipeline: { include: { stages: { orderBy: { position: "asc" } } } },
        stage: true,
        contact: true,
        company: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        tasks: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!deal) return sendNotFound(reply, "Deal");
    sendSuccess(reply, deal);
  });

  // ─── Create Deal ─────────────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = validate(createDealSchema, request.body);

    // Verify pipeline and stage belong to this tenant
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: body.stageId,
        pipelineId: body.pipelineId,
        pipeline: { tenantId },
      },
    });

    if (!stage) {
      return reply.status(400).send({
        success: false,
        error: { code: "INVALID_STAGE", message: "Pipeline stage not found" },
      });
    }

    const deal = await prisma.deal.create({
      data: {
        tenantId,
        ...body,
        probability: body.probability ?? stage.probability,
      },
      include: {
        pipeline: { select: { name: true } },
        stage: { select: { name: true } },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
        company: { select: { id: true, name: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        tenantId,
        contactId: deal.contactId,
        userId: getUserId(request),
        type: "DEAL_CREATED",
        description: `Deal "${deal.title}" created in ${deal.pipeline.name}`,
        metadata: { dealId: deal.id, value: deal.value },
      },
    });

    sendSuccess(reply, deal, 201);
  });

  // ─── Update Deal ─────────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(updateDealSchema, request.body);

    const existing = await prisma.deal.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { stage: true },
    });
    if (!existing) return sendNotFound(reply, "Deal");

    // Track stage changes
    const stageChanged = body.stageId && body.stageId !== existing.stageId;
    const updateData: any = { ...body };

    if (stageChanged) {
      updateData.stageChangedAt = new Date();

      // Check if deal is being won or lost
      const newStage = await prisma.pipelineStage.findUnique({
        where: { id: body.stageId },
      });

      if (newStage?.isWon) {
        updateData.actualCloseDate = new Date();
        updateData.probability = 100;
      } else if (newStage?.isLost) {
        updateData.actualCloseDate = new Date();
        updateData.probability = 0;
      }
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        stage: { select: { name: true, isWon: true, isLost: true } },
        pipeline: { select: { name: true } },
      },
    });

    // Log stage change activity
    if (stageChanged) {
      const activityType = deal.stage.isWon
        ? "DEAL_WON"
        : deal.stage.isLost
          ? "DEAL_LOST"
          : "DEAL_STAGE_CHANGED";

      await prisma.activity.create({
        data: {
          tenantId,
          contactId: existing.contactId,
          userId: getUserId(request),
          type: activityType,
          description: `Deal "${deal.title}" moved to ${deal.stage.name}`,
          metadata: {
            dealId: deal.id,
            fromStage: existing.stage.name,
            toStage: deal.stage.name,
          },
        },
      });
    }

    sendSuccess(reply, deal);
  });

  // ─── Delete Deal (Soft) ──────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.deal.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) return sendNotFound(reply, "Deal");

    await prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(reply, { deleted: true });
  });
}
