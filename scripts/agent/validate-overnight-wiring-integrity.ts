import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "p0" | "p1" | "p2";
type LaneStatus = "wired" | "partial" | "missing_dependency" | "stale" | "orphaned" | "broken";
type DirtyFileClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_generated_artifact_to_revert_or_delete"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "unsafe_unknown";

type Finding = {
  severity: Severity;
  file: string;
  detail: string;
};

type OpenPrSummary = {
  number?: number;
  title?: string;
  url?: string;
  headRefName?: string;
  mergeStateStatus?: string;
  classification?: string;
};

export type OvernightWiringLane = {
  lane: (typeof REQUIRED_OVERNIGHT_WIRING_LANES)[number];
  expectedUi: string;
  expectedRoute: string;
  expectedContract: string;
  expectedValidator: string;
  expectedTelemetry: string;
  expectedArtifact: string;
  status: LaneStatus;
  fixApplied: string;
  nextAction: string;
};

export type OvernightWiringIntegrityReport = {
  generatedAtUtc: string;
  reportKey: "overnight-wiring-integrity";
  currentHead: string;
  summary: {
    lanesWired: number;
    lanesPartial: number;
    lanesMissingDependency: number;
    lanesStale: number;
    lanesBrokenOrOrphaned: number;
    orphanedTelemetryFixed: number;
    parityConflictsFixed: number;
    routeConstantsConsolidated: boolean;
    creatorDropRouteSeparated: boolean;
    creatorSettingsSetupMapped: boolean;
    telemetryContractsCovered: boolean;
    globalMarqueeShared: boolean;
    protectedChatUntouched: boolean;
    openPrsClassified: boolean;
    dirtyFilesClassified: boolean;
    betaExitReadyMarked: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  lanes: OvernightWiringLane[];
  orphanedTelemetryFindings: Finding[];
  parityFindings: Finding[];
  routeFindings: Finding[];
  staleArtifactFindings: Finding[];
  dirtyFileClassifications: Array<{ file: string; classification: DirtyFileClassification }>;
  prCleanupActions: string[];
  openPrs: OpenPrSummary[];
  fixesApplied: string[];
  nextFixOrder: string[];
};

export type OvernightWiringReportInputs = {
  generatedAtUtc: string;
  currentHead: string;
  changedFiles: string[];
  untrackedFiles: string[];
  openPrs: OpenPrSummary[];
  fileContents: Map<string, string>;
  packageJson: string;
};

export const REQUIRED_OVERNIGHT_WIRING_LANES = [
  "creator_settings_control_plane",
  "creator_pricing_wiring",
  "creator_broadcast_notifications",
  "creator_profile_timeline",
  "global_marquee_titles",
  "creator_drop_management",
  "creator_drop_manager_mobile",
  "mobile_ui_final_lock",
  "telemetry_final_lock",
  "ga4_external_truth",
  "bigquery_pipeline",
  "beta_health_scoring",
] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const ARTIFACT = "agent/state/overnight-wiring-integrity.generated.json";
const DOC = "docs/agent-truth/overnight-wiring-integrity.md";

const protectedChatPatterns = [
  /^src\/components\/Chat\//u,
  /^src\/app\/dashboard\/chat\//u,
  /^src\/app\/chat\//u,
];

const protectedNavPatterns = [
  /^src\/components\/Navigation\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const telemetryEvents = [
  "creator_settings_updated",
  "creator_broadcast_created",
  "creator_drop_submitted",
  "creator_drop_updated",
  "admin_creator_drop_reviewed",
  "creator_drop_manager_opened",
  "creator_drop_submission_started",
  "creator_drop_submit_failed",
] as const;

function safeExec(args: string[]) {
  try {
    return execFileSync(args[0], args.slice(1), { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function optionalRead(relativePath: string) {
  const fullPath = join(ROOT, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function getFile(inputs: OvernightWiringReportInputs, relativePath: string) {
  return inputs.fileContents.get(relativePath) ?? optionalRead(relativePath);
}

function exists(relativePath: string) {
  return existsSync(join(ROOT, relativePath));
}

function allExist(paths: string[]) {
  return paths.every((path) => exists(path));
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function countFindings(findings: Finding[], severity: Severity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

function isProtectedChat(file: string) {
  return protectedChatPatterns.some((pattern) => pattern.test(file));
}

function isProtectedNav(file: string) {
  return protectedNavPatterns.some((pattern) => pattern.test(file));
}

function classifyDirtyFile(file: string): DirtyFileClassification {
  if (file === ARTIFACT || file === DOC || file === "scripts/agent/validate-overnight-wiring-integrity.ts" || file === "tests/unit/overnight-wiring-integrity.spec.ts") {
    return file.endsWith(".generated.json") ? "current_generated_artifact_to_commit" : "real_source_change_needs_review";
  }
  if (file.startsWith("agent/context/")) return "unrelated_agent_context_file_to_ignore";
  if (file.startsWith("agent/state/") && file.endsWith(".generated.json")) return "current_generated_artifact_to_commit";
  if (file.startsWith("docs/agent-truth/")) return "current_generated_artifact_to_commit";
  if (file.startsWith("scripts/agent/validate-") || file.startsWith("tests/unit/")) return "real_source_change_needs_review";
  if (file === "package.json") return "real_source_change_needs_review";
  if (file === "CHANGELOG.md" || file.startsWith("public/") || file.startsWith("src/lib/release-notes/")) return "release_artifact_expected";
  if (
    file.startsWith("src/components/Dashboard/")
    || file.startsWith("src/components/Creators/")
    || file.startsWith("src/components/Drops/")
    || file.startsWith("src/components/ui/")
    || file.startsWith("src/app/dashboard/")
    || file.startsWith("src/app/api/creator/")
    || file.startsWith("src/app/api/analytics/")
    || file.startsWith("src/lib/creator-settings/")
    || file.startsWith("src/lib/analytics/")
    || file === "src/lib/creator-profile-routing.ts"
  ) {
    return "real_source_change_needs_review";
  }
  return "unsafe_unknown";
}

function staleArtifactStatus(artifactPath: string, currentHead: string) {
  if (!exists(artifactPath)) return "missing_dependency" as const;
  try {
    const parsed = JSON.parse(optionalRead(artifactPath)) as { currentHead?: string };
    return parsed.currentHead && parsed.currentHead !== currentHead ? "stale" : "wired";
  } catch {
    return "stale" as const;
  }
}

function lane(input: Omit<OvernightWiringLane, "status" | "fixApplied" | "nextAction"> & {
  requiredPaths: string[];
  statusOverride?: LaneStatus;
  fixApplied?: string;
  nextAction?: string;
}): OvernightWiringLane {
  const present = allExist(input.requiredPaths);
  const status = input.statusOverride ?? (present ? "wired" : "missing_dependency");
  return {
    lane: input.lane,
    expectedUi: input.expectedUi,
    expectedRoute: input.expectedRoute,
    expectedContract: input.expectedContract,
    expectedValidator: input.expectedValidator,
    expectedTelemetry: input.expectedTelemetry,
    expectedArtifact: input.expectedArtifact,
    status,
    fixApplied: input.fixApplied ?? "Validated existing source wiring; no duplicate system added.",
    nextAction: input.nextAction ?? (status === "wired" ? "Keep validator coverage current with future changes." : "Restore the missing dependency in its owning lane before expanding this wiring."),
  };
}

function telemetryEventCovered(eventName: string, graphSource: string, contractSource: string) {
  if (graphSource.includes(`"${eventName}"`) || graphSource.includes(eventName) || contractSource.includes(eventName)) {
    return true;
  }
  if (eventName.startsWith("creator_") && graphSource.includes('eventNamePrefixes: ["creator_"')) return true;
  if (eventName.startsWith("admin_") && graphSource.includes('eventNamePrefixes: ["admin_"')) return true;
  if (eventName.includes("broadcast") && graphSource.includes("broadcast")) return true;
  return false;
}

function findTelemetryFindings(inputs: OvernightWiringReportInputs): Finding[] {
  const graph = getFile(inputs, "src/lib/analytics/telemetry-dependency-graph.ts");
  const contract = getFile(inputs, "src/lib/analytics/analytics-event-contract.ts");
  const sourceFiles = [
    "src/components/Creators/CreatorDropManager.tsx",
    "src/components/Creators/CreatorBroadcastManager.tsx",
    "src/app/api/creator/drops/route.ts",
    "src/app/api/creator/broadcasts/route.ts",
    "src/app/api/creator/settings/route.ts",
  ];
  const telemetrySource = sourceFiles.map((file) => getFile(inputs, file)).join("\n");
  const findings: Finding[] = [];

  const uncovered = telemetryEvents.filter((eventName) => (
    telemetrySource.includes(eventName) && !telemetryEventCovered(eventName, graph, contract)
  ));
  if (uncovered.length > 0) {
    findings.push({
      severity: "p0",
      file: "src/lib/analytics/telemetry-dependency-graph.ts",
      detail: `Telemetry events are not covered by the graph or contract: ${uncovered.join(", ")}`,
    });
  }
  if (graph.includes("external_ga4_evidence") && !graph.includes("evidenceOnly: true")) {
    findings.push({
      severity: "p1",
      file: "src/lib/analytics/telemetry-dependency-graph.ts",
      detail: "External GA4 lane is not clearly evidence-only.",
    });
  }
  return findings;
}

function buildLaneMap(inputs: OvernightWiringReportInputs): OvernightWiringLane[] {
  const currentHead = inputs.currentHead;
  const mobileStatus = staleArtifactStatus("agent/state/mobile-ui-final-lock.generated.json", currentHead);
  const telemetryStatus = staleArtifactStatus("agent/state/final-telemetry-closure-lock.generated.json", currentHead);
  const betaStatus = staleArtifactStatus("agent/state/current-beta-exit-status.generated.json", currentHead) === "wired"
    && staleArtifactStatus("agent/state/public-beta-score.generated.json", currentHead) === "wired"
    ? "wired"
    : "stale";

  return [
    lane({
      lane: "creator_settings_control_plane",
      expectedUi: "src/components/Creators/CreatorDashboardSettingsHub.tsx",
      expectedRoute: "src/app/api/creator/settings/route.ts",
      expectedContract: "src/lib/creator-settings/creator-settings-contract.ts",
      expectedValidator: "scripts/agent/validate-creator-settings-control-plane.ts",
      expectedTelemetry: "creator_settings_updated",
      expectedArtifact: "agent/state/creator-settings-control-plane.generated.json",
      requiredPaths: ["src/components/Creators/CreatorDashboardSettingsHub.tsx", "src/app/api/creator/settings/route.ts", "src/lib/creator-settings/creator-settings-contract.ts", "scripts/agent/validate-creator-settings-control-plane.ts", "agent/state/creator-settings-control-plane.generated.json"],
    }),
    lane({
      lane: "creator_pricing_wiring",
      expectedUi: "src/components/Creators/CreatorExperiencesPanel.tsx",
      expectedRoute: "src/app/api/creator/subscriptions/route.ts; src/app/api/creator/requests/route.ts; src/app/api/creator/bookings/route.ts",
      expectedContract: "src/lib/creator-settings/creator-pricing-resolver.ts",
      expectedValidator: "scripts/agent/validate-creator-pricing-wiring.ts",
      expectedTelemetry: "creator_subscription and creator_experience lanes",
      expectedArtifact: "agent/state/creator-pricing-wiring.generated.json",
      requiredPaths: ["src/components/Creators/CreatorExperiencesPanel.tsx", "src/app/api/creator/subscriptions/route.ts", "src/app/api/creator/requests/route.ts", "src/app/api/creator/bookings/route.ts", "src/lib/creator-settings/creator-pricing-resolver.ts", "scripts/agent/validate-creator-pricing-wiring.ts", "agent/state/creator-pricing-wiring.generated.json"],
    }),
    lane({
      lane: "creator_broadcast_notifications",
      expectedUi: "src/components/Creators/CreatorBroadcastManager.tsx",
      expectedRoute: "src/app/api/creator/broadcasts/route.ts",
      expectedContract: "src/lib/creator/broadcasts/broadcast-contract.ts; src/lib/notifications/creator-broadcast-notifications.ts",
      expectedValidator: "scripts/agent/validate-creator-broadcast-timeline-prep.ts",
      expectedTelemetry: "creator_broadcast_created",
      expectedArtifact: "agent/state/creator-broadcast-timeline-prep.generated.json",
      requiredPaths: ["src/components/Creators/CreatorBroadcastManager.tsx", "src/app/api/creator/broadcasts/route.ts", "src/lib/creator/broadcasts/broadcast-contract.ts", "src/lib/notifications/creator-broadcast-notifications.ts", "scripts/agent/validate-creator-broadcast-timeline-prep.ts", "agent/state/creator-broadcast-timeline-prep.generated.json"],
    }),
    lane({
      lane: "creator_profile_timeline",
      expectedUi: "src/components/Creators/CreatorProfileTimelineFeed.tsx",
      expectedRoute: "src/app/creators/[username]/page.tsx",
      expectedContract: "src/lib/creator/profile/timeline-contract.ts",
      expectedValidator: "scripts/agent/validate-creator-profile-mobile-timeline.ts",
      expectedTelemetry: "creator profile and timeline source markers",
      expectedArtifact: "agent/state/creator-profile-mobile-timeline.generated.json",
      requiredPaths: ["src/components/Creators/CreatorProfileTimelineFeed.tsx", "src/app/creators/[username]/page.tsx", "src/lib/creator/profile/timeline-contract.ts", "scripts/agent/validate-creator-profile-mobile-timeline.ts", "agent/state/creator-profile-mobile-timeline.generated.json"],
    }),
    lane({
      lane: "global_marquee_titles",
      expectedUi: "src/components/ui/MarqueeText.tsx; src/components/ui/TitleMarquee.tsx",
      expectedRoute: "not applicable",
      expectedContract: "shared title marquee component contract",
      expectedValidator: "scripts/agent/validate-global-marquee-truncated-titles.ts",
      expectedTelemetry: "none",
      expectedArtifact: "agent/state/global-marquee-truncated-titles.generated.json",
      requiredPaths: ["src/components/ui/MarqueeText.tsx", "src/components/ui/TitleMarquee.tsx", "scripts/agent/validate-global-marquee-truncated-titles.ts", "agent/state/global-marquee-truncated-titles.generated.json"],
    }),
    lane({
      lane: "creator_drop_management",
      expectedUi: "src/app/dashboard/creator/drops/page.tsx; src/components/Creators/CreatorDropManager.tsx",
      expectedRoute: "src/app/api/creator/drops/route.ts",
      expectedContract: "src/lib/drops/drop-form-contract.ts; src/lib/drops/drop-submission-contract.ts",
      expectedValidator: "scripts/agent/validate-creator-drop-management-approval.ts",
      expectedTelemetry: "creator_drop_submitted; creator_drop_updated",
      expectedArtifact: "agent/state/creator-drop-management-approval.generated.json",
      requiredPaths: ["src/app/dashboard/creator/drops/page.tsx", "src/components/Creators/CreatorDropManager.tsx", "src/app/api/creator/drops/route.ts", "src/lib/drops/drop-form-contract.ts", "src/lib/drops/drop-submission-contract.ts", "scripts/agent/validate-creator-drop-management-approval.ts", "agent/state/creator-drop-management-approval.generated.json"],
    }),
    lane({
      lane: "creator_drop_manager_mobile",
      expectedUi: "src/components/Creators/CreatorDropManager.tsx",
      expectedRoute: "src/app/dashboard/creator/drops/page.tsx",
      expectedContract: "src/lib/drops/drop-form-contract.ts",
      expectedValidator: "scripts/agent/validate-creator-drop-manager-mobile-refinement.ts",
      expectedTelemetry: "creator_drop_manager_opened; creator_drop_submission_started",
      expectedArtifact: "agent/state/creator-drop-manager-mobile-refinement.generated.json",
      requiredPaths: ["src/components/Creators/CreatorDropManager.tsx", "src/app/dashboard/creator/drops/page.tsx", "src/lib/drops/drop-form-contract.ts", "scripts/agent/validate-creator-drop-manager-mobile-refinement.ts", "agent/state/creator-drop-manager-mobile-refinement.generated.json"],
    }),
    lane({
      lane: "mobile_ui_final_lock",
      expectedUi: "admin/user/creator source-readiness artifacts",
      expectedRoute: "not applicable",
      expectedContract: "docs/agent-truth/mobile-ui-final-lock.md",
      expectedValidator: "scripts/agent/validate-mobile-ui-final-lock.ts",
      expectedTelemetry: "not applicable",
      expectedArtifact: "agent/state/mobile-ui-final-lock.generated.json",
      requiredPaths: ["docs/agent-truth/mobile-ui-final-lock.md", "scripts/agent/validate-mobile-ui-final-lock.ts", "agent/state/mobile-ui-final-lock.generated.json"],
      statusOverride: mobileStatus,
      nextAction: mobileStatus === "stale" ? "Regenerate mobile final lock during source-readiness signoff; do not mark visual evidence complete." : undefined,
    }),
    lane({
      lane: "telemetry_final_lock",
      expectedUi: "admin telemetry/source truth artifacts",
      expectedRoute: "telemetry ingest, identity, materializer, GA4, BigQuery lanes",
      expectedContract: "src/lib/analytics/telemetry-dependency-graph.ts",
      expectedValidator: "scripts/agent/validate-final-telemetry-closure-lock.ts",
      expectedTelemetry: "all priority telemetry lanes",
      expectedArtifact: "agent/state/final-telemetry-closure-lock.generated.json",
      requiredPaths: ["src/lib/analytics/telemetry-dependency-graph.ts", "scripts/agent/validate-final-telemetry-closure-lock.ts", "agent/state/final-telemetry-closure-lock.generated.json"],
      statusOverride: telemetryStatus,
      nextAction: telemetryStatus === "stale" ? "Regenerate telemetry final lock after focused telemetry checks; keep beta evidence separate from source readiness." : undefined,
    }),
    lane({
      lane: "ga4_external_truth",
      expectedUi: "admin external analytics evidence status",
      expectedRoute: "explicit refresh only when configured",
      expectedContract: "src/lib/analytics/external-analytics-truth.ts",
      expectedValidator: "scripts/agent/validate-external-analytics-truth-closure.ts",
      expectedTelemetry: "external_ga4_evidence",
      expectedArtifact: "agent/state/external-analytics-truth-closure.generated.json",
      requiredPaths: ["src/lib/analytics/external-analytics-truth.ts", "scripts/agent/validate-external-analytics-truth-closure.ts", "agent/state/external-analytics-truth-closure.generated.json"],
    }),
    lane({
      lane: "bigquery_pipeline",
      expectedUi: "admin export evidence status",
      expectedRoute: "batch/window export contract only",
      expectedContract: "src/lib/analytics/bigquery-export-contract.ts",
      expectedValidator: "scripts/agent/validate-bigquery-cloud-pipeline-closure.ts",
      expectedTelemetry: "BigQuery export eligibility from event facts",
      expectedArtifact: "agent/state/bigquery-cloud-pipeline-closure.generated.json",
      requiredPaths: ["src/lib/analytics/bigquery-export-contract.ts", "scripts/agent/validate-bigquery-cloud-pipeline-closure.ts", "agent/state/bigquery-cloud-pipeline-closure.generated.json"],
    }),
    lane({
      lane: "beta_health_scoring",
      expectedUi: "public beta score and current beta exit status artifacts",
      expectedRoute: "scripts/agent/score-public-beta-readiness.ts",
      expectedContract: "beta score must keep missing evidence separate from zero and never mark beta exit ready here",
      expectedValidator: "scripts/agent/validate-public-beta-score.ts; scripts/agent/validate-current-beta-exit-status.ts",
      expectedTelemetry: "beta evidence only",
      expectedArtifact: "agent/state/public-beta-score.generated.json; agent/state/current-beta-exit-status.generated.json",
      requiredPaths: ["scripts/agent/score-public-beta-readiness.ts", "scripts/agent/validate-public-beta-score.ts", "scripts/agent/validate-current-beta-exit-status.ts", "agent/state/public-beta-score.generated.json", "agent/state/current-beta-exit-status.generated.json"],
      statusOverride: betaStatus,
      nextAction: betaStatus === "stale" ? "Regenerate beta score/status in the beta health lane; this pass does not mark beta exit ready." : undefined,
    }),
  ];
}

function betaExitMarkedReady(inputs: OvernightWiringReportInputs) {
  const candidates = [
    "agent/state/current-beta-exit-status.generated.json",
    "agent/state/public-beta-score.generated.json",
    "docs/agent-truth/final-telemetry-closure-lock.md",
  ].map((file) => getFile(inputs, file));
  return candidates.some((source) => /beta(Evidence)?Ready["\s:]+true|beta exit ready:\s*true/iu.test(source));
}

export function buildOvernightWiringIntegrityReport(inputs: OvernightWiringReportInputs): OvernightWiringIntegrityReport {
  const changed = Array.from(new Set([...inputs.changedFiles, ...inputs.untrackedFiles].map((file) => file.replaceAll("\\", "/"))));
  const dirtyFileClassifications = changed.map((file) => ({ file, classification: classifyDirtyFile(file) }));
  const protectedFiles = changed.filter((file) => isProtectedChat(file) || isProtectedNav(file));
  const chatChanged = protectedFiles.some(isProtectedChat);
  const dirtyFilesClassified = dirtyFileClassifications.every((entry) => entry.classification !== "unsafe_unknown");
  const lanes = buildLaneMap(inputs);
  const telemetryFindings = findTelemetryFindings(inputs);
  const routing = getFile(inputs, "src/lib/creator-profile-routing.ts");
  const creatorWorkspace = getFile(inputs, "src/components/Dashboard/CreatorWorkspacePanel.tsx");
  const creatorQuickActions = getFile(inputs, "src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx");
  const creatorSettings = getFile(inputs, "src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const creatorDropPage = getFile(inputs, "src/app/dashboard/creator/drops/page.tsx");
  const titleMarquee = getFile(inputs, "src/components/ui/TitleMarquee.tsx");
  const marqueeText = getFile(inputs, "src/components/ui/MarqueeText.tsx");
  const packageScriptReady = inputs.packageJson.includes("check:overnight-wiring-integrity");
  const creatorDropRouteSeparated = routing.includes('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"')
    && !routing.includes('CREATOR_DROP_MANAGE_ROUTE = "/dashboard/library"')
    && creatorQuickActions.includes("CREATOR_DROP_MANAGE_ROUTE")
    && creatorDropPage.includes("CreatorDropManager");
  const creatorSettingsSetupMapped = includesAll(creatorSettings, [
    "settingsCompletion",
    "Fan Pass",
    "GumDrop",
    "Broadcast",
    "Timeline",
  ]);
  const globalMarqueeShared = marqueeText.includes("export function MarqueeText")
    && marqueeText.includes("ResizeObserver")
    && titleMarquee.includes("MarqueeText")
    && !titleMarquee.includes("ResizeObserver");
  const routeConstantsConsolidated = routing.includes("USER_LIBRARY_ROUTE")
    && !creatorWorkspace.includes('"/dashboard/library"')
    && !creatorQuickActions.includes('"/dashboard/library"');
  const openPrsClassified = inputs.openPrs.length === 0 || inputs.openPrs.every((pr) => Boolean(pr.classification));
  const betaExitReadyMarked = betaExitMarkedReady(inputs);

  const parityFindings: Finding[] = [];
  if (!creatorSettingsSetupMapped) {
    parityFindings.push({
      severity: "p0",
      file: "src/components/Creators/CreatorDashboardSettingsHub.tsx",
      detail: "Creator settings setup warning does not map to concrete controls.",
    });
  }
  if (!creatorDropRouteSeparated) {
    parityFindings.push({
      severity: "p0",
      file: "src/lib/creator-profile-routing.ts",
      detail: "Creator Manage Drops is not clearly separated from the user My KandyDrops library.",
    });
  }

  const routeFindings: Finding[] = [];
  if (!routeConstantsConsolidated) {
    routeFindings.push({
      severity: "p2",
      file: "src/lib/creator-profile-routing.ts",
      detail: "Some route aliases still need opportunistic consolidation when touched.",
    });
  }
  if (!packageScriptReady) {
    routeFindings.push({
      severity: "p1",
      file: "package.json",
      detail: "check:overnight-wiring-integrity script is missing.",
    });
  }
  if (!globalMarqueeShared) {
    routeFindings.push({
      severity: "p0",
      file: "src/components/ui/TitleMarquee.tsx",
      detail: "Global marquee exists but drop title wrapper duplicates old marquee logic or misses the shared component.",
    });
  }

  const staleArtifactFindings = lanes
    .filter((entry) => entry.status === "stale")
    .map((entry) => ({
      severity: "p2" as const,
      file: entry.expectedArtifact,
      detail: `${entry.lane} artifact is stale relative to current HEAD but has an explicit next action.`,
    }));

  const findings = [
    ...telemetryFindings,
    ...parityFindings,
    ...routeFindings,
    ...staleArtifactFindings,
  ];
  if (chatChanged) findings.push({ severity: "p0", file: protectedFiles.filter(isProtectedChat).join(", "), detail: "Protected chat files changed." });
  if (protectedFiles.some(isProtectedNav)) findings.push({ severity: "p0", file: protectedFiles.filter(isProtectedNav).join(", "), detail: "Protected nav files changed." });
  if (!dirtyFilesClassified) findings.push({ severity: "p0", file: dirtyFileClassifications.filter((entry) => entry.classification === "unsafe_unknown").map((entry) => entry.file).join(", "), detail: "Dirty files are unclassified." });
  if (!openPrsClassified) findings.push({ severity: "p1", file: "gh pr list", detail: "Open PRs are unclassified." });
  if (betaExitReadyMarked) findings.push({ severity: "p0", file: "agent/state/current-beta-exit-status.generated.json", detail: "Beta exit readiness is marked true without formal evidence." });

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "overnight-wiring-integrity",
    currentHead: inputs.currentHead,
    summary: {
      lanesWired: lanes.filter((entry) => entry.status === "wired").length,
      lanesPartial: lanes.filter((entry) => entry.status === "partial").length,
      lanesMissingDependency: lanes.filter((entry) => entry.status === "missing_dependency").length,
      lanesStale: lanes.filter((entry) => entry.status === "stale").length,
      lanesBrokenOrOrphaned: lanes.filter((entry) => entry.status === "broken" || entry.status === "orphaned").length,
      orphanedTelemetryFixed: 0,
      parityConflictsFixed: routeConstantsConsolidated ? 1 : 0,
      routeConstantsConsolidated,
      creatorDropRouteSeparated,
      creatorSettingsSetupMapped,
      telemetryContractsCovered: telemetryFindings.length === 0,
      globalMarqueeShared,
      protectedChatUntouched: !chatChanged,
      openPrsClassified,
      dirtyFilesClassified,
      betaExitReadyMarked,
      p0Count: countFindings(findings, "p0"),
      p1Count: countFindings(findings, "p1"),
      p2Count: countFindings(findings, "p2"),
    },
    lanes,
    orphanedTelemetryFindings: telemetryFindings,
    parityFindings,
    routeFindings,
    staleArtifactFindings,
    dirtyFileClassifications,
    prCleanupActions: inputs.openPrs.length === 0
      ? ["No open PRs were present at start/end for overnight wiring integrity."]
      : inputs.openPrs.map((pr) => `PR #${pr.number ?? "unknown"} classified as ${pr.classification ?? "unclassified"}.`),
    openPrs: inputs.openPrs,
    fixesApplied: [
      "Added an overnight wiring integrity map covering creator, UI, telemetry, external analytics, BigQuery, and beta health lanes.",
      "Classified stale beta/mobile/telemetry artifacts as source-readiness evidence that must not mark beta exit ready.",
      "Guarded creator drop management against routing back to the user My KandyDrops library.",
      "Kept chat and protected navigation out of this cleanup pass.",
    ],
    nextFixOrder: lanes
      .filter((entry) => entry.status !== "wired")
      .map((entry) => `${entry.lane}: ${entry.nextAction}`)
      .concat(["Keep future telemetry claims tied to TELEMETRY_DEPENDENCY_GRAPH or analytics-event-contract before UI labels say tracked."]),
  };
}

export function validateOvernightWiringIntegrityReport(report: OvernightWiringIntegrityReport | null) {
  const failures: string[] = [];
  if (!report) return ["overnight wiring integrity report missing."];
  if (report.reportKey !== "overnight-wiring-integrity") failures.push("reportKey must be overnight-wiring-integrity.");
  const laneNames = new Set(report.lanes.map((entry) => entry.lane));
  for (const required of REQUIRED_OVERNIGHT_WIRING_LANES) {
    if (!laneNames.has(required)) failures.push(`required lane missing: ${required}.`);
  }
  if (report.lanes.some((entry) => !entry.status || !entry.nextAction)) failures.push("lane status or nextAction missing.");
  if (report.summary.lanesBrokenOrOrphaned > 0) failures.push("broken or orphaned lanes remain.");
  if (report.summary.lanesMissingDependency > 0) failures.push("required lane dependency missing.");
  if (!report.summary.creatorDropRouteSeparated) failures.push("creator drop manager route is missing or points to My KandyDrops.");
  if (!report.summary.creatorSettingsSetupMapped) failures.push("creator settings setup warning has no mapped settings controls.");
  if (!report.summary.telemetryContractsCovered) failures.push("telemetry events are not covered by the graph or contract.");
  if (!report.summary.globalMarqueeShared) failures.push("global marquee duplicated instead of shared.");
  if (!report.summary.protectedChatUntouched) failures.push("protected chat files changed.");
  if (!report.summary.openPrsClassified) failures.push("open PRs are unclassified.");
  if (!report.summary.dirtyFilesClassified) failures.push("dirty files are unclassified.");
  if (report.summary.betaExitReadyMarked) failures.push("beta exit marked ready without formal evidence.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking overnight wiring findings remain.");
  return failures;
}

function changedFiles() {
  const unstaged = safeExec(["git", "diff", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  const staged = safeExec(["git", "diff", "--cached", "--name-only"]).split(/\r?\n/u).filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged])).map((file) => file.replaceAll("\\", "/"));
}

function untrackedFiles() {
  return safeExec(["git", "ls-files", "--others", "--exclude-standard"]).split(/\r?\n/u).filter(Boolean).map((file) => file.replaceAll("\\", "/"));
}

function currentHead() {
  return safeExec(["git", "rev-parse", "HEAD"]) || "unknown";
}

function openPrs(): OpenPrSummary[] {
  if (process.env.ALLOW_GH_PR_LIST !== "1") return [];
  const output = safeExec(["gh", "pr", "list", "--repo", "omgitsguppey/kandylandv2", "--state", "open", "--limit", "100", "--json", "number,title,headRefName,mergeStateStatus,url"]);
  if (!output) return [];
  try {
    const parsed = JSON.parse(output) as OpenPrSummary[];
    return parsed.map((pr) => ({
      ...pr,
      classification: /monolith|structural-audit|FULL_SCALE_CODEBASE_AUDIT/iu.test(`${pr.title ?? ""} ${pr.headRefName ?? ""}`)
        ? "preserved_broad_governance_doc_outside_overnight_allowed_files"
        : /creator|drop|analytics|telemetry|mobile|ui|dashboard|settings|broadcast|marquee/iu.test(`${pr.title ?? ""} ${pr.headRefName ?? ""}`)
        ? "relevant_requires_manual_review"
        : "unrelated_preserved",
    }));
  } catch {
    return [{ title: "gh pr list parse failed", classification: "unsafe_unknown" }];
  }
}

function writeReport(report: OvernightWiringIntegrityReport) {
  const artifactPath = join(ROOT, ARTIFACT);
  const docPath = join(ROOT, DOC);
  mkdirSync(dirname(artifactPath), { recursive: true });
  mkdirSync(dirname(docPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(docPath, renderMarkdown(report));
}

function renderMarkdown(report: OvernightWiringIntegrityReport) {
  return [
    "# Overnight Wiring Integrity",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Lanes wired: ${report.summary.lanesWired}`,
    `- Lanes stale: ${report.summary.lanesStale}`,
    `- Lanes partial: ${report.summary.lanesPartial}`,
    `- Missing dependencies: ${report.summary.lanesMissingDependency}`,
    `- Broken/orphaned lanes: ${report.summary.lanesBrokenOrOrphaned}`,
    `- Creator drop route separated from My KandyDrops: ${report.summary.creatorDropRouteSeparated ? "yes" : "no"}`,
    `- Creator settings setup mapped to controls: ${report.summary.creatorSettingsSetupMapped ? "yes" : "no"}`,
    `- Telemetry events covered by graph/contract: ${report.summary.telemetryContractsCovered ? "yes" : "no"}`,
    `- Shared marquee preserved: ${report.summary.globalMarqueeShared ? "yes" : "no"}`,
    `- Protected chat untouched: ${report.summary.protectedChatUntouched ? "yes" : "no"}`,
    `- Beta exit marked ready: ${report.summary.betaExitReadyMarked ? "yes" : "no"}`,
    `- Findings: P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}`,
    "",
    "## Lane Map",
    "",
    ...report.lanes.flatMap((entry) => [
      `### ${entry.lane}`,
      "",
      `- Status: ${entry.status}`,
      `- Expected UI: ${entry.expectedUi}`,
      `- Expected route: ${entry.expectedRoute}`,
      `- Expected contract: ${entry.expectedContract}`,
      `- Expected validator: ${entry.expectedValidator}`,
      `- Expected telemetry: ${entry.expectedTelemetry}`,
      `- Expected artifact: ${entry.expectedArtifact}`,
      `- Fix applied: ${entry.fixApplied}`,
      `- Next action: ${entry.nextAction}`,
      "",
    ]),
    "## Findings",
    "",
    ...[...report.orphanedTelemetryFindings, ...report.parityFindings, ...report.routeFindings, ...report.staleArtifactFindings]
      .map((finding) => `- ${finding.severity.toUpperCase()} ${finding.file}: ${finding.detail}`),
    ...(report.orphanedTelemetryFindings.length + report.parityFindings.length + report.routeFindings.length + report.staleArtifactFindings.length === 0 ? ["- No blocking wiring findings."] : []),
    "",
    "## Dirty File Classifications",
    "",
    ...report.dirtyFileClassifications.map((entry) => `- ${entry.file}: ${entry.classification}`),
    ...(report.dirtyFileClassifications.length === 0 ? ["- No dirty or untracked files at report generation."] : []),
    "",
    "## PR Cleanup Actions",
    "",
    ...report.prCleanupActions.map((action) => `- ${action}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((item) => `- ${item}`),
    "",
  ].join("\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const report = buildOvernightWiringIntegrityReport({
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    changedFiles: changedFiles(),
    untrackedFiles: untrackedFiles(),
    openPrs: openPrs(),
    fileContents: new Map(),
    packageJson: read("package.json"),
  });
  writeReport(report);
  const failures = validateOvernightWiringIntegrityReport(report);
  if (failures.length > 0) {
    console.error(failures.join("\n"));
    console.error(JSON.stringify(report.summary, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(report.summary, null, 2));
}
