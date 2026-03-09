import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import { authenticate, getTenantId } from "../middleware/auth.js";
import { sendSuccess } from "../utils/response.js";

export async function searchRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── Global Search ─────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { q } = request.query as { q?: string };

    if (!q || q.trim().length < 2) {
      return sendSuccess(reply, { contacts: [], companies: [], deals: [] });
    }

    const query = q.trim();
    const limit = 5;

    const [contacts, companies, deals] = await Promise.all([
      prisma.contact.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          status: true,
          leadScore: true,
        },
        take: limit,
      }),
      prisma.company.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { domain: { contains: query, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          domain: true,
          industry: true,
        },
        take: limit,
      }),
      prisma.deal.findMany({
        where: {
          tenantId,
          deletedAt: null,
          title: { contains: query, mode: "insensitive" },
        },
        select: {
          id: true,
          title: true,
          value: true,
          stage: { select: { name: true } },
        },
        take: limit,
      }),
    ]);

    sendSuccess(reply, { contacts, companies, deals });
  });
}
