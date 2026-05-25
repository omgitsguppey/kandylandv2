import fs from "node:fs";

const engine = fs.readFileSync("src/lib/tasks/task-telemetry-mapping-engine.ts", "utf8");
const route = fs.readFileSync("src/app/api/admin/debug/route.ts", "utf8");
const ui = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedTelemetry.tsx", "utf8");
const tests = fs.readFileSync("tests/unit/task-telemetry-mapping-reconstruction.spec.ts", "utf8");
const failures: string[] = [];
const expect = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

expect(engine.includes("tracked_events_zero_while_catalog_has_task_events"), "catalog-vs-zero telemetry contradiction missing.");
expect(engine.includes("lifecycle_events_contradict_task_activity_samples"), "lifecycle contradiction missing.");
expect(engine.includes("aliases_unscanned"), "alias scan status missing.");
expect(route.includes("buildTaskTelemetryMappingReconstruction"), "route must build task telemetry source status.");
expect(ui.includes("mappingSourceStatus"), "UI must consume mapping source status.");
expect(tests.includes("0/0 mapping"), "0/0 mapping test missing.");

if (failures.length) {
  console.error("Task telemetry mapping reconstruction validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Task telemetry mapping reconstruction validator passed.");
