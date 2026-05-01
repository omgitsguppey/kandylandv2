import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StoredDoc = Record<string, unknown>;

const mockState = vi.hoisted(() => {
  const documents = new Map<string, StoredDoc>();

  const buildDocSnapshot = (path: string) => ({
    exists: documents.has(path),
    data: () => documents.get(path),
  });

  const buildDocRef = (path: string) => ({
    path,
    async get() {
      return buildDocSnapshot(path);
    },
  });

  return {
    documents,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    recordRouteRuntimeSample: vi.fn(async () => undefined),
    adminDb: {
      collection(name: string) {
        return {
          doc(id: string) {
            return buildDocRef(`${name}/${id}`);
          },
        };
      },
    },
    reset() {
      documents.clear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.recordRouteRuntimeSample.mockClear();
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
  MEDIA_PROXY: {},
  STANDARD: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));

import { GET } from "@/app/api/drops/content/route";

const dropRecord = {
  id: "drop_1",
  creatorId: "creator_1",
  title: "Secure Drop",
  imageUrl: "https://firebasestorage.googleapis.com/cover.png",
  contentUrl: "https://firebasestorage.googleapis.com/v0/b/kandydrops/o/drop.mp4?alt=media",
  contentUrls: ["https://firebasestorage.googleapis.com/v0/b/kandydrops/o/drop.mp4?alt=media"],
  unlockCost: 10,
  validFrom: Date.now(),
  status: "active",
};

function requestForDrop(dropId = "drop_1") {
  return new NextRequest(`http://localhost/api/drops/content?id=${dropId}`, {
    method: "GET",
  });
}

describe("GET /api/drops/content", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "fan_1", email: "fan@example.com" });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.documents.set("drops/drop_1", dropRecord);
    mockState.documents.set("users/fan_1", {
      uid: "fan_1",
      unlockedContent: [],
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("secure-bytes", {
      status: 200,
      headers: {
        "content-type": "video/mp4",
        "content-length": "12",
      },
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks locked content for a caller without entitlement", async () => {
    const response = await GET(requestForDrop());
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: "You do not own this content" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("serves content after the user has unlocked the drop", async () => {
    mockState.documents.set("users/fan_1", {
      uid: "fan_1",
      unlockedContent: ["drop_1"],
    });

    const response = await GET(requestForDrop());

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Content-Disposition")).toBe("inline");
    expect(fetch).toHaveBeenCalledWith(dropRecord.contentUrl, expect.objectContaining({
      cache: "no-store",
    }));
  });

  it("treats the drop creator as entitled without requiring a paid unlock", async () => {
    mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1", email: "creator@example.com" });
    mockState.documents.set("users/creator_1", {
      uid: "creator_1",
      unlockedContent: [],
    });

    const response = await GET(requestForDrop());

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(dropRecord.contentUrl, expect.objectContaining({
      cache: "no-store",
    }));
  });
});
