import { describe, it, expect } from "vitest";
import { formatAnalyticsMetricValue } from "@/lib/analytics-metric-catalog";

describe("formatAnalyticsMetricValue", () => {
  describe("edge cases", () => {
    it("returns '0' for NaN", () => {
      expect(formatAnalyticsMetricValue(NaN, "count")).toBe("0");
    });

    it("returns '0' for Infinity", () => {
      expect(formatAnalyticsMetricValue(Infinity, "count")).toBe("0");
    });

    it("returns '0' for -Infinity", () => {
      expect(formatAnalyticsMetricValue(-Infinity, "count")).toBe("0");
    });
  });

  describe("percent type", () => {
    it("formats values >= 0.1 with 1 decimal place", () => {
      expect(formatAnalyticsMetricValue(0.1, "percent")).toBe("10.0%");
      expect(formatAnalyticsMetricValue(0.1234, "percent")).toBe("12.3%");
      expect(formatAnalyticsMetricValue(1, "percent")).toBe("100.0%");
    });

    it("formats values < 0.1 with 2 decimal places", () => {
      expect(formatAnalyticsMetricValue(0.09, "percent")).toBe("9.00%");
      expect(formatAnalyticsMetricValue(0.0012, "percent")).toBe("0.12%");
      expect(formatAnalyticsMetricValue(0, "percent")).toBe("0.00%");
    });

    it("handles negative percentages", () => {
      expect(formatAnalyticsMetricValue(-0.1, "percent")).toBe("-10.00%"); // -0.1 < 0.1
      expect(formatAnalyticsMetricValue(-0.05, "percent")).toBe("-5.00%");
    });
  });

  describe("seconds type", () => {
    it("rounds and formats with 's' suffix", () => {
      expect(formatAnalyticsMetricValue(5, "seconds")).toBe("5s");
      expect(formatAnalyticsMetricValue(5.4, "seconds")).toBe("5s");
      expect(formatAnalyticsMetricValue(5.6, "seconds")).toBe("6s");
    });

    it("uses locale string for large values", () => {
      // We expect grouping separator for large numbers, though it's locale-dependent.
      // In most test environments it's comma or space.
      const formatted = formatAnalyticsMetricValue(1234.5, "seconds");
      expect(formatted).toMatch(/1[.,]235s/);
    });
  });

  describe("ratio type", () => {
    it("formats values >= 10 with 1 decimal place", () => {
      expect(formatAnalyticsMetricValue(10, "ratio")).toBe("10.0");
      expect(formatAnalyticsMetricValue(10.55, "ratio")).toBe("10.6");
      expect(formatAnalyticsMetricValue(100, "ratio")).toBe("100.0");
    });

    it("formats values < 10 with 2 decimal places", () => {
      expect(formatAnalyticsMetricValue(9.99, "ratio")).toBe("9.99");
      expect(formatAnalyticsMetricValue(5.4321, "ratio")).toBe("5.43");
      expect(formatAnalyticsMetricValue(0, "ratio")).toBe("0.00");
    });
  });

  describe("count type (default)", () => {
    it("rounds and formats using locale string", () => {
      expect(formatAnalyticsMetricValue(5, "count")).toBe("5");
      expect(formatAnalyticsMetricValue(5.4, "count")).toBe("5");
      expect(formatAnalyticsMetricValue(5.6, "count")).toBe("6");

      const formatted = formatAnalyticsMetricValue(1234.5, "count");
      expect(formatted).toMatch(/1[.,]235/);
    });
  });
});
