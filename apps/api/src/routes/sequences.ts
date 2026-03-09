import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import { paginationSchema, idParamSchema } from "@crm-ai-forge/shared";
import { authenticate, getTenantId } from "../middleware/auth.js";
import {
  validate,
  sendSuccess,
  sendPaginated,
  sendNotFound,
} from "../utils/response.js";
import { z } from "zod";

const stepSchema = z.object({
  type: z.enum(["email", "delay", "condition", "task", "update_field"]),
  config: z.record(z.unknown()),
});

const createSequenceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  triggerEvent: z.string().min(1),
  triggerConditions: z.record(z.unknown()).default({}),
  steps: z.array(stepSchema).min(1),
});

export async function sequenceRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Sequences ────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { page, limit, sortBy, sortOrder } = validate(
      paginationSchema,
      request.query
    );

    const [sequences, total] = await Promise.all([
      prisma.automationSequence.findMany({
        where: { tenantId },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.automationSequence.count({ where: { tenantId } }),
    ]);

    sendPaginated(reply, sequences, total, page, limit);
  });

  // ─── Get Sequence ──────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const sequence = await prisma.automationSequence.findFirst({
      where: { id, tenantId },
      include: {
        enrollments: {
          take: 20,
          orderBy: { enrolledAt: "desc" },
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!sequence) return sendNotFound(reply, "Sequence");
    sendSuccess(reply, sequence);
  });

  // ─── Create Sequence ───────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = validate(createSequenceSchema, request.body);

    const sequence = await prisma.automationSequence.create({
      data: {
        tenantId,
        name: body.name,
        description: body.description,
        triggerEvent: body.triggerEvent,
        triggerConditions: body.triggerConditions,
        steps: body.steps,
      },
    });

    sendSuccess(reply, sequence, 201);
  });

  // ─── Update Sequence ───────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(createSequenceSchema.partial(), request.body);

    const existing = await prisma.automationSequence.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Sequence");

    const sequence = await prisma.automationSequence.update({
      where: { id },
      data: body,
    });

    sendSuccess(reply, sequence);
  });

  // ─── Activate / Deactivate ─────────────────────────
  app.post("/:id/toggle", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.automationSequence.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Sequence");

    const sequence = await prisma.automationSequence.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    sendSuccess(reply, sequence);
  });

  // ─── Enroll Contact ────────────────────────────────
  app.post("/:id/enroll", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const { contactId } = validate(
      z.object({ contactId: z.string() }),
      request.body
    );

    const sequence = await prisma.automationSequence.findFirst({
      where: { id, tenantId },
    });
    if (!sequence) return sendNotFound(reply, "Sequence");

    if (!sequence.isActive) {
      return reply.status(409).send({
        success: false,
        error: {
          code: "INACTIVE",
          message: "Cannot enroll contacts in an inactive sequence",
        },
      });
    }

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
    });
    if (!contact) return sendNotFound(reply, "Contact");

    // Calculate first step delay
    const steps = sequence.steps as { type: string; config: Record<string, unknown> }[];
    const firstStep = steps[0];
    let nextActionAt = new Date();

    if (firstStep?.type === "delay") {
      const delayMinutes = (firstStep.config.minutes as number) ?? 0;
      const delayHours = (firstStep.config.hours as number) ?? 0;
      const delayDays = (firstStep.config.days as number) ?? 0;
      nextActionAt = new Date(
        nextActionAt.getTime() +
          (delayMinutes * 60 + delayHours * 3600 + delayDays * 86400) * 1000
      );
    }

    const enrollment = await prisma.sequenceEnrollment.upsert({
      where: {
        sequenceId_contactId: { sequenceId: id, contactId },
      },
      create: {
        sequenceId: id,
        contactId,
        currentStep: 0,
        status: "ACTIVE",
        nextActionAt,
      },
      update: {},
    });

    // Update enrolled count
    await prisma.automationSequence.update({
      where: { id },
      data: { enrolledCount: { increment: 1 } },
    });

    sendSuccess(reply, enrollment, 201);
  });

  // ─── Delete Sequence ───────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.automationSequence.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Sequence");

    // Delete enrollments first
    await prisma.$transaction([
      prisma.sequenceEnrollment.deleteMany({ where: { sequenceId: id } }),
      prisma.automationSequence.delete({ where: { id } }),
    ]);

    sendSuccess(reply, { deleted: true });
  });
}
