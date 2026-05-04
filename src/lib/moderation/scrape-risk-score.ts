export type {
    TheftRiskTier as ScrapeRiskTier,
    TheftRiskScore as ScrapeRiskScore,
} from "@/lib/moderation/theft-risk-score";

import {
    scoreSingleTheftRiskEvidence,
    scoreTheftRisk,
    type TheftRiskScore,
} from "@/lib/moderation/theft-risk-score";
import type { TheftRiskEvidence } from "@/lib/moderation/theft-risk-evidence";

export { scoreSingleTheftRiskEvidence as scoreSingleModerationEvidence };

export function scoreScrapeRisk(input: {
    evidence: TheftRiskEvidence[];
    validWatchMs?: number;
    normalUnlockAndViewingPace?: boolean;
    normalViewingPace?: boolean;
    userReturnedToViewing?: boolean;
    oneOffMobileSafariBlur?: boolean;
}): TheftRiskScore {
    return scoreTheftRisk({
        evidence: input.evidence,
        validWatchMs: input.validWatchMs,
        normalViewingPace: input.normalViewingPace ?? input.normalUnlockAndViewingPace,
        userReturnedToViewing: input.userReturnedToViewing,
        oneOffMobileSafariBlur: input.oneOffMobileSafariBlur,
    });
}
