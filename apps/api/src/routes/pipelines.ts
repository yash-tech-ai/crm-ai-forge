import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import { createPipelineSchema, idParamSchema } from "@crm-ai-forge/shared";
import { authenticate, getTenantId } from "../middleware/auth.js";
import { validate, sendSuccess, sendNotFound } from "../utils/response.js";

export async function pipelineRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Pipelines ──────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);

    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        stages: { orderBy: { position: "asc" } },
        _count: { select: { deals: true } },
      },
      orderBy: { isDefault: "desc" },
    });

    sendSuccess(reply, pipelines);
  });

  // ─── Get Pipeline ────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const pipeline = await prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: {
        stages: {
          orderBy: { position: "asc" },
          include: {
            _count: { select: { deals: true } },
          },
        },
      },
    });

    if (!pipeline) return sendNotFound(reply, "Pipeline");
    sendSuccess(reply, pipeline);
  });

  // ─── Create Pipeline ─────────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = validate(createPipelineSchema, request.body);

    // If this pipeline is default, unset current default
    if (body.isDefault) {
      await prisma.pipeline.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId,
        name: body.name,
        isDefault: body.isDefault,
        stages: {
          create: body.stages.map((stage) => ({
            name: stage.name,
            position: stage.position,
            probability: stage.probability,
            isWon: stage.isWon,
            isLost: stage.isLost,
          })),
        },
      },
      include: {
        stages: { orderBy: { position: "asc" } },
      },
    });

    sendSuccess(reply, pipeline, 201);
  });

  // ─── Update Pipeline ─────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = request.body as { name?: string; isDefault?: boolean; stages?: Array<{ id?: string; name: string; position: number; probability?: number; isWon?: boolean; isLost?: boolean }> };

    const existing = await prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: { stages: { orderBy: { position: "asc" } } },
    });
    if (!existing) return sendNotFound(reply, "Pipeline");

    // If setting as default, unset current default
    if (body.isDefault) {
      await prisma.pipeline.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Update pipeline fields
    const pipeline = await prisma.pipeline.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.isDefault !== undefined && { isDefault: body.isDefault }),
      },
      include: {
        stages: { orderBy: { position: "asc" } },
      },
    });

    // Update stages if provided
    if (body.stages) {
      for (const stage of body.stages) {
        if (stage.id) {
          await prisma.pipelineStage.update({
            where: { id: stage.id },
            data: {
              name: stage.name,
              position: stage.position,
              probability: stage.probability ?? 0,
              isWon: stage.isWon ?? false,
              isLost: stage.isLost ?? false,
            },
          });
        } else {
          await prisma.pipelineStage.create({
            data: {
              pipelineId: id,
              name: stage.name,
              position: stage.position,
              probability: stage.probability ?? 0,
              isWon: stage.isWon ?? false,
              isLost: stage.isLost ?? false,
            },
          });
        }
      }
    }

    // Fetch updated pipeline
    const updated = await prisma.pipeline.findFirst({
      where: { id },
      include: { stages: { orderBy: { position: "asc" } } },
    });

    sendSuccess(reply, updated);
  });

  // ─── Delete Pipeline ─────────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const pipeline = await prisma.pipeline.findFirst({
      where: { id, tenantId },
      include: { _count: { select: { deals: true } } },
    });

    if (!pipeline) return sendNotFound(reply, "Pipeline");

    if (pipeline._count.deals > 0) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: `Cannot delete pipeline with ${pipeline._count.deals} active deals`,
        },
      });
    }

    // Delete stages first, then pipeline
    await prisma.$transaction([
      prisma.pipelineStage.deleteMany({ where: { pipelineId: id } }),
      prisma.pipeline.delete({ where: { id } }),
    ]);

    sendSuccess(reply, { deleted: true });
  });
}
