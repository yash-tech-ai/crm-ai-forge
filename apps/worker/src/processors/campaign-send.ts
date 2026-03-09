import { prisma } from "@crm-ai-forge/database";
import { createTransport, type Transporter } from "nodemailer";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

// ─── Template Renderer ──────────────────────────────────
function renderTemplate(
  template: string,
  context: Record<string, string | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = context[variable];
    return value !== undefined ? value : match;
  });
}

function buildTemplateContext(
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    title?: string | null;
    department?: string | null;
    leadScore?: number;
    lifecycleStage?: string;
    customFields?: Record<string, unknown>;
  },
  company?: { name: string; domain?: string | null; industry?: string | null } | null,
  campaign?: { name?: string; fromName?: string | null } | null,
  unsubscribeUrl?: string
): Record<string, string | undefined> {
  const context: Record<string, string | undefined> = {
    first_name: contact.firstName,
    last_name: contact.lastName,
    full_name: `${contact.firstName} ${contact.lastName}`,
    email: contact.email,
    phone: contact.phone ?? undefined,
    title: contact.title ?? undefined,
    department: contact.department ?? undefined,
    lead_score: contact.leadScore?.toString(),
    lifecycle_stage: contact.lifecycleStage?.replace(/_/g, " "),
    company_name: company?.name,
    company_domain: company?.domain ?? undefined,
    company_industry: company?.industry ?? undefined,
    campaign_name: campaign?.name,
    from_name: campaign?.fromName ?? undefined,
    current_date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    current_year: new Date().getFullYear().toString(),
    unsubscribe_url: unsubscribeUrl,
  };

  if (contact.customFields && typeof contact.customFields === "object") {
    for (const [key, val] of Object.entries(contact.customFields)) {
      if (typeof val === "string" || typeof val === "number") {
        context[key] = String(val);
      }
    }
  }

  return context;
}

// ─── Email Transport ────────────────────────────────────
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    logger.info({ host, port }, "SMTP transporter configured");
  } else {
    transporter = createTransport({ jsonTransport: true });
    logger.warn("No SMTP configured — emails will be logged only (dev mode)");
  }

  return transporter;
}

// ─── Campaign Send Processor ────────────────────────────
interface CampaignSendData {
  campaignId: string;
  recipientId: string;
  email: string;
}

export async function processCampaignSend(data: CampaignSendData) {
  const { campaignId, recipientId, email } = data;
  const appUrl = process.env.APP_URL ?? "http://localhost:3001";

  try {
    // Get campaign with template
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

    // Get contact + company for template rendering
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
      include: {
        contact: {
          include: { company: true },
        },
      },
    });

    if (!recipient || !recipient.contact) {
      logger.error({ recipientId }, "Recipient or contact not found");
      return;
    }

    const contact = recipient.contact;
    const unsubscribeUrl = `${appUrl}/t/unsubscribe/${recipientId}`;
    const openTrackingUrl = `${appUrl}/t/open/${recipientId}`;

    // Build template context and render
    const context = buildTemplateContext(
      contact,
      contact.company,
      campaign,
      unsubscribeUrl
    );

    const renderedSubject = renderTemplate(campaign.template.subject, context);
    let renderedHtml = renderTemplate(campaign.template.htmlBody, context);
    const renderedText = campaign.template.textBody
      ? renderTemplate(campaign.template.textBody, context)
      : undefined;

    // Inject open tracking pixel before </body>
    const trackingPixel = `<img src="${openTrackingUrl}" width="1" height="1" alt="" style="display:none" />`;
    if (renderedHtml.includes("</body>")) {
      renderedHtml = renderedHtml.replace("</body>", `${trackingPixel}</body>`);
    } else {
      renderedHtml += trackingPixel;
    }

    // Rewrite links for click tracking
    renderedHtml = renderedHtml.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match, url) => {
        // Don't track unsubscribe links
        if (url.includes("/t/unsubscribe/")) return match;
        const trackUrl = `${appUrl}/t/click/${recipientId}?url=${encodeURIComponent(url)}`;
        return `href="${trackUrl}"`;
      }
    );

    // Send the email
    const fromEmail =
      process.env.DEFAULT_FROM_EMAIL ?? "noreply@crm-ai-forge.local";
    const fromName =
      campaign.fromName ??
      process.env.DEFAULT_FROM_NAME ??
      "CRM AI Forge";

    const transport = getTransporter();
    const result = await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      replyTo: campaign.replyTo ?? undefined,
      subject: renderedSubject,
      html: renderedHtml,
      text: renderedText,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    // In dev mode, log the email content
    if (!process.env.SMTP_HOST) {
      logger.info(
        { to: email, subject: renderedSubject, messageId: result.messageId },
        "Email logged (dev mode)"
      );
    }

    // Update recipient status
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        metadata: { messageId: result.messageId ?? null },
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

    logger.info({ email, campaignId, messageId: result.messageId }, "Email sent");
  } catch (error) {
    logger.error({ error, campaignId, recipientId }, "Failed to send email");

    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: "FAILED" },
    });

    // Update failed metric
    await prisma.$executeRaw`
      UPDATE campaigns
      SET metrics = jsonb_set(
        metrics::jsonb,
        '{failed}',
        (COALESCE((metrics::jsonb->>'failed')::int, 0) + 1)::text::jsonb
      )
      WHERE id = ${campaignId}
    `;

    throw error; // Re-throw for BullMQ retry
  }
}
