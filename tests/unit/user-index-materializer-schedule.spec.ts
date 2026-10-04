import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loggerInfo: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("firebase-functions", () => ({ logger: { info: mocks.loggerInfo } }));
vi.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (_options: unknown, handler: unknown) => handler,
}));

vi.mock("@/lib/server/firebase-admin", () => ({ adminDb: null }));

import {
  handleUserIndexMaterializerSchedule,
  runUserIndexMaterializerSchedule,
} from "../../functions/src/user-index-materializer-schedule";

import { USER_INDEX_MATERIALIZER_CONTRACT_VERSION, type UserIndexMaterializerWindowReceipt } from "@/lib/user-indexes/user-tracking-index-contract";
import { deriveUserIndexMaterializerWindowReceipt } from "@/lib/server/user-index-writer";
import { getMaterializationClassification } from "@/lib/analytics/materialization-contract";
import { MAINTENANCE_SCHEDULES } from "../../shared/runtime/maintenance-mode-contract";
import { inspectUserIndexMaterializerSource } from "../../scripts/agent/score-user-tracking-indexes";

const context = { signal: new AbortController().signal };

function receipt(): UserIndexMaterializerWindowReceipt {
  return {
    windowId: "user_index_window_1234567890abcdef",
    mode: "shadow",
    sourceFingerprint: "source-fingerprint",
    materializerVersion: USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
    startedAtMs: 1_000,
    completedAtMs: 2_000,
    requestsClaimed: 2,
    requestsCompleted: 2,
    requestsFailed: 0,
    leaseLostCount: 0,
    factsRead: 20,
    factsPublished: 18,
    exclusions: {
      exactReplayExcludedCount: 1,
      linkedCopyExcludedCount: 1,
      identityConflictExcludedCount: 0,
      lineageBlockedCount: 0,
      adminExcludedCount: 0,
      systemExcludedCount: 0,
      personAdmissionUnverifiedCount: 0,
      personPrivacyLimitedCount: 0,
      lineageSourceMissingCount: 0,
    },
    truncatedSubjectCount: 0,
    runtimeCapReached: false,
    clean: true,
    expiresAtMs: 90 * 24 * 60 * 60 * 1000 + 2_000,
  };
}

describe("user index materializer schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mocks.fetch);
    process.env.USER_INDEX_MATERIALIZER_ENDPOINT = "https://example.test/api/internal/analytics/materialize-user-index";
    process.env.USER_INDEX_MATERIALIZER_ALLOWED_HOSTS = "example.test";
    process.env.USER_INDEX_MATERIALIZER_MODE = "shadow";
    process.env.CRON_SECRET = "cron-secret";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.USER_INDEX_MATERIALIZER_ENDPOINT;
    delete process.env.USER_INDEX_MATERIALIZER_ALLOWED_HOSTS;
    delete process.env.CRON_SECRET;
    delete process.env.USER_INDEX_MATERIALIZER_MODE;
  });

  it("accepts an exact bounded materializer receipt", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      idempotencyKey: "user_index_materializer_request_id_and_lease",
      result: { status: "completed", mode: "shadow", issueCodes: [], receipt: receipt() },
    }), { status: 200 }));

    await expect(runUserIndexMaterializerSchedule(context)).resolves.toEqual({
      itemsScanned: 20,
      itemsChanged: 18,
      warnings: [],
    });
    expect(mocks.fetch).toHaveBeenCalledWith(
      process.env.USER_INDEX_MATERIALIZER_ENDPOINT,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer cron-secret" }),
      }),
    );
  });

  it("accepts explicit partial shadow evidence without treating it as clean", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      idempotencyKey: "user_index_materializer_request_id_and_lease",
      result: {
        status: "completed_with_issues",
        mode: "shadow",
        issueCodes: ["materializer_subject_truncated"],
        receipt: {
          ...receipt(),
          truncatedSubjectCount: 1,
          clean: false,
        },
      },
    }), { status: 200 }));

    await expect(runUserIndexMaterializerSchedule(context)).resolves.toEqual({
      itemsScanned: 20,
      itemsChanged: 18,
      warnings: ["materializer_subject_truncated"],
    });
  });

  it("accepts an active truncation rejection as a typed failed request", async () => {
    process.env.USER_INDEX_MATERIALIZER_MODE = "active";
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      idempotencyKey: "user_index_materializer_request_id_and_lease",
      result: {
        status: "completed_with_issues",
        mode: "active",
        issueCodes: ["materializer_request_failed", "materializer_subject_truncated"],
        receipt: {
          ...receipt(),
          mode: "active",
          requestsClaimed: 1,
          requestsCompleted: 0,
          requestsFailed: 1,
          factsRead: 200,
          factsPublished: 0,
          truncatedSubjectCount: 1,
          clean: false,
        },
      },
    }), { status: 200 }));

    await expect(runUserIndexMaterializerSchedule(context)).resolves.toEqual({
      itemsScanned: 200,
      itemsChanged: 0,
      warnings: ["materializer_request_failed", "materializer_subject_truncated"],
    });
  });

  it("accepts the complete canonical issue-code ordering", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      idempotencyKey: "user_index_materializer_request_id_and_lease",
      result: {
        status: "completed_with_issues",
        mode: "shadow",
        issueCodes: [
          "materializer_request_failed",
          "materializer_lease_lost",
          "runtime_cap_reached",
          "materializer_subject_truncated",
        ],
        receipt: {
          ...receipt(),
          requestsCompleted: 0,
          requestsFailed: 1,
          leaseLostCount: 1,
          factsRead: 200,
          factsPublished: 0,
          truncatedSubjectCount: 1,
          runtimeCapReached: true,
          clean: false,
        },
      },
    }), { status: 200 }));

    await expect(runUserIndexMaterializerSchedule(context)).resolves.toEqual({
      itemsScanned: 200,
      itemsChanged: 0,
      warnings: [
        "materializer_request_failed",
        "materializer_lease_lost",
        "runtime_cap_reached",
        "materializer_subject_truncated",
        "user_index_materializer_budget_deferred",
      ],
    });
  });

  it("rejects partial success payloads instead of claiming scheduler health", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));

    await expect(runUserIndexMaterializerSchedule(context)).rejects.toMatchObject({
      code: "user_index_materializer_receipt_invalid",
    });
  });

  it.each([
    ["off", "shadow"],
    ["shadow", "active"],
  ])("rejects a %s route receipt when dispatch expects %s", async (responseMode, dispatchMode) => {
    process.env.USER_INDEX_MATERIALIZER_MODE = dispatchMode;
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      idempotencyKey: "user_index_materializer_request_id_and_lease",
      result: {
        status: responseMode === "off" ? "off" : "completed",
        mode: responseMode,
        issueCodes: responseMode === "off" ? ["materializer_off"] : [],
        receipt: responseMode === "off" ? null : { ...receipt(), mode: responseMode },
      },
    }), { status: 200 }));

    await expect(runUserIndexMaterializerSchedule(context)).rejects.toMatchObject({
      code: "user_index_materializer_mode_mismatch",
    });
  });

  it.each(["", "OFF", "false", "typo"])("fails closed without fetching for mode %j", async (mode) => {
    process.env.USER_INDEX_MATERIALIZER_MODE = mode;

    await expect(handleUserIndexMaterializerSchedule()).resolves.toBeUndefined();

    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("keeps the source scorer aligned with the canonical default-off resolver", () => {
    const scorer = readFileSync(join(process.cwd(), "scripts/agent/score-user-tracking-indexes.ts"), "utf8");

    expect(scorer).toContain('scheduledConsumer.includes("resolveUserIndexMaterializerDispatchMode")');
    expect(scorer).toContain('normalized === "shadow" || normalized === "active" ? normalized : "off"');
    expect(scorer).toContain('scheduledConsumer.includes(\'if (dispatchMode === "off")\')');
    expect(scorer).not.toContain('scheduledConsumer.includes(\'|| "off"\')');
  });

  it("rejects a receipt above the five-request or 1,000-fact schedule budget", async () => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      idempotencyKey: "user_index_materializer_request_id_and_lease",
      result: {
        status: "completed",
        mode: "shadow",
        issueCodes: [],
        receipt: {
          ...receipt(),
          requestsClaimed: 6,
          requestsCompleted: 6,
          factsRead: 1_001,
          factsPublished: 1_001,
        },
      },
    }), { status: 200 }));

    await expect(runUserIndexMaterializerSchedule(context)).rejects.toMatchObject({
      code: "user_index_materializer_receipt_invalid",
    });
  });

  it.each([
    ["a stale materializer version", { materializerVersion: "user-index-materializer-v2" }],
    ["a blank source fingerprint", { sourceFingerprint: "   " }],
    ["a noncanonical expiry", { expiresAtMs: 2_001 + 90 * 24 * 60 * 60 * 1000 }],
    ["facts above the claimed-subject cap", {
      requestsClaimed: 1,
      requestsCompleted: 1,
      factsRead: 201,
      factsPublished: 0,
    }],
  ])("rejects %s", async (_label, overrides) => {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({
      success: true,
      idempotencyKey: "user_index_materializer_request_id_and_lease",
      result: {
        status: "completed",
        mode: "shadow",
        issueCodes: [],
        receipt: { ...receipt(), ...overrides },
      },
    }), { status: 200 }));

    await expect(runUserIndexMaterializerSchedule(context)).rejects.toMatchObject({
      code: "user_index_materializer_receipt_invalid",
    });
  });

  it("fails before fetch when the configured endpoint host is not explicitly allowlisted", async () => {
    process.env.USER_INDEX_MATERIALIZER_ALLOWED_HOSTS = "approved.example";

    await expect(runUserIndexMaterializerSchedule(context)).rejects.toMatchObject({
      code: "scheduled_endpoint_host_disallowed",
    });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});


describe("user materializer publisher and scheduled decoder agreement", () => {
  beforeEach(() => {
    vi.clearAllMocks(); vi.stubGlobal("fetch", mocks.fetch);
    process.env.USER_INDEX_MATERIALIZER_ENDPOINT = "https://example.test/api/internal/analytics/materialize-user-index";
    process.env.USER_INDEX_MATERIALIZER_ALLOWED_HOSTS = "example.test";
    process.env.USER_INDEX_MATERIALIZER_MODE = "shadow";
    process.env.CRON_SECRET = "cron-secret";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.USER_INDEX_MATERIALIZER_ENDPOINT; delete process.env.USER_INDEX_MATERIALIZER_ALLOWED_HOSTS;
    delete process.env.USER_INDEX_MATERIALIZER_MODE; delete process.env.CRON_SECRET;
  });
  function respond(value: UserIndexMaterializerWindowReceipt, overrides: Record<string, unknown> = {}) {
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({success:true,idempotencyKey:"user_index_materializer_request_id_and_lease",
      result:{status:value.clean ? "completed" : "completed_with_issues",mode:"shadow",issueCodes:[],receipt:{...value,...overrides}}}),{status:200}));
  }
  it.each([0, 3])("accepts the real producer receipt with %i lawful privacy exclusions exactly once", async privacyCount => {
    const value = deriveUserIndexMaterializerWindowReceipt({...receipt(), exclusions:{...receipt().exclusions,personPrivacyLimitedCount:privacyCount}});
    expect(value.clean).toBe(true); respond(value);
    await expect(runUserIndexMaterializerSchedule(context)).resolves.toEqual({itemsScanned:20,itemsChanged:18,warnings:[]});
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["personAdmissionUnverifiedCount", "lineageSourceMissingCount"] as const)("accepts explicit incomplete %s without claiming a clean window",async key=>{
    const value = deriveUserIndexMaterializerWindowReceipt({...receipt(),exclusions:{...receipt().exclusions,[key]:1}});
    expect(value.clean).toBe(false);respond(value);
    await expect(runUserIndexMaterializerSchedule(context)).resolves.toEqual({itemsScanned:20,itemsChanged:18,warnings:[]});
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["personAdmissionUnverifiedCount", "lineageSourceMissingCount"] as const)("rejects forged clean state despite %s",async key=>{
    const value = deriveUserIndexMaterializerWindowReceipt({...receipt(),exclusions:{...receipt().exclusions,[key]:1}});
    respond({...value,clean:true});
    await expect(runUserIndexMaterializerSchedule(context)).rejects.toMatchObject({code:"user_index_materializer_receipt_invalid"});
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["personAdmissionUnverifiedCount", "personPrivacyLimitedCount", "lineageSourceMissingCount"] as const)("rejects missing current coverage field %s",async key=>{
    const value=deriveUserIndexMaterializerWindowReceipt(receipt());const incomplete:Record<string,number>={...value.exclusions};delete incomplete[key];
    respond(value,{exclusions:incomplete});
    await expect(runUserIndexMaterializerSchedule(context)).rejects.toMatchObject({code:"user_index_materializer_receipt_invalid"});
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["2026.07.user-index-materializer.v3", "future-materializer-v9"])("rejects incompatible producer version %s",async version=>{
    respond(deriveUserIndexMaterializerWindowReceipt(receipt()),{materializerVersion:version});
    await expect(runUserIndexMaterializerSchedule(context)).rejects.toMatchObject({code:"user_index_materializer_receipt_invalid"});
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it.each([undefined,"1","maybe"])("never dispatches while maintenance is %j",async maintenance=>{
    const original=process.env.KANDY_MAINTENANCE_MODE;
    try {if(maintenance===undefined)delete process.env.KANDY_MAINTENANCE_MODE;else process.env.KANDY_MAINTENANCE_MODE=maintenance;
      await expect(handleUserIndexMaterializerSchedule()).resolves.toBeUndefined();expect(mocks.fetch).not.toHaveBeenCalled();
    } finally {if(original===undefined)delete process.env.KANDY_MAINTENANCE_MODE;else process.env.KANDY_MAINTENANCE_MODE=original;}
  });
});

describe("user materializer source gate authoritative connections",()=>{
  function inspect(overrides:Partial<Parameters<typeof inspectUserIndexMaterializerSource>[0]>={}){
    return inspectUserIndexMaterializerSource({scheduledConsumer:readFileSync(join(process.cwd(),"functions/src/user-index-materializer-schedule.ts"),"utf8"),
      materializerVersion:USER_INDEX_MATERIALIZER_CONTRACT_VERSION,canonicalSchedule:MAINTENANCE_SCHEDULES.materializeUserTrackingIndexes,
      registryNotes:getMaterializationClassification("behavioral_timeline_facts")?.notes ?? "",...overrides});
  }
  it("binds the actual registered schedule, decoder version and rendered registry classification",()=>{
    expect(inspect()).toEqual({scheduleCapacityBound:true,receiptVersionBound:true,registryVersionBound:true});
  });
  it("accepts a valid renamed canonical schedule import",()=>{
    const text=readFileSync(join(process.cwd(),"functions/src/user-index-materializer-schedule.ts"),"utf8");
    const renamed=text.replace("import {MAINTENANCE_SCHEDULES}","import {MAINTENANCE_SCHEDULES as reviewedSchedules}").replaceAll("MAINTENANCE_SCHEDULES.materializeUserTrackingIndexes","reviewedSchedules.materializeUserTrackingIndexes");
    expect(inspect({scheduledConsumer:renamed}).scheduleCapacityBound).toBe(true);
  });
  it("rejects disconnected correct capacity tokens when the actual export is unbounded",()=>{
    const text=readFileSync(join(process.cwd(),"functions/src/user-index-materializer-schedule.ts"),"utf8");
    const wrong=text.replace("maxInstances: MAINTENANCE_SCHEDULES.materializeUserTrackingIndexes.maxInstances","maxInstances: 10")+"\n// maxInstances: MAINTENANCE_SCHEDULES.materializeUserTrackingIndexes.maxInstances\n";
    expect(inspect({scheduledConsumer:wrong}).scheduleCapacityBound).toBe(false);
  });
  it("rejects a wrong capacity in the canonical schedule itself",()=>{
    expect(inspect({canonicalSchedule:{...MAINTENANCE_SCHEDULES.materializeUserTrackingIndexes,maxInstances:2}}).scheduleCapacityBound).toBe(false);
  });
  it("rejects a wrong version even if a current-version comment is present",()=>{
    const text=readFileSync(join(process.cwd(),"functions/src/user-index-materializer-schedule.ts"),"utf8");
    const wrong=text.replace('const USER_INDEX_MATERIALIZER_VERSION = "'+USER_INDEX_MATERIALIZER_CONTRACT_VERSION+'"','const USER_INDEX_MATERIALIZER_VERSION = "stale-materializer"')+"\n// "+USER_INDEX_MATERIALIZER_CONTRACT_VERSION;
    expect(inspect({scheduledConsumer:wrong}).receiptVersionBound).toBe(false);
  });
  it("rejects an unused current version when the decoder checks another binding",()=>{
    const text=readFileSync(join(process.cwd(),"functions/src/user-index-materializer-schedule.ts"),"utf8");
    expect(inspect({scheduledConsumer:text.replace("value.materializerVersion !== USER_INDEX_MATERIALIZER_VERSION","value.materializerVersion !== unrelatedVersion")}).receiptVersionBound).toBe(false);
  });
  it("rejects stale registry prose without inventing a version match",()=>{
    expect(inspect({registryNotes:"Canonical facts feed user_index_materializer_requests v3 worker"}).registryVersionBound).toBe(false);
  });
});


describe("user materializer version guard remains connected to rejection",()=>{
  it.each([
    "const unused = value.materializerVersion !== USER_INDEX_MATERIALIZER_VERSION;",
    "function unused(){if(value.materializerVersion !== USER_INDEX_MATERIALIZER_VERSION)return null;}"
  ])("rejects an unexecuted comparison %s",unused=>{
    const text=readFileSync(join(process.cwd(),"functions/src/user-index-materializer-schedule.ts"),"utf8");
    const wrong=text.replace("value.materializerVersion !== USER_INDEX_MATERIALIZER_VERSION","value.materializerVersion !== unrelatedVersion")
      .replace("function parseUserIndexReceipt(value: unknown): UserIndexReceipt | null {","function parseUserIndexReceipt(value: unknown): UserIndexReceipt | null {\n"+unused);
    const result=inspectUserIndexMaterializerSource({scheduledConsumer:wrong,materializerVersion:USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
      canonicalSchedule:MAINTENANCE_SCHEDULES.materializeUserTrackingIndexes,registryNotes:getMaterializationClassification("behavioral_timeline_facts")?.notes ?? ""});
    expect(result.receiptVersionBound).toBe(false);
  });
});
