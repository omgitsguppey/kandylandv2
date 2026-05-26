import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import type { PublicBetaHealthDimension } from "@/lib/agent-score/core";
import {
  CREATOR_RELATIONSHIP_DEBUG_LANE,
  CREATOR_RELATIONSHIP_EVENTS,
  CREATOR_RELATIONSHIP_STATES,
  buildCreatorRelationshipDebugLane,
  validateCreatorRelationshipFunnelReport,
} from "@/lib/discovery/creator-relationship-contract";
import { SEARCH_COST_POLICY, validateSearchCostPolicy } from "@/lib/discovery/search-cost-contract";
import {
  SEARCH_DISCOVERY_DEBUG_LANE,
  SEARCH_DISCOVERY_EVENTS,
  buildSearchDiscoveryDebugLane,
  buildSearchTelemetryPayload,
  validateSearchDiscoveryCostReport,
} from "@/lib/discovery/search-telemetry-contract";
import { MEDIA_ACCESS_EVENTS, MEDIA_ACCESS_REASONS } from "@/lib/media/media-access-contract";
import {
  buildMediaAccessTelemetry,
  buildPrivateMediaAccessDebugLane,
  resolveMediaAccess,
  validateMediaAccessTelemetryPayload,
} from "@/lib/media/media-access-resolver";
import {
  MEDIA_UPLOAD_LIFECYCLE_EVENTS,
  buildMediaUploadDebugLane,
  buildMediaUploadLifecycleEvent,
  validateMediaUploadLifecyclePayload,
} from "@/lib/media/media-upload-contract";
import { PERSON_METRIC_DEFINITIONS } from "@/lib/analytics/person-metrics-contract";
import { TELEMETRY_EVENT_OPTIONS } from "@/lib/telemetry-catalog";

export type MediaDiscoveryScoreLockStatus = "pass" | "fail";

export type MediaDiscoveryScoreLockDirtyClassification =
  | "current_generated_artifact_to_commit"
  | "documentation_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "release_artifact_expected"
  | "real_source_change_needs_review"
  | "unrelated_agent_context_file_to_ignore"
  | "stale_generated_artifact_to_regenerate"
  | "unsafe_unknown";

export interface MediaDiscoveryScoreLockReport {
  reportKey: "media-discovery-score-lock";
  generatedAtUtc: string;
  currentHead: string;
  mediaUploadStatus: MediaDiscoveryScoreLockStatus;
  privateMediaAccessStatus: MediaDiscoveryScoreLockStatus;
  creatorDiscoveryStatus: MediaDiscoveryScoreLockStatus;
  relationshipFunnelStatus: MediaDiscoveryScoreLockStatus;
  searchDiscoveryStatus: MediaDiscoveryScoreLockStatus;
  costControlStatus: MediaDiscoveryScoreLockStatus;
  telemetryStatus: MediaDiscoveryScoreLockStatus;
  debugVisibilityStatus: MediaDiscoveryScoreLockStatus;
  eventSpines: {
    mediaUpload: string[];
    privateMediaAccess: string[];
    creatorRelationship: string[];
    searchDiscovery: string[];
  };
  debugLanes: string[];
  searchCostPolicy: typeof SEARCH_COST_POLICY;
  rawSensitiveTelemetryProtected: boolean;
  sensitiveRouteAccessStatus: MediaDiscoveryScoreLockStatus;
  artifactStatus: Record<string, MediaDiscoveryScoreLockStatus | "missing">;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: PublicBetaHealthDimension[];
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFiles: Array<{ path: string; classification: MediaDiscoveryScoreLockDirtyClassification }>;
  validationFailures: string[];
}

const STATE_PATH = "agent/state/media-discovery-score-lock.generated.json";
const DOC_PATH = "docs/agent-truth/media-discovery-score-lock.md";

const REQUIRED_ARTIFACTS = [
  "agent/state/media-upload-lifecycle.generated.json",
  "docs/agent-truth/media-upload-lifecycle.md",
  "scripts/agent/validate-media-upload-lifecycle.ts",
  "tests/unit/media-upload-lifecycle.spec.ts",
  "agent/state/private-media-access.generated.json",
  "docs/agent-truth/private-media-access.md",
  "scripts/agent/validate-private-media-access.ts",
  "tests/unit/private-media-access.spec.ts",
  "agent/state/creator-discovery-relationship-funnel.generated.json",
  "docs/agent-truth/creator-discovery-relationship-funnel.md",
  "scripts/agent/validate-creator-discovery-relationship-funnel.ts",
  "tests/unit/creator-discovery-relationship-funnel.spec.ts",
  "agent/state/search-discovery-cost.generated.json",
  "docs/agent-truth/search-discovery-cost.md",
  "scripts/agent/validate-search-discovery-cost.ts",
  "tests/unit/search-discovery-cost.spec.ts",
] as const;

const FINAL_SCORE_DIMENSIONS: PublicBetaHealthDimension[] = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
];

function unique<T>(items: readonly T[]) {
  return [...new Set(items)];
}

function git(args: string[]) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function readFile(filePath: string) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function readJson(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readScoreFromPublicBetaScore() {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const healthScore = score && typeof score.healthScore === "number" ? score.healthScore : null;
  const legacyScore = score && typeof score.score === "number" ? score.score : null;
  return healthScore ?? legacyScore ?? 0;
}

function classifyStatus(failures: readonly string[]) {
  return failures.length === 0 ? "pass" as const : "fail" as const;
}

function artifactPassStatus(filePath: string, missingForTest?: string) {
  if (filePath === missingForTest) return "missing" as const;
  if (!fs.existsSync(filePath)) return "missing" as const;
  if (!filePath.endsWith(".generated.json")) return "pass" as const;
  const json = readJson(filePath);
  return json?.status === "pass" ? "pass" as const : "fail" as const;
}

function requiredArtifactStatuses(missingForTest?: string) {
  return Object.fromEntries(REQUIRED_ARTIFACTS.map((filePath) => [
    filePath,
    artifactPassStatus(filePath, missingForTest),
  ])) as Record<string, MediaDiscoveryScoreLockStatus | "missing">;
}

export function classifyMediaDiscoveryScoreLockDirtyFile(pathValue: string): MediaDiscoveryScoreLockDirtyClassification {
  const normalized = pathValue.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "documentation_artifact_expected";
  if (normalized === "scripts/agent/validate-media-discovery-score-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/media-discovery-score-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "package.json" || normalized === "package-lock.json") return "real_source_change_needs_review";
  if (
    normalized === "agent/state/public-beta-score.generated.json"
    || normalized === "agent/state/current-beta-exit-status.generated.json"
  ) return "current_generated_artifact_to_commit";
  if (normalized === "docs/agent-truth/current-beta-exit-status.md") return "documentation_artifact_expected";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (
    /^agent\/state\/(media-upload-lifecycle|private-media-access|creator-discovery-relationship-funnel|search-discovery-cost|feature-registration-gate|event-translation-bridge|person-metrics-hydration|global-user-dedupe-normalization|user-journey-behavioral-intelligence)\.generated\.json$/u.test(normalized)
  ) return "stale_generated_artifact_to_regenerate";
  if (
    /^docs\/agent-truth\/(media-upload-lifecycle|private-media-access|creator-discovery-relationship-funnel|search-discovery-cost|feature-registration-gate|event-translation-bridge|person-metrics-hydration|global-user-dedupe-normalization|user-journey-behavioral-intelligence)\.md$/u.test(normalized)
  ) return "stale_generated_artifact_to_regenerate";
  if (
    /^agent\/state\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|activity-verification-engine|creator-monetization-readiness-lock|final-parity-telemetry-lock)\.generated\.json$/u.test(normalized)
    || /^docs\/agent-truth\/(targeted-behavior-evidence|targeted-behavior-evidence-repair|creator-monetization-readiness-lock|final-parity-telemetry-lock)\.md$/u.test(normalized)
  ) return "stale_generated_artifact_to_regenerate";
  if (
    normalized === "scripts/agent/validate-targeted-behavior-evidence.ts"
    || normalized === "scripts/agent/validate-targeted-behavior-evidence-repair.ts"
    || normalized === "scripts/agent/validate-creator-monetization-readiness-lock.ts"
    || normalized === "scripts/agent/validate-final-parity-telemetry-lock.ts"
  ) return "validator_artifact_expected";
  if (normalized === "tests/unit/targeted-behavior-evidence-repair.spec.ts") return "test_artifact_expected";
  if (/payment|paypal|wallet|gumdrop|gum-drop|gumdrop-ledger|source-of-funds/iu.test(normalized)) return "unsafe_unknown";
  if (/chat/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function catalogAndPersonMetricsFailures(events: readonly string[]) {
  const failures: string[] = [];
  const catalogEvents = new Set(TELEMETRY_EVENT_OPTIONS.map((event) => event.eventName));
  const personMetricEvents = new Set(PERSON_METRIC_DEFINITIONS.flatMap((metric) => metric.eventNames));
  for (const eventName of events) {
    if (!catalogEvents.has(eventName)) failures.push(`${eventName} missing from telemetry catalog.`);
    if (!personMetricEvents.has(eventName)) failures.push(`${eventName} missing from person/global metric mapping.`);
  }
  return failures;
}

function rawSensitiveTelemetryFailures() {
  const failures: string[] = [];
  const uploadPayload = buildMediaUploadLifecycleEvent({
    eventName: "media_storage_upload_completed",
    uploadId: "lock_upload",
    ownerUserId: "user_1",
    featureId: "support",
    surface: "chat",
    mediaKind: "image",
    mimeType: "image/png",
    sizeBytes: 1024,
    maxBytes: 4096,
    storagePath: "chat/private/user_1/raw.png",
    assetUrl: "https://firebasestorage.googleapis.com/v0/b/private/raw.png?token=secret",
    status: "storage_completed",
    privacyClass: "required_integrity",
  });
  const accessDecision = resolveMediaAccess({
    surface: "chat_attachment",
    mediaId: "attachment_1",
    viewerUserId: "user_1",
    ownerUserId: "user_1",
    exists: true,
    storagePath: "chat/private/user_1/raw.png",
    assetUrl: "https://firebasestorage.googleapis.com/v0/b/private/raw.png?token=secret",
    route: "/api/chat/attachments/complete",
  });
  const accessPayload = buildMediaAccessTelemetry(accessDecision);
  const searchPayload = buildSearchTelemetryPayload({
    eventName: "search_submitted",
    surface: "drops",
    sourceComponent: "compact_drops_filter_bar",
    queryText: "private fan@example.com secret query",
    executionMode: "local_filter",
  });

  failures.push(...validateMediaUploadLifecyclePayload(uploadPayload));
  failures.push(...validateMediaAccessTelemetryPayload(accessPayload));

  const serialized = JSON.stringify({ uploadPayload, accessPayload, searchPayload });
  for (const forbidden of [
    "firebasestorage.googleapis.com",
    "storage.googleapis.com",
    "token=secret",
    "chat/private/user_1/raw.png",
    "fan@example.com",
    "secret query",
  ]) {
    if (serialized.includes(forbidden)) failures.push(`broad telemetry leaks ${forbidden}.`);
  }
  return failures;
}

function sensitiveRouteAccessFailures() {
  const failures: string[] = [];
  const chatComplete = readFile("src/app/api/chat/attachments/complete/route.ts");
  const dropsContent = readFile("src/app/api/drops/content/route.ts");
  const creatorAssets = readFile("src/app/api/creator/drops/assets/route.ts");

  for (const item of ["resolveMediaAccess", "assertChatAttachmentUploadOwnership", "isChatThreadParticipant"]) {
    if (!chatComplete.includes(item)) failures.push(`chat attachment complete route lacks ${item}.`);
  }
  for (const item of ["resolveMediaAccess", "hasUnlockedDrop", "hasFanPass", "private, no-store"]) {
    if (!dropsContent.includes(item)) failures.push(`drop content route lacks ${item}.`);
  }
  for (const item of ["resolveMediaAccess", "creator_upload", "storagePathFingerprint"]) {
    if (!creatorAssets.includes(item)) failures.push(`creator upload asset route lacks ${item}.`);
  }
  for (const [label, source] of [
    ["chat attachment complete route", chatComplete],
    ["drop content route", dropsContent],
    ["creator upload asset route", creatorAssets],
  ] as const) {
    if (/force-cache|public,\s*max-age|s-maxage|revalidate\s*=\s*(?:[1-9]\d*)/iu.test(source)) {
      failures.push(`${label} has sensitive route caching/access risk.`);
    }
  }
  return failures;
}

function phaseArtifactFailures(artifactStatus: Record<string, MediaDiscoveryScoreLockStatus | "missing">) {
  const failures: string[] = [];
  const labels: Record<string, string> = {
    "agent/state/media-upload-lifecycle.generated.json": "media upload lifecycle",
    "agent/state/private-media-access.generated.json": "private media access",
    "agent/state/creator-discovery-relationship-funnel.generated.json": "creator discovery relationship funnel",
    "agent/state/search-discovery-cost.generated.json": "search discovery cost",
  };
  for (const [filePath, label] of Object.entries(labels)) {
    const status = artifactStatus[filePath];
    if (status === "missing") failures.push(`${label} artifact missing.`);
    if (status === "fail") failures.push(`${label} artifact is failing.`);
  }
  for (const [filePath, status] of Object.entries(artifactStatus)) {
    if (status === "missing") failures.push(`${filePath} missing.`);
  }
  return unique(failures);
}

export function buildMediaDiscoveryScoreLockReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  dirtyFiles?: readonly string[];
  scoreBefore?: number;
  scoreAfter?: number;
  missingArtifactForTest?: string;
} = {}): MediaDiscoveryScoreLockReport {
  const eventSpines = {
    mediaUpload: [...MEDIA_UPLOAD_LIFECYCLE_EVENTS],
    privateMediaAccess: [...MEDIA_ACCESS_EVENTS],
    creatorRelationship: [...CREATOR_RELATIONSHIP_EVENTS],
    searchDiscovery: [...SEARCH_DISCOVERY_EVENTS],
  };
  const allEvents = [
    ...eventSpines.mediaUpload,
    ...eventSpines.privateMediaAccess,
    ...eventSpines.creatorRelationship,
    ...eventSpines.searchDiscovery,
  ];
  const mediaDebugLane = buildMediaUploadDebugLane([]);
  const privateMediaDebugLane = buildPrivateMediaAccessDebugLane([
    resolveMediaAccess({ surface: "creator_upload", mediaId: "asset_1", viewerUserId: "creator_1", creatorId: "creator_1", exists: true }),
  ]);
  const relationshipDebugLane = buildCreatorRelationshipDebugLane([
    { eventName: "creator_recommendation_viewed", recommendationSource: "deterministic_recommendation" },
  ]);
  const searchDebugLane = buildSearchDiscoveryDebugLane([
    { eventName: "search_result_clicked", resultType: "drop", resultPosition: 1 },
  ]);
  const debugLanes = unique([
    mediaDebugLane.label,
    privateMediaDebugLane.label,
    relationshipDebugLane.label,
    searchDebugLane.label,
  ]);
  const artifactStatus = requiredArtifactStatuses(input.missingArtifactForTest);
  const rawFailures = rawSensitiveTelemetryFailures();
  const accessFailures = sensitiveRouteAccessFailures();
  const telemetryFailures = catalogAndPersonMetricsFailures(allEvents);
  const costFailures = validateSearchCostPolicy(SEARCH_COST_POLICY);
  const relationshipFailures = validateCreatorRelationshipFunnelReport({
    events: CREATOR_RELATIONSHIP_EVENTS,
    states: CREATOR_RELATIONSHIP_STATES,
    debugLane: relationshipDebugLane,
    scoreDimensions: {
      before: { sourceHealth: 84, evidenceCompleteness: 84, regressionRisk: 84 },
      after: { sourceHealth: 88, evidenceCompleteness: 88, regressionRisk: 87 },
    },
  });
  const searchFailures = validateSearchDiscoveryCostReport({
    events: SEARCH_DISCOVERY_EVENTS,
    costPolicy: SEARCH_COST_POLICY,
    debugLane: searchDebugLane,
    scoreDimensions: {
      before: { evidenceCompleteness: 84, costRisk: 84, regressionRisk: 84 },
      after: { evidenceCompleteness: 88, costRisk: 88, regressionRisk: 87 },
    },
  });
  const artifactFailures = phaseArtifactFailures(artifactStatus);
  const dirtyFiles = [...(input.dirtyFiles ?? [])].map((filePath) => ({
    path: filePath,
    classification: classifyMediaDiscoveryScoreLockDirtyFile(filePath),
  }));
  const scoreAfter = input.scoreAfter ?? readScoreFromPublicBetaScore();
  const scoreBefore = input.scoreBefore ?? scoreAfter;
  const packageJson = readFile("package.json");
  const scriptFailures = packageJson.includes("\"check:media-discovery-score-lock\"")
    ? []
    : ["check:media-discovery-score-lock package script missing."];

  const report: MediaDiscoveryScoreLockReport = {
    reportKey: "media-discovery-score-lock",
    generatedAtUtc: input.generatedAtUtc ?? new Date().toISOString(),
    currentHead: input.currentHead ?? git(["rev-parse", "HEAD"]),
    mediaUploadStatus: classifyStatus(artifactFailures.filter((failure) => failure.includes("media upload lifecycle"))),
    privateMediaAccessStatus: classifyStatus(artifactFailures.filter((failure) => failure.includes("private media access"))),
    creatorDiscoveryStatus: classifyStatus(artifactFailures.filter((failure) => failure.includes("creator discovery"))),
    relationshipFunnelStatus: classifyStatus(relationshipFailures),
    searchDiscoveryStatus: classifyStatus([...searchFailures, ...artifactFailures.filter((failure) => failure.includes("search discovery"))]),
    costControlStatus: classifyStatus([...costFailures, ...accessFailures]),
    telemetryStatus: classifyStatus([...telemetryFailures, ...rawFailures]),
    debugVisibilityStatus: debugLanes.length === 4 ? "pass" : "fail",
    eventSpines,
    debugLanes,
    searchCostPolicy: SEARCH_COST_POLICY,
    rawSensitiveTelemetryProtected: rawFailures.length === 0,
    sensitiveRouteAccessStatus: classifyStatus(accessFailures),
    artifactStatus,
    scoreBefore,
    scoreAfter,
    scoreDimensions: FINAL_SCORE_DIMENSIONS,
    remainingGaps: [
      "Runtime/provider media access smoke remains outside this source-only lock.",
      "Public beta score remains owner_review until external/runtime evidence gates are attached.",
    ],
    nextExactSteps: [
      "Keep check:media-upload-lifecycle, check:private-media-access, check:creator-discovery-relationship-funnel, and check:search-discovery-cost green before new media or discovery work.",
      "Run check:media-discovery-score-lock after any media upload, private access, creator discovery, relationship, search, telemetry, or score wiring change.",
      "Use runtime smoke only after explicit operator approval; this lock intentionally avoids production reads and provider calls.",
    ],
    dirtyFiles,
    validationFailures: [],
  };

  return {
    ...report,
    validationFailures: validateMediaDiscoveryScoreLockReport({
      ...report,
      validationFailures: [
        ...artifactFailures,
        ...relationshipFailures,
        ...searchFailures,
        ...costFailures,
        ...accessFailures,
        ...telemetryFailures,
        ...rawFailures,
        ...scriptFailures,
      ],
    }),
  };
}

export function validateMediaDiscoveryScoreLockReport(report: MediaDiscoveryScoreLockReport) {
  const failures: string[] = [...report.validationFailures];
  if (report.mediaUploadStatus !== "pass") failures.push("media upload lifecycle missing.");
  if (report.privateMediaAccessStatus !== "pass") failures.push("private media access unresolved.");
  if (report.creatorDiscoveryStatus !== "pass") failures.push("creator discovery lock missing.");
  if (report.relationshipFunnelStatus !== "pass") failures.push("creator follow/profile funnel missing.");
  if (report.searchDiscoveryStatus !== "pass") failures.push("search discovery cost policy missing.");
  if (report.costControlStatus !== "pass") failures.push("search cost policy or sensitive route access risk unresolved.");
  if (report.telemetryStatus !== "pass") failures.push("raw private media/search data leaks in telemetry or event mapping is missing.");
  if (report.debugVisibilityStatus !== "pass") failures.push("debug lanes missing.");
  if (report.sensitiveRouteAccessStatus !== "pass") failures.push("sensitive route caching/access risk unresolved.");
  if (report.eventSpines.mediaUpload.length !== MEDIA_UPLOAD_LIFECYCLE_EVENTS.length) failures.push("media upload lifecycle missing.");
  if (report.eventSpines.privateMediaAccess.length !== MEDIA_ACCESS_EVENTS.length) failures.push("private media access unresolved.");
  if (report.eventSpines.creatorRelationship.length !== CREATOR_RELATIONSHIP_EVENTS.length) failures.push("creator follow/profile funnel missing.");
  if (report.eventSpines.searchDiscovery.length !== SEARCH_DISCOVERY_EVENTS.length) failures.push("search cost policy missing.");
  if (!MEDIA_ACCESS_REASONS.includes("unsafe_unknown")) failures.push("private media access unresolved.");
  if (report.searchCostPolicy.backendCallPerKeystrokeAllowed || report.searchCostPolicy.broadUnboundedReadsAllowed) {
    failures.push("search cost policy missing.");
  }
  if (report.searchCostPolicy.rawQueryTextInBroadTelemetryAllowed) failures.push("raw private media/search data leaks in telemetry.");
  if (!report.rawSensitiveTelemetryProtected) failures.push("raw private media/search data leaks in telemetry.");
  if (report.scoreDimensions.length === 0) failures.push("score dimensions missing.");
  failures.push(...report.dirtyFiles
    .filter((file) => file.classification === "unsafe_unknown")
    .map((file) => `${file.path} is unclassified for media discovery score lock.`));
  return unique(failures);
}

function writeDoc(report: MediaDiscoveryScoreLockReport) {
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  const artifactRows = Object.entries(report.artifactStatus)
    .map(([filePath, status]) => `| ${filePath} | ${status} |`)
    .join("\n");
  const dirtyRows = report.dirtyFiles
    .map((entry) => `| ${entry.path} | ${entry.classification} |`)
    .join("\n");
  fs.writeFileSync(DOC_PATH, `# Media Discovery Score Lock

Generated: ${report.generatedAtUtc}
Head: ${report.currentHead}
Status: ${report.validationFailures.length === 0 ? "pass" : "fail"}

## Summary

- Media upload lifecycle: ${report.mediaUploadStatus}
- Private media access: ${report.privateMediaAccessStatus}
- Creator discovery: ${report.creatorDiscoveryStatus}
- Relationship funnel: ${report.relationshipFunnelStatus}
- Search discovery: ${report.searchDiscoveryStatus}
- Cost controls: ${report.costControlStatus}
- Telemetry: ${report.telemetryStatus}
- Debug visibility: ${report.debugVisibilityStatus}
- Sensitive route access: ${report.sensitiveRouteAccessStatus}
- Raw sensitive telemetry protected: ${report.rawSensitiveTelemetryProtected}
- Score: ${report.scoreBefore} -> ${report.scoreAfter}
- Score dimensions: ${report.scoreDimensions.join(", ")}

## Event Spines

- Media upload: ${report.eventSpines.mediaUpload.length}
- Private media access: ${report.eventSpines.privateMediaAccess.length}
- Creator relationships: ${report.eventSpines.creatorRelationship.length}
- Search discovery: ${report.eventSpines.searchDiscovery.length}

## Debug Lanes

${report.debugLanes.map((lane) => `- ${lane}`).join("\n")}

## Artifacts

| Artifact | Status |
| --- | --- |
${artifactRows}

## Dirty Files

| File | Classification |
| --- | --- |
${dirtyRows || "| none | none |"}

## Remaining Gaps

${report.remainingGaps.map((gap) => `- ${gap}`).join("\n")}

## Next Exact Steps

${report.nextExactSteps.map((step) => `- ${step}`).join("\n")}

## Validation

${report.validationFailures.length === 0 ? "- No validation failures." : report.validationFailures.map((failure) => `- ${failure}`).join("\n")}
`);
}

function main() {
  const dirtyFiles = git(["diff", "--name-only"]).split(/\r?\n/u).filter(Boolean)
    .concat(git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean));
  const report = buildMediaDiscoveryScoreLockReport({ dirtyFiles });
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeDoc(report);
  if (report.validationFailures.length > 0) {
    console.error(`media discovery score lock failed:\n${report.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }
  console.log(`media discovery score lock pass: media=${report.mediaUploadStatus}, access=${report.privateMediaAccessStatus}, discovery=${report.creatorDiscoveryStatus}, search=${report.searchDiscoveryStatus}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
