import { buildRepoInventory, countPathPrefixes, groupInventoryByDomain } from "./classify-repo-files";
import { buildCanonicalHelpers } from "./extract-canonical-helpers";
import { buildGovernanceTruth, parseAuditPasses } from "./extract-governance";
import { buildRuntimeObservability } from "./extract-runtime-observability";
import { buildWorkflowGuidance } from "./extract-workflow";
import { buildUiSurfaceCoverage } from "./build-ui-surface-coverage";
import { buildDependencyGraphSummary } from "./summarize-dependency-graph";
import { compact, createMetadata, fileExists, getPackageScripts, readRepoToolchainState, readText, toStableId, validateWithSchema, writeJsonFile } from "./shared";

type CommandEntry = {
  stable_id: string;
  command: string;
  scopeType: string;
  root_or_functions: "root" | "functions";
  requiredWhen: string[];
  optionalWhen: string[];
  cleanupExpected: string[];
  broadSignoffWeight: number;
  verifies_runtime: boolean;
  verifies_ui: boolean;
  verifies_rules: boolean;
  verifies_inventory: boolean;
  verifies_continuity: boolean;
};

function compactToolchainState() {
  const toolchain = readRepoToolchainState();
  return {
    gitStatus: toolchain.gitStatus,
    sourceFileDiscovery: toolchain.sourceFileDiscovery,
    currentHead: toolchain.currentHead,
    currentHeadSource: toolchain.currentHeadSource,
    toolingDegraded: toolchain.toolingDegraded,
    degradationReason: toolchain.degradationReason,
    dirtyFileCount: Array.isArray(toolchain.workingTreeStatus) ? toolchain.workingTreeStatus.length : null,
  };
}

const SURFACES = [
  ["app_routes", ["src/app/api", "src/app"], "high", false, ["npm run typecheck", "npm run test:contracts", "npm run check:architecture"], ["route_boundary_auth_request_guard", "route_diagnostics_server_diagnostics"], ["route_runtime_health", "server_diagnostics"], ["firebase.json", "middleware.ts"], ["Route contracts should stay on canonical helpers."]],
  ["admin_ops", ["src/app/admin", "src/app/api/admin"], "high", true, ["npm run check:admin-browser-surface-smoke", "npm run check:admin-browser-surface-smoke:browser", "npm run test:contracts", "npm run check:continuity"], ["runtime_health_admin_debug_observability", "route_boundary_auth_request_guard"], ["admin_ui_chart_health", "route_runtime_health", "server_diagnostics", "admin_panel_system_logs"], [], ["Operational surfaces require authenticated admin browser smoke for UI signoff; source checks do not clear admin truth samples."]],
  ["chat", ["src/components/Chat", "src/app/api/chat", "src/lib/chat"], "high", false, ["npm run test:contracts", "npm run check:architecture"], ["chat_realtime_runtime_helpers", "route_diagnostics_server_diagnostics"], ["route_runtime_health", "server_diagnostics"], ["database.rules.json", "firebase.json"], ["Chat fallback and realtime semantics are continuity-sensitive."]],
  ["analytics", ["src/lib/analytics/telemetry", "src/app/api/telemetry", "functions/src/analytics", "dataconnect"], "high", true, ["npm run check:telemetry", "npm run check:analytics-semantics", "npm run test:contracts"], ["telemetry_analytics_canon", "route_diagnostics_server_diagnostics"], ["server_diagnostics", "admin_panel_system_logs"], ["firebase.json", "dataconnect/schema"], ["Do not treat sidecars as stronger truth than canonical facts."]],
  ["creator_onboarding", ["src/app/creators", "src/lib/creator-onboarding"], "medium", false, ["npm run test:contracts", "npm run check:architecture"], ["creator_onboarding_compliance"], ["server_diagnostics"], [], ["Creator eligibility rules are continuity-sensitive."]],
  ["ai_admin", ["src/app/admin/ai", "src/app/api/admin/ai", "src/lib/ai-", "src/lib/server/ai-"], "high", false, ["npm run test:contracts", "npm run check:admin-browser-surface-smoke"], ["ai_admin_runtime_helpers", "runtime_health_admin_debug_observability"], ["route_runtime_health", "server_diagnostics", "admin_panel_system_logs"], [], ["Keep AI runtime truth aligned with shared registries and admin browser surface evidence."]],
  ["functions", ["functions/src", "functions/package.json", "functions/pnpm-lock.yaml"], "high", true, ["npm --prefix functions run check"], ["telemetry_analytics_canon", "economics_ledger_payments"], ["server_diagnostics"], ["functions/package.json", "functions/pnpm-lock.yaml"], ["Functions lockfile drift can break deployment or verification."]],
  ["shared_server_helpers", ["src/lib/server", "src/lib"], "high", true, ["npm run check:architecture", "npm run test:contracts", "npm run check:continuity"], ["route_boundary_auth_request_guard", "route_diagnostics_server_diagnostics", "runtime_health_admin_debug_observability"], ["server_diagnostics", "route_runtime_health"], [], ["High inbound helpers are broad-change surfaces."]],
  ["repo_tooling", ["scripts", "agent", ".agent/workflows", ".jules", ".vscode", "package.json", "AGENTS.md"], "medium", true, ["npm run check:inventory", "npm run check:architecture", "npm run check:continuity", "npm run check:agent-intelligence"], ["continuity_audit_support"], [], ["package.json", "firebase.json", "dataconnect/schema"], ["Repo-tooling changes are broad work."]],
  ["governance", ["FULL_SCALE_CODEBASE_AUDIT.md", "REPO_MEMORY_LEDGER.md", "EVERY_FILE_FUNCTION_CHECKLIST.md"], "low", true, ["npm run check:continuity"], [], [], [], ["Governance prose remains secondary to verified code/config/output."]],
] as const;

function buildSurfaceMap() {
  return {
    ...createMetadata(["scripts/repo-inventory.ts", "src/lib/route-runtime-health.ts", "src/lib/server/route-diagnostics.ts"]),
    domains: SURFACES.map(([name, path_prefixes, runtime_sensitivity, broad_work_trigger, related_verification_lanes, related_helper_families, related_observability_lanes, related_deploy_or_rules_surfaces, danger_notes]) => ({
      stable_id: toStableId("surface", name),
      name,
      path_prefixes: [...path_prefixes],
      description: `${name.replace(/_/g, " ")} surface map entry.`,
      runtime_sensitivity,
      broad_work_trigger,
      related_verification_lanes: [...related_verification_lanes],
      related_helper_families: [...related_helper_families],
      related_observability_lanes: [...related_observability_lanes],
      related_deploy_or_rules_surfaces: [...related_deploy_or_rules_surfaces],
      danger_notes: [...danger_notes],
    })),
  };
}

function rulesFor(commandName: string) {
  if (commandName === "check:continuity") return { requiredWhen: ["Broad repo-tooling, governance, or shared-helper work."], optionalWhen: [], cleanupExpected: ["Fails if generated artifact noise remains."], broadSignoffWeight: 10, verifies_runtime: false, verifies_ui: false, verifies_rules: false, verifies_inventory: true, verifies_continuity: true };
  if (commandName === "check:ui:audits") return { requiredWhen: ["Touching public/user-facing UI surfaces."], optionalWhen: ["Admin UI uses check:admin-browser-surface-smoke:browser; pure backend or governance-only changes."], cleanupExpected: ["Produces .next and Playwright artifacts."], broadSignoffWeight: 6, verifies_runtime: false, verifies_ui: true, verifies_rules: false, verifies_inventory: false, verifies_continuity: false };
  if (commandName === "check:admin-browser-surface-smoke") return { requiredWhen: ["Touching admin UI surfaces, admin browser surface map, or admin browser evidence boundary."], optionalWhen: ["Non-admin UI changes."], cleanupExpected: [], broadSignoffWeight: 7, verifies_runtime: false, verifies_ui: true, verifies_rules: false, verifies_inventory: true, verifies_continuity: false };
  if (commandName === "check:admin-browser-surface-smoke:browser") return { requiredWhen: ["Authenticated admin browser signoff after admin UI changes with ADMIN_BROWSER_SMOKE_STORAGE_STATE."], optionalWhen: ["Source-only admin route changes without UI surface impact."], cleanupExpected: ["May produce Playwright report/test-results and optional evidence fragments."], broadSignoffWeight: 7, verifies_runtime: false, verifies_ui: true, verifies_rules: false, verifies_inventory: false, verifies_continuity: false };
  if (commandName === "check:ui:lighthouse") return { requiredWhen: ["Touching render/loading/performance-sensitive UI paths."], optionalWhen: ["Non-UI changes."], cleanupExpected: ["Produces build and lighthouse output."], broadSignoffWeight: 5, verifies_runtime: false, verifies_ui: true, verifies_rules: false, verifies_inventory: false, verifies_continuity: false };
  if (commandName === "check:ui:coverage") return { requiredWhen: ["Touching indexed user/admin UI surfaces or UI continuity tooling."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 7, verifies_runtime: false, verifies_ui: true, verifies_rules: false, verifies_inventory: true, verifies_continuity: false };
  if (commandName === "check:ui:runtime") return { requiredWhen: ["Touching hydration-sensitive UI surfaces or continuity canaries."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 7, verifies_runtime: true, verifies_ui: true, verifies_rules: false, verifies_inventory: false, verifies_continuity: false };
  if (commandName === "check:ui:continuity") return { requiredWhen: ["Broad UI hardening, UI coverage registry, or repo-wide UI audits."], optionalWhen: [], cleanupExpected: ["Produces build, Playwright, and Lighthouse artifacts."], broadSignoffWeight: 9, verifies_runtime: true, verifies_ui: true, verifies_rules: false, verifies_inventory: true, verifies_continuity: true };
  if (commandName === "agent:ui-index") return { requiredWhen: ["Touching UI surface registry generation or audit target definitions."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 7, verifies_runtime: false, verifies_ui: true, verifies_rules: false, verifies_inventory: true, verifies_continuity: false };
  if (commandName === "check:runtime:continuity") return { requiredWhen: ["Runtime drift checks, queue lifecycle work, scheduler hardening, or warning-budget signoff."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 9, verifies_runtime: true, verifies_ui: false, verifies_rules: false, verifies_inventory: true, verifies_continuity: true };
  if (commandName === "check:analytics:continuity") return { requiredWhen: ["Touching watch-session capture, viewer analytics continuity, or analytics health instrumentation."], optionalWhen: ["General analytics review without viewer/session capture changes."], cleanupExpected: [], broadSignoffWeight: 7, verifies_runtime: true, verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: true };
  if (commandName === "check:queue:runtime") return { requiredWhen: ["Touching queue lifecycle, cooldown reactivation, activation notifications, or legacy queue adapters."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 8, verifies_runtime: true, verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: true };
  if (commandName === "check:warnings") return { requiredWhen: ["Touching warning budgets, runtime fallback handling, or silent-degradation detection."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 7, verifies_runtime: true, verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: true };
  if (commandName === "check:scheduler:freshness") return { requiredWhen: ["Touching Firebase scheduled jobs or runtime heartbeats."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 7, verifies_runtime: true, verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: true };
  if (commandName === "check:firebase:rules") return { requiredWhen: ["Touching Firebase rules or emulator-sensitive behavior."], optionalWhen: ["Non-Firebase changes."], cleanupExpected: ["May produce emulator logs."], broadSignoffWeight: 5, verifies_runtime: false, verifies_ui: false, verifies_rules: true, verifies_inventory: false, verifies_continuity: false };
  if (["check:inventory", "check:architecture", "check:agent-intelligence"].includes(commandName)) return { requiredWhen: ["Touching repo inventory, dependency/tooling, or agent intelligence."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 8, verifies_runtime: false, verifies_ui: false, verifies_rules: false, verifies_inventory: true, verifies_continuity: commandName === "check:agent-intelligence" };
  if (commandName === "test:contracts" || commandName === "typecheck") return { requiredWhen: ["Changing TypeScript runtime code, routes, helpers, or shared contracts."], optionalWhen: ["Documentation-only changes."], cleanupExpected: [], broadSignoffWeight: 4, verifies_runtime: true, verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: false };
  return { requiredWhen: [], optionalWhen: ["Run when the touched surface overlaps the command lane."], cleanupExpected: [], broadSignoffWeight: 1, verifies_runtime: commandName === "check", verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: false };
}

function scopeType(commandName: string, command: string) {
  if (commandName.includes("functions") || command.startsWith("npm --prefix functions")) return "functions";
  if (commandName.includes("ui") || command.includes("playwright") || command.includes("cypress") || command.includes("storybook")) return "ui";
  if (commandName.includes("rules") || command.includes("firebase")) return "firebase";
  if (commandName.includes("inventory") || commandName.includes("architecture") || commandName.includes("continuity") || commandName.startsWith("agent:")) return "repo_tooling";
  if (commandName.includes("telemetry") || commandName.includes("analytics")) return "analytics";
  if (commandName.includes("contracts") || command.includes("vitest")) return "tests";
  return "repo";
}

function buildVerificationCommands() {
  const rootScripts = getPackageScripts("package.json");
  const functionScripts = getPackageScripts("functions/package.json");
  const rootEntries = Object.entries(rootScripts).map(([commandName, command]) => {
    const rules = rulesFor(commandName);
    return { stable_id: toStableId("command", `root:${commandName}`), command: `npm run ${commandName}`, scopeType: scopeType(commandName, command), root_or_functions: "root" as const, ...rules };
  });
  const functionsEntries = Object.entries(functionScripts).map(([commandName]) => ({ stable_id: toStableId("command", `functions:${commandName}`), command: `npm --prefix functions run ${commandName}`, scopeType: "functions", root_or_functions: "functions" as const, requiredWhen: commandName === "check" ? ["Touching functions runtime or manifests."] : [], optionalWhen: commandName === "check" ? [] : ["Functions-lane maintenance."], cleanupExpected: [], broadSignoffWeight: commandName === "check" ? 7 : 1, verifies_runtime: commandName === "check", verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: false }));
  const manualEntries: CommandEntry[] = [
    { stable_id: toStableId("command", "git_status_short"), command: "git status --short", scopeType: "repo", root_or_functions: "root", requiredWhen: ["Mandatory startup for every edit and broad work pass."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 5, verifies_runtime: false, verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: false },
    { stable_id: toStableId("command", "trace_adjacent"), command: "npm run trace:adjacent -- <path>", scopeType: "repo_tooling", root_or_functions: "root", requiredWhen: ["Broad work and high-risk touched files."], optionalWhen: [], cleanupExpected: [], broadSignoffWeight: 6, verifies_runtime: false, verifies_ui: false, verifies_rules: false, verifies_inventory: false, verifies_continuity: false },
  ];
  return { ...createMetadata(["package.json", "functions/package.json"]), commands: [...rootEntries, ...functionsEntries, ...manualEntries] };
}

function buildPackageManagerTruth() {
  const rootLockfiles = compact([fileExists("package-lock.json") ? "package-lock.json" : null, fileExists("pnpm-lock.yaml") ? "pnpm-lock.yaml" : null]);
  const functionsLockfiles = compact([fileExists("functions/package-lock.json") ? "functions/package-lock.json" : null, fileExists("functions/pnpm-lock.yaml") ? "functions/pnpm-lock.yaml" : null]);
  const ledgerText = readText("REPO_MEMORY_LEDGER.md");
  const staleLedgerMentionsRootPnpm = ledgerText.includes("Root currently carries `package.json`, `package-lock.json`, and `pnpm-lock.yaml`") && !fileExists("pnpm-lock.yaml");
  const functionsDualLockDrift = functionsLockfiles.includes("functions/package-lock.json") && functionsLockfiles.includes("functions/pnpm-lock.yaml");
  return {
    ...createMetadata(["package.json", "functions/package.json", "package-lock.json", "functions/package-lock.json", "functions/pnpm-lock.yaml"]),
    toolchain: compactToolchainState(),
    stable_id: toStableId("pkgtruth", "root-functions"),
    root: { manifest: "package.json", packageManagerField: null, expectedManagers: rootLockfiles.includes("pnpm-lock.yaml") ? ["npm", "pnpm"] : ["npm"], requiredLockfiles: rootLockfiles, verificationCommands: ["npm run check", "npm run check:inventory", "npm run check:architecture"], packageChangesTriggerAgentBuild: true, packageChangesTriggerSqlSync: true },
    functions: { manifest: "functions/package.json", packageManagerField: null, expectedManagers: functionsLockfiles.includes("functions/pnpm-lock.yaml") ? ["npm", "pnpm"] : ["npm"], requiredLockfiles: functionsLockfiles, verificationCommands: ["npm --prefix functions run check"], nodeEngine: "22", packageChangesTriggerAgentBuild: true, packageChangesTriggerSqlSync: true },
    syncInvariants: compact([rootLockfiles.includes("package-lock.json") ? "Root npm dependency changes must keep package-lock.json in sync." : null, rootLockfiles.includes("pnpm-lock.yaml") ? "Root pnpm dependency changes must keep pnpm-lock.yaml in sync." : null, functionsLockfiles.includes("functions/package-lock.json") ? "Functions npm dependency changes must keep functions/package-lock.json in sync." : null, functionsLockfiles.includes("functions/pnpm-lock.yaml") ? "Functions pnpm dependency changes must keep functions/pnpm-lock.yaml in sync." : null]),
    dependencyWindowBlockers: compact([functionsDualLockDrift ? "Functions has both package-lock.json and pnpm-lock.yaml; treat any drift as a manual dependency-window task, not an agent tooling patch." : null]),
    knownFailureModes: compact([rootLockfiles.includes("pnpm-lock.yaml") ? "Root lockfile drift can fail frozen-lockfile deployment/install paths." : null, functionsLockfiles.includes("functions/pnpm-lock.yaml") ? "Functions dual-lockfile drift can break functions verification or deployment parity." : null, staleLedgerMentionsRootPnpm ? "Governance text references a root pnpm lockfile that is not tracked; rely on manifests and tracked lockfiles instead." : null]),
  };
}

function buildKnownPitfalls() {
  const auditText = readText("FULL_SCALE_CODEBASE_AUDIT.md");
  const ledgerText = readText("REPO_MEMORY_LEDGER.md");
  const combined = `${auditText}\n${ledgerText}`;
  const rootPnpmMissing = !fileExists("pnpm-lock.yaml");
  const pitfalls = compact([
    combined.includes("lockfile") ? { stable_id: toStableId("pitfall", "stale_lockfile_drift"), title: "stale_lockfile_drift", description: "Package manifest changes can drift from tracked lockfiles and break frozen-lockfile or deployment paths.", symptom_pattern: "Install or deploy failures complaining that lockfiles are out of date with package manifests.", affected_surfaces: compact(["package.json", "package-lock.json", fileExists("functions/pnpm-lock.yaml") ? "functions/pnpm-lock.yaml" : null]), prevention_rule: "Treat tracked lockfiles as source truth and resynchronize every affected workspace when dependency changes land.", detection_hint: "Run continuity and lockfile-aware verification after dependency edits.", related_commands: ["npm run check:continuity"], related_helpers: [], severity: "high", broad_work_relevance: true } : null,
    combined.includes("diagnostics") && combined.includes("crash") ? { stable_id: toStableId("pitfall", "diagnostics_serialization_crash"), title: "diagnostics_serialization_crash", description: "Diagnostics formatting can crash the error handler if stringify results are treated as guaranteed strings.", symptom_pattern: "Routes return empty or opaque 500 responses because the logging path threw while handling the original error.", affected_surfaces: ["src/lib/server/route-diagnostics.ts", "src/lib/server/auth.ts"], prevention_rule: "Server error-handling and diagnostics serialization must never throw.", detection_hint: "Review error-path logging changes for unsafe stringify or string-method calls.", related_commands: ["npm run test:contracts"], related_helpers: ["src/lib/server/route-diagnostics.ts", "src/lib/server/auth.ts"], severity: "high", broad_work_relevance: false } : null,
    combined.includes("request.json()") ? { stable_id: toStableId("pitfall", "request_json_parse_falls_into_500"), title: "request_json_parse_falls_into_500", description: "Malformed request bodies can throw before validation and fall through to generic 500 handling.", symptom_pattern: "Bad client payloads look like server failures instead of explicit malformed-body 400s.", affected_surfaces: ["src/app/api/**"], prevention_rule: "Wrap request.json() in try/catch before schema validation in POST routes.", detection_hint: "Search POST routes for inline safeParse(await request.json()) patterns.", related_commands: ["npm run test:contracts"], related_helpers: ["src/lib/server/auth.ts"], severity: "medium", broad_work_relevance: false } : null,
    combined.includes("response.json()") && combined.includes("response.text()") ? { stable_id: toStableId("pitfall", "consumed_response_stream_fallback"), title: "consumed_response_stream_fallback", description: "Calling response.json() before response.text() consumes the stream and hides fallback diagnostics.", symptom_pattern: "Fallback parse branches receive empty text after the first parse attempt.", affected_surfaces: ["src/components/**", "src/lib/**"], prevention_rule: "Read response.text() first, then parse JSON from the captured text if needed.", detection_hint: "Search for response.json() fallback patterns followed by response.text().", related_commands: ["npm run test:contracts"], related_helpers: [], severity: "medium", broad_work_relevance: false } : null,
    fileExists("scripts/check-generated-artifacts.ts") ? { stable_id: toStableId("pitfall", "generated_artifact_cleanup_miss"), title: "generated_artifact_cleanup_miss", description: "Verification runs can leave build, audit, or emulator outputs behind and pollute continuity signoff.", symptom_pattern: "Continuity fails or dirty-tree noise appears after otherwise passing verification.", affected_surfaces: ["scripts/check-generated-artifacts.ts", ".next", "playwright-report", "test-results", "lighthouse-results"], prevention_rule: "Clean generated artifacts before final signoff.", detection_hint: "Run the generated-artifact check before completion.", related_commands: ["npm run check:continuity"], related_helpers: ["scripts/check-generated-artifacts.ts"], severity: "medium", broad_work_relevance: true } : null,
    rootPnpmMissing && ledgerText.includes("Root currently carries `package.json`, `package-lock.json`, and `pnpm-lock.yaml`") ? { stable_id: toStableId("pitfall", "stale_governance_note_vs_tracked_manifest"), title: "stale_governance_note_vs_tracked_manifest", description: "Governance prose can drift from the tracked repo state and must not outrank manifests or lockfiles.", symptom_pattern: "Documentation references lockfiles or toolchain state that no longer exists in the repo.", affected_surfaces: ["REPO_MEMORY_LEDGER.md", "package.json"], prevention_rule: "Generate package-manager truth from tracked manifests/lockfiles and update ledgers when they drift.", detection_hint: "Compare governance claims against git-tracked manifests and lockfiles before relying on prose.", related_commands: ["npm run check:agent-intelligence"], related_helpers: [], severity: "medium", broad_work_relevance: true } : null,
    combined.includes("RTDB") || combined.includes("Data Connect") ? { stable_id: toStableId("pitfall", "sidecar_truth_confusion"), title: "sidecar_truth_confusion", description: "Fallback, RTDB, or Data Connect sidecars can be mistaken for canonical serving truth when they are not current in-repo readers.", symptom_pattern: "Sidecar/export layers are treated as if they are the main product-serving analytics source.", affected_surfaces: ["src/lib/server/admin-analytics-shared.ts", "src/app/api/telemetry/track/route.ts", "functions/src/**"], prevention_rule: "Do not represent fallback or derived data as stronger truth than source truth.", detection_hint: "Check whether the candidate storage layer has a verified in-repo reader before treating it as canonical.", related_commands: ["npm run check:analytics-semantics"], related_helpers: ["src/lib/telemetry.ts"], severity: "high", broad_work_relevance: true } : null,
    combined.includes("stale") && combined.includes("unseen") ? { stable_id: toStableId("pitfall", "route_runtime_stale_vs_unseen_confusion"), title: "route_runtime_stale_vs_unseen_confusion", description: "Stale route samples and never-observed route samples have different meanings and should not be collapsed together.", symptom_pattern: "Debug summaries overstate failures because stale, unseen, and healthy states are not separated.", affected_surfaces: ["src/lib/route-runtime-health.ts", "src/lib/server/admin-panel-system-logs.ts"], prevention_rule: "Use shared route-runtime freshness and coverage helpers.", detection_hint: "Check route-runtime summaries for ad hoc last-result logic instead of shared helpers.", related_commands: ["npm run test:contracts"], related_helpers: ["src/lib/route-runtime-health.ts"], severity: "medium", broad_work_relevance: false } : null,
    fileExists("functions/src/queue-runtime.ts") ? { stable_id: toStableId("pitfall", "legacy_queue_adapter_usage"), title: "legacy_queue_adapter_usage", description: "Next App Route cron endpoints are now compatibility adapters only and should not remain the active queue scheduler lane.", symptom_pattern: "Legacy adapter warnings accumulate even though Firebase scheduler is supposed to be canonical.", affected_surfaces: ["src/app/api/cron/process-queue/route.ts", "src/app/api/cron/notify-active-drops/route.ts", "functions/src/queue-runtime.ts"], prevention_rule: "Use Firebase Functions scheduler as the canonical queue runtime and treat route cron endpoints as manual adapters only.", detection_hint: "Run scheduler freshness and warning-budget checks; any legacy adapter warning is blocking.", related_commands: ["npm run check:scheduler:freshness", "npm run check:warnings"], related_helpers: ["functions/src/queue-runtime.ts", "src/lib/server/queue-runtime.ts"], severity: "high", broad_work_relevance: true } : null,
    fileExists("shared/runtime/runtime-warning-contract.ts") ? { stable_id: toStableId("pitfall", "queue_activation_missing_notification_outcome"), title: "queue_activation_missing_notification_outcome", description: "Every canonical activation attempt must persist a dispatch outcome; silent notification attempts are no longer acceptable truth.", symptom_pattern: "Drops activate but no persisted `notification_dispatch_outcomes` row exists for the activation key.", affected_surfaces: ["src/lib/server/push-notifications.ts", "functions/src/queue-runtime.ts", "shared/runtime/runtime-warning-contract.ts"], prevention_rule: "Persist an explicit outcome for success, duplicate, skipped, or failed dispatch states.", detection_hint: "Run the queue runtime continuity check and inspect notification outcome rows for missing activation keys.", related_commands: ["npm run check:queue:runtime", "npm run check:runtime:continuity"], related_helpers: ["src/lib/server/push-notifications.ts", "functions/src/queue-runtime.ts"], severity: "high", broad_work_relevance: true } : null,
    fileExists("scripts/check-scheduler-freshness.ts") ? { stable_id: toStableId("pitfall", "stale_queue_scheduler_heartbeat"), title: "stale_queue_scheduler_heartbeat", description: "Queue lifecycle and activation jobs can silently stop running even while the rest of the app appears healthy.", symptom_pattern: "Drops remain scheduled/expired incorrectly because `queue_job_heartbeats` are stale or failed.", affected_surfaces: ["functions/src/index.ts", "functions/src/queue-runtime.ts", "scripts/check-scheduler-freshness.ts"], prevention_rule: "Treat heartbeat freshness as a blocking runtime continuity lane.", detection_hint: "Run `npm run check:scheduler:freshness` and fail when queue heartbeats are missing, stale, or failed.", related_commands: ["npm run check:scheduler:freshness", "npm run check:runtime:continuity"], related_helpers: ["functions/src/index.ts", "functions/src/queue-runtime.ts"], severity: "high", broad_work_relevance: true } : null,
    combined.includes("Promise.all") && combined.includes("creator experience hydration failed") ? { stable_id: toStableId("pitfall", "all_or_nothing_ui_hydration"), title: "all_or_nothing_ui_hydration", description: "All-or-nothing client hydration can hide partial success and collapse multiple modules into one silent failure.", symptom_pattern: "One failing request empties or freezes otherwise healthy creator/admin modules.", affected_surfaces: ["src/app/creators/[username]/CreatorProfileClient.tsx", "src/components/Dashboard/CreatorWorkspacePanel.tsx"], prevention_rule: "Use shared UI continuity loading with per-module settled handling and visible warnings.", detection_hint: "Search for Promise.all on multi-module UI fetches without per-module warning state.", related_commands: ["npm run check:ui:runtime", "npm run check:ui:coverage"], related_helpers: ["src/lib/ui-continuity.ts"], severity: "high", broad_work_relevance: true } : null,
    combined.includes("response.ok") && combined.includes("creator") ? { stable_id: toStableId("pitfall", "unchecked_response_ok_ui_hydration"), title: "unchecked_response_ok_ui_hydration", description: "Client module hydration that parses bodies without response.ok guards can downgrade route failures into misleading empty states.", symptom_pattern: "UI renders as empty or stale even though the backing route failed.", affected_surfaces: ["src/app/creators/[username]/CreatorProfileClient.tsx", "src/components/Dashboard/CreatorWorkspacePanel.tsx"], prevention_rule: "Parse route responses through a helper that validates response.ok before hydrating UI state.", detection_hint: "Search for response.json() before a response.ok branch in client fetch flows.", related_commands: ["npm run check:ui:runtime"], related_helpers: ["src/lib/ui-continuity.ts"], severity: "high", broad_work_relevance: false } : null,
    combined.includes("timezone") && combined.includes("bookings") ? { stable_id: toStableId("pitfall", "creator_booking_timezone_drift"), title: "creator_booking_timezone_drift", description: "Booking availability validation can drift when creator windows are stored in creator-local time but validated in UTC.", symptom_pattern: "Valid creator-local booking slots are rejected or off by hours for non-UTC creators.", affected_surfaces: ["src/app/api/creator/bookings/route.ts"], prevention_rule: "Validate booking slots against the stored availabilityTimezone before applying conflict logic.", detection_hint: "Check booking validation for getUTC* calls against creator availability windows.", related_commands: ["npm run test:contracts"], related_helpers: ["src/lib/creator-experiences.ts"], severity: "high", broad_work_relevance: false } : null,
    combined.includes("silent fallback") || combined.includes("fallback") && combined.includes("module") ? { stable_id: toStableId("pitfall", "silent_ui_fallback_masking_failure"), title: "silent_ui_fallback_masking_failure", description: "Fallback UI data should not hide the fact that a critical module failed to hydrate.", symptom_pattern: "Users see partial content without any warning that a creator/admin module is degraded.", affected_surfaces: ["src/lib/ui-continuity.ts", "src/components/ui/UiContinuityNotice.tsx"], prevention_rule: "Fallbacks must render explicit warning state and emit diagnostics.", detection_hint: "Inspect async-heavy UI modules for fallback data with no warning shell.", related_commands: ["npm run check:ui:runtime"], related_helpers: ["src/lib/ui-continuity.ts", "src/components/ui/UiContinuityNotice.tsx"], severity: "medium", broad_work_relevance: true } : null,
    fileExists("scripts/check-analytics-continuity.ts") ? { stable_id: toStableId("pitfall", "viewer_watch_capture_continuity_drift"), title: "viewer_watch_capture_continuity_drift", description: "Viewer watch sessions can degrade silently when flush outcomes, close-path sync, or replay recovery are not surfaced into continuity checks.", symptom_pattern: "Watch-time analytics look sparse or inconsistent even though viewer usage continues.", affected_surfaces: ["src/app/api/viewer/watch-session/route.ts", "src/hooks/useViewerWatchSession.ts", "scripts/check-analytics-continuity.ts"], prevention_rule: "Persist capture-quality metadata on canonical watch sessions and run the analytics continuity lane for viewer capture work.", detection_hint: "Check close-missing, flush-degraded, and degraded-rate counts in canonical watch session docs.", related_commands: ["npm run check:analytics:continuity", "npm run check:analytics-semantics"], related_helpers: ["src/lib/viewer-watch-session.ts", "src/lib/server/admin-analytics-capture-health.ts"], severity: "high", broad_work_relevance: false } : null,
  ]);
  return { ...createMetadata(["FULL_SCALE_CODEBASE_AUDIT.md", "REPO_MEMORY_LEDGER.md", "scripts/check-generated-artifacts.ts"]), pitfalls };
}

function buildRecentPasses() {
  const helperPaths = new Set(buildCanonicalHelpers().entries.map((entry) => entry.path));
  return {
    ...createMetadata(["FULL_SCALE_CODEBASE_AUDIT.md"]),
    passes: parseAuditPasses(8).map((entry) => ({
      stable_id: entry.stable_id,
      date: entry.date,
      title: entry.title,
      scopeSummary: entry.scopeSummary,
      touchedSurfaces: entry.touchedSurfaces,
      canonicalHelpersReused: entry.touchedSurfaces.filter((surface) => helperPaths.has(surface)).sort(),
      verificationCommandsRun: entry.verificationCommandsRun,
      resultSummary: entry.resultSummary,
      warnings: entry.warnings,
      architecture_change: entry.touchedSurfaces.some((surface) => surface.startsWith("src/lib/") || surface.startsWith("scripts/")),
      runtime_change: entry.touchedSurfaces.some((surface) => surface.startsWith("src/app/api/") || surface.startsWith("functions/")),
      ui_change: entry.touchedSurfaces.some((surface) => surface.startsWith("src/app/") || surface.startsWith("src/components/")),
      security_change: entry.touchedSurfaces.some((surface) => surface.includes("security") || surface.includes("rules")),
      maintenance_only: entry.touchedSurfaces.every((surface) => surface.endsWith(".md")),
      changeKinds: compact([
        entry.touchedSurfaces.some((surface) => surface.startsWith("src/app/admin") || surface.includes("admin")) ? "admin" : null,
        entry.touchedSurfaces.some((surface) => surface.includes("ui") || surface.startsWith("src/components/")) ? "ui" : null,
        entry.touchedSurfaces.some((surface) => surface.includes("runtime") || surface.startsWith("src/app/api/")) ? "runtime" : null,
        entry.touchedSurfaces.some((surface) => surface.includes("security")) ? "security" : null,
        entry.touchedSurfaces.some((surface) => surface.startsWith("scripts/") || surface === "AGENTS.md") ? "tooling" : null,
        entry.touchedSurfaces.some((surface) => surface.startsWith("src/lib/") || surface.startsWith("src/lib/server/")) ? "architecture" : null,
        entry.touchedSurfaces.every((surface) => surface.endsWith(".md")) ? "maintenance" : null,
      ]),
    })),
  };
}

function buildRepoInventoryIndex() {
  const items = buildRepoInventory();
  const toolchain = compactToolchainState();
  return {
    ...createMetadata([toolchain.sourceFileDiscovery === "git" ? "git ls-files --cached --others --exclude-standard" : `${toolchain.sourceFileDiscovery} fallback`, "scripts/repo-inventory.ts"]),
    gitStatus: toolchain.gitStatus,
    sourceFileDiscovery: toolchain.sourceFileDiscovery,
    currentHead: toolchain.currentHead,
    currentHeadSource: toolchain.currentHeadSource,
    toolingDegraded: toolchain.toolingDegraded,
    degradationReason: toolchain.degradationReason,
    dirtyFileCount: toolchain.dirtyFileCount,
    items,
    counts: { total: items.length, byDomain: groupInventoryByDomain(items), byPrefix: countPathPrefixes(items) },
  };
}

function buildBlastRadius() {
  const inventory = buildRepoInventory();
  const dependencySummary = buildDependencyGraphSummary();
  const inbound = new Map(dependencySummary.highInboundFiles.map((entry) => [entry.path, entry.inboundCount]));
  return {
    ...createMetadata(["agent/index/repo-inventory.json", "agent/index/dependency-graph.summary.json"]),
    entries: inventory.filter((entry) => entry.runtime_critical || entry.likely_shared_helper || entry.likely_broad_signoff_relevant).map((entry) => {
      const inboundCount = inbound.get(entry.path) ?? 0;
      const shared_helper_risk = entry.likely_shared_helper ? 25 : 0;
      const route_boundary_risk = entry.path.startsWith("src/app/api/") || entry.path.includes("route") ? 20 : 0;
      const runtime_criticality = entry.runtime_critical ? 25 : 0;
      const verification_burden = entry.likely_broad_signoff_relevant ? 20 : 10;
      const deploy_or_lockfile_sensitivity = entry.path.includes("package") || entry.path.includes("lock") || entry.dataconnect_related ? 10 : 0;
      return {
        stable_id: toStableId("blast", entry.path),
        path: entry.path,
        blast_radius_score: shared_helper_risk + route_boundary_risk + runtime_criticality + verification_burden + deploy_or_lockfile_sensitivity + Math.min(20, inboundCount * 2),
        shared_helper_risk,
        route_boundary_risk,
        runtime_criticality,
        verification_burden,
        deploy_or_lockfile_sensitivity,
        why_score_was_assigned: compact([entry.likely_shared_helper ? "Likely shared helper." : null, entry.runtime_critical ? "Runtime-critical surface." : null, entry.likely_broad_signoff_relevant ? "Broad signoff likely." : null, inboundCount > 0 ? `Inbound dependency count: ${inboundCount}.` : null, entry.dataconnect_related ? "Data Connect related surface." : null]),
      };
    }).sort((left, right) => right.blast_radius_score - left.blast_radius_score || left.path.localeCompare(right.path)),
  };
}

function buildRetrievalIndex() {
  const inventory = buildRepoInventory();
  const helpers = buildCanonicalHelpers().entries;
  const pitfalls = buildKnownPitfalls().pitfalls;
  const recentPasses = buildRecentPasses().passes;
  return {
    ...createMetadata(["agent/index/repo-inventory.json", "agent/index/canonical-helpers.json", "agent/index/known-pitfalls.json", "agent/index/recent-passes.json"]),
    entries: [
      ...inventory.map((entry) => ({ stable_id: entry.stable_id, source_type: "file", source_id: entry.stable_id, searchable_terms: [entry.path, entry.file_class, entry.surface_category], surface_tags: [entry.surface_category, entry.file_class], helper_tags: [], risk_tags: compact([entry.runtime_critical ? "runtime_critical" : null, entry.likely_shared_helper ? "shared_helper" : null, entry.likely_broad_signoff_relevant ? "broad_signoff" : null, entry.dataconnect_related ? "dataconnect" : null]), recency: entry.last_modified_or_hash, freshness: { local: "fresh", sql_mirror: "unknown" }, context_tier: entry.runtime_critical || entry.likely_shared_helper ? "hot" : entry.governance_artifact || entry.workflow_guidance ? "cold" : "warm", exclusion_tags: compact([entry.evidence_only ? "evidence_only" : null, entry.generated ? "generated" : null]), do_not_use_as_primary_truth: entry.evidence_only || entry.generated })),
      ...helpers.map((entry) => ({ stable_id: entry.stable_id, source_type: "helper", source_id: entry.stable_id, searchable_terms: [entry.path, entry.family, entry.purpose], surface_tags: [entry.family], helper_tags: [entry.family], risk_tags: [entry.broad_signoff_likely ? "broad_signoff" : "shared_helper"], recency: entry.path, freshness: { local: "fresh", sql_mirror: "unknown" }, context_tier: entry.reuseBeforeNew ? "hot" : "warm", exclusion_tags: [], do_not_use_as_primary_truth: false })),
      ...pitfalls.map((entry) => ({ stable_id: toStableId("retrieval", entry.title), source_type: "pitfall", source_id: entry.stable_id, searchable_terms: [entry.title, entry.description, ...entry.affected_surfaces], surface_tags: entry.affected_surfaces, helper_tags: entry.related_helpers, risk_tags: ["pitfall", entry.severity], recency: "ledger_backed", freshness: { local: "fresh", sql_mirror: "unknown" }, context_tier: "warm", exclusion_tags: ["secondary_truth"], do_not_use_as_primary_truth: true })),
      ...recentPasses.map((entry) => ({ stable_id: toStableId("retrieval", entry.stable_id), source_type: "recent_pass", source_id: entry.stable_id, searchable_terms: [entry.title, ...entry.scopeSummary, ...entry.touchedSurfaces], surface_tags: entry.changeKinds, helper_tags: entry.canonicalHelpersReused, risk_tags: compact([entry.architecture_change ? "architecture" : null, entry.runtime_change ? "runtime" : null, entry.ui_change ? "ui" : null, entry.security_change ? "security" : null]), recency: entry.date, freshness: { local: "fresh", sql_mirror: "unknown" }, context_tier: "cold", exclusion_tags: ["secondary_truth"], do_not_use_as_primary_truth: true })),
    ],
  };
}

function buildIndexArtifacts() {
  return {
    "repo-inventory.json": buildRepoInventoryIndex(),
    "surface-map.json": buildSurfaceMap(),
    "canonical-helpers.json": { ...createMetadata(["src/lib/**", "src/lib/server/**", "functions/src/**"]), ...buildCanonicalHelpers() },
    "verification-commands.json": buildVerificationCommands(),
    "package-manager-truth.json": buildPackageManagerTruth(),
    "workflow-guidance.json": buildWorkflowGuidance(),
    "governance-truth.json": buildGovernanceTruth(),
    "known-pitfalls.json": buildKnownPitfalls(),
    "recent-passes.json": buildRecentPasses(),
    "runtime-observability.json": buildRuntimeObservability(),
    "ui-surface-coverage.json": buildUiSurfaceCoverage(),
    "dependency-graph.summary.json": buildDependencyGraphSummary(),
    "blast-radius.json": buildBlastRadius(),
    "retrieval-index.json": buildRetrievalIndex(),
  } as const;
}

const SCHEMA_BY_OUTPUT: Record<string, string> = { "repo-inventory.json": "repo-inventory", "surface-map.json": "surface-map", "canonical-helpers.json": "canonical-helpers", "verification-commands.json": "verification-commands", "package-manager-truth.json": "package-manager-truth", "workflow-guidance.json": "workflow-guidance", "governance-truth.json": "governance-truth", "known-pitfalls.json": "known-pitfalls", "recent-passes.json": "recent-passes", "runtime-observability.json": "runtime-observability", "ui-surface-coverage.json": "ui-surface-coverage", "dependency-graph.summary.json": "dependency-graph.summary", "blast-radius.json": "blast-radius", "retrieval-index.json": "retrieval-index" };

export function buildAgentIndexes() {
  const outputs = buildIndexArtifacts();
  Object.entries(outputs).forEach(([fileName, value]) => {
    writeJsonFile(`agent/index/${fileName}`, value);
    validateWithSchema(`agent/schemas/${SCHEMA_BY_OUTPUT[fileName]}.schema.json`, value);
  });
  return outputs;
}

if (require.main === module) {
  buildAgentIndexes();
  console.log("Agent indexes generated and validated.");
}
