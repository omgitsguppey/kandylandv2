import type { SourceWindowZeroShellClassification } from "@/lib/debug/source-window-zero-shell-classifier";

export interface TaskCatalogRuntimeReconstructionReport {
  status: SourceWindowZeroShellClassification;
  builtInCount: number;
  readyCount: number;
  partialCount: number;
  unsupportedCount: number;
  rewardRiskCount: number;
  trackingGapCount: number;
  completionGapCount: number;
  sourceMix: {
    canonical: number;
    telemetry: number;
    legacy: number;
  };
  rewardVersion: number | null;
  multiplierPct: number | null;
  builtInAvgGd: number | null;
  legacyCustomCount: number;
  sampleWindow: {
    startUtc: string | null;
    endUtc: string | null;
  };
  generatedAtUtc: string | null;
  nextAction: string;
}
