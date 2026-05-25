import fs from "node:fs";

const engine = fs.readFileSync("src/lib/behavioral/behavioral-intelligence-snapshot-status.ts", "utf8");
const route = fs.readFileSync("src/app/api/admin/debug/route.ts", "utf8");
const ui = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedBehavior.tsx", "utf8");
const tests = fs.readFileSync("tests/unit/behavioral-intelligence-snapshot-truth.spec.ts", "utf8");
const failures: string[] = [];
const expect = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

expect(engine.includes("deterministic baseline"), "deterministic baseline action missing.");
expect(engine.includes("rankingMode === \"unknown\""), "unknown ranking mode must block loaded healthy.");
expect(route.includes("buildBehavioralIntelligenceSnapshotStatus"), "route must build behavioral snapshot source status.");
expect(ui.includes("behavioralSourceStatus"), "UI must consume behavioral source status.");
expect(tests.includes("zero profiles"), "zero profiles regression test missing.");

if (failures.length) {
  console.error("Behavioral intelligence snapshot truth validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Behavioral intelligence snapshot truth validator passed.");
