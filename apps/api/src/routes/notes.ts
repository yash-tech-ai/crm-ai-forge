import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import { createNoteSchema, idParamSchema, paginationSchema } from "@crm-ai-forge/shared";
import { authenticate, getTenantId, getUserId } from "../middleware/auth.js";
import { validate, sendSuccess, sendPaginated, sendNotFound } from "../utils/response.js";

export async function noteRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Notes (for a contact) ─────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { page, limit } = validate(paginationSchema, request.query);
    const { contactId } = request.query as { contactId?: string };

    const whereClause: any = { tenantId };
    if (contactId) whereClause.contactId = contactId;

    const [notes, total] = await Promise.all([
      prisma.note.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.note.count({ where: whereClause }),
    ]);

    sendPaginated(reply, notes, total, page, limit);
  });

  // ─── Get Note ──────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const note = await prisma.note.findFirst({
      where: { id, tenantId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!note) return sendNotFound(reply, "Note");
    sendSuccess(reply, note);
  });

  // ─── Create Note ──────────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = validate(createNoteSchema, request.body);

    // Verify contact belongs to tenant
    const contact = await prisma.contact.findFirst({
      where: { id: body.contactId, tenantId, deletedAt: null },
    });
    if (!contact) return sendNotFound(reply, "Contact");

    const note = await prisma.note.create({
      data: {
        tenantId,
        userId,
        contactId: body.contactId,
        body: body.body,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        tenantId,
        contactId: body.contactId,
        userId,
        type: "NOTE_ADDED",
        description: `Note added to ${contact.firstName} ${contact.lastName}`,
      },
    });

    sendSuccess(reply, note, 201);
  });

  // ─── Update Note ──────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { id } = validate(idParamSchema, request.params);
    const { body: noteBody } = request.body as { body: string };

    if (!noteBody || noteBody.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Note body is required" },
      });
    }

    const existing = await prisma.note.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Note");

    // Only the author can edit their note
    if (existing.userId !== userId) {
      return reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "You can only edit your own notes" },
      });
    }

    const note = await prisma.note.update({
      where: { id },
      data: { body: noteBody },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    sendSuccess(reply, note);
  });

  // ─── Delete Note ──────────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.note.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Note");

    // Only the author or admins can delete
    const user = request.currentUser;
    if (existing.userId !== userId && user?.role !== "admin") {
      return reply.status(403).send({
        success: false,
        error: { code: "FORBIDDEN", message: "You can only delete your own notes" },
      });
    }

    await prisma.note.delete({ where: { id } });
    sendSuccess(reply, { deleted: true });
  });
}
