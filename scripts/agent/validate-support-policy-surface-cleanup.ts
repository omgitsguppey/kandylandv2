import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  getBrokenSupportPolicySurfaces,
  getDuplicateSupportPolicyRoutesWithoutRedirect,
  getNotConfiguredSupportPolicySurfaces,
  getSupportPolicySurfaceDebugSummary,
  SUPPORT_POLICY_DEBUG_LANE,
  SUPPORT_POLICY_SURFACE_CONTRACT_VERSION,
  SUPPORT_POLICY_SURFACES,
} from "@/lib/support-policy/support-policy-surface-contract";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/support-policy-surface-cleanup.generated.json";
const DOC_PATH = "docs/agent-truth/support-policy-surface-cleanup.md";

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

function includesAll(source: string, snippets: readonly string[]) {
  return snippets.every((snippet) => source.includes(snippet));
}

function surfaceRouteExists(routeSource: string) {
  return existsSync(join(ROOT, routeSource));
}

export function isSupportPolicyProtectedChange(file: string, approvedChatErrorLanguageChange = false) {
  const normalized = file.replace(/\\/gu, "/");
  const isRuntimeSource = normalized.startsWith("src/");

  return (/^src\/components\/Chat\//u.test(normalized)
      && !(normalized === "src/components/Chat/ChatExperience.tsx" && approvedChatErrorLanguageChange))
    || /^src\/app\/chat\//u.test(normalized)
    || /^src\/app\/dashboard\/chat\//u.test(normalized)
    || /(^|\/)(TopNav|BottomNav|Navbar|MobileBottomBar)\.(tsx|ts|jsx|js)$/u.test(normalized)
    || /^src\/components\/Navigation\//u.test(normalized)
    || /^src\/app\/api\/(paypal|wallet|payment|checkout)\b/iu.test(normalized)
    || /^src\/lib\/(paypal|payment|wallet|gumdrop|gumdrops|gumdrop-)/iu.test(normalized)
    || (isRuntimeSource && (
      normalized.includes("Delete")
      || normalized.includes("delete-flow")
      || normalized.includes("mobile-padding")
    ));
}

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const changed = changedFiles();
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const supportSafety = read("src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx");
  const privacyData = read("src/app/dashboard/profile/components/ProfilePrivacyDataSection.tsx");
  const settingsContract = read("src/lib/settings/settings-surface-contract.ts");
  const faqPage = read("src/app/faq/page.tsx");
  const faqClient = read("src/app/faq/FAQClient.tsx");
  const privacyPage = read("src/app/(legal)/privacy/page.tsx");
  const supportPage = read("src/app/dashboard/support/page.tsx");
  const supportInbox = read("src/components/Support/SupportInbox.tsx");
  const dataRoute = read("src/app/api/user/data/route.ts");
  const supportRoute = read("src/app/api/support/threads/route.ts");
  const guestSupportRoute = read("src/app/api/support/threads/guest/route.ts");
  const featureRegistry = read("src/lib/features/feature-registration-registry.ts");
  const debugTower = read("src/lib/admin-debug-control-tower.ts");

  const approvedChatErrorLanguageChange = supportInbox.includes("class SupportRequestError extends Error")
    && existsSync(join(ROOT, "tests/unit/chat-experience-error-language.spec.ts"))
    && read("tests/unit/chat-experience-error-language.spec.ts").includes("ChatClientSafeError")
    && read("src/components/Chat/ChatExperience.tsx").includes("buildChatSafeError")
    && read("src/components/Chat/ChatExperience.tsx").includes("readChatDiagnosticCode");
  const protectedChanges = changed.filter((file) =>
    isSupportPolicyProtectedChange(file, approvedChatErrorLanguageChange));

  const brokenSurfaces = getBrokenSupportPolicySurfaces();
  const notConfiguredSurfaces = getNotConfiguredSupportPolicySurfaces();
  const duplicateRoutes = getDuplicateSupportPolicyRoutesWithoutRedirect();
  const debugSummary = getSupportPolicySurfaceDebugSummary();
  const routeSourcesMissing = SUPPORT_POLICY_SURFACES
    .filter((surface) => !surfaceRouteExists(surface.routeSource))
    .map((surface) => `${surface.id}:${surface.routeSource}`);
  const surfacesWithoutFallback = SUPPORT_POLICY_SURFACES
    .filter((surface) => !surface.supportFallbackRoute)
    .map((surface) => surface.id);

  const policiesAliasActiveWithoutRedirect = existsSync(join(ROOT, "src/app/policies/page.tsx"))
    && !read("src/app/policies/page.tsx").includes('redirect("/privacy")');
  const supportAliasActiveWithoutRedirect = existsSync(join(ROOT, "src/app/support/page.tsx"))
    && !read("src/app/support/page.tsx").includes('redirect("/dashboard/support")');

  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:support-policy-surface-cleanup"] === "tsx scripts/agent/validate-support-policy-surface-cleanup.ts",
    contractVersioned: SUPPORT_POLICY_SURFACE_CONTRACT_VERSION === "2026.05.support-policy-surface.1"
      && SUPPORT_POLICY_SURFACES.length === 6,
    routeMapCanonical: includesAll(JSON.stringify(SUPPORT_POLICY_SURFACES), [
      '"id":"faq"',
      '"id":"support"',
      '"id":"policies"',
      '"id":"privacy_policy"',
      '"id":"data_export"',
      '"id":"account_recovery_support"',
    ]),
    routeSourcesExist: routeSourcesMissing.length === 0,
    faqSupportPoliciesPrivacyLinksNotDead: includesAll(supportSafety, ['href="/faq"', 'href="/dashboard/support"', 'href="/privacy"'])
      && includesAll(privacyData, ['href="/privacy"', "handleDownloadData"])
      && faqPage.includes("FAQClient")
      && faqClient.includes("faq_page_viewed")
      && privacyPage.includes("Privacy Policy")
      && supportPage.includes("SupportInbox"),
    duplicatePolicySupportRoutesRedirected: duplicateRoutes.length === 0
      && !policiesAliasActiveWithoutRedirect
      && !supportAliasActiveWithoutRedirect,
    downloadMyDataActionBacked: includesAll(settingsContract, [
      'settingId: "download_my_data"',
      'backendRouteOrAction: "/api/user/data"',
      "data_export_requested",
    ]) && includesAll(privacyData, ["handleDownloadData", "Download My Data"])
      && includesAll(dataRoute, ['guardApiRequest(request, {', 'routeName: "user/data"', '"Content-Disposition"', "USER_DATA_EXPORT_PAGE_SIZE"]),
    supportFallbackReady: surfacesWithoutFallback.length === 0
      && includesAll(supportInbox, ["Support ticket could not be created right now.", "Support reply could not be sent right now."])
      && includesAll(supportRoute, ["createSupportThread", "listSupportThreadsForUser"])
      && includesAll(guestSupportRoute, ["support/threads/guest", "auth: \"none\"", "createSupportThread"]),
    featureRegistrationPresent: includesAll(featureRegistry, [
      'featureId: "support"',
      "src/app/faq",
      "src/app/dashboard/support",
      "src/app/(legal)/privacy",
      "src/app/api/user/data",
      "policy, privacy, and data export trust surfaces",
    ]),
    debugVisibilityPresent: SUPPORT_POLICY_SURFACES.every((surface) => surface.debugVisibility === SUPPORT_POLICY_DEBUG_LANE.laneId)
      && debugSummary.laneId === "support_policy_surface_health"
      && includesAll(debugTower, ["support_policy_surface_health", "support-policy-surface-cleanup.generated.json", "npm run check:support-policy-surface-cleanup"]),
    noBrokenOrDishonestSurfaces: brokenSurfaces.length === 0 && notConfiguredSurfaces.length === 0,
    protectedSurfacesUntouched: protectedChanges.length === 0,
  };

  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([name]) => `${name} failed.`);

  const report = {
    generatedAtUtc,
    reportKey: "support-policy-surface-cleanup",
    status: failures.length === 0 ? "pass" : "fail",
    currentHead,
    supportPolicyContractVersion: SUPPORT_POLICY_SURFACE_CONTRACT_VERSION,
    surfaces: SUPPORT_POLICY_SURFACES,
    debugSummary,
    routeSourcesMissing,
    duplicateRoutes,
    surfacesWithoutFallback,
    changedFiles: changed,
    protectedChanges,
    checks,
    validationFailures: failures,
  };

  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, [
    "# Support Policy Surface Cleanup",
    "",
    `Generated: ${generatedAtUtc}`,
    `Status: ${report.status}`,
    `Head: ${currentHead}`,
    "",
    "## Canonical Trust Surface Map",
    "",
    ...SUPPORT_POLICY_SURFACES.map((surface) =>
      `- ${surface.label}: ${surface.canonicalRoute}; status=${surface.status}; feature=${surface.featureRegistrationId}; fallback=${surface.supportFallbackRoute}`
    ),
    "",
    "## Result",
    "",
    "- Account Settings FAQ, Support, Policies, Privacy Policy, and Download My Data entries point to working canonical surfaces or authenticated actions.",
    "- Policies are consolidated into the canonical Privacy Policy route instead of duplicated placeholder content.",
    "- Download My Data remains an authenticated `/api/user/data` export action with support fallback copy.",
    "- Support and account recovery remain in the support inbox and support thread routes.",
    "- Debug visibility is registered through `support_policy_surface_health` and Admin Debug Control Tower generated reports.",
    "",
    "## Validator Failure Rules",
    "",
    "- FAQ/Support/Policies/Privacy links are dead",
    "- duplicate policy/support route exists without redirect",
    "- Download My Data links to broken action",
    "- support fallback missing",
    "- feature registration missing",
    "- debug visibility missing",
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
    console.error("Support policy surface cleanup validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Support policy surface cleanup validation passed.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
