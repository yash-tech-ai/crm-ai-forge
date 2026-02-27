import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import {
  createContactSchema,
  updateContactSchema,
  contactFilterSchema,
  idParamSchema,
} from "@crm-ai-forge/shared";
import { authenticate, getTenantId, getUserId } from "../middleware/auth.js";
import {
  validate,
  sendSuccess,
  sendPaginated,
  sendNotFound,
} from "../utils/response.js";

export async function contactRoutes(app: FastifyInstance) {
  // All routes require authentication
  app.addHook("preHandler", authenticate);

  // ─── List Contacts ───────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const filters = validate(contactFilterSchema, request.query);
    const { page, limit, sortBy, sortOrder, search, ...where } = filters;

    const whereClause: any = {
      tenantId,
      deletedAt: null,
      ...(where.status && { status: where.status }),
      ...(where.source && { source: where.source }),
      ...(where.lifecycleStage && { lifecycleStage: where.lifecycleStage }),
      ...(where.ownerId && { ownerId: where.ownerId }),
      ...(where.companyId && { companyId: where.companyId }),
      ...(where.minLeadScore !== undefined && {
        leadScore: { gte: where.minLeadScore },
      }),
      ...(where.maxLeadScore !== undefined && {
        leadScore: {
          ...(where.minLeadScore !== undefined
            ? { gte: where.minLeadScore }
            : {}),
          lte: where.maxLeadScore,
        },
      }),
      ...(where.tags && where.tags.length > 0 && {
        tags: { hasSome: where.tags },
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where: whereClause,
        include: {
          company: { select: { id: true, name: true } },
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contact.count({ where: whereClause }),
    ]);

    sendPaginated(reply, contacts, total, page, limit);
  });

  // ─── Get Contact ─────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const contact = await prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        company: true,
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        deals: {
          where: { deletedAt: null },
          include: {
            stage: { select: { name: true } },
            pipeline: { select: { name: true } },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        tasks: {
          where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
          orderBy: { dueDate: "asc" },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!contact) return sendNotFound(reply, "Contact");
    sendSuccess(reply, contact);
  });

  // ─── Create Contact ──────────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = validate(createContactSchema, request.body);

    // Check for duplicate email within tenant
    const existing = await prisma.contact.findFirst({
      where: { tenantId, email: body.email, deletedAt: null },
    });

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: "CONFLICT", message: "Contact with this email already exists" },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        ...body,
        consentDate: body.consentStatus === "OPTED_IN" ? new Date() : null,
      },
      include: {
        company: { select: { id: true, name: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        tenantId,
        contactId: contact.id,
        userId: getUserId(request),
        type: "CONTACT_CREATED",
        description: `Contact ${contact.firstName} ${contact.lastName} created`,
      },
    });

    sendSuccess(reply, contact, 201);
  });

  // ─── Update Contact ──────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(updateContactSchema, request.body);

    const existing = await prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) return sendNotFound(reply, "Contact");

    const contact = await prisma.contact.update({
      where: { id },
      data: body,
      include: {
        company: { select: { id: true, name: true } },
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    sendSuccess(reply, contact);
  });

  // ─── Delete Contact (Soft) ───────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.contact.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) return sendNotFound(reply, "Contact");

    await prisma.contact.update({
      where: { id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });

    sendSuccess(reply, { deleted: true });
  });
}
