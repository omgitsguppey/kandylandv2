import { describe, expect, it } from "vitest";

import {
  formatBetaOdometerVersion,
  getNextBetaOdometerVersion,
  migrateLegacyVersionToBetaCounter,
  parseBetaOdometerVersion,
} from "@/lib/release-notes/beta-odometer-version";

describe("beta odometer versioning", () => {
  it("formats canonical counter milestones", () => {
    expect(formatBetaOdometerVersion(0)).toBe("1.0.0");
    expect(formatBetaOdometerVersion(1)).toBe("1.0.1");
    expect(formatBetaOdometerVersion(99)).toBe("1.0.99");
    expect(formatBetaOdometerVersion(100)).toBe("1.1.0");
    expect(formatBetaOdometerVersion(199)).toBe("1.1.99");
    expect(formatBetaOdometerVersion(200)).toBe("1.2.0");
    expect(formatBetaOdometerVersion(201)).toBe("1.2.1");
  });

  it("formats overflow ranges after 1.99.99", () => {
    expect(formatBetaOdometerVersion(9999)).toBe("1.99.99");
    expect(formatBetaOdometerVersion(10000)).toBe("1.99.99.1");
    expect(formatBetaOdometerVersion(19998)).toBe("1.99.99.9999");
    expect(formatBetaOdometerVersion(19999)).toBe("1.99.99.1a");
  });

  it("parses odometer versions back to their counter", () => {
    expect(parseBetaOdometerVersion("1.2.1")?.counter).toBe(201);
    expect(parseBetaOdometerVersion("1.99.99.1a")?.counter).toBe(19999);
  });

  it("migrates the legacy current version and computes the next accepted release", () => {
    expect(migrateLegacyVersionToBetaCounter("1.113.4")).toBe(201);
    expect(getNextBetaOdometerVersion(201)).toBe("1.2.2");
  });
});
