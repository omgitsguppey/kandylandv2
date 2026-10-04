// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DebugControlTower } from "@/app/admin/debug/components/DebugControlTower";
import { authFetch } from "@/lib/authFetch";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { HUMAN_ERROR_DICTIONARY } from "@/lib/errors/error-dictionary";

vi.mock("@/lib/authFetch", () => ({ authFetch: vi.fn() }));
vi.mock("@/lib/client-error-reporting", () => ({ reportClientIssue: vi.fn() }));
vi.mock("@/lib/client-diagnostics", () => ({ recordClientDiagnostic: vi.fn() }));

const source = readFileSync(join(process.cwd(), "src/app/admin/debug/components/DebugControlTower.tsx"), "utf8");
const model = {
  "generatedAt": "2026-05-04T12:00:00.000Z",
  "title": "Control Tower",
  "subtitle": "Readiness, current issues, and next actions.",
  "overallScore": 88,
  "overallStatus": "stale",
  "truthState": "live",
  "criticalCount": 0,
  "staleReportCount": 1,
  "missingReportCount": 0,
  "liveIssueCount": 1,
  "reportSource": "agent_state",
  "debugEvidenceSource": "generated",
  "gumdropRecovery": {
    "displayState": "source_missing",
    "truthState": "unavailable",
    "sourceReportPath": "agent/state/recovery-timeline-spine.generated.json",
    "generatedAtUtc": null,
    "freshness": "missing",
    "status": "source_missing",
    "treasury": {
      "ledgerConfirmed": 0,
      "analyticsCorrelated": 0,
      "analyticsMissing": 0,
      "ledgerMissingProtected": 0,
      "duplicateRisk": 0,
      "sourceBucketMismatch": 0,
      "productTruthEligibleCount": 0
    },
    "recoveryQueue": {
      "queueItemCount": 0,
      "ledgerProofRequiredCount": 0,
      "analyticsOnlyRejectedCount": 0,
      "duplicateRiskCount": 0,
      "sourceBucketMismatchCount": 0,
      "moneyAffectingRecoveryAllowedCount": 0
    },
    "canonicalMathLedger": {
      "state": "source_missing",
      "status": "source_missing",
      "path": "agent/state/canonical-math-ledger.generated.json",
      "generatedAtUtc": null,
      "freshness": "missing"
    },
    "labels": [
      "source_missing",
      "diagnostic_only_not_treasury_truth"
    ],
    "nextAction": "Run local recovery timeline and canonical math ledger checks before treating recovery evidence as current.",
    "analyticsOnlyEvidenceLabel": "diagnostic_only_not_treasury_truth"
  },
  "reports": [],
  "sections": {
    "beta_readiness": [],
    "live_issues": [],
    "device_ui": [],
    "money_cost": [],
    "telemetry_behavior": [],
    "support_creator": []
  },
  "liveIssues": [],
  "nextActions": [],
  "operatorCockpit": {
    "generatedAtUtc": "2026-05-04T12:00:00.000Z",
    "reportKey": "debug-operator-cockpit",
    "currentHead": "test-head",
    "sourceCommit": "test-head",
    "overallStatus": "pass",
    "rawDumpDefaultOpen": false,
    "validationFailures": [],
    "summary": {
      "sectionCount": 1,
      "scoreImpactItems": 0,
      "staleRefreshItems": 0,
      "criticalWarningItems": 1,
      "aiCriticFindings": 0,
      "recoveryPlaybooks": 0
    },
    "defaultSections": [
      {
        "id": "critical_runtime_debug_warnings",
        "title": "Critical Runtime + Debug Warnings",
        "operatorSummary": "Admin truth sample needs a source artifact.",
        "owner": "admin_debug",
        "state": "failed",
        "scoreImpactEstimate": 4,
        "nextAction": "Attach a redacted admin truth source sample.",
        "items": [
          {
            "title": "Admin truth sample missing",
            "nextAction": "Attach a redacted admin truth source sample.",
            "sourceTruthState": "admin_truth_source_required"
          }
        ]
      }
    ]
  },
  "canonicalPublicBetaCapDetails": [],
  "canonicalPublicBetaTruthState": "live"
};

function response(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}

describe("admin debug Control Tower error language", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.resetAllMocks();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  async function render(local = false) {
    await act(async () => { root.render(createElement(DebugControlTower, { isLocalAdminUiTestSession: local })); });
  }
  function panel() {
    return container.querySelector("[data-admin-debug-v2='control-tower']");
  }
  function loadError() {
    return container.querySelector("[data-debug-error-key]");
  }
  function diagnostic() {
    return vi.mocked(reportClientIssue).mock.calls.at(-1)?.[0];
  }

  it("routes visible failures through the canonical typed read and safe human error owners", () => {
    expect(source).toContain("readUiJson");
    expect(source).toContain("resolveHumanError");
    expect(source).toContain('"admin_truth"');
    expect(source).toContain('"admin_truth_unavailable"');
    expect(source).not.toContain("setError(issue instanceof Error ? issue.message");
  });

  it.each([
    [401, "auth_required"],
    [403, "forbidden"],
  ] as const)("keeps HTTP %i as a permission boundary instead of missing evidence", async (status, key) => {
    vi.mocked(authFetch).mockResolvedValueOnce(response(status, { error: "Controlled denied request." }));
    await render();
    expect(container.textContent).toContain(HUMAN_ERROR_DICTIONARY[key].operatorMessage);
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("permission_blocked");
    expect(container.querySelector("[data-admin-truth-state='blocked']")).not.toBeNull();
    expect(loadError()?.getAttribute("data-debug-error-key")).toBe(key);
    expect(loadError()?.getAttribute("data-debug-error-status")).toBe(String(status));
    expect(loadError()?.textContent).toBe(HUMAN_ERROR_DICTIONARY[key].operatorMessage);
    expect(container.textContent).not.toContain(HUMAN_ERROR_DICTIONARY.admin_truth_unavailable.operatorMessage);
    expect(diagnostic()?.detail).toMatchObject({ status, errorKey: key, route: "/api/admin/debug/control-tower" });
    expect(vi.mocked(authFetch)).toHaveBeenCalledTimes(1);
  });

  it("preserves an explicit expired-session key supplied by the response", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(response(401, { error: "Raw FirebaseError must remain diagnostic-only.", errorKey: "session_expired" }));
    await render();
    expect(loadError()?.textContent).toBe(HUMAN_ERROR_DICTIONARY.session_expired.operatorMessage);
    expect(loadError()?.getAttribute("data-debug-error-key")).toBe("session_expired");
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("permission_blocked");
    expect(container.textContent).not.toContain("Raw FirebaseError");
    expect(diagnostic()?.detail).toMatchObject({ status: 401, errorKey: "session_expired" });
  });

  it("preserves a service 503 as a source failure with its safe service message", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(response(503, { error: "Controlled service unavailable.", code: "service_unavailable", retryable: true }));
    await render();
    expect(container.textContent).toContain(HUMAN_ERROR_DICTIONARY.service_unavailable.operatorMessage);
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("failed");
    expect(loadError()?.textContent).toBe(HUMAN_ERROR_DICTIONARY.service_unavailable.operatorMessage);
    expect(loadError()?.getAttribute("data-debug-error-status")).toBe("503");
    expect(diagnostic()?.detail).toMatchObject({ status: 503, errorKey: "service_unavailable" });
    expect(diagnostic()?.error).toMatchObject({ status: 503, code: "service_unavailable", retryable: true });
  });

  it.each([403, 503])("retains HTTP %i classification even when the error body is not JSON", async (status) => {
    vi.mocked(authFetch).mockResolvedValueOnce(new Response("<html>private diagnostic details</html>", { status }));
    await render();
    const key = status === 403 ? "forbidden" : "service_unavailable";
    expect(loadError()?.getAttribute("data-debug-error-key")).toBe(key);
    expect(loadError()?.getAttribute("data-debug-error-status")).toBe(String(status));
    expect(loadError()?.textContent).toBe(HUMAN_ERROR_DICTIONARY[key].operatorMessage);
    expect(container.textContent).not.toContain("private diagnostic details");
    expect(diagnostic()?.detail).toMatchObject({ status, errorKey: key });
  });

  it("rejects false-success 200 payloads before publishing report counts", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(response(200, { ...model, success: false, code: "forbidden", error: "Do not admit this model." }));
    await render();
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("permission_blocked");
    expect(loadError()?.getAttribute("data-debug-error-key")).toBe("forbidden");
    expect(container.querySelector("[data-debug-visible-summary='single-triage-strip']")).toBeNull();
    expect(diagnostic()?.detail).toMatchObject({ status: 200, errorKey: "forbidden" });
  });

  it("keeps a network exception as failed and hides its raw technical text", async () => {
    vi.mocked(authFetch).mockRejectedValueOnce(new TypeError("Failed to fetch ECONNRESET private host"));
    await render();
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("failed");
    expect(loadError()?.textContent).toBe(HUMAN_ERROR_DICTIONARY.network_error.operatorMessage);
    expect(loadError()?.getAttribute("data-debug-error-status")).toBeNull();
    expect(container.textContent).not.toContain("ECONNRESET");
    expect(diagnostic()?.detail).toMatchObject({ status: null, errorKey: "network_error" });
  });

  it.each([403, 503])("does not automatically replay a failed HTTP %i read", async (status) => {
    vi.useFakeTimers();
    vi.mocked(authFetch).mockResolvedValueOnce(response(status, { error: "Controlled failed read." }));
    await render();
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
    expect(vi.mocked(authFetch)).toHaveBeenCalledTimes(1);
  });

  it("loads the next valid read after a denied source and removes the stale error", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(response(403, { error: "Controlled denied." }));
    const localFetch = vi.fn().mockResolvedValueOnce(response(200, model));
    vi.stubGlobal("fetch", localFetch);
    await render();
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("permission_blocked");
    await render(true);
    expect(loadError()).toBeNull();
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("live");
    expect(container.querySelector("[data-debug-visible-summary='single-triage-strip']")).not.toBeNull();
    expect(localFetch).toHaveBeenCalledOnce();
    expect(localFetch).toHaveBeenCalledWith("/api/admin/debug/control-tower", { credentials: "same-origin" });
    expect(vi.mocked(authFetch)).toHaveBeenCalledOnce();
  });

  it("does not keep a previous model healthy when its next source is denied", async () => {
    vi.mocked(authFetch).mockResolvedValueOnce(response(200, model));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(403, { error: "Controlled denied." })));
    await render();
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("live");
    await render(true);
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("permission_blocked");
    expect(container.querySelector("[data-debug-visible-summary='single-triage-strip']")).toBeNull();
  });

  it("rejects a late prior result after a newer source has already failed", async () => {
    let finishOldRead!: (value: Response) => void;
    vi.mocked(authFetch).mockImplementationOnce(() => new Promise(resolve => { finishOldRead = resolve; }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(403, { error: "Controlled denied." })));
    await render();
    await render(true);
    await act(async () => { finishOldRead(response(200, model)); });
    expect(panel()?.getAttribute("data-debug-truth-state")).toBe("permission_blocked");
    expect(container.querySelector("[data-debug-visible-summary='single-triage-strip']")).toBeNull();
  });
});
