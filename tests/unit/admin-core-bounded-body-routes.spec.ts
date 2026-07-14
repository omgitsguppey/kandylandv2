import fs from "node:fs";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  adminCollection: vi.fn(),
  saveQueueConfig: vi.fn(),
  saveOffer: vi.fn(),
  savePackage: vi.fn(),
  savePromo: vi.fn(),
  reset() {
    this.guardApiRequest.mockReset();
    this.handleApiError.mockReset();
    this.adminCollection.mockReset();
    this.saveQueueConfig.mockReset();
    this.saveOffer.mockReset();
    this.savePackage.mockReset();
    this.savePromo.mockReset();
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));
vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));
vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));
vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));
vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: mockState.adminCollection,
  },
}));
vi.mock("@/lib/server/drop-queue", () => ({
  getResolvedQueueConfig: vi.fn(),
  saveResolvedQueueConfig: mockState.saveQueueConfig,
}));
vi.mock("@/lib/server/platform-economy", () => ({
  readPlatformEconomyOffers: vi.fn(),
  readPlatformEconomyPackages: vi.fn(),
  readPlatformEconomyPromos: vi.fn(),
}));
vi.mock("@/lib/server/platform-economy-mutations", () => {
  class PlatformEconomyMutationError extends Error {
    status: number;
    code: string;

    constructor(message: string, status = 400, code = "invalid_admin_request") {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  return {
    PlatformEconomyMutationError,
    savePlatformEconomyOffer: mockState.saveOffer,
    savePlatformEconomyPackage: mockState.savePackage,
    savePlatformEconomyPromo: mockState.savePromo,
  };
});
vi.mock("@/lib/server/drop-mutations", () => ({
  ADMIN_DROP_REVALIDATION_PATHS: [],
  invalidateDropSurfaces: vi.fn(),
  resolveCreatedDropTiming: vi.fn(),
  resolveUpdatedDropTiming: vi.fn(),
  shouldValidateDropPublishPayload: vi.fn(),
  validateDropPublishState: vi.fn(),
}));
vi.mock("@/lib/server/push-notifications", () => ({
  sendGlobalDropNotification: vi.fn(),
}));
vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: vi.fn(),
}));
vi.mock("@/lib/server/route-diagnostics", () => ({
  recordRouteWarning: vi.fn(),
}));

import { PUT as putQueue } from "@/app/api/admin/queue/route";
import { POST as postOffer } from "@/app/api/admin/economy/offers/route";
import { POST as postPackage } from "@/app/api/admin/economy/packages/route";
import { POST as postPromo } from "@/app/api/admin/economy/promos/route";
import { POST as postRepair } from "@/app/api/admin/orchestration/repairs/route";
import { POST as postDrop } from "@/app/api/admin/drops/route";

const routeBodyParserCounts = new Map<string, number>([
  ["src/app/api/admin/content/route.ts", 1],
  ["src/app/api/admin/creators/[userId]/action/route.ts", 1],
  ["src/app/api/admin/debug/assistant/fix/route.ts", 1],
  ["src/app/api/admin/debug/assistant/route.ts", 1],
  ["src/app/api/admin/drops/route.ts", 3],
  ["src/app/api/admin/economy/offers/route.ts", 2],
  ["src/app/api/admin/economy/packages/route.ts", 2],
  ["src/app/api/admin/economy/promos/route.ts", 2],
  ["src/app/api/admin/orchestration/repairs/route.ts", 1],
  ["src/app/api/admin/queue/route.ts", 1],
]);

const mutationHandlers = [
  ["queue", putQueue, "http://localhost/api/admin/queue", "PUT"],
  ["offer", postOffer, "http://localhost/api/admin/economy/offers", "POST"],
  ["package", postPackage, "http://localhost/api/admin/economy/packages", "POST"],
  ["promo", postPromo, "http://localhost/api/admin/economy/promos", "POST"],
  ["repair", postRepair, "http://localhost/api/admin/orchestration/repairs", "POST"],
  ["drop", postDrop, "http://localhost/api/admin/drops", "POST"],
] as const;

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function buildRequest(url: string, method: string, body: string) {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body,
  });
}

function expectNoMutationStarted() {
  expect(mockState.adminCollection).not.toHaveBeenCalled();
  expect(mockState.saveQueueConfig).not.toHaveBeenCalled();
  expect(mockState.saveOffer).not.toHaveBeenCalled();
  expect(mockState.savePackage).not.toHaveBeenCalled();
  expect(mockState.savePromo).not.toHaveBeenCalled();
}

describe("bounded Admin Control Tower and economy JSON routes", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "admin@example.com",
      isAdmin: true,
    });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.saveQueueConfig.mockImplementation(async (body: unknown) => body);
    mockState.saveOffer.mockResolvedValue({ offerId: "offer_1" });
    mockState.savePackage.mockResolvedValue({ packageId: "package_1" });
    mockState.savePromo.mockResolvedValue({ promoId: "promo_1" });
    mockState.adminCollection.mockImplementation(() => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => undefined }),
      }),
    }));
  });

  it("routes every assigned JSON consumer through the canonical byte-counted parser", () => {
    for (const [relativePath, expectedCount] of routeBodyParserCounts) {
      const source = readSource(relativePath);
      const parserCalls = source.match(/readBoundedJsonBody</gu) ?? [];

      expect(source, relativePath).not.toMatch(/request\.json\s*\(/u);
      expect(parserCalls, relativePath).toHaveLength(expectedCount);
      expect(source, relativePath).toContain("retryable: false");
      expect(source, relativePath).toContain("isBoundedJsonBodyError(error)");
    }

    const contentSource = readSource("src/app/api/admin/content/route.ts");
    expect(contentSource).toContain("MAX_ADMIN_DROP_ASSET_BYTES = 250 * 1024 * 1024");
    expect(contentSource).toContain("MAX_ADMIN_CONTENT_MULTIPART_OVERHEAD_BYTES = 64 * 1024");
    expect(contentSource).toContain("ADMIN_CONTENT_BODY_LIMIT_BYTES = MAX_ADMIN_DROP_ASSET_BYTES + MAX_ADMIN_CONTENT_MULTIPART_OVERHEAD_BYTES");
    expect(contentSource).toContain("maxBodyBytes: ADMIN_CONTENT_BODY_LIMIT_BYTES");
  });

  it.each(mutationHandlers)("rejects oversized %s JSON before any mutation owner runs", async (_name, handler, url, method) => {
    const response = await handler(buildRequest(
      url,
      method,
      JSON.stringify({ padding: "x".repeat(64_000) }),
    ));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.code ?? body.errorCode).toBe("payload_too_large");
    expect(body.retryable).toBe(false);
    expectNoMutationStarted();
  });

  it.each(mutationHandlers)("classifies malformed %s JSON without starting a mutation", async (_name, handler, url, method) => {
    const response = await handler(buildRequest(url, method, "{not-json"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.code ?? body.errorCode).toBe("invalid_json");
    expect(body.retryable).toBe(false);
    expectNoMutationStarted();
  });

  it("preserves valid queue and economy mutations", async () => {
    const queueResponse = await putQueue(buildRequest(
      "http://localhost/api/admin/queue",
      "PUT",
      JSON.stringify({ queue: ["drop_1"], dropsPerDay: 1, cooldownDays: 7, timesPerDay: ["12:00"] }),
    ));
    const offerResponse = await postOffer(buildRequest(
      "http://localhost/api/admin/economy/offers",
      "POST",
      JSON.stringify({ offerId: "offer_1", title: "Offer" }),
    ));

    expect(queueResponse.status).toBe(200);
    expect(offerResponse.status).toBe(201);
    expect(mockState.saveQueueConfig).toHaveBeenCalledTimes(1);
    expect(mockState.saveOffer).toHaveBeenCalledTimes(1);
  });

  it("preserves existing domain validation after bounded parsing", async () => {
    const dropResponse = await postDrop(buildRequest(
      "http://localhost/api/admin/drops",
      "POST",
      "{}",
    ));
    const repairResponse = await postRepair(buildRequest(
      "http://localhost/api/admin/orchestration/repairs",
      "POST",
      JSON.stringify({ proposalId: "missing_proposal", action: "dismiss" }),
    ));

    expect(dropResponse.status).toBe(400);
    expect(await dropResponse.json()).toMatchObject({ error: "Missing drop data" });
    expect(repairResponse.status).toBe(404);
    expect(mockState.adminCollection).toHaveBeenCalledTimes(1);
  });
});
