/**
 * Agent Engine Router — GeneralStaff-style autonomous bot cycles
 * Engineer → Verify → Review pipeline with OpenAI GPT-4o
 */

import { z } from "zod";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  agentProjects,
  agentTasks,
  agentCycles,
  agentSessions,
  agentLogs,
  agentFleetState,
  agentMessages,
  agentFeedback,
} from "@db/schema";
import { openaiChat, openaiStructured } from "./lib/openai";
import {
  checkHallucinations,
  sanitizeHallucinations,
  censorOutreach,
  verifyContact,
  buildFeedbackEnrichedPrompt,
} from "./lib/hallucination-guard";
import type { AgentFeedback } from "./lib/hallucination-guard";
import { getPrompt } from "./agent-prompts";

// ─── TYPES ───
type CycleOutcome = "verified" | "verification_failed" | "verified_weak";
type ReviewVerdict = "pass" | "fail" | "weak_pass";

// ─── UTILS ───
function genCycleId(): string {
  const now = new Date();
  const ts = now.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const rnd = Math.random().toString(36).slice(2, 6);
  return `${ts}_${rnd}`;
}

function genSessionId(): string {
  return "b" + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

function genTaskId(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

// ─── ENGINEER STEP: AI generates the work ───
async function engineerStep(
  db: ReturnType<typeof getDb>,
  project: typeof agentProjects.$inferSelect,
  task: typeof agentTasks.$inferSelect,
): Promise<{ output: string; usage: { prompt_tokens: number; completion_tokens: number } }> {
  // ALWAYS use the zero-hallucination prompt manifesto — never the DB's raw command
  const basePrompt = getPrompt(project.projectId);

  // Fetch recent feedback for this project to enrich the prompt
  const feedbackHistory = await db
    .select()
    .from(agentFeedback)
    .where(eq(agentFeedback.projectId, project.projectId))
    .orderBy(desc(agentFeedback.createdAt))
    .limit(5);

  const enrichedCommand = feedbackHistory.length > 0
    ? buildFeedbackEnrichedPrompt(basePrompt, feedbackHistory, 3)
    : basePrompt;

  const messages = [
    {
      role: "system" as const,
      content: enrichedCommand,
    },
    {
      role: "user" as const,
      content: `TASK: ${task.title}\n${task.description ?? ""}\n\nExecute this task and return your output in a clear, structured format.`,
    },
  ];

  const res = await openaiChat({ model: project.model ?? "gpt-4o", messages, temperature: 0.3 });
  const output = res.choices[0]?.message?.content ?? "";
  return { output, usage: res.usage };
}

// ─── VERIFICATION STEP: validate output quality ───
async function verificationStep(
  project: typeof agentProjects.$inferSelect,
  task: typeof agentTasks.$inferSelect,
  engineerOutput: string,
): Promise<{ passed: boolean; output: string }> {
  if (project.verificationCommand === "none" || !project.verificationCommand) {
    return { passed: true, output: "Verification skipped (no command configured)" };
  }

  const messages = [
    {
      role: "system" as const,
      content: `You are a verification gate for The Vault agent system. Validate the engineer's output against the task requirements. Return ONLY a JSON object: {\"passed\": true/false, \"reason\": \"...\"}`,
    },
    {
      role: "user" as const,
      content: `TASK: ${task.title}\n\nENGINEER OUTPUT:\n${engineerOutput}\n\nVERIFICATION RULE: ${project.verificationCommand}\n\nValidate and return JSON.`,
    },
  ];

  const res = await openaiStructured<{ passed: boolean; reason: string }>({
    model: project.model ?? "gpt-4o",
    messages,
    temperature: 0.1,
  });

  return { passed: res.result.passed, output: res.result.reason };
}

// ─── REVIEW STEP: check for scope drift / hands-off violations ───
async function reviewStep(
  project: typeof agentProjects.$inferSelect,
  task: typeof agentTasks.$inferSelect,
  engineerOutput: string,
  verificationPassed: boolean,
): Promise<{ verdict: ReviewVerdict; output: string; scopeDrift: string[]; handsOffViolations: string[]; silentFailures: string[] }> {
  let handsOff: string[] = [];
  try {
    handsOff = JSON.parse(project.handsOff ?? "[]") as string[];
  } catch {
    handsOff = [];
  }

  const messages = [
    {
      role: "system" as const,
      content: `You are a reviewer for The Vault autonomous agent system. Review the engineer's output for:\n1. Scope drift (did it do what was asked?)\n2. Hands-off violations (did it touch forbidden areas: ${handsOff.join(", ") || "none"})\n3. Silent failures (obvious errors or omissions)\n\nReturn ONLY JSON: {\"verdict\": \"pass\"|\"fail\"|\"weak_pass\", \"reason\": \"...\", \"scope_drift\": [\"...\"], \"hands_off_violations\": [\"...\"], \"silent_failures\": [\"...\"]}`,
    },
    {
      role: "user" as const,
      content: `TASK: ${task.title}\n${task.description ?? ""}\n\nENGINEER OUTPUT:\n${engineerOutput}\n\nVERIFICATION: ${verificationPassed ? "PASSED" : "FAILED"}\n\nReturn review JSON.`,
    },
  ];

  const res = await openaiStructured<{
    verdict: ReviewVerdict;
    reason: string;
    scope_drift: string[];
    hands_off_violations: string[];
    silent_failures: string[];
  }>({
    model: project.model ?? "gpt-4o",
    messages,
    temperature: 0.1,
  });

  return {
    verdict: res.result.verdict,
    output: res.result.reason,
    scopeDrift: res.result.scope_drift ?? [],
    handsOffViolations: res.result.hands_off_violations ?? [],
    silentFailures: res.result.silent_failures ?? [],
  };
}

// ─── EXECUTE SINGLE CYCLE ───
async function executeCycle(
  db: ReturnType<typeof getDb>,
  project: typeof agentProjects.$inferSelect,
  task: typeof agentTasks.$inferSelect,
  sessionId?: string,
): Promise<{ cycleId: string; outcome: CycleOutcome; verdict: ReviewVerdict }> {
  const cycleId = genCycleId();
  const start = Date.now();

  // Create cycle record
  await db.insert(agentCycles).values({
    cycleId,
    projectId: project.projectId,
    taskId: task.taskId,
    status: "running",
  });

  // Log cycle_start
  await db.insert(agentLogs).values({
    event: "cycle_start",
    cycleId,
    sessionId,
    projectId: project.projectId,
    taskId: task.taskId,
    data: JSON.stringify({ timestamp: new Date().toISOString() }),
  });

  let outcome: CycleOutcome = "verification_failed";
  let verdict: ReviewVerdict = "fail";
  let engineerOutput = "";
  let verificationOutput = "";
  let reviewOutput = "";
  let scopeDrift: string[] = [];
  let handsOffViolations: string[] = [];
  let silentFailures: string[] = [];

  try {
    // ── ENGINEER (with feedback enrichment) ──
    let eng = await engineerStep(db, project, task);
    engineerOutput = eng.output;

    // ── HALLUCINATION GUARD ──
    let hallucinationReport: import("./lib/hallucination-guard").HallucinationReport | null = null;
    let sanitizedOutput = engineerOutput;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount < maxRetries) {
      hallucinationReport = await checkHallucinations(engineerOutput, task.description ?? undefined);
      const sanitized = sanitizeHallucinations(engineerOutput, hallucinationReport);

      if (sanitized.safeToPublish) {
        sanitizedOutput = sanitized.text;
        break;
      }

      // Hallucinations found — auto-feedback and retry
      retryCount++;
      await db.insert(agentFeedback).values({
        feedbackId: `auto-${Date.now()}-${retryCount}`,
        cycleId,
        projectId: project.projectId,
        taskId: task.taskId,
        originalOutput: engineerOutput,
        issue: "hallucination",
        correction: `Retry #${retryCount}: ${sanitized.changes.join("; ")}`,
        severity: hallucinationReport.overall_risk === "critical" ? "critical" : "major",
        learned: true,
      });

      // Re-run engineer with stricter prompt
      const stricterTask = { ...task, description: `${task.description ?? ""}\n\nPREVIOUS ATTENTION HAD HALLUCINATED CLAIMS. THIS IS RETRY #${retryCount}. BE CONSERVATIVE. ONLY STATE WHAT YOU KNOW FOR CERTAIN. NEVER INVENT SPECIFIC DATA.` };
      eng = await engineerStep(db, project, stricterTask);
      engineerOutput = eng.output;
    }

    // If still unsafe after retries, mark with disclaimer
    if (hallucinationReport && !sanitizeHallucinations(engineerOutput, hallucinationReport).safeToPublish) {
      const finalSanitized = sanitizeHallucinations(engineerOutput, hallucinationReport);
      sanitizedOutput = finalSanitized.text;
      silentFailures.push(`${hallucinationReport.hallucination_count} hallucinated claims detected after ${maxRetries} retries`);
    }

    engineerOutput = sanitizedOutput;

    // ── CENSORSHIP CHECK (for outreach/social/partnership/content agents) ──
    if (["outreach", "social", "content", "support", "partnership"].includes(project.projectId)) {
      const censorResult = await censorOutreach(engineerOutput, project.projectId === "outreach" ? "email" : "social");
      if (!censorResult.approved) {
        engineerOutput = censorResult.corrected_text ?? `[CENSORED: ${censorResult.violations.join("; ")}]`;
        silentFailures.push(`Censorship violations: ${censorResult.violations.join("; ")}`);

        await db.insert(agentFeedback).values({
          feedbackId: `censor-${Date.now()}`,
          cycleId,
          projectId: project.projectId,
          taskId: task.taskId,
          originalOutput: sanitizedOutput,
          issue: "censorship_violation",
          correction: censorResult.violations.join("; "),
          severity: censorResult.severity === "blocked" ? "critical" : "major",
          learned: true,
        });
      }
    }

    // ── CONTACT VERIFICATION (for outreach/social agents) ──
    if (["outreach", "social"].includes(project.projectId)) {
      // Try to extract contact info from JSON output
      try {
        const parsed = JSON.parse(engineerOutput);
        const leads = parsed.leads ?? [];
        let fakeContacts = 0;
        for (const lead of leads) {
          const verifyResult = await verifyContact(
            lead.name,
            lead.institution,
            lead.title,
            lead.email,
          );
          if (!verifyResult.real) {
            fakeContacts++;
            lead._verified = false;
            lead._verificationNote = verifyResult.notes;
          } else {
            lead._verified = true;
          }
        }
        if (fakeContacts > 0) {
          engineerOutput = JSON.stringify(parsed);
          silentFailures.push(`${fakeContacts} potentially fabricated contact(s) flagged`);
        }
      } catch {
        // Output wasn't JSON, skip contact verification
      }
    }

    // ── VERIFICATION ──
    const ver = await verificationStep(project, task, engineerOutput);
    verificationOutput = ver.output;

    if (!ver.passed) {
      outcome = "verification_failed";
    } else {
      // ── REVIEW ──
      const rev = await reviewStep(project, task, engineerOutput, true);
      reviewOutput = rev.output;
      verdict = rev.verdict;
      scopeDrift = rev.scopeDrift;
      handsOffViolations = rev.handsOffViolations;
      silentFailures = [...silentFailures, ...rev.silentFailures];

      if (rev.verdict === "pass") outcome = "verified";
      else if (rev.verdict === "weak_pass") outcome = "verified_weak";
      else outcome = "verification_failed";
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    engineerOutput = `ERROR: ${errorMsg}`;
    verificationOutput = "Engineer step threw an exception";
    reviewOutput = "Skipped due to engineer error";
    outcome = "verification_failed";
    verdict = "fail";
    silentFailures = [errorMsg];
  }

  const duration = Math.round((Date.now() - start) / 1000);

  // Update cycle record
  await db
    .update(agentCycles)
    .set({
      status: "complete",
      outcome,
      engineerOutput,
      verificationOutput,
      reviewOutput,
      reviewVerdict: verdict,
      durationSeconds: duration,
      scopeDriftFiles: JSON.stringify(scopeDrift),
      handsOffViolations: JSON.stringify(handsOffViolations),
      silentFailures: JSON.stringify(silentFailures),
      completedAt: new Date(),
    })
    .where(eq(agentCycles.cycleId, cycleId));

  // Log cycle_end
  await db.insert(agentLogs).values({
    event: "cycle_end",
    cycleId,
    sessionId,
    projectId: project.projectId,
    taskId: task.taskId,
    data: JSON.stringify({
      outcome,
      duration_seconds: duration,
      review_verdict: verdict,
    }),
  });

  // Update fleet state
  const [existing] = await db
    .select()
    .from(agentFleetState)
    .where(eq(agentFleetState.projectId, project.projectId))
    .limit(1);

  if (existing) {
    await db
      .update(agentFleetState)
      .set({
        totalCycles: existing.totalCycles + 1,
        totalVerified: outcome === "verified" || outcome === "verified_weak"
          ? existing.totalVerified + 1
          : existing.totalVerified,
        totalFailed: outcome === "verification_failed"
          ? existing.totalFailed + 1
          : existing.totalFailed,
        accumulatedMinutes: existing.accumulatedMinutes + Math.ceil(duration / 60),
        lastCycleAt: new Date(),
        lastCycleOutcome: outcome,
        updatedAt: new Date(),
      })
      .where(eq(agentFleetState.projectId, project.projectId));
  } else {
    await db.insert(agentFleetState).values({
      projectId: project.projectId,
      totalCycles: 1,
      totalVerified: outcome === "verified" || outcome === "verified_weak" ? 1 : 0,
      totalFailed: outcome === "verification_failed" ? 1 : 0,
      accumulatedMinutes: Math.ceil(duration / 60),
      lastCycleAt: new Date(),
      lastCycleOutcome: outcome,
    });
  }

  return { cycleId, outcome, verdict };
}

// ─── TRPC ROUTER ───
export const agentRouter = createRouter({
  // ── LIST PROJECTS ──
  listProjects: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(agentProjects).orderBy(agentProjects.priority);
  }),

  // ── GET PROJECT DETAIL ──
  getProject: adminQuery
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [project] = await db
        .select()
        .from(agentProjects)
        .where(eq(agentProjects.projectId, input.projectId))
        .limit(1);
      if (!project) throw new Error("Project not found");

      const tasks = await db
        .select()
        .from(agentTasks)
        .where(eq(agentTasks.projectId, input.projectId))
        .orderBy(agentTasks.priority, agentTasks.createdAt);

      const fleet = await db
        .select()
        .from(agentFleetState)
        .where(eq(agentFleetState.projectId, input.projectId))
        .limit(1);

      const cycles = await db
        .select()
        .from(agentCycles)
        .where(eq(agentCycles.projectId, input.projectId))
        .orderBy(desc(agentCycles.createdAt))
        .limit(20);

      return { project, tasks, fleet: fleet[0] ?? null, cycles };
    }),

  // ── LIST TASKS ──
  listTasks: adminQuery
    .input(z.object({ projectId: z.string(), status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.status) {
        return db
          .select()
          .from(agentTasks)
          .where(and(
            eq(agentTasks.projectId, input.projectId),
            eq(agentTasks.status, input.status),
          ))
          .orderBy(agentTasks.priority);
      }
      return db
        .select()
        .from(agentTasks)
        .where(eq(agentTasks.projectId, input.projectId))
        .orderBy(agentTasks.priority);
    }),

  // ── ADD TASK ──
  addTask: adminQuery
    .input(z.object({
      projectId: z.string(),
      title: z.string().min(1),
      description: z.string().optional(),
      priority: z.number().min(1).max(5).default(2),
      interactiveOnly: z.boolean().default(false),
      expectedTouches: z.array(z.string()).default([]),
      assignedAgent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get existing tasks to determine next ID
      const existing = await db
        .select()
        .from(agentTasks)
        .where(eq(agentTasks.projectId, input.projectId))
        .orderBy(desc(agentTasks.id))
        .limit(1);

      const prefix = input.projectId.slice(0, 2).toLowerCase();
      const nextNum = existing.length > 0
        ? parseInt(existing[0].taskId.split("-")[1] ?? "0", 10) + 1
        : 1;
      const taskId = genTaskId(prefix, nextNum);

      const result = await db.insert(agentTasks).values({
        taskId,
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        interactiveOnly: input.interactiveOnly,
        expectedTouches: JSON.stringify(input.expectedTouches),
        assignedAgent: input.assignedAgent,
      });

      await db.insert(agentLogs).values({
        event: "task_added",
        projectId: input.projectId,
        taskId,
        data: JSON.stringify({ title: input.title, priority: input.priority }),
      });

      return { id: Number(result.meta.last_row_id), taskId, success: true };
    }),

  // ── MARK TASK DONE ──
  markTaskDone: adminQuery
    .input(z.object({ projectId: z.string(), taskId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(agentTasks)
        .where(and(
          eq(agentTasks.projectId, input.projectId),
          eq(agentTasks.taskId, input.taskId),
        ))
        .limit(1);

      if (!task) return { kind: "task_not_found" as const };
      if (task.status === "done") return { kind: "already_done" as const };

      await db
        .update(agentTasks)
        .set({ status: "done", completedAt: new Date() })
        .where(eq(agentTasks.id, task.id));

      await db.insert(agentLogs).values({
        event: "task_done",
        projectId: input.projectId,
        taskId: input.taskId,
        data: JSON.stringify({ title: task.title }),
      });

      return { kind: "done" as const };
    }),

  // ── MARK TASK PENDING (reopen) ──
  markTaskPending: adminQuery
    .input(z.object({ projectId: z.string(), taskId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(agentTasks)
        .where(and(
          eq(agentTasks.projectId, input.projectId),
          eq(agentTasks.taskId, input.taskId),
        ))
        .limit(1);

      if (!task) return { kind: "task_not_found" as const };
      if (task.status === "pending" || task.status === "in_progress") {
        return { kind: "already_pending" as const };
      }

      await db
        .update(agentTasks)
        .set({ status: "pending", completedAt: null })
        .where(eq(agentTasks.id, task.id));

      return { kind: "reopened" as const };
    }),

  // ── REMOVE TASK ──
  removeTask: adminQuery
    .input(z.object({ projectId: z.string(), taskId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [task] = await db
        .select()
        .from(agentTasks)
        .where(and(
          eq(agentTasks.projectId, input.projectId),
          eq(agentTasks.taskId, input.taskId),
        ))
        .limit(1);

      if (!task) return { kind: "task_not_found" as const };

      await db.delete(agentTasks).where(eq(agentTasks.id, task.id));
      return { kind: "removed" as const, taskId: input.taskId };
    }),

  // ── RUN SINGLE CYCLE (manual trigger) ──
  runCycle: adminQuery
    .input(z.object({
      projectId: z.string(),
      taskId: z.string(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [project] = await db
        .select()
        .from(agentProjects)
        .where(eq(agentProjects.projectId, input.projectId))
        .limit(1);
      if (!project) throw new Error("Project not found");

      const [task] = await db
        .select()
        .from(agentTasks)
        .where(and(
          eq(agentTasks.projectId, input.projectId),
          eq(agentTasks.taskId, input.taskId),
        ))
        .limit(1);
      if (!task) throw new Error("Task not found");

      // Mark task in_progress
      await db
        .update(agentTasks)
        .set({ status: "in_progress", cycleId: null })
        .where(eq(agentTasks.id, task.id));

      const { cycleId, outcome, verdict } = await executeCycle(db, project, task, input.sessionId);

      // Update task based on outcome
      const taskStatus = outcome === "verified" ? "done" : outcome === "verified_weak" ? "pending" : "pending";
      await db
        .update(agentTasks)
        .set({ status: taskStatus, cycleId, result: `Cycle ${cycleId}: ${outcome}` })
        .where(eq(agentTasks.id, task.id));

      return { cycleId, outcome, verdict, success: true };
    }),

  // ── RUN SESSION (batch cycles) ──
  runSession: adminQuery
    .input(z.object({
      projectId: z.string(),
      budgetMinutes: z.number().min(1).max(120).default(30),
      maxCycles: z.number().min(1).max(50).default(10),
      parallelSlots: z.number().min(1).max(5).default(1),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [project] = await db
        .select()
        .from(agentProjects)
        .where(eq(agentProjects.projectId, input.projectId))
        .limit(1);
      if (!project) throw new Error("Project not found");

      const sessionId = genSessionId();
      const startTime = Date.now();
      const budgetMs = input.budgetMinutes * 60 * 1000;

      // Create session record
      await db.insert(agentSessions).values({
        sessionId,
        projectId: input.projectId,
        status: "active",
        maxParallelSlots: input.parallelSlots,
        reviewer: project.providerId,
      });

      await db.insert(agentLogs).values({
        event: "session_start",
        sessionId,
        projectId: input.projectId,
        data: JSON.stringify({
          budget_minutes: input.budgetMinutes,
          max_cycles: input.maxCycles,
          parallel_slots: input.parallelSlots,
        }),
      });

      // Get pending bot-pickable tasks
      const tasks = await db
        .select()
        .from(agentTasks)
        .where(and(
          eq(agentTasks.projectId, input.projectId),
          eq(agentTasks.status, "pending"),
          eq(agentTasks.interactiveOnly, false),
        ))
        .orderBy(agentTasks.priority)
        .limit(input.maxCycles);

      let totalCycles = 0;
      let totalVerified = 0;
      let totalFailed = 0;
      let stopReason = "max-cycles";

      for (const task of tasks) {
        if (Date.now() - startTime > budgetMs) {
          stopReason = "budget";
          break;
        }

        await db
          .update(agentTasks)
          .set({ status: "in_progress" })
          .where(eq(agentTasks.id, task.id));

        const { outcome } = await executeCycle(db, project, task, sessionId);
        totalCycles++;
        if (outcome === "verified") totalVerified++;
        else if (outcome === "verified_weak") totalVerified++;
        else totalFailed++;

        const taskStatus = outcome === "verified" ? "done" : "pending";
        await db
          .update(agentTasks)
          .set({ status: taskStatus })
          .where(eq(agentTasks.id, task.id));
      }

      const durationMinutes = Math.round((Date.now() - startTime) / 60000);

      // Complete session
      await db
        .update(agentSessions)
        .set({
          status: "complete",
          stopReason,
          totalCycles,
          totalVerified,
          totalFailed,
          durationMinutes,
          completedAt: new Date(),
        })
        .where(eq(agentSessions.sessionId, sessionId));

      await db.insert(agentLogs).values({
        event: "session_complete",
        sessionId,
        projectId: input.projectId,
        data: JSON.stringify({
          duration_minutes: durationMinutes,
          total_cycles: totalCycles,
          total_verified: totalVerified,
          total_failed: totalFailed,
          stop_reason: stopReason,
          reviewer: project.providerId,
        }),
      });

      return {
        sessionId,
        totalCycles,
        totalVerified,
        totalFailed,
        durationMinutes,
        stopReason,
      };
    }),

  // ── LIST SESSIONS ──
  listSessions: adminQuery
    .input(z.object({ projectId: z.string().optional(), limit: z.number().default(20) }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.projectId) {
        return db
          .select()
          .from(agentSessions)
          .where(eq(agentSessions.projectId, input.projectId))
          .orderBy(desc(agentSessions.startedAt))
          .limit(input.limit);
      }
      return db
        .select()
        .from(agentSessions)
        .orderBy(desc(agentSessions.startedAt))
        .limit(input.limit);
    }),

  // ── GET CYCLES ──
  listCycles: adminQuery
    .input(z.object({
      projectId: z.string().optional(),
      sessionId: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.sessionId) {
        return db
          .select()
          .from(agentCycles)
          .where(eq(agentCycles.sessionId, input.sessionId))
          .orderBy(desc(agentCycles.createdAt))
          .limit(input.limit);
      }
      if (input.projectId) {
        return db
          .select()
          .from(agentCycles)
          .where(eq(agentCycles.projectId, input.projectId))
          .orderBy(desc(agentCycles.createdAt))
          .limit(input.limit);
      }
      return db
        .select()
        .from(agentCycles)
        .orderBy(desc(agentCycles.createdAt))
        .limit(input.limit);
    }),

  // ── GET LOGS ──
  listLogs: adminQuery
    .input(z.object({
      projectId: z.string().optional(),
      event: z.string().optional(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.projectId && input.event) {
        return db
          .select()
          .from(agentLogs)
          .where(and(
            eq(agentLogs.projectId, input.projectId),
            eq(agentLogs.event, input.event),
          ))
          .orderBy(desc(agentLogs.timestamp))
          .limit(input.limit);
      }
      if (input.projectId) {
        return db
          .select()
          .from(agentLogs)
          .where(eq(agentLogs.projectId, input.projectId))
          .orderBy(desc(agentLogs.timestamp))
          .limit(input.limit);
      }
      return db
        .select()
        .from(agentLogs)
        .orderBy(desc(agentLogs.timestamp))
        .limit(input.limit);
    }),

  // ── FLEET OVERVIEW ──
  fleetOverview: adminQuery.query(async () => {
    const db = getDb();
    const projects = await db.select().from(agentProjects).where(eq(agentProjects.active, true));
    const fleet = await db.select().from(agentFleetState);

    const rows = projects.map((p) => {
      const f = fleet.find((x) => x.projectId === p.projectId);
      return {
        projectId: p.projectId,
        name: p.name,
        lastCycleAt: f?.lastCycleAt ?? null,
        totalCycles: f?.totalCycles ?? 0,
        totalVerified: f?.totalVerified ?? 0,
        totalFailed: f?.totalFailed ?? 0,
        botPickable: 0, // computed below
        autoMerge: p.autoMerge,
        branch: p.branch,
        mode: p.mode,
        active: p.active,
      };
    });

    // Count bot-pickable tasks per project
    for (const row of rows) {
      const [r] = await db
        .select({ count: count() })
        .from(agentTasks)
        .where(and(
          eq(agentTasks.projectId, row.projectId),
          eq(agentTasks.status, "pending"),
          eq(agentTasks.interactiveOnly, false),
        ));
      row.botPickable = r?.count ?? 0;
    }

    return rows;
  }),

  // ── DASHBOARD STATS ──
  dashboardStats: adminQuery.query(async () => {
    const db = getDb();
    const [projects] = await db.select({ count: count() }).from(agentProjects);
    const [activeProjects] = await db
      .select({ count: count() })
      .from(agentProjects)
      .where(eq(agentProjects.active, true));

    const [pendingTasks] = await db
      .select({ count: count() })
      .from(agentTasks)
      .where(eq(agentTasks.status, "pending"));

    const [doneTasks] = await db
      .select({ count: count() })
      .from(agentTasks)
      .where(eq(agentTasks.status, "done"));

    const [totalCycles] = await db.select({ count: count() }).from(agentCycles);
    const [totalSessions] = await db.select({ count: count() }).from(agentSessions);

    const fleet = await db.select().from(agentFleetState);
    const totalVerified = fleet.reduce((s, f) => s + f.totalVerified, 0);
    const totalFailed = fleet.reduce((s, f) => s + f.totalFailed, 0);

    const recentSessions = await db
      .select()
      .from(agentSessions)
      .orderBy(desc(agentSessions.startedAt))
      .limit(5);

    return {
      projects: projects?.count ?? 0,
      activeProjects: activeProjects?.count ?? 0,
      pendingTasks: pendingTasks?.count ?? 0,
      doneTasks: doneTasks?.count ?? 0,
      totalCycles: totalCycles?.count ?? 0,
      totalSessions: totalSessions?.count ?? 0,
      totalVerified,
      totalFailed,
      passRate: totalCycles && totalCycles.count > 0
        ? Math.round((totalVerified / totalCycles.count) * 100)
        : 0,
      recentSessions,
    };
  }),

  // ── SEED DEFAULT PROJECTS ──
  seedProjects: adminQuery.mutation(async () => {
    const db = getDb();

    const agentDefs = [
      { projectId: "appraiser", name: "AI Appraiser", desc: "Photo-based luxury item appraisal. Value ranges, authenticity, market analysis.", mode: "A", priority: 1, budget: 5, vcmd: "Output must contain valid estimatedValue and valueRangeLow/High. Confidence must be one of high/medium/low.", model: "gpt-4o", handsOff: ["users", "payments", "auth"] },
      { projectId: "outreach", name: "Buyer Outreach", desc: "Professional lead generation. Finds verified buyers, collectors, dealers.", mode: "A", priority: 1, budget: 10, vcmd: "Each segment must be a professional type, not a fake individual. No invented names or emails.", model: "gpt-4o", handsOff: ["users", "payments", "stripe"] },
      { projectId: "proverify", name: "ProVerify Engine", desc: "Multi-expert verification with consensus scoring for authenticity and value.", mode: "A", priority: 1, budget: 8, vcmd: "Must have 3+ expert reviews with scores 0-100. All scores marked as simulated estimates.", model: "gpt-4o", handsOff: ["users", "payments"] },
      { projectId: "content", name: "Content & SEO", desc: "Product descriptions, SEO copy, marketing content for listings.", mode: "B", priority: 2, budget: 5, vcmd: "Must have exactly 3 variants with correct word counts. No fabricated provenance.", model: "gpt-4o-mini", handsOff: ["users", "payments", "auth"] },
      { projectId: "security", name: "Security Auditor", desc: "Security monitoring, vulnerability audits, penetration testing.", mode: "A", priority: 1, budget: 10, vcmd: "Each finding must have severity and remediation. No invented CVEs.", model: "gpt-4o", handsOff: ["users", "payments", "production_db"] },
      { projectId: "pricing", name: "Pricing Intelligence", desc: "Market analysis and price recommendations based on real data only.", mode: "B", priority: 2, budget: 7, vcmd: "Comparables must be general market knowledge only. No specific unverified sales.", model: "gpt-4o", handsOff: ["users", "payments", "stripe"] },
      { projectId: "support", name: "Support Assistant", desc: "Customer support. Answers FAQs, routes complex issues to humans.", mode: "B", priority: 3, budget: 3, vcmd: "Response must be based only on provided policies. Must not fabricate policy details.", model: "gpt-4o-mini", handsOff: ["users", "payments", "auth", "personal_data"] },
      { projectId: "listing", name: "Listing Optimizer", desc: "Quality checks for photos, descriptions, pricing, compliance.", mode: "A", priority: 2, budget: 5, vcmd: "Compliance flags must be specific. Scores 0-100 integers. No invented violations.", model: "gpt-4o", handsOff: ["users", "payments", "production_db"] },
      { projectId: "compliance", name: "Compliance Monitor", desc: "Legal/regulatory compliance review. Terms, privacy, shipping, tax.", mode: "B", priority: 2, budget: 10, vcmd: "Findings must reference general regulations only. No invented section numbers.", model: "gpt-4o", handsOff: ["users", "payments", "legal_contracts"] },
      { projectId: "social", name: "Social Lead Gen", desc: "Social media intelligence. Community identification, engagement strategy.", mode: "A", priority: 3, budget: 8, vcmd: "No fabricated usernames, follower counts, or metrics. Use placeholders only.", model: "gpt-4o", handsOff: ["users", "payments", "personal_data"] },
    ];

    const defaults = agentDefs.map((a) => ({
      projectId: a.projectId,
      name: a.name,
      description: a.desc,
      mode: a.mode,
      priority: a.priority,
      engineerCommand: getPrompt(a.projectId),
      verificationCommand: a.vcmd,
      cycleBudgetMinutes: a.budget,
      handsOff: JSON.stringify(a.handsOff),
      model: a.model,
    }));

    for (const p of defaults) {
      const [existing] = await db
        .select()
        .from(agentProjects)
        .where(eq(agentProjects.projectId, p.projectId))
        .limit(1);
      if (!existing) {
        await db.insert(agentProjects).values(p);
      }
    }

    return { seeded: defaults.length, success: true };
  }),

  // ── SEED DEMO TASKS ──
  seedTasks: adminQuery.mutation(async () => {
    const db = getDb();

    const tasks = [
      { projectId: "appraiser", title: "Appraise 1985 Rolex Submariner 16800", priority: 1, description: "Photo-based appraisal of vintage Rolex with box and papers" },
      { projectId: "appraiser", title: "Appraise 1959 Fender Stratocaster", priority: 2, description: "Sunburst finish, original case, serial L09xxx" },
      { projectId: "outreach", title: "Find buyers for Patek Philippe Nautilus 5711", priority: 1, description: "Target high-end watch dealers and collectors in US/EU" },
      { projectId: "proverify", title: "Verify authenticity of 1967 Shelby GT500", priority: 1, description: "Check VIN, engine stamp, build sheet against registry" },
      { projectId: "content", title: "Write listing copy for Babe Ruth signed baseball", priority: 2, description: "Include PSA/DNA cert details, provenance from estate sale" },
      { projectId: "security", title: "Audit OAuth implementation for token leakage", priority: 1, description: "Check Google/X/GitHub OAuth flows for security gaps" },
      { projectId: "pricing", title: "Price analysis: 2020 Porsche 911 GT3 RS", priority: 2, description: "Weissach package, 2k miles, original MSRP $223k" },
      { projectId: "support", title: "Update FAQ: international shipping to EU", priority: 3, description: "Add Brexit/Customs details for UK buyers post-2024" },
      { projectId: "listing", title: "Review and optimize 50 pending listings", priority: 2, description: "Batch quality check for photo clarity and description completeness" },
      { projectId: "compliance", title: "Review TOS for CCPA 2024 amendments", priority: 2, description: "Check California Consumer Privacy Act compliance" },
      { projectId: "social", title: "Find Reddit r/watches leads for Q4 campaign", priority: 3, description: "Target r/Watches, r/Rolex, r/Watchexchange communities" },
    ];

    let count = 0;
    for (const t of tasks) {
      const [existing] = await db
        .select()
        .from(agentTasks)
        .where(and(
          eq(agentTasks.projectId, t.projectId),
          eq(agentTasks.title, t.title),
        ))
        .limit(1);
      if (!existing) {
        const prefix = t.projectId.slice(0, 2).toLowerCase();
        const all = await db
          .select()
          .from(agentTasks)
          .where(eq(agentTasks.projectId, t.projectId))
          .orderBy(desc(agentTasks.id))
          .limit(1);
        const nextNum = all.length > 0 ? parseInt(all[0].taskId.split("-")[1] ?? "0", 10) + 1 : 1;
        await db.insert(agentTasks).values({
          taskId: genTaskId(prefix, nextNum),
          ...t,
          expectedTouches: "[]",
        });
        count++;
      }
    }

    return { seeded: count, success: true };
  }),

  // ── SEND MESSAGE TO INBOX ──
  sendMessage: adminQuery
    .input(z.object({
      projectId: z.string(),
      sessionId: z.string().optional(),
      from: z.enum(["bot", "human", "system"]),
      kind: z.enum(["blocker", "handoff", "fyi", "decision"]).default("fyi"),
      body: z.string(),
      refs: z.array(z.string()).default([]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const result = await db.insert(agentMessages).values({
        messageId,
        projectId: input.projectId,
        sessionId: input.sessionId,
        from: input.from,
        kind: input.kind,
        body: input.body,
        refs: JSON.stringify(input.refs),
      });
      return { id: Number(result.meta.last_row_id), messageId, success: true };
    }),

  // ── LIST MESSAGES ──
  listMessages: adminQuery
    .input(z.object({
      projectId: z.string(),
      processed: z.boolean().optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      if (input.processed !== undefined) {
        return db
          .select()
          .from(agentMessages)
          .where(and(
            eq(agentMessages.projectId, input.projectId),
            eq(agentMessages.processed, input.processed),
          ))
          .orderBy(desc(agentMessages.createdAt))
          .limit(input.limit);
      }
      return db
        .select()
        .from(agentMessages)
        .where(eq(agentMessages.projectId, input.projectId))
        .orderBy(desc(agentMessages.createdAt))
        .limit(input.limit);
    }),
});
