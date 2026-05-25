import fs from "node:fs";

const engine = fs.readFileSync("src/lib/tasks/task-catalog-coverage-engine.ts", "utf8");
const route = fs.readFileSync("src/app/api/admin/debug/route.ts", "utf8");
const ui = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedTruth.tsx", "utf8");
const tests = fs.readFileSync("tests/unit/task-catalog-runtime-reconstruction.spec.ts", "utf8");
const failures: string[] = [];
const expect = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

expect(engine.includes("buildTaskCatalogRuntimeReconstruction"), "task catalog reconstruction builder missing.");
expect(engine.includes("rewardVersion"), "reward version must be explicit.");
expect(engine.includes("multiplierPct"), "reward multiplier must be explicit.");
expect(engine.includes("builtInAvgGd"), "built-in average GD must be explicit.");
expect(route.includes("taskCatalogRuntimeStatus"), "route must expose task catalog runtime status.");
expect(ui.includes("taskCatalogSourceStatus"), "UI must consume task catalog source status.");
expect(tests.includes("zero built-in catalog"), "built-in zero regression test missing.");

if (failures.length) {
  console.error("Task catalog/runtime reconstruction validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Task catalog/runtime reconstruction validator passed.");
