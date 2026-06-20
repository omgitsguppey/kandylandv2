import {execFileSync, spawn} from "node:child_process"
import {existsSync, readFileSync} from "node:fs"
import path from "node:path"

import {
  CANONICAL_FACT_IMPORT_TARGETS,
  FORBIDDEN_RUNTIME_MUTATION_SURFACES,
} from "../src/lib/analytics/import-export-truth-policy"
import {
  buildLaunchHistoryDisplaySummaryState,
  RECOVERED_METRIC_METADATA_PROOF_BOUNDARY,
  RECOVERY_METRIC_DEDUPE_RULES,
  RECOVERY_METRIC_MODELING_POLICY,
  RECOVERY_METRIC_POLICY_PROOF_BOUNDARY,
  RECOVERY_METRIC_PRODUCT_TRUTH_POLICY,
  summarizeLaunchActiveSourceFamilyStates,
  summarizeLaunchRecoveryDayEvidence,
  summarizeLaunchRecoveryFamilySourceStates,
  summarizeRecoveredMetricMetadataCompleteness,
} from "../src/lib/analytics/recovery-timeline-spine"
import {
  LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY,
  launchCoverageInputEvidenceNextAction,
  summarizeLaunchCoverageInputEvidence,
} from "../src/lib/analytics/source-agreement-detail"
import {
  classifyGeneratedArtifactFromGit,
  isGeneratedArtifactCurrent,
} from "../src/lib/agent-score/generated-artifact-version-policy"

const ANALYTICS_TRUTH_REBUILD_MAX_ROWS = 12000
const ANALYTICS_TRUTH_REBUILD_MAX_RUNTIME_MS = 10 * 60 * 1000
const ANALYTICS_TRUTH_REBUILD_MAX_RETRIES = 0
const LAUNCH_RECOVERY_REPORT_PATH = "agent/state/launch-analytics-recovery.generated.json"
const LAUNCH_RECOVERY_OWNED_SOURCE_PATHS = [
  "scripts/agent/validate-analytics-panel-hydration.ts",
  "scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared.ts",
  "src/lib/analytics/source-agreement-detail.ts",
  "src/lib/server/admin-analytics-historical-validation.ts",
  "src/lib/admin-analytics/panel-hydration-resolver.ts",
  "src/app/api/admin/analytics/historical/route.ts",
  "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
]

function hasFlag(flag: string) {
  return process.argv.slice(2).includes(flag)
}

function npmRunArgs(scriptName: string) {
  const npmExecPath = process.env.npm_execpath
  if (npmExecPath) {
    return {
      command: process.execPath,
      args: [npmExecPath, "run", scriptName],
    }
  }

  return {
    command: process.platform === "win32" ? "npm.cmd" : "npm",
    args: ["run", scriptName],
  }
}

function runFunctionsCommand(scriptName: string) {
  return new Promise<void>((resolve, reject) => {
    const npmCommand = npmRunArgs(scriptName)
    const child = spawn(
      npmCommand.command,
      npmCommand.args,
      {
        cwd: path.resolve(process.cwd(), "functions"),
        stdio: "inherit",
        env: {
          ...process.env,
          KD_REBUILD_MAX_ROWS: String(ANALYTICS_TRUTH_REBUILD_MAX_ROWS),
          KD_REBUILD_MAX_RUNTIME_MS: String(ANALYTICS_TRUTH_REBUILD_MAX_RUNTIME_MS),
          KD_REBUILD_MAX_RETRIES: String(ANALYTICS_TRUTH_REBUILD_MAX_RETRIES),
          KD_ANALYTICS_IMPORT_SCHEMA_VALIDATION_REQUIRED: "true",
          KD_ANALYTICS_IMPORT_DRY_RUN_REQUIRED: "true",
          KD_ANALYTICS_IMPORT_RUNTIME_MUTATION_BLOCKED: "true",
        },
      },
    )
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`functions ${scriptName} exceeded maxRuntimeMs=${ANALYTICS_TRUTH_REBUILD_MAX_RUNTIME_MS}`))
    }, ANALYTICS_TRUTH_REBUILD_MAX_RUNTIME_MS)

    child.on("error", reject)
    child.on("close", (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`functions ${scriptName} exited with code ${code ?? "unknown"}`))
    })
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function readRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((entry) => asRecord(entry)).filter((entry) => Object.keys(entry).length > 0)
    : []
}

function readCurrentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {cwd: process.cwd(), encoding: "utf8"}).trim()
  } catch {
    return "unknown"
  }
}

function launchRecoveryEvidenceFreshness(status: string) {
  if (status === "current_head") return "current"
  if (status === "same_commit_snapshot") return "same_commit_snapshot"
  if (status === "current_by_impact") return "current_by_impact"
  return "stale_generated_snapshot"
}

function summarizeCurrentLaunchRecoveryMetadata(
  artifactCurrent: boolean,
  records: readonly Record<string, unknown>[],
) {
  if (artifactCurrent) {
    return {
      ...summarizeRecoveredMetricMetadataCompleteness(records),
      evaluated: true,
    }
  }

  return {
    ...summarizeRecoveredMetricMetadataCompleteness([]),
    status: "not_evaluated_stale_artifact",
    rowCount: records.length,
    completeRowCount: 0,
    evaluated: false,
    evidenceFreshness: "stale_generated_snapshot",
    refreshCommand: "npm run check:analytics-panel-hydration",
    reason: "Launch recovery metadata completeness was not scored because the generated artifact is stale relative to the current source head.",
  }
}

function readLaunchRecoveryDryRunSummary() {
  const artifactPath = path.resolve(process.cwd(), LAUNCH_RECOVERY_REPORT_PATH)
  if (!existsSync(artifactPath)) {
    return {
      artifactPath: LAUNCH_RECOVERY_REPORT_PATH,
      status: "launch_recovery_artifact_missing",
      readPerformed: false,
      mutationAllowed: false,
      sourceTruthPolicy: LAUNCH_ANALYTICS_SOURCE_TRUTH_POLICY,
      nextAction: "Run npm run check:analytics-panel-hydration to generate launch recovery evidence before importing analytics truth.",
    }
  }

  try {
    const report = asRecord(JSON.parse(readFileSync(artifactPath, "utf8")))
    const artifactHead = readString(report.currentHead, "unknown")
    const currentCodeHead = readCurrentHead()
    const artifactVersion = classifyGeneratedArtifactFromGit({
      cwd: process.cwd(),
      artifactPath: LAUNCH_RECOVERY_REPORT_PATH,
      artifactHead: artifactHead === "unknown" ? undefined : artifactHead,
      ownedSourcePaths: LAUNCH_RECOVERY_OWNED_SOURCE_PATHS,
    })
    const artifactCurrent = isGeneratedArtifactCurrent(artifactVersion)
    const evidenceProvenance = asRecord(report.evidenceProvenance)
    const rangeProof = asRecord(asRecord(report.launchHistoryCoverage).rangeProof)
    const firstPartyCoverage = asRecord(asRecord(report.launchHistoryCoverage).firstPartyCoverage)
    const eventFamilyCoverage = asRecord(asRecord(report.launchHistoryCoverage).eventFamilyCoverage)
    const launchHistoryCoverage = asRecord(report.launchHistoryCoverage)
    const eventFamilySourceStates = readRecordArray(eventFamilyCoverage.familySourceStates)
    const activeSourceCoverage = asRecord(launchHistoryCoverage.activeSourceCoverage)
    const activeSourceFamilyStates = readRecordArray(activeSourceCoverage.familySourceStates)
    const holdbackValidation = asRecord(eventFamilyCoverage.holdbackValidation)
    const formalLaunchRange = asRecord(report.formalLaunchRange)
    const formalDayCoverage = readRecordArray(formalLaunchRange.dayCoverage)
    const localEvidenceDays = readRecordArray(launchHistoryCoverage.days)
    const sourceAgreement = asRecord(report.sourceAgreement)
    const sourceAgreementDisagreements = readRecordArray(sourceAgreement.disagreements)
    const sourceAgreementMetricDeltas = readRecordArray(sourceAgreement.perDayMetricDeltas)
    const displaySummary = buildLaunchHistoryDisplaySummaryState({
      launchHistoryCoverage,
      sourceAgreementState: readString(sourceAgreement.state, "unknown"),
    })
    const sourceTruthPolicy = Object.keys(asRecord(report.sourceTruthPolicy)).length > 0
      ? asRecord(report.sourceTruthPolicy)
      : asRecord(sourceAgreement.sourceTruthPolicy)
    const recoveryPolicy = asRecord(report.recoveryPolicy)
    const recoveryDedupeRules = Object.keys(asRecord(recoveryPolicy.dedupeRules)).length > 0
      ? asRecord(recoveryPolicy.dedupeRules)
      : RECOVERY_METRIC_DEDUPE_RULES
    const recoveryProductTruthPolicy = Object.keys(asRecord(recoveryPolicy.productTruthPolicy)).length > 0
      ? asRecord(recoveryPolicy.productTruthPolicy)
      : RECOVERY_METRIC_PRODUCT_TRUTH_POLICY
    const recoveryModelingPolicy = Object.keys(asRecord(recoveryPolicy.modelingPolicy)).length > 0
      ? asRecord(recoveryPolicy.modelingPolicy)
      : RECOVERY_METRIC_MODELING_POLICY
    const launchCoverageInputs = summarizeLaunchCoverageInputEvidence(evidenceProvenance)
    const reportNextAction = readString(
      report.nextAction,
      readString(sourceAgreement.nextAction, "Review launch analytics recovery evidence before importing analytics truth."),
    )
    const nextAction = launchCoverageInputEvidenceNextAction(launchCoverageInputs) ?? reportNextAction
    return {
      artifactPath: LAUNCH_RECOVERY_REPORT_PATH,
      status: readString(report.status, "unknown"),
      currentHead: artifactHead,
      currentCodeHead,
      artifactCurrent,
      artifactVersionStatus: artifactVersion.status,
      artifactVersionReason: artifactVersion.reason,
      evidenceFreshness: launchRecoveryEvidenceFreshness(artifactVersion.status),
      staleArtifactReason: artifactCurrent
        ? null
        : artifactVersion.reason,
      refreshCommand: "npm run check:analytics-panel-hydration",
      evidenceClass: readString(report.evidenceClass, "generated_snapshot"),
      canClearSourceGate: readBoolean(report.canClearSourceGate, false),
      canClearRuntimeGate: readBoolean(report.canClearRuntimeGate, false),
      canClearProviderGate: readBoolean(report.canClearProviderGate, false),
      canClearAdminTruthGate: readBoolean(report.canClearAdminTruthGate, false),
      sourceGateReason: readString(report.sourceGateReason, "Launch recovery source gate status was not explained."),
      rangeProof: {
        expectedRangeSource: readString(rangeProof.expectedRangeSource, "unknown"),
        coverageWindowKind: readString(rangeProof.coverageWindowKind, "unknown"),
        allLaunchRangeProven: readBoolean(rangeProof.allLaunchRangeProven, false),
        formalRangeStartDayKey: readString(rangeProof.formalRangeStartDayKey, readString(formalLaunchRange.launchStartDayKey, "unknown")),
        formalRangeEndDayKey: readString(rangeProof.formalRangeEndDayKey, readString(formalLaunchRange.expectedThroughDayKey, "unknown")),
        formalExpectedDayCount: readNumber(rangeProof.formalExpectedDayCount, readNumber(formalLaunchRange.expectedDayCount, 0)),
        evidenceDayCount: readNumber(rangeProof.evidenceDayCount, readNumber(formalLaunchRange.localEvidenceDayCount, 0)),
        unprovenRanges: Array.isArray(rangeProof.unprovenRanges)
          ? rangeProof.unprovenRanges.filter((entry): entry is string => typeof entry === "string").slice(0, 5)
          : Array.isArray(formalLaunchRange.unprovenRanges)
            ? formalLaunchRange.unprovenRanges.filter((entry): entry is string => typeof entry === "string").slice(0, 5)
            : [],
        reason: readString(rangeProof.reason, "No range proof reason was supplied."),
      },
      formalLaunchRange: {
        state: readString(formalLaunchRange.state, "unknown"),
        launchStartDayKey: readString(formalLaunchRange.launchStartDayKey, "unknown"),
        expectedThroughDayKey: readString(formalLaunchRange.expectedThroughDayKey, "unknown"),
        expectedDayCount: readNumber(formalLaunchRange.expectedDayCount, 0),
        localEvidenceDayCount: readNumber(formalLaunchRange.localEvidenceDayCount, 0),
        approvedCoverageDayCount: readNumber(formalLaunchRange.approvedCoverageDayCount, 0),
        unprovenRanges: Array.isArray(formalLaunchRange.unprovenRanges)
          ? formalLaunchRange.unprovenRanges.filter((entry): entry is string => typeof entry === "string").slice(0, 5)
          : [],
        reason: readString(formalLaunchRange.reason, "Formal all-launch range proof was not supplied."),
      },
      launchCoverageInputs,
      firstPartyCoverage: {
        state: readString(firstPartyCoverage.state, "unknown"),
        canPromoteProductTruth: readBoolean(firstPartyCoverage.canPromoteProductTruth, false),
        missingRanges: Array.isArray(firstPartyCoverage.missingRanges) ? firstPartyCoverage.missingRanges.slice(0, 5) : [],
        reason: readString(firstPartyCoverage.reason, "No first-party coverage reason was supplied."),
      },
      displaySummary: {
        sourceLabel: displaySummary.sourceLabel,
        confidenceLabel: displaySummary.confidenceLabel,
        coverageLabel: displaySummary.coverageLabel,
        sourceWindowLabel: displaySummary.sourceWindowLabel,
        coverageDenominatorKind: displaySummary.coverageDenominatorKind ?? "unknown",
        missingRangeCount: displaySummary.missingRangeCount,
        sourceAgreementState: displaySummary.sourceAgreementState,
        sourceRoleCounts: Object.fromEntries(
          Object.entries(displaySummary.sourceRoleCounts ?? {})
            .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
            .slice(0, 8),
        ),
        mathReasonSamples: (displaySummary.mathReasonSamples ?? [])
          .slice(0, 4)
          .map((entry) => ({
            familyId: readString(entry.familyId, "unknown"),
            sourceRole: readString(entry.sourceRole, "missing_source"),
            mathReason: readString(entry.mathReason, "Missing first-party launch source evidence; do not render this family as zero."),
            nextAction: readString(entry.nextAction, "Repair this launch-critical family before promoting recovered launch charts."),
          })),
      },
      eventFamilyCoverage: {
        canonicalMappedFamilyCount: readNumber(eventFamilyCoverage.canonicalMappedFamilyCount, 0),
        canonicalMappingCoveragePercent: readNumber(eventFamilyCoverage.canonicalMappingCoveragePercent, 0),
        observedFirstPartyFamilyCount: readNumber(eventFamilyCoverage.observedFirstPartyFamilyCount, 0),
        observedFirstPartyCoveragePercent: readNumber(eventFamilyCoverage.observedFirstPartyCoveragePercent, 0),
        sourceCoverageStatus: readString(eventFamilyCoverage.sourceCoverageStatus, "blocked"),
        sourceStateSummary: summarizeLaunchRecoveryFamilySourceStates(eventFamilySourceStates),
        holdbackStatus: readString(holdbackValidation.status, "blocked"),
        holdbackReason: readString(holdbackValidation.reason, "Observed first-party launch-critical coverage has not been proven."),
      },
      activeSourceCoverage: {
        activeSourceFamilyCount: readNumber(activeSourceCoverage.activeSourceFamilyCount, 0),
        activeSourceCoveragePercent: readNumber(activeSourceCoverage.activeSourceCoveragePercent, 0),
        targetCoveragePercent: readNumber(activeSourceCoverage.targetCoveragePercent, 95),
        sourceCoverageStatus: readString(activeSourceCoverage.sourceCoverageStatus, "blocked"),
        canClearHistoricalLaunchProof: readBoolean(activeSourceCoverage.canClearHistoricalLaunchProof, false),
        sourceStateSummary: summarizeLaunchActiveSourceFamilyStates(activeSourceFamilyStates),
      },
      localEvidenceWindowSummary: summarizeLaunchRecoveryDayEvidence(localEvidenceDays),
      formalLaunchDaySummary: summarizeLaunchRecoveryDayEvidence(formalDayCoverage),
      recoveredMetricMetadataCompleteness: {
        eventFamilySourceStates: summarizeCurrentLaunchRecoveryMetadata(artifactCurrent, eventFamilySourceStates),
        activeSourceFamilyStates: summarizeCurrentLaunchRecoveryMetadata(artifactCurrent, activeSourceFamilyStates),
        localEvidenceDays: summarizeCurrentLaunchRecoveryMetadata(artifactCurrent, localEvidenceDays),
        formalLaunchDayCoverage: summarizeCurrentLaunchRecoveryMetadata(artifactCurrent, formalDayCoverage),
        sourceAgreementDisagreements: summarizeCurrentLaunchRecoveryMetadata(artifactCurrent, sourceAgreementDisagreements),
        sourceAgreementMetricDeltas: summarizeCurrentLaunchRecoveryMetadata(artifactCurrent, sourceAgreementMetricDeltas),
        proofBoundary: RECOVERED_METRIC_METADATA_PROOF_BOUNDARY,
      },
      recoveryPolicy: {
        dedupeRules: recoveryDedupeRules,
        productTruthPolicy: recoveryProductTruthPolicy,
        modelingPolicy: recoveryModelingPolicy,
        proofBoundary: readString(recoveryPolicy.proofBoundary, RECOVERY_METRIC_POLICY_PROOF_BOUNDARY),
      },
      sourceAgreement: {
        state: readString(sourceAgreement.state, "unknown"),
        disagreementCount: typeof sourceAgreement.disagreementCount === "number" ? sourceAgreement.disagreementCount : 0,
        maxDeltaPct: typeof sourceAgreement.maxDeltaPct === "number" ? sourceAgreement.maxDeltaPct : null,
        classifications: Array.isArray(sourceAgreement.classifications) ? sourceAgreement.classifications.slice(0, 8) : [],
      },
      sourceTruthPolicy,
      nextAction: nextAction + (artifactCurrent ? "" : " Refresh launch recovery evidence with npm run check:analytics-panel-hydration before treating this dry-run summary as current."),
    }
  } catch (error) {
    return {
      artifactPath: LAUNCH_RECOVERY_REPORT_PATH,
      status: "launch_recovery_artifact_unreadable",
      readPerformed: false,
      mutationAllowed: false,
      error: error instanceof Error ? error.message : String(error),
      nextAction: "Regenerate launch recovery evidence with npm run check:analytics-panel-hydration before importing analytics truth.",
    }
  }
}

function emitDryRunReport() {
  console.log(JSON.stringify({
    dryRun: true,
    scriptName: "rebuild:analytics-truth",
    executeFunctions: false,
    maxRows: ANALYTICS_TRUTH_REBUILD_MAX_ROWS,
    maxRuntimeMs: ANALYTICS_TRUTH_REBUILD_MAX_RUNTIME_MS,
    maxRetries: ANALYTICS_TRUTH_REBUILD_MAX_RETRIES,
    truthClass: "canonical_fact_materializer_only",
    analyticsEvidenceOnly: true,
    schemaValidationRequired: true,
    dryRunRequiredBeforeImport: true,
    canonicalFactImportTargets: [...CANONICAL_FACT_IMPORT_TARGETS],
    materializerOutputContract: ["sourceBreakdown", "generatedAt", "freshnessState", "issues"],
    forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES],
    launchRecovery: readLaunchRecoveryDryRunSummary(),
    mutationSkipped: true,
    readSkipped: true,
    nextAction: "Run with --execute-functions only after local Functions dependencies are installed and an operator approves a dry-run Functions build.",
  }, null, 2))
  process.exit(0)
}

if (hasFlag("--dry-run") || !hasFlag("--execute-functions")) {
  emitDryRunReport()
}

void runFunctionsCommand("rebuild:analytics-truth").catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
