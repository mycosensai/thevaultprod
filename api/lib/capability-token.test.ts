import { afterEach, describe, expect, it } from "vitest";
import { resetCloudflareEnv, setCloudflareEnv } from "./env";
import { openRecordId, sealRecordId } from "./capability-token";
import { appRouter } from "../router";
import type { TrpcContext } from "../context";

const SECRET = "c".repeat(32);

function context(): TrpcContext {
  return {
    req: new Request("https://thevaultdfw.win/api/trpc", { headers: { host: "thevaultdfw.win" } }),
    resHeaders: new Headers(),
  };
}

describe("capability tokens", () => {
  afterEach(() => {
    resetCloudflareEnv();
  });

  it("does not accept a sequential id and round-trips a sealed one", async () => {
    setCloudflareEnv({ APP_SECRET: SECRET });
    const token = await sealRecordId("outreach", 4);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(token).not.toBe("4");
    expect(await openRecordId("outreach", "1")).toBeNull();
    expect(await openRecordId("outreach", "4")).toBeNull();
    expect(await openRecordId("outreach", token)).toBe(4);
    expect(await openRecordId("expert", token)).toBeNull();
    const forged = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(await openRecordId("outreach", forged)).toBeNull();
  });

  it("rejects enumerable outreach and expert ids before a database read", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.outreach.getCampaign({ id: "1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.outreach.runNextRound({ id: "2" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.outreach.deliverLeads({ id: "3" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.expert.getApplication({ id: "4" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.expert.runExpertReview({ id: "5" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.expert.generateConsensus({ id: "6" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.support.create({
      name: "",
      email: "not-an-email",
      topic: "other",
      message: "short",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
