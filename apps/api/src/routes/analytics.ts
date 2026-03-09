import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";
import { authenticate, getTenantId } from "../middleware/auth.js";
import { sendSuccess } from "../utils/response.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  // ─── Dashboard Summary ───────────────────────────────
  app.get("/dashboard", async (request, reply) => {
    const tenantId = getTenantId(request);

    const [
      totalContacts,
      newContactsThisMonth,
      activeDeals,
      dealValueTotal,
      activeCampaigns,
      pendingTasks,
      overdueTasks,
      recentActivities,
    ] = await Promise.all([
      prisma.contact.count({
        where: { tenantId, deletedAt: null },
      }),
      prisma.contact.count({
        where: {
          tenantId,
          deletedAt: null,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      prisma.deal.count({
        where: {
          tenantId,
          deletedAt: null,
          stage: { isWon: false, isLost: false },
        },
      }),
      prisma.deal.aggregate({
        where: {
          tenantId,
          deletedAt: null,
          stage: { isWon: false, isLost: false },
        },
        _sum: { value: true },
      }),
      prisma.campaign.count({
        where: {
          tenantId,
          status: { in: ["SCHEDULED", "SENDING"] },
        },
      }),
      prisma.task.count({
        where: {
          tenantId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
      prisma.task.count({
        where: {
          tenantId,
          status: { in: ["PENDING", "IN_PROGRESS"] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.activity.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true },
          },
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    sendSuccess(reply, {
      contacts: {
        total: totalContacts,
        newThisMonth: newContactsThisMonth,
      },
      deals: {
        active: activeDeals,
        totalValue: dealValueTotal._sum.value ?? 0,
      },
      campaigns: {
        active: activeCampaigns,
      },
      tasks: {
        pending: pendingTasks,
        overdue: overdueTasks,
      },
      recentActivities,
    });
  });

  // ─── Lead Score Distribution ─────────────────────────
  app.get("/leads/distribution", async (request, reply) => {
    const tenantId = getTenantId(request);

    const contacts = await prisma.contact.findMany({
      where: { tenantId, deletedAt: null },
      select: { leadScore: true, lifecycleStage: true },
    });

    const distribution = {
      cold: contacts.filter((c) => c.leadScore < 30).length,
      warm: contacts.filter((c) => c.leadScore >= 30 && c.leadScore < 60).length,
      hot: contacts.filter((c) => c.leadScore >= 60 && c.leadScore < 80).length,
      scorching: contacts.filter((c) => c.leadScore >= 80).length,
    };

    const byStage = contacts.reduce(
      (acc, c) => {
        acc[c.lifecycleStage] = (acc[c.lifecycleStage] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    sendSuccess(reply, { distribution, byStage });
  });

  // ─── Pipeline Summary ────────────────────────────────
  app.get("/pipeline/summary", async (request, reply) => {
    const tenantId = getTenantId(request);

    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId },
      include: {
        stages: {
          orderBy: { position: "asc" },
          include: {
            deals: {
              where: { deletedAt: null },
              select: { value: true, id: true },
            },
          },
        },
      },
    });

    const summary = pipelines.map((pipeline) => ({
      id: pipeline.id,
      name: pipeline.name,
      isDefault: pipeline.isDefault,
      stages: pipeline.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        position: stage.position,
        probability: stage.probability,
        dealCount: stage.deals.length,
        totalValue: stage.deals.reduce(
          (sum, d) => sum + Number(d.value),
          0
        ),
        weightedValue: stage.deals.reduce(
          (sum, d) => sum + Number(d.value) * (stage.probability / 100),
          0
        ),
      })),
    }));

    sendSuccess(reply, summary);
  });

  // ─── Campaign Performance ────────────────────────────
  app.get("/campaigns/performance", async (request, reply) => {
    const tenantId = getTenantId(request);

    const campaigns = await prisma.campaign.findMany({
      where: {
        tenantId,
        status: { in: ["SENT", "SENDING"] },
      },
      select: {
        id: true,
        name: true,
        type: true,
        sentAt: true,
        metrics: true,
        _count: { select: { recipients: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 10,
    });

    sendSuccess(reply, campaigns);
  });

  // ─── Campaign Detail Analytics ──────────────────────
  app.get("/campaigns/:id", async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };

    const campaign = await prisma.campaign.findFirst({
      where: { id, tenantId },
      include: {
        template: { select: { id: true, name: true } },
        segment: { select: { id: true, name: true, contactCount: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!campaign) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "Campaign not found" },
      });
    }

    // Get recipient status breakdown
    const recipientStats = await prisma.campaignRecipient.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: { id: true },
    });

    const statusBreakdown = recipientStats.reduce(
      (acc, r) => {
        acc[r.status] = r._count.id;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalRecipients = recipientStats.reduce(
      (sum, r) => sum + r._count.id,
      0
    );

    // Get top clicked links
    const topLinks = await prisma.campaignLinkClick.groupBy({
      by: ["url"],
      where: { campaignId: id },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // Get hourly open/click timeline (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentOpens = await prisma.campaignRecipient.findMany({
      where: {
        campaignId: id,
        openedAt: { gte: sevenDaysAgo },
      },
      select: { openedAt: true },
    });

    const recentClicks = await prisma.campaignLinkClick.findMany({
      where: {
        campaignId: id,
        clickedAt: { gte: sevenDaysAgo },
      },
      select: { clickedAt: true },
    });

    // Aggregate by day
    const timeline: Record<
      string,
      { date: string; opens: number; clicks: number }
    > = {};
    for (const r of recentOpens) {
      if (!r.openedAt) continue;
      const day = r.openedAt.toISOString().slice(0, 10);
      timeline[day] = timeline[day] ?? { date: day, opens: 0, clicks: 0 };
      timeline[day].opens++;
    }
    for (const c of recentClicks) {
      const day = c.clickedAt.toISOString().slice(0, 10);
      timeline[day] = timeline[day] ?? { date: day, opens: 0, clicks: 0 };
      timeline[day].clicks++;
    }

    const metrics = campaign.metrics as Record<string, number> | null;
    const sent = metrics?.sent ?? 0;
    const opened = metrics?.opened ?? 0;
    const clicked = metrics?.clicked ?? 0;
    const bounced = metrics?.bounced ?? 0;
    const unsubscribed = metrics?.unsubscribed ?? 0;
    const failed = metrics?.failed ?? 0;

    sendSuccess(reply, {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        type: campaign.type,
        status: campaign.status,
        subject: campaign.subjectLine,
        fromName: campaign.fromName,
        sentAt: campaign.sentAt,
        scheduledAt: campaign.scheduledAt,
        template: campaign.template,
        segment: campaign.segment,
        createdBy: campaign.createdBy,
      },
      metrics: {
        totalRecipients,
        sent,
        opened,
        clicked,
        bounced,
        unsubscribed,
        failed,
        openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0.0",
        clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : "0.0",
        clickToOpenRate:
          opened > 0 ? ((clicked / opened) * 100).toFixed(1) : "0.0",
        bounceRate: sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0.0",
        unsubscribeRate:
          sent > 0 ? ((unsubscribed / sent) * 100).toFixed(1) : "0.0",
      },
      statusBreakdown,
      topLinks: topLinks.map((l) => ({
        url: l.url,
        clicks: l._count.id,
      })),
      timeline: Object.values(timeline).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    });
  });

  // ─── Agent Activity ──────────────────────────────────
  app.get("/agents/activity", async (request, reply) => {
    const tenantId = getTenantId(request);

    const [logs, actionCounts] = await Promise.all([
      prisma.agentActionLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          agentType: true,
          action: true,
          status: true,
          durationMs: true,
          tokensUsed: true,
          modelUsed: true,
          confidence: true,
          triggeredBy: true,
          createdAt: true,
        },
      }),
      prisma.agentActionLog.groupBy({
        by: ["agentType"],
        where: { tenantId },
        _count: { id: true },
        _avg: { durationMs: true, confidence: true },
        _sum: { tokensUsed: true },
      }),
    ]);

    sendSuccess(reply, {
      recentActions: logs,
      agentStats: actionCounts.map((a) => ({
        agentType: a.agentType,
        totalActions: a._count.id,
        avgDurationMs: Math.round(a._avg.durationMs ?? 0),
        avgConfidence: Number((a._avg.confidence ?? 0).toFixed(2)),
        totalTokens: a._sum.tokensUsed ?? 0,
      })),
    });
  });
}
