import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  buildEventEnvelope,
  validateEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import {
  translateEnvelopeToDebugEvidence,
  translateEnvelopeToFeatureActivity,
  translateEnvelopeToPersonMetric,
} from "@/lib/analytics/event-translation-bridge";
import { SURFACE_PARITY_REGISTRY } from "@/lib/parity/surface-parity-registry";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import {
  SURFACE_TELEMETRY_EVENT_SPINE,
  validateSurfaceTelemetryRegistry,
} from "@/lib/telemetry/surface-telemetry-contract";
import {
  SURFACE_TELEMETRY_REGISTRY,
  buildSurfaceTelemetryParityReport,
  listSurfaceTelemetryCatalogEvents,
} from "@/lib/telemetry/surface-telemetry-registry";
import { listWorkingTreeFiles, readRepoToolchainState } from "./shared";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/surface-telemetry-parity.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/surface-telemetry-parity.md");

function duplicateEventNames() {
  const names = TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName);
  return names.filter((eventName, index) => names.indexOf(eventName) !== index);
}

function validateCatalogCoverage() {
  const catalogEventNames = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
  return listSurfaceTelemetryCatalogEvents()
    .filter((event) => !catalogEventNames.has(event.eventName))
    .map((event) => `${event.eventName} is missing from TELEMETRY_EVENT_OPTIONS.`);
}

function validateTranslationCoverage() {
  return SURFACE_TELEMETRY_REGISTRY.flatMap((surface, surfaceIndex) =>
    Object.values(surface.events).flatMap((event, eventIndex) => {
      const envelope = buildEventEnvelope({
        eventId: `surface_telemetry_parity:${surfaceIndex}:${eventIndex}`,
        eventName: event.eventName,
        timestamp: "2026-05-25T00:00:00.000Z",
        sessionId: `surface_telemetry_parity_session_${surfaceIndex}`,
        source: "system",
        systemGenerated: true,
      });
      const activity = translateEnvelopeToFeatureActivity({ envelope, observedActivityCount: 0 });
      const personMetric = translateEnvelopeToPersonMetric({ envelope });
      const debugEvidence = translateEnvelopeToDebugEvidence({ envelope, featureActivity: activity, personMetric });
      const failures: string[] = [];
      if (!validateEventEnvelope(envelope).ok) failures.push(`${event.eventName} failed canonical envelope validation.`);
      if (envelope.featureId !== event.envelope.featureId) failures.push(`${event.eventName} envelope featureId did not match surface registry.`);
      if (envelope.surface !== event.envelope.surface) failures.push(`${event.eventName} envelope surface did not match surface registry.`);
      if (!activity.producerRegistered) failures.push(`${event.eventName} did not translate to feature activity.`);
      if (!activity.materializerMapped) failures.push(`${event.eventName} did not map to a materializer lane.`);
      if (!activity.debugLaneMapped) failures.push(`${event.eventName} did not map to debug visibility.`);
      if (personMetric.classificationStatus === "missing_classification") failures.push(`${event.eventName} lacks person metric classification.`);
      if (debugEvidence.status === "failed") failures.push(`${event.eventName} did not translate to debug evidence.`);
      return failures;
    }),
  );
}

function buildMarkdown(report: ReturnType<typeof buildSurfaceTelemetryParityReport>) {
  const surfaceRows = SURFACE_TELEMETRY_REGISTRY.map((surface) =>
    `| ${surface.surfaceId} | ${surface.featureId} | ${Object.keys(surface.events).length} | ${surface.majorActionTriplet.attempted} / ${surface.majorActionTriplet.succeeded} / ${surface.majorActionTriplet.failed} |`,
  ).join("\n");
  const aliasRows = report.oldEventNameClassification
    .slice(0, 60)
    .map((entry) => `| ${entry.eventName} | ${entry.canonicalEventName} | ${entry.status} |`)
    .join("\n");

  return `# Surface Telemetry Parity

Generated: ${report.generatedAtUtc}

Status: ${report.status}

## Summary

- Major surfaces registered: ${report.majorSurfacesRegistered}
- Canonical event kinds: ${report.canonicalEventKinds.join(", ")}
- Catalog events registered: ${report.catalogEventsRegistered}
- Envelope mappings: ${report.eventEnvelopeMappings}
- Production reads performed: ${report.productionReadsPerformed}
- Provider calls performed: ${report.providerCallsPerformed}
- Fake events used: ${report.fakeEventsUsed}
- High-frequency events added: ${report.highFrequencyEventsAdded}

## Surface Event Spine

| Surface | Feature | Events | Action triplet |
| --- | --- | ---: | --- |
${surfaceRows}

## Legacy Aliases

Legacy names remain aliases only. New parity work should emit canonical surface spine names.

| Legacy event | Canonical event | Status |
| --- | --- | --- |
${aliasRows || "| none | none | canonical |"}

## Debug Lane

The debug lane is **${report.debugLane.label}**. Missing surface events are grouped by surface in \`agent/state/surface-telemetry-parity.generated.json\`.

## Validation Failures

${report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`).join("\n") : "- None"}
`;
}

const generatedAtUtc = new Date().toISOString();
const toolchain = readRepoToolchainState();
const currentHead = toolchain.currentHead ?? undefined;
const report = buildSurfaceTelemetryParityReport({
  generatedAtUtc,
  currentHead,
  dirtyFiles: listWorkingTreeFiles(),
});

const failures = [
  ...report.validationFailures,
  ...validateSurfaceTelemetryRegistry(SURFACE_TELEMETRY_REGISTRY),
  ...validateCatalogCoverage(),
  ...validateTranslationCoverage(),
  ...duplicateEventNames().map((eventName) => `${eventName} is duplicated in TELEMETRY_EVENT_OPTIONS.`),
];
if (toolchain.gitStatus !== "available") {
  failures.push(`git_required: surface telemetry parity cannot clear current-head/dirty-tree proof while Git is unavailable (${toolchain.degradationReason ?? "git unavailable"}).`);
}

if (SURFACE_TELEMETRY_REGISTRY.length !== SURFACE_PARITY_REGISTRY.length) {
  failures.push("Surface telemetry registry does not match surface parity registry size.");
}
for (const surface of SURFACE_TELEMETRY_REGISTRY) {
  if (Object.keys(surface.events).length !== SURFACE_TELEMETRY_EVENT_SPINE.length) {
    failures.push(`${surface.surfaceId} does not have the full canonical spine.`);
  }
}

const finalReport = {
  ...report,
  gitStatus: toolchain.gitStatus,
  currentHeadSource: toolchain.currentHeadSource,
  toolingDegraded: toolchain.toolingDegraded,
  degradationReason: toolchain.degradationReason,
  status: failures.length > 0 ? "fail" as const : "pass" as const,
  validationFailures: [...new Set(failures)],
};

mkdirSync(path.dirname(STATE_PATH), { recursive: true });
mkdirSync(path.dirname(DOC_PATH), { recursive: true });
writeFileSync(STATE_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
writeFileSync(DOC_PATH, buildMarkdown(finalReport));

if (finalReport.status !== "pass") {
  console.error(JSON.stringify(finalReport.validationFailures, null, 2));
  process.exit(1);
}

console.log(`surface telemetry parity pass: ${finalReport.catalogEventsRegistered} catalog events across ${finalReport.majorSurfacesRegistered} surfaces`);
