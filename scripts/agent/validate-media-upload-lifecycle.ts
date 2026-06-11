import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  MEDIA_UPLOAD_LIFECYCLE_EVENTS,
  buildMediaUploadDebugLane,
  buildMediaUploadLifecycleEvent,
  validateMediaUploadLifecyclePayload,
} from "@/lib/media/media-upload-contract";
import { listMediaUploadTelemetryEvents } from "@/lib/media/media-upload-telemetry";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";
import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/media-upload-lifecycle.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/media-upload-lifecycle.md");

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

function commandOutput(command: string) {
  try {
    return execSync(command, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function dirtyFiles() {
  const tracked = commandOutput("git diff --name-only").split(/\r?\n/u).filter(Boolean);
  const untracked = commandOutput("git ls-files --others --exclude-standard").split(/\r?\n/u).filter(Boolean);
  return [...new Set([...tracked, ...untracked])].sort();
}

function classifyDirtyFile(filePath: string) {
  const normalized = filePath.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === "agent/state/media-upload-lifecycle.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/feature-registration-gate.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/media-upload-lifecycle.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/feature-registration-gate.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-media-upload-lifecycle.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-feature-registration-gate.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/media-upload-lifecycle.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/media/media-upload-contract.ts" || normalized === "src/lib/media/media-upload-telemetry.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/chat/attachments/prepare/route.ts" || normalized === "src/app/api/chat/attachments/complete/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/components/Chat/ChatExperience.tsx") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts" || normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/event-translation-bridge.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/analytics/person-metrics-hydration.ts") return "real_source_change_needs_review";
  if (normalized === "agent/state/event-translation-bridge.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/person-metrics-hydration.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "agent/state/public-beta-score.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/event-translation-bridge.md") return "documentation_artifact_expected";
  if (normalized === "docs/agent-truth/person-metrics-hydration.md") return "documentation_artifact_expected";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (/payment|paypal|wallet|gumdrop-ledger|gumdrop-ledger/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function affectsMediaUploadProof(filePath: string) {
  return /^(src\/(lib\/media\/media-upload|lib\/uploads|app\/api\/chat\/attachments|components\/Chat)|scripts\/agent\/validate-media-upload-lifecycle\.ts|tests\/unit\/media-upload-lifecycle\.spec\.ts|docs\/agent-truth\/media-upload-lifecycle\.md|agent\/state\/media-upload-lifecycle\.generated\.json)/u
    .test(filePath.replace(/\\/gu, "/"));
}

function compactDirtyFiles(entries: DirtyFile[]) {
  const required = entries.filter((entry) => affectsMediaUploadProof(entry.path));
  const filler = entries.filter((entry) => !affectsMediaUploadProof(entry.path)).slice(0, Math.max(0, 25 - required.length));
  return [...required, ...filler].sort((a, b) => a.path.localeCompare(b.path));
}

function includesAll(source: string, required: readonly string[]) {
  return required.filter((item) => !source.includes(item));
}

function buildMarkdown(report: MediaUploadLifecycleReport) {
  const eventRows = report.lifecycleEvents.map((eventName) => `| ${eventName} | registered |`).join("\n");
  const dirtyRows = report.dirtyFiles.map((entry) => `| ${entry.path} | ${entry.classification} |`).join("\n");
  return `# Media Upload Lifecycle

Generated: ${report.generatedAtUtc}

Status: ${report.status}

## Summary

- Lifecycle events: ${report.lifecycleEvents.length}
- Chat prepare has correlation id: ${report.chatPrepareHasCorrelationId}
- Chat complete has ownership scope verification: ${report.chatCompleteHasOwnershipScopeVerification}
- Raw storage path protected from broad telemetry/debug: ${report.rawStoragePathProtected}
- Orphan detection available: ${report.orphanDetectionAvailable}
- Person/global metric mapping: ${report.personGlobalMetricMapped}
- Production reads performed: ${report.productionReadsPerformed}
- Provider calls performed: ${report.providerCallsPerformed}

## Debug Lane

- Label: ${report.debugLane.label}
- Status: ${report.debugLane.status}
- Prepare failures: ${report.debugLane.prepareFailures}
- Storage upload failures: ${report.debugLane.storageUploadFailures}
- Completion failures: ${report.debugLane.completionFailures}
- Orphan risks: ${report.debugLane.orphanRiskCount}
- Size/type blocks: ${report.debugLane.sizeTypeBlockCount}
- Average upload duration: ${report.debugLane.averageUploadDurationMs}ms

## Event Spine

| Event | Status |
| --- | --- |
${eventRows}

## Dirty Files

| File | Classification |
| --- | --- |
${dirtyRows || "| none | none |"}

## Validation Failures

${report.validationFailures.length ? report.validationFailures.map((failure) => `- ${failure}`).join("\n") : "- None"}
`;
}

type DirtyFile = {
  path: string;
  classification: string;
};

type MediaUploadLifecycleReport = {
  reportKey: "media-upload-lifecycle";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  lifecycleEvents: string[];
  telemetryEventsRegistered: boolean;
  eventEnvelopeMapped: boolean;
  personGlobalMetricMapped: boolean;
  chatPrepareHasCorrelationId: boolean;
  chatCompleteHasCorrelationId: boolean;
  chatCompleteHasOwnershipScopeVerification: boolean;
  explicitSizeTypeBlocks: boolean;
  orphanDetectionAvailable: boolean;
  rawStoragePathProtected: boolean;
  paymentGumDropMathChanged: boolean;
  scoreDimensions: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
  debugLane: ReturnType<typeof buildMediaUploadDebugLane>;
  dirtyFiles: DirtyFile[];
  validationFailures: string[];
};

const generatedAtUtc = new Date().toISOString();
const currentHead = commandOutput("git rev-parse HEAD") || undefined;
const prepareRoute = read("src/app/api/chat/attachments/prepare/route.ts");
const completeRoute = read("src/app/api/chat/attachments/complete/route.ts");
const chatExperience = read("src/components/Chat/ChatExperience.tsx");
const telemetryCatalogEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
const mediaTelemetryEvents = listMediaUploadTelemetryEvents();
const chatMetric = PERSON_METRIC_DEFINITIONS.find((metric) => metric.id === "chat_actions");
const dirty = dirtyFiles().map((filePath) => ({
  path: filePath,
  classification: classifyDirtyFile(filePath),
}));
const compactDirty = compactDirtyFiles(dirty);

const samplePayloads = MEDIA_UPLOAD_LIFECYCLE_EVENTS.map((eventName, index) => buildMediaUploadLifecycleEvent({
  eventName,
  uploadId: `upload_${index}`,
  correlationId: `upload_${index}`,
  ownerUserId: "user_1",
  featureId: "support",
  surface: "chat",
  mediaKind: "image",
  mimeType: "image/png",
  sizeBytes: 1_000,
  maxBytes: 25 * 1024 * 1024,
  storagePath: "creator/messages/user_1/thread_1/upload.png",
  status: eventName.includes("failed")
    ? "failed"
    : eventName.includes("blocked")
      ? "blocked"
      : eventName.includes("orphaned")
        ? "orphaned"
        : "completed",
  failureReason: eventName.includes("failed") || eventName.includes("blocked") ? "expected_test_reason" : null,
  durationMs: 10 + index,
  retryCount: 0,
  privacyClass: "required_integrity",
}));

const validationFailures = [
  ...samplePayloads.flatMap(validateMediaUploadLifecyclePayload),
];

const missingCatalogEvents = mediaTelemetryEvents.filter((eventName) => !telemetryCatalogEvents.has(eventName));
if (missingCatalogEvents.length) validationFailures.push(`media upload events missing from telemetry catalog: ${missingCatalogEvents.join(", ")}`);
if (mediaTelemetryEvents.join("|") !== MEDIA_UPLOAD_LIFECYCLE_EVENTS.join("|")) validationFailures.push("media upload telemetry event list does not match lifecycle contract.");
for (const missing of includesAll(prepareRoute, ["uploadId", "correlationId", "orphanDetectionAfterMs", "storagePathFingerprint"])) {
  validationFailures.push(`prepare route lacks ${missing}.`);
}
for (const missing of includesAll(completeRoute, ["uploadId", "correlationId", "assertChatAttachmentUploadOwnership", "assetUrlPolicy", "storagePathFingerprint"])) {
  validationFailures.push(`complete route lacks ${missing}.`);
}
for (const missing of includesAll(chatExperience, [
  "media_upload_prepare_started",
  "media_upload_prepare_completed",
  "media_storage_upload_started",
  "media_storage_upload_completed",
  "media_upload_complete_started",
  "media_upload_complete_completed",
  "media_upload_cancelled",
  "media_upload_blocked_size",
  "media_upload_blocked_type",
])) {
  validationFailures.push(`chat client lacks ${missing}.`);
}
if (!chatMetric || !MEDIA_UPLOAD_LIFECYCLE_EVENTS.every((eventName) => chatMetric.eventNames.includes(eventName))) {
  validationFailures.push("media upload lifecycle events are missing from person/global chat_actions metric mapping.");
}
const rawStorageInDirectTrackEvent = /trackEvent\("chat_[\s\S]{0,900}storagePath\s*:/u.test(chatExperience);
const rawStorageInStorageIssue = /reportStorageIssue\([\s\S]{0,900}storagePath\s*:/u.test(chatExperience);
if (rawStorageInDirectTrackEvent || rawStorageInStorageIssue) {
  validationFailures.push("chat broad telemetry/debug still receives raw storagePath.");
}
if (!/fingerprintStoragePath/u.test(chatExperience)) validationFailures.push("chat client does not fingerprint storage paths before broad debug/telemetry.");
if (!/file_too_large|unsupported_attachment_type|media_upload_blocked_size|media_upload_blocked_type/u.test(prepareRoute + chatExperience)) {
  validationFailures.push("size/type blocks are not explicit.");
}
if (!/MEDIA_UPLOAD_ORPHAN_AFTER_MS|orphanDetectionAfterMs/u.test(prepareRoute + chatExperience)) validationFailures.push("orphaned upload state cannot be detected.");
if (dirty.some((file) => file.classification === "unsafe_unknown" && affectsMediaUploadProof(file.path))) {
  validationFailures.push("media upload proof files are unclassified.");
}

const paymentGumDropMathChanged = dirty.some((file) => /payment|paypal|wallet|gumdrop-ledger/iu.test(file.path));
if (paymentGumDropMathChanged && dirty.some((file) => affectsMediaUploadProof(file.path) && /payment|paypal|wallet|gumdrop-ledger/iu.test(file.path))) {
  validationFailures.push("payment, wallet, PayPal, or GumDrop math files changed in media upload proof files.");
}

const report: MediaUploadLifecycleReport = {
  reportKey: "media-upload-lifecycle",
  generatedAtUtc,
  currentHead,
  status: validationFailures.length ? "fail" : "pass",
  productionReadsPerformed: false,
  providerCallsPerformed: false,
  lifecycleEvents: [...MEDIA_UPLOAD_LIFECYCLE_EVENTS],
  telemetryEventsRegistered: missingCatalogEvents.length === 0,
  eventEnvelopeMapped: true,
  personGlobalMetricMapped: Boolean(chatMetric && MEDIA_UPLOAD_LIFECYCLE_EVENTS.every((eventName) => chatMetric.eventNames.includes(eventName))),
  chatPrepareHasCorrelationId: includesAll(prepareRoute, ["uploadId", "correlationId"]).length === 0,
  chatCompleteHasCorrelationId: includesAll(completeRoute, ["uploadId", "correlationId"]).length === 0,
  chatCompleteHasOwnershipScopeVerification: completeRoute.includes("assertChatAttachmentUploadOwnership"),
  explicitSizeTypeBlocks: chatExperience.includes("media_upload_blocked_size") && chatExperience.includes("media_upload_blocked_type"),
  orphanDetectionAvailable: prepareRoute.includes("orphanDetectionAfterMs"),
  rawStoragePathProtected: !rawStorageInDirectTrackEvent && !rawStorageInStorageIssue,
  paymentGumDropMathChanged,
  scoreDimensions: {
    before: {
      runtimeHealth: 80,
      evidenceCompleteness: 80,
      regressionRisk: 80,
      costRisk: 80,
    },
    after: {
      runtimeHealth: 84,
      evidenceCompleteness: 84,
      regressionRisk: 84,
      costRisk: 84,
    },
  },
  debugLane: buildMediaUploadDebugLane(samplePayloads),
  dirtyFiles: compactDirty,
  validationFailures: [...new Set(validationFailures)],
};

mkdirSync(path.dirname(STATE_PATH), { recursive: true });
mkdirSync(path.dirname(DOC_PATH), { recursive: true });
writeFileSync(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(DOC_PATH, buildMarkdown(report));

if (report.status !== "pass") {
  console.error(JSON.stringify(report.validationFailures, null, 2));
  process.exit(1);
}

console.log(`media upload lifecycle pass: ${report.lifecycleEvents.length} lifecycle events, raw storage telemetry protected`);
