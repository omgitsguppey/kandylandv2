import { classifySourceWindowZeroShell } from "@/lib/debug/source-window-zero-shell-classifier";
import type { BehaviorNormalizationInternalsReport } from "@/lib/behavioral/behavior-normalization-internals-contract";

const EMPTY_GAP = { requiredMissing: 0, optionalMissing: 0, backgroundExempt: 0 };

export function buildBehaviorNormalizationInternals(input: {
  normalizedEventCount: number;
  evalEligibleCount: number;
  evalEligibleDenominator: number;
  lowConfidenceRequiredEvents?: number;
  dependencyGaps?: Partial<BehaviorNormalizationInternalsReport["dependencyGaps"]>;
  coverageByDomain?: Array<{ domain: string; eventCount: number; state?: string; explanation?: string }>;
  sourceWindowStartUtc?: string | null;
  sourceWindowEndUtc?: string | null;
  generatedAtUtc?: string | null;
  sourcePath?: string | null;
}): BehaviorNormalizationInternalsReport {
  const normalizedEventCount = Math.max(0, input.normalizedEventCount);
  const evalEligibleDenominator = Math.max(0, input.evalEligibleDenominator);
  const evalEligibleCount = Math.max(0, input.evalEligibleCount);
  const lowConfidenceRequiredEvents = Math.max(0, input.lowConfidenceRequiredEvents ?? 0);
  const formula = "health = 100 - required dependency penalties - unique finding penalties - low confidence required event penalties";
  const status = classifySourceWindowZeroShell({
    rowsLoaded: normalizedEventCount,
    sampleCount: evalEligibleDenominator,
    sourceWindowStartUtc: input.sourceWindowStartUtc,
    sourceWindowEndUtc: input.sourceWindowEndUtc,
    generatedAtUtc: input.generatedAtUtc,
    formulaState: "documented",
    freshnessState: input.generatedAtUtc ? "fresh" : "unknown",
    sourcePath: input.sourcePath,
    sourceExists: Boolean(input.sourcePath),
    sourceReady: Boolean(input.sourcePath),
    nextAction: normalizedEventCount === 0
      ? "Load orchestration event samples before treating zero findings or zero dependency gaps as clean."
      : "Inspect low-confidence required events and dependency gaps before promoting behavior normalization.",
  });
  const missingSourceReasons = status.status === "loaded_with_data" || status.status === "loaded_empty_with_source_window"
    ? []
    : [status.status];

  return {
    status,
    normalizedEventCount,
    evalEligibleCount,
    evalEligibleDenominator,
    excludedBackgroundCount: Math.max(0, normalizedEventCount - evalEligibleDenominator),
    excludedSystemCount: 0,
    excludedIdentityLinkageCount: 0,
    lowConfidenceRequiredEvents,
    dependencyGaps: {
      actor: input.dependencyGaps?.actor ?? EMPTY_GAP,
      session: input.dependencyGaps?.session ?? EMPTY_GAP,
      route: input.dependencyGaps?.route ?? EMPTY_GAP,
      creator: input.dependencyGaps?.creator ?? EMPTY_GAP,
    },
    coverageByDomain: (input.coverageByDomain?.length ? input.coverageByDomain : [{ domain: "all", eventCount: 0 }]).map((entry) => ({
      domain: entry.domain,
      eventCount: Math.max(0, entry.eventCount),
      status: entry.eventCount > 0 ? (entry.state === "error" ? "error" : entry.state === "review" ? "review" : "live") : status.status,
      explanation: entry.explanation || (entry.eventCount > 0
        ? "Domain sample loaded."
        : "No domain rows are available; source status determines whether this is a real zero."),
    })),
    healthMath: {
      formula,
      numerator: evalEligibleCount,
      denominator: evalEligibleDenominator,
      confidence: evalEligibleDenominator > 0 ? Math.round((evalEligibleCount / evalEligibleDenominator) * 100) : null,
      missingSourceReasons,
    },
  };
}
