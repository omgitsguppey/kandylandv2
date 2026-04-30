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
        expect(model.completionRateMetric).toMatchObject({
            value: 8 / 12,
            formula: "completed / started",
        });
        expect(model.onboardingDropoffs).toMatchObject({
            value: 4,
            formula: "started - completed",
        });
        expect(model.discrepancyDetected).toBe(true);
        expect(model.discrepancySummary).toBe("Source mismatch: auth sign-ups and onboarding starts measure different events.");
        expect(model.durationBucketTotal).toBe(8);
        expect(model.bucketReconciliationDelta).toBe(0);
        expect(model.avgCompletionTime.value).toBe(84);
    });

    it("does not expose fake zero timing when completion durations are missing", () => {
        const model = buildAdminOnboardingVelocityModel({
            stats: {
                starts: 4,
                completions: 3,
                avgDuration: 0,
                startSource: "tracked",
            },
            durationBuckets: [],
            steps: [],
            authSignUps: 4,
        });

        expect(model.avgCompletionTime.value).toBeNull();
        expect(model.timingMissing).toBe(true);
        expect(model.missingStartTimestampCount).toBe(3);
        expect(model.missingCompletionTimestampCount).toBe(3);
    });

    it("prevents fake zeros while a validated source is absent", () => {
        const model = buildAdminOnboardingVelocityModel({
            selectedRange: "24h",
            stats: {
                starts: 0,
                completions: 0,
                avgDuration: 0,
                startSource: "none",
            },
            durationBuckets: [],
            steps: [],
            authSignUps: 0,
            loading: true,
        });

        expect(model.fakeZeroPrevented).toBe(true);
        expect(model.onboardingStarts.value).toBeNull();
        expect(model.completionRateMetric.value).toBeNull();
        expect(model.truthState).toBe("loading");
    });
});
