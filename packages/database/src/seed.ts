import { PrismaClient } from "@prisma/client";
import { createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();

// Simple password hash for seed data (in production, use bcrypt from the API)
function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  console.log("Seeding database...");

  // ─── Clean existing seed data ──────────────────────────
  // Delete in reverse dependency order to avoid FK constraints
  const existingTenant = await prisma.tenant.findUnique({ where: { slug: "demo-company" } });
  if (existingTenant) {
    console.log("  Cleaning existing seed data...");
    const tid = existingTenant.id;
    await prisma.activity.deleteMany({ where: { tenantId: tid } });
    await prisma.task.deleteMany({ where: { tenantId: tid } });
    await prisma.note.deleteMany({ where: { tenantId: tid } });
    await prisma.deal.deleteMany({ where: { tenantId: tid } });
    await prisma.contact.deleteMany({ where: { tenantId: tid } });
    await prisma.company.deleteMany({ where: { tenantId: tid } });
    await prisma.audienceSegment.deleteMany({ where: { tenantId: tid } });
    await prisma.emailTemplate.deleteMany({ where: { tenantId: tid } });
    await prisma.pipelineStage.deleteMany({ where: { pipeline: { tenantId: tid } } });
    await prisma.pipeline.deleteMany({ where: { tenantId: tid } });
  }

  // ─── Tenant ──────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-company" },
    update: {},
    create: {
      name: "Demo Company",
      slug: "demo-company",
      plan: "growth",
      settings: {
        timezone: "Asia/Kolkata",
        currency: "INR",
        dateFormat: "DD/MM/YYYY",
      },
    },
  });
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);

  // ─── Users ───────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@demo.com",
      passwordHash: hashPassword("password123"),
      firstName: "Yash",
      lastName: "Admin",
      role: "admin",
    },
  });

  const salesRep = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "amit@demo.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "amit@demo.com",
      passwordHash: hashPassword("password123"),
      firstName: "Amit",
      lastName: "Sales",
      role: "member",
    },
  });

  const marketer = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "sneha@demo.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "sneha@demo.com",
      passwordHash: hashPassword("password123"),
      firstName: "Sneha",
      lastName: "Marketing",
      role: "manager",
    },
  });
  console.log(`  Users: ${admin.firstName}, ${salesRep.firstName}, ${marketer.firstName}`);

  // ─── Pipeline ────────────────────────────────────────
  const pipeline = await prisma.pipeline.create({
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
          { name: "Closed Won", position: 4, probability: 100, isWon: true },
          { name: "Closed Lost", position: 5, probability: 0, isLost: true },
        ],
      },
    },
    include: { stages: true },
  });
  console.log(`  Pipeline: ${pipeline.name} (${pipeline.stages.length} stages)`);

  // ─── Companies ───────────────────────────────────────
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        tenantId: tenant.id,
        ownerId: salesRep.id,
        name: "TechCorp India",
        domain: "techcorp.in",
        industry: "Technology",
        size: "LARGE",
        employeeCount: 150,
        country: "India",
        city: "Bangalore",
        website: "https://techcorp.in",
        techStack: ["React", "Node.js", "PostgreSQL", "AWS"],
      },
    }),
    prisma.company.create({
      data: {
        tenantId: tenant.id,
        ownerId: salesRep.id,
        name: "RetailMax",
        domain: "retailmax.com",
        industry: "Retail",
        size: "MEDIUM",
        employeeCount: 45,
        country: "India",
        city: "Mumbai",
        website: "https://retailmax.com",
      },
    }),
    prisma.company.create({
      data: {
        tenantId: tenant.id,
        name: "StartupHub",
        domain: "startuphub.io",
        industry: "SaaS",
        size: "SMALL",
        employeeCount: 12,
        country: "India",
        city: "Delhi",
      },
    }),
  ]);
  console.log(`  Companies: ${companies.map((c) => c.name).join(", ")}`);

  // ─── Contacts ────────────────────────────────────────
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        companyId: companies[0].id,
        ownerId: salesRep.id,
        firstName: "Ravi",
        lastName: "Kumar",
        email: "ravi@techcorp.in",
        phone: "+91-9876543210",
        title: "CTO",
        source: "LINKEDIN",
        status: "ACTIVE",
        leadScore: 82,
        lifecycleStage: "SQL",
        consentStatus: "OPTED_IN",
        consentDate: new Date(),
        consentSource: "web_form",
        tags: ["decision-maker", "tech-savvy"],
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        companyId: companies[0].id,
        ownerId: salesRep.id,
        firstName: "Priya",
        lastName: "Sharma",
        email: "priya@techcorp.in",
        title: "VP Engineering",
        source: "REFERRAL",
        status: "ACTIVE",
        leadScore: 65,
        lifecycleStage: "MQL",
        consentStatus: "OPTED_IN",
        consentDate: new Date(),
        consentSource: "import",
        tags: ["influencer"],
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        companyId: companies[1].id,
        ownerId: salesRep.id,
        firstName: "Arun",
        lastName: "Patel",
        email: "arun@retailmax.com",
        phone: "+91-9876543211",
        title: "Head of Operations",
        source: "WEB_FORM",
        status: "NEW",
        leadScore: 45,
        lifecycleStage: "LEAD",
        consentStatus: "OPTED_IN",
        consentDate: new Date(),
        consentSource: "web_form",
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        companyId: companies[2].id,
        firstName: "Meera",
        lastName: "Joshi",
        email: "meera@startuphub.io",
        title: "Founder",
        source: "WEBINAR",
        status: "ACTIVE",
        leadScore: 71,
        lifecycleStage: "OPPORTUNITY",
        consentStatus: "OPTED_IN",
        consentDate: new Date(),
        consentSource: "webinar_registration",
        tags: ["founder", "early-adopter"],
      },
    }),
    prisma.contact.create({
      data: {
        tenantId: tenant.id,
        firstName: "Kiran",
        lastName: "Desai",
        email: "kiran@freelance.dev",
        source: "COLD_OUTREACH",
        status: "NEW",
        leadScore: 20,
        lifecycleStage: "SUBSCRIBER",
        consentStatus: "PENDING",
      },
    }),
  ]);
  console.log(`  Contacts: ${contacts.map((c) => `${c.firstName} ${c.lastName}`).join(", ")}`);

  // ─── Deals ───────────────────────────────────────────
  const qualificationStage = pipeline.stages.find((s) => s.name === "Qualification")!;
  const proposalStage = pipeline.stages.find((s) => s.name === "Proposal")!;
  const negotiationStage = pipeline.stages.find((s) => s.name === "Negotiation")!;

  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        pipelineId: pipeline.id,
        stageId: negotiationStage.id,
        contactId: contacts[0].id,
        companyId: companies[0].id,
        ownerId: salesRep.id,
        title: "TechCorp CRM Implementation",
        value: 2500000,
        currency: "INR",
        expectedCloseDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        probability: 75,
        competitor: "Salesforce",
        tags: ["enterprise", "q1-target"],
      },
    }),
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        pipelineId: pipeline.id,
        stageId: proposalStage.id,
        contactId: contacts[2].id,
        companyId: companies[1].id,
        ownerId: salesRep.id,
        title: "RetailMax Campaign Automation",
        value: 800000,
        currency: "INR",
        expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        probability: 50,
      },
    }),
    prisma.deal.create({
      data: {
        tenantId: tenant.id,
        pipelineId: pipeline.id,
        stageId: qualificationStage.id,
        contactId: contacts[3].id,
        companyId: companies[2].id,
        title: "StartupHub Early Adopter Plan",
        value: 150000,
        currency: "INR",
        expectedCloseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        probability: 10,
        tags: ["startup-discount"],
      },
    }),
  ]);
  console.log(`  Deals: ${deals.map((d) => d.title).join(", ")}`);

  // ─── Email Templates ─────────────────────────────────
  const template = await prisma.emailTemplate.create({
    data: {
      tenantId: tenant.id,
      name: "Welcome Email",
      subject: "Welcome to {{company_name}}, {{first_name}}!",
      htmlBody: `<html><body>
<h1>Welcome, {{first_name}}!</h1>
<p>We're excited to have you on board at {{company_name}}.</p>
<p>Here's what you can do next:</p>
<ul>
  <li>Complete your profile</li>
  <li>Explore our features</li>
  <li>Schedule a demo with our team</li>
</ul>
<p>Best regards,<br>The {{company_name}} Team</p>
</body></html>`,
      textBody: "Welcome, {{first_name}}! We're excited to have you on board.",
      variables: ["first_name", "company_name"],
      category: "onboarding",
      tags: ["welcome", "automated"],
    },
  });
  console.log(`  Email Template: ${template.name}`);

  // ─── Audience Segment ────────────────────────────────
  const segment = await prisma.audienceSegment.create({
    data: {
      tenantId: tenant.id,
      name: "High-Value Leads",
      description: "Contacts with lead score > 60 and opted-in consent",
      type: "DYNAMIC",
      filterCriteria: {
        leadScore: { gte: 60 },
        consentStatus: "OPTED_IN",
        status: { not: "UNSUBSCRIBED" },
      },
      contactCount: 3,
    },
  });
  console.log(`  Segment: ${segment.name}`);

  // ─── Tasks ───────────────────────────────────────────
  await Promise.all([
    prisma.task.create({
      data: {
        tenantId: tenant.id,
        assignedToId: salesRep.id,
        createdById: admin.id,
        contactId: contacts[0].id,
        dealId: deals[0].id,
        title: "Follow up on TechCorp proposal",
        description: "Discuss pricing tiers and implementation timeline",
        type: "CALL",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.task.create({
      data: {
        tenantId: tenant.id,
        assignedToId: salesRep.id,
        createdById: salesRep.id,
        contactId: contacts[2].id,
        title: "Send RetailMax case studies",
        type: "EMAIL",
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        createdByAgent: true,
        agentType: "SALES",
      },
    }),
    prisma.task.create({
      data: {
        tenantId: tenant.id,
        assignedToId: marketer.id,
        createdById: admin.id,
        title: "Prepare Q1 campaign strategy",
        type: "CUSTOM",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);
  console.log("  Tasks: 3 created");

  // ─── Activities ──────────────────────────────────────
  await Promise.all([
    prisma.activity.create({
      data: {
        tenantId: tenant.id,
        contactId: contacts[0].id,
        userId: salesRep.id,
        type: "CALL_MADE",
        subject: "Discovery call with Ravi",
        description: "Discussed current CRM pain points. Very interested in AI features.",
        outcome: "completed",
      },
    }),
    prisma.activity.create({
      data: {
        tenantId: tenant.id,
        contactId: contacts[0].id,
        userId: salesRep.id,
        type: "EMAIL_SENT",
        subject: "Proposal: CRM AI Forge for TechCorp",
        description: "Sent detailed proposal with pricing for Growth plan.",
      },
    }),
    prisma.activity.create({
      data: {
        tenantId: tenant.id,
        contactId: contacts[3].id,
        type: "AGENT_ACTION",
        description: "Lead Agent scored contact at 71 based on webinar attendance + founder title",
        metadata: {
          agentType: "LEAD",
          action: "score_lead",
          confidence: 0.88,
          scoringDetails: {
            fit: 35,
            intent: 36,
          },
        },
      },
    }),
  ]);
  console.log("  Activities: 3 created");

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
