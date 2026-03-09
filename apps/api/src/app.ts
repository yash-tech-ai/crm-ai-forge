import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { env } from "./utils/env.js";
import { authRoutes } from "./routes/auth.js";
import { contactRoutes } from "./routes/contacts.js";
import { companyRoutes } from "./routes/companies.js";
import { dealRoutes } from "./routes/deals.js";
import { pipelineRoutes } from "./routes/pipelines.js";
import { taskRoutes } from "./routes/tasks.js";
import { campaignRoutes } from "./routes/campaigns.js";
import { templateRoutes } from "./routes/templates.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { noteRoutes } from "./routes/notes.js";
import { searchRoutes } from "./routes/search.js";
import { segmentRoutes } from "./routes/segments.js";
import { trackingRoutes } from "./routes/tracking.js";
import { sequenceRoutes } from "./routes/sequences.js";

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? { target: "pino-pretty", options: { colorize: true } }
          : undefined,
    },
  });

  // ─── Plugins ─────────────────────────────────────────
  await app.register(cors, {
    origin: env.CORS_ORIGIN.split(","),
    credentials: true,
  });

  await app.register(helmet);

  await app.register(sensible);

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "15m" },
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // ─── Health Check ────────────────────────────────────
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
  }));

  // ─── Routes ──────────────────────────────────────────
  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(contactRoutes, { prefix: "/api/v1/contacts" });
  await app.register(companyRoutes, { prefix: "/api/v1/companies" });
  await app.register(dealRoutes, { prefix: "/api/v1/deals" });
  await app.register(pipelineRoutes, { prefix: "/api/v1/pipelines" });
  await app.register(taskRoutes, { prefix: "/api/v1/tasks" });
  await app.register(campaignRoutes, { prefix: "/api/v1/campaigns" });
  await app.register(templateRoutes, { prefix: "/api/v1/templates" });
  await app.register(analyticsRoutes, { prefix: "/api/v1/analytics" });
  await app.register(noteRoutes, { prefix: "/api/v1/notes" });
  await app.register(searchRoutes, { prefix: "/api/v1/search" });
  await app.register(segmentRoutes, { prefix: "/api/v1/segments" });
  await app.register(trackingRoutes, { prefix: "/t" });
  await app.register(sequenceRoutes, { prefix: "/api/v1/sequences" });

  // ─── Global Error Handler ────────────────────────────
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error(error);
    }

    reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code ?? "INTERNAL_ERROR",
        message:
          env.NODE_ENV === "production" && statusCode >= 500
            ? "Internal server error"
            : error.message,
      },
    });
  });

  return app;
}
