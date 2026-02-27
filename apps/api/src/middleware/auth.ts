import type { FastifyRequest, FastifyReply } from "fastify";
import type { JwtPayload } from "@crm-ai-forge/shared";

// Extend Fastify's request type
declare module "fastify" {
  interface FastifyRequest {
    currentUser?: JwtPayload;
  }
}

/**
 * Authentication middleware — verifies JWT and attaches user payload to request.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const payload = await request.jwtVerify<JwtPayload>();
    request.currentUser = payload;
  } catch {
    reply.status(401).send({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
    });
  }
}

/**
 * Extracts tenant ID from the authenticated user's JWT payload.
 * Must be called after authenticate middleware.
 */
export function getTenantId(request: FastifyRequest): string {
  const tenantId = request.currentUser?.tenantId;
  if (!tenantId) {
    throw new Error("Tenant ID not found in request — is authenticate middleware applied?");
  }
  return tenantId;
}

/**
 * Extracts user ID from the authenticated user's JWT payload.
 */
export function getUserId(request: FastifyRequest): string {
  const userId = request.currentUser?.userId;
  if (!userId) {
    throw new Error("User ID not found in request — is authenticate middleware applied?");
  }
  return userId;
}
