import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const depCruiseCli = path.join(
  process.cwd(),
  "node_modules",
  "dependency-cruiser",
  "bin",
  "dependency-cruise.mjs",
);

const outputDirectory = path.join(process.cwd(), "output");
const outputFile = path.join(outputDirectory, "dependency-graph.json");

const result = spawnSync(
  process.execPath,
  [
    depCruiseCli,
    "--config",
    ".dependency-cruiser.cjs",
    "--output-type",
    "json",
    "src",
    "functions/src",
  ],
  {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exit(result.status ?? 1);
}

mkdirSync(outputDirectory, { recursive: true });
writeFileSync(outputFile, result.stdout, "utf8");
console.log(`Dependency graph written to ${path.relative(process.cwd(), outputFile)}`);
