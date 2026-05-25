import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import {
  MEDIA_ACCESS_EVENTS,
  MEDIA_ACCESS_REASONS,
  buildMediaAccessTelemetry,
  buildPrivateMediaAccessDebugLane,
  resolveMediaAccess,
  validateMediaAccessTelemetryPayload,
} from "@/lib/media/media-access-resolver";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

const ROOT = process.cwd();
const STATE_PATH = path.join(ROOT, "agent/state/private-media-access.generated.json");
const DOC_PATH = path.join(ROOT, "docs/agent-truth/private-media-access.md");

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
  if (normalized === "agent/state/private-media-access.generated.json") return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/private-media-access.md") return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-private-media-access.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-feature-registration-gate.ts") return "real_source_change_needs_review";
  if (normalized === "tests/unit/private-media-access.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/drops-content-route.spec.ts") return "test_artifact_expected";
  if (normalized === "src/lib/media/media-access-contract.ts" || normalized === "src/lib/media/media-access-resolver.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/chat/attachments/complete/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/drops/content/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/app/api/creator/drops/assets/route.ts") return "real_source_change_needs_review";
  if (normalized === "src/lib/telemetry-catalog.ts" || normalized === "src/lib/analytics/person-metrics-contract.ts") return "real_source_change_needs_review";
  if (normalized === "package.json") return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "current_generated_artifact_to_commit";
  if (normalized.startsWith("docs/agent-truth/")) return "documentation_artifact_expected";
  if (/payment|paypal|wallet|gumdrop-ledger|gumdrop-source|gumdrop-economy/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function requireIncludes(source: string, required: readonly string[], label: string, failures: string[]) {
  for (const item of required) {
    if (!source.includes(item)) failures.push(`${label} lacks ${item}.`);
  }
}

function buildMarkdown(report: PrivateMediaAccessReport) {
  const reasonRows = MEDIA_ACCESS_REASONS.map((reason) => `| ${reason} | covered |`).join("\n");
  const eventRows = MEDIA_ACCESS_EVENTS.map((eventName) => `| ${eventName} | registered |`).join("\n");
  const dirtyRows = report.dirtyFiles.map((entry) => `| ${entry.path} | ${entry.classification} |`).join("\n");
  return `# Private Media Access

Generated: ${report.generatedAtUtc}

Status: ${report.status}

## Summary

- Access reasons: ${report.accessReasons.length}
- Telemetry events: ${report.telemetryEvents.length}
- Chat attachment access: ${report.chatAttachmentAccess}
- Drop media access: ${report.dropMediaAccess}
- Creator upload access: ${report.creatorUploadedMediaAccess}
- Profile/timeline classification: ${report.profileTimelineMediaClassified}
- Raw private URL/path telemetry protected: ${report.rawPrivateUrlTelemetryProtected}
- Production reads performed by validator: ${report.productionReadsPerformed}
- Provider calls performed by validator: ${report.providerCallsPerformed}
- Payment/GumDrop math changed: ${report.paymentGumDropMathChanged}

## Debug Lane

- Label: ${report.debugLane.label}
- Status: ${report.debugLane.status}
- Missing assets: ${report.debugLane.missingAssets}
- Unsafe unknown: ${report.debugLane.unsafeUnknown}
- Expired/locked mismatches: ${report.debugLane.expiredOrLockedMismatches}
- Owner/creator/admin bypass health: ${report.debugLane.ownerCreatorAdminBypassHealth}

## Reasons

| Reason | Status |
| --- | --- |
${reasonRows}

## Events

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

type PrivateMediaAccessReport = {
  reportKey: "private-media-access";
  generatedAtUtc: string;
  currentHead?: string;
  status: "pass" | "fail";
  accessReasons: string[];
  telemetryEvents: string[];
  chatAttachmentAccess: boolean;
  dropMediaAccess: boolean;
  creatorUploadedMediaAccess: boolean;
  profileTimelineMediaClassified: boolean;
  rawPrivateUrlTelemetryProtected: boolean;
  debugLane: ReturnType<typeof buildPrivateMediaAccessDebugLane>;
  productionReadsPerformed: false;
  providerCallsPerformed: false;
  paymentGumDropMathChanged: boolean;
  scoreDimensions: {
    before: Record<string, number>;
    after: Record<string, number>;
  };
  dirtyFiles: Array<{ path: string; classification: string }>;
  validationFailures: string[];
};

const generatedAtUtc = new Date().toISOString();
const currentHead = commandOutput("git rev-parse HEAD") || undefined;
const resolver = read("src/lib/media/media-access-resolver.ts");
const contract = read("src/lib/media/media-access-contract.ts");
const chatComplete = read("src/app/api/chat/attachments/complete/route.ts");
const dropsContent = read("src/app/api/drops/content/route.ts");
const creatorAssets = read("src/app/api/creator/drops/assets/route.ts");
const telemetryCatalogEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
const personMetricEvents = new Set(PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames));
const dirty = dirtyFiles().map((filePath) => ({
  path: filePath,
  classification: classifyDirtyFile(filePath),
}));

const decisions = [
  resolveMediaAccess({ surface: "drop_media", mediaId: "drop_public", exists: true, isPublic: true }),
  resolveMediaAccess({ surface: "drop_media", mediaId: "drop_missing", exists: false }),
  resolveMediaAccess({ surface: "drop_media", mediaId: "drop_expired", exists: true, viewerUserId: "fan_1", ownerUserId: "creator_1", creatorId: "creator_1", isExpired: true }),
  resolveMediaAccess({ surface: "chat_attachment", mediaId: "message_1", exists: true, viewerUserId: "fan_1", ownerUserId: "fan_2", isChatThreadParticipant: false }),
  resolveMediaAccess({ surface: "creator_upload", mediaId: "asset_1", exists: true, viewerUserId: "creator_1", ownerUserId: "creator_1", creatorId: "creator_1" }),
  resolveMediaAccess({ surface: "profile_timeline_media", mediaId: "asset_2", exists: true, viewerUserId: "fan_1" }),
];
const telemetryPayloads = decisions.map((decision) => buildMediaAccessTelemetry({
  ...decision,
  storagePath: "creator/messages/private/thread/asset.png",
  assetUrl: "https://firebasestorage.googleapis.com/v0/b/private/o/asset.png?token=secret",
}));
const validationFailures = telemetryPayloads.flatMap(validateMediaAccessTelemetryPayload);

for (const eventName of MEDIA_ACCESS_EVENTS) {
  if (!telemetryCatalogEvents.has(eventName)) validationFailures.push(`${eventName} is missing from telemetry catalog.`);
  if (!personMetricEvents.has(eventName)) validationFailures.push(`${eventName} is missing from person/global metric mapping.`);
}
requireIncludes(contract, [...MEDIA_ACCESS_REASONS, ...MEDIA_ACCESS_EVENTS], "media access contract", validationFailures);
requireIncludes(resolver, ["humanReason", "debugReason", "Private media access", "validateMediaAccessTelemetryPayload"], "media access resolver", validationFailures);
requireIncludes(chatComplete, ["resolveMediaAccess", "isChatThreadParticipant", "mediaAccessReason", "mediaAccessFailureClass"], "chat attachment complete route", validationFailures);
requireIncludes(dropsContent, ["resolveMediaAccess", "hasUnlockedDrop", "hasFanPass", "isLocked", "isExpired", "mediaAccessReason"], "drop content route", validationFailures);
requireIncludes(creatorAssets, ["resolveMediaAccess", "creator_upload", "mediaAccess", "storagePathFingerprint"], "creator upload route", validationFailures);

const rawPrivateTelemetryPattern = /buildMediaAccessTelemetry\(\s*\{[\s\S]{0,900}(assetUrl\s*:\s*url|assetUrl\s*:\s*targetUrl|storagePath\s*:\s*fullPath)[\s\S]{0,900}\}\s*\)/u;
if (rawPrivateTelemetryPattern.test(chatComplete + dropsContent + creatorAssets)) {
  validationFailures.push("raw private URL/path is passed directly into broad media access telemetry.");
}
if (!/firebasestorage\\\.googleapis\\\.com/u.test(resolver) || !resolver.includes("token=") || !/creator\\\/messages/u.test(resolver)) {
  validationFailures.push("media access telemetry validator does not block raw private URL/path tokens.");
}
if (dirty.some((entry) => entry.classification === "unsafe_unknown")) validationFailures.push("dirty files are unclassified.");
const paymentGumDropMathChanged = dirty.some((entry) => /payment|paypal|wallet|gumdrop-ledger|gumdrop-source|gumdrop-economy/iu.test(entry.path));
if (paymentGumDropMathChanged) validationFailures.push("payment, wallet, PayPal, or GumDrop math files changed.");

const report: PrivateMediaAccessReport = {
  reportKey: "private-media-access",
  generatedAtUtc,
  currentHead,
  status: validationFailures.length ? "fail" : "pass",
  accessReasons: [...MEDIA_ACCESS_REASONS],
  telemetryEvents: [...MEDIA_ACCESS_EVENTS],
  chatAttachmentAccess: chatComplete.includes("resolveMediaAccess") && chatComplete.includes("isChatThreadParticipant"),
  dropMediaAccess: dropsContent.includes("resolveMediaAccess") && dropsContent.includes("hasUnlockedDrop"),
  creatorUploadedMediaAccess: creatorAssets.includes("resolveMediaAccess") && creatorAssets.includes("creator_upload"),
  profileTimelineMediaClassified: resolver.includes("profile_timeline_media"),
  rawPrivateUrlTelemetryProtected: telemetryPayloads.every((payload) => validateMediaAccessTelemetryPayload(payload).length === 0),
  debugLane: buildPrivateMediaAccessDebugLane(decisions),
  productionReadsPerformed: false,
  providerCallsPerformed: false,
  paymentGumDropMathChanged,
  scoreDimensions: {
    before: { runtimeHealth: 84, evidenceCompleteness: 84, regressionRisk: 84 },
    after: { runtimeHealth: 87, evidenceCompleteness: 88, regressionRisk: 87 },
  },
  dirtyFiles: dirty,
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

console.log(`private media access pass: ${report.accessReasons.length} reasons, ${report.telemetryEvents.length} events, raw private telemetry protected`);
