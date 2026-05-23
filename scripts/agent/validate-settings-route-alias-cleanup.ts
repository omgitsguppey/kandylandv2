import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/settings-route-alias-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/settings-route-alias-cleanup.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, value: string) {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), value);
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function changedFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const line of git([...args]).split(/\r?\n/u)) {
      const file = line.trim().replace(/\\/gu, "/");
      if (file) files.add(file);
    }
  }
  return [...files].sort();
}

function includesAll(source: string, snippets: string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function plainSettingsLabel(source: string) {
  return /label="Settings"|title="Settings"|aria-label="Open settings"/u.test(source);
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const changed = changedFiles();
  const routeContract = read("src/lib/settings/settings-route-contract.ts");
  const routing = read("src/lib/creator-profile-routing.ts");
  const accountSettingsPage = read("src/app/settings/page.tsx");
  const dashboardSettingsAlias = read("src/app/dashboard/settings/page.tsx");
  const dashboardProfileAlias = read("src/app/dashboard/profile/page.tsx");
  const profileSettingsAlias = read("src/app/profile/settings/page.tsx");
  const accountAlias = read("src/app/account/page.tsx");
  const creatorAlias = read("src/app/creator/page.tsx");
  const creatorsDashboardAlias = read("src/app/creators/dashboard/page.tsx");
  const creatorDashboard = read("src/app/dashboard/creator/page.tsx");
  const creatorSettings = read("src/app/dashboard/creator/settings/page.tsx");
  const creatorDropManager = read("src/app/dashboard/creator/drops/page.tsx");
  const creatorMigration = read("src/app/dashboard/profile/creator/page.tsx");
  const publicCreatorProfile = read("src/app/creators/[username]/page.tsx");
  const sidebar = read("src/components/Navigation/ProfileSidebar.tsx");
  const dropdown = read("src/components/Navigation/ProfileDropdown.tsx");
  const privacyPage = read("src/app/(legal)/privacy/page.tsx");
  const featureRegistry = read("src/lib/features/feature-registration-registry.ts");
  const splitValidator = read("scripts/agent/validate-settings-creator-dashboard-split.ts");
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };

  const protectedChanges = changed.filter((file) =>
    /^src\/app\/dashboard\/chat\//u.test(file)
    || /^src\/components\/Chat\//u.test(file)
    || /^src\/app\/api\/chat\//u.test(file)
    || /^src\/components\/Navigation\//u.test(file)
    || /(^|\/)(TopNav|BottomNav|Navbar)\.(tsx|ts|jsx|js)$/u.test(file)
    || /^src\/app\/api\/(paypal|wallet|payment|checkout)\b/iu.test(file)
    || /^src\/lib\/(paypal|payment|wallet|gumdrop|gumdrops|gumdrop-)/iu.test(file));

  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:settings-route-alias-cleanup"] === "tsx scripts/agent/validate-settings-route-alias-cleanup.ts",
    routeTableCanonical: includesAll(routeContract, [
      'accountSettingsRoute: "/settings"',
      'creatorSettingsRoute: "/dashboard/creator/settings"',
      'userProfileRoute: "/settings"',
      'creatorDashboardRoute: "/dashboard/creator"',
      'creatorDropManagerRoute: "/dashboard/creator/drops"',
      'publicCreatorProfileRoutePattern: "/creators/[username]"',
      '"/dashboard/settings"',
      '"/dashboard/profile"',
      '"/profile/settings"',
      '"/account"',
      '"/creator"',
      '"/creators/dashboard"',
    ]),
    routeConstantsCanonical: includesAll(routing, [
      'CREATOR_DASHBOARD_ROUTE = "/dashboard/creator"',
      'CREATOR_SETTINGS_ROUTE = "/dashboard/creator/settings"',
      'CREATOR_DROP_MANAGE_ROUTE = "/dashboard/creator/drops"',
      'USER_SETTINGS_ROUTE = "/settings"',
      'USER_PROFILE_ROUTE = "/settings"',
      'USER_LIBRARY_ROUTE = "/dashboard/library"',
    ]),
    accountSettingsCanonicalOnly: accountSettingsPage.includes("UserSettingsPage")
      && !accountSettingsPage.includes("CreatorDashboardSettingsHub")
      && !accountSettingsPage.includes("CreatorWorkspacePanel"),
    accountAliasesRedirect: includesAll(dashboardSettingsAlias, ['redirect("/settings")'])
      && includesAll(dashboardProfileAlias, ['redirect("/settings")'])
      && includesAll(profileSettingsAlias, ['redirect("/settings")'])
      && includesAll(accountAlias, ['redirect("/settings")']),
    creatorAliasesStayCreator: includesAll(creatorAlias, ['redirect("/dashboard/creator")'])
      && includesAll(creatorsDashboardAlias, ['redirect("/dashboard/creator")'])
      && creatorDashboard.includes("CreatorDashboardLandingRoute")
      && !creatorDashboard.includes("CreatorDashboardSettingsHub"),
    creatorSettingsSeparated: creatorSettings.includes("CreatorDashboardSettingsHub")
      && !creatorSettings.includes("UserSettingsPage")
      && creatorDropManager.includes("CreatorDropManager"),
    legacyCreatorProfileSettingsExplained: includesAll(creatorMigration, [
      "Creator settings now live in Creator Settings.",
      "Open Creator Settings",
      "href={CREATOR_SETTINGS_ROUTE}",
    ]),
    labelsUnambiguous: includesAll(`${sidebar}\n${dropdown}`, [
      'label="Account Settings"',
      'label="Creator Settings"',
      "href={USER_SETTINGS_ROUTE}",
      "href={CREATOR_SETTINGS_ROUTE}",
    ]) && !plainSettingsLabel(`${sidebar}\n${dropdown}`)
      && privacyPage.includes("Account Settings")
      && !privacyPage.includes("Profile Settings"),
    featureRegistrationIncludesCanonicalAndAliases: includesAll(featureRegistry, [
      "src/app/settings",
      "src/app/dashboard/settings",
      "src/app/dashboard/profile",
      "src/app/profile/settings",
      "src/app/account/page.tsx",
      "src/app/dashboard/creator/settings",
    ]),
    splitValidatorUpdated: splitValidator.includes('USER_SETTINGS_ROUTE = "/settings"')
      && splitValidator.includes('redirect(\\"/settings\\")')
      && splitValidator.includes('dashboardProfileRedirect'),
    publicCreatorProfileRoutePresent: publicCreatorProfile.length > 0,
    protectedSurfacesUntouched: protectedChanges.length === 0,
  };

  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => `${name} failed.`);

  const report = {
    generatedAtUtc,
    reportKey: "settings-route-alias-cleanup",
    status: failures.length === 0 ? "pass" : "fail",
    currentHead,
    canonicalRouteTable: {
      accountSettingsRoute: "/settings",
      creatorSettingsRoute: "/dashboard/creator/settings",
      userProfileRoute: "/settings",
      creatorDashboardRoute: "/dashboard/creator",
      creatorDropManagerRoute: "/dashboard/creator/drops",
      publicCreatorProfileRoutePattern: "/creators/[username]",
    },
    redirectAliases: {
      accountSettings: ["/dashboard/settings", "/dashboard/profile", "/profile/settings", "/account"],
      creatorDashboard: ["/creator", "/creators/dashboard"],
      creatorSettingsMigration: ["/dashboard/profile/creator"],
    },
    changedFiles: changed,
    protectedChanges,
    checks,
    validationFailures: failures,
  };

  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, [
    "# Settings Route Alias Cleanup",
    "",
    `Generated: ${generatedAtUtc}`,
    `Status: ${report.status}`,
    `Head: ${currentHead}`,
    "",
    "## Canonical Route Table",
    "",
    "- Account Settings: `/settings`",
    "- Creator Settings: `/dashboard/creator/settings`",
    "- User profile basics: Account Settings profile section at `/settings`",
    "- Creator Dashboard: `/dashboard/creator`",
    "- Creator Drop Manager: `/dashboard/creator/drops`",
    "- Public Creator Profile: `/creators/[username]`",
    "",
    "## Redirect Aliases",
    "",
    "- `/dashboard/settings`, `/dashboard/profile`, `/profile/settings`, and `/account` redirect to `/settings`.",
    "- `/creator` and `/creators/dashboard` redirect to `/dashboard/creator`.",
    "- `/dashboard/profile/creator` remains a migration notice that points to Creator Settings.",
    "",
    "## Checks",
    "",
    ...Object.entries(checks).map(([name, passed]) => `- ${passed ? "pass" : "fail"}: ${name}`),
    "",
    "## Validation Failures",
    "",
    ...(failures.length > 0 ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
  ].join("\n"));

  if (failures.length > 0) {
    console.error("Settings route alias cleanup validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Settings route alias cleanup validation passed.");
}

main();
