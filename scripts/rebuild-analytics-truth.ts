import {execFileSync, spawn} from "node:child_process"
import {existsSync, readFileSync} from "node:fs"
import path from "node:path"

import {
  CANONICAL_FACT_IMPORT_TARGETS,
  FORBIDDEN_RUNTIME_MUTATION_SURFACES,
} from "../src/lib/analytics/import-export-truth-policy"
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

function readCurrentHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {cwd: process.cwd(), encoding: "utf8"}).trim()
  } catch {
    return "unknown"
  }
}

function readLaunchCoverageInputCandidates(evidenceProvenance: Record<string, unknown>) {
  const statuses = Array.isArray(evidenceProvenance.candidateLaunchCoverageInputStatuses)
    ? evidenceProvenance.candidateLaunchCoverageInputStatuses
    : []
  const summary = new Map<string, number>()
  const candidates = statuses
    .map((entry) => {
      const record = asRecord(entry)
      const state = readString(record.state, "unknown")
      summary.set(state, (summary.get(state) ?? 0) + 1)
      return {
        path: readString(record.path, "unknown"),
        state,
        proofMode: readString(record.proofMode, "none"),
        nextAction: readString(record.nextAction, "Attach a launch-history coverage input before promoting analytics truth."),
      }
    })
    .slice(0, 8)

  return {
    inputMode: readString(evidenceProvenance.sourceAgreementInputMode, "unknown"),
    inputPath: readString(evidenceProvenance.sourceAgreementInputPath, "none"),
    usableInputFound: readBoolean(evidenceProvenance.usableLaunchCoverageInputFound, false),
    candidateCount: statuses.length,
    candidates,
    stateCounts: Object.fromEntries(summary),
  }
}

function launchCoverageInputNextAction(input: ReturnType<typeof readLaunchCoverageInputCandidates>) {
  if (input.usableInputFound) return null

  const acceptedPaths = input.candidates
    .filter((entry) => entry.path.includes("agent/evidence/launch-analytics/launch-history-coverage"))
    .map((entry) => entry.path)
  const pathList = acceptedPaths.length > 0
    ? acceptedPaths.join(" or ")
    : "agent/evidence/launch-analytics/launch-history-coverage.local.json or agent/evidence/launch-analytics/launch-history-coverage.export.json"

  return `Attach approved launch-history coverage at ${pathList}, or attach a redacted admin truth sample with launchHistoryCoverage day rows. Then run npm run check:analytics-panel-hydration before treating launch analytics charts as canonical.`
}

function launchRecoveryEvidenceFreshness(status: string) {
  if (status === "current_head") return "current"
  if (status === "same_commit_snapshot") return "same_commit_snapshot"
  if (status === "current_by_impact") return "current_by_impact"
  return "stale_generated_snapshot"
}

function readLaunchRecoveryDryRunSummary() {
  const artifactPath = path.resolve(process.cwd(), LAUNCH_RECOVERY_REPORT_PATH)
  if (!existsSync(artifactPath)) {
    return {
      artifactPath: LAUNCH_RECOVERY_REPORT_PATH,
      status: "launch_recovery_artifact_missing",
      readPerformed: false,
      mutationAllowed: false,
      sourceTruthPolicy: {
        firstPartyPrimary: true,
        ga4SecondSourceOnly: true,
        fallbackEvidenceOnly: true,
        missingIsNotZero: true,
      },
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
    const formalLaunchRange = asRecord(report.formalLaunchRange)
    const sourceAgreement = asRecord(report.sourceAgreement)
    const sourceTruthPolicy = Object.keys(asRecord(report.sourceTruthPolicy)).length > 0
      ? asRecord(report.sourceTruthPolicy)
      : asRecord(sourceAgreement.sourceTruthPolicy)
    const launchCoverageInputs = readLaunchCoverageInputCandidates(evidenceProvenance)
    const reportNextAction = readString(
      report.nextAction,
      readString(sourceAgreement.nextAction, "Review launch analytics recovery evidence before importing analytics truth."),
    )
    const nextAction = launchCoverageInputNextAction(launchCoverageInputs) ?? reportNextAction
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
