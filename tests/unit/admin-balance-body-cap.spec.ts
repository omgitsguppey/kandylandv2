import { readFileSync } from "node:fs";
import { join } from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => {
  const userDocData: Record<string, unknown> = {};
  const transactionUpdate = vi.fn();
  const transactionSet = vi.fn();
  const touchUserRuntime = vi.fn();
  const guardApiRequest = vi.fn();
  const handleApiError = vi.fn();
  const userRef = { path: "users/fan_1" };
  const transactionRef = { id: "tx_admin_1", path: "transactions/tx_admin_1" };

  return {
    userDocData,
    transactionUpdate,
    transactionSet,
    touchUserRuntime,
    guardApiRequest,
    handleApiError,
    userRef,
    transactionRef,
    adminDb: {
      collection(name: string) {
        if (name === "users") {
          return {
            doc(id: string) {
              if (id !== "fan_1") {
                throw new Error(`Unexpected user id: ${id}`);
              }
              return userRef;
            },
          };
        }

        if (name === "transactions") {
          return {
            doc() {
              return transactionRef;
            },
          };
        }

        if (name === "server_diagnostics") {
          return {
            add: vi.fn(),
            doc() {
              return {
                set: vi.fn(),
              };
            },
          };
        }

        throw new Error(`Unexpected collection: ${name}`);
      },
      async runTransaction<T>(callback: (transaction: {
        get: (ref: unknown) => Promise<{ exists: boolean; data: () => Record<string, unknown> }>;
        update: (ref: unknown, patch: Record<string, unknown>) => void;
        set: (ref: unknown, data: Record<string, unknown>) => void;
      }) => Promise<T>) {
        return callback({
          get: async (ref: unknown) => {
            if (ref !== userRef) {
              throw new Error("Unexpected ref in transaction.get");
            }

            return {
              exists: true,
              data: () => ({ ...userDocData }),
            };
          },
          update: (ref: unknown, patch: Record<string, unknown>) => {
            transactionUpdate(ref, patch);
          },
          set: (ref: unknown, data: Record<string, unknown>) => {
            transactionSet(ref, data);
          },
        });
      },
    },
    reset() {
      Object.keys(userDocData).forEach((key) => {
        delete userDocData[key];
      });
      transactionUpdate.mockReset();
      transactionSet.mockReset();
      touchUserRuntime.mockReset();
      guardApiRequest.mockReset();
      handleApiError.mockReset();
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
  ADMIN: {},
}));

vi.mock("@/lib/server/user-runtime", () => ({
  touchUserRuntime: mockState.touchUserRuntime,
}));

import { POST } from "@/app/api/admin/balance/route";

function adminBalanceRequest(body: string, headers?: HeadersInit) {
  return new NextRequest("http://localhost/api/admin/balance", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      ...(headers ?? {}),
    },
  });
}

describe("admin balance body cap", () => {
  beforeEach(() => {
    mockState.reset();
    mockState.guardApiRequest.mockResolvedValue({
      uid: "admin_1",
      email: "owner@example.com",
      role: "admin",
    });
    mockState.handleApiError.mockImplementation((error: unknown) => NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 }));

    Object.assign(mockState.userDocData, {
      gumDropsBalance: 50,
      gumDropsPurchasedBalance: 50,
      gumDropsRewardBalance: 0,
    });
  });

  it("keeps a valid small admin adjustment on the existing reward-balance path", async () => {
    const response = await POST(adminBalanceRequest(JSON.stringify({
      userId: "fan_1",
      amount: 25,
      reason: "goodwill",
    })));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      balanceAfter: 75,
    });
    expect(mockState.transactionUpdate).toHaveBeenCalledWith(
      mockState.userRef,
      expect.objectContaining({
        gumDropsBalance: 75,
        gumDropsPurchasedBalance: 50,
        gumDropsRewardBalance: 25,
      }),
    );
  });

  it("rejects oversized content-length before schema parsing or ledger writes", async () => {
    const response = await POST(adminBalanceRequest(JSON.stringify({
      userId: "fan_1",
      amount: 25,
      reason: "goodwill",
    }), {
      "content-length": "9000",
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      success: false,
      code: "payload_too_large",
    });
    expect(mockState.transactionUpdate).not.toHaveBeenCalled();
    expect(mockState.transactionSet).not.toHaveBeenCalled();
  });

  it("rejects oversized measured bodies when content-length is missing", async () => {
    const response = await POST(adminBalanceRequest(JSON.stringify({
      userId: "fan_1",
      amount: 25,
      reason: "x".repeat(9_000),
    }), {
      "content-length": "",
    }));
    const payload = await response.json();

    expect(response.status).toBe(413);
    expect(payload).toMatchObject({
      success: false,
      code: "payload_too_large",
    });
    expect(mockState.transactionUpdate).not.toHaveBeenCalled();
  });

  it("returns a human-safe malformed JSON response", async () => {
    const response = await POST(adminBalanceRequest("{bad"));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      code: "invalid_json",
    });
    expect(String(payload.error)).not.toContain("{bad");
  });

  it("rejects non-JSON content types when applying the admin balance JSON policy", async () => {
    const response = await POST(adminBalanceRequest(JSON.stringify({
      userId: "fan_1",
      amount: 25,
      reason: "goodwill",
    }), {
      "content-type": "text/plain",
    }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      success: false,
      code: "invalid_json",
    });
    expect(mockState.transactionUpdate).not.toHaveBeenCalled();
  });

  it("keeps admin authorization, bounds, GumDrop math, and route runtime health source-visible", () => {
    const root = process.cwd();
    const routeSource = readFileSync(join(root, "src/app/api/admin/balance/route.ts"), "utf8");
    const ledgerSource = readFileSync(join(root, "src/lib/gumdrop-ledger.ts"), "utf8");
    const serverLedgerSource = readFileSync(join(root, "src/lib/server/gumdrop-ledger.ts"), "utf8");

    expect(routeSource).toContain("guardApiRequest(request");
    expect(routeSource).toContain('auth: "admin"');
    expect(routeSource).toContain("rateLimit: ADMIN");
    expect(routeSource).toContain("requireTrustedOrigin: true");
    expect(routeSource).toContain("withRouteRuntimeHealth(\"admin/balance:POST\", POST_handler)");
    expect(routeSource).toContain("readBoundedJsonBody");
    expect(routeSource).not.toContain("request.json()");
    expect(routeSource).toContain("ADMIN_BALANCE_BODY_LIMIT_BYTES = 8_192");
    expect(routeSource).toContain("gte(-1_000_000).lte(1_000_000)");
    expect(routeSource).toContain("creditSourceAwareGumdrops(sourceAwareBalance, amount, \"reward\")");
    expect(routeSource).toContain("spendSourceAwareGumdrops(sourceAwareBalance, Math.abs(amount))");
    expect(routeSource).toContain("buildCompletedGumdropTransaction");
    expect(ledgerSource).toContain("rewardSpent = Math.min(current.reward, required)");
    expect(serverLedgerSource).toContain("verifiedServerSide: true");
  });
});
