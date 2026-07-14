import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  class MockAuthError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }

  return {
    MockAuthError,
    guardApiRequest: vi.fn(),
    handleApiError: vi.fn(),
    collection: vi.fn(),
    bucket: vi.fn(),
    trackServerEvent: vi.fn(),
    recordRouteWarning: vi.fn(),
  };
});

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  AuthError: mockState.MockAuthError,
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: mockState.collection,
  },
  adminStorage: {
    bucket: mockState.bucket,
  },
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: mockState.trackServerEvent,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  STANDARD: {},
  ADMIN_STORAGE_UPLOAD: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteWarning: mockState.recordRouteWarning,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
    serverTimestamp: vi.fn(),
  },
}));

import {
  DELETE as DELETE_PUSH_TOKEN,
  POST as POST_PUSH_TOKEN,
} from "@/app/api/notifications/push-token/route";
import { POST as POST_PRIVACY_CONSENT } from "@/app/api/privacy/consent/route";
import { POST as POST_LANDING_UPLOAD } from "@/app/api/settings/landing/upload/route";

describe("critical user route body limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.guardApiRequest.mockImplementation(async (
      request: NextRequest,
      options: { maxBodyBytes?: number },
    ) => {
      const contentLength = Number(request.headers.get("content-length") || 0);
      if (
        typeof options.maxBodyBytes === "number"
        && Number.isFinite(contentLength)
        && contentLength > options.maxBodyBytes
      ) {
        throw new mockState.MockAuthError("Payload too large", 413);
      }
      return { uid: "user_1", email: "user@example.com" };
    });
  });

  it.each([
    ["registration", POST_PUSH_TOKEN, "POST"],
    ["revocation", DELETE_PUSH_TOKEN, "DELETE"],
  ])("rejects oversized push-token %s before any token write or telemetry", async (_label, handler, method) => {
    const response = await handler(new NextRequest("http://localhost/api/notifications/push-token", {
      method,
      body: JSON.stringify({ token: "token", padding: "x".repeat(32_768) }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({ errorCode: "payload_too_large", retryable: false });
    expect(mockState.collection).not.toHaveBeenCalled();
    expect(mockState.trackServerEvent).not.toHaveBeenCalled();
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("preserves the valid privacy-consent cookie behavior", async () => {
    const response = await POST_PRIVACY_CONSENT(new NextRequest("https://localhost/api/privacy/consent", {
      method: "POST",
      body: JSON.stringify({
        anonymousAnalyticsEnabled: true,
        consentMode: "minimal_analytics",
        consentDecision: "minimal",
        consentSource: "banner",
        consentPolicyVersion: "2026-05-consent-tracking-v1",
      }),
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("kandydrops_analytics_consent=minimal_analytics");
  });

  it("rejects oversized consent before setting a cookie", async () => {
    const response = await POST_PRIVACY_CONSENT(new NextRequest("https://localhost/api/privacy/consent", {
      method: "POST",
      body: JSON.stringify({ anonymousAnalyticsEnabled: true, padding: "x".repeat(16_384) }),
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({ errorCode: "payload_too_large", retryable: false });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("rejects an honestly declared oversized multipart body before parsing or storage access", async () => {
    const response = await POST_LANDING_UPLOAD(new NextRequest("http://localhost/api/settings/landing/upload", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=bounded-test",
        "content-length": String(11 * 1024 * 1024),
      },
      body: "--bounded-test--",
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({ errorCode: "payload_too_large", retryable: false });
    expect(mockState.collection).not.toHaveBeenCalled();
    expect(mockState.bucket).not.toHaveBeenCalled();
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("rejects a misleading-length oversized multipart stream before storage or settings writes", async () => {
    const formData = new FormData();
    formData.set("key", "landing-hero-1");
    formData.set(
      "file",
      new Blob([new Uint8Array((10 * 1024 * 1024) + (128 * 1024))], { type: "image/png" }),
      "oversized.png",
    );
    const response = await POST_LANDING_UPLOAD(new NextRequest("http://localhost/api/settings/landing/upload", {
      method: "POST",
      headers: { "content-length": "1" },
      body: formData,
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({ errorCode: "payload_too_large", retryable: false });
    expect(mockState.collection).not.toHaveBeenCalled();
    expect(mockState.bucket).not.toHaveBeenCalled();
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("returns a typed 400 for malformed landing multipart before storage or settings writes", async () => {
    const response = await POST_LANDING_UPLOAD(new NextRequest("http://localhost/api/settings/landing/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=broken" },
      body: "not-a-valid-multipart-body",
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      errorCode: "invalid_multipart_body",
      retryable: false,
    });
    expect(mockState.collection).not.toHaveBeenCalled();
    expect(mockState.bucket).not.toHaveBeenCalled();
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });

  it("uses the canonical Firebase parser and limits replacement cleanup to the current landing key", () => {
    const source = readFileSync(join(process.cwd(), "src/app/api/settings/landing/upload/route.ts"), "utf8");

    expect(source).toContain("resolveFirebaseStorageMediaLocation(downloadUrl)");
    expect(source).toContain('const LANDING_ASSET_STORAGE_PREFIX = "landing/assets/"');
    expect(source).toContain("location?.bucket !== bucketName");
    expect(source).toContain("`${LANDING_ASSET_STORAGE_PREFIX}${landingAssetKey}_`");
    expect(source).toContain("location.objectPath.startsWith(expectedObjectPathPrefix)");
    expect(source).toContain('location.objectPath.slice(expectedObjectPathPrefix.length).includes("/")');
    expect(source).toContain("resolveOwnedLandingAssetPath(previousUrl, bucket.name, key)");
    expect(source).not.toContain("location.objectPath.startsWith(LANDING_ASSET_STORAGE_PREFIX)");
    expect(source).not.toContain("function extractStorageObjectPath");
  });
});
