import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const helper = read("src/lib/behavioral/unlock-watch-journey-normalization.ts");
const test = read("tests/unit/unlock-watch-journey-normalization.spec.ts");
const report = read("agent/state/unlock-watch-journey-normalization.generated.json");

expect(helper.includes("watchSessionsDropped: false"), "watch sessions dropped because viewer start missing.");
expect(helper.includes("doubleCountRisk"), "unlock/watch journey can double-count.");
expect(helper.includes("missing_viewer_start"), "missing viewer start not represented as attribution gap.");
expect(helper.includes("rawPrivateContentExposed"), "raw private content can enter journey.");
expect(test.includes("attributionGaps"), "journey attribution gap lacks test coverage.");
expect(report.includes('"journeyNormalizationStatus": "fail_with_attribution_gaps"'), "journey normalization report missing gap status.");

if (failures.length) {
  console.error("unlock-watch-journey-normalization failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("unlock-watch-journey-normalization: pass");
