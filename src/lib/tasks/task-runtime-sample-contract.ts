import type { SourceWindowZeroShellClassification } from "@/lib/debug/source-window-zero-shell-classifier";

export interface TaskRuntimeSampleContract {
  status: SourceWindowZeroShellClassification;
  sampledUsers: number;
  assignments: number;
  tasksSampled: number;
  aligned: number;
  partial: number;
  mismatch: number;
  customAssigned: number;
  unsupportedRuntime: number;
}
