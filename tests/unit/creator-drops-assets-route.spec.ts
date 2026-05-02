import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockStorageMetadata = {
  contentType?: string;
  size?: string;
  timeCreated?: string;
  metadata?: Record<string, string>;
};

function createMockStorageFile(name: string) {
  let metadata: MockStorageMetadata = {
    metadata: {},
  };

  return {
    name,
    save: vi.fn(async (buffer: Buffer, options?: { contentType?: string }) => {
      metadata = {
        ...metadata,
        contentType: options?.contentType,
        size: String(buffer.byteLength),
        timeCreated: "2026-05-01T12:00:00.000Z",
      };
    }),
    getMetadata: vi.fn(async () => [metadata]),
    setMetadata: vi.fn(async (next: MockStorageMetadata) => {
      metadata = {
        ...metadata,
        ...next,
        metadata: {
          ...(metadata.metadata || {}),
          ...(next.metadata || {}),
        },
      };
    }),
  };
}

const mockState = vi.hoisted(() => {
  const users = new Map<string, Record<string, unknown>>();
  const files = new Map<string, ReturnType<typeof createMockStorageFile>>();

  return {
    users,
    files,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    adminDb: {
      collection(name: string) {
        return {
          doc(id: string) {
            return {
              async get() {
                const data = name === "users" ? users.get(id) : undefined;
                return {
                  exists: Boolean(data),
                  data: () => data,
                };
              },
            };
          },
        };
      },
    },
    adminStorage: {
      bucket() {
        return {
          name: "kandydrops-test.appspot.com",
          file(name: string) {
            const existing = files.get(name);
            if (existing) {
              return existing;
            }
            const next = createMockStorageFile(name);
            files.set(name, next);
            return next;
          },
        };
      },
    },
    reset() {
      users.clear();
      files.clear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
    },
  };
});

vi.mock("node:crypto", () => ({
  randomUUID: () => "creator-download-token",
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: mockState.adminDb,
  adminStorage: mockState.adminStorage,
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  STANDARD: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/creator/drops/assets/route";

function uploadRequest(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return new NextRequest("http://localhost/api/creator/drops/assets", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/creator/drops/assets", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-01T12:00:00.000Z"));
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({ uid: "creator_1", email: "creator@example.com" });
    mockState.users.set("creator_1", { role: "creator" });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requires a trusted authenticated creator before uploading drop assets server-side", async () => {
    const response = await POST(uploadRequest(new File(["asset"], "preview.png", { type: "image/png" })));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(expect.any(NextRequest), expect.objectContaining({
      auth: "user",
      requireTrustedOrigin: true,
      routeName: "creator/drops/assets",
    }));
    expect(body.file).toMatchObject({
      fullPath: "drops/creator-submissions/creator_1/1777636800000_preview.png",
      contentType: "image/png",
      size: 5,
    });
    expect(body.file.url).toContain("token=creator-download-token");
    expect(mockState.files.get("drops/creator-submissions/creator_1/1777636800000_preview.png")?.save).toHaveBeenCalled();
  });

  it("rejects authenticated non-creators", async () => {
    mockState.users.set("creator_1", { role: "user" });

    const response = await POST(uploadRequest(new File(["asset"], "preview.png", { type: "image/png" })));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ error: "Creator access required" });
    expect(mockState.files.size).toBe(0);
  });

  it("rejects unsupported drop asset MIME types", async () => {
    const response = await POST(uploadRequest(new File(["asset"], "payload.html", { type: "text/html" })));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ error: "Unsupported drop asset type" });
    expect(mockState.files.size).toBe(0);
  });
});
