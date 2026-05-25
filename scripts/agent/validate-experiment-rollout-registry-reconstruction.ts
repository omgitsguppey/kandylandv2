import fs from "node:fs";

const source = fs.readFileSync("src/lib/experiments/experiment-rollout-registry-status.ts", "utf8");
const route = fs.readFileSync("src/app/api/admin/debug/route.ts", "utf8");
const ui = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedExperiments.tsx", "utf8");
const tests = fs.readFileSync("tests/unit/experiment-rollout-registry-reconstruction.spec.ts", "utf8");
const failures: string[] = [];
const expect = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

expect(source.includes("registryExists"), "registry existence must be explicit.");
expect(source.includes("assignmentSource"), "assignment source missing.");
expect(source.includes("exposureEventSource"), "exposure event source missing.");
expect(route.includes("registryStatus"), "route must expose registry status.");
expect(ui.includes("registryStatus"), "UI must consume registry status.");
expect(tests.includes("missing registry"), "missing registry test missing.");

if (failures.length) {
  console.error("Experiment rollout registry reconstruction validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Experiment rollout registry reconstruction validator passed.");
