// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const pageSource = readFileSync(join(process.cwd(), "src/app/admin/debug/page.tsx"), "utf8");
const realtimeHookSource = readFileSync(
  join(process.cwd(), "src/app/admin/debug/hooks/useAdminDebugRealtime.ts"),
  "utf8",
);
const aiRealtimeHookSource = readFileSync(
  join(process.cwd(), "src/app/admin/debug/hooks/useAdminAiAssistantRealtime.ts"),
  "utf8",
);
const nowTabSource = readFileSync(
  join(process.cwd(), "src/app/admin/debug/components/DebugTabNow.tsx"),
  "utf8",
);
const controlTowerSource = readFileSync(
  join(process.cwd(), "src/app/admin/debug/components/DebugControlTower.tsx"),
  "utf8",
);

describe("admin debug local fixture boundary", () => {
  it("labels local admin UI fixture debug evidence as source_missing", () => {
    expect(pageSource).toContain("isAdminUiTestSessionUser(user)");
    expect(pageSource).toContain('data-admin-debug-fixture-boundary="true"');
    expect(pageSource).toContain('data-admin-debug-fixture-state="source_missing"');
    expect(pageSource).toContain("The Debug Console layout is inspectable");
    expect(pageSource).toContain("route checks, realtime evidence,");
    expect(pageSource).toContain("toLocalFixtureSummaryItem");
    expect(pageSource).toContain("toLocalFixtureDetailItem");
    expect(pageSource).toContain("isLocalAdminUiTestSession ? items.map(toLocalFixtureSummaryItem) : items");
    expect(pageSource).toContain("isLocalAdminUiTestSession ? items.map(toLocalFixtureDetailItem) : items");
    expect(pageSource).toContain("collecting: ${label.toLowerCase()} source requires verified admin access");
    expect(pageSource).toContain("source_missing fixture.");
    expect(pageSource).toContain("local_fixture_source_missing");
    expect(controlTowerSource).toContain("Source reports only");
    expect(controlTowerSource).toContain('data-admin-debug-control-tower-fixture-state="source_reports_only"');
    expect(controlTowerSource).toContain("generated source reports");
  });

  it("skips debug route reads and realtime listeners in fixture mode", () => {
    expect(pageSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug"');
    expect(pageSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug/preferences"');
    expect(pageSource).toContain('isLocalAdminUiTestSession ? null : "/api/admin/debug/assistant"');
    expect(pageSource).toContain("useAdminDebugRealtime({ enabled: !isLocalAdminUiTestSession })");
    expect(pageSource).toContain("useAdminAiAssistantRealtime(aiDebugData, { enabled: !isLocalAdminUiTestSession })");
    expect(pageSource).toContain("useAdminOverview({ enabled: !isLocalAdminUiTestSession })");
    expect(pageSource).toContain("isLocalAdminUiTestSession={isLocalAdminUiTestSession}");
    expect(realtimeHookSource).toContain("useAdminDebugRealtime(options: { enabled?: boolean } = {})");
    expect(realtimeHookSource).toContain("if (!enabled) {");
    expect(aiRealtimeHookSource).toContain("options: { enabled?: boolean } = {}");
    expect(aiRealtimeHookSource).toContain("if (!enabled) {");
    expect(nowTabSource).toContain("isLocalAdminUiTestSession?: boolean");
    expect(controlTowerSource).toContain("isLocalAdminUiTestSession = false");
    expect(controlTowerSource).toContain('data-admin-debug-control-tower-fixture-boundary="true"');
    expect(controlTowerSource).toContain('fetch("/api/admin/debug/control-tower", { credentials: "same-origin" })');
  });

  it("guards debug mutations and protected balance adjustments behind verified admin access", () => {
    expect(pageSource).toContain("Debug preferences are source_missing in local UI review.");
    expect(pageSource).toContain("Debug evidence is source_missing in local UI review.");
    expect(pageSource).toContain("permission_blocked: balance adjustments require verified admin access.");
    expect(pageSource).toContain("permission_blocked: repair actions require verified admin access.");
    expect(pageSource).toContain("AI debug settings are source_missing in local UI review.");
    expect(pageSource).toContain("permission_blocked: live AI debug guidance requires verified admin access.");
  });
});

import { act as debugAct, createElement as debugElement } from "react";
import { createRoot as createDebugRoot, type Root as DebugRoot } from "react-dom/client";
import { SWRConfig as DebugSWRConfig, type Cache as DebugSWRCache } from "swr";
import { afterEach as debugAfterEach, beforeEach as debugBeforeEach, vi } from "vitest";

const debugPollingState = vi.hoisted(() => ({
  user: { uid: "verified-admin-polling-fixture" } as { uid: string } | null,
  fixtureMode: false,
  calls: [] as Array<{ url: string; method: string; body?: unknown }>,
  debugEnabled: [] as boolean[],
  subscriptions: [] as Array<{ active: boolean; reference: unknown }>,
  summary: {} as Record<string, unknown>,
  assistantStatus: 200,
  assistantDeferred: null as null | { promise: Promise<Response>; resolve: (response: Response) => void },
  preferences: {} as Record<string, unknown>,
  preferencesDeferred: null as null | { promise: Promise<Response>; resolve: (response: Response) => void },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({ user: debugPollingState.user, userProfile: { role: "admin" } }),
}));
vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method || "GET";
    debugPollingState.calls.push({ url, method, body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    if (url === "/api/admin/debug/assistant") {
      if (method === "PUT") return Response.json({ success: true });
      if (method === "POST") return Response.json(debugPollingState.summary);
      if (debugPollingState.assistantDeferred) return debugPollingState.assistantDeferred.promise;
      return Response.json(debugPollingState.assistantStatus === 200 ? debugPollingState.summary : { error: "Assistant source unavailable" }, { status: debugPollingState.assistantStatus });
    }
    if (url === "/api/admin/debug/preferences") {
      if (method === "PUT") return Response.json({ success: true });
      if (debugPollingState.preferencesDeferred) return debugPollingState.preferencesDeferred.promise;
      return Response.json({ preferences: debugPollingState.preferences });
    }
    if (url === "/api/admin/overview") return Response.json({
      generatedAt: Date.now(), stats: {}, deltas: {}, topDrops: [], recentTransactions: [],
      truthNotes: { overview: "Bounded fixture snapshot" }, verification: { status: "unavailable" },
    });
    if (url === "/api/admin/debug") return Response.json({
      opsHealth: { canonicalState: { status: "source_missing", reason: "Synthetic source fixture" } },
      stats: {}, routeRuntimeHealth: [], panelSystemLogs: [],
    });
    throw new Error(`Unexpected fixture request ${method} ${url}`);
  }),
}));
vi.mock("@/lib/client-error-reporting", () => ({ reportClientIssue: vi.fn() }));
vi.mock("@/lib/admin/admin-ui-test-session", () => ({ isAdminUiTestSessionUser: () => debugPollingState.fixtureMode }));
vi.mock("@/hooks/useCompactViewport", () => ({ useCompactViewport: () => false }));
vi.mock("@/components/Analytics/PageViewEvent", () => ({ PageViewEvent: () => null }));
vi.mock("@/app/admin/debug/components/DebugTabNow", () => ({ DebugTabNow: () => null }));
vi.mock("@/app/admin/debug/components/DebugTabActions", () => ({ DebugTabActions: () => null }));
vi.mock("@/app/admin/debug/components/DebugTabMonitoring", () => ({ DebugTabMonitoring: () => null }));
vi.mock("@/app/admin/debug/components/DebugTabInfrastructure", () => ({ DebugTabInfrastructure: () => null }));
vi.mock("@/app/admin/debug/components/DebugTabAdvanced", () => ({ DebugTabAdvanced: () => null }));
vi.mock("@/app/admin/debug/hooks/useAdminDebugRealtime", () => ({
  useAdminDebugRealtime: (options: { enabled?: boolean }) => {
    debugPollingState.debugEnabled.push(options.enabled === true);
    return {
      clusteredWarnings: [], activeWarnings: [], historicalWarnings: [], routeHealth: [],
      repairProposals: [], queueHeartbeats: [], listenerErrors: {},
    };
  },
}));
vi.mock("@/lib/firebase-data", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => ({ collection: name }),
  doc: (reference: unknown, id: string) => ({ reference, id }),
  query: (reference: unknown, ...constraints: unknown[]) => ({ reference, constraints }),
  where: (...args: unknown[]) => ({ where: args }),
  orderBy: (...args: unknown[]) => ({ orderBy: args }),
  limit: (value: number) => ({ limit: value }),
  onSnapshot: (reference: unknown) => {
    const subscription = { reference, active: true };
    debugPollingState.subscriptions.push(subscription);
    return () => { subscription.active = false; };
  },
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() } }));

import DebugConsole from "@/app/admin/debug/page";
import { AI_DEBUG_ASSISTANT_MODEL } from "@/lib/ai-debug-assistant";

describe("DebugConsole assistant polling integration", () => {
  let debugContainer: HTMLDivElement;
  let debugRoot: DebugRoot | null;
  let debugCache: DebugSWRCache;

  function assistantReads() {
    return debugPollingState.calls.filter((call) => call.url === "/api/admin/debug/assistant" && call.method === "GET");
  }

  async function settleDebug(ms = 1) {
    await debugAct(async () => {
      await vi.advanceTimersByTimeAsync(ms);
      for (let i = 0; i < 6; i += 1) await Promise.resolve();
    });
  }

  async function mountDebug(strict = false) {
    const view = debugElement(DebugConsole);
    const { StrictMode } = await import("react");
    await debugAct(async () => {
      debugRoot = createDebugRoot(debugContainer);
      debugRoot.render(debugElement(DebugSWRConfig, { value: { provider: () => debugCache } }, strict ? debugElement(StrictMode, null, view) : view));
      for (let i = 0; i < 6; i += 1) await Promise.resolve();
    });
    await settleDebug();
  }

  async function selectWorkstream(value: string) {
    const select = debugContainer.querySelector<HTMLSelectElement>('select[aria-label="Debug workstream"]');
    expect(select).toBeTruthy();
    await debugAct(async () => {
      select!.value = value;
      select!.dispatchEvent(new Event("change", { bubbles: true }));
      for (let i = 0; i < 6; i += 1) await Promise.resolve();
    });
    await settleDebug();
  }

  function assistantEvidence() {
    return Array.from(debugContainer.querySelectorAll("article")).find((item) => item.textContent?.includes("AI assistant"));
  }

  function deferredResponse() {
    let resolve!: (response: Response) => void;
    const promise = new Promise<Response>((completion) => { resolve = completion; });
    return { promise, resolve };
  }

  debugBeforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"] });
    vi.setSystemTime(new Date("2026-10-03T04:00:00.000Z"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    Object.assign(debugPollingState, {
      user: { uid: "verified-admin-polling-fixture" }, fixtureMode: false, calls: [], debugEnabled: [], subscriptions: [],
      assistantStatus: 200, assistantDeferred: null, preferences: {}, preferencesDeferred: null,
      summary: {
        summary: "Source-bound assistant fixture", issue_summary: "Bounded diagnostic fixture", likely_cause: "No provider evidence claimed",
        source_evidence: [], likely_root_causes: [], affected_systems: [], safe_fix_plan: [], files_to_inspect: [], validators_to_run: [],
        apply_eligibility: { state: "inspect_only", reason: "Fixture only" }, rollback_note: "No mutation", confidence: "low", confidence_notes: [], suggested_next_checks: [],
        fallback_used: false, response_state: "saved", enabled: true, runtime_ready: true, live_call_eligible: true, cost_guard_state: "admin_gated",
        provider: "vertex_ai", model_role: "admin_debug_assistant", configured_model: AI_DEBUG_ASSISTANT_MODEL, resolved_model: AI_DEBUG_ASSISTANT_MODEL,
        model: AI_DEBUG_ASSISTANT_MODEL, prompt_version: "debug-assistant-v2", generated_at: new Date().toISOString(), debug_evidence_generated_at: new Date().toISOString(),
        live_summary_status: "delayed", displayed_summary_source: "saved_guidance", displayed_summary_generated_at: new Date().toISOString(), displayed_summary_freshness: "fresh", latency_ms: 0,
      },
    });
    debugCache = new Map();
    debugContainer = document.createElement("div");
    document.body.appendChild(debugContainer);
    debugRoot = null;
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  debugAfterEach(async () => {
    await debugAct(async () => { debugRoot?.unmount(); });
    debugRoot = null;
    debugContainer.remove();
    vi.useRealTimers();
  });

  it("keeps one initial assistant read and stops periodic reads in the default non-AI workstream", async () => {
    await mountDebug();
    expect(assistantReads()).toHaveLength(1);
    await settleDebug(65_000);
    expect(assistantReads()).toHaveLength(1);
    expect(debugPollingState.calls.filter((call) => call.url === "/api/admin/debug" && call.method === "GET")).toHaveLength(2);
    expect(assistantEvidence()?.textContent).toContain("last loaded");
    expect(debugPollingState.calls.every((call) => call.method === "GET")).toBe(true);
  });

  it("starts the established cadence in AI and cancels the pending cadence when leaving it", async () => {
    await mountDebug();
    await selectWorkstream("ai");
    const enteringReads = assistantReads().length;
    await settleDebug(15_100);
    expect(assistantReads()).toHaveLength(enteringReads + 1);
    await selectWorkstream("now");
    const leavingReads = assistantReads().length;
    await settleDebug(45_100);
    expect(assistantReads()).toHaveLength(leavingReads);
    expect(debugPollingState.debugEnabled.every(Boolean)).toBe(true);
    expect(debugPollingState.subscriptions.filter((subscription) => subscription.active)).toHaveLength(6);
  });

  it("refreshes returned AI immediately once and retains its existing model controls", async () => {
    await mountDebug();
    await selectWorkstream("ai");
    await selectWorkstream("now");
    await settleDebug(3_000);
    const before = assistantReads().length;
    debugPollingState.summary = { ...debugPollingState.summary, configured_model: "gemini-return-fixture", resolved_model: "gemini-return-fixture", model: "gemini-return-fixture" };
    await selectWorkstream("ai");
    expect(assistantReads()).toHaveLength(before + 1);
    expect(debugContainer.textContent).toContain("gemini-return-fixture");
  });

  it("does not duplicate an initial request when saved AI preferences hydrate while it is in flight", async () => {
    const pending = deferredResponse();
    debugPollingState.assistantDeferred = pending;
    debugPollingState.preferences = { activeTab: "ai" };
    await mountDebug();
    expect(assistantReads()).toHaveLength(1);
    debugPollingState.assistantDeferred = null;
    await debugAct(async () => { pending.resolve(Response.json(debugPollingState.summary)); });
    await settleDebug();
    expect(assistantReads()).toHaveLength(1);
    await settleDebug(15_100);
    expect(assistantReads()).toHaveLength(2);
    expect(debugContainer.textContent).toContain("Source-bound assistant fixture");
  });

  it("retains an admitted in-flight response after leaving AI without starting another transport", async () => {
    await mountDebug();
    await selectWorkstream("ai");
    const pending = deferredResponse();
    debugPollingState.assistantDeferred = pending;
    await settleDebug(15_100);
    const before = assistantReads().length;
    await selectWorkstream("now");
    debugPollingState.assistantDeferred = null;
    debugPollingState.summary = { ...debugPollingState.summary, response_state: "fallback", fallback_used: true, displayed_summary_source: "deterministic_fallback" };
    await debugAct(async () => { pending.resolve(Response.json(debugPollingState.summary)); });
    await settleDebug(45_100);
    expect(assistantReads()).toHaveLength(before);
    expect(assistantEvidence()?.textContent).toContain("last loaded");
    expect(assistantEvidence()?.textContent).toContain("fallback");
  });

  it("keeps one authoritative focus refresh with real SWR and the existing focus handler", async () => {
    await mountDebug();
    await settleDebug(6_000);
    const before = assistantReads().length;
    await debugAct(async () => { window.dispatchEvent(new Event("focus")); });
    await settleDebug(10);
    expect(assistantReads()).toHaveLength(before + 1);
  });

  it("keeps reconnect refresh active outside AI without restarting its periodic cadence", async () => {
    await mountDebug();
    await settleDebug(3_000);
    const before = assistantReads().length;
    await debugAct(async () => { window.dispatchEvent(new Event("offline")); window.dispatchEvent(new Event("online")); });
    await settleDebug(10);
    expect(assistantReads()).toHaveLength(before + 1);
    await settleDebug(45_100);
    expect(assistantReads()).toHaveLength(before + 1);
  });

  it("keeps permanent assistant denial visible outside AI and recovers on a fresh explicit focus", async () => {
    debugPollingState.assistantStatus = 403;
    await mountDebug();
    expect(assistantEvidence()?.textContent).toContain("could not be loaded");
    await settleDebug(20_000);
    expect(assistantReads()).toHaveLength(1);
    debugPollingState.assistantStatus = 200;
    await debugAct(async () => { window.dispatchEvent(new Event("focus")); });
    await settleDebug(10);
    expect(assistantReads()).toHaveLength(2);
    expect(assistantEvidence()?.textContent).not.toContain("could not be loaded");
    expect(assistantEvidence()?.textContent).toContain("last loaded");
  });

  it("keeps retained source distinct from known stale summary truth in the evidence drawer", async () => {
    debugPollingState.summary = { ...debugPollingState.summary, displayed_summary_freshness: "stale" };
    await mountDebug();
    expect(assistantEvidence()?.textContent).toContain("Refresh due");
    expect(assistantEvidence()?.textContent).toContain("last loaded");
    expect(assistantEvidence()?.textContent).not.toContain("AI summary is current");
  });

  it("keeps explicit settings and live guidance actions wired to exactly one read invalidation each", async () => {
    await mountDebug();
    await selectWorkstream("ai");
    const buttons = () => Array.from(debugContainer.querySelectorAll<HTMLButtonElement>("button"));
    const save = buttons().find((button) => button.textContent?.includes("Save assistant settings"));
    expect(save).toBeTruthy();
    const beforeSave = assistantReads().length;
    await debugAct(async () => { save!.click(); });
    await settleDebug();
    expect(debugPollingState.calls.filter((call) => call.url === "/api/admin/debug/assistant" && call.method === "PUT")).toHaveLength(1);
    expect(assistantReads()).toHaveLength(beforeSave + 1);
    const generate = buttons().find((button) => button.textContent?.includes("Generate live guidance"));
    expect(generate).toBeTruthy();
    const beforeGenerate = assistantReads().length;
    await debugAct(async () => { generate!.click(); });
    await settleDebug();
    expect(debugPollingState.calls.filter((call) => call.url === "/api/admin/debug/assistant" && call.method === "POST")).toHaveLength(1);
    expect(assistantReads()).toHaveLength(beforeGenerate + 1);
  });

  it("does not fetch or install either realtime lane in local fixture mode", async () => {
    debugPollingState.fixtureMode = true;
    await mountDebug();
    await selectWorkstream("ai");
    await settleDebug(65_000);
    expect(debugPollingState.calls).toHaveLength(0);
    expect(debugPollingState.debugEnabled.every((enabled) => !enabled)).toBe(true);
    expect(debugPollingState.subscriptions).toHaveLength(0);
    expect(debugContainer.textContent).toContain("source_missing");
  });

  it("cleans up pending AI cadence and real AI SDK subscriptions on unmount", async () => {
    await mountDebug();
    await selectWorkstream("ai");
    const before = assistantReads().length;
    await debugAct(async () => { debugRoot!.unmount(); debugRoot = null; });
    await settleDebug(65_000);
    expect(assistantReads()).toHaveLength(before);
    expect(debugPollingState.subscriptions.every((subscription) => !subscription.active)).toBe(true);
  });

  it("bounds transient assistant retries outside AI and recovers without interval amplification", async () => {
    debugPollingState.assistantStatus = 503;
    await mountDebug();
    await settleDebug(95_000);
    expect(assistantReads()).toHaveLength(4);
    expect(assistantEvidence()?.textContent).toContain("could not be loaded");
    debugPollingState.assistantStatus = 200;
    const before = assistantReads().length;
    await debugAct(async () => { window.dispatchEvent(new Event("focus")); });
    await settleDebug(10);
    expect(assistantReads()).toHaveLength(before + 1);
    expect(assistantEvidence()?.textContent).not.toContain("could not be loaded");
  });

  it("skips hidden focus and coalesces a visible return plus focus into one verified refresh", async () => {
    await mountDebug();
    await settleDebug(6_000);
    const before = assistantReads().length;
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await debugAct(async () => { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); });
    await settleDebug(10);
    expect(assistantReads()).toHaveLength(before);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    await debugAct(async () => { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("focus")); });
    await settleDebug(10);
    expect(assistantReads()).toHaveLength(before + 1);
  });

  it("keeps StrictMode initial delivery deduplicated through the existing SWR cache", async () => {
    await mountDebug(true);
    expect(assistantReads()).toHaveLength(1);
    await settleDebug(65_000);
    expect(assistantReads()).toHaveLength(1);
  });
});
