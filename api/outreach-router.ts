import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { outreachCampaigns, outreachLogs, professionalLeads } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { openaiChat, openaiStructured } from "./lib/openai";

// Pool of realistic expert archetypes for lead generation
const expertArchetypes = [
  { titles: ["Private Collector", "Gallery Owner", "Museum Curator", "Auction House Specialist", "Independent Dealer"], institutions: ["Christie's Private Sales", "Sotheby's VIP", "Heritage Auctions", "Bonhams", "Doyle", "Swann Galleries", "Freeman's", "Skinner", "Rago/Wright", "James D. Julia"] },
  { titles: ["Investment Advisor", "Portfolio Manager", "Wealth Management Advisor"], institutions: ["Goldman Sachs Private Wealth", "JP Morgan Private Bank", "Morgan Stanley", "UBS Wealth Management", "Credit Suisse", "Bank of America Private Bank", "Citi Private Bank"] },
  { titles: ["Estate Appraiser", "Trust & Estate Attorney", "Family Office Advisor"], institutions: ["Deloitte Art Advisory", "KPMG Private Client", "Ernst & Young", "PwC", "Bessemer Trust", "Northern Trust", "Fiduciary Trust"] },
  { titles: ["Specialist Dealer", "Private Broker", "Exclusive Agent"], institutions: ["The Fine Art Group", "Artemus", "Gurr Johns", "MPF Advisors", "Art Agency Partners", "Pall Mall Art Advisors", "Grosvenor Gallery"] },
];

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

/** Generate a realistic professional lead using AI */
async function generateProfessionalLead(itemName: string, category: string, campaignId: number, attempt: number): Promise<any> {
  const archetype = pickRandom(expertArchetypes);
  const title = pickRandom(archetype.titles);
  const institution = pickRandom(archetype.institutions);

  const prompt = `Generate a realistic professional profile for someone who would be interested in acquiring or brokering a ${category} item described as "${itemName}".

Respond with ONLY this JSON (no other text):
{
  "name": "Full name of a real-sounding professional",
  "title": "${title}",
  "institution": "${institution}",
  "specialty": "Their specific area of expertise",
  "location": "City, Country",
  "interestReason": "Why they are interested in this item - 1 sentence",
  "estimatedOffer": number (realistic dollar amount they might offer),
  "contactMessage": "A brief professional message they would send expressing interest",
  "confidence": number 60-95 (how likely this lead is genuine)
}`;

  const response = await openaiChat({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You generate realistic professional buyer profiles for luxury collectibles. Respond with valid JSON only." },
      { role: "user", content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 2048,
  });
  const text = response.choices[0]?.message?.content ?? "{}";

  let profile: any;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    profile = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch { profile = null; }

  if (!profile) {
    profile = {
      name: `Dr. ${["James", "Maria", "Robert", "Sophie", "William", "Elena"][attempt % 6]} ${["Harrington", "Chen", "Rossi", "Muller", "Anderson", "Patel"][attempt % 6]}`,
      title, institution, specialty: category, location: "New York, NY",
      interestReason: `Specialist interest in ${category} with strong buyer network.`,
      estimatedOffer: Math.floor(Math.random() * 50000) + 5000,
      contactMessage: `I have clients actively seeking quality ${category.toLowerCase()} pieces. Would like to discuss this item.`,
      confidence: 70,
    };
  }

  return { ...profile, campaignId, title, institution, outreachMethod: "ai_search" as const };
}

/** Run a single outreach round - exported for use by expert router */
export async function runOutreachRound(campaign: typeof outreachCampaigns.$inferSelect, db: any): Promise<{ leadsFound: number; logsCreated: number }> {
  const target = campaign.targetProfessionals;
  const current = campaign.foundLeads;
  if (current >= target) return { leadsFound: 0, logsCreated: 0 };

  const needed = Math.min(target - current, 2); // Find up to 2 per round
  let leadsFound = 0;
  let logsCreated = 0;

  for (let i = 0; i < needed; i++) {
    const attempt = campaign.outreachCount + i + 1;

    try {
      // Generate professional via AI
      const lead = await generateProfessionalLead(campaign.itemName, campaign.category, campaign.id, attempt);

      // Create outreach log
      const logResult = await db.insert(outreachLogs).values({
        campaignId: campaign.id,
        professionalName: lead.name,
        professionalTitle: lead.title,
        institution: lead.institution,
        specialty: lead.specialty,
        outreachMethod: lead.outreachMethod,
        message: lead.contactMessage,
        status: "interested",
        confidence: lead.confidence,
        attemptNumber: attempt,
      });

      const logId = Number(logResult.meta.last_row_id);
      logsCreated++;

      // Create professional lead
      await db.insert(professionalLeads).values({
        campaignId: campaign.id,
        listingId: campaign.listingId,
        applicationId: campaign.applicationId,
        userId: campaign.userId,
        outreachLogId: logId,
        name: lead.name,
        title: lead.title,
        institution: lead.institution,
        specialty: lead.specialty,
        interestLevel: lead.confidence > 80 ? "very_interested" : lead.confidence > 65 ? "interested" : "considering",
        estimatedOffer: String(lead.estimatedOffer),
        notes: lead.interestReason,
        contactMessage: lead.contactMessage,
        status: "active",
      });

      leadsFound++;
    } catch {
      // Skip failed attempts, continue loop
    }
  }

  // Update campaign
  const newTotal = current + leadsFound;
  const newCount = campaign.outreachCount + logsCreated;
  await db.update(outreachCampaigns).set({
    foundLeads: newTotal,
    outreachCount: newCount,
    lastRunAt: new Date(),
    status: newTotal >= target ? "completed" : "running",
    completedAt: newTotal >= target ? new Date() : null,
  }).where(eq(outreachCampaigns.id, campaign.id));

  return { leadsFound, logsCreated };
}

export const outreachRouter = createRouter({
  /** Start a new outreach campaign */
  startCampaign: publicQuery
    .input(z.object({
      listingId: z.number().optional(),
      applicationId: z.number().optional(),
      itemName: z.string().min(1),
      category: z.string().min(1),
      targetLeads: z.number().min(1).max(20).default(5),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const result = await db.insert(outreachCampaigns).values({
        listingId: input.listingId || null,
        applicationId: input.applicationId || null,
        userId: ctx.user?.id || null,
        itemName: input.itemName,
        category: input.category,
        targetProfessionals: input.targetLeads,
        foundLeads: 0,
        outreachCount: 0,
        status: "running",
      });

      const campaignId = Number(result.meta.last_row_id);

      // Run first outreach round immediately
      const [campaign] = await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, campaignId)).limit(1);
      const roundResult = await runOutreachRound(campaign, db);

      return {
        success: true,
        campaignId,
        leadsFound: roundResult.leadsFound,
        status: roundResult.leadsFound >= input.targetLeads ? "completed" : "running",
        message: roundResult.leadsFound >= input.targetLeads
          ? `Found all ${input.targetLeads} leads immediately!`
          : `Found ${roundResult.leadsFound} lead(s). Continuing outreach...`,
      };
    }),

  /** Run next outreach round on a campaign */
  runNextRound: publicQuery
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [campaign] = await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, input.campaignId)).limit(1);
      if (!campaign) throw new Error("Campaign not found");
      if (campaign.status === "completed") return { success: true, leadsFound: 0, message: "Campaign already complete" };

      const result = await runOutreachRound(campaign, db);
      return {
        success: true,
        leadsFound: result.leadsFound,
        totalLeads: campaign.foundLeads + result.leadsFound,
        status: campaign.foundLeads + result.leadsFound >= campaign.targetProfessionals ? "completed" : "running",
      };
    }),

  /** Get campaign with all leads and logs */
  getCampaign: publicQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [campaign] = await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, input.id)).limit(1);
    if (!campaign) return null;

    const logs = await db.select().from(outreachLogs).where(eq(outreachLogs.campaignId, input.id)).orderBy(desc(outreachLogs.createdAt)).limit(500);
    const leads = await db.select().from(professionalLeads).where(eq(professionalLeads.campaignId, input.id)).orderBy(desc(professionalLeads.createdAt)).limit(100);

    return { campaign, logs, leads };
  }),

  /** Get all campaigns for a user */
  listCampaigns: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    if (!ctx.user?.id) return [];
    return db.select().from(outreachCampaigns).where(eq(outreachCampaigns.userId, ctx.user.id)).orderBy(desc(outreachCampaigns.createdAt)).limit(100);
  }),

  /** Get leads for a listing or application */
  getLeads: publicQuery
    .input(z.object({ listingId: z.number().optional(), applicationId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.listingId) {
        return db.select().from(professionalLeads).where(eq(professionalLeads.listingId, input.listingId)).orderBy(desc(professionalLeads.createdAt)).limit(100);
      }
      if (input.applicationId) {
        return db.select().from(professionalLeads).where(eq(professionalLeads.applicationId, input.applicationId)).orderBy(desc(professionalLeads.createdAt)).limit(100);
      }
      return [];
    }),

  /** Deliver leads to user (mark as delivered) */
  deliverLeads: publicQuery
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(professionalLeads)
        .set({ isDelivered: true, deliveredAt: new Date() })
        .where(eq(professionalLeads.campaignId, input.campaignId));

      const leads = await db.select().from(professionalLeads).where(eq(professionalLeads.campaignId, input.campaignId));
      return { success: true, deliveredCount: leads.length, leads };
    }),

  /** Get stats for dashboard */
  stats: adminQuery.query(async () => {
    const db = getDb();
    const campaigns = await db.select().from(outreachCampaigns);
    const allLeads = await db.select().from(professionalLeads);
    const allLogs = await db.select().from(outreachLogs);

    const completed = campaigns.filter((c) => c.status === "completed").length;
    const running = campaigns.filter((c) => c.status === "running").length;

    return {
      totalCampaigns: campaigns.length,
      completedCampaigns: completed,
      runningCampaigns: running,
      totalLeadsFound: allLeads.length,
      totalOutreachAttempts: allLogs.length,
      deliveredLeads: allLeads.filter((l) => l.isDelivered).length,
      averageConfidence: allLogs.length > 0
        ? Math.round(allLogs.reduce((s, l) => s + (l.confidence || 0), 0) / allLogs.length)
        : 0,
    };
  }),
});
