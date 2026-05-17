import { beforeEach, describe, expect, it, vi } from "vitest";

import { submitBugReport } from "@/lib/errors/submit-bug-report";

vi.mock("@/lib/authFetch", () => ({
  authFetch: vi.fn(),
}));

const { authFetch } = await import("@/lib/authFetch");

describe("submitBugReport", () => {
  beforeEach(() => {
    vi.mocked(authFetch).mockReset();
  });

  it("posts the bug report payload through authFetch", async () => {
    vi.mocked(authFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        bugReportId: "bug_1",
        status: "rewarded",
        rewardGranted: true,
        rewardGd: 10,
        redirectTo: "/drops",
        userTitle: "Bug sent",
        userMessage: "10 reward GumDrops added.",
      }),
    } as Response);

    const result = await submitBugReport({
      errorKey: "internal_server_error",
      surface: "runtime",
      route: "/drops",
      previousRoute: "/",
    });

    expect(authFetch).toHaveBeenCalledWith("/api/bug-reports", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("internal_server_error"),
    }));
    expect(result.success).toBe(true);
    expect(result.rewardGranted).toBe(true);
    expect(result.rewardGd).toBe(10);
  });

  it("returns sanitized human failure copy for failed submits", async () => {
    vi.mocked(authFetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({
        error: "FirebaseError: raw permission stack",
      }),
    } as Response);

    const result = await submitBugReport({
      errorKey: "internal_server_error",
      surface: "runtime",
    });

    expect(result.success).toBe(false);
    expect(result.error).not.toMatch(/Firebase|stack/i);
    expect(result.userTitle).toBe("This hit a platform snag");
  });
});
