import { prisma } from "@crm-ai-forge/database";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

interface CampaignSendData {
  campaignId: string;
  recipientId: string;
  email: string;
}

export async function processCampaignSend(data: CampaignSendData) {
  const { campaignId, recipientId, email } = data;

  try {
    // Get campaign and template
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });

    if (!campaign || !campaign.template) {
      logger.error({ campaignId }, "Campaign or template not found");
      return;
    }

    // Check suppression list
    const unsubscribed = await prisma.unsubscribe.findFirst({
      where: { tenantId: campaign.tenantId, email },
    });

    if (unsubscribed) {
      logger.info({ email, campaignId }, "Skipping unsubscribed recipient");
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { status: "UNSUBSCRIBED" },
      });
      return;
    }

    // TODO: Integrate with actual email provider (SES, SendGrid, etc.)
    // For now, simulate sending
    logger.info({ email, campaignId }, "Sending email");

    // Update recipient status
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: "SENT",
        sentAt: new Date(),
      },
    });

    // Update campaign metrics
    await prisma.$executeRaw`
      UPDATE campaigns
      SET metrics = jsonb_set(
        metrics::jsonb,
        '{sent}',
        (COALESCE((metrics::jsonb->>'sent')::int, 0) + 1)::text::jsonb
      )
      WHERE id = ${campaignId}
    `;

    logger.info({ email, campaignId }, "Email sent successfully");
  } catch (error) {
    logger.error({ error, campaignId, recipientId }, "Failed to send email");

    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: "FAILED" },
    });

    throw error; // Re-throw for BullMQ retry
  }
}
