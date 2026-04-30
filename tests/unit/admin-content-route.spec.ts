import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockStorageMetadata = {
  contentType?: string;
  size?: string;
  timeCreated?: string;
  metadata?: Record<string, string>;
};

type MockBucketFile = ReturnType<typeof createMockBucketFile>;

function createMockBucketFile(name: string, initialMetadata: MockStorageMetadata = {}) {
  let deleted = false;
  let metadata: MockStorageMetadata = {
    contentType: initialMetadata.contentType,
    size: initialMetadata.size,
    timeCreated: initialMetadata.timeCreated,
    metadata: { ...(initialMetadata.metadata || {}) },
  };

  return {
    name,
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
    exists: vi.fn(async () => [!deleted]),
    delete: vi.fn(async () => {
      deleted = true;
    }),
    save: vi.fn(async (buffer: Buffer, options?: { contentType?: string }) => {
      metadata = {
        ...metadata,
        contentType: options?.contentType || metadata.contentType,
        size: String(buffer.byteLength),
        timeCreated: metadata.timeCreated || new Date(Date.now()).toISOString(),
      };
    }),
    isDeleted() {
      return deleted;
    },
  };
}

const mockState = vi.hoisted(() => {
  const files = new Map<string, MockBucketFile>();

  const getOrCreateFile = (name: string, metadata?: MockStorageMetadata) => {
    const existing = files.get(name);
    if (existing) {
      return existing;
    }

    const file = createMockBucketFile(name, metadata);
    files.set(name, file);
    return file;
  };

  return {
    files,
    getOrCreateFile,
    reset() {
      files.clear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
    },
    adminStorage: {
      bucket() {
        return {
          name: "kandydrops-test.appspot.com",
          getFiles: async ({ prefix }: { prefix: string }) => [[...files.values()].filter((file) => !file.isDeleted() && file.name.startsWith(prefix))],
          file(name: string) {
            return getOrCreateFile(name);
          },
        };
      },
    },
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
  };
});

vi.mock("node:crypto", () => ({
  randomUUID: () => "download-token",
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminStorage: mockState.adminStorage,
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

import { DELETE, GET, POST } from "@/app/api/admin/content/route";

describe("admin content route", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T12:34:56Z"));
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      isAdmin: true,
    });
    mockState.handleApiError.mockImplementation((error: unknown) => {
      throw error;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("lists drop assets through the admin route and mints missing download tokens", async () => {
    mockState.getOrCreateFile("drops/banner.png", {
      contentType: "image/png",
      size: "123",
      timeCreated: "2026-04-02T09:00:00.000Z",
      metadata: {},
    });

    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "GET",
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(payload.files).toHaveLength(1);
    expect(payload.verification.module).toBe("admin_content_manager");
    expect(payload.verification.countComposition.fileCount).toBe(1);
    expect(payload.files[0]).toMatchObject({
      name: "banner.png",
      fullPath: "drops/banner.png",
      contentType: "image/png",
      size: 123,
    });
    expect(payload.files[0].url).toContain("token=download-token");
    expect(mockState.getOrCreateFile("drops/banner.png").setMetadata).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({
        firebaseStorageDownloadTokens: "download-token",
      }),
    }));
  });

  it("uploads a file into the drops prefix and returns an admin-minted download URL", async () => {
    const formData = new FormData();
    formData.append("file", new File(["hello"], "hero image.png", { type: "image/png" }));
    const expectedPath = `drops/${Date.now()}_hero_image.png`;

    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.file).toMatchObject({
      name: "1775133296000_hero_image.png",
      fullPath: expectedPath,
      contentType: "image/png",
      size: 5,
    });
    expect(payload.file.url).toContain("token=download-token");
    expect(mockState.getOrCreateFile(expectedPath).save).toHaveBeenCalled();
  });

  it("deletes a drop asset when the path stays inside the drops prefix", async () => {
    const file = mockState.getOrCreateFile("drops/delete-me.png", {
      contentType: "image/png",
      size: "456",
      timeCreated: "2026-04-02T08:00:00.000Z",
      metadata: {
        firebaseStorageDownloadTokens: "existing-token",
      },
    });

    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "DELETE",
      body: JSON.stringify({ fullPath: "drops/delete-me.png" }),
    });

    const response = await DELETE(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ success: true });
    expect(file.delete).toHaveBeenCalled();
  });

  it("rejects deleting paths outside the drops prefix", async () => {
    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "DELETE",
      body: JSON.stringify({ fullPath: "avatars/admin.png" }),
    });

    const response = await DELETE(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ error: "Invalid storage path" });
  });
});
