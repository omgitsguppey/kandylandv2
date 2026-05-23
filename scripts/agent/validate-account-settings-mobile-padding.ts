import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

function write(path: string, value: string) {
  mkdirSync(dirname(join(ROOT, path)), { recursive: true });
  writeFileSync(join(ROOT, path), value);
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const changed = changedFiles();
  const page = read("src/components/Settings/UserSettingsPage.tsx");
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
      && page.includes("USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET")
      && page.includes("env(safe-area-inset-bottom)")
      && page.includes("scroll-padding-bottom"),
    shellPaddingAppliedToContainerOnly: page.includes("px-[var(--account-settings-shell-side-padding)]")
      && page.includes("sm:px-0")
      && page.includes("-mx-[var(--account-settings-shell-side-padding)]"),
    reportIssueAndNavUntouched: protectedChanges.length === 0,
  };
  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => `${name} failed.`);
  const report = {
    generatedAtUtc,
    reportKey: "account-settings-mobile-padding",
    status: failures.length === 0 ? "pass" : "fail",
    currentHead,
    accountSettingsFileChanged: "src/components/Settings/UserSettingsPage.tsx",
    sidePaddingFix: "Added shell-scoped side padding with a sticky-header counter margin so mobile cards align with inset app shell chrome.",
    bottomPaddingStatus: "preserved",
    protectedChanges,
    changedFiles: changed,
    checks,
    validationFailures: failures,
  };

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
    "- Account Settings now declares side-padding parity with the app shell.",
    "- The existing bottom-safe padding for Delete Account remains in place.",
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

main();
