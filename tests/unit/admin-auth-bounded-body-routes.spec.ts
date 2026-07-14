import fs from "node:fs";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  getResolvedQueueConfig: vi.fn(),
  setDropQueueMembership: vi.fn(),
  collection: vi.fn(),
  saveAdminUiCollapsedModulePreference: vi.fn(),
  recordRouteRuntimeSample: vi.fn(),
  reset() {
    this.guardApiRequest.mockReset();
    this.handleApiError.mockReset();
    this.getResolvedQueueConfig.mockReset();
    this.setDropQueueMembership.mockReset();
    this.collection.mockReset();
    this.saveAdminUiCollapsedModulePreference.mockReset();
    this.recordRouteRuntimeSample.mockReset();
  },
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/drop-queue", () => ({
  getResolvedQueueConfig: mockState.getResolvedQueueConfig,
  setDropQueueMembership: mockState.setDropQueueMembership,
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: mockState.collection,
  },
}));

vi.mock("@/lib/server/admin-ui-preferences", () => ({
  getAdminUiPreferences: vi.fn(),
  saveAdminUiCollapsedModulePreference: mockState.saveAdminUiCollapsedModulePreference,
}));

vi.mock("@/lib/server/route-diagnostics", () => ({
  getErrorMessage: (error: unknown) => error instanceof Error ? error.message : String(error),
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
  HEAVY_READ: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
  recordRouteRuntimeSample: mockState.recordRouteRuntimeSample,
}));

import { POST as toggleQueue } from "@/app/api/admin/queue/toggle/route";
import { POST as createTask, PUT as updateTask } from "@/app/api/admin/tasks/route";
import { PUT as updateAdminUiPreferences } from "@/app/api/admin/ui/preferences/route";

const routeBodyParserCounts = new Map<string, number>([
  ["src/app/api/admin/queue/toggle/route.ts", 1],
  ["src/app/api/admin/roster/route.ts", 1],
  ["src/app/api/admin/support/threads/[threadId]/messages/route.ts", 1],
  ["src/app/api/admin/support/threads/[threadId]/route.ts", 2],
  ["src/app/api/admin/tasks/route.ts", 2],
  ["src/app/api/admin/ui/preferences/route.ts", 1],
  ["src/app/api/admin/users/[userId]/username/route.ts", 1],
  ["src/app/api/admin/users/route.ts", 2],
  ["src/app/api/admin/view-as-creator/route.ts", 1],
  ["src/app/api/auth/manual-sign-in-lookup/route.ts", 1],
]);

function readSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function buildRequest(url: string, method: "POST" | "PUT", body: string) {
  return new NextRequest(url, {
    method,
    body,
    headers: { "Content-Type": "application/json" },
  });
}

describe("bounded admin and manual-sign-in JSON routes", () => {
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
  });

  it("routes every JSON consumer through the canonical byte-counted parser", () => {
    for (const [relativePath, expectedCount] of routeBodyParserCounts) {
      const source = readSource(relativePath);
      const parserCalls = source.match(/readBoundedJsonBody</gu) ?? [];

      expect(source, relativePath).not.toMatch(/request\.json\s*\(/u);
      expect(parserCalls, relativePath).toHaveLength(expectedCount);
      expect(source, relativePath).toContain("retryable: false");
      expect(source, relativePath).toContain("isBoundedJsonBodyError(error)");
    }
  });

  it("rejects an oversized queue toggle before queue state is read or mutated", async () => {
    const response = await toggleQueue(buildRequest(
      "http://localhost/api/admin/queue/toggle",
      "POST",
      JSON.stringify({ dropId: "drop_1", padding: "x".repeat(64_000) }),
    ));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toMatchObject({
      success: false,
      code: "payload_too_large",
      retryable: false,
    });
    expect(mockState.getResolvedQueueConfig).not.toHaveBeenCalled();
    expect(mockState.setDropQueueMembership).not.toHaveBeenCalled();
  });

  it.each([
    ["POST", createTask],
    ["PUT", updateTask],
  ] as const)("rejects an oversized admin tasks %s before Firestore mutation", async (method, handler) => {
    const response = await handler(buildRequest(
      "http://localhost/api/admin/tasks",
      method,
      JSON.stringify({ padding: "x".repeat(64_000) }),
    ));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toMatchObject({
      success: false,
      code: "payload_too_large",
      retryable: false,
    });
    expect(mockState.collection).not.toHaveBeenCalled();
  });

  it("rejects oversized admin UI preferences before saving", async () => {
    const response = await updateAdminUiPreferences(buildRequest(
      "http://localhost/api/admin/ui/preferences",
      "PUT",
      JSON.stringify({
        key: "admin_ai.runtime",
        collapsed: true,
        padding: "x".repeat(64_000),
      }),
    ));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toMatchObject({
      success: false,
      code: "payload_too_large",
      retryable: false,
    });
    expect(mockState.saveAdminUiCollapsedModulePreference).not.toHaveBeenCalled();
  });

  it("classifies malformed JSON as non-retryable without reaching the queue owner", async () => {
    const response = await toggleQueue(buildRequest(
      "http://localhost/api/admin/queue/toggle",
      "POST",
      "{not-json",
    ));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      code: "invalid_json",
      retryable: false,
    });
    expect(mockState.getResolvedQueueConfig).not.toHaveBeenCalled();
    expect(mockState.setDropQueueMembership).not.toHaveBeenCalled();
  });
});
