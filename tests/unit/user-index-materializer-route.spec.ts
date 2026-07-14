import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => {
  class ConfigurationError extends Error {
    constructor(readonly code: "source_fingerprint_missing" | "activation_gate_missing" | "request_batch_too_large") {
      super(code);
    }
  }
  class GuardError extends Error {
    constructor(name: "AuthError" | "RateLimitError", readonly status: number) {
      super(name);
      this.name = name;
    }
  }
  return {
    guard: vi.fn(async () => null),
    consume: vi.fn(),
    ConfigurationError,
    GuardError,
    handleApiError: vi.fn((error: GuardError) => NextResponse.json({
      success: false,
      errorCode: error.name === "RateLimitError" ? "rate_limited" : "payload_too_large",
    }, { status: error.status })),
  };
});

vi.mock("@/lib/server/request-guard", () => ({ guardApiRequest: mocks.guard }));
vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));
vi.mock("@/lib/server/rate-limit", () => ({ CRON: { name: "cron" } }));
vi.mock("@/lib/server/auth", () => ({ handleApiError: mocks.handleApiError }));
vi.mock("@/lib/server/user-index-materializer", () => ({
  consumeUserIndexMaterializerOutbox: mocks.consume,
  UserIndexMaterializerConfigurationError: mocks.ConfigurationError,
}));

import { POST } from "@/app/api/internal/analytics/materialize-user-index/route";

function request(secret?: string, body: Record<string, unknown> = { source: "user_index_materializer" }) {
  return new NextRequest("https://kandydrops.test/api/internal/analytics/materialize-user-index", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(secret ? { authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("user index materializer internal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("reports missing scheduler configuration without invoking the materializer", async () => {
    const response = await POST(request());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      errorCode: "configuration_missing",
    });
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it("rejects an invalid cron secret", async () => {
    process.env.CRON_SECRET = "expected-secret";
    const response = await POST(request("wrong-secret"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "unauthorized" });
    expect(mocks.consume).not.toHaveBeenCalled();
    expect(mocks.guard).not.toHaveBeenCalled();
  });

  it("runs the bounded canonical consumer for an authenticated scheduler", async () => {
    process.env.CRON_SECRET = "expected-secret";
    mocks.consume.mockResolvedValue({
      status: "completed",
      mode: "shadow",
      receipt: { requestsClaimed: 2, requestsCompleted: 2, factsPublished: 7 },
      issueCodes: [],
    });

    const response = await POST(request("expected-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      idempotencyKey: "user_index_materializer_request_id_and_lease",
      result: { status: "completed", mode: "shadow" },
    });
    expect(mocks.consume).toHaveBeenCalledTimes(1);
    expect(mocks.guard).toHaveBeenCalledWith(expect.any(NextRequest), expect.objectContaining({
      auth: "none",
      rateLimit: { name: "cron" },
      rateLimitStorage: "remote",
      scopeId: "user-index-materializer-scheduler",
      requireTrustedOrigin: false,
    }));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each([
    ["AuthError" as const, 413, "payload_too_large"],
    ["RateLimitError" as const, 429, "rate_limited"],
  ])("preserves canonical %s guard failures", async (name, status, errorCode) => {
    process.env.CRON_SECRET = "expected-secret";
    mocks.guard.mockRejectedValueOnce(new mocks.GuardError(name, status));

    const response = await POST(request("expected-secret"));

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ errorCode });
    expect(mocks.handleApiError).toHaveBeenCalledTimes(1);
    expect(mocks.consume).not.toHaveBeenCalled();
  });

  it("classifies a missing source fingerprint as configuration failure", async () => {
    process.env.CRON_SECRET = "expected-secret";
    mocks.consume.mockRejectedValue(new mocks.ConfigurationError("source_fingerprint_missing"));

    const response = await POST(request("expected-secret"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "source_fingerprint_missing" });
  });

  it("measures the actual scheduler body before invoking the materializer", async () => {
    process.env.CRON_SECRET = "expected-secret";
    const response = await POST(request("expected-secret", { source: "x".repeat(1_100) }));

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ errorCode: "payload_too_large" });
    expect(mocks.consume).not.toHaveBeenCalled();
  });
});
