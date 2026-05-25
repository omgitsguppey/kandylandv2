import { classifySourceWindowZeroShell } from "@/lib/debug/source-window-zero-shell-classifier";
import type { BehavioralIntelligenceSnapshotTruth } from "@/lib/behavioral/behavioral-intelligence-snapshot-contract";

export function buildBehavioralIntelligenceSnapshotStatus(input: {
  userProfiles: number;
  guestProfiles?: number;
  dropProfiles: number;
  connectedModules: number;
  totalModules?: number;
  rankingMode?: string | null;
  deterministicBaselineStatus?: "available" | "missing";
  mlValidationStatus?: string | null;
  precisionAt5?: number | null;
  calibrationError?: number | null;
  sampleSize: number;
  modelVersion?: string | null;
  latestRebuildAtUtc?: string | null;
  sourceWindowStartUtc?: string | null;
  sourceWindowEndUtc?: string | null;
  freshness?: string | null;
  sourcePath?: string | null;
}): BehavioralIntelligenceSnapshotTruth {
  const rowsLoaded = Math.max(0, input.userProfiles) + Math.max(0, input.guestProfiles ?? 0) + Math.max(0, input.dropProfiles);
  const deterministicBaselineStatus = input.deterministicBaselineStatus ?? "missing";
  const rankingMode = input.rankingMode || "unknown";
  const formulaMissing = deterministicBaselineStatus === "missing" || rankingMode === "unknown" || !input.modelVersion;
  const status = classifySourceWindowZeroShell({
    rowsLoaded,
    sampleCount: input.sampleSize,
    sourceWindowStartUtc: input.sourceWindowStartUtc,
    sourceWindowEndUtc: input.sourceWindowEndUtc,
    generatedAtUtc: input.latestRebuildAtUtc,
    lastRebuildAtUtc: input.latestRebuildAtUtc,
    sourcePath: input.sourcePath,
    sourceExists: Boolean(input.sourcePath),
    sourceReady: Boolean(input.sourcePath),
    formulaState: formulaMissing ? "missing" : "documented",
    freshnessState: input.freshness === "live" ? "live" : input.freshness === "stale" ? "stale" : "unknown",
    nextAction: deterministicBaselineStatus === "missing"
      ? "Restore deterministic baseline status before enabling ML or treating ranking output as loaded."
      : rowsLoaded === 0
        ? "Rebuild behavioral intelligence snapshots or show no-sample/source-missing state."
        : "Keep ML disabled below 50 samples and experimental below 200 samples.",
  });

  return {
    status,
    userProfiles: Math.max(0, input.userProfiles),
    guestProfiles: Math.max(0, input.guestProfiles ?? 0),
    dropProfiles: Math.max(0, input.dropProfiles),
    connectedModules: Math.max(0, input.connectedModules),
    totalModules: Math.max(1, input.totalModules ?? 9),
    rankingMode,
    deterministicBaselineStatus,
    mlValidationStatus: input.mlValidationStatus || "missing",
    precisionAt5: input.precisionAt5 ?? null,
    calibrationError: input.calibrationError ?? null,
    sampleSize: Math.max(0, input.sampleSize),
    modelVersion: input.modelVersion || null,
    latestRebuildAtUtc: input.latestRebuildAtUtc ?? null,
    sourceWindowStartUtc: input.sourceWindowStartUtc ?? null,
    sourceWindowEndUtc: input.sourceWindowEndUtc ?? null,
    freshness: input.freshness || "unknown",
    nextAction: status.nextAction,
  };
}
