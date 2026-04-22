import {spawn} from "node:child_process"
import path from "node:path"

function runFunctionsCommand(scriptName: string) {
  return new Promise<void>((resolve, reject) => {
    const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm"
    const child = spawn(
      npmExecutable,
      ["run", scriptName],
      {
        cwd: path.resolve(process.cwd(), "functions"),
        stdio: "inherit",
      },
    )

    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`functions ${scriptName} exited with code ${code ?? "unknown"}`))
    })
  })
}

void runFunctionsCommand("rebuild:behavioral-intelligence").catch((error) => {
  console.error("[behavioral-intelligence] rebuild failed", error)
  process.exitCode = 1
})
