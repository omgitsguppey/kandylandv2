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

import {
  handleUserIndexMaterializerSchedule,
  runUserIndexMaterializerSchedule,
} from "../../functions/src/user-index-materializer-schedule";

const context = { signal: new AbortController().signal };

function receipt() {
  return {
    windowId: "user_index_window_1234567890abcdef",
    mode: "shadow",
    sourceFingerprint: "source-fingerprint",
    materializerVersion: "2026.07.user-index-materializer.v3",
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
