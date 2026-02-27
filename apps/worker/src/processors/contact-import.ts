import { prisma } from "@crm-ai-forge/database";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

interface ContactImportData {
  tenantId: string;
  userId: string;
  contacts: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    title?: string;
    company?: string;
    source?: string;
    tags?: string[];
  }>;
}

export async function processContactImport(data: ContactImportData) {
  const { tenantId, userId, contacts } = data;

  logger.info(
    { tenantId, count: contacts.length },
    "Starting contact import"
  );

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of contacts) {
    try {
      // Check for duplicate
      const existing = await prisma.contact.findFirst({
        where: { tenantId, email: row.email, deletedAt: null },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Auto-associate with company by domain
      let companyId: string | undefined;
      const emailDomain = row.email.split("@")[1];

      if (emailDomain) {
        const company = await prisma.company.findFirst({
          where: { tenantId, domain: emailDomain, deletedAt: null },
        });
        if (company) {
          companyId = company.id;
        }
      }

      await prisma.contact.create({
        data: {
          tenantId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          title: row.title,
          companyId,
          source: "IMPORT",
          status: "NEW",
          tags: row.tags ?? [],
          consentStatus: "PENDING",
        },
      });

      imported++;
    } catch (error) {
      errors++;
      logger.error(
        { error, email: row.email },
        "Failed to import contact"
      );
    }
  }

  // Log import activity
  await prisma.activity.create({
    data: {
      tenantId,
      userId,
      type: "AGENT_ACTION",
      description: `Contact import completed: ${imported} imported, ${skipped} skipped, ${errors} errors`,
      metadata: { imported, skipped, errors, total: contacts.length },
    },
  });

  logger.info(
    { tenantId, imported, skipped, errors },
    "Contact import completed"
  );
}
