import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  trackServerEvent: vi.fn(),
  invalidateDropSurfaces: vi.fn(),
  addDrop: vi.fn(),
  userRecord: { role: "creator", displayName: "Creator One" } as Record<string, unknown>,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    serverTimestamp: () => "server-timestamp",
  },
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection(name: string) {
      if (name === "users") {
        return {
          doc() {
            return {
              async get() {
                return {
                  exists: Boolean(mockState.userRecord),
                  data: () => mockState.userRecord,
                };
              },
            };
          },
        };
      }

      return {
        add: mockState.addDrop,
      };
    },
  },
}));

vi.mock("@/lib/server/drop-mutations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/drop-mutations")>();
  return {
    ...actual,
    invalidateDropSurfaces: mockState.invalidateDropSurfaces,
  };
});

vi.mock("@/lib/server/rate-limit", () => ({
  STANDARD: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/creator/drops/route";

function postCreatorDrop(body: unknown) {
  return new NextRequest("http://localhost/api/creator/drops", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "content-length": String(JSON.stringify(body).length),
    },
  });
}

describe("POST /api/creator/drops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.userRecord = { role: "creator", displayName: "Creator One" };
    mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1", email: "creator@example.com" });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
  });

  it("returns a typed non-retryable 422 when creator drop data is missing", async () => {
    const response = await POST(postCreatorDrop({}));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: "invalid_creator_request",
      errorClass: "invalid_creator_drop_payload",
      retryable: false,
      recoveryAction: expect.stringContaining("Review required fields"),
    });
    expect(mockState.addDrop).not.toHaveBeenCalled();
  });

  it("classifies missing creator media as a media_required 422 before writing", async () => {
    const response = await POST(postCreatorDrop({
      dropData: {
        title: "Creator drop",
        description: "A complete description for a creator drop.",
        type: "content",
        unlockCost: 100,
        validFrom: Date.now() + 60_000,
        status: "scheduled",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      code: "invalid_creator_request",
      errorClass: "media_required",
      retryable: false,
      details: expect.arrayContaining([
        expect.stringMatching(/content asset|cover|media/i),
      ]),
    });
    expect(mockState.addDrop).not.toHaveBeenCalled();
    expect(mockState.trackServerEvent).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with a typed non-retryable response", async () => {
    const response = await POST(new NextRequest("http://localhost/api/creator/drops", {
      method: "POST",
      body: "{bad",
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      code: "invalid_json",
      errorCode: "invalid_creator_request",
      retryable: false,
    });
    expect(mockState.addDrop).not.toHaveBeenCalled();
  });

  it("rejects a raw oversized body even without Content-Length", async () => {
    const response = await POST(new NextRequest("http://localhost/api/creator/drops", {
      method: "POST",
      body: JSON.stringify({ dropData: { padding: "x".repeat(80_001) } }),
      headers: { "content-type": "application/json" },
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toMatchObject({
      code: "payload_too_large",
      errorCode: "invalid_creator_request",
      retryable: false,
    });
    expect(mockState.addDrop).not.toHaveBeenCalled();
  });
});
