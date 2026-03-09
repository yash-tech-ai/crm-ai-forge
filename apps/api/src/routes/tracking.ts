import type { FastifyInstance } from "fastify";
import { prisma } from "@crm-ai-forge/database";

/**
 * Email Tracking Routes (open pixel + click redirect)
 * These routes do NOT require authentication — they are hit by email clients.
 */
export async function trackingRoutes(app: FastifyInstance) {
  // ─── Open Tracking (1x1 transparent pixel) ─────────
  app.get("/open/:recipientId", async (request, reply) => {
    const { recipientId } = request.params as { recipientId: string };

    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: recipientId },
      });

      if (recipient && !recipient.openedAt) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: {
            status: "OPENED",
            openedAt: new Date(),
            openCount: { increment: 1 },
          },
        });

        // Update campaign metrics
        await prisma.$executeRaw`
          UPDATE campaigns
          SET metrics = jsonb_set(
            metrics::jsonb,
            '{opened}',
            (COALESCE((metrics::jsonb->>'opened')::int, 0) + 1)::text::jsonb
          )
          WHERE id = ${recipient.campaignId}
        `;
      } else if (recipient) {
        // Already opened — just increment count
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { openCount: { increment: 1 } },
        });
      }
    } catch (err) {
      // Don't fail the pixel response
      request.log.error({ err, recipientId }, "Open tracking error");
    }

    // Return 1x1 transparent GIF
    const pixel = Buffer.from(
      "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      "base64"
    );
    reply
      .type("image/gif")
      .header("Cache-Control", "no-cache, no-store, must-revalidate")
      .send(pixel);
  });

  // ─── Click Tracking (redirect) ─────────────────────
  app.get("/click/:recipientId", async (request, reply) => {
    const { recipientId } = request.params as { recipientId: string };
    const { url } = request.query as { url?: string };

    if (!url) {
      return reply.status(400).send("Missing url parameter");
    }

    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: recipientId },
      });

      if (recipient) {
        // Update recipient click tracking
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: {
            status: recipient.status === "OPENED" ? "CLICKED" : "CLICKED",
            clickedAt: recipient.clickedAt ?? new Date(),
            clickCount: { increment: 1 },
          },
        });

        // Record link click
        await prisma.campaignLinkClick.create({
          data: {
            campaignId: recipient.campaignId,
            recipientId,
            url,
            userAgent:
              (request.headers["user-agent"] as string) ?? null,
            ipAddress:
              (request.headers["x-forwarded-for"] as string) ??
              request.ip,
          },
        });

        // Update campaign metrics
        await prisma.$executeRaw`
          UPDATE campaigns
          SET metrics = jsonb_set(
            metrics::jsonb,
            '{clicked}',
            (COALESCE((metrics::jsonb->>'clicked')::int, 0) + 1)::text::jsonb
          )
          WHERE id = ${recipient.campaignId}
        `;
      }
    } catch (err) {
      request.log.error({ err, recipientId }, "Click tracking error");
    }

    // Redirect to the actual URL
    reply.redirect(302, url);
  });

  // ─── Unsubscribe ──────────────────────────────────
  app.get("/unsubscribe/:recipientId", async (request, reply) => {
    const { recipientId } = request.params as { recipientId: string };

    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: recipientId },
        include: {
          campaign: { select: { tenantId: true } },
          contact: { select: { id: true, email: true } },
        },
      });

      if (recipient && recipient.contact) {
        // Mark recipient as unsubscribed
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: {
            status: "UNSUBSCRIBED",
            unsubscribedAt: new Date(),
          },
        });

        // Add to unsubscribe list
        await prisma.unsubscribe.upsert({
          where: {
            tenantId_email: {
              tenantId: recipient.campaign.tenantId,
              email: recipient.contact.email,
            },
          },
          create: {
            tenantId: recipient.campaign.tenantId,
            contactId: recipient.contact.id,
            campaignId: recipient.campaignId,
            email: recipient.contact.email,
            reason: "One-click unsubscribe",
          },
          update: {},
        });

        // Update contact consent status
        await prisma.contact.update({
          where: { id: recipient.contact.id },
          data: {
            consentStatus: "OPTED_OUT",
            status: "UNSUBSCRIBED",
          },
        });

        // Update campaign metrics
        await prisma.$executeRaw`
          UPDATE campaigns
          SET metrics = jsonb_set(
            metrics::jsonb,
            '{unsubscribed}',
            (COALESCE((metrics::jsonb->>'unsubscribed')::int, 0) + 1)::text::jsonb
          )
          WHERE id = ${recipient.campaignId}
        `;
      }
    } catch (err) {
      request.log.error({ err, recipientId }, "Unsubscribe error");
    }

    // Show confirmation page
    reply.type("text/html").send(`
      <!DOCTYPE html>
      <html>
        <head><title>Unsubscribed</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 60px;">
          <h2>You have been unsubscribed</h2>
          <p>You will no longer receive marketing emails from us.</p>
          <p style="color: #666; font-size: 14px;">If this was a mistake, please contact us.</p>
        </body>
      </html>
    `);
  });
}
