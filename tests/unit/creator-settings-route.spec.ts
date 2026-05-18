import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  readProjection: vi.fn(),
  update: vi.fn(),
  doc: vi.fn(),
  collection: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  AggregateField: {
    sum: vi.fn((field: string) => ({ kind: "sum", field })),
  },
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/admin-creator-projection", () => ({
  buildAdminCreatorProjectionReadOnlyResponse: () => NextResponse.json({
    success: false,
    error: "Creator dashboard is read-only while viewing as a creator.",
    code: "admin_projection_read_only",
  }, { status: 403 }),
  readAdminCreatorProjectionContext: (...args: unknown[]) => mockState.readProjection(...args),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  STANDARD: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockState.collection(...args),
  },
}));

vi.mock("@/lib/creator-experiences", () => ({
  DEFAULT_CREATOR_RESTRICTIONS: {
    messagingRestricted: false,
    broadcastsRestricted: false,
    subscriptionsRestricted: false,
    bookingsRestricted: false,
    customRequestsRestricted: false,
    dropSubmissionsRestricted: false,
    payoutsRestricted: false,
  },
  DEFAULT_CREATOR_SETTINGS: {
    messagingEnabled: true,
    broadcastsEnabled: true,
    subscriptionsEnabled: true,
    bookingsEnabled: true,
    customRequestsEnabled: true,
    subscriptionPriceGd: 500,
    availabilityWindows: [],
  },
  isCreatorOrAdminRole: (role: unknown) => role === "creator" || role === "admin",
  normalizeCreatorRestrictions: (value: unknown) => value ?? {},
  normalizeCreatorSettings: (value: unknown) => value ?? {},
}));

vi.mock("@/lib/server/creator-experiences", () => ({
  buildCreatorUpdateMerge: (update: Record<string, unknown>) => update,
  sanitizeCreatorRestrictionsUpdate: (update: Record<string, unknown>) => update,
  sanitizeCreatorSettingsUpdate: (update: Record<string, unknown>) => update,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/identity/actor-markers", () => ({
  actorMarkerToTelemetryPayload: vi.fn(() => ({})),
  assertKnownActor: vi.fn((value: unknown) => value),
  buildActorMarker: vi.fn((value: unknown) => value),
}));

const route = await import("@/app/api/creator/settings/route");
const { GET, PUT } = route;

type FirestoreMockOptions = {
  userData?: Record<string, unknown>;
  aggregateFailures?: string[];
  countFailures?: string[];
  relationshipsExists?: boolean;
  dropsFailure?: boolean;
};

function installFirestoreMock(options: FirestoreMockOptions = {}) {
  const userData = options.userData ?? {
    role: "creator",
    profileViewsCount: 8,
    creatorSettings: { broadcastsEnabled: true },
    creatorRestrictions: {},
  };
  const aggregateFailures = new Set(options.aggregateFailures ?? []);
  const countFailures = new Set(options.countFailures ?? []);
  mockState.doc.mockImplementation((id: string) => ({
    get: vi.fn(async () => ({
      exists: true,
      data: () => userData,
    })),
    update: mockState.update,
    id,
  }));
  mockState.collection.mockImplementation((collectionName: string) => {
    if (collectionName === "users") {
      return { doc: mockState.doc };
    }
    if (collectionName === "creator_relationships_ops") {
      return {
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: options.relationshipsExists ?? true,
            data: () => ({ followerCount: 4 }),
          })),
        })),
      };
    }
    const counts: Record<string, number> = {
      creator_subscriptions: 0,
      creator_custom_requests: 0,
      creator_call_bookings: 2,
      drops: 0,
    };
    const sums: Record<string, Record<string, number>> = {
      creator_ledger_accruals: { totalEarnings: 0 },
      creator_payout_requests: { totalPending: 50 },
    };
    const queryBuilder = {
      where: vi.fn(() => queryBuilder),
      aggregate: vi.fn(() => ({
        get: vi.fn(async () => {
          if (aggregateFailures.has(collectionName)) {
            throw new Error(`${collectionName} aggregate unavailable`);
          }
          return {
            data: () => sums[collectionName] ?? {},
          };
        }),
      })),
      count: vi.fn(() => ({
        get: vi.fn(async () => {
          if (countFailures.has(collectionName) || (collectionName === "drops" && options.dropsFailure)) {
            throw new Error(`${collectionName} count unavailable`);
          }
          return {
            data: () => ({ count: counts[collectionName] ?? 0 }),
          };
        }),
      })),
    };
    return queryBuilder;
  });
}

describe("creator settings route", () => {
  beforeEach(() => {
    mockState.guardApiRequest.mockReset();
    mockState.handleApiError.mockReset();
    mockState.readProjection.mockReset();
    mockState.update.mockReset();
    mockState.doc.mockReset();
    mockState.collection.mockReset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "creator_1",
      email: "creator@example.com",
    });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.readProjection.mockReturnValue(null);
    installFirestoreMock();
  });

  it("returns statsEvidence derived from existing settings aggregate reads", async () => {
    const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats).toMatchObject({
      earningsGd: 0,
      pendingCashoutGd: 50,
      followerCount: 4,
      profileViewsCount: 8,
      activeSubscribers: 0,
      openRequests: 0,
      bookedCalls: 2,
    });
    expect(body.statsEvidence).toMatchObject({
      sourceTruth: "partial",
      sourceFreshness: "fresh",
      zeroValuesAreProven: false,
      readOnlyProjection: false,
    });
    expect(body.statsEvidence.generatedAtUtc).toEqual(expect.any(String));
    expect(body.statsEvidence.sources.subscriptions.state).toBe("queried_zero");
    expect(body.statsEvidence.sources.callBookings.state).toBe("verified_sample");
    expect(body.statsEvidence.sources.ledgerAccruals.state).toBe("partial");
    expect(body.statsEvidence.sources.pendingPayouts.state).toBe("verified_sample");
  });

  it("returns safe defaults and partial evidence when creator settings are not configured", async () => {
    installFirestoreMock({
      userData: {
        role: "creator",
        profileViewsCount: 8,
      },
    });

    const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.settingsState).toBe("not_configured");
    expect(body.creatorSettings).toMatchObject({
      broadcastsEnabled: true,
      bookingsEnabled: true,
      customRequestsEnabled: true,
    });
    expect(body.creatorRestrictions).toMatchObject({
      messagingRestricted: false,
      broadcastsRestricted: false,
    });
    expect(body.statsEvidence.sourceTruth).toBe("partial");
    expect(body.statsEvidence.issues).toContain("creator_settings_not_configured");
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("returns partial evidence instead of 500 when ledger aggregation fails", async () => {
    installFirestoreMock({
      aggregateFailures: ["creator_ledger_accruals"],
    });

    const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.earningsGd).toBe(0);
    expect(body.statsEvidence.sourceTruth).toBe("partial");
    expect(body.statsEvidence.sources.ledgerAccruals.state).toBe("partial");
    expect(body.statsEvidence.sources.ledgerAccruals.sampleKnown).toBe(false);
    expect(body.statsEvidence.issues).toContain("ledgerAccruals_source_unavailable");
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("returns partial evidence when noncritical read/count sources fail", async () => {
    installFirestoreMock({
      countFailures: ["creator_subscriptions"],
      relationshipsExists: false,
      dropsFailure: true,
    });

    const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.activeSubscribers).toBe(0);
    expect(body.stats.followerCount).toBe(0);
    expect(body.stats.liveDropsCount).toBe(0);
    expect(body.statsEvidence.sourceTruth).toBe("partial");
    expect(body.statsEvidence.sources.subscriptions.state).toBe("unavailable");
    expect(body.statsEvidence.sources.relationshipsOps.state).toBe("missing_source");
    expect(body.statsEvidence.sources.drops.state).toBe("unavailable");
    expect(body.statsEvidence.issues).toEqual(expect.arrayContaining([
      "subscriptions_source_unavailable",
      "relationshipsOps_source_unavailable",
      "drops_source_unavailable",
    ]));
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("updates the creator's own settings through the canonical route", async () => {
    const response = await PUT(new NextRequest("http://localhost/api/creator/settings", {
      method: "PUT",
      body: JSON.stringify({
        creatorSettings: { broadcastsEnabled: false },
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.doc).toHaveBeenCalledWith("creator_1");
    expect(mockState.update).toHaveBeenCalled();
  });

  it("rejects oversized creator settings updates before parsing JSON", async () => {
    const oversizedBody = JSON.stringify({ creatorSettings: { bio: "x".repeat(33_000) } });
    const response = await PUT(new NextRequest("http://localhost/api/creator/settings", {
      method: "PUT",
      body: oversizedBody,
      headers: {
        "Content-Type": "application/json",
        "content-length": String(oversizedBody.length),
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toMatchObject({ success: false, code: "payload_too_large" });
    expect(mockState.update).not.toHaveBeenCalled();
  });

  it("rejects invalid creator settings JSON with a typed safe error", async () => {
    const response = await PUT(new NextRequest("http://localhost/api/creator/settings", {
      method: "PUT",
      body: "{bad",
      headers: {
        "Content-Type": "application/json",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ success: false, code: "invalid_json" });
    expect(mockState.update).not.toHaveBeenCalled();
  });

  it("blocks admin projection writes on creator settings", async () => {
    mockState.readProjection.mockReturnValue({
      active: true,
      targetCreatorId: "creator_1",
      actorAdminUid: "admin_1",
      startedAt: Date.now(),
      projectionMode: "read_only_creator_projection",
      sourceTruth: "server_validated_projection",
    });

    const request = new NextRequest("http://localhost/api/creator/settings", {
      method: "PUT",
      body: JSON.stringify({
        creatorSettings: { broadcastsEnabled: false },
      }),
      headers: {
        "Content-Type": "application/json",
        "x-admin-view-as-user-id": "creator_1",
        "x-admin-view-as-actor-uid": "admin_1",
        "x-admin-view-as-started-at": String(Date.now()),
        "x-admin-view-as-role": "creator",
      },
    });
    const response = await PUT(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("admin_projection_read_only");
    expect(mockState.update).not.toHaveBeenCalled();
  });
});
