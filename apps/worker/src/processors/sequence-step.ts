import { prisma } from "@crm-ai-forge/database";
import { createTransport, type Transporter } from "nodemailer";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

// ─── Email Transport (shared with campaign-send) ─────
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
  } else {
    transporter = createTransport({ jsonTransport: true });
  }
  return transporter;
}

function renderTemplate(
  template: string,
  context: Record<string, string | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = context[variable];
    return value !== undefined ? value : match;
  });
}

// ─── Step Types ──────────────────────────────────────
interface StepConfig {
  type: "email" | "delay" | "condition" | "task" | "update_field";
  config: Record<string, unknown>;
}

interface SequenceStepData {
  enrollmentId: string;
}

export async function processSequenceStep(data: SequenceStepData) {
  const { enrollmentId } = data;

  const enrollment = await prisma.sequenceEnrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      sequence: true,
      contact: {
        include: { company: true },
      },
    },
  });

  if (!enrollment || enrollment.status !== "ACTIVE") {
    logger.info({ enrollmentId }, "Enrollment not active, skipping");
    return;
  }

  const steps = enrollment.sequence.steps as unknown as StepConfig[];
  const currentStepIndex = enrollment.currentStep;

  if (currentStepIndex >= steps.length) {
    // All steps completed
    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    await prisma.automationSequence.update({
      where: { id: enrollment.sequenceId },
      data: { completedCount: { increment: 1 } },
    });
    logger.info({ enrollmentId }, "Sequence completed");
    return;
  }

  const step = steps[currentStepIndex];
  const contact = enrollment.contact;

  try {
    switch (step.type) {
      case "email": {
        await handleEmailStep(step.config, contact, enrollment.sequence.tenantId);
        break;
      }
      case "task": {
        await handleTaskStep(step.config, contact, enrollment.sequence.tenantId);
        break;
      }
      case "update_field": {
        await handleUpdateFieldStep(step.config, contact);
        break;
      }
      case "condition": {
        const shouldContinue = await evaluateCondition(step.config, contact);
        if (!shouldContinue) {
          await prisma.sequenceEnrollment.update({
            where: { id: enrollmentId },
            data: {
              status: "EXITED",
              exitReason: `Condition not met at step ${currentStepIndex + 1}`,
            },
          });
          logger.info(
            { enrollmentId, step: currentStepIndex },
            "Contact exited sequence due to condition"
          );
          return;
        }
        break;
      }
      case "delay": {
        // Delay steps just schedule the next action time
        break;
      }
    }

    // Advance to next step
    const nextStepIndex = currentStepIndex + 1;
    let nextActionAt: Date | null = null;

    if (nextStepIndex < steps.length) {
      const nextStep = steps[nextStepIndex];
      nextActionAt = new Date();

      if (nextStep.type === "delay") {
        const mins = (nextStep.config.minutes as number) ?? 0;
        const hrs = (nextStep.config.hours as number) ?? 0;
        const days = (nextStep.config.days as number) ?? 0;
        nextActionAt = new Date(
          nextActionAt.getTime() +
            (mins * 60 + hrs * 3600 + days * 86400) * 1000
        );
      }
    }

    await prisma.sequenceEnrollment.update({
      where: { id: enrollmentId },
      data: {
        currentStep: nextStepIndex,
        nextActionAt,
        ...(nextStepIndex >= steps.length
          ? { status: "COMPLETED", completedAt: new Date() }
          : {}),
      },
    });

    if (nextStepIndex >= steps.length) {
      await prisma.automationSequence.update({
        where: { id: enrollment.sequenceId },
        data: { completedCount: { increment: 1 } },
      });
    }

    logger.info(
      {
        enrollmentId,
        completedStep: currentStepIndex,
        nextStep: nextStepIndex,
        nextActionAt,
      },
      "Sequence step completed"
    );
  } catch (error) {
    logger.error(
      { error, enrollmentId, step: currentStepIndex },
      "Sequence step failed"
    );
    throw error;
  }
}

// ─── Step Handlers ───────────────────────────────────

async function handleEmailStep(
  config: Record<string, unknown>,
  contact: { firstName: string; lastName: string; email: string; company?: { name: string } | null },
  tenantId: string
) {
  const templateId = config.templateId as string;
  const subject = config.subject as string | undefined;

  let htmlBody = config.htmlBody as string | undefined;
  let emailSubject = subject ?? "Message from us";

  if (templateId) {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, tenantId },
    });
    if (template) {
      htmlBody = template.htmlBody;
      emailSubject = template.subject;
    }
  }

  if (!htmlBody) {
    logger.warn({ templateId }, "No email body found for sequence step");
    return;
  }

  const context: Record<string, string | undefined> = {
    first_name: contact.firstName,
    last_name: contact.lastName,
    full_name: `${contact.firstName} ${contact.lastName}`,
    email: contact.email,
    company_name: contact.company?.name,
    current_date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    current_year: new Date().getFullYear().toString(),
  };

  const renderedSubject = renderTemplate(emailSubject, context);
  const renderedHtml = renderTemplate(htmlBody, context);

  const fromEmail =
    process.env.DEFAULT_FROM_EMAIL ?? "noreply@crm-ai-forge.local";
  const fromName = process.env.DEFAULT_FROM_NAME ?? "CRM AI Forge";

  const transport = getTransporter();
  await transport.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: contact.email,
    subject: renderedSubject,
    html: renderedHtml,
  });

  logger.info(
    { to: contact.email, subject: renderedSubject },
    "Sequence email sent"
  );
}

async function handleTaskStep(
  config: Record<string, unknown>,
  contact: { id: string },
  tenantId: string
) {
  const title = (config.title as string) ?? "Follow up";
  const description = config.description as string | undefined;
  const dueDays = (config.dueDays as number) ?? 1;
  const assignToId = config.assignToId as string | undefined;

  // Get a default user for task creation
  const defaultUser = await prisma.user.findFirst({
    where: { tenantId, role: "ADMIN" },
    select: { id: true },
  });

  if (!defaultUser) return;

  await prisma.task.create({
    data: {
      tenantId,
      title,
      description,
      contactId: contact.id,
      assignedToId: assignToId ?? defaultUser.id,
      createdById: defaultUser.id,
      type: "FOLLOW_UP",
      priority: "MEDIUM",
      dueDate: new Date(Date.now() + dueDays * 86400000),
      createdByAgent: true,
      agentType: "SEQUENCE_AGENT",
    },
  });

  logger.info({ contactId: contact.id, title }, "Sequence task created");
}

async function handleUpdateFieldStep(
  config: Record<string, unknown>,
  contact: { id: string }
) {
  const field = config.field as string;
  const value = config.value as string;

  if (!field || value === undefined) return;

  const allowedFields = [
    "lifecycleStage",
    "status",
    "leadScore",
    "tags",
  ];

  if (!allowedFields.includes(field)) {
    logger.warn({ field }, "Attempted to update disallowed field in sequence");
    return;
  }

  const updateData: Record<string, unknown> = {};

  if (field === "leadScore") {
    updateData[field] = parseInt(value, 10);
  } else if (field === "tags") {
    const currentContact = await prisma.contact.findUnique({
      where: { id: contact.id },
      select: { tags: true },
    });
    const currentTags = currentContact?.tags ?? [];
    const newTags = [...new Set([...currentTags, value])];
    updateData[field] = newTags;
  } else {
    updateData[field] = value;
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: updateData,
  });

  logger.info({ contactId: contact.id, field, value }, "Contact field updated by sequence");
}

async function evaluateCondition(
  config: Record<string, unknown>,
  contact: { id: string }
): Promise<boolean> {
  const field = config.field as string;
  const operator = config.operator as string;
  const value = config.value as string;

  if (!field || !operator) return true;

  const freshContact = await prisma.contact.findUnique({
    where: { id: contact.id },
    include: { company: true },
  });

  if (!freshContact) return false;

  const fieldValue = (freshContact as Record<string, unknown>)[field];

  switch (operator) {
    case "equals":
      return String(fieldValue) === value;
    case "not_equals":
      return String(fieldValue) !== value;
    case "contains":
      return String(fieldValue ?? "").includes(value);
    case "greater_than":
      return Number(fieldValue) > Number(value);
    case "less_than":
      return Number(fieldValue) < Number(value);
    case "exists":
      return fieldValue !== null && fieldValue !== undefined;
    default:
      return true;
  }
}

// ─── Scheduler: find due enrollments ─────────────────
export async function findDueEnrollments(): Promise<string[]> {
  const dueEnrollments = await prisma.sequenceEnrollment.findMany({
    where: {
      status: "ACTIVE",
      nextActionAt: { lte: new Date() },
    },
    select: { id: true },
    take: 100,
  });

  return dueEnrollments.map((e) => e.id);
}
