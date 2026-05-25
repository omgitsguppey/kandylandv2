import type { SourceWindowZeroShellClassification } from "@/lib/debug/source-window-zero-shell-classifier";

export interface TaskTelemetryMappingReconstructionReport {
  status: SourceWindowZeroShellClassification;
  taskTriggerReadyCount: number;
  taskTriggerPartialCount: number;
  taskTriggerMissingCount: number;
  lifecycleEventCount: number;
  supportingTelemetryCount: number;
  sharedEventsNeedingCriteria: number;
  unsupportedRuntimeCount: number;
  catalogEventCount: number;
  aliasScanStatus: "scanned" | "not_scanned";
  contradictions: string[];
  nextAction: string;
}
