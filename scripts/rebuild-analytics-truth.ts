import {spawn} from "node:child_process"
import path from "node:path"

const ANALYTICS_TRUTH_REBUILD_MAX_ROWS = 12000
const ANALYTICS_TRUTH_REBUILD_MAX_RUNTIME_MS = 10 * 60 * 1000
const ANALYTICS_TRUTH_REBUILD_MAX_RETRIES = 0
const CANONICAL_FACT_IMPORT_TARGETS = ["analytics_event_facts", "analytics_metric_facts"] as const
const FORBIDDEN_RUNTIME_MUTATION_SURFACES = [
  "runtime_balances",
  "runtime_unlocks",
  "runtime_purchases",
  "runtime_user_rollups",
  "legacy_admin_metric_snapshots",
] as const

function hasFlag(flag: string) {
  return process.argv.slice(2).includes(flag)
}

function runFunctionsCommand(scriptName: string) {
  return new Promise<void>((resolve, reject) => {
    const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm"
    const child = spawn(
      npmExecutable,
      ["run", scriptName],
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

if (hasFlag("--dry-run")) {
  console.log(JSON.stringify({
    dryRun: true,
    scriptName: "rebuild:analytics-truth",
    maxRows: ANALYTICS_TRUTH_REBUILD_MAX_ROWS,
    maxRuntimeMs: ANALYTICS_TRUTH_REBUILD_MAX_RUNTIME_MS,
    maxRetries: ANALYTICS_TRUTH_REBUILD_MAX_RETRIES,
    truthClass: "canonical_fact_materializer_only",
    analyticsEvidenceOnly: true,
    schemaValidationRequired: true,
    dryRunRequiredBeforeImport: true,
    canonicalFactImportTargets: [...CANONICAL_FACT_IMPORT_TARGETS],
    forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES],
    mutationSkipped: true,
  }, null, 2))
  process.exit(0)
}

void runFunctionsCommand("rebuild:analytics-truth").catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
