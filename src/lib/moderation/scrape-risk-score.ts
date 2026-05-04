import type { ModerationEvidence, ModerationEvidenceConfidence } from "@/lib/moderation/moderation-evidence";

export type ScrapeRiskTier = "low" | "watch" | "review" | "high" | "critical";

export type ScrapeRiskScore = {
    score: number;
    tier: ScrapeRiskTier;
    confidence: ModerationEvidenceConfidence;
    reasonCodes: string[];
    evidenceIds: string[];
    positiveSignals: string[];
    negativeSignals: string[];
    recommendedAction: string;
    canAutoRestrict: boolean;
};

const CONFIDENCE_RANK: Record<ModerationEvidenceConfidence, number> = {
    unknown: 0,
    heuristic: 1,
    strong: 2,
    confirmed: 3,
};

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function riskTier(score: number): ScrapeRiskTier {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "review";
    if (score >= 20) return "watch";
    return "low";
}

function strongestConfidence(values: ModerationEvidenceConfidence[]): ModerationEvidenceConfidence {
    return values.sort((left, right) => CONFIDENCE_RANK[right] - CONFIDENCE_RANK[left])[0] ?? "unknown";
}

function addSignal(input: {
    score: number;
    code: string;
    summary: string;
    reasonCodes: Set<string>;
    positiveSignals: string[];
}) {
    input.reasonCodes.add(input.code);
    input.positiveSignals.push(input.summary);
    return input.score;
}

function weightForEvidence(evidence: ModerationEvidence) {
    const reason = evidence.normalizedReason.toLowerCase();
    const eventType = evidence.eventType.toLowerCase();
    const joined = `${reason} ${eventType}`;

    if (joined.includes("blocked_content_url") || joined.includes("blocked_asset_access") || joined.includes("entitlement_denied")) return 45;
    if (joined.includes("signed_url_reuse") || joined.includes("same_asset_multiple_accounts")) return 40;
    if (joined.includes("rapid_sequential_media") || joined.includes("direct_asset_endpoint") || joined.includes("without_viewer_session")) return 35;
    if (joined.includes("repeated_403") || joined.includes("repeated_401") || joined.includes("missing_viewer_token")) return 30;
    if (joined.includes("range_download") || joined.includes("media_range")) return 30;
    if (joined.includes("guest_locked_media")) return 25;
    if (joined.includes("print")) return 20;
    if (joined.includes("many_files") || joined.includes("velocity")) return 20;
    if (joined.includes("watch_score_mismatch") || joined.includes("zero_valid_watch")) return 20;
    if (joined.includes("new_account_many_files")) return 20;
    if (joined.includes("repeated_security_events")) return 20;
    if (joined.includes("devtools")) return 15;
    if (joined.includes("rapid_next_prev") || joined.includes("file_cycling")) return 15;
    if (joined.includes("contextmenu") || joined.includes("drag") || joined.includes("select") || joined.includes("copy")) return 12;
    if (joined.includes("repeated_open_close") || joined.includes("many_file_views_no_interaction")) return 10;
    if (joined.includes("repeated_hidden") || joined.includes("repeated_visibility")) return 10;
    if (joined.includes("visibility_hidden") || joined.includes("left_content_visible") || joined.includes("hidden_while_content_visible")) return 3;
    if (joined.includes("screenshot")) return 5;
    return evidence.weight || 5;
}

function recommendedAction(score: number, confidence: ModerationEvidenceConfidence, reasonCodes: string[]) {
    if (score < 10 && reasonCodes.some((code) => code.includes("visibility") || code.includes("screenshot_like"))) {
        return "Do not act on this alone. Monitor for repeats or stronger signals.";
    }
    if (score >= 80 && (confidence === "confirmed" || confidence === "strong")) {
        return "Escalate immediately and consider restriction only through a backed admin action.";
    }
    if (score >= 60) return "Review account, drop, entitlement, and storage evidence before taking action.";
    if (score >= 40) return "Open evidence workspace and look for corroborating server-backed signals.";
    if (score >= 20) return "Watch for repeated signals. Do not take punitive action yet.";
    return "No action from this signal alone.";
}

export function scoreScrapeRisk(input: {
    evidence: ModerationEvidence[];
    validWatchMs?: number;
    normalUnlockAndViewingPace?: boolean;
    userReturnedToViewing?: boolean;
}): ScrapeRiskScore {
    const reasonCodes = new Set<string>();
    const positiveSignals: string[] = [];
    const negativeSignals: string[] = [];
    let score = 0;

    for (const evidence of input.evidence) {
        const reason = evidence.normalizedReason.toLowerCase();
        const weight = weightForEvidence(evidence);
        score += weight;
        positiveSignals.push(`${evidence.humanSummary} (+${weight})`);

        if (reason.includes("blocked") || reason.includes("entitlement") || reason.includes("403") || reason.includes("401")) {
            reasonCodes.add("server_entitlement_or_content_access_violation");
        } else if (reason.includes("signed_url")) {
            reasonCodes.add("signed_url_reuse");
        } else if (reason.includes("velocity") || reason.includes("many_files")) {
            reasonCodes.add("viewer_velocity");
        } else if (reason.includes("watch")) {
            reasonCodes.add("watch_time_mismatch");
        } else if (reason.includes("screenshot") || reason.includes("visibility") || reason.includes("left_content_visible")) {
            reasonCodes.add("unconfirmed_screenshot_like_context");
        } else {
            reasonCodes.add(reason || "uncataloged_signal");
        }
    }

    if ((input.validWatchMs ?? 0) >= 15_000) {
        score -= 10;
        negativeSignals.push("Long valid foreground watch time (-10)");
        reasonCodes.add("normalizing_valid_watch_time");
    }

    if (input.normalUnlockAndViewingPace) {
        score -= 15;
        negativeSignals.push("Normal unlock and viewing pace (-15)");
        reasonCodes.add("normal_unlock_viewing_pace");
    }

    if (input.userReturnedToViewing) {
        score -= 10;
        negativeSignals.push("User returned and continued normal viewing (-10)");
        reasonCodes.add("returned_to_normal_viewing");
    }

    const clampedScore = clampScore(score);
    const confidence = strongestConfidence(input.evidence.map((evidence) => evidence.confidence));
    const tier = riskTier(clampedScore);
    const reasonCodeList = Array.from(reasonCodes);
    const canAutoRestrict = clampedScore >= 80 && (confidence === "confirmed" || confidence === "strong");

    return {
        score: clampedScore,
        tier,
        confidence,
        reasonCodes: reasonCodeList,
        evidenceIds: input.evidence.map((evidence) => evidence.id),
        positiveSignals,
        negativeSignals,
        recommendedAction: recommendedAction(clampedScore, confidence, reasonCodeList),
        canAutoRestrict,
    };
}

export function scoreSingleModerationEvidence(evidence: ModerationEvidence) {
    const score = scoreScrapeRisk({ evidence: [evidence] });
    if (evidence.normalizedReason.includes("visibility") || evidence.normalizedReason.includes("left_content_visible")) {
        return {
            ...score,
            score: Math.min(score.score, 5),
            tier: "low" as const,
            confidence: "heuristic" as const,
            reasonCodes: Array.from(new Set([...score.reasonCodes, "unconfirmed_screenshot_like_context"])),
            recommendedAction: "Do not act on this alone. Monitor for repeats or stronger signals.",
        };
    }
    return score;
}
