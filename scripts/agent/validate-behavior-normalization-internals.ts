import fs from "node:fs";

const source = fs.readFileSync("src/lib/behavioral/behavior-normalization-internals-engine.ts", "utf8");
const contract = fs.readFileSync("src/lib/behavioral/behavior-normalization-internals-contract.ts", "utf8");
const ui = fs.readFileSync("src/app/admin/debug/components/DebugAdvancedTruth.tsx", "utf8");
const tests = fs.readFileSync("tests/unit/behavior-normalization-internals.spec.ts", "utf8");
const failures: string[] = [];
const expect = (condition: unknown, message: string) => { if (!condition) failures.push(message); };

expect(source.includes("classifySourceWindowZeroShell"), "internals must use the shared zero-shell classifier.");
expect(contract.includes("healthMath"), "health math contract missing.");
expect(contract.includes("coverageByDomain"), "coverage by domain contract missing.");
expect(contract.includes("dependencyGaps"), "dependency gap contract missing.");
expect(ui.includes("behaviorNormalizationInternals"), "UI must consume behavior normalization source status.");
expect(ui.includes("Source state"), "UI must show source status.");
expect(tests.includes("0 findings over 0 inspected events"), "0/0 behavior test missing.");

if (failures.length) {
  console.error("Behavior normalization internals validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Behavior normalization internals validator passed.");
