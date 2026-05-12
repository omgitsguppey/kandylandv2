import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  batchCounter: 0,
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/lib/analytics-identifiers", () => ({
  createAnalyticsBatchId: vi.fn((sessionId: string) => `batch_${sessionId}_${mockState.batchCounter++}`),
}));

vi.mock("@/lib/client-diagnostics", () => ({
  recordClientDiagnostic: vi.fn(),
}));

vi.mock("@/lib/analytics-semantics", () => ({
  buildAnalyticsSemanticParams: vi.fn(() => ({})),
  resolveAnalyticsSemanticContext: vi.fn(() => ({
    category: "global",
    categoryLabel: "Global",
    scopeKey: "global_home",
    scopeLabel: "Homepage",
    surfaceKey: "global:home",
    surfaceLabel: "Homepage",
  })),
}));

vi.mock("@/lib/privacy-consent", () => ({
  canUseAnonymousAnalytics: vi.fn(() => true),
  readPrivacySettingsSnapshot: vi.fn(() => ({ anonymousAnalyticsEnabled: true })),
  subscribeToPrivacySettings: vi.fn(() => () => undefined),
}));

vi.mock("@/lib/telemetry", () => ({
  trackEvent: vi.fn(),
}));

type StorageMock = {
  getItem: ReturnType<typeof vi.fn>;
  setItem: ReturnType<typeof vi.fn>;
  removeItem: ReturnType<typeof vi.fn>;
};

function createStorageMock() {
  const store: Record<string, string> = {};
  const storage: StorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
  };

  return { store, storage };
}

describe("guest analytics identity", () => {
  beforeEach(() => {
    vi.resetModules();
    mockState.batchCounter = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-01T12:34:56Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("includes the canonical client anonymous visitor id in the existing DeepTracker ingest payload", async () => {
    const { store: localStore, storage: localStorage } = createStorageMock();
    const { store: sessionStore, storage: sessionStorage } = createStorageMock();
    localStore["kandydrops.clientSubject"] = "subject_existing-client";
    sessionStore.kandy_session_id = "sess_existing-session";

    vi.stubGlobal("window", { localStorage, sessionStorage });

    const {
      buildGuestAnalyticsIngestPayload,
      clearStableGuestAnalyticsBatchAfterSuccess,
    } = await import("@/components/Analytics/DeepTracker");
    const { payload } = buildGuestAnalyticsIngestPayload([
      { type: "page_view", timestamp: Date.now(), path: "/" },
    ]);

    expect(payload).toMatchObject({
      anonymousVisitorId: "subject_existing-client",
      sessionId: "sess_existing-session",
      batchId: "batch_sess_existing-session_0",
    });
    expect(Object.prototype.hasOwnProperty.call(payload, "user_id")).toBe(false);
  });

  it("reuses a stable batch id for the same queued payload and rotates for a new payload group", async () => {
    const { store: localStore, storage: localStorage } = createStorageMock();
    const { store: sessionStore, storage: sessionStorage } = createStorageMock();
    localStore["kandydrops.clientSubject"] = "subject_existing-client";
    sessionStore.kandy_session_id = "sess_existing-session";

    vi.stubGlobal("window", { localStorage, sessionStorage });

    const {
      buildGuestAnalyticsIngestPayload,
      clearStableGuestAnalyticsBatchAfterSuccess,
    } = await import("@/components/Analytics/DeepTracker");
    const events = [{ type: "page_view" as const, semanticEventName: "semantic_page_viewed" as const, timestamp: 1, path: "/" }];
    const first = buildGuestAnalyticsIngestPayload(events);
    const retry = buildGuestAnalyticsIngestPayload(events, first.stableBatch);
    const next = buildGuestAnalyticsIngestPayload([
      ...events,
      { type: "click" as const, semanticEventName: "semantic_target_clicked" as const, timestamp: 2, path: "/" },
    ], first.stableBatch);

    expect(retry.payload.batchId).toBe(first.payload.batchId);
    expect(next.payload.batchId).not.toBe(first.payload.batchId);
    expect(clearStableGuestAnalyticsBatchAfterSuccess(first.stableBatch, first.stableBatch.signature)).toBeNull();
    expect(first.payload.events[0].semanticEventName).toBe("semantic_page_viewed");
    expect(next.payload.events[1].semanticEventName).toBe("semantic_target_clicked");
  });

  it("omits anonymousVisitorId when identity persistence is denied", async () => {
    const { storage: localStorage } = createStorageMock();
    const { store: sessionStore, storage: sessionStorage } = createStorageMock();
    sessionStore.kandy_session_id = "sess_existing-session";

    vi.stubGlobal("window", { localStorage, sessionStorage });

    const { getClientAnalyticsIdentitySnapshot } = await import("@/lib/client-session");
    const identity = getClientAnalyticsIdentitySnapshot("denied");

    expect(identity).toEqual({
      anonymousVisitorId: null,
      sessionId: "sess_existing-session",
      consentState: "denied",
      identityPersistenceAllowed: false,
    });
  });
});
