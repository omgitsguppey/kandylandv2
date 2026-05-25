import type { SourceWindowZeroShellClassification } from "@/lib/debug/source-window-zero-shell-classifier";

export interface BehaviorNormalizationDependencyGap {
  requiredMissing: number;
  optionalMissing: number;
  backgroundExempt: number;
}

export interface BehaviorNormalizationInternalsReport {
  status: SourceWindowZeroShellClassification;
  normalizedEventCount: number;
  evalEligibleCount: number;
  evalEligibleDenominator: number;
  excludedBackgroundCount: number;
  excludedSystemCount: number;
  excludedIdentityLinkageCount: number;
  lowConfidenceRequiredEvents: number;
  dependencyGaps: {
    actor: BehaviorNormalizationDependencyGap;
    session: BehaviorNormalizationDependencyGap;
    route: BehaviorNormalizationDependencyGap;
    creator: BehaviorNormalizationDependencyGap;
  };
  coverageByDomain: Array<{
    domain: string;
    eventCount: number;
    status: SourceWindowZeroShellClassification["status"] | "live" | "review" | "error";
    explanation: string;
  }>;
  healthMath: {
    formula: string;
    numerator: number;
    denominator: number;
    confidence: number | null;
    missingSourceReasons: string[];
  };
}
