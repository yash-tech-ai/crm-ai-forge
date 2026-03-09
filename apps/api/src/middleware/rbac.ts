import type { FastifyRequest, FastifyReply } from "fastify";

type Role = "admin" | "manager" | "member";

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  manager: 2,
  member: 1,
};

/**
 * Creates a middleware that restricts access to users with the specified role or higher.
 * Must be used after the authenticate middleware.
 *
 * Usage:
 *   app.addHook("preHandler", requireRole("admin"));
 *   app.addHook("preHandler", requireRole("manager")); // allows manager + admin
 */
export function requireRole(minimumRole: Role) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.currentUser;
    if (!user) {
      return reply.status(401).send({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[user.role as Role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userRoleLevel < requiredLevel) {
      return reply.status(403).send({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `This action requires ${minimumRole} role or higher`,
        },
      });
    }
  };
}
