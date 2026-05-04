import type { TheftRiskEvidence, TheftRiskEvidenceConfidence } from "@/lib/moderation/theft-risk-evidence";

export type TheftRiskTier = "low" | "watch" | "review" | "high" | "critical";

export type TheftRiskScore = {
    score: number;
    tier: TheftRiskTier;
    confidence: TheftRiskEvidenceConfidence;
    reasonCodes: string[];
    evidenceIds: string[];
    positiveSignals: string[];
    negativeSignals: string[];
    observedSummary: string;
    recommendedAction: string;
    canAutoRestrict: boolean;
};

const CONFIDENCE_RANK: Record<TheftRiskEvidenceConfidence, number> = {
    unknown: 0,
    heuristic: 1,
    strong: 2,
    confirmed: 3,
};

function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function riskTier(score: number): TheftRiskTier {
    if (score >= 80) return "critical";
    if (score >= 60) return "high";
    if (score >= 40) return "review";
    if (score >= 20) return "watch";
    return "low";
}

function strongestConfidence(values: TheftRiskEvidenceConfidence[]): TheftRiskEvidenceConfidence {
    return [...values].sort((left, right) => CONFIDENCE_RANK[right] - CONFIDENCE_RANK[left])[0] ?? "unknown";
}

function repeatCountForEvidence(evidence: TheftRiskEvidence) {
    const value = evidence.safeDetails.repeatCount;
    return typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.trunc(value)) : 1;
}

function joinedSignalText(evidence: TheftRiskEvidence) {
    return `${evidence.normalizedReason.toLowerCase()} ${evidence.eventType.toLowerCase()} ${String(evidence.safeDetails.detectionKind ?? "").toLowerCase()}`;
}

function isWeakSignal(joined: string) {
    return (
        joined.includes("visibility_hidden")
        || joined.includes("left_content_visible")
        || joined.includes("pagehide")
        || joined.includes("blur")
        || joined.includes("screenshot")
        || joined.includes("context_menu")
        || joined.includes("contextmenu")
        || joined.includes("drag")
        || joined.includes("select")
        || joined.includes("copy")
        || joined.includes("print")
    );
}

function isBehavioralSignal(joined: string) {
    return (
        joined.includes("many_files")
        || joined.includes("velocity")
        || joined.includes("watch")
        || joined.includes("rapid_next_prev")
        || joined.includes("file_cycling")
        || joined.includes("repeated_open_close")
    );
}

function isStrongServerSignal(joined: string, evidence: TheftRiskEvidence) {
    return (
        evidence.source === "server"
        || evidence.source === "entitlement"
        || evidence.source === "storage"
        || joined.includes("blocked_content_url")
        || joined.includes("entitlement")
        || joined.includes("repeated_403")
        || joined.includes("repeated_401")
        || joined.includes("without_viewer_session")
        || joined.includes("signed_url_reuse")
        || joined.includes("direct_asset_request")
        || joined.includes("rapid_sequential_media")
    );
}

function weightForEvidence(evidence: TheftRiskEvidence) {
    const joined = joinedSignalText(evidence);
    const repeats = repeatCountForEvidence(evidence);

    if (joined.includes("blocked_content_url") || joined.includes("blocked_asset_access") || joined.includes("entitlement_denied")) return 45;
    if (joined.includes("signed_url_reuse") || joined.includes("same_asset_multiple_accounts")) return 40;
    if (joined.includes("rapid_sequential_media") || joined.includes("direct_asset_request") || joined.includes("without_viewer_session")) return 35;
    if (joined.includes("repeated_403") || joined.includes("repeated_401") || joined.includes("missing_viewer_token")) return 30;
    if (joined.includes("many_files") || joined.includes("velocity")) return Math.min(35, 15 + Math.max(0, repeats - 1) * 5);
    if (joined.includes("watch_score_mismatch") || joined.includes("zero_valid_watch")) return 20;
    if (joined.includes("rapid_next_prev") || joined.includes("file_cycling")) return 15;
    if (joined.includes("repeated_open_close")) return 10;
    if (joined.includes("visibility_hidden") || joined.includes("left_content_visible") || joined.includes("hidden_while_content_visible") || joined.includes("pagehide")) {
        return repeats <= 1 ? 3 : Math.min(10, 3 + (repeats - 1) * 3);
    }
    if (joined.includes("context_menu") || joined.includes("contextmenu") || joined.includes("drag") || joined.includes("select") || joined.includes("copy")) {
        return Math.min(20, 12 + Math.max(0, repeats - 1) * 4);
    }
    if (joined.includes("print")) return Math.min(20, 20 + Math.max(0, repeats - 1) * 2);
    if (joined.includes("screenshot") || joined.includes("screen_record") || joined.includes("capture_pattern")) {
        return repeats <= 1 ? 3 : Math.min(10, 3 + (repeats - 1) * 3);
    }
    return evidence.weight || 5;
}

function reasonCodeForEvidence(evidence: TheftRiskEvidence) {
    const joined = joinedSignalText(evidence);

    if (joined.includes("blocked_content_url") || joined.includes("blocked_asset_access") || joined.includes("entitlement_denied") || joined.includes("repeated_403") || joined.includes("repeated_401")) {
        return "server_entitlement_or_content_access_violation";
    }
    if (joined.includes("signed_url_reuse")) return "signed_url_reuse";
    if (joined.includes("without_viewer_session") || joined.includes("direct_asset_request")) return "direct_asset_access_without_viewer_session";
    if (joined.includes("rapid_sequential_media")) return "abnormal_asset_request_velocity";
    if (joined.includes("many_files") || joined.includes("velocity") || joined.includes("rapid_next_prev") || joined.includes("file_cycling")) return "suspicious_viewer_velocity";
    if (joined.includes("watch_score_mismatch") || joined.includes("zero_valid_watch")) return "watch_time_mismatch";
    if (joined.includes("repeated_open_close")) return "repeated_open_close_pattern";
    if (joined.includes("screenshot") || joined.includes("screen_record") || joined.includes("capture_pattern") || joined.includes("visibility_hidden") || joined.includes("left_content_visible") || joined.includes("pagehide") || joined.includes("blur")) {
        return "possible_capture_theft_pattern";
    }
    if (joined.includes("contextmenu") || joined.includes("context_menu") || joined.includes("drag") || joined.includes("select") || joined.includes("copy") || joined.includes("print")) {
        return "client_extraction_attempt";
    }
    return evidence.normalizedReason || "uncataloged_signal";
}

function positiveSignalLabel(evidence: TheftRiskEvidence, weight: number) {
    return `${evidence.humanSummary} (+${weight})`;
}

function observedSummary(input: {
    reasonCodes: string[];
    evidence: TheftRiskEvidence[];
    confidence: TheftRiskEvidenceConfidence;
}) {
    if (input.reasonCodes.includes("server_entitlement_or_content_access_violation")) {
        return "Blocked media access or entitlement violations were recorded from server-backed evidence.";
    }
    if (input.reasonCodes.includes("signed_url_reuse")) {
        return "The same protected media URL appears to have been reused across sessions or identities.";
    }
    if (input.reasonCodes.includes("direct_asset_access_without_viewer_session")) {
        return "Protected asset requests were recorded without a valid viewer session.";
    }
    if (input.reasonCodes.includes("abnormal_asset_request_velocity")) {
        return "Asset request velocity exceeded normal in-viewer pacing.";
    }
    if (input.reasonCodes.includes("watch_time_mismatch")) {
        return "Many file views were recorded with near-zero valid watch time.";
    }
    if (input.reasonCodes.includes("possible_capture_theft_pattern")) {
        return input.confidence === "confirmed" || input.confidence === "strong"
            ? "A possible capture/theft pattern was recorded alongside stronger evidence."
            : "A possible capture/theft pattern was observed from viewer heuristics only.";
    }
    return input.evidence[0]?.humanSummary || "Moderation evidence was recorded.";
}

function recommendedAction(input: {
    score: number;
    confidence: TheftRiskEvidenceConfidence;
    reasonCodes: string[];
    hasStrongServerEvidence: boolean;
    hasRepeatedSuspiciousEvents: boolean;
}) {
    if (input.reasonCodes.includes("possible_capture_theft_pattern") && !input.hasStrongServerEvidence && input.score < 10) {
        return "Do not act on this alone. Monitor for repeats or stronger signals.";
    }
    if (input.score >= 80 && (input.confidence === "confirmed" || input.confidence === "strong")) {
        return "Escalate immediately. Restriction is only appropriate through a backed admin action.";
    }
    if (input.score >= 60) {
        return input.hasStrongServerEvidence
            ? "Review entitlement, storage, and viewer evidence together before taking action."
            : "Review the pattern manually before taking action. Weak signals alone are not enough.";
    }
    if (input.score >= 40) return "Open the evidence workspace and look for corroborating server-backed signals.";
    if (input.score >= 20) return "Watch for repeated suspicious behavior before acting.";
    return "No action from this signal alone.";
}

export function scoreTheftRisk(input: {
    evidence: TheftRiskEvidence[];
    validWatchMs?: number;
    normalViewingPace?: boolean;
    userReturnedToViewing?: boolean;
    oneOffMobileSafariBlur?: boolean;
}): TheftRiskScore {
    const reasonCodes = new Set<string>();
    const positiveSignals: string[] = [];
    const negativeSignals: string[] = [];
    let score = 0;
    let hasWeakOnlySignals = input.evidence.length > 0;
    let hasStrongServerEvidence = false;
    let hasBehavioralEvidence = false;
    let suspiciousRepeatCount = 0;

    for (const evidence of input.evidence) {
        const joined = joinedSignalText(evidence);
        const weight = weightForEvidence(evidence);
        score += weight;
        positiveSignals.push(positiveSignalLabel(evidence, weight));
        reasonCodes.add(reasonCodeForEvidence(evidence));
        hasWeakOnlySignals &&= isWeakSignal(joined);
        hasStrongServerEvidence ||= isStrongServerSignal(joined, evidence);
        hasBehavioralEvidence ||= isBehavioralSignal(joined);
        suspiciousRepeatCount += Math.max(1, repeatCountForEvidence(evidence));
    }

    if ((input.validWatchMs ?? 0) >= 15_000) {
        score -= 10;
        negativeSignals.push("Long valid foreground watch time (-10)");
        reasonCodes.add("normalizing_valid_watch_time");
    }

    if (input.normalViewingPace) {
        score -= 15;
        negativeSignals.push("Normal viewing pace after unlock (-15)");
        reasonCodes.add("normal_viewing_pace");
    }

    if (input.oneOffMobileSafariBlur) {
        score -= 20;
        negativeSignals.push("One-off mobile Safari blur or toolbar transition (-20)");
        reasonCodes.add("mobile_safari_blur_normalizer");
    }

    if (input.userReturnedToViewing) {
        score -= 10;
        negativeSignals.push("User returned and continued normal viewing (-10)");
        reasonCodes.add("returned_to_normal_viewing");
    }

    const hasRepeatedSuspiciousEvents = suspiciousRepeatCount >= 2;
    let clampedScore = clampScore(score);

    if (hasWeakOnlySignals) {
        clampedScore = Math.min(clampedScore, 39);
    }

    if (!hasStrongServerEvidence && !hasRepeatedSuspiciousEvents && clampedScore >= 60) {
        clampedScore = 59;
    }

    const confidence = strongestConfidence(input.evidence.map((evidence) => evidence.confidence));
    const reasonCodeList = Array.from(reasonCodes);
    const canAutoRestrict = clampedScore >= 80
        && (confidence === "confirmed" || confidence === "strong")
        && (hasStrongServerEvidence || hasRepeatedSuspiciousEvents);

    return {
        score: clampedScore,
        tier: riskTier(clampedScore),
        confidence,
        reasonCodes: reasonCodeList,
        evidenceIds: input.evidence.map((evidence) => evidence.id),
        positiveSignals,
        negativeSignals,
        observedSummary: observedSummary({ reasonCodes: reasonCodeList, evidence: input.evidence, confidence }),
        recommendedAction: recommendedAction({
            score: clampedScore,
            confidence,
            reasonCodes: reasonCodeList,
            hasStrongServerEvidence,
            hasRepeatedSuspiciousEvents,
        }),
        canAutoRestrict,
    };
}

export function scoreSingleTheftRiskEvidence(evidence: TheftRiskEvidence) {
    const score = scoreTheftRisk({ evidence: [evidence] });
    if (reasonCodeForEvidence(evidence) === "possible_capture_theft_pattern") {
        return {
            ...score,
            score: Math.min(score.score, 5),
            tier: "low" as const,
            confidence: score.confidence === "unknown" ? "heuristic" as const : score.confidence,
            reasonCodes: Array.from(new Set([...score.reasonCodes, "possible_capture_theft_pattern", "unconfirmed_screenshot_like_context"])),
            observedSummary: "A possible capture/theft pattern was observed from viewer heuristics only.",
            recommendedAction: "Do not act on this alone. Monitor for repeats or stronger signals.",
        };
    }
    return score;
}
