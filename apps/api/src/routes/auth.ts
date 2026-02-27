import type { FastifyInstance } from "fastify";
import { hash, compare } from "bcryptjs";
import { prisma } from "@crm-ai-forge/database";
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  BCRYPT_ROUNDS,
} from "@crm-ai-forge/shared";
import type { JwtPayload } from "@crm-ai-forge/shared";
import { validate, sendSuccess } from "../utils/response.js";
import { env } from "../utils/env.js";
import { authenticate } from "../middleware/auth.js";
import { createSigner, createVerifier } from "fast-jwt";

// Refresh token signer/verifier (separate from access token)
let signRefresh: (payload: JwtPayload) => string;
let verifyRefresh: (token: string) => JwtPayload;

function getRefreshSigner() {
  if (!signRefresh) {
    signRefresh = createSigner({
      key: env.JWT_REFRESH_SECRET,
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });
  }
  return signRefresh;
}

function getRefreshVerifier() {
  if (!verifyRefresh) {
    verifyRefresh = createVerifier({ key: env.JWT_REFRESH_SECRET });
  }
  return verifyRefresh;
}

export async function authRoutes(app: FastifyInstance) {
  // ─── Register ────────────────────────────────────────
  app.post("/register", async (request, reply) => {
    const body = validate(registerSchema, request.body);

    // Check if user already exists (across all tenants for simplicity)
    const existing = await prisma.user.findFirst({
      where: { email: body.email },
    });
    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: "CONFLICT", message: "Email already registered" },
      });
    }

    const passwordHash = await hash(body.password, BCRYPT_ROUNDS);

    // Create tenant + user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: body.tenantName,
          slug: body.tenantName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          role: "admin",
        },
      });

      // Create default pipeline
      await tx.pipeline.create({
        data: {
          tenantId: tenant.id,
          name: "Sales Pipeline",
          isDefault: true,
          stages: {
            create: [
              { name: "Qualification", position: 0, probability: 10 },
              { name: "Discovery", position: 1, probability: 25 },
              { name: "Proposal", position: 2, probability: 50 },
              { name: "Negotiation", position: 3, probability: 75 },
              {
                name: "Closed Won",
                position: 4,
                probability: 100,
                isWon: true,
              },
              {
                name: "Closed Lost",
                position: 5,
                probability: 0,
                isLost: true,
              },
            ],
          },
        },
      });

      return { tenant, user };
    });

    const payload: JwtPayload = {
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: result.user.role as JwtPayload["role"],
    };

    const accessToken = app.jwt.sign(payload);
    const refreshToken = getRefreshSigner()(payload);

    sendSuccess(
      reply,
      {
        accessToken,
        refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
        },
        tenant: {
          id: result.tenant.id,
          name: result.tenant.name,
          slug: result.tenant.slug,
        },
      },
      201
    );
  });

  // ─── Login ───────────────────────────────────────────
  app.post("/login", async (request, reply) => {
    const body = validate(loginSchema, request.body);

    const user = await prisma.user.findFirst({
      where: { email: body.email, isActive: true },
      include: { tenant: true },
    });

    if (!user || !(await compare(body.password, user.passwordHash))) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid credentials" },
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role as JwtPayload["role"],
    };

    const accessToken = app.jwt.sign(payload);
    const refreshToken = getRefreshSigner()(payload);

    sendSuccess(reply, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
      },
    });
  });

  // ─── Refresh ─────────────────────────────────────────
  app.post("/refresh", async (request, reply) => {
    const { refreshToken } = validate(refreshTokenSchema, request.body);

    try {
      const decoded = getRefreshVerifier()(refreshToken);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || !user.isActive) {
        return reply.status(401).send({
          success: false,
          error: { code: "UNAUTHORIZED", message: "User not found or inactive" },
        });
      }

      const payload: JwtPayload = {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role as JwtPayload["role"],
      };

      const newAccessToken = app.jwt.sign(payload);
      const newRefreshToken = getRefreshSigner()(payload);

      sendSuccess(reply, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch {
      reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid refresh token" },
      });
    }
  });

  // ─── Me ──────────────────────────────────────────────
  app.get("/me", { preHandler: [authenticate] }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.currentUser!.userId },
      include: { tenant: true },
    });

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: "NOT_FOUND", message: "User not found" },
      });
    }

    sendSuccess(reply, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        slug: user.tenant.slug,
        plan: user.tenant.plan,
      },
    });
  });
}
