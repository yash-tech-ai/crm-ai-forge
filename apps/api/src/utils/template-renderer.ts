/**
 * Template Variable Interpolation Engine
 *
 * Replaces {{variable}} placeholders in email templates with contact/campaign data.
 */

interface TemplateContext {
  // Contact fields
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  department?: string;
  lead_score?: string;
  lifecycle_stage?: string;

  // Company fields
  company_name?: string;
  company_domain?: string;
  company_industry?: string;

  // Campaign fields
  campaign_name?: string;
  from_name?: string;

  // Utility
  current_date?: string;
  current_year?: string;
  unsubscribe_url?: string;

  // Custom fields
  [key: string]: string | undefined;
}

/**
 * Renders a template string by replacing {{variable}} placeholders.
 * Unknown variables are left as-is to avoid breaking the template.
 */
export function renderTemplate(template: string, context: TemplateContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
    const value = context[variable];
    return value !== undefined ? value : match;
  });
}

/**
 * Builds a template context from contact, company, and campaign data.
 */
export function buildTemplateContext(
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
  company?: {
    name: string;
    domain?: string | null;
    industry?: string | null;
  } | null,
  campaign?: {
    name?: string;
    fromName?: string | null;
  } | null,
  unsubscribeUrl?: string
): TemplateContext {
  const context: TemplateContext = {
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

  // Merge custom fields
  if (contact.customFields && typeof contact.customFields === "object") {
    for (const [key, val] of Object.entries(contact.customFields)) {
      if (typeof val === "string" || typeof val === "number") {
        context[key] = String(val);
      }
    }
  }

  return context;
}

/**
 * Extracts variable names from a template string.
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
}
