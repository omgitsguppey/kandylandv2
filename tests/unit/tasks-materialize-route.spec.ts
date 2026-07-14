import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  guardApiRequest: vi.fn(),
  handleApiError: vi.fn(),
  materializeDailyTaskResetWindows: vi.fn(),
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: mockState.guardApiRequest,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: mockState.handleApiError,
}));

vi.mock("@/lib/server/daily-tasks", () => ({
  materializeDailyTaskResetWindows: mockState.materializeDailyTaskResetWindows,
}));

vi.mock("@/lib/server/rate-limit", () => ({
  ADMIN: {},
}));

vi.mock("@/lib/server/route-runtime-health", () => ({
  withRouteRuntimeHealth: (_key: string, handler: unknown) => handler,
}));

import { POST } from "@/app/api/tasks/materialize/route";

describe("POST /api/tasks/materialize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TASK_MATERIALIZER_TOKEN;
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "admin@example.com",
      isAdmin: true,
    });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));
    mockState.materializeDailyTaskResetWindows.mockResolvedValue({
      processedUsers: 1,
      completed: true,
    });
  });

  afterEach(() => {
    delete process.env.TASK_MATERIALIZER_TOKEN;
  });

  it("preserves bounded admin materialization inputs", async () => {
    const response = await POST(new NextRequest("http://localhost/api/tasks/materialize", {
      method: "POST",
      body: JSON.stringify({
        maxUsers: 25,
        cursorUserId: "user_24",
        maxRuntimeMs: 5_000,
        source: "debug_repair",
      }),
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockState.materializeDailyTaskResetWindows).toHaveBeenCalledWith({
      maxUsers: 25,
      cursorUserId: "user_24",
      maxRuntimeMs: 5_000,
      source: "debug_repair",
    });
  });

  it("rejects oversized materializer requests before any materialization", async () => {
    const response = await POST(new NextRequest("http://localhost/api/tasks/materialize", {
      method: "POST",
      body: JSON.stringify({ padding: "x".repeat(12_000) }),
      headers: {
        "content-type": "application/json",
        "content-length": "1",
      },
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body).toMatchObject({
      success: false,
      errorCode: "payload_too_large",
      retryable: false,
    });
    expect(mockState.materializeDailyTaskResetWindows).not.toHaveBeenCalled();
    expect(mockState.handleApiError).not.toHaveBeenCalled();
  });
});
