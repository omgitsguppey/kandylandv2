import { describe, expect, it } from "vitest";

import { normalizeTheftRiskEvidence } from "@/lib/moderation/theft-risk-evidence";
import { scoreSingleTheftRiskEvidence, scoreTheftRisk } from "@/lib/moderation/theft-risk-score";

function evidence(id: string, reason: string, overrides: Record<string, unknown> = {}) {
    return normalizeTheftRiskEvidence(id, {
        reason,
        message: reason,
        observedAt: 1_000,
        ...overrides,
    });
}

describe("theft risk scoring", () => {
    it("keeps left while content visible alone as low risk", () => {
        const result = scoreSingleTheftRiskEvidence(evidence("e1", "left_content_visible", {
            confidence: "heuristic",
            falsePositiveRisk: "high",
            source: "viewer",
        }));

        expect(result.score).toBeLessThanOrEqual(5);
        expect(result.tier).toBe("low");
        expect(result.recommendedAction).toBe("Do not act on this alone. Monitor for repeats or stronger signals.");
    });

    it("caps weak visibility-only signals at watch", () => {
        const result = scoreTheftRisk({
            evidence: [
                evidence("e1", "visibility_hidden_while_content_visible", { confidence: "heuristic", repeatCount: 3 }),
                evidence("e2", "screenshot_hotkey", { confidence: "heuristic", source: "viewer" }),
            ],
        });

        expect(result.score).toBeLessThanOrEqual(39);
        expect(["low", "watch"]).toContain(result.tier);
        expect(result.canAutoRestrict).toBe(false);
    });

    it("scores entitlement violations as high risk", () => {
        const result = scoreTheftRisk({
            evidence: [evidence("e1", "blocked_content_url_access_without_entitlement", { confidence: "confirmed", source: "entitlement" })],
        });

        expect(result.score).toBeGreaterThanOrEqual(45);
        expect(["review", "high", "critical"]).toContain(result.tier);
        expect(result.reasonCodes).toContain("server_entitlement_or_content_access_violation");
    });

    it("scores signed url reuse plus blocked access as critical and auto-restrictable", () => {
        const result = scoreTheftRisk({
            evidence: [
                evidence("e1", "signed_url_reuse_different_session", { confidence: "confirmed", source: "server" }),
                evidence("e2", "blocked_content_url_access_without_entitlement", { confidence: "confirmed", source: "entitlement" }),
            ],
        });

        expect(result.score).toBeGreaterThanOrEqual(80);
        expect(result.tier).toBe("critical");
        expect(result.canAutoRestrict).toBe(true);
    });

    it("reduces screenshot-like suspicion for one-off mobile safari blur", () => {
        const result = scoreTheftRisk({
            evidence: [evidence("e1", "screenshot_hotkey", { confidence: "heuristic", source: "viewer" })],
            oneOffMobileSafariBlur: true,
        });

        expect(result.score).toBe(0);
        expect(result.reasonCodes).toContain("mobile_safari_blur_normalizer");
    });

    it("reduces risk for normal viewing behavior", () => {
        const result = scoreTheftRisk({
            evidence: [evidence("e1", "rapid_next_prev_file_cycling", { confidence: "heuristic" })],
            validWatchMs: 20_000,
            normalViewingPace: true,
            userReturnedToViewing: true,
        });

        expect(result.score).toBe(0);
        expect(result.negativeSignals.length).toBeGreaterThanOrEqual(3);
    });
});
