import { describe, expect, it } from "vitest";

import { buildAdminOnboardingVelocityModel } from "@/lib/admin-onboarding-velocity";

describe("admin onboarding velocity model", () => {
    it("computes discrepancy and drop-off signals from starts, completions, and steps", () => {
        const model = buildAdminOnboardingVelocityModel({
            stats: {
                starts: 12,
                completions: 8,
                avgDuration: 84,
            },
            durationBuckets: [{ label: "<1m", count: 8 }],
            steps: [
                {
                    stepKey: "welcome",
                    stepTitle: "Welcome",
                    stepIndex: 0,
                    starts: 12,
                    completions: 11,
                    avgDurationMs: 1200,
                },
                {
                    stepKey: "finish",
                    stepTitle: "Finish onboarding",
                    stepIndex: 1,
                    starts: 9,
                    completions: 7,
                    avgDurationMs: 2400,
                },
            ],
            authSignUps: 10,
        });

        expect(model.starts).toBe(12);
        expect(model.dropOffCount).toBe(4);
        expect(model.steps[1]).toMatchObject({
            completionRate: 7 / 9,
            dropOffCount: 2,
        });
        expect(model.discrepancies).toEqual([
            "Auth sign-ups 10 do not match onboarding starts 12.",
            "Final onboarding step completions 7 do not match onboarding completions 8.",
        ]);
    });
});
