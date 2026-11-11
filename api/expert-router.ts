// @ts-nocheck
import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { expertProfiles, expertApplications, expertReviews, expertConsensus, outreachCampaigns } from "@db/schema";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { openaiChat, openaiStructured } from "./lib/openai";
import { runOutreachRound } from "./outreach-router";
import { sanitizeForPrompt } from "./security";

// Match experts to item category
function matchExpertsToCategory(category: string, experts: any[]): any[] {
  const catMap: Record<string, string[]> = {
    "Fine Jewelry": ["jewelry", "gemology", "antique_jewelry"],
    "Rare Coins": ["numismatics", "coins", "currency"],
    "Antiques": ["antiques", "furniture", "decorative_arts"],
    "Fine Art": ["fine_art", "paintings", "sculptures", "prints"],
    "Luxury Watches": ["watches", "horology", "timepieces"],
    "Sports Memorabilia": ["sports", "memorabilia"],
    "Estate Jewelry": ["estate_jewelry", "vintage_jewelry", "antique_jewelry"],
    "Rare Books": ["rare_books", "manuscripts", "bibliography"],
  };
  const relevantTags = catMap[category] || [category.toLowerCase().replace(/\s+/g, "_")];
  const scored = experts.map((e) => {
    const specialties = (e.specialties as string[]) || [];
    const score = specialties.reduce((acc: number, s: string) => {
      return relevantTags.some((tag) => s.toLowerCase().includes(tag) || tag.includes(s.toLowerCase())) ? acc + 1 : acc;
    }, 0);
    return { expert: e, score };
  }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.expert);
}

export const expertRouter = createRouter({
  // Submit application for professional review
  submitApplication: publicQuery
    .input(z.object({
      itemName: z.string().min(1),
      category: z.string().min(1),
      condition: z.string().optional(),
      description: z.string().optional(),
      provenance: z.string().optional(),
      dimensions: z.string().optional(),
      materials: z.string().optional(),
      markings: z.string().optional(),
      imageUrls: z.array(z.string()).optional(),
      estimatedValue: z.number().optional(),
      priority: z.enum(["standard", "express", "rush"]).default("standard"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Calculate review fee based on priority
      const feeMap = { standard: "49.99", express: "99.99", rush: "199.99" };
      const reviewFee = feeMap[input.priority];

      // Find matching experts
      const allExperts = await db.select().from(expertProfiles).where(eq(expertProfiles.isActive, true));
      const matchedExperts = matchExpertsToCategory(input.category, allExperts);
      const assignedIds = matchedExperts.map((e) => e.id);

      // Create application
      const appInsert = await db.insert(expertApplications).values({
        userId: ctx.user?.id || null,
        itemName: input.itemName,
        category: input.category,
        condition: input.condition || "good",
        description: input.description || null,
        provenance: input.provenance || null,
        dimensions: input.dimensions || null,
        materials: input.materials || null,
        markings: input.markings || null,
        imageUrls: input.imageUrls as string[] || [],
        estimatedValue: input.estimatedValue ? String(input.estimatedValue) : null,
        status: assignedIds.length > 0 ? "assigned" : "submitted",
        assignedExpertIds: assignedIds,
        reviewFee,
        priority: input.priority,
      });
      const appId = Number(appInsert.meta.last_row_id);

      // Auto-start outreach campaign for buyer leads
      const outreachInsert = await db.insert(outreachCampaigns).values({
        applicationId: appId,
        userId: ctx.user?.id || null,
        itemName: input.itemName,
        category: input.category,
        targetProfessionals: 5,
        foundLeads: 0,
        outreachCount: 0,
        status: "running",
        aiStrategy: `Find collectors, dealers, and specialists interested in ${input.category}`,
      });
      const outreachId = Number(outreachInsert.meta.last_row_id);

      // Run first outreach round immediately
      const [campaign] = await db.select().from(outreachCampaigns).where(eq(outreachCampaigns.id, outreachId)).limit(1);
      const roundResult = await runOutreachRound(campaign, db);

      return {
        success: true,
        applicationId: appId,
        status: assignedIds.length > 0 ? "assigned" : "submitted",
        assignedExpertCount: assignedIds.length,
        matchedExperts: matchedExperts.map((e) => ({ id: e.id, name: e.name, title: e.title, institution: e.institution })),
        reviewFee,
        outreachCampaignId: outreachId,
        initialLeads: roundResult.leadsFound,
        outreachMessage: roundResult.leadsFound > 0
          ? `AI outreach started! Found ${roundResult.leadsFound} initial lead(s). Working around the clock to find more.`
          : `AI outreach campaign started. Searching for interested professionals worldwide...`,
      };
    }),

  // Get all experts
  listExperts: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(expertProfiles).where(eq(expertProfiles.isActive, true)).orderBy(desc(expertProfiles.rating));
  }),

  // Public by numeric id for /proverify/:id. Same residual as outreach.getCampaign:
  // the result link is the capability, and the id is sequential.
  getApplication: publicQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [app] = await db.select().from(expertApplications).where(eq(expertApplications.id, input.id)).limit(1);
    if (!app) return null;
    // Get matched experts
    const expertIds = (app.assignedExpertIds as number[]) || [];
    const experts = expertIds.length > 0 ? await db.select().from(expertProfiles).where(inArray(expertProfiles.id, expertIds)) : [];
    // Get reviews
    const reviews = await db.select().from(expertReviews).where(eq(expertReviews.applicationId, app.id));
    // Get consensus
    const [consensus] = await db.select().from(expertConsensus).where(eq(expertConsensus.applicationId, app.id)).limit(1);
    return { ...app, experts, reviews, consensus: consensus || null };
  }),

  // List user's applications
  listApplications: publicQuery.query(async ({ ctx }) => {
    if (!ctx.user?.id) return [];
    const db = getDb();
    return db.select().from(expertApplications).where(eq(expertApplications.userId, ctx.user.id)).orderBy(desc(expertApplications.createdAt));
  }),

  // AI-powered expert review simulation
  runExpertReview: publicQuery.input(z.object({ applicationId: z.number() })).mutation(async ({ input }) => {
    const db = getDb();

    const [app] = await db.select().from(expertApplications).where(eq(expertApplications.id, input.applicationId)).limit(1);
    if (!app) throw new Error("Application not found");

    const expertIds = (app.assignedExpertIds as number[]) || [];
    if (expertIds.length === 0) throw new Error("No experts assigned");

    const experts = await db.select().from(expertProfiles).where(inArray(expertProfiles.id, expertIds));
    const reviews = [];

    for (const expert of experts) {
      // Check if review already exists
      const [existing] = await db.select().from(expertReviews)
        .where(sql`${expertReviews.applicationId} = ${app.id} AND ${expertReviews.expertId} = ${expert.id}`)
        .limit(1);

      if (existing) {
        reviews.push(existing);
        continue;
      }

      // Sanitize all inputs before AI prompt injection
      const safeItemName = sanitizeForPrompt(app.itemName);
      const safeCategory = sanitizeForPrompt(app.category);
      const safeCondition = sanitizeForPrompt(app.condition || "unknown");
      const safeDescription = sanitizeForPrompt(app.description || "No description provided");
      const safeProvenance = sanitizeForPrompt(app.provenance || "No provenance provided");
      const safeMaterials = sanitizeForPrompt(app.materials || "Unknown");
      const safeMarkings = sanitizeForPrompt(app.markings || "None noted");

      // Generate AI expert review
      const prompt = `You are Dr. ${expert.name}, ${expert.title} at ${expert.institution}. You have ${expert.yearsExperience} years of experience as an expert appraiser.

You are reviewing this item for The Vault professional verification service (like Antiques Roadshow):

Item: ${safeItemName}
Category: ${safeCategory}
Condition: ${safeCondition}
Description: ${safeDescription}
Provenance: ${safeProvenance}
Materials: ${safeMaterials}
Markings: ${safeMarkings}

Provide a JSON response with:
{
  "authenticityScore": 1-100 (how likely is this genuine),
  "valueScore": 1-100 (how well valued is this compared to market),
  "conditionScore": 1-100 (how well preserved compared to original state),
  "estimatedValue": estimated dollar value (number),
  "valueRangeLow": conservative estimate (number),
  "valueRangeHigh": optimistic estimate (number),
  "authenticityVerdict": "genuine" | "likely_genuine" | "uncertain" | "likely_reproduction" | "reproduction",
  "conditionNotes": "detailed condition assessment compared to original manufacture state",
  "authenticityNotes": "detailed authenticity analysis with specific indicators",
  "valueNotes": "detailed market value analysis",
  "methodology": "what examination methods were used",
  "comparableSales": [
    { "title": "brief description", "price": 12345, "source": "auction house", "date": "2024" }
  ]
}

Be thorough and professional. Base your assessment on realistic market data.`;

      const response = await openaiChat({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an expert appraiser. Respond with valid JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      });
      const text = response.choices[0]?.message?.content ?? "{}";

      let analysis: any;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch {
        analysis = null;
      }

      if (!analysis) {
        analysis = {
          authenticityScore: 70, valueScore: 60, conditionScore: 65,
          estimatedValue: Number(app.estimatedValue || 1000),
          valueRangeLow: Number(app.estimatedValue || 1000) * 0.7,
          valueRangeHigh: Number(app.estimatedValue || 1000) * 1.3,
          authenticityVerdict: "uncertain", conditionNotes: text.substring(0, 300),
          authenticityNotes: "Analysis pending detailed examination.",
          valueNotes: "Preliminary assessment.", methodology: "Visual analysis and market comparison.",
          comparableSales: [],
        };
      }

      const overallScore = Math.round((analysis.authenticityScore + analysis.valueScore + analysis.conditionScore) / 3 * 100) / 100;

      const reviewResult = await db.insert(expertReviews).values({
        applicationId: app.id,
        expertId: expert.id,
        authenticityScore: analysis.authenticityScore,
        valueScore: analysis.valueScore,
        conditionScore: analysis.conditionScore,
        overallScore: String(overallScore),
        estimatedValue: String(analysis.estimatedValue),
        valueRangeLow: String(analysis.valueRangeLow),
        valueRangeHigh: String(analysis.valueRangeHigh),
        authenticityVerdict: analysis.authenticityVerdict,
        conditionNotes: analysis.conditionNotes,
        authenticityNotes: analysis.authenticityNotes,
        valueNotes: analysis.valueNotes,
        methodology: analysis.methodology,
        comparableSales: analysis.comparableSales as any || [],
        isPublished: true,
      });

      const [newReview] = await db.select().from(expertReviews).where(eq(expertReviews.id, Number(reviewResult.meta.last_row_id))).limit(1);
      // @ts-expect-error drizzle-orm SQLite generic constraint
      reviews.push(newReview);
    }

    // Update application status
    await db.update(expertApplications).set({ status: "under_review" }).where(eq(expertApplications.id, app.id));

    return { success: true, reviews };
  }),

  // Generate consensus from all reviews
  generateConsensus: publicQuery.input(z.object({ applicationId: z.number() })).mutation(async ({ input }) => {
    const db = getDb();

    const [app] = await db.select().from(expertApplications).where(eq(expertApplications.id, input.applicationId)).limit(1);
    if (!app) throw new Error("Application not found");

    const reviews = await db.select().from(expertReviews).where(eq(expertReviews.applicationId, app.id));
    if (reviews.length === 0) throw new Error("No reviews yet");

    // Calculate weighted consensus
    const totalWeight = reviews.length;
    const avgAuth = reviews.reduce((s, r) => s + r.authenticityScore, 0) / totalWeight;
    const avgVal = reviews.reduce((s, r) => s + r.valueScore, 0) / totalWeight;
    const avgCond = reviews.reduce((s, r) => s + r.conditionScore, 0) / totalWeight;
    const avgOverall = (avgAuth + avgVal + avgCond) / 3;

    // Determine consensus verdict
    const verdictCounts: Record<string, number> = {};
    reviews.forEach((r) => { verdictCounts[r.authenticityVerdict || "uncertain"] = (verdictCounts[r.authenticityVerdict || "uncertain"] || 0) + 1; });
    const consensusVerdict = (Object.entries(verdictCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "uncertain") as any;

    const valLow = reviews.reduce((s, r) => s + Number(r.valueRangeLow || 0), 0) / totalWeight;
    const valHigh = reviews.reduce((s, r) => s + Number(r.valueRangeHigh || 0), 0) / totalWeight;

    // Generate AI summary report
    const safeItemName2 = sanitizeForPrompt(app.itemName);

    const prompt = `As a chief curator, synthesize these ${reviews.length} expert reviews for "${safeItemName2}" into a single professional consensus report.

Authenticity scores: ${reviews.map((r) => r.authenticityScore).join(", ")}
Value scores: ${reviews.map((r) => r.valueScore).join(", ")}
Condition scores: ${reviews.map((r) => r.conditionScore).join(", ")}

Average authenticity: ${avgAuth.toFixed(1)}/100
Average value: ${avgVal.toFixed(1)}/100
Average condition: ${avgCond.toFixed(1)}/100
Consensus verdict: ${consensusVerdict}

Write a 3-paragraph professional consensus summary: (1) overall assessment, (2) detailed analysis of authenticity, value, and condition, (3) recommendation for the collector.`;

    const { text } = await openaiChat({ model: "gpt-4o", prompt });

    // Delete existing consensus
    await db.delete(expertConsensus).where(eq(expertConsensus.applicationId, app.id));

    const consResult = await db.insert(expertConsensus).values({
      applicationId: app.id,
      consensusAuthenticity: String(avgAuth.toFixed(2)),
      consensusValue: String(avgVal.toFixed(2)),
      consensusCondition: String(avgCond.toFixed(2)),
      consensusOverall: String(avgOverall.toFixed(2)),
      consensusVerdict: consensusVerdict,
      estimatedValueLow: String(valLow.toFixed(2)),
      estimatedValueHigh: String(valHigh.toFixed(2)),
      expertCount: reviews.length,
      summaryReport: text,
    });

    // Mark application as completed
    await db.update(expertApplications).set({ status: "completed" }).where(eq(expertApplications.id, app.id));

    const [consensus] = await db.select().from(expertConsensus).where(eq(expertConsensus.id, Number(consResult.meta.last_row_id))).limit(1);

    return {
      success: true,
      consensus,
      authenticity: avgAuth.toFixed(1),
      value: avgVal.toFixed(1),
      condition: avgCond.toFixed(1),
      overall: avgOverall.toFixed(1),
      verdict: consensusVerdict,
      valueRange: { low: valLow.toFixed(2), high: valHigh.toFixed(2) },
      report: text,
    };
  }),
});
