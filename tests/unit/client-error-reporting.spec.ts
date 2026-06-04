import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { reportClientIssue } from "@/lib/client-error-reporting";
import { clearClientDiagnostics } from "@/lib/client-diagnostics";

describe("client error reporting", () => {
  let localStorageData: Record<string, string>;

  beforeEach(() => {
    localStorageData = {};
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-04T00:00:00.000Z"));
    vi.stubGlobal("window", {
      localStorage: {
        getItem: vi.fn((key: string) => localStorageData[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageData[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageData[key];
        }),
      },
      location: { pathname: "/admin/debug" },
      setTimeout,
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200 })));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    clearClientDiagnostics();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("deduplicates repeated realtime listener writes before they flood debug evidence", async () => {
    const error = new Error("Missing or insufficient permissions.");
    const detail = {
      listener: "admin_ai_debug_settings",
      scope: "admin debug assistant",
      errorMessage: "Missing or insufficient permissions.",
    };

    reportClientIssue({
      channel: "firebase",
      severity: "warn",
      message: "Admin AI debug settings realtime listener failed",
      error,
      detail,
      consoleLabel: "[Admin AI Debug] settings listener failed",
    });
    reportClientIssue({
      channel: "firebase",
      severity: "warn",
      message: "Admin AI debug settings realtime listener failed",
      error,
      detail,
      consoleLabel: "[Admin AI Debug] settings listener failed",
    });

    await vi.runAllTimersAsync();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });
});
