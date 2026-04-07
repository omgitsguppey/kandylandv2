import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/firebase-admin", () => ({
    adminDb: null,
}));

import {
    ADMIN_AI_DASHBOARD_READ,
    ADMIN_AI_GENERATE,
    ADMIN_ANALYTICS_REALTIME_ADAPTIVE,
    ADMIN_DEBUG_ASSISTANT,
    resolveAdaptiveRateLimitForUserCount,
} from "@/lib/server/rate-limit";

describe("adaptive rate limits", () => {
    it("keeps the baseline generation budget before the 200-user threshold", () => {
        expect(resolveAdaptiveRateLimitForUserCount(ADMIN_AI_GENERATE, 199)).toEqual({
            maxRequests: 12,
            windowMs: 60_000,
        });
    });

    it("tightens the generation budget once the repo has crossed 200 users", () => {
        expect(resolveAdaptiveRateLimitForUserCount(ADMIN_AI_GENERATE, 200)).toEqual({
            maxRequests: 8,
            windowMs: 60_000,
        });
        expect(resolveAdaptiveRateLimitForUserCount(ADMIN_AI_GENERATE, 550)).toEqual({
            maxRequests: 5,
            windowMs: 60_000,
        });
    });

    it("uses different adaptive ceilings for read-heavy admin routes", () => {
        expect(resolveAdaptiveRateLimitForUserCount(ADMIN_AI_DASHBOARD_READ, 650)).toEqual({
            maxRequests: 60,
            windowMs: 60_000,
        });
        expect(resolveAdaptiveRateLimitForUserCount(ADMIN_ANALYTICS_REALTIME_ADAPTIVE, 650)).toEqual({
            maxRequests: 90,
            windowMs: 60_000,
        });
        expect(resolveAdaptiveRateLimitForUserCount(ADMIN_DEBUG_ASSISTANT, 1_200)).toEqual({
            maxRequests: 4,
            windowMs: 60_000,
        });
    });
});
