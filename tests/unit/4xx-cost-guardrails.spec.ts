import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { cheap4xxResponse } from "@/lib/server/cheap-4xx-response";
import { classify4xxPath, isKnownBotProbePath } from "@/lib/server/route-4xx-classifier";
import { read4xxDedupeTable, record4xxDedupe } from "@/lib/server/route-4xx-dedupe";

const verifyAuthMock = vi.hoisted(() => vi.fn());
const verifyAdminMock = vi.hoisted(() => vi.fn());
const checkRateLimitMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/auth", () => {
  class AuthError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    AuthError,
    verifyAuth: verifyAuthMock,
    verifyAdmin: verifyAdminMock,
  };
});

vi.mock("@/lib/server/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/server/request-origin", () => ({
  hasTrustedSiteOrigin: () => true,
}));

import { guardApiRequest } from "@/lib/server/request-guard";

describe("4xx cost guardrails", () => {
  it("classifies bot probe paths", () => {
    expect(isKnownBotProbePath("/.env")).toBe(true);
    expect(classify4xxPath({ pathname: "/wp-admin", status: 404 })).toBe("bot_probe");
  });

  it("returns minimal cheap 4xx payload", async () => {
    const response = cheap4xxResponse({
      status: 404,
      code: "bot_probe_path_blocked",
      message: "Not found",
      class: "bot_probe",
      cacheTtlSeconds: 300,
    });
    const payload = await response.json();
    expect(response.status).toBe(404);
    expect(payload).toEqual({
      success: false,
      code: "bot_probe_path_blocked",
      message: "Not found",
    });
    expect(response.headers.get("cache-control")).toContain("max-age=300");
  });

  it("dedupes repeated same 404 fingerprint", () => {
    const first = record4xxDedupe({
      route: "/api/drops/content",
      status: 404,
      code: "media_not_found",
      method: "GET",
      actorClass: "guest",
      normalizedPattern: "/api/drops/content",
      samplePath: "/api/drops/content?id=a",
    });
    const second = record4xxDedupe({
      route: "/api/drops/content",
      status: 404,
      code: "media_not_found",
      method: "GET",
      actorClass: "guest",
      normalizedPattern: "/api/drops/content",
      samplePath: "/api/drops/content?id=b",
    });
    expect(first.isNew).toBe(true);
    expect(second.isNew).toBe(false);
    const table = read4xxDedupeTable();
    const entry = table.get(first.fingerprint);
    expect(entry?.count).toBeGreaterThanOrEqual(2);
  });

  it("rejects missing auth header before auth verification", async () => {
    verifyAuthMock.mockReset();
    verifyAdminMock.mockReset();
    checkRateLimitMock.mockReset();
    verifyAuthMock.mockResolvedValue({ uid: "user_1" });

    const request = new NextRequest("http://localhost/api/test", { method: "POST" });
    await expect(guardApiRequest(request, {
      routeName: "test",
      allowedMethods: ["POST"],
      requireAuthHeaderPresence: true,
    })).rejects.toMatchObject({ status: 401 });

    expect(verifyAuthMock).not.toHaveBeenCalled();
  });
});
