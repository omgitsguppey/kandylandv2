import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

const behavioralRuntime = read("functions/src/behavioral-intelligence-runtime.ts");
const analyticsTruthRuntime = read("functions/src/analytics-truth-runtime.ts");
const rebuildBehavioral = read("scripts/rebuild-behavioral-intelligence.ts");

const failures: string[] = [];

assert(behavioralRuntime.includes("buildCanonicalMetricFacts"), "Behavioral runtime must materialize canonical metric facts.", failures);
assert(behavioralRuntime.includes("input.metricFacts.forEach"), "Behavioral runtime must consume metric facts when computing purchase/unlock truth.", failures);
assert(behavioralRuntime.includes("sourceTruthScore"), "Behavioral profiles must persist sourceTruthScore.", failures);
assert(behavioralRuntime.includes("issueCodes"), "Behavioral profiles must persist issueCodes.", failures);
assert(behavioralRuntime.includes("recommendationCardCap"), "Behavioral profiles must cap fallback recommendation cards.", failures);
assert(behavioralRuntime.includes("legacy_page_duration_fallback"), "Behavioral runtime must label legacy page duration as fallback only.", failures);
assert(!behavioralRuntime.includes('eventName === "unlock_drop_success"'), "Behavioral runtime must not compute unlock truth from raw client event names.", failures);
assert(!behavioralRuntime.includes('eventName === "gumdrops_purchase_completed"'), "Behavioral runtime must not compute purchase truth from raw client event names.", failures);
assert(!behavioralRuntime.includes('eventName === "viewer_session_started"'), "Behavioral runtime must not compute watch/view truth from raw client event names.", failures);

assert(analyticsTruthRuntime.includes("buildCanonicalMetricFacts"), "Analytics truth runtime must materialize canonical metric facts.", failures);
assert(analyticsTruthRuntime.includes("input.metricFacts.forEach"), "Analytics truth runtime must consume metric facts for canonical unlock truth.", failures);
assert(analyticsTruthRuntime.includes("readNormalizedAction"), "Analytics truth runtime must read normalized actions instead of raw event names.", failures);
assert(!analyticsTruthRuntime.includes('eventName === "unlock_drop_success"'), "Analytics truth runtime must not count unlocks from raw client event names.", failures);
assert(!analyticsTruthRuntime.includes('eventName === "viewer_session_started"'), "Analytics truth runtime must not count watch/view truth from raw client event names.", failures);
assert(!analyticsTruthRuntime.includes('eventName === "view_drop_details"'), "Analytics truth runtime must not use raw preview event names as canonical logic.", failures);

assert(rebuildBehavioral.includes('runFunctionsCommand("rebuild:analytics-truth")'), "Behavioral rebuild must run analytics truth first.", failures);

if (failures.length > 0) {
  console.error("Functions canonical facts validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Functions canonical facts validation passed.");
