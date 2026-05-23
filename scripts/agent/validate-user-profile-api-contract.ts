import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");
const REPORT_PATH = "agent/state/user-profile-api-contract.generated.json";
const DOC_PATH = "docs/agent-truth/user-profile-api-contract.md";

function read(path: string) {
  return readFileSync(join(ROOT, path), "utf8");
}

function write(path: string, value: string) {
  const absolutePath = join(ROOT, path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, value);
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

function main() {
  const generatedAtUtc = new Date().toISOString();
  const currentHead = git(["rev-parse", "HEAD"]) || "unknown";
  const changed = changedFiles();
  const packageJson = JSON.parse(read("package.json")) as { scripts?: Record<string, string> };
  const route = read("src/app/api/user/profile/route.ts");
  const contract = read("src/lib/user/user-profile-contract.ts");
  const userSettingsContract = read("src/lib/settings/user-settings-contract.ts");
  const clientPreferencesContract = read("src/lib/settings/client-preferences-contract.ts");
  const profileState = read("src/app/dashboard/profile/hooks/useProfileState.tsx");
  const featureRegistry = read("src/lib/features/feature-registration-registry.ts");
  const appApiUserFiles = git(["ls-files", "src/app/api/user"]).split(/\r?\n/u).filter(Boolean).map((file) => file.replace(/\\/gu, "/"));

  const protectedChanges = changed.filter((file) =>
    /^src\/app\/dashboard\/chat\//u.test(file)
    || /^src\/components\/Chat\//u.test(file)
    || /^src\/app\/api\/chat\//u.test(file)
    || /^src\/components\/Navigation\//u.test(file)
    || /(^|\/)(TopNav|BottomNav|Navbar)\.(tsx|ts|jsx|js)$/u.test(file)
    || /^src\/app\/api\/(paypal|wallet|payment|checkout)\b/iu.test(file)
    || /^src\/lib\/(paypal|payment|wallet|gumdrop|gumdrops|gumdrop-)/iu.test(file)
    || /^src\/app\/api\/creator\//u.test(file)
    || /^src\/lib\/creator-settings\//u.test(file)
  );

  const staleProfileRoutes = appApiUserFiles.filter((file) =>
    file !== "src/app/api/user/profile/route.ts"
    && /profile/i.test(file)
    && /route\.(ts|tsx|js|jsx)$/u.test(file)
  );

  const checks = {
    packageScriptPresent: packageJson.scripts?.["check:user-profile-api-contract"] === "tsx scripts/agent/validate-user-profile-api-contract.ts",
    contractDeclaresFieldBoundaries: includesAll(contract, [
      'USER_PROFILE_CONTRACT_VERSION = "2026.05.user-profile-api.1"',
      "USER_PROFILE_READABLE_FIELDS",
      "USER_PROFILE_WRITABLE_FIELDS",
      "USER_PROFILE_SERVER_ONLY_FIELDS",
      "USER_PROFILE_DISPLAY_ONLY_FIELDS",
      "USER_PROFILE_IDENTITY_TELEMETRY_FIELDS",
      '"creatorSettings"',
      '"privacySettings"',
      '"actorUserId"',
    ]),
    profileResponseShapeCanonical: includesAll(route, [
      "buildCanonicalUserProfileResponse",
    ]) && includesAll(contract, [
      "responseVersion",
      "sourceTruth",
      "accountSettingsConsumer",
    ]) && userSettingsContract.includes('readEndpoint: "/api/user/profile"')
      && userSettingsContract.includes('writeEndpoint: "/api/user/profile"')
      && clientPreferencesContract.includes('backendRouteOrContract: "/api/user/profile"')
      && profileState.includes('authFetch("/api/user/profile"'),
    arbitraryUserIdBlocked: route.includes("scopeToCaller: true")
      && route.includes("getServerOnlyUserProfilePayloadKeys")
      && route.includes("sanitizeUserProfileWritePayload")
      && route.includes("USER_PROFILE_HUMAN_ERRORS.serverOnlyField")
      && !/payload\.(userId|uid)/u.test(route)
      && !/collection\("users"\)\.doc\((payload|body|requestBody|input)\./u.test(route),
    writableServerOnlySeparated: contract.includes("isWritableUserProfileField")
      && contract.includes("getServerOnlyUserProfilePayloadKeys")
      && contract.includes("USER_PROFILE_SERVER_ONLY_FIELDS")
      && !contract.includes('"creatorSettings",\n] as const;\n\nexport const USER_PROFILE_WRITABLE_FIELDS'),
    accountSettingsCanonicalConsumer: profileState.includes('authFetch("/api/user/profile"')
      && !profileState.includes("/api/profile")
      && !profileState.includes("/api/account/profile"),
    diagnosticsAndHumanErrors: route.includes('routeName: "user/profile"')
      && route.includes("recordRouteRuntimeSample")
      && route.includes("withRouteRuntimeHealth")
      && route.includes("getErrorMessage")
      && route.includes("USER_PROFILE_HUMAN_ERRORS.noValidUpdates")
      && route.includes("USER_PROFILE_HUMAN_ERRORS.serverOnlyField"),
    staleRoutesRemoved: staleProfileRoutes.length === 0
      && !route.includes("updates.creatorSettings = normalizeCreatorSettings")
      && !route.includes("normalizeCreatorSettings(payload.creatorSettings)"),
    featureRegisteredAndTelemetry: featureRegistry.includes("src/app/api/user/profile")
      && route.includes('trackServerEvent("setting_save_succeeded"'),
    protectedSurfacesUntouched: protectedChanges.length === 0,
  };

  const failures: string[] = [];
  if (!checks.packageScriptPresent) failures.push("package script check:user-profile-api-contract is missing");
  if (!checks.contractDeclaresFieldBoundaries) failures.push("writable/server-only fields are confused");
  if (!checks.profileResponseShapeCanonical) failures.push("profile response shape differs across consumers");
  if (!checks.arbitraryUserIdBlocked) failures.push("arbitrary userId can be used");
  if (!checks.accountSettingsCanonicalConsumer) failures.push("Account Settings consumes non-canonical profile shape");
  if (!checks.diagnosticsAndHumanErrors) failures.push("profile route lacks diagnostics/human error");
  if (!checks.staleRoutesRemoved) failures.push("stale profile routes remain active");
  if (!checks.featureRegisteredAndTelemetry) failures.push("profile route lacks feature registration or settings telemetry");
  if (!checks.protectedSurfacesUntouched) failures.push(`protected surfaces changed: ${protectedChanges.join(", ")}`);

  const report = {
    generatedAtUtc,
    currentHead,
    status: failures.length === 0 ? "passed" : "failed",
    sourceOfTruth: "src/app/api/user/profile/route.ts",
    contractPath: "src/lib/user/user-profile-contract.ts",
    canonicalRoute: "/api/user/profile",
    staleProfileRoutes,
    changedFiles: changed,
    checks,
    failures,
  };

  write(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  write(DOC_PATH, `# User Profile API Contract

Generated: ${generatedAtUtc}

## Status

${report.status}

## Contract

- Canonical route: \`/api/user/profile\`
- Contract: \`src/lib/user/user-profile-contract.ts\`
- Source truth: \`users/{uid}\`
- Account Settings consumers stay on the canonical profile endpoint.

## Guardrails

- Arbitrary client \`userId\` and identity fields are blocked by the write sanitizer.
- Server-only fields, including \`role\`, \`email\`, balances, and \`creatorSettings\`, are not writable through the user profile route.
- Creator Settings remains owned by \`/api/creator/settings\`.
- Route diagnostics and human-readable profile errors are required.
- Settings save telemetry is emitted through the existing telemetry catalog event.

## Failures

${failures.length > 0 ? failures.map((failure) => `- ${failure}`).join("\n") : "- None"}
`);

  if (failures.length > 0) {
    console.error(`User profile API contract validation failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
    process.exit(1);
  }

  console.log("User profile API contract validation passed.");
}

main();
