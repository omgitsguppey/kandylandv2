import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ARTIFACT = "agent/state/creator-settings-source-health.generated.json";
const DOC = "docs/agent-truth/creator-settings-source-health.md";

type Finding = {
  id: string;
  status: "fixed" | "verified" | "deferred";
  severity: "p0" | "p1" | "p2";
  file: string;
  summary: string;
};

export type CreatorSettingsSourceHealthReport = {
  generatedAtUtc: string;
  reportKey: "creator-settings-source-health";
  currentHead: string;
  summary: {
    routeReturnsPartialOnMissingSettings: boolean;
    nonCriticalSourceFailuresArePartial: boolean;
    fatalFailuresOnlyForAuthOrUnexpectedRouteFailure: boolean;
    accountSettingsLabelsFixed: boolean;
    creatorSettingsLabelsFixed: boolean;
    rawInternalErrorsBlocked: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  sourceFindings: Finding[];
  routeFindings: Finding[];
  labelFindings: Finding[];
  fixesApplied: string[];
  nextFixOrder: string[];
};

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function currentHead() {
  return execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function hasPlainSettingsAccountLabel(source: string) {
  return /href="\/(?:dashboard\/)?settings"[^>]+label="Settings"|label="Settings"[^>]+href="\/(?:dashboard\/)?settings"|title="Settings"|aria-label="Open settings"/u.test(source);
}

export function buildCreatorSettingsSourceHealthReport(): CreatorSettingsSourceHealthReport {
  const route = read("src/app/api/creator/settings/route.ts");
  const landing = read("src/components/Dashboard/CreatorWorkspacePanel.tsx");
  const settingsHub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
  const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
  const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");
  const routing = read("src/lib/creator-profile-routing.ts");

  const sourceFindings: Finding[] = [];
  const routeFindings: Finding[] = [];
  const labelFindings: Finding[] = [];
  const failures: Finding[] = [];
  const add = (bucket: Finding[], finding: Finding, ok: boolean) => {
    if (ok) {
      bucket.push(finding);
    } else {
      failures.push({ ...finding, status: "deferred" });
    }
  };

  const routeReturnsPartialOnMissingSettings = includesAll(route, [
    'settingsState === "not_configured"',
    '"creator_settings_not_configured"',
    "DEFAULT_CREATOR_SETTINGS",
    "DEFAULT_CREATOR_RESTRICTIONS",
    "creatorSettings,",
    "creatorRestrictions,",
  ]) && !route.includes("creatorSettings: data.creatorSettings ?? null");

  const nonCriticalSourceFailuresArePartial = includesAll(route, [
    "readCreatorSettingsSource",
    "`${name}_source_unavailable`",
    "statsEvidence",
    "sourceStates",
    "issues: sourceIssues",
  ]) && [
    "creator_ledger_accruals",
    "creator_payout_requests",
    "creator_subscriptions",
    "creator_custom_requests",
    "creator_call_bookings",
    "creator_relationships_ops",
    "drops",
  ].every((collection) => route.includes(collection));

  const fatalFailuresOnlyForAuthOrUnexpectedRouteFailure = route.includes("requireCreator(creatorId)")
    && route.includes("handleApiError(error, \"Creator.Settings.GET\")")
    && route.indexOf("readCreatorSettingsSource") < route.indexOf("handleApiError(error, \"Creator.Settings.GET\")");

  const rawInternalErrorsBlocked = !/creator settings:\s*Internal server error|>\s*Internal server error\s*<|creatorSettings:\s*data\.creatorSettings\s*\?\?\s*null/u.test(`${route}\n${landing}\n${settingsHub}`);
  const accountSettingsLabelsFixed = [sidebar, dropdown].every((source) => source.includes("Account Settings") && !hasPlainSettingsAccountLabel(source));
  const creatorSettingsLabelsFixed = includesAll(sidebar, [
    "label=\"Creator Dashboard\"",
    "href={CREATOR_DASHBOARD_ROUTE}",
    "label=\"Creator Settings\"",
    "href={CREATOR_SETTINGS_ROUTE}",
  ]) && includesAll(dropdown, [
    "label=\"Creator Dashboard\"",
    "href={CREATOR_DASHBOARD_ROUTE}",
    "label=\"Creator Settings\"",
    "href={CREATOR_SETTINGS_ROUTE}",
  ]) && includesAll(routing, [
    'CREATOR_DASHBOARD_ROUTE = "/dashboard/creator"',
    'CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings"',
  ]);

  add(routeFindings, {
    id: "missing-settings-partial-safe",
    status: "fixed",
    severity: "p1",
    file: "src/app/api/creator/settings/route.ts",
    summary: "Missing creatorSettings documents return safe defaults with settingsState=not_configured and statsEvidence issues.",
  }, routeReturnsPartialOnMissingSettings);

  add(sourceFindings, {
    id: "noncritical-sources-partial-safe",
    status: "fixed",
    severity: "p1",
    file: "src/app/api/creator/settings/route.ts",
    summary: "Stats aggregates and read sources are wrapped so noncritical failures become partial evidence instead of route 500s.",
  }, nonCriticalSourceFailuresArePartial);

  add(routeFindings, {
    id: "fatal-boundary-auth-only",
    status: "verified",
    severity: "p1",
    file: "src/app/api/creator/settings/route.ts",
    summary: "Auth, role, projection, and unexpected route failures remain strict while stats sources are partial-safe.",
  }, fatalFailuresOnlyForAuthOrUnexpectedRouteFailure);

  add(labelFindings, {
    id: "account-settings-labels",
    status: "fixed",
    severity: "p2",
    file: "src/components/Navigation/ProfileSidebar.tsx",
    summary: "User/account settings links use Account Settings labels.",
  }, accountSettingsLabelsFixed);

  add(labelFindings, {
    id: "creator-settings-labels",
    status: "verified",
    severity: "p2",
    file: "src/components/Navigation/ProfileDropdown.tsx",
    summary: "Creator Dashboard and Creator Settings labels point at separate canonical routes.",
  }, creatorSettingsLabelsFixed);

  add(sourceFindings, {
    id: "raw-internal-errors-blocked",
    status: "verified",
    severity: "p1",
    file: "src/components/Creators/CreatorDashboardSettingsHub.tsx",
    summary: "Creator-facing settings source failures do not render raw internal server errors.",
  }, rawInternalErrorsBlocked);

  const p0Count = failures.filter((finding) => finding.severity === "p0").length;
  const p1Count = failures.filter((finding) => finding.severity === "p1").length;
  const p2Count = failures.filter((finding) => finding.severity === "p2").length;

  return {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-settings-source-health",
    currentHead: currentHead(),
    summary: {
      routeReturnsPartialOnMissingSettings,
      nonCriticalSourceFailuresArePartial,
      fatalFailuresOnlyForAuthOrUnexpectedRouteFailure,
      accountSettingsLabelsFixed,
      creatorSettingsLabelsFixed,
      rawInternalErrorsBlocked,
      p0Count,
      p1Count,
      p2Count,
    },
    sourceFindings,
    routeFindings,
    labelFindings,
    fixesApplied: [
      "Wrapped noncritical creator settings stats sources in partial-safe reads.",
      "Returned safe creator settings and restrictions defaults when creator settings are not configured.",
      "Added partial/source-review UI states for successful creator settings responses.",
      "Renamed account settings links to Account Settings while keeping Creator Settings separate.",
    ],
    nextFixOrder: [
      "Manually verify Zaylani creator settings now return HTTP 200 with partial evidence rather than a platform error.",
      "Run deterministic UI source coverage for /dashboard/creator and /dashboard/creator/settings after source health is confirmed; use browser reproduction only for concrete source-reported issues.",
    ],
  };
}

export function validateCreatorSettingsSourceHealthReport(report: CreatorSettingsSourceHealthReport) {
  const failures: string[] = [];
  if (report.reportKey !== "creator-settings-source-health") failures.push("reportKey must be creator-settings-source-health");
  if (report.currentHead !== currentHead()) failures.push("currentHead must match git HEAD");
  if (!report.summary.routeReturnsPartialOnMissingSettings) failures.push("missing creator settings must return partial-safe defaults");
  if (!report.summary.nonCriticalSourceFailuresArePartial) failures.push("noncritical source failures must become partial evidence");
  if (!report.summary.fatalFailuresOnlyForAuthOrUnexpectedRouteFailure) failures.push("fatal route failures must be limited to auth/permission/unexpected route failure");
  if (!report.summary.accountSettingsLabelsFixed) failures.push("account settings labels are still ambiguous");
  if (!report.summary.creatorSettingsLabelsFixed) failures.push("creator dashboard/settings labels are misrouted");
  if (!report.summary.rawInternalErrorsBlocked) failures.push("raw internal errors can still reach creator-facing source");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("P0/P1 creator settings source health blockers remain");
  if (report.nextFixOrder.length === 0) failures.push("nextFixOrder must not be empty");
  return failures;
}

function writeDoc(report: CreatorSettingsSourceHealthReport) {
  const lines = [
    "# Creator Settings Source Health",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current head: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Missing settings partial-safe: ${report.summary.routeReturnsPartialOnMissingSettings}`,
    `- Noncritical source failures partial-safe: ${report.summary.nonCriticalSourceFailuresArePartial}`,
    `- Account Settings labels fixed: ${report.summary.accountSettingsLabelsFixed}`,
    `- Creator Settings labels fixed: ${report.summary.creatorSettingsLabelsFixed}`,
    `- Raw internal errors blocked: ${report.summary.rawInternalErrorsBlocked}`,
    "",
    "## Next",
    "",
    ...report.nextFixOrder.map((step) => `- ${step}`),
    "",
  ];
  writeFileSync(join(ROOT, DOC), `${lines.join("\n")}\n`, "utf8");
}

const report = buildCreatorSettingsSourceHealthReport();
writeFileSync(join(ROOT, ARTIFACT), `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeDoc(report);
const failures = validateCreatorSettingsSourceHealthReport(report);

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`[creator-settings-source-health] ${failure}`);
  }
  process.exit(1);
}

console.log(`[creator-settings-source-health] PASS partialSafe=${report.summary.nonCriticalSourceFailuresArePartial} accountLabels=${report.summary.accountSettingsLabelsFixed}`);
