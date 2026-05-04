import { spawn } from "node:child_process";
import path from "node:path";

function runNpmScript(scriptName: string) {
  return new Promise<void>((resolve, reject) => {
    const command = process.platform === "win32" ? "cmd.exe" : "npm";
    const args = process.platform === "win32"
      ? ["/c", "npm", "run", scriptName]
      : ["run", scriptName];
    const child = spawn(
      command,
      args,
      {
        cwd: path.resolve(process.cwd()),
        stdio: "inherit",
      },
    );

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${scriptName} exited with code ${code ?? "unknown"}`));
    });
  });
}

async function main() {
  await runNpmScript("train:recommendations");
  await runNpmScript("validate:behavioral-models");
}

void main().catch((error) => {
  console.error("[behavioral-models] training harness failed", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
