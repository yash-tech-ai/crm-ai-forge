/**
 * Segment Filter Engine
 *
 * Converts JSON filter criteria from the AudienceSegment model
 * into Prisma where clauses for querying contacts.
 *
 * Supported filter criteria format:
 * {
 *   status: "ACTIVE",                        // exact match
 *   source: ["WEB_FORM", "REFERRAL"],        // IN array
 *   lifecycleStage: "MQL",                   // exact match
 *   leadScore: { gte: 50 },                  // range
 *   leadScore: { gte: 30, lte: 80 },         // range
 *   tags: ["enterprise", "fintech"],          // hasSome
 *   consentStatus: "OPTED_IN",               // exact match
 *   createdAt: { gte: "2024-01-01" },        // date range
 *   lastEngagedAt: { gte: "2024-06-01" },    // date range
 *   companyId: "clxx...",                     // exact match
 *   ownerId: "clxx...",                       // exact match
 * }
 */

type FilterCriteria = Record<string, unknown>;

export function buildSegmentFilter(criteria: FilterCriteria, tenantId: string): any {
  const where: any = {
    tenantId,
    deletedAt: null,
  };

  for (const [key, value] of Object.entries(criteria)) {
    if (value === undefined || value === null || value === "") continue;

    switch (key) {
      // Exact match fields
      case "status":
      case "source":
      case "lifecycleStage":
      case "consentStatus":
      case "companyId":
      case "ownerId":
        if (Array.isArray(value)) {
          where[key] = { in: value };
        } else {
          where[key] = value;
        }
        break;

      // Numeric range fields
      case "leadScore":
        if (typeof value === "object" && value !== null) {
          const range: any = {};
          const v = value as Record<string, number>;
          if (v.gte !== undefined) range.gte = v.gte;
          if (v.lte !== undefined) range.lte = v.lte;
          if (v.gt !== undefined) range.gt = v.gt;
          if (v.lt !== undefined) range.lt = v.lt;
          where[key] = range;
        } else if (typeof value === "number") {
          where[key] = { gte: value };
        }
        break;

      // Date range fields
      case "createdAt":
      case "lastEngagedAt":
      case "lastContactedAt":
      case "enrichedAt":
        if (typeof value === "object" && value !== null) {
          const range: any = {};
          const v = value as Record<string, string>;
          if (v.gte) range.gte = new Date(v.gte);
          if (v.lte) range.lte = new Date(v.lte);
          if (v.gt) range.gt = new Date(v.gt);
          if (v.lt) range.lt = new Date(v.lt);
          where[key] = range;
        }
        break;

      // Array fields (hasSome)
      case "tags":
        if (Array.isArray(value) && value.length > 0) {
          where.tags = { hasSome: value };
        }
        break;

      // Text search fields
      case "search":
        if (typeof value === "string" && value.length > 0) {
          where.OR = [
            { firstName: { contains: value, mode: "insensitive" } },
            { lastName: { contains: value, mode: "insensitive" } },
            { email: { contains: value, mode: "insensitive" } },
          ];
        }
        break;

      default:
        // Skip unknown fields
        break;
    }
  }

  return where;
}
