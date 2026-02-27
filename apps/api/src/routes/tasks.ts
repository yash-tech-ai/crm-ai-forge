import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import {
  createTaskSchema,
  updateTaskSchema,
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

const taskFilterSchema = paginationSchema.extend({
  assignedToId: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  type: z.enum(["CALL", "EMAIL", "MEETING", "FOLLOW_UP", "DEMO", "CUSTOM"]).optional(),
  overdue: z.coerce.boolean().optional(),
});

export async function taskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── List Tasks ──────────────────────────────────────
  app.get("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const filters = validate(taskFilterSchema, request.query);
    const { page, limit, sortBy, sortOrder, overdue, ...where } = filters;

    const whereClause: any = {
      tenantId,
      ...(where.assignedToId && { assignedToId: where.assignedToId }),
      ...(where.status && { status: where.status }),
      ...(where.priority && { priority: where.priority }),
      ...(where.type && { type: where.type }),
      ...(overdue && {
        dueDate: { lt: new Date() },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      }),
    };

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: whereClause,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          deal: { select: { id: true, title: true } },
        },
        orderBy: { [sortBy || "dueDate"]: sortOrder === "desc" ? "desc" : "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where: whereClause }),
    ]);

    sendPaginated(reply, tasks, total, page, limit);
  });

  // ─── Get Task ────────────────────────────────────────
  app.get("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const task = await prisma.task.findFirst({
      where: { id, tenantId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        contact: true,
        deal: { include: { stage: { select: { name: true } } } },
      },
    });

    if (!task) return sendNotFound(reply, "Task");
    sendSuccess(reply, task);
  });

  // ─── Create Task ─────────────────────────────────────
  app.post("/", async (request, reply) => {
    const tenantId = getTenantId(request);
    const userId = getUserId(request);
    const body = validate(createTaskSchema, request.body);

    const task = await prisma.task.create({
      data: {
        tenantId,
        createdById: userId,
        ...body,
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        contact: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    sendSuccess(reply, task, 201);
  });

  // ─── Update Task ─────────────────────────────────────
  app.patch("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(updateTaskSchema, request.body);

    const existing = await prisma.task.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Task");

    const updateData: any = { ...body };
    if (body.status === "COMPLETED" && existing.status !== "COMPLETED") {
      updateData.completedAt = new Date();
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    // Log completion activity
    if (body.status === "COMPLETED" && existing.status !== "COMPLETED") {
      await prisma.activity.create({
        data: {
          tenantId,
          contactId: existing.contactId,
          userId: getUserId(request),
          type: "TASK_COMPLETED",
          description: `Task "${task.title}" completed`,
          metadata: { taskId: task.id, outcome: task.outcome },
        },
      });
    }

    sendSuccess(reply, task);
  });

  // ─── Delete Task ─────────────────────────────────────
  app.delete("/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = validate(idParamSchema, request.params);

    const existing = await prisma.task.findFirst({
      where: { id, tenantId },
    });
    if (!existing) return sendNotFound(reply, "Task");

    await prisma.task.delete({ where: { id } });
    sendSuccess(reply, { deleted: true });
  });
}
