import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

vi.mock("@/lib/analytics-identifiers", () => ({
  createAnalyticsBatchId: vi.fn((sessionId: string) => `batch_${sessionId}_test`),
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

    const { buildGuestAnalyticsIngestPayload } = await import("@/components/Analytics/DeepTracker");
    const payload = buildGuestAnalyticsIngestPayload([
      { type: "page_view", timestamp: Date.now(), path: "/" },
    ]);

    expect(payload).toMatchObject({
      anonymousVisitorId: "subject_existing-client",
      sessionId: "sess_existing-session",
      batchId: "batch_sess_existing-session_test",
    });
    expect(Object.prototype.hasOwnProperty.call(payload, "user_id")).toBe(false);
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
