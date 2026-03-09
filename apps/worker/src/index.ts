import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";
import {
  QUEUE_CAMPAIGN_SEND,
  QUEUE_CAMPAIGN_PROCESS,
  QUEUE_CONTACT_IMPORT,
  QUEUE_ENRICHMENT,
  QUEUE_AGENT_ACTION,
  QUEUE_SEQUENCE_STEP,
  QUEUE_ANALYTICS,
} from "@crm-ai-forge/shared";
import { processCampaignSend } from "./processors/campaign-send.js";
import { processContactImport } from "./processors/contact-import.js";
import {
  processSequenceStep,
  findDueEnrollments,
} from "./processors/sequence-step.js";
import { prisma } from "@crm-ai-forge/database";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

// ─── Campaign Send Worker ──────────────────────────────
const campaignWorker = new Worker(
  QUEUE_CAMPAIGN_SEND,
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, "Processing campaign send");
    await processCampaignSend(job.data);
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 50, duration: 1000 }, // 50 emails/sec
  }
);

// ─── Contact Import Worker ─────────────────────────────
const importWorker = new Worker(
  QUEUE_CONTACT_IMPORT,
  async (job) => {
    logger.info({ jobId: job.id }, "Processing contact import");
    await processContactImport(job.data);
  },
  {
    connection,
    concurrency: 1,
  }
);

// ─── Campaign Process Worker (orchestrates batch sending) ───
const campaignProcessWorker = new Worker(
  QUEUE_CAMPAIGN_PROCESS,
  async (job) => {
    logger.info({ jobId: job.id }, "Processing campaign batch");
    const sendQueue = new Queue(QUEUE_CAMPAIGN_SEND, { connection });
    const { campaignId, recipients } = job.data;

    for (const recipient of recipients) {
      await sendQueue.add("send-email", {
        campaignId,
        recipientId: recipient.id,
        email: recipient.email,
      });
    }

    await sendQueue.close();
    logger.info(
      { campaignId, count: recipients.length },
      "Campaign batch queued"
    );
  },
  { connection, concurrency: 2 }
);

// ─── Sequence Step Worker ──────────────────────────────
const sequenceWorker = new Worker(
  QUEUE_SEQUENCE_STEP,
  async (job) => {
    logger.info({ jobId: job.id }, "Processing sequence step");
    await processSequenceStep(job.data);
  },
  { connection, concurrency: 3 }
);

// ─── Scheduled Campaign Trigger (checks every 30s) ────
let schedulerInterval: ReturnType<typeof setInterval>;

async function checkScheduledCampaigns() {
  try {
    const dueCampaigns = await prisma.campaign.findMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { lte: new Date() },
      },
      select: {
        id: true,
        tenantId: true,
        segmentId: true,
      },
      take: 10,
    });

    if (dueCampaigns.length === 0) return;

    const sendQueue = new Queue(QUEUE_CAMPAIGN_SEND, { connection });

    for (const campaign of dueCampaigns) {
      logger.info(
        { campaignId: campaign.id },
        "Triggering scheduled campaign"
      );

      // Get recipients
      const recipients = await prisma.campaignRecipient.findMany({
        where: { campaignId: campaign.id, status: "QUEUED" },
        select: { id: true, email: true },
      });

      // Update campaign status
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "SENDING", sentAt: new Date() },
      });

      // Queue individual sends
      for (const recipient of recipients) {
        await sendQueue.add("send-email", {
          campaignId: campaign.id,
          recipientId: recipient.id,
          email: recipient.email,
        });
      }

      logger.info(
        { campaignId: campaign.id, recipientCount: recipients.length },
        "Scheduled campaign triggered"
      );
    }

    await sendQueue.close();
  } catch (err) {
    logger.error({ err }, "Scheduled campaign check failed");
  }
}

// ─── Sequence Enrollment Scheduler (checks every 30s) ──
async function checkDueSequenceSteps() {
  try {
    const dueIds = await findDueEnrollments();
    if (dueIds.length === 0) return;

    const sequenceQueue = new Queue(QUEUE_SEQUENCE_STEP, { connection });

    for (const enrollmentId of dueIds) {
      await sequenceQueue.add("execute-step", { enrollmentId });
    }

    await sequenceQueue.close();
    logger.info(
      { count: dueIds.length },
      "Due sequence enrollments queued"
    );
  } catch (err) {
    logger.error({ err }, "Sequence enrollment check failed");
  }
}

// ─── Start Scheduler ──────────────────────────────────
function startScheduler() {
  schedulerInterval = setInterval(async () => {
    await checkScheduledCampaigns();
    await checkDueSequenceSteps();
  }, 30_000); // Every 30 seconds

  // Run once immediately
  checkScheduledCampaigns();
  checkDueSequenceSteps();
  logger.info("Scheduler started (30s interval)");
}

// ─── Error Handling ────────────────────────────────────
for (const worker of [
  campaignWorker,
  importWorker,
  campaignProcessWorker,
  sequenceWorker,
]) {
  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Job failed");
  });

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Job completed");
  });
}

// ─── Graceful Shutdown ─────────────────────────────────
async function shutdown() {
  logger.info("Shutting down workers...");
  clearInterval(schedulerInterval);
  await Promise.all([
    campaignWorker.close(),
    importWorker.close(),
    campaignProcessWorker.close(),
    sequenceWorker.close(),
  ]);
  await connection.quit();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ─── Start ─────────────────────────────────────────────
startScheduler();

logger.info("CRM AI Forge workers started");
logger.info(
  {
    queues: [
      QUEUE_CAMPAIGN_SEND,
      QUEUE_CAMPAIGN_PROCESS,
      QUEUE_CONTACT_IMPORT,
      QUEUE_SEQUENCE_STEP,
    ],
  },
  "Listening on queues"
);
