import { describe, expect, it } from "vitest";

import { calculateOverviewMetricDelta, paginateOverviewItems } from "@/lib/admin-overview";

describe("admin overview helpers", () => {
    it("calculates directional percentage deltas", () => {
        expect(calculateOverviewMetricDelta(15, 10)).toEqual({
            current: 15,
            previous: 10,
            percentChange: 50,
            direction: "up",
            scopeLabel: "vs prior 30d",
        });

        expect(calculateOverviewMetricDelta(8, 10)).toEqual({
            current: 8,
            previous: 10,
            percentChange: -20,
            direction: "down",
            scopeLabel: "vs prior 30d",
        });
    });

    it("marks zero-baseline deltas as unavailable instead of inventing a percent", () => {
        expect(calculateOverviewMetricDelta(4, 0)).toEqual({
            current: 4,
            previous: 0,
            percentChange: null,
            direction: "up",
            scopeLabel: "vs prior 30d",
        });
    });

    it("paginates items and clamps out-of-range pages", () => {
        const items = ["a", "b", "c", "d", "e", "f"];

        expect(paginateOverviewItems(items, 0, 2)).toEqual({
            items: ["a", "b"],
            page: 0,
            totalPages: 3,
            startIndex: 0,
            endIndex: 2,
        });

        expect(paginateOverviewItems(items, 9, 2)).toEqual({
            items: ["e", "f"],
            page: 2,
            totalPages: 3,
            startIndex: 4,
            endIndex: 6,
        });
    });
});
