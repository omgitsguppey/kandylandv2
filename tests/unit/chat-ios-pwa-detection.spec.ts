import { afterEach, describe, expect, it, vi } from "vitest";

import { isIosStandalonePwa, isIosUserAgent } from "@/lib/device-layout-contract";

describe("chat iOS PWA detection", () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", { value: originalNavigator, configurable: true });
    }
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", { value: originalWindow, configurable: true });
    }
    vi.restoreAllMocks();
  });

  it("detects iOS user agents", () => {
    expect(isIosUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)", "iPhone", 5)).toBe(true);
    expect(isIosUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 8)", "Linux armv8l", 5)).toBe(false);
  });

  it("is true only in iOS standalone", () => {
    const fakeWindow = {
      matchMedia: vi.fn().mockImplementation((query: string) => ({ matches: query === "(display-mode: standalone)" })),
      navigator: { standalone: true },
    } as unknown as Window;
    const fakeNavigator = {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
    } as Navigator;

    Object.defineProperty(globalThis, "window", { value: fakeWindow, configurable: true });
    Object.defineProperty(globalThis, "navigator", { value: fakeNavigator, configurable: true });
    expect(isIosStandalonePwa()).toBe(true);

    const fakeAndroidNavigator = {
      userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8)",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
    } as Navigator;
    Object.defineProperty(globalThis, "navigator", { value: fakeAndroidNavigator, configurable: true });
    expect(isIosStandalonePwa()).toBe(false);
  });
});
