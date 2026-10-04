import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listValidatorScopeFiles, withValidatorMutationScope } from "./validate-agent-takeover-safety-check";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/account-settings-mobile-padding.generated.json";
const DOC_PATH = "docs/agent-truth/account-settings-mobile-padding.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function git(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

export function changedFiles(root = ROOT, args: readonly string[] = process.argv.slice(2)) {
  return listValidatorScopeFiles(root, args);
}

function write(path: string, value: string) {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), value);
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const changed = changedFiles();
  const page = read("src/components/Settings/UserSettingsPage.tsx");
  const center = read("src/components/creative-tim/kandydrops/account/KandyAccountCenter.tsx");
  const shell = read("src/components/CoreLayoutWrapper.tsx");
  const mobileShell = read("src/lib/user-mobile-shell.ts");
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const protectedChanges = changed.filter((file) =>
    file === "src/components/Feedback/GlobalBugReportTrigger.tsx"
    || file === "src/components/Feedback/ReportBugButton.tsx"
    || file === "src/components/Navbar.tsx"
    || file === "src/components/Navigation/MobileBottomBar.tsx"
    || /^src\/components\/Chat\//u.test(file)
    || /^src\/app\/chat\//u.test(file));
  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:account-settings-mobile-padding"] === "tsx scripts/agent/validate-account-settings-mobile-padding.ts",
    sidePaddingParityMarked: page.includes('data-account-settings-side-padding-parity="true"')
      && page.includes('data-account-settings-shell-aligned="true"')
      && page.includes("--account-settings-shell-side-padding")
      && page.includes("ACCOUNT_SETTINGS_SHELL_SIDE_PADDING"),
    bottomSafetyPreserved: page.includes('data-account-settings-bottom-safe="true"')
      && page.includes('data-settings-bottom-safe="true"')
      && page.includes('data-delete-account-visible-above-floating-actions="true"')
      && page.includes("USER_MOBILE_BOTTOM_NAV_SAFE_GAP")
      && page.includes('data-account-settings-nav-reservation="root-owned"')
      && page.includes("calc(2.75rem +")
      && shell.includes("USER_MOBILE_BOTTOM_NAV_RESERVED_HEIGHT")
      && mobileShell.includes("env(safe-area-inset-bottom)")
      && !page.includes("env(safe-area-inset-bottom)")
      && page.includes("scroll-padding-bottom"),
    shellPaddingAppliedToContainerOnly: center.includes("<UserSettingsPage />")
      && center.includes("mx-auto w-full max-w-4xl px-4")
      && !/(?:sm|md|lg|xl|2xl):px-/u.test(center)
      && page.includes('ACCOUNT_SETTINGS_SHELL_SIDE_PADDING = "0rem"')
      && page.includes("px-[var(--account-settings-shell-side-padding)]")
      && !page.includes("-mx-"),
    reportIssueAndNavUntouched: protectedChanges.length === 0,
  };
  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => `${name} failed.`);
  const report = withValidatorMutationScope({
    generatedAtUtc,
    reportKey: "account-settings-mobile-padding",
    status: failures.length === 0 ? "pass" : "fail",
    currentHead,
    accountSettingsFileChanged: "src/components/Settings/UserSettingsPage.tsx",
    sidePaddingFix: "The single Account center owns horizontal insets; the child settings form has zero additional side inset and no compensating negative margin.",
    bottomPaddingStatus: "preserved",
    protectedChanges,
    changedFiles: changed,
    checks,
    validationFailures: failures,
  });

  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, [
    "# Account Settings Mobile Padding",
    "",
    `Generated: ${generatedAtUtc}`,
    `Status: ${report.status}`,
    `Head: ${currentHead}`,
    "",
    "## Summary",
    "",
    "- The single Account center owns horizontal insets; the inner settings form does not add a second inset.",
    "- Root navigation reserves the safe area; Account adds only the existing report chip clearance for Delete Account.",
    "- Report issue, top nav, bottom nav, and chat files remain untouched.",
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
    console.error("Account settings mobile padding validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Account settings mobile padding validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
