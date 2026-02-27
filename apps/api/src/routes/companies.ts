import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import {
  createCompanySchema,
  updateCompanySchema,
  companyFilterSchema,
  idParamSchema,
} from "@crm-ai-forge/shared";
import { authenticate, getTenantId } from "../middleware/auth.js";
import {
  validate,
  sendSuccess,
  sendPaginated,
  sendNotFound,
} from "../utils/response.js";

export async function companyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Companies ──────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const filters = validate(companyFilterSchema, request.query);
    const { page, limit, sortBy, sortOrder, search, ...where } = filters;

    const whereClause: any = {
      tenantId,
      deletedAt: null,
      ...(where.industry && { industry: where.industry }),
      ...(where.size && { size: where.size }),
      ...(where.country && { country: where.country }),
      ...(where.ownerId && { ownerId: where.ownerId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { domain: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: { select: { contacts: true, deals: true } },
        },
        orderBy: { [sortBy || "createdAt"]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.company.count({ where: whereClause }),
    ]);

    sendPaginated(reply, companies, total, page, limit);
  });

  // ─── Get Company ─────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const company = await prisma.company.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        contacts: {
          where: { deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            title: true,
            leadScore: true,
          },
          orderBy: { leadScore: "desc" },
        },
        deals: {
          where: { deletedAt: null },
          include: {
            stage: { select: { name: true } },
          },
        },
      },
    });

    if (!company) return sendNotFound(reply, "Company");
    sendSuccess(reply, company);
  });

  // ─── Create Company ──────────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = validate(createCompanySchema, request.body);

    // Check for duplicate domain within tenant
    if (body.domain) {
      const existing = await prisma.company.findFirst({
        where: { tenantId, domain: body.domain, deletedAt: null },
      });
      if (existing) {
        return reply.status(409).send({
          success: false,
          error: { code: "CONFLICT", message: "Company with this domain already exists" },
        });
      }
    }

    const company = await prisma.company.create({
      data: { tenantId, ...body },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    sendSuccess(reply, company, 201);
  });

  // ─── Update Company ──────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(updateCompanySchema, request.body);

    const existing = await prisma.company.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) return sendNotFound(reply, "Company");

    const company = await prisma.company.update({
      where: { id },
      data: body,
    });

    sendSuccess(reply, company);
  });

  // ─── Delete Company (Soft) ───────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.company.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!existing) return sendNotFound(reply, "Company");

    await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    sendSuccess(reply, { deleted: true });
  });
}
