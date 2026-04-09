import { describe, expect, it } from "vitest";

import { buildAdminTaskPipelineModel } from "@/lib/admin-task-pipeline";

describe("admin task pipeline model", () => {
    it("computes empty and peak pipeline states", () => {
        expect(buildAdminTaskPipelineModel([
            { label: "Assigned", count: 0 },
            { label: "Started", count: 0 },
        ])).toMatchObject({
            hasData: false,
            peakCount: 0,
        });

        expect(buildAdminTaskPipelineModel([
            { label: "Assigned", count: 12 },
            { label: "Started", count: 8 },
            { label: "Completed", count: 5 },
        ])).toMatchObject({
            hasData: true,
            peakCount: 12,
        });
    });
});
