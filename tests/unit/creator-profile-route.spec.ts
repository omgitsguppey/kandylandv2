import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;
type MockDoc = {
  id: string;
  data: () => StoredDoc;
  ref: {
    update: ReturnType<typeof vi.fn>;
  };
};

function createDoc(id: string, data: StoredDoc): MockDoc {
  return {
    id,
    data: () => data,
    ref: {
      update: vi.fn(async () => undefined),
    },
  };
}

const mockState = vi.hoisted(() => {
  const users = new Map<string, MockDoc>();
  const drops = new Map<string, MockDoc>();
  const relationships: StoredDoc[] = [];

  function buildCollection(name: string) {
    const filters: Array<[string, unknown]> = [];
    const collectionDocs = name === "users"
      ? users
      : name === "drops"
        ? drops
        : null;

    const api = {
      where(field: string, _op: string, value: unknown) {
        filters.push([field, value]);
        return api;
      },
      limit() {
        return api;
      },
      count() {
        return {
          async get() {
            const count = relationships.filter((entry) => (
              filters.every(([field, value]) => entry[field] === value)
            )).length;
            return {
              data: () => ({ count }),
            };
          },
        };
      },
      async get() {
        const docs = [...(collectionDocs?.values() ?? [])].filter((doc) => {
          const data = doc.data();
          return filters.every(([field, value]) => data[field] === value);
        });

        return {
          empty: docs.length === 0,
          docs,
        };
      },
    };

    return api;
  }

  return {
    users,
    drops,
    relationships,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    recordRouteWarning: vi.fn(),
    adminDb: {
      collection: buildCollection,
    },
    reset() {
      users.clear();
      drops.clear();
      relationships.splice(0, relationships.length);
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.recordRouteWarning.mockClear();
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
  RELAXED: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: (value: unknown) => ({ op: "increment", value }),
  },
}));

import { GET } from "@/app/api/creators/[username]/route";

describe("GET /api/creators/[username]", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue(undefined);
    mockState.handleApiError.mockImplementation((error: unknown) => {
      throw error;
    });
    mockState.users.set("creator_1", createDoc("creator_1", {
      uid: "creator_1",
      username: "creator",
      displayName: "Creator",
      role: "creator",
      status: "active",
    }));
    mockState.drops.set("drop_1", createDoc("drop_1", {
      creatorId: "creator_1",
      title: "Public Safe Drop",
      description: "A public-safe preview.",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/cover.png?alt=media",
      contentUrl: "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/protected.mp4?alt=media&token=secret",
      contentUrls: [
        "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/protected.mp4?alt=media&token=secret",
      ],
      unlockCost: 12,
      validFrom: Date.now() - 1000,
      validUntil: Date.now() + 100000,
      status: "active",
      approvalStatus: "approved",
      mediaCounts: { images: 0, videos: 1 },
      type: "content",
    }));
  });

  it("returns only public-safe drop media on creator profiles", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/creators/creator"),
      { params: Promise.resolve({ username: "creator" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.drops).toHaveLength(1);
    expect(payload.drops[0]).toMatchObject({
      id: "drop_1",
      imageUrl: "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/cover.png?alt=media",
      contentUrl: "",
      contentUrls: [""],
      mediaCounts: { images: 0, videos: 1 },
    });
    expect(JSON.stringify(payload)).not.toContain("protected.mp4");
    expect(JSON.stringify(payload)).not.toContain("token=secret");
  });
});
