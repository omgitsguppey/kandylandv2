import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const guardApiRequestMock = vi.fn();
const runTransactionMock = vi.fn();
const collectionMock = vi.fn();
const trackServerEventMock = vi.fn();
const handleApiErrorMock = vi.fn();

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    collection: collectionMock,
    runTransaction: runTransactionMock,
  },
}));

vi.mock("firebase-admin", () => ({
  default: {
    firestore: {
      FieldValue: {
        serverTimestamp: vi.fn(() => "server-timestamp"),
      },
    },
  },
}));

vi.mock("@/lib/server/request-guard", () => ({
  guardApiRequest: guardApiRequestMock,
}));

vi.mock("@/lib/server/analytics", () => ({
  trackServerEvent: trackServerEventMock,
}));

vi.mock("@/lib/server/auth", () => ({
  handleApiError: handleApiErrorMock,
}));

vi.mock("@/lib/security-events", () => ({
  describeSecurityEvent: () => ({
    reason: "rip_attempt",
    label: "Rip attempt",
    message: "Rip attempt detected",
    locationLabel: "Viewer",
    severity: "warn",
    telemetryEventName: "security_violation_detected",
    detectionKind: "viewer",
  }),
}));

vi.mock("@/lib/server/analytics-event-utils", () => ({
  buildAnalyticsTimeKeys: () => ({
    dayKey: "2026-04-08",
    hourKey: "2026-04-08T10",
    minuteKey: "2026-04-08T10:30",
  }),
}));

describe("POST /api/security/log-attempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    guardApiRequestMock.mockResolvedValue({ uid: "user-1", email: "user@example.com" });
    handleApiErrorMock.mockReturnValue(new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 }));
    collectionMock.mockImplementation(() => ({
      doc: vi.fn(() => ({ id: "event-1" })),
    }));
  });

  it("delegates unexpected failures to handleApiError", async () => {
    runTransactionMock.mockRejectedValue(new Error("db write failed"));

    const { POST } = await import("@/app/api/security/log-attempt/route");
    const request = new NextRequest("http://localhost/api/security/log-attempt", {
      method: "POST",
      body: JSON.stringify({ reason: "rip_attempt" }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);

    expect(handleApiErrorMock).toHaveBeenCalledTimes(1);
    expect(handleApiErrorMock).toHaveBeenCalledWith(expect.any(Error), "SecurityLogAttempt.POST");
    expect(response.status).toBe(500);
    expect(trackServerEventMock).not.toHaveBeenCalled();
  }, 15_000);
});
