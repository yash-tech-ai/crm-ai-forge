import type { ZodSchema, ZodError } from "zod";
import type { FastifyReply } from "fastify";
import type { ApiResponse, PaginatedResponse } from "@crm-ai-forge/shared";

/**
 * Validates request data against a Zod schema.
 * Returns the parsed data or throws a 400 error.
 */
export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const error = new Error("Validation failed") as Error & {
      statusCode: number;
      code: string;
      details: ZodError["errors"];
    };
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    (error as any).details = result.error.errors;
    throw error;
  }
  return result.data;
}

/**
 * Sends a success response.
 */
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  statusCode = 200
): void {
  const response: ApiResponse<T> = { success: true, data };
  reply.status(statusCode).send(response);
}

/**
 * Sends a paginated response.
 */
export function sendPaginated<T>(
  reply: FastifyReply,
  data: T[],
  total: number,
  page: number,
  limit: number
): void {
  const response: PaginatedResponse<T> = {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
  reply.status(200).send({ success: true, ...response });
}

/**
 * Sends a 404 not found response.
 */
export function sendNotFound(reply: FastifyReply, resource: string): void {
  reply.status(404).send({
    success: false,
    error: { code: "NOT_FOUND", message: `${resource} not found` },
  });
}
