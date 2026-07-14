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
  FieldValue: {
    serverTimestamp: vi.fn(() => "server_timestamp"),
    increment: vi.fn((value: number) => ({ kind: "increment", value })),
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
    runTransaction: vi.fn(async (callback: (transaction: {
      get: (ref: unknown) => Promise<{ exists: boolean; id: string; data: () => Record<string, unknown> }>;
      set: (...args: unknown[]) => void;
    }) => Promise<void>) => callback({
      get: vi.fn(async () => ({ exists: false, id: "debug_doc", data: () => ({}) })),
      set: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/creator-experiences", () => ({
  CREATOR_BOOKING_MIN_MINUTES: 1,
  CREATOR_BOOKING_RATES: {
    phone: 1000,
    video: 1000,
  },
  CREATOR_MESSAGE_COSTS: {
    textGd: 25,
    imageGd: 50,
    videoGd: 100,
  },
  CREATOR_SUBSCRIPTION_MIN_GD: 500,
  DEFAULT_CREATOR_REQUEST_CATEGORIES: [
    { id: "custom-photo", label: "Custom photo", priceGd: 300, enabled: true },
  ],
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
    fanPassWelcomeText: "",
    phoneRatePerMinuteGd: 1000,
    videoRatePerMinuteGd: 1000,
    bookingMinimumMinutes: 1,
    videoSubscriberDiscountPercent: 0,
    chatFreeForSubscribers: true,
    requestCategories: [
      { id: "custom-photo", label: "Custom photo", priceGd: 300, enabled: true },
    ],
    availabilityTimezone: "America/Chicago",
    availabilityWindows: [],
    broadcastDefaultAudience: "followers",
    profileTimelineEnabled: true,
    showApprovedDropsOnTimeline: true,
    showBroadcastsOnTimeline: true,
  },
  isCreatorOrAdminRole: (role: unknown) => role === "creator" || role === "admin",
  normalizeCreatorRequestCategories: (value: unknown) => Array.isArray(value) && value.length > 0
    ? value
    : [{ id: "custom-photo", label: "Custom photo", priceGd: 300, enabled: true }],
  normalizePositiveWholeNumber: (value: unknown, fallback: number) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return fallback;
    }
    return Math.round(value);
  },
  normalizeCreatorRestrictions: (value: unknown) => value ?? {},
  normalizeCreatorSettings: (value: unknown) => ({
    messagingEnabled: true,
    broadcastsEnabled: true,
    subscriptionsEnabled: true,
    bookingsEnabled: true,
    customRequestsEnabled: true,
    subscriptionPriceGd: 500,
    fanPassWelcomeText: "",
    phoneRatePerMinuteGd: 1000,
    videoRatePerMinuteGd: 1000,
    bookingMinimumMinutes: 1,
    videoSubscriberDiscountPercent: 0,
    chatFreeForSubscribers: true,
    requestCategories: [
      { id: "custom-photo", label: "Custom photo", priceGd: 300, enabled: true },
    ],
    availabilityTimezone: "America/Chicago",
    availabilityWindows: [],
    broadcastDefaultAudience: "followers",
    profileTimelineEnabled: true,
    showApprovedDropsOnTimeline: true,
    showBroadcastsOnTimeline: true,
    ...((value && typeof value === "object") ? value as Record<string, unknown> : {}),
  }),
}));

vi.mock("@/lib/server/creator-experiences", () => ({
  buildCreatorUpdateMerge: (update: Record<string, unknown>) => update,
  sanitizeCreatorRestrictionsUpdate: (update: Record<string, unknown>) => update,
  sanitizeCreatorSettingsUpdate: (update: Record<string, unknown>) => update,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: vi.fn(async () => undefined),
}));

vi.mock("@/lib/identity-truth/identity/actor-markers", () => ({
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
  relationshipCount?: number;
  relationshipFailure?: boolean;
  drops?: Array<{ id: string; data: Record<string, unknown> }>;
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
    if (collectionName === "debug_evidence_rollups" || collectionName === "debug_evidence") {
      return {
        doc: vi.fn(() => ({ id: "debug_doc" })),
      };
    }
    if (collectionName === "server_diagnostics") {
      return {
        add: vi.fn(async () => ({ id: "diagnostic_1" })),
      };
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
      creator_relationships: options.relationshipCount ?? 4,
      creator_subscriptions: 0,
      creator_custom_requests: 0,
      creator_call_bookings: 2,
      drops: 0,
    };
    const sums: Record<string, Record<string, number>> = {
      creator_ledger_accruals: { totalEarnings: 0 },
      creator_payout_requests: { totalPending: 50 },
    };
    const createQuery = (filters: Array<[string, string, unknown]> = []): any => ({
      where: vi.fn((field: string, operator: string, value: unknown) => createQuery([...filters, [field, operator, value]])),
      limit: vi.fn(() => createQuery(filters)),
      get: vi.fn(async () => {
        if (collectionName === "creator_relationships" && options.relationshipFailure) {
          throw new Error("creator_relationships unavailable");
        }
        if (collectionName === "drops" && options.dropsFailure) {
          throw new Error("drops unavailable");
        }
        const docs = (collectionName === "drops" ? (options.drops ?? []) : [])
          .filter((record) => filters.every(([field, operator, value]) => {
            if (operator === "array-contains") {
              return Array.isArray(record.data[field]) && record.data[field].includes(value);
            }
            return record.data[field] === value;
          }))
          .map((record) => ({
            id: record.id,
            data: () => record.data,
          }));
        return {
          docs,
          size: docs.length,
        };
      }),
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
          if (collectionName === "creator_relationships" && options.relationshipFailure) {
            throw new Error("creator_relationships count unavailable");
          }
          if (countFailures.has(collectionName) || (collectionName === "drops" && options.dropsFailure)) {
            throw new Error(`${collectionName} count unavailable`);
          }
          return {
            data: () => ({ count: counts[collectionName] ?? 0 }),
          };
        }),
      })),
    });
    return createQuery();
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
      sourceTruth: "canonical",
      sourceFreshness: "fresh",
      zeroValuesAreProven: true,
      readOnlyProjection: false,
    });
    expect(body.statsEvidence.generatedAtUtc).toEqual(expect.any(String));
    expect(body.statsEvidence.sources.subscriptions.state).toBe("queried_zero");
    expect(body.statsEvidence.sources.callBookings.state).toBe("verified_sample");
    expect(body.statsEvidence.sources.ledgerAccruals.state).toBe("queried_zero");
    expect(body.statsEvidence.sources.ledgerAccruals.sampleKnown).toBe(true);
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
      relationshipFailure: true,
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
    expect(body.statsEvidence.sources.relationshipsOps.state).toBe("unavailable");
    expect(body.statsEvidence.sources.drops.state).toBe("unavailable");
    expect(body.statsEvidence.issues).toEqual(expect.arrayContaining([
      "subscriptions_source_unavailable",
      "fans_source_unavailable",
      "drops_source_unavailable",
    ]));
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("maps relationship source counts to Fans and does not fall back to zero", async () => {
    installFirestoreMock({
      relationshipCount: 60,
    });

    const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.followerCount).toBe(60);
    expect(body.statsEvidence.fanCountSource).toBe("relationship_count");
    expect(body.statsEvidence.sources.fans.state).toBe("verified_sample");
  });

  it("uses profile follower count as partial evidence when relationship count is unavailable", async () => {
    installFirestoreMock({
      relationshipFailure: true,
      relationshipsExists: false,
      userData: {
        role: "creator",
        profileViewsCount: 8,
        followerCount: 60,
        creatorSettings: { broadcastsEnabled: true },
        creatorRestrictions: {},
      },
    });

    const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.followerCount).toBe(60);
    expect(body.statsEvidence.sourceTruth).toBe("partial");
    expect(body.statsEvidence.fanCountSource).toBe("profile_follower_count");
    expect(body.statsEvidence.sources.fans.sampleKnown).toBe(true);
  });

  it("counts creator owned expired drops in dashboard content without using public-only live count", async () => {
    installFirestoreMock({
      drops: [
        { id: "active_owned", data: { creatorId: "creator_1", submittedByCreatorId: "creator_1", status: "active" } },
        { id: "expired_owned", data: { creatorId: "creator_1", submittedByCreatorId: "creator_1", status: "expired" } },
        { id: "assigned_only", data: { assignedCreatorIds: ["creator_1"], status: "archived", archived: true } },
        { id: "other_creator", data: { creatorId: "creator_2", submittedByCreatorId: "creator_2", status: "active" } },
        { id: "all_creator_unassigned", data: { allCreators: true, status: "active" } },
      ],
    });

    const response = await GET(new NextRequest("http://localhost/api/creator/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stats.contentCount).toBe(3);
    expect(body.stats.liveDropsCount).toBe(1);
    expect(body.statsEvidence.contentCountScope).toBe("creator_owned_or_assigned");
    expect(body.statsEvidence.contentCountIncludes).toEqual(expect.arrayContaining(["active", "expired", "archived"]));
    expect(body.statsEvidence.sources.content.value).toBe(3);
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

  it("returns invalid_creator_request when no creator setting is provided", async () => {
    const response = await PUT(new NextRequest("http://localhost/api/creator/settings", {
      method: "PUT",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      code: "invalid_creator_request",
      retryable: false,
    });
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
