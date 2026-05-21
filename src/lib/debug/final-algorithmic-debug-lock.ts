export type FinalAlgorithmicDebugStatus = "pass" | "warning" | "request_changes" | "missing" | "blocked" | "unknown";

export interface FinalAlgorithmicDebugDependencies {
  debugBacklog: boolean;
  aiCritic: boolean;
  behaviorMath: boolean;
  legacyNormalization: boolean;
  orphanMetrics: boolean;
  realUsageConfidence: boolean;
  recoveryPlaybooks: boolean;
  refreshQueue: boolean;
  operatorCockpit: boolean;
}

export interface FinalAlgorithmicDebugLockInput {
  scoreBefore: number;
  scoreAfter: number;
  debugBacklogStatus: FinalAlgorithmicDebugStatus;
  aiCriticStatus: FinalAlgorithmicDebugStatus;
  behaviorMathStatus: FinalAlgorithmicDebugStatus;
  legacyNormalizationStatus: FinalAlgorithmicDebugStatus;
  orphanMetricStatus: FinalAlgorithmicDebugStatus;
  realUsageConfidenceStatus: FinalAlgorithmicDebugStatus;
  recoveryPlaybookStatus: FinalAlgorithmicDebugStatus;
  refreshQueueStatus: FinalAlgorithmicDebugStatus;
  operatorCockpitStatus: FinalAlgorithmicDebugStatus;
  manualBottleneckReduction: string;
  remainingFormalEvidenceGates: string[];
  remainingScoreDrag: string[];
  p0Count: number;
  p1Count: number;
  p2Count: number;
  nextExactSteps: string[];
  dependencies: FinalAlgorithmicDebugDependencies;
}

export interface FinalAlgorithmicDebugLockReport extends FinalAlgorithmicDebugLockInput {
  generatedAtUtc: string;
  reportKey: "final-algorithmic-debug-lock";
  currentHead: string;
  sourceCommit: string;
  overallStatus: "locked_with_formal_gates_remaining" | "blocked";
  algorithmicDebugStatus: "locked" | "blocked";
  validationFailures: string[];
}

const REQUIRED_DEPENDENCIES: Array<keyof FinalAlgorithmicDebugDependencies> = [
  "debugBacklog",
  "aiCritic",
  "behaviorMath",
  "legacyNormalization",
  "orphanMetrics",
  "realUsageConfidence",
  "recoveryPlaybooks",
  "refreshQueue",
  "operatorCockpit",
];

const FORMAL_GATE_PATTERN = /visual|manual|runtime|provider|admin truth|sample evidence|smoke/i;

function hasMissingStatus(report: FinalAlgorithmicDebugLockReport) {
  return [
    report.debugBacklogStatus,
    report.aiCriticStatus,
    report.behaviorMathStatus,
    report.legacyNormalizationStatus,
    report.orphanMetricStatus,
    report.realUsageConfidenceStatus,
    report.recoveryPlaybookStatus,
    report.refreshQueueStatus,
    report.operatorCockpitStatus,
  ].some((status) => status === "missing" || status === "unknown" || status === "blocked");
}

export function buildFinalAlgorithmicDebugLock(
  input: FinalAlgorithmicDebugLockInput,
  options: { generatedAtUtc?: string; currentHead?: string } = {},
): FinalAlgorithmicDebugLockReport {
  const generatedAtUtc = options.generatedAtUtc ?? new Date().toISOString();
  const currentHead = options.currentHead ?? "unknown";
  const draft: FinalAlgorithmicDebugLockReport = {
    ...input,
    generatedAtUtc,
    reportKey: "final-algorithmic-debug-lock",
    currentHead,
    sourceCommit: currentHead,
    overallStatus: "locked_with_formal_gates_remaining",
    algorithmicDebugStatus: "locked",
    validationFailures: [],
  };
  const validationFailures = validateFinalAlgorithmicDebugLock(draft);
  return {
    ...draft,
    overallStatus: validationFailures.length ? "blocked" : "locked_with_formal_gates_remaining",
    algorithmicDebugStatus: validationFailures.length ? "blocked" : "locked",
    validationFailures,
  };
}

export function validateFinalAlgorithmicDebugLock(report: FinalAlgorithmicDebugLockReport): string[] {
  const failures: string[] = [];
  const missingDependencies = REQUIRED_DEPENDENCIES.filter((key) => !report.dependencies[key]);

  if (missingDependencies.length > 0) {
    failures.push(`phase missing without dependency status: ${missingDependencies.join(", ")}`);
  }
  if (report.debugBacklogStatus === "missing") failures.push("debug panel cannot produce score-impact backlog.");
  if (report.aiCriticStatus === "missing") failures.push("AI critic absent.");
  if (report.behaviorMathStatus === "missing" || report.behaviorMathStatus === "unknown") failures.push("behavior math unknown.");
  if (report.refreshQueueStatus === "missing") failures.push("stale refresh queue absent.");
  if (report.orphanMetricStatus === "missing") failures.push("orphan metrics untracked.");
  if (report.remainingFormalEvidenceGates.length === 0 && report.scoreAfter < 80) {
    failures.push("manual evidence still required but not listed honestly.");
  }
  if (!report.remainingFormalEvidenceGates.some((gate) => FORMAL_GATE_PATTERN.test(gate))) {
    failures.push("formal gates falsely cleared.");
  }
  if (hasMissingStatus(report)) {
    failures.push("one or more algorithmic debug phases are missing, unknown, or blocked.");
  }
  if (report.nextExactSteps.length === 0) failures.push("next exact steps missing.");
  if (!/manual testing is no longer the default bottleneck/i.test(report.manualBottleneckReduction)) {
    failures.push("manual bottleneck reduction is not stated.");
  }

  return failures;
}
