import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const behavioralRuntime = read("functions/src/behavioral-intelligence-runtime.ts");
const analyticsTruthRuntime = read("functions/src/analytics-truth-runtime.ts");
const analyticsTruthCli = read("functions/src/analytics-truth-cli.ts");
const behavioralRebuild = read("scripts/rebuild-behavioral-intelligence.ts");
const analyticsRebuild = read("scripts/rebuild-analytics-truth.ts");
const adminMaterializers = read("src/lib/server/admin-analytics-materializers.ts");
const contract = read("src/lib/materializers/materializer-contract.ts");
const sourcePolicy = read("src/lib/materializers/materializer-source-policy.ts");
const packageJson = read("package.json");

assert(contract.includes("CanonicalMaterializerEnvelope"), "Materializer contract must define a canonical envelope.");
assert(contract.includes("generatedAt"), "Materializer contract must require generatedAt.");
assert(contract.includes("freshnessState"), "Materializer contract must require freshnessState.");
assert(contract.includes("sourceBreakdown"), "Materializer contract must require sourceBreakdown.");
assert(contract.includes("issues"), "Materializer contract must require issues.");

assert(sourcePolicy.includes("analytics_event_facts"), "Materializer source policy must anchor runtime facts.");
assert(sourcePolicy.includes("analytics_metric_facts"), "Materializer source policy must anchor metric facts.");
assert(sourcePolicy.includes("legacy_page_duration"), "Materializer source policy must classify legacy_page_duration as diagnostic.");
assert(sourcePolicy.includes("raw_client_event_names"), "Materializer source policy must block raw client event names as truth.");

assert(!behavioralRuntime.includes("switch (eventName)"), "Behavioral materializer still parses raw event names directly.");
assert(behavioralRuntime.includes('return ""'), "Behavioral materializer must reject missing normalized actions.");
assert(behavioralRuntime.includes("sourceBreakdown"), "Behavioral profiles must include sourceBreakdown.");
assert(behavioralRuntime.includes("generatedAt"), "Behavioral profiles must include generatedAt.");
assert(behavioralRuntime.includes("freshnessState"), "Behavioral profiles must include freshnessState.");
assert(behavioralRuntime.includes("issues"), "Behavioral profiles must include issues.");
assert(behavioralRuntime.includes('recommendationCardState: "fallback-limited"'), "Deterministic fallback profiles must label fallback recommendation cards.");
assert(behavioralRuntime.includes('recommendationCardCap: 3'), "Deterministic fallback profiles must cap recommendation cards.");

assert(analyticsTruthRuntime.includes("sourceBreakdown"), "Analytics truth materializer outputs must include sourceBreakdown.");
assert(analyticsTruthRuntime.includes("generatedAt"), "Analytics truth materializer outputs must include generatedAt.");
assert(analyticsTruthRuntime.includes("freshnessState"), "Analytics truth materializer outputs must include freshnessState.");
assert(analyticsTruthRuntime.includes("issues"), "Analytics truth materializer outputs must include issues.");
assert(!analyticsTruthRuntime.includes('rawEventName ==='), "Analytics truth runtime must not compute truth from raw event names.");

assert(analyticsTruthCli.includes("canonicalFactInputs"), "Analytics truth CLI must declare canonical fact inputs.");
assert(analyticsTruthCli.includes("analytics_metric_facts"), "Analytics truth CLI must declare metric facts as canonical inputs.");
assert(analyticsTruthCli.includes("blockedInputs"), "Analytics truth CLI must declare blocked legacy inputs.");

assert(behavioralRebuild.includes("materializerOutputContract"), "Behavioral rebuild script must declare the materializer output contract.");
assert(analyticsRebuild.includes("materializerOutputContract"), "Analytics rebuild script must declare the materializer output contract.");
assert(adminMaterializers.includes("sourcePolicy"), "Admin analytics materializers must classify source policy.");

assert(packageJson.includes('"check:materializers-cutover": "tsx scripts/agent/validate-materializers-cutover.ts"'), "package.json is missing check:materializers-cutover.");

console.log("Materializers cutover validator passed.");
