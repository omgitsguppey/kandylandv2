import { describe, expect, it } from "vitest";

import { normalizeModerationEvidence } from "@/lib/moderation/moderation-evidence";
import { scoreScrapeRisk, scoreSingleModerationEvidence } from "@/lib/moderation/scrape-risk-score";

function evidence(id: string, reason: string, overrides: Record<string, unknown> = {}) {
    return normalizeModerationEvidence(id, {
        reason,
        message: reason,
        observedAt: 1_000,
        ...overrides,
    });
}

describe("scrape risk scoring", () => {
    it("keeps a single visibility-hidden event low risk with high false-positive risk", () => {
        const result = scoreSingleModerationEvidence(evidence("e1", "left_content_visible", {
            confidence: "heuristic",
            falsePositiveRisk: "high",
        }));

        expect(result.score).toBeLessThanOrEqual(5);
        expect(result.tier).toBe("low");
        expect(result.confidence).toBe("heuristic");
        expect(result.reasonCodes).toContain("unconfirmed_screenshot_like_context");
        expect(result.recommendedAction).toBe("Do not act on this alone. Monitor for repeats or stronger signals.");
    });

    it("keeps repeated visibility-only events at watch at most", () => {
        const result = scoreScrapeRisk({
            evidence: [
                evidence("e1", "visibility_hidden_while_content_visible", { confidence: "heuristic" }),
                evidence("e2", "visibility_hidden_while_content_visible", { confidence: "heuristic" }),
                evidence("e3", "visibility_hidden_while_content_visible", { confidence: "heuristic" }),
            ],
        });

        expect(result.score).toBeLessThanOrEqual(20);
        expect(["low", "watch"]).toContain(result.tier);
        expect(result.canAutoRestrict).toBe(false);
    });

    it("scores blocked entitlement asset access as high confirmed evidence", () => {
        const result = scoreScrapeRisk({
            evidence: [evidence("e1", "blocked_content_url_access_without_entitlement", { confidence: "confirmed", source: "entitlement" })],
        });

        expect(result.score).toBeGreaterThanOrEqual(40);
        expect(result.confidence).toBe("confirmed");
        expect(result.reasonCodes).toContain("server_entitlement_or_content_access_violation");
    });

    it("scores signed URL reuse as high confirmed evidence", () => {
        const result = scoreScrapeRisk({
            evidence: [
                evidence("e1", "signed_url_reuse_different_session", { confidence: "confirmed", source: "server" }),
                evidence("e2", "repeated_403_media_attempts", { confidence: "confirmed", source: "server" }),
            ],
        });

        expect(result.score).toBeGreaterThanOrEqual(70);
        expect(result.tier).toBe("high");
        expect(result.confidence).toBe("confirmed");
    });

    it("allows auto restriction only for confirmed or strong critical risk", () => {
        const result = scoreScrapeRisk({
            evidence: [
                evidence("e1", "signed_url_reuse_different_session", { confidence: "confirmed" }),
                evidence("e2", "blocked_content_url_access_without_entitlement", { confidence: "confirmed" }),
            ],
        });

        expect(result.score).toBeGreaterThanOrEqual(80);
        expect(result.canAutoRestrict).toBe(true);
    });

    it("reduces risk for normal watch behavior", () => {
        const result = scoreScrapeRisk({
            evidence: [evidence("e1", "rapid_next_prev_file_cycling", { confidence: "heuristic" })],
            validWatchMs: 20_000,
            normalUnlockAndViewingPace: true,
            userReturnedToViewing: true,
        });

        expect(result.negativeSignals.length).toBeGreaterThanOrEqual(3);
        expect(result.score).toBe(0);
    });
});
