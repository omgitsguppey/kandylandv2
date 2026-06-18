import {spawn} from "node:child_process"
import path from "node:path"

import {
  CANONICAL_FACT_IMPORT_TARGETS,
  FORBIDDEN_RUNTIME_MUTATION_SURFACES,
} from "../src/lib/analytics/import-export-truth-policy"

const BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_ROWS = 12000
const BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RUNTIME_MS = 10 * 60 * 1000
const BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RETRIES = 0

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
          KD_REBUILD_MAX_ROWS: String(BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_ROWS),
          KD_REBUILD_MAX_RUNTIME_MS: String(BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RUNTIME_MS),
          KD_REBUILD_MAX_RETRIES: String(BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RETRIES),
          KD_ANALYTICS_IMPORT_SCHEMA_VALIDATION_REQUIRED: "true",
          KD_ANALYTICS_IMPORT_DRY_RUN_REQUIRED: "true",
          KD_ANALYTICS_IMPORT_RUNTIME_MUTATION_BLOCKED: "true",
        },
      },
    )
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error(`functions ${scriptName} exceeded maxRuntimeMs=${BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RUNTIME_MS}`))
    }, BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RUNTIME_MS)

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

function emitDryRunReport() {
  console.log(JSON.stringify({
    dryRun: true,
    scriptNames: ["rebuild:analytics-truth", "rebuild:behavioral-intelligence"],
    executeFunctions: false,
    maxRows: BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_ROWS,
    maxRuntimeMs: BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RUNTIME_MS,
    maxRetries: BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RETRIES,
    truthClass: "canonical_fact_materializer_only",
    analyticsEvidenceOnly: true,
    schemaValidationRequired: true,
    dryRunRequiredBeforeImport: true,
    canonicalFactImportTargets: [...CANONICAL_FACT_IMPORT_TARGETS],
    materializerOutputContract: ["sourceBreakdown", "generatedAt", "freshnessState", "issues"],
    forbiddenRuntimeMutationSurfaces: [...FORBIDDEN_RUNTIME_MUTATION_SURFACES],
    mutationSkipped: true,
    readSkipped: true,
    nextAction: "Run with --execute-functions only after local Functions dependencies are installed and an operator approves a dry-run Functions build.",
  }, null, 2))
  process.exit(0)
}

if (hasFlag("--dry-run") || !hasFlag("--execute-functions")) {
  emitDryRunReport()
}

void (async () => {
  await runFunctionsCommand("rebuild:analytics-truth")
  await runFunctionsCommand("rebuild:behavioral-intelligence")
})().catch((error) => {
  console.error("[behavioral-intelligence] rebuild failed", error)
  process.exitCode = 1
})
