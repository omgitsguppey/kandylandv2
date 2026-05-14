import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type BroadcastRecord = {
  id: string;
  data: Record<string, unknown>;
};

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  readProjection: vi.fn(),
  adminDb: null as unknown as ReturnType<typeof buildAdminDb>,
  callerUser: {
    uid: "creator_1",
    email: "creator@example.com",
    role: "creator",
    displayName: "Jessica",
    username: "jessica",
    creatorSettings: {
      broadcastsEnabled: true,
    },
    creatorRestrictions: {},
  },
  creatorUser: {
    uid: "creator_1",
    role: "creator",
    displayName: "Jessica",
    username: "jessica",
    creatorSettings: {
      broadcastsEnabled: true,
    },
    creatorRestrictions: {},
  },
  broadcasts: [] as BroadcastRecord[],
  relationships: [] as Array<{ id: string; data: Record<string, unknown> }>,
  batchSet: vi.fn(),
  batchCommit: vi.fn(async () => []),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => "serverTimestamp"),
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

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_name: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  STANDARD: {},
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  get adminDb() {
    return mockState.adminDb;
  },
}));

function buildDocSnapshot(data: Record<string, unknown> | null, id = "doc") {
  return {
    exists: data !== null,
    id,
    data: () => data,
  };
}

function buildAdminDb() {
  return {
    collection: vi.fn((name: string) => {
      if (name === "users") {
        return {
          doc: vi.fn((id: string) => ({
            get: vi.fn(async () => {
              if (id === mockState.callerUser.uid) {
                return buildDocSnapshot(mockState.callerUser, id);
              }
              if (id === mockState.creatorUser.username || id === mockState.creatorUser.uid) {
                return buildDocSnapshot(mockState.creatorUser, id);
              }
              return buildDocSnapshot(null, id);
            }),
          })),
        };
      }

      if (name === "creator_broadcasts") {
        return {
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn(async () => ({
                docs: mockState.broadcasts.map((record) => ({
                  id: record.id,
                  data: () => record.data,
                })),
              })),
            })),
          })),
          doc: vi.fn(() => ({ id: "broadcast_1" })),
        };
      }

      if (name === "creator_relationships") {
        return {
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn(async () => ({
                docs: mockState.relationships.map((record) => ({
                  id: record.id,
                  data: () => record.data,
                })),
              })),
            })),
          })),
        };
      }

      return {
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn(async () => ({ docs: [] })),
            count: vi.fn(async () => ({ data: () => ({ count: 0 }) })),
            aggregate: vi.fn(async () => ({ data: () => ({ totalEarnings: 0, totalPending: 0 }) })),
          })),
        })),
        count: vi.fn(() => ({
          get: vi.fn(async () => ({ data: () => ({ count: 0 }) })),
        })),
        aggregate: vi.fn(() => ({
          get: vi.fn(async () => ({ data: () => ({ totalEarnings: 0, totalPending: 0 }) })),
        })),
        doc: vi.fn(() => ({ id: "mock_doc" })),
      };
    }),
    batch: vi.fn(() => ({
      set: mockState.batchSet.mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      commit: mockState.batchCommit,
    })),
  };
}

const route = await import("@/app/api/creator/broadcasts/route");
const { GET, POST } = route;

describe("creator broadcasts route", () => {
  beforeEach(() => {
    mockState.guardApiRequest.mockReset();
    mockState.handleApiError.mockReset();
    mockState.readProjection.mockReset();
    mockState.broadcasts = [];
    mockState.relationships = [];
    mockState.batchSet.mockReset();
    mockState.batchCommit.mockReset();
    mockState.batchSet.mockReturnValue(undefined);
    mockState.batchCommit.mockResolvedValue([]);
    mockState.adminDb = buildAdminDb() as unknown as typeof mockState.adminDb;
    mockState.guardApiRequest.mockResolvedValue({
      uid: mockState.callerUser.uid,
      email: mockState.callerUser.email,
    });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.readProjection.mockReturnValue(null);
  });

  it("returns creator broadcasts newest-first from real backend data", async () => {
    mockState.broadcasts = [
      {
        id: "older",
        data: {
          creatorId: mockState.callerUser.uid,
          title: "Older",
          message: "Older message",
          status: "sent",
          createdAtMs: 1000,
        },
      },
      {
        id: "newer",
        data: {
          creatorId: mockState.callerUser.uid,
          title: "Newer",
          message: "Newer message",
          status: "draft",
          createdAtMs: 2000,
        },
      },
    ];

    const response = await GET(new NextRequest("http://localhost/api/creator/broadcasts"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.broadcasts).toHaveLength(2);
    expect(body.broadcasts[0].id).toBe("newer");
    expect(body.broadcasts[1].id).toBe("older");
  });

  it("creates a live broadcast with sent status for the owner", async () => {
    const response = await POST(new NextRequest("http://localhost/api/creator/broadcasts", {
      method: "POST",
      body: JSON.stringify({
        title: "Weekly update",
        message: "New post is live",
        target: "all_followers",
      }),
      headers: {
        "Content-Type": "application/json",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.broadcast.status).toBe("sent");
    expect(mockState.batchSet).toHaveBeenCalledWith(expect.objectContaining({ id: "broadcast_1" }), expect.objectContaining({
      creatorId: mockState.callerUser.uid,
      status: "sent",
      target: "all_followers",
    }));
  });

  it("rejects oversized broadcast payloads before parsing JSON", async () => {
    const oversizedBody = JSON.stringify({
      title: "Weekly update",
      message: "x".repeat(33_000),
      target: "all_followers",
    });
    const response = await POST(new NextRequest("http://localhost/api/creator/broadcasts", {
      method: "POST",
      body: oversizedBody,
      headers: {
        "Content-Type": "application/json",
        "content-length": String(oversizedBody.length),
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toMatchObject({ success: false, code: "payload_too_large" });
    expect(mockState.batchSet).not.toHaveBeenCalled();
  });

  it("blocks admin projection writes", async () => {
    mockState.readProjection.mockReturnValue({
      active: true,
      targetCreatorId: mockState.callerUser.uid,
      actorAdminUid: "admin_1",
      startedAt: Date.now(),
      projectionMode: "read_only_creator_projection",
      sourceTruth: "server_validated_projection",
    });

    const request = new NextRequest("http://localhost/api/creator/broadcasts", {
      method: "POST",
      body: JSON.stringify({
        title: "Blocked",
        message: "Should not write",
        target: "all_followers",
      }),
      headers: {
        "Content-Type": "application/json",
        "x-admin-view-as-user-id": mockState.callerUser.uid,
        "x-admin-view-as-actor-uid": "admin_1",
        "x-admin-view-as-started-at": String(Date.now()),
        "x-admin-view-as-role": "creator",
      },
    });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.code).toBe("admin_projection_read_only");
  });
});
