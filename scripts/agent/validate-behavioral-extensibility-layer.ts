import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  TELEMETRY_EVENT_EXTENSION_METADATA,
  TELEMETRY_EVENT_EXTENSION_METADATA_BY_NAME,
  TELEMETRY_EVENT_OPTIONS,
  getTelemetryEventExtensionMetadata,
} from "../../src/lib/telemetry-catalog";
import {
  BEHAVIOR_FEATURE_REGISTRY,
  REQUIRED_BEHAVIOR_FEATURE_IDS,
  getBehaviorFeatureRegistration,
} from "../../src/lib/behavioral/behavior-feature-registry";
import {
  classifyBehaviorSignalForEvent,
  validateBehaviorEventRegistration,
} from "../../src/lib/behavioral/behavior-signal-classifier";

const ROOT = process.cwd();
const REPORT_PATH = "agent/state/behavioral-extensibility-layer.generated.json";
const DOC_PATH = "docs/agent-truth/behavioral-extensibility-layer.md";

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const changed = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"]] as const) {
    const output = git([...args]);
    for (const line of output.split(/\r?\n/u).map((entry) => entry.trim()).filter(Boolean)) {
      changed.add(line.replace(/\\/gu, "/"));
    }
  }
  return [...changed].sort();
}

const failures: string[] = [];
const warnings: string[] = [];
const changed = changedFiles();
const catalogSource = read("src/lib/telemetry-catalog.ts");
const classifierSource = read("src/lib/behavioral/behavior-signal-classifier.ts");
const registrySource = read("src/lib/behavioral/behavior-feature-registry.ts");

for (const featureId of REQUIRED_BEHAVIOR_FEATURE_IDS) {
  const feature = getBehaviorFeatureRegistration(featureId);
  if (!feature) {
    failures.push(`required feature missing from behavior registry: ${featureId}`);
    continue;
  }
  for (const key of [
    "owner",
    "surface",
    "defaultPersistenceLane",
    "defaultMaterializerLane",
    "defaultAggregationLane",
    "scoreEvidenceImpact",
  ] as const) {
    if (!feature[key]) {
      failures.push(`${featureId} missing ${key}`);
    }
  }
  if (!feature.futureFeatureSafe) {
    failures.push(`${featureId} is not futureFeatureSafe`);
  }
}

if (TELEMETRY_EVENT_EXTENSION_METADATA.length !== TELEMETRY_EVENT_OPTIONS.length) {
  failures.push("not every telemetry catalog event has extension metadata");
}

for (const option of TELEMETRY_EVENT_OPTIONS) {
  const metadata = TELEMETRY_EVENT_EXTENSION_METADATA_BY_NAME[option.eventName];
  if (!metadata) {
    failures.push(`${option.eventName} lacks extension metadata`);
    continue;
  }
  for (const key of [
    "feature",
    "surface",
    "eventType",
    "consentRequirement",
    "identityRequirement",
    "persistenceLane",
    "materializerLane",
    "aggregationLane",
    "scoreEvidenceImpact",
    "debugVisibility",
    "owner",
  ] as const) {
    if (!metadata[key]) {
      failures.push(`${option.eventName} missing ${key}`);
    }
  }
  if (!metadata.futureFeatureSafe) {
    failures.push(`${option.eventName} is not futureFeatureSafe`);
  }
}

const unregisteredName = "future_feature_missing_catalog_click";
const unregistered = classifyBehaviorSignalForEvent(unregisteredName, "full_behavioral");
if (getTelemetryEventExtensionMetadata(unregisteredName) !== null
  || unregistered.accepted
  || unregistered.quarantineReason !== "unregistered_event"
  || validateBehaviorEventRegistration(unregisteredName).ok) {
  failures.push("unregistered events are accepted as normal telemetry");
}

const minimalBehavior = classifyBehaviorSignalForEvent("drop_card_impression", "minimal_analytics");
if (minimalBehavior.accepted || minimalBehavior.quarantineReason !== "consent_blocked_behavioral_personalization") {
  failures.push("minimal consent allows behavioral personalization");
}

const fullBehavior = classifyBehaviorSignalForEvent("drop_card_impression", "full_behavioral");
if (!fullBehavior.accepted || !fullBehavior.materializerReady || !fullBehavior.identityAware || !fullBehavior.debugVisible) {
  failures.push("full behavioral event is not consent-gated, identity-aware, materializer-ready, and debug-visible");
}

const purchaseIntegrity = classifyBehaviorSignalForEvent("purchase_verified", "necessary_only");
if (!purchaseIntegrity.accepted) {
  failures.push("required purchase integrity telemetry is blocked under necessary-only consent");
}

if (!catalogSource.includes("TelemetryEventExtensionMetadata")
  || !catalogSource.includes("buildTelemetryEventExtensionMetadata")
  || !catalogSource.includes("TELEMETRY_EVENT_EXTENSION_METADATA_BY_NAME")) {
  failures.push("telemetry catalog lacks first-class extension metadata exports");
}

if (!classifierSource.includes("quarantineReason")
  || !classifierSource.includes("unregistered_event")
  || !classifierSource.includes("consent_blocked_behavioral_personalization")) {
  failures.push("behavior signal classifier lacks quarantine paths for unregistered or consent-blocked events");
}

if (!registrySource.includes("REQUIRED_BEHAVIOR_FEATURE_IDS")
  || !registrySource.includes("futureFeatureSafe")) {
  failures.push("behavior feature registry lacks required extensibility contract fields");
}

const protectedChanges = changed.filter((path) =>
  /^src\/components\/Navigation\//u.test(path)
  || /^src\/components\/Navbar/u.test(path)
  || /\/chat\//iu.test(path)
  || /paypal|payment|gumdrop/i.test(path));
if (protectedChanges.length > 0) {
  failures.push(`protected chat/nav/payment/GumDrop files changed: ${protectedChanges.join(", ")}`);
}

const featureCounts = BEHAVIOR_FEATURE_REGISTRY.map((feature) => ({
  feature: feature.feature,
  events: TELEMETRY_EVENT_EXTENSION_METADATA.filter((metadata) => metadata.feature === feature.feature).length,
}));
for (const feature of featureCounts) {
  if (feature.events === 0 && REQUIRED_BEHAVIOR_FEATURE_IDS.includes(feature.feature as (typeof REQUIRED_BEHAVIOR_FEATURE_IDS)[number])) {
    warnings.push(`${feature.feature} is registered for future-safe tracking but has no current catalog events`);
  }
}

const report = {
  generatedAtUtc: new Date().toISOString(),
  reportKey: "behavioral-extensibility-layer",
  currentHead: git(["rev-parse", "HEAD"]),
  status: failures.length === 0 ? "pass" : "fail",
  catalogEvents: TELEMETRY_EVENT_OPTIONS.length,
  extensionMetadataEvents: TELEMETRY_EVENT_EXTENSION_METADATA.length,
  featureCount: BEHAVIOR_FEATURE_REGISTRY.length,
  requiredFeatures: REQUIRED_BEHAVIOR_FEATURE_IDS,
  featureCounts,
  sampleClassifications: {
    dropCardImpressionFull: fullBehavior,
    dropCardImpressionMinimal: minimalBehavior,
    purchaseVerifiedNecessaryOnly: purchaseIntegrity,
    unregistered,
  },
  changedFiles: changed,
  warnings,
  validationFailures: failures,
};

write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
write(DOC_PATH, [
  "# Behavioral Extensibility Layer",
  "",
  `Status: ${report.status}`,
  "",
  "Behavioral telemetry now has a catalog-level extension contract. New features must register events in the telemetry catalog and resolve to a behavior feature, consent requirement, identity requirement, persistence lane, materializer lane, aggregation lane, owner, score/evidence impact, and debug visibility before the classifier accepts them as normal behavior.",
  "",
  "## Coverage",
  "",
  `- Catalog events: ${report.catalogEvents}`,
  `- Extension metadata events: ${report.extensionMetadataEvents}`,
  `- Behavior features: ${report.featureCount}`,
  `- Required feature registry: ${REQUIRED_BEHAVIOR_FEATURE_IDS.join(", ")}`,
  "",
  "## Guardrails",
  "",
  "- Unregistered events are quarantined as `unregistered_event`.",
  "- Minimal or necessary-only consent blocks behavioral personalization signals.",
  "- Required purchase/account/security integrity events remain allowed when optional behavior tracking is declined.",
  "- Events without identity requirements or materializer lanes fail validation.",
  "- Debug-visible metadata is generated from the catalog, not from ad hoc tracker code.",
  "",
  "## Sample Outcomes",
  "",
  `- drop_card_impression with full behavioral consent: ${fullBehavior.accepted ? "accepted" : "blocked"}`,
  `- drop_card_impression with minimal analytics: ${minimalBehavior.quarantineReason ?? "accepted"}`,
  `- purchase_verified with necessary-only consent: ${purchaseIntegrity.accepted ? "accepted" : "blocked"}`,
  `- unregistered event: ${unregistered.quarantineReason ?? "accepted"}`,
  "",
  "## Warnings",
  "",
  ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["- None"]),
  "",
  "## Failures",
  "",
  ...(failures.length ? failures.map((failure) => `- ${failure}`) : ["- None"]),
  "",
].join("\n"));

if (failures.length > 0) {
  console.error(`Behavioral extensibility validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`Behavioral extensibility validation passed for ${report.extensionMetadataEvents} catalog events across ${report.featureCount} features.`);
