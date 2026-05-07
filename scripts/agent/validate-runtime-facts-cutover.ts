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

const contract = read("src/lib/runtime-facts/runtime-fact-contract.ts");
const normalizer = read("src/lib/runtime-facts/normalize-runtime-fact.ts");
const writer = read("src/lib/server/write-runtime-fact.ts");
const identifiedIngest = read("src/app/api/analytics/ingest-identified/route.ts");
const anonymousIngest = read("src/app/api/analytics/ingest/route.ts");
const governance = read("src/lib/server/analytics-governance.ts");
const analyticsMetrics = read("src/lib/server/analytics-metrics.ts");
const packageJson = read("package.json");

assert(contract.includes("RuntimeFact"), "Runtime fact contract is missing.");
assert(contract.includes("actor: RuntimeFactActor"), "Runtime fact contract is missing actor ownership.");
assert(contract.includes("target: RuntimeFactTarget"), "Runtime fact contract is missing target ownership.");
assert(contract.includes("sourceTruth"), "Runtime fact contract is missing source truth.");
assert(contract.includes("confidence"), "Runtime fact contract is missing confidence.");
assert(contract.includes("timestampMs"), "Runtime fact contract is missing timestampMs.");
assert(contract.includes("route"), "Runtime fact contract is missing route.");
assert(contract.includes("source_component"), "Runtime fact contract is missing source_component.");
assert(contract.includes("normalizedAction"), "Runtime fact contract is missing normalizedAction.");

assert(normalizer.includes("explainEventInclusion("), "Runtime fact normalizer must classify actor ownership through explainEventInclusion.");
assert(normalizer.includes("unknown_runtime_event"), "Unknown runtime events must route to diagnostics.");
assert(normalizer.includes("normalizeIdentifiedMetricEventFact"), "Identified runtime facts must derive metric parity from canonical normalization.");
assert(normalizer.includes("normalizeAnonymousRuntimeFact"), "Anonymous runtime fact normalizer is missing.");

assert(governance.includes('runtimeFacts: "analytics_event_facts"'), "Analytics governance is missing the canonical runtimeFacts collection.");

assert(identifiedIngest.includes("normalizeIdentifiedRuntimeFact"), "Identified ingest does not normalize runtime facts.");
assert(identifiedIngest.includes("createRuntimeFactFirestoreDocument"), "Identified ingest does not write canonical runtime fact documents.");
assert(identifiedIngest.includes("ANALYTICS_CANONICAL_COLLECTIONS.runtimeFacts"), "Identified ingest is not writing to the canonical runtime facts collection.");
assert(!identifiedIngest.includes("normalizeIdentifiedMetricEventFact({"), "Identified ingest still computes primary metric truth inline.");

assert(anonymousIngest.includes("normalizeAnonymousRuntimeFact"), "Anonymous ingest does not normalize runtime facts.");
assert(!anonymousIngest.includes("event.semanticSurfaceKey || event.targetId || event.semanticScopeKey || event.type"), "Anonymous ingest is still using the legacy low-signal event fallback chain.");

assert(writer.includes("rawEventName"), "Runtime fact writer must persist raw event names for diagnostics.");
assert(writer.includes("actor: fact.actor"), "Runtime fact writer must persist actor ownership.");
assert(writer.includes("target: fact.target"), "Runtime fact writer must persist target ownership.");
assert(writer.includes("normalizedActionName: fact.normalizedAction"), "Runtime fact writer must persist normalized action compatibility.");

assert(analyticsMetrics.includes("resolveFactActionName"), "Analytics consumers do not resolve canonical runtime actions.");
assert(analyticsMetrics.includes("fact.normalizedAction"), "Analytics consumers are not preferring normalized runtime actions.");
assert(!analyticsMetrics.includes("rawEventName ==="), "Analytics consumers must not score raw event names directly.");

assert(packageJson.includes('"check:runtime-facts-cutover": "tsx scripts/agent/validate-runtime-facts-cutover.ts"'), "package.json is missing check:runtime-facts-cutover.");

console.log("Runtime facts cutover validator passed.");
