import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function readOptional(relativePath: string) {
  const fullPath = join(root, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function parseJson(relativePath: string) {
  const source = readRequired(relativePath);
  try {
    return JSON.parse(source) as Record<string, unknown>;
  } catch (error) {
    failures.push(`${relativePath} must be valid JSON: ${(error as Error).message}`);
    return {};
  }
}

function requireIncludes(source: string, expected: string, label: string) {
  if (!source.includes(expected)) {
    failures.push(`${label} must include "${expected}".`);
  }
}

function requireAbsent(source: string, forbidden: string, label: string) {
  if (source.includes(forbidden)) {
    failures.push(`${label} must not include "${forbidden}".`);
  }
}

function requireArray(value: unknown, label: string, minLength = 1) {
  if (!Array.isArray(value)) {
    failures.push(`${label} must be an array.`);
    return [] as unknown[];
  }
  if (value.length < minLength) {
    failures.push(`${label} must include at least ${minLength} item(s).`);
  }
  return value;
}

function requireIssue(issues: unknown[], id: string, expectedFixed?: boolean) {
  const issue = issues.find((entry) => (
    entry
    && typeof entry === "object"
    && (entry as Record<string, unknown>).id === id
  )) as Record<string, unknown> | undefined;

  if (!issue) {
    failures.push(`audit.issues must include ${id}.`);
    return;
  }

  for (const key of [
    "filePath",
    "component",
    "driftType",
    "currentPattern",
    "expectedPattern",
    "severity",
    "launchImpact",
    "fixNow",
    "suggestedFix",
  ]) {
    if (!(key in issue)) {
      failures.push(`${id} must include ${key}.`);
    }
  }

  if (typeof expectedFixed === "boolean" && issue.fixed !== expectedFixed) {
    failures.push(`${id} fixed must be ${expectedFixed}.`);
  }
}

function collectFiles(relativeDir: string, extensions: string[]) {
  const start = join(root, relativeDir);
  const files: string[] = [];
  if (!existsSync(start)) {
    return files;
  }

  const visit = (currentPath: string) => {
    const stat = statSync(currentPath);
    if (stat.isDirectory()) {
      for (const child of readdirSync(currentPath)) {
        visit(join(currentPath, child));
      }
      return;
    }

    if (extensions.some((extension) => currentPath.endsWith(extension))) {
      files.push(currentPath);
    }
  };

  visit(start);
  return files;
}

const audit = parseJson("agent/state/design-system-drift-audit.generated.json");
const issues = requireArray(audit.issues, "audit.issues", 8);
const doc = readRequired("docs/agent-truth/design-system-drift.md");
const helper = readRequired("src/lib/design-system.ts");
const adminBadge = readRequired("src/components/Admin/AdminStatusBadge.tsx");
const dropCardParts = readRequired("src/components/DropCardParts.tsx");
const dropPreviewModal = readRequired("src/components/DropPreviewModal.tsx");
const charts = readRequired("src/components/Admin/AdminAnalyticsCharts.tsx");
const countdown = readRequired("src/lib/drop-countdown.ts");
const mobileBottomBar = readRequired("src/components/Navigation/MobileBottomBar.tsx");
const coreLayout = readRequired("src/components/CoreLayoutWrapper.tsx");
const userMobileShell = readRequired("src/lib/user-mobile-shell.ts");
const packageJson = readRequired("package.json");
const auditLedger = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const repoLedger = readRequired("REPO_MEMORY_LEDGER.md");
const checklist = readRequired("EVERY_FILE_FUNCTION_CHECKLIST.md");
const unitTest = readRequired("tests/unit/design-system-drift.spec.ts");

for (const [id, fixed] of [
  ["DSD-001", true],
  ["DSD-002", true],
  ["DSD-003", true],
  ["DSD-004", true],
  ["DSD-005", false],
  ["DSD-006", false],
  ["DSD-007", false],
  ["DSD-008", true],
] as const) {
  requireIssue(issues, id, fixed);
}

requireIncludes(helper, "LAUNCH_BADGE_CONTAINMENT_CLASSNAME", "design-system helper");
requireIncludes(helper, "LAUNCH_STATIC_BADGE_CLASSNAME", "design-system helper");
requireIncludes(helper, "KANDYDROPS_CHART_COLORS", "design-system helper");

requireIncludes(adminBadge, "LAUNCH_BADGE_CONTAINMENT_CLASSNAME", "AdminStatusBadge");
requireIncludes(adminBadge, "border-brand-purple/30 bg-brand-purple/10", "AdminStatusBadge");
requireIncludes(adminBadge, "border-gray-500/30 bg-gray-500/10", "AdminStatusBadge");
requireAbsent(adminBadge, "cyan-", "AdminStatusBadge");
requireAbsent(adminBadge, "sky-", "AdminStatusBadge");
requireAbsent(adminBadge, "slate-", "AdminStatusBadge");

requireIncludes(dropCardParts, "LAUNCH_BADGE_CONTAINMENT_CLASSNAME", "DropCardParts");
requireIncludes(dropCardParts, "LAUNCH_STATIC_BADGE_CLASSNAME", "DropCardParts");
requireIncludes(dropCardParts, "aria-live=\"off\"", "DropCardParts");
requireAbsent(dropCardParts, "font-mono", "DropCardParts");
requireAbsent(dropCardParts, "font-[ui-monospace", "DropCardParts");

requireIncludes(dropPreviewModal, "LAUNCH_BADGE_CONTAINMENT_CLASSNAME", "DropPreviewModal");
requireIncludes(dropPreviewModal, "LAUNCH_STATIC_BADGE_CLASSNAME", "DropPreviewModal");

requireIncludes(charts, "KANDYDROPS_CHART_COLORS", "AdminAnalyticsCharts");
requireIncludes(charts, "KANDYDROPS_CHART_COLORS.grid", "AdminAnalyticsCharts");
requireIncludes(charts, "KANDYDROPS_CHART_COLORS.axis", "AdminAnalyticsCharts");
requireIncludes(charts, "KANDYDROPS_CHART_COLORS.legend", "AdminAnalyticsCharts");
requireAbsent(charts, "const CHART_PURPLE = \"#b28cff\"", "AdminAnalyticsCharts");
requireAbsent(charts, "const CHART_PURPLE_LIGHT = \"#d8b4fe\"", "AdminAnalyticsCharts");
requireAbsent(charts, "stroke=\"#6b7280\"", "AdminAnalyticsCharts");
requireAbsent(charts, "color: \"#9ca3af\"", "AdminAnalyticsCharts");
requireAbsent(charts, "stroke=\"rgba(255,255,255,0.05)\"", "AdminAnalyticsCharts");
requireAbsent(charts, "backgroundColor: \"rgba(0,0,0,0.88)\"", "AdminAnalyticsCharts");

requireIncludes(countdown, "if (msLeft > DROP_COUNTDOWN_ONE_DAY_MS)", "drop countdown formatter");
requireIncludes(countdown, "visibleLabel: formatCountdownClock(msLeft)", "drop countdown formatter");
requireIncludes(countdown, "fullLabel: formatFullCountdownLabel(msLeft)", "drop countdown formatter");

requireIncludes(mobileBottomBar, "USER_MOBILE_BOTTOM_NAV_BOTTOM_OFFSET", "MobileBottomBar");
requireIncludes(mobileBottomBar, "USER_MOBILE_BOTTOM_NAV_HEIGHT", "MobileBottomBar");
requireIncludes(coreLayout, "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT", "CoreLayoutWrapper");
requireIncludes(userMobileShell, "USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT", "user mobile shell");

const launchUiFiles = [
  ...collectFiles("src/app", [".tsx", ".ts"]),
  ...collectFiles("src/components", [".tsx", ".ts"]),
  join(root, "public", "manifest.json"),
  join(root, "public", "firebase-messaging-sw.js"),
].filter((filePath) => existsSync(filePath));
for (const filePath of launchUiFiles) {
  const source = readFileSync(filePath, "utf8");
  for (const obsoleteAsset of ["next.svg", "vercel.svg", "file.svg", "globe.svg", "window.svg"]) {
    if (source.includes(obsoleteAsset)) {
      failures.push(`Launch UI must not reference obsolete starter asset ${obsoleteAsset}: ${filePath}`);
    }
  }
}

const adminMainUi = [
  "src/app/admin/page.tsx",
  "src/app/admin/analytics/page.tsx",
  "src/components/Admin/AdminAnalyticsCharts.tsx",
  "src/components/Admin/AdminDashboardModule.tsx",
].map((relativePath) => readOptional(relativePath)).join("\n");
for (const forbidden of ["[DEGRADED]", "DEGRADED:", "Degraded:"]) {
  requireAbsent(adminMainUi, forbidden, "admin main UI visible copy");
}

const shellFiles = [
  "src/app/layout.tsx",
  "src/components/CoreLayoutWrapper.tsx",
  "src/components/Navigation/MobileBottomBar.tsx",
  "src/components/Navbar.tsx",
  "src/components/Chat/ChatRouteShell.tsx",
  "src/lib/user-mobile-shell.ts",
];
for (const relativePath of shellFiles) {
  const source = readOptional(relativePath);
  if (!source) {
    continue;
  }
  for (const forbidden of ["-mt-", "-mb-", "-ml-", "-mr-", "-mx-", "-my-", "-translate-x-", "-translate-y-"]) {
    if (source.includes(forbidden)) {
      failures.push(`${relativePath} must not use shell negative-margin/translate hack ${forbidden}.`);
    }
  }
}

requireIncludes(doc, "Drop timers inherit the site font", "design-system drift doc");
requireIncludes(doc, "KANDYDROPS_CHART_COLORS", "design-system drift doc");
requireIncludes(packageJson, "\"check:design-system-drift\"", "package scripts");
requireIncludes(auditLedger, "Design System Drift Launch Audit", "FULL_SCALE_CODEBASE_AUDIT");
requireIncludes(repoLedger, "Design system drift is launch-gated", "REPO_MEMORY_LEDGER");
requireIncludes(checklist, "Design System Drift Launch Audit Coverage", "EVERY_FILE_FUNCTION_CHECKLIST");
requireIncludes(unitTest, "design system drift launch contracts", "design-system drift unit test");

if (failures.length > 0) {
  console.error("Design system drift validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Design system drift validation passed.");
