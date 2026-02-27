import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import {
  createEmailTemplateSchema,
  paginationSchema,
  idParamSchema,
} from "@crm-ai-forge/shared";
import { authenticate, getTenantId } from "../middleware/auth.js";
import {
  validate,
  sendSuccess,
  sendPaginated,
  sendNotFound,
} from "../utils/response.js";

export async function templateRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Templates ──────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { page, limit, sortBy, sortOrder } = validate(
      paginationSchema,
      request.query
    );

    const [templates, total] = await Promise.all([
      prisma.emailTemplate.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          subject: true,
          category: true,
          tags: true,
          thumbnailUrl: true,
          performance: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailTemplate.count({ where: { tenantId } }),
    ]);

    sendPaginated(reply, templates, total, page, limit);
  });

  // ─── Get Template ────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const template = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) return sendNotFound(reply, "Email template");
    sendSuccess(reply, template);
  });

  // ─── Create Template ─────────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = validate(createEmailTemplateSchema, request.body);

    const template = await prisma.emailTemplate.create({
      data: { tenantId, ...body },
    });

    sendSuccess(reply, template, 201);
  });

  // ─── Update Template ─────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(createEmailTemplateSchema.partial(), request.body);

    const existing = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Email template");

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: body,
    });

    sendSuccess(reply, template);
  });

  // ─── Delete Template ─────────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.emailTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Email template");

    // Check if template is used by active campaigns
    const activeCampaigns = await prisma.campaign.count({
      where: {
        templateId: id,
        status: { in: ["SCHEDULED", "SENDING"] },
      },
    });

    if (activeCampaigns > 0) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: "Template is used by active campaigns",
        },
      });
    }

    await prisma.emailTemplate.delete({ where: { id } });
    sendSuccess(reply, { deleted: true });
  });
}
