import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import { createSegmentSchema, idParamSchema, paginationSchema } from "@crm-ai-forge/shared";
import { authenticate, getTenantId } from "../middleware/auth.js";
import { validate, sendSuccess, sendPaginated, sendNotFound } from "../utils/response.js";
import { buildSegmentFilter } from "../utils/segment-filter.js";

export async function segmentRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Segments ─────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { page, limit } = validate(paginationSchema, request.query);

    const [segments, total] = await Promise.all([
      prisma.audienceSegment.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.audienceSegment.count({ where: { tenantId } }),
    ]);

    sendPaginated(reply, segments, total, page, limit);
  });

  // ─── Get Segment ──────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const segment = await prisma.audienceSegment.findFirst({
      where: { id, tenantId },
    });
    if (!segment) return sendNotFound(reply, "Segment");
    sendSuccess(reply, segment);
  });

  // ─── Create Segment ───────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = validate(createSegmentSchema, request.body);

    // Compute initial contact count
    const prismaFilter = buildSegmentFilter(body.filterCriteria, tenantId);
    const contactCount = await prisma.contact.count({ where: prismaFilter });

    const segment = await prisma.audienceSegment.create({
      data: {
        tenantId,
        ...body,
        contactCount,
        lastComputedAt: new Date(),
      },
    });

    sendSuccess(reply, segment, 201);
  });

  // ─── Update Segment ───────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(createSegmentSchema.partial(), request.body);

    const existing = await prisma.audienceSegment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Segment");

    // Recompute count if filter changed
    let contactCount = existing.contactCount;
    const filterCriteria = body.filterCriteria ?? (existing.filterCriteria as Record<string, unknown>);
    if (body.filterCriteria) {
      const prismaFilter = buildSegmentFilter(filterCriteria, tenantId);
      contactCount = await prisma.contact.count({ where: prismaFilter });
    }

    const segment = await prisma.audienceSegment.update({
      where: { id },
      data: {
        ...body,
        contactCount,
        lastComputedAt: body.filterCriteria ? new Date() : undefined,
      },
    });

    sendSuccess(reply, segment);
  });

  // ─── Preview Segment Contacts ─────────────────────
  app.get("/:id/preview", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const { page, limit } = validate(paginationSchema, request.query);

    const segment = await prisma.audienceSegment.findFirst({
      where: { id, tenantId },
    });
    if (!segment) return sendNotFound(reply, "Segment");

    const prismaFilter = buildSegmentFilter(
      segment.filterCriteria as Record<string, unknown>,
      tenantId
    );

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: prismaFilter,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          leadScore: true,
          status: true,
          lifecycleStage: true,
        },
        orderBy: { leadScore: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where: prismaFilter }),
    ]);

    // Update cached count
    if (total !== segment.contactCount) {
      await prisma.audienceSegment.update({
        where: { id },
        data: { contactCount: total, lastComputedAt: new Date() },
      });
    }

    sendPaginated(reply, contacts, total, page, limit);
  });

  // ─── Delete Segment ───────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.audienceSegment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Segment");

    // Check if segment is used by active campaigns
    const activeCampaigns = await prisma.campaign.count({
      where: {
        segmentId: id,
        status: { in: ["SCHEDULED", "SENDING"] },
      },
    });

    if (activeCampaigns > 0) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: "Segment is used by active campaigns",
        },
      });
    }

    await prisma.audienceSegment.delete({ where: { id } });
    sendSuccess(reply, { deleted: true });
  });
}
