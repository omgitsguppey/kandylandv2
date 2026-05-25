import type { SourceWindowZeroShellClassification } from "@/lib/debug/source-window-zero-shell-classifier";

export interface BehavioralIntelligenceSnapshotTruth {
  status: SourceWindowZeroShellClassification;
  userProfiles: number;
  guestProfiles: number;
  dropProfiles: number;
  connectedModules: number;
  totalModules: number;
  rankingMode: string;
  deterministicBaselineStatus: "available" | "missing";
  mlValidationStatus: string;
  precisionAt5: number | null;
  calibrationError: number | null;
  sampleSize: number;
  modelVersion: string | null;
  latestRebuildAtUtc: string | null;
  sourceWindowStartUtc: string | null;
  sourceWindowEndUtc: string | null;
  freshness: string;
  nextAction: string;
}
