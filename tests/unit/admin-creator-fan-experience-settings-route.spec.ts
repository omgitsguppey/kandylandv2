import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CREATOR_RESTRICTIONS,
  DEFAULT_CREATOR_SETTINGS,
} from "@/lib/creator-experiences";

type MockDocRef = {
  path: string;
  get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
  collection: (name: string) => MockCollectionRef;
};

type MockCollectionRef = {
  path: string;
  doc: (id: string) => MockDocRef;
};

function assertNoUndefinedDeep(value: unknown, path = "root") {
  if (value === undefined) {
    throw new Error(`Firestore write contains undefined at ${path}`);
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoUndefinedDeep(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") {
    return;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    assertNoUndefinedDeep(entry, `${path}.${key}`);
  });
}

const mockState = vi.hoisted(() => {
  const documents = new Map<string, Record<string, unknown>>();

  const buildCollectionRef = (path: string): MockCollectionRef => ({
    path,
    doc(id: string) {
      return buildDocRef(`${path}/${id}`);
    },
  });

  const buildDocRef = (path: string): MockDocRef => ({
    path,
    async get() {
      return {
        exists: documents.has(path),
        data: () => documents.get(path),
      };
    },
    collection(name: string) {
      return buildCollectionRef(`${path}/${name}`);
    },
  });

  const adminDb = {
    collection(name: string) {
      return buildCollectionRef(name);
    },
    runTransaction: vi.fn(async (callback: (transaction: {
      get: (ref: MockDocRef) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
      set: (ref: MockDocRef, data: unknown, options?: { merge?: boolean }) => void;
    }) => Promise<unknown>) => {
      const transaction = {
        async get(ref: MockDocRef) {
          return {
            exists: documents.has(ref.path),
            data: () => documents.get(ref.path),
          };
        },
        set(ref: MockDocRef, data: unknown, options?: { merge?: boolean }) {
          assertNoUndefinedDeep(data, ref.path);
          const current = options?.merge ? (documents.get(ref.path) ?? {}) : {};
          documents.set(ref.path, {
            ...current,
            ...(data as Record<string, unknown>),
          });
        },
      };

      return callback(transaction);
    }),
  };

  return {
    documents,
    adminDb,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    trackServerEvent: vi.fn(async () => undefined),
    reset() {
      documents.clear();
      adminDb.runTransaction.mockClear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.trackServerEvent.mockReset();
    },
  };
});

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: mockState.adminDb,
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/creator-admin", () => ({
  isCreatorOwnerEmail: (email?: string | null) => email === "owner@example.com",
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/admin/creator-fan-experience-settings/route";

function seedUser(userId: string, overrides: Record<string, unknown> = {}) {
  mockState.documents.set(`users/${userId}`, {
    uid: userId,
    email: `${userId}@example.com`,
    displayName: "Original Creator",
    username: userId,
    role: "creator",
    status: "active",
    creatorSettings: DEFAULT_CREATOR_SETTINGS,
    creatorRestrictions: DEFAULT_CREATOR_RESTRICTIONS,
    ...overrides,
  });
  mockState.documents.set(`creator_onboarding/${userId}`, {
    userId,
    email: `${userId}@example.com`,
  });
  mockState.documents.set(`creator_review_queue/${userId}`, {
    userId,
    role: "creator",
  });
}

function request(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/admin/creator-fan-experience-settings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/creator-fan-experience-settings", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "admin@example.com",
      role: "admin",
    });
    mockState.handleApiError.mockImplementation((error: Error) => NextResponse.json({
      error: error.message,
    }, { status: error.message.includes("Forbidden") ? 403 : 500 }));
  });

  it("admin settings update persists valid settings with audit and telemetry includes targetUserId", async () => {
    seedUser("creator_settings");

    const response = await POST(request({
      targetUserId: "creator_settings",
      creatorSettings: {
        ...DEFAULT_CREATOR_SETTINGS,
        subscriptionPriceGd: 700,
        phoneRatePerMinuteGd: 600,
        videoRatePerMinuteGd: 1200,
      },
      creatorRestrictions: DEFAULT_CREATOR_RESTRICTIONS,
      restrictionConfirmed: false,
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(expect.any(NextRequest), expect.objectContaining({
      auth: "admin",
      requireTrustedOrigin: true,
    }));
    expect(mockState.documents.get("users/creator_settings")).toMatchObject({
      creatorSettings: expect.objectContaining({
        subscriptionPriceGd: 700,
        phoneRatePerMinuteGd: 600,
        videoRatePerMinuteGd: 1200,
      }),
      creatorFanExperienceSettingsDebug: expect.objectContaining({
        creatorSettingsSource: "admin_roster",
        settingsNormalized: true,
        lastSettingsUpdatedBy: "admin_1",
        changedKeys: expect.arrayContaining(["subscriptionPriceGd"]),
      }),
    });
    expect(Array.from(mockState.documents.keys()).some((path) => path.includes("creator_experience_settings_updated"))).toBe(true);
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_experience_settings_saved", expect.objectContaining({
      actorType: "admin",
      actorUid: "admin_1",
      targetUserId: "creator_settings",
      performedAs: "admin_on_behalf",
      settingKey: "fan_experience_settings",
    }), "creator_settings");
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_experience_pricing_updated", expect.objectContaining({
      targetUserId: "creator_settings",
      settingKey: "subscriptionPriceGd",
    }), "creator_settings");
  });

  it("invalid pricing rejected before persistence", async () => {
    seedUser("creator_invalid");

    const response = await POST(request({
      targetUserId: "creator_invalid",
      creatorSettings: {
        ...DEFAULT_CREATOR_SETTINGS,
        subscriptionPriceGd: -1,
      },
      creatorRestrictions: DEFAULT_CREATOR_RESTRICTIONS,
      restrictionConfirmed: false,
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.code).toBe("invalid_admin_request");
    expect(payload.error).toContain("Fan Pass price");
    expect(mockState.documents.get("users/creator_invalid")).toMatchObject({
      creatorSettings: DEFAULT_CREATOR_SETTINGS,
    });
  });

  it("returns 413 payload_too_large before parsing an oversized admin settings body", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/creator-fan-experience-settings", {
      method: "POST",
      body: "x".repeat(64_001),
      headers: {
        "content-type": "application/json",
        "content-length": "64001",
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      success: false,
      code: "payload_too_large",
      error: "Request payload is too large.",
    });
    expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
  });

  it("returns 400 invalid_json for malformed admin settings JSON", async () => {
    const response = await POST(new NextRequest("http://localhost/api/admin/creator-fan-experience-settings", {
      method: "POST",
      body: "{bad",
      headers: {
        "content-type": "application/json",
      },
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      code: "invalid_json",
      error: "Invalid JSON body.",
    });
    expect(mockState.adminDb.runTransaction).not.toHaveBeenCalled();
  });

  it("restriction update audited and requires confirmation", async () => {
    seedUser("creator_restricted");

    const blocked = await POST(request({
      targetUserId: "creator_restricted",
      creatorSettings: DEFAULT_CREATOR_SETTINGS,
      creatorRestrictions: {
        ...DEFAULT_CREATOR_RESTRICTIONS,
        payoutsRestricted: true,
      },
      restrictionConfirmed: false,
    }));
    expect(blocked.status).toBe(400);

    const response = await POST(request({
      targetUserId: "creator_restricted",
      creatorSettings: DEFAULT_CREATOR_SETTINGS,
      creatorRestrictions: {
        ...DEFAULT_CREATOR_RESTRICTIONS,
        payoutsRestricted: true,
      },
      restrictionConfirmed: true,
    }));

    expect(response.status).toBe(200);
    expect(mockState.documents.get("users/creator_restricted")).toMatchObject({
      creatorRestrictions: expect.objectContaining({
        payoutsRestricted: true,
      }),
    });
    expect(Array.from(mockState.documents.keys()).some((path) => path.includes("creator_restrictions_updated"))).toBe(true);
    expect(mockState.trackServerEvent).toHaveBeenCalledWith("admin_creator_experience_restriction_updated", expect.objectContaining({
      settingKey: "payoutsRestricted",
      targetUserId: "creator_restricted",
    }), "creator_restricted");
  });
});
