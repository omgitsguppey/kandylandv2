import {spawn} from "node:child_process"
import path from "node:path"

const BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_ROWS = 12000
const BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RUNTIME_MS = 10 * 60 * 1000
const BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RETRIES = 0

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
          KD_REBUILD_MAX_ROWS: String(BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_ROWS),
          KD_REBUILD_MAX_RUNTIME_MS: String(BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RUNTIME_MS),
          KD_REBUILD_MAX_RETRIES: String(BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RETRIES),
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

if (hasFlag("--dry-run")) {
  console.log(JSON.stringify({
    dryRun: true,
    scriptName: "rebuild:behavioral-intelligence",
    maxRows: BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_ROWS,
    maxRuntimeMs: BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RUNTIME_MS,
    maxRetries: BEHAVIORAL_INTELLIGENCE_REBUILD_MAX_RETRIES,
    mutationSkipped: true,
  }, null, 2))
  process.exit(0)
}

void runFunctionsCommand("rebuild:behavioral-intelligence").catch((error) => {
  console.error("[behavioral-intelligence] rebuild failed", error)
  process.exitCode = 1
})
