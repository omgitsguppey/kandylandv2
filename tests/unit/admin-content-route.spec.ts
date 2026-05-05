import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockStorageMetadata = {
  contentType?: string;
  size?: string;
  timeCreated?: string;
  updated?: string;
  metadata?: Record<string, string>;
};

type MockBucketFile = ReturnType<typeof createMockBucketFile>;

function createMockBucketFile(name: string, initialMetadata: MockStorageMetadata = {}) {
  let deleted = false;
  let signedUrl = initialMetadata.metadata?.signedUrl
    || `https://storage.googleapis.com/kandydrops-test.appspot.com/${encodeURIComponent(name)}?X-Goog-Signature=signed`;
  let metadata: MockStorageMetadata = {
    contentType: initialMetadata.contentType,
    size: initialMetadata.size,
    timeCreated: initialMetadata.timeCreated,
    updated: initialMetadata.updated,
    metadata: { ...(initialMetadata.metadata || {}) },
  };

  return {
    name,
    getMetadata: vi.fn(async () => [metadata]),
    getSignedUrl: vi.fn(async () => [signedUrl]),
    setSignedUrl(nextSignedUrl: string) {
      signedUrl = nextSignedUrl;
    },
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
  const getFiles = vi.fn(async ({ prefix, maxResults }: { prefix: string; maxResults?: number }) => [
    [...files.values()]
      .filter((file) => !file.isDeleted() && file.name.startsWith(prefix))
      .slice(0, maxResults),
  ]);

  return {
    files,
    getOrCreateFile,
    reset() {
      files.clear();
      getFiles.mockClear();
      this.guardApiRequest.mockReset();
      this.handleApiError.mockReset();
      this.recordRouteWarning.mockReset();
    },
    adminStorage: {
      bucket() {
        return {
          name: "kandydrops-test.appspot.com",
          getFiles,
          file(name: string) {
            return getOrCreateFile(name);
          },
        };
      },
    },
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    recordRouteWarning: vi.fn(),
    MEDIA_PROXY: { maxRequests: 15, windowMs: 60_000 },
    getFiles,
  };
});

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
  MEDIA_PROXY: mockState.MEDIA_PROXY,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteWarning: mockState.recordRouteWarning,
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

  it("requires admin auth and lists safe admin metadata with short-lived preview URLs", async () => {
    mockState.getOrCreateFile("drops/banner.png", {
      contentType: "image/png",
      size: "123",
      timeCreated: "2026-04-02T09:00:00.000Z",
      metadata: {
        contentUrl: "https://evil.example/raw.png",
        firebaseStorageDownloadTokens: "legacy-token",
      },
    });

    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "GET",
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mockState.guardApiRequest).toHaveBeenCalledWith(request, expect.objectContaining({
      auth: "admin",
      requireTrustedOrigin: true,
      rateLimit: mockState.MEDIA_PROXY,
    }));
    expect(mockState.getFiles).toHaveBeenCalledWith({
      prefix: "drops/",
      maxResults: 100,
    });
    expect(payload).toMatchObject({
      adminContentRoute: true,
      storageAccessGuarded: true,
      adminOnly: true,
      mediaProxyGuarded: true,
      mediaProxyPolicy: "MEDIA_PROXY",
      safeUrlHandling: true,
      rawStorageUrlExposed: false,
    });
    expect(payload.files).toHaveLength(1);
    expect(payload.verification.module).toBe("admin_content_manager");
    expect(payload.verification.countComposition.fileCount).toBe(1);
    expect(payload.files[0]).toMatchObject({
      id: expect.any(String),
      name: "banner.png",
      displayPath: "drops/[asset]/banner.png",
      contentType: "image/png",
      size: 123,
      safeUrlHandling: true,
      rawStorageUrlExposed: false,
    });
    expect(payload.files[0]).not.toHaveProperty("fullPath");
    expect(payload.files[0].url).toContain("X-Goog-Signature=signed");
    expect(payload.files[0].url).not.toContain("token=");
    expect(mockState.getOrCreateFile("drops/banner.png").setMetadata).not.toHaveBeenCalled();
    expect(mockState.recordRouteWarning).toHaveBeenCalledWith(
      "admin/content",
      "Unsafe admin content media fields stripped",
      undefined,
      expect.objectContaining({
        detail: expect.objectContaining({
          rawUrlValuesLogged: false,
          strippedFieldNames: expect.arrayContaining(["contentUrl", "firebaseStorageDownloadTokens"]),
        }),
      }),
    );
  });

  it("routes guard failures through the safe API error handler", async () => {
    const guardError = new Error("Forbidden");
    mockState.guardApiRequest.mockRejectedValueOnce(guardError);
    mockState.handleApiError.mockReturnValueOnce(new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }));

    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "GET",
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toMatchObject({ error: "Forbidden" });
    expect(mockState.handleApiError).toHaveBeenCalledWith(guardError, "Admin.Content.GET");
  });

  it("uploads a file into the drops prefix and returns safe admin metadata", async () => {
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
    expect(payload).toMatchObject({
      success: true,
      adminContentRoute: true,
      mediaProxyPolicy: "MEDIA_PROXY",
      rawStorageUrlExposed: false,
    });
    expect(payload.file).toMatchObject({
      id: expect.any(String),
      name: "1775133296000_hero_image.png",
      displayPath: "drops/[asset]/1775133296000_hero_image.png",
      contentType: "image/png",
      size: 5,
    });
    expect(payload.file).not.toHaveProperty("fullPath");
    expect(payload.file.url).toContain("X-Goog-Signature=signed");
    expect(payload.file.url).not.toContain("token=");
    expect(mockState.getOrCreateFile(expectedPath).save).toHaveBeenCalled();
  });

  it("strips unsafe signed preview URLs instead of returning them", async () => {
    const file = mockState.getOrCreateFile("drops/unsafe.png", {
      contentType: "image/png",
      size: "123",
      timeCreated: "2026-04-02T09:00:00.000Z",
      metadata: {},
    });
    file.setSignedUrl("javascript:alert(1)");

    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "GET",
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.files[0]).toMatchObject({
      url: null,
      safeUrlHandling: true,
      rawStorageUrlExposed: false,
    });
    expect(mockState.recordRouteWarning).toHaveBeenCalledWith(
      "admin/content",
      "Unsafe admin content media fields stripped",
      undefined,
      expect.objectContaining({
        detail: expect.objectContaining({
          rawUrlValuesLogged: false,
          strippedFieldNames: expect.arrayContaining(["signedUrl"]),
        }),
      }),
    );
  });

  it("rejects unsupported drop asset upload types before writing storage", async () => {
    const formData = new FormData();
    formData.append("file", new File(["<script />"], "payload.html", { type: "text/html" }));

    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "POST",
      body: formData,
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({ error: "Unsupported drop asset type" });
    expect(mockState.files.size).toBe(0);
  });

  it("deletes a drop asset when the opaque file id stays inside the drops prefix", async () => {
    const file = mockState.getOrCreateFile("drops/delete-me.png", {
      contentType: "image/png",
      size: "456",
      timeCreated: "2026-04-02T08:00:00.000Z",
      metadata: {
        firebaseStorageDownloadTokens: "existing-token",
      },
    });
    const fileId = Buffer.from("drops/delete-me.png", "utf8").toString("base64url");

    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "DELETE",
      body: JSON.stringify({ fileId }),
    });

    const response = await DELETE(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      adminContentRoute: true,
      mediaProxyPolicy: "MEDIA_PROXY",
      rawStorageUrlExposed: false,
    });
    expect(file.delete).toHaveBeenCalled();
  });

  it("rejects deleting paths outside the drops prefix", async () => {
    const fileId = Buffer.from("avatars/admin.png", "utf8").toString("base64url");
    const request = new NextRequest("http://localhost/api/admin/content", {
      method: "DELETE",
      body: JSON.stringify({ fileId }),
    });

    const response = await DELETE(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      error: "Invalid storage reference",
      errorCode: "invalid_storage_reference",
      rawStorageUrlExposed: false,
    });
  });
});
