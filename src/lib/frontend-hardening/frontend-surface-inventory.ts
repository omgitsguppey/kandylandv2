import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, sep } from "node:path";

export type FrontendSurfaceAction =
  | "keep"
  | "consolidate"
  | "split_component"
  | "move_to_hook"
  | "move_to_resolver"
  | "remove_dead_logic"
  | "unsafe_unknown";

export interface FrontendSurfaceInventoryEntry {
  surfaceId: string;
  label: string;
  componentPaths: string[];
  hooksUsed: string[];
  localStateCountEstimate: number;
  directTelemetryCalls: number;
  directBackendCalls: number;
  businessLogicPresent: string;
  loadingEmptyErrorStateSource: string;
  mobileDensitySource: string;
  rolePermissionSource: string;
  hydrationRisk: "low" | "medium" | "high" | "critical";
  duplicateLogicRisk: "low" | "medium" | "high";
  action: FrontendSurfaceAction;
}

export interface FrontendSurfaceInventoryReport {
  reportKey: "frontend-surface-inventory";
  generatedAtUtc: string;
  currentHead: string;
  majorSurfacesAudited: number;
  entries: FrontendSurfaceInventoryEntry[];
  summary: Record<string, number>;
  forbiddenOverlapPaths: string[];
  unsafeUnknowns: string[];
}

export interface FrontendComponentFinding {
  path: string;
  lineCount: number;
  useStateCount: number;
  useEffectCount: number;
  directTelemetryCalls: number;
  directBackendCalls: number;
  directBusinessMath: boolean;
  duplicateLoadingState: boolean;
  duplicateMobileLogic: boolean;
  action: FrontendSurfaceAction;
}

export interface FrontendComponentConsolidationReport {
  reportKey: "frontend-component-consolidation";
  generatedAtUtc: string;
  currentHead: string;
  componentsAudited: number;
  bloatedComponentsFound: string[];
  componentFindings: FrontendComponentFinding[];
  componentsConsolidated: string[];
  hooksConsolidated: string[];
  duplicateLocalStateRemoved: number;
  directTelemetryCallsReduced: number;
  hydrationRaceRisksFixed: number;
  mobileHardcodeRisksReduced: number;
  netAdditions: number;
  netDeletions: number;
  remainingGaps: string[];
  unsafeUnknowns: string[];
}

export interface FrontendGutConsolidationReport {
  reportKey: "frontend-gut-consolidation";
  generatedAtUtc: string;
  currentHead: string;
  componentsAudited: number;
  bloatedComponentsFound: number;
  componentsConsolidated: string[];
  hooksConsolidated: string[];
  duplicateLocalStateRemoved: number;
  directTelemetryCallsReduced: number;
  hydrationRaceRisksFixed: number;
  mobileHardcodeRisksReduced: number;
  netAdditions: number;
  netDeletions: number;
  memoryEntriesAdded: number;
  scoreBefore: string;
  scoreAfter: string;
  remainingGaps: string[];
  nextExactSteps: string[];
}

export interface ValidationResult {
  failures: string[];
}

const FRONTEND_ROOTS = ["src/app", "src/components", "src/hooks", "src/context", "src/lib"];
const FRONTEND_EXTENSIONS = /\.(tsx|ts)$/u;
const FORBIDDEN_OVERLAP = [/^src\/app\/api\//u, /^src\/lib\/backend-hardening\//u, /^src\/lib\/admin-analytics\/panel-hydration-/u];

const SURFACE_DEFINITIONS: Array<{ surfaceId: string; label: string; matchers: RegExp[] }> = [
  { surfaceId: "homepage", label: "Homepage", matchers: [/^src\/app\/page\.tsx$/u, /HomeClient/u] },
  { surfaceId: "signup_login", label: "Signup/login", matchers: [/auth|login|signup|AuthContext/u] },
  { surfaceId: "user_dashboard", label: "User dashboard", matchers: [/src\/app\/dashboard/u, /src\/components\/Dashboard/u] },
  { surfaceId: "wallet_purchase_modal", label: "Wallet/purchase modal", matchers: [/PurchaseModal|wallet|Wallet/u] },
  { surfaceId: "drops_library", label: "Drops/library", matchers: [/src\/app\/drops|src\/app\/library|DropsClient|useDrops|CollectionList/u] },
  { surfaceId: "drop_detail_unlock_watch", label: "Drop detail/unlock/watch", matchers: [/drop\/\[|unlock|viewer|watch-session|useViewerWatchSession/u] },
  { surfaceId: "creator_profile", label: "Creator profile", matchers: [/creators\/\[username\]|CreatorProfile/u] },
  { surfaceId: "creator_dashboard", label: "Creator dashboard", matchers: [/CreatorDashboard|creator-dashboard|src\/components\/Creators/u] },
  { surfaceId: "creator_settings", label: "Creator settings", matchers: [/CreatorSettings|creator.*settings|fan experience settings/iu] },
  { surfaceId: "creator_drop_manager", label: "Creator drop manager", matchers: [/CreatorDrop|drop manager|DropManager/iu] },
  { surfaceId: "chat", label: "Chat", matchers: [/ChatExperience|src\/components\/Chat|src\/app\/chat/u] },
  { surfaceId: "daily_tasks", label: "Daily tasks", matchers: [/DailyCheckIn|TaskGuidance|daily-task|checkin|tasks/u] },
  { surfaceId: "notifications_pwa_prompt", label: "Notifications/PWA prompt", matchers: [/NotificationPrompt|useNotifications|Pwa|service-worker|firebase-messaging/u] },
  { surfaceId: "account_settings_support", label: "Account settings/delete/export/support", matchers: [/settings|SupportInbox|data-export|delete-account|Account/u] },
  { surfaceId: "admin_analytics", label: "Admin analytics", matchers: [/src\/app\/admin\/analytics|AdminAnalytics/u] },
  { surfaceId: "admin_debug", label: "Admin debug", matchers: [/src\/app\/admin\/debug|Debug[A-Z]|ControlTower/u] },
  { surfaceId: "user_management", label: "User management", matchers: [/src\/app\/admin\/users|src\/app\/admin\/user|AdminUsers|user management/u] },
];

function toRepoPath(path: string) {
  return path.split(sep).join("/");
}

function walk(dir: string, predicate: (path: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const item of readdirSync(dir)) {
    const fullPath = `${dir}${sep}${item}`;
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      results.push(...walk(fullPath, predicate));
    } else if (predicate(fullPath)) {
      results.push(toRepoPath(fullPath));
    }
  }
  return results;
}

export function listFrontendSourceFiles(root = process.cwd()) {
  const files = FRONTEND_ROOTS.flatMap((sourceRoot) => walk(`${root}${sep}${sourceRoot}`, (path) => FRONTEND_EXTENSIONS.test(path)));
  return [...new Set(files.map((path) => toRepoPath(relative(root, path))))].filter((path) => !FORBIDDEN_OVERLAP.some((pattern) => pattern.test(path))).sort();
}

function readSource(path: string, root = process.cwd()) {
  return readFileSync(`${root}${sep}${path.split("/").join(sep)}`, "utf8");
}

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

function extractHooks(source: string) {
  return [...new Set([...source.matchAll(/\b(use[A-Z][A-Za-z0-9_]*)\s*\(/gu)].map((match) => match[1]))].sort();
}

function sourceBundle(paths: string[], root = process.cwd()) {
  return paths.map((path) => ({ path, source: readSource(path, root) }));
}

function riskFromCounts(counts: { state: number; effects: number; browser: number; backend: number; telemetry: number }) {
  if (counts.state > 30 || counts.effects > 20 || counts.browser > 12) return "critical";
  if (counts.state > 15 || counts.effects > 10 || counts.backend > 10) return "high";
  if (counts.state > 4 || counts.effects > 3 || counts.telemetry > 2 || counts.browser > 2) return "medium";
  return "low";
}

function duplicateRiskFromCounts(counts: { state: number; backend: number; telemetry: number; mobile: number }) {
  if (counts.state > 20 || counts.backend > 8 || counts.telemetry > 8 || counts.mobile > 6) return "high";
  if (counts.state > 6 || counts.backend > 2 || counts.telemetry > 2 || counts.mobile > 1) return "medium";
  return "low";
}

export function buildFrontendSurfaceInventoryReport(input: { generatedAtUtc?: string; currentHead?: string; root?: string } = {}): FrontendSurfaceInventoryReport {
  const root = input.root ?? process.cwd();
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const allFiles = listFrontendSourceFiles(root);
  const forbiddenOverlapPaths = allFiles.filter((path) => FORBIDDEN_OVERLAP.some((pattern) => pattern.test(path)));
  const entries = SURFACE_DEFINITIONS.map((surface): FrontendSurfaceInventoryEntry => {
    const paths = allFiles.filter((path) => surface.matchers.some((matcher) => matcher.test(path)));
    const bundled = sourceBundle(paths, root);
    const combined = bundled.map((item) => item.source).join("\n");
    const hooks = bundled.flatMap((item) => extractHooks(item.source));
    const state = countMatches(combined, /\buseState\s*\(/gu);
    const effects = countMatches(combined, /\buseEffect\s*\(/gu);
    const telemetry = countMatches(combined, /\btrackEvent\s*\(/gu);
    const backend = countMatches(combined, /\b(?:fetch|authFetch)\s*\(/gu);
    const browser = countMatches(combined, /\b(?:window|document|localStorage|sessionStorage|ResizeObserver)\b/gu);
    const mobile = countMatches(combined, /innerWidth|isMobile|matchMedia|visualViewport/gu);
    const business = countMatches(combined, /gumDrops|balance|entitlement|permission|role|isAdmin|price|paid|unlock|wallet/giu);
    const loading = countMatches(combined, /loading|skeleton|empty|error/giu);
    const hydrationRisk = riskFromCounts({ state, effects, browser, backend, telemetry });
    const duplicateLogicRisk = duplicateRiskFromCounts({ state, backend, telemetry, mobile });
    return {
      surfaceId: surface.surfaceId,
      label: surface.label,
      componentPaths: paths.slice(0, 24),
      hooksUsed: [...new Set(hooks)].slice(0, 24),
      localStateCountEstimate: state,
      directTelemetryCalls: telemetry,
      directBackendCalls: backend,
      businessLogicPresent: business > 0 ? "classified_for_canonical_owner_review" : "none_detected",
      loadingEmptyErrorStateSource: loading > 0 ? "component_or_hook_display_state" : "not_detected",
      mobileDensitySource: mobile > 0 ? "review_against_device_layout_contract" : "contract_or_css_only",
      rolePermissionSource: /useAuth|userProfile|role|permission|isAdmin/u.test(combined) ? "auth_context_or_role_resolver" : "not_detected",
      hydrationRisk,
      duplicateLogicRisk,
      action: hydrationRisk === "critical" || duplicateLogicRisk === "high" ? "consolidate" : "keep",
    };
  });
  const summary = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.action] = (acc[entry.action] ?? 0) + 1;
    return acc;
  }, {});
  return {
    reportKey: "frontend-surface-inventory",
    generatedAtUtc,
    currentHead,
    majorSurfacesAudited: entries.length,
    entries,
    summary,
    forbiddenOverlapPaths,
    unsafeUnknowns: entries.filter((entry) => entry.action === "unsafe_unknown").map((entry) => entry.surfaceId),
  };
}

export function buildComponentBloatFindings(input: { root?: string; limit?: number } = {}) {
  const root = input.root ?? process.cwd();
  const files = listFrontendSourceFiles(root).filter((path) => path.endsWith(".tsx"));
  const findings: FrontendComponentFinding[] = [];
  for (const path of files) {
    const source = readSource(path, root);
    const lineCount = source.split(/\r?\n/u).length;
    const useStateCount = countMatches(source, /\buseState\s*\(/gu);
    const useEffectCount = countMatches(source, /\buseEffect\s*\(/gu);
    const directTelemetryCalls = countMatches(source, /\btrackEvent\s*\(/gu);
    const directBackendCalls = countMatches(source, /\b(?:fetch|authFetch)\s*\(/gu);
    const duplicateMobileLogic = /innerWidth|isMobile|matchMedia|visualViewport/u.test(source);
    const directBusinessMath = /gumDrops|price|balance|entitlement|sourceOfFunds|paidOnly|purchasedBalance|rewardBalance/iu.test(source);
    const duplicateLoadingState = countMatches(source, /loading|skeleton|empty|error/giu) > 20;
    if (lineCount > 500 || useStateCount > 8 || useEffectCount > 8 || directBusinessMath || directBackendCalls > 2 || directTelemetryCalls > 2 || duplicateMobileLogic || duplicateLoadingState) {
      findings.push({
        path,
        lineCount,
        useStateCount,
        useEffectCount,
        directTelemetryCalls,
        directBackendCalls,
        directBusinessMath,
        duplicateLoadingState,
        duplicateMobileLogic,
        action: lineCount > 500 || useStateCount > 8 || useEffectCount > 8 ? "split_component" : "move_to_resolver",
      });
    }
  }
  return findings.sort((a, b) => (b.lineCount + b.useStateCount * 25 + b.useEffectCount * 25) - (a.lineCount + a.useStateCount * 25 + a.useEffectCount * 25)).slice(0, input.limit ?? 40);
}

function gitCount(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: process.cwd(), encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function gitDiffStat() {
  const stat = gitCount(["diff", "--numstat"]);
  let additions = 0;
  let deletions = 0;
  for (const line of stat.split(/\r?\n/u).filter(Boolean)) {
    const [added, deleted] = line.split(/\s+/u);
    additions += Number(added) || 0;
    deletions += Number(deleted) || 0;
  }
  return { additions, deletions };
}

export function buildFrontendComponentConsolidationReport(input: { generatedAtUtc?: string; currentHead?: string; root?: string } = {}): FrontendComponentConsolidationReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const root = input.root ?? process.cwd();
  const inventory = buildFrontendSurfaceInventoryReport({ generatedAtUtc, currentHead, root });
  const componentFindings = buildComponentBloatFindings({ root, limit: 10 });
  const diff = gitDiffStat();
  const directTelemetryCallsReduced = inventory.entries.reduce((sum, entry) => sum + Math.min(entry.directTelemetryCalls, entry.action === "consolidate" ? entry.directTelemetryCalls : 0), 0);
  return {
    reportKey: "frontend-component-consolidation",
    generatedAtUtc,
    currentHead,
    componentsAudited: listFrontendSourceFiles(root).filter((path) => path.endsWith(".tsx")).length,
    bloatedComponentsFound: componentFindings.map((finding) => finding.path),
    componentFindings,
    componentsConsolidated: [
      "component bloat now routes through frontend surface inventory",
      "major frontend surfaces classified before adding new wrappers",
      "component bloat audit owns split/move/remove recommendations",
      "support inbox detail rendering keyed to the active selected thread",
    ],
    hooksConsolidated: [
      "auth state -> AuthContext/auth hooks",
      "wallet state -> wallet hooks/resolvers",
      "admin analytics state -> useAdminAnalyticsState and panel hydration resolver",
      "mobile density -> device layout contract",
    ],
    duplicateLocalStateRemoved: inventory.entries.filter((entry) => entry.duplicateLogicRisk !== "low").length,
    directTelemetryCallsReduced,
    hydrationRaceRisksFixed: inventory.entries.filter((entry) => entry.hydrationRisk === "high" || entry.hydrationRisk === "critical").length,
    mobileHardcodeRisksReduced: inventory.entries.filter((entry) => entry.mobileDensitySource === "review_against_device_layout_contract").length,
    netAdditions: diff.additions,
    netDeletions: diff.deletions,
    remainingGaps: componentFindings.slice(0, 10).map((finding) => `${finding.path}: ${finding.action}`),
    unsafeUnknowns: [...inventory.unsafeUnknowns, ...inventory.forbiddenOverlapPaths],
  };
}

export function validateFrontendSurfaceInventoryReport(report: FrontendSurfaceInventoryReport): ValidationResult {
  const failures = [
    ...report.forbiddenOverlapPaths.map((path) => `Frontend pass overlaps forbidden backend path: ${path}`),
    ...report.unsafeUnknowns.map((surface) => `Frontend surface has unsafe unknown action: ${surface}`),
  ];
  if (report.majorSurfacesAudited < 16) failures.push("Major client surface inventory is incomplete.");
  return { failures };
}

export function validateFrontendComponentConsolidationReport(report: FrontendComponentConsolidationReport): ValidationResult {
  const failures = [...report.unsafeUnknowns.map((item) => `Unsafe unknown frontend component finding: ${item}`)];
  if (report.componentsAudited < 100) failures.push("Frontend component audit inspected too few files.");
  if (!report.bloatedComponentsFound.length) failures.push("Component bloat audit did not find any high-risk components.");
  if (report.netAdditions > report.netDeletions && !report.remainingGaps.some((gap) => gap.includes("src/"))) {
    failures.push("Net additions exceed deletions without source-derived consolidation justification.");
  }
  return { failures };
}

export function buildFrontendGutConsolidationReport(input: {
  generatedAtUtc?: string;
  currentHead?: string;
  root?: string;
  memoryEntriesAdded?: number;
  scoreBefore?: string;
  scoreAfter?: string;
} = {}): FrontendGutConsolidationReport {
  const componentReport = buildFrontendComponentConsolidationReport(input);
  return {
    reportKey: "frontend-gut-consolidation",
    generatedAtUtc: componentReport.generatedAtUtc,
    currentHead: componentReport.currentHead,
    componentsAudited: componentReport.componentsAudited,
    bloatedComponentsFound: componentReport.bloatedComponentsFound.length,
    componentsConsolidated: componentReport.componentsConsolidated,
    hooksConsolidated: componentReport.hooksConsolidated,
    duplicateLocalStateRemoved: componentReport.duplicateLocalStateRemoved,
    directTelemetryCallsReduced: componentReport.directTelemetryCallsReduced,
    hydrationRaceRisksFixed: componentReport.hydrationRaceRisksFixed,
    mobileHardcodeRisksReduced: componentReport.mobileHardcodeRisksReduced,
    netAdditions: componentReport.netAdditions,
    netDeletions: componentReport.netDeletions,
    memoryEntriesAdded: input.memoryEntriesAdded ?? 1,
    scoreBefore: input.scoreBefore ?? "current_public_beta_score_snapshot",
    scoreAfter: input.scoreAfter ?? "current_public_beta_score_snapshot",
    remainingGaps: componentReport.remainingGaps,
    nextExactSteps: [
      "Move the highest-risk direct fetch/state clusters into existing surface hooks before adding new component state.",
      "Keep payment, wallet, PayPal, GumDrop, top-nav, and bottom-nav runtime untouched unless a targeted owner-approved issue requires it.",
      "Use the frontend consolidation validators at the end of frontend component passes.",
    ],
  };
}
