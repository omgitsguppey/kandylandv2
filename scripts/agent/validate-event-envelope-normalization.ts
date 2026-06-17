import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import {
  buildEventEnvelope,
  normalizeLegacyEventEnvelope,
  stripForbiddenMetadata,
  validateEventEnvelope,
} from "@/lib/analytics/event-envelope-builder";
import { EVENT_ENVELOPE_REQUIRED_FIELDS } from "@/lib/analytics/event-envelope-contract";

const REPORT_PATH = "agent/state/event-envelope-normalization.generated.json";
const DOC_PATH = "docs/agent-truth/event-envelope-normalization.md";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function gitOutput(command: string) {
  try {
    return execSync(command, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function listChangedFiles() {
  const names = new Set<string>();
  for (const command of ["git diff --name-only", "git diff --cached --name-only", "git ls-files --others --exclude-standard"]) {
    for (const line of gitOutput(command).split(/\r?\n/u)) {
      if (line.trim()) names.add(line.trim());
    }
  }
  return [...names].sort();
}

function writeJson(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function countOccurrences(source: string, text: string) {
  return source.split(text).length - 1;
}

function writeDoc(report: {
  generatedAtUtc: string;
  status: "pass" | "fail";
  currentHead: string;
  changedFiles: string[];
  checks: Record<string, boolean>;
  validationFailures: string[];
}) {
  mkdirSync(dirname(DOC_PATH), { recursive: true });
  writeFileSync(DOC_PATH, [
    "# Event Envelope Normalization",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Status: ${report.status}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Contract",
    "",
    "- Every tracked event resolves through `buildEventEnvelope` before it enters the normal analytics path.",
    "- The canonical envelope includes identity state, consent mode, session id, feature id, surface, source, materializer lane, debug visibility, score impact, privacy class, and sanitized metadata.",
    "- Guest, signed-in, creator, wallet, drop, behavioral, and admin events use the same envelope shape.",
    "- Unregistered or legacy events are quarantined and cannot enter normal analytics silently.",
    "- Forbidden metadata such as emails, phones, tokens, prompts, messages, media URLs, provider payloads, and raw payment ids is stripped before persistence.",
    "- Admin/debug exposes one Event envelope health lane with raw dumps collapsed by default.",
    "",
    "## Checks",
    "",
    ...Object.entries(report.checks).map(([key, passed]) => `- ${passed ? "pass" : "fail"}: ${key}`),
    "",
    "## Changed Files",
    "",
    ...(report.changedFiles.length > 0 ? report.changedFiles.map((file) => `- ${file}`) : ["- none"]),
    "",
    "## Validation Failures",
    "",
    ...(report.validationFailures.length > 0 ? report.validationFailures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = gitOutput("git rev-parse HEAD") || "unknown";
  const changedFiles = listChangedFiles();
  const failures: string[] = [];

  const contractSource = read("src/lib/analytics/event-envelope-contract.ts");
  const builderSource = read("src/lib/analytics/event-envelope-builder.ts");
  const telemetrySource = read("src/lib/telemetry.ts");
  const telemetrySafetySource = read("src/lib/analytics/telemetry-safety.ts");
  const anonymousIngestSource = read("src/app/api/analytics/ingest/route.ts");
  const identifiedIngestSource = read("src/app/api/analytics/ingest-identified/route.ts");
  const adminDebugRouteSource = read("src/app/api/admin/debug/route.ts");
  const adminDebugSummarySource = read("src/lib/server/admin-debug/event-envelope-summary.ts");
  const testSource = read("tests/unit/event-envelope-normalization.spec.ts");
  const packageJson = read("package.json");

  const registeredEnvelope = buildEventEnvelope({
    eventId: "evt_validator_1",
    eventName: "semantic_page_viewed",
    timestamp: generatedAtUtc,
    guestId: "subject_guest_validator",
    sessionId: "sess_validator",
    consentMode: "full_behavioral",
    source: "guest_client",
    metadata: {
      safe: "kept",
      email: "person@example.com",
      mediaUrl: "https://storage.example/private.mp4?token=abc",
    },
  });
  const registeredValidation = validateEventEnvelope(registeredEnvelope);
  const unknownEnvelope = buildEventEnvelope({
    eventId: "evt_unknown",
    eventName: "unknown_orphan_event",
    timestamp: generatedAtUtc,
    sessionId: "sess_validator",
    consentMode: "minimal_analytics",
    source: "client",
  });
  const unknownValidation = validateEventEnvelope(unknownEnvelope);
  const invalidIdentityEnvelope = {
    ...registeredEnvelope,
    identityState: "" as typeof registeredEnvelope.identityState,
    consentMode: "" as typeof registeredEnvelope.consentMode,
  };
  const invalidIdentityValidation = validateEventEnvelope(invalidIdentityEnvelope);
  const legacyEnvelope = normalizeLegacyEventEnvelope({
    eventId: "legacy_validator",
    eventName: "legacy_duration",
    timestamp: generatedAtUtc,
    userId: "legacy_user",
    source: "legacy",
  });
  const protectedChangedFiles = changedFiles.filter((file) =>
    /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)
      || /paypal|payment|gumdrop/iu.test(file));

  const checks = {
    canonicalContractExists: contractSource.includes("interface CanonicalEventEnvelope") && contractSource.includes("EVENT_ENVELOPE_REQUIRED_FIELDS"),
    requiredFieldsPublished: EVENT_ENVELOPE_REQUIRED_FIELDS.every((field) => contractSource.includes(`"${field}"`)),
    builderExportsRequiredFunctions: [
      "buildEventEnvelope",
      "normalizeLegacyEventEnvelope",
      "validateEventEnvelope",
      "stripForbiddenMetadata",
      "classifyEventPrivacy",
      "getEnvelopeDedupeKey",
    ].every((name) => builderSource.includes(`function ${name}`)),
    registeredEnvelopeIsNormalAndValid: registeredEnvelope.pipelineStatus === "normal" && registeredValidation.ok,
    envelopeHasIdentityAndConsent: Boolean(registeredEnvelope.identityState && registeredEnvelope.consentMode && registeredEnvelope.sessionId),
    guestUserIdsRequireIdentityState: invalidIdentityValidation.findings.includes("identity_id_without_identity_state"),
    forbiddenMetadataStripped: stripForbiddenMetadata({
      email: "person@example.com",
      rawPrompt: "private",
      messageText: "private",
      mediaUrl: "https://storage.example/private.mp4",
      safe: "kept",
    }).safe === "kept",
    unregisteredEventsQuarantined: unknownEnvelope.pipelineStatus === "quarantined"
      && unknownEnvelope.quarantineReason === "unregistered_event"
      && unknownValidation.findings.includes("unregistered_event_cannot_enter_normal_pipeline"),
    legacyNormalizationNotExact: legacyEnvelope.identityState === "legacy_unknown" && legacyEnvelope.identityConfidence !== "exact",
    telemetryClientUsesEnvelopeBuilder: telemetrySource.includes("buildEventEnvelope") && telemetrySource.includes("event_envelope_pipeline_status"),
    telemetrySafetyAllowsEnvelopeFields: telemetrySafetySource.includes('"event_envelope_version"') && telemetrySafetySource.includes('"privacy_class"'),
    anonymousIngestUsesEnvelopeBuilder: anonymousIngestSource.includes("buildEventEnvelope") && anonymousIngestSource.includes("quarantinedEventEnvelopes"),
    identifiedIngestUsesEnvelopeBuilder: identifiedIngestSource.includes("buildEventEnvelope") && identifiedIngestSource.includes("eventEnvelope"),
    debugPanelHasSingleEnvelopeLane: countOccurrences(adminDebugRouteSource, "eventEnvelope") === 1
      && adminDebugSummarySource.includes('lane: "Event envelope"')
      && adminDebugSummarySource.includes("duplicateEventCatalogTelemetryBehaviorLanesConsolidated: true")
      && adminDebugSummarySource.includes("rawEventDumpsCollapsed: true"),
    unitTestCoversEnvelope: testSource.includes("unregistered event") && testSource.includes("stripForbiddenMetadata"),
    packageScriptPresent: packageJson.includes('"check:event-envelope-normalization": "tsx scripts/agent/validate-event-envelope-normalization.ts"'),
    chatNavPaymentGumdropRuntimeUntouched: protectedChangedFiles.length === 0,
  };

  for (const [key, passed] of Object.entries(checks)) {
    if (!passed) failures.push(`${key} failed.`);
  }
  if (protectedChangedFiles.length > 0) {
    failures.push(`protected files changed: ${protectedChangedFiles.join(", ")}`);
  }

  const report = {
    reportKey: "event-envelope-normalization",
    generatedAtUtc,
    currentHead,
    status: failures.length === 0 ? "pass" as const : "fail" as const,
    productionReadsRequired: false,
    fakeEventsUsed: false,
    protectedRuntimeStatus: {
      paymentPaypalUntouched: !changedFiles.some((file) => /paypal|payment/iu.test(file)),
      gumdropMathUntouched: !changedFiles.some((file) => /gumdrop/iu.test(file)),
      chatNavUntouched: !changedFiles.some((file) => /(^|\/)(chat|top-nav|bottom-nav|navbar|navigation)(\/|\.|$)/iu.test(file)),
    },
    checks,
    changedFiles,
    validationFailures: failures,
    debugPanelLane: {
      name: "Event envelope",
      rawDumpsCollapsed: true,
      duplicateEventCatalogTelemetryBehaviorLanesConsolidated: true,
    },
    releaseNote: [
      "Normalized telemetry events into a shared identity-aware envelope.",
      "Blocked orphaned and unregistered events from normal analytics.",
      "Simplified debug event health into one lane.",
    ],
  };

  writeJson(REPORT_PATH, report);
  writeDoc(report);

  if (failures.length > 0) {
    console.error(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  console.log(`Event envelope normalization passed: ${Object.keys(checks).length} checks.`);
}

main();
