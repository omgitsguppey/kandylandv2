import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = process.cwd();

export type ScannedFile = {
  filePath: string;
  content: string;
};

export type CreatorLaneLegacyException = {
  filePath: string;
  pattern: string;
  allowedReason: string;
  owner: string;
  removalPlan: string;
  risk: string;
};

export type CreatorLaneOldLogicViolation = {
  pattern: string;
  filePath: string;
  lineNumber: number;
  excerpt: string;
  message: string;
};

type ForbiddenRule = {
  pattern: string;
  message: string;
  regex: RegExp;
  fileFilter?: (filePath: string) => boolean;
  requiresException?: boolean;
};

type EvaluationResult = {
  violations: CreatorLaneOldLogicViolation[];
};

const runtimeExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const scannedPrefixes = [
  "src/",
  "functions/src/",
  "scripts/",
];

const primaryCreatorUiPrefixes = [
  "src/app/admin/roster/",
  "src/app/creators/",
  "src/components/Creators/",
];

const launchCreatorLinkPrefixes = [
  "src/app/admin/",
  "src/components/",
  "src/app/dashboard/",
  "src/lib/admin/",
];

const forbiddenRules: ForbiddenRule[] = [
  {
    pattern: "legacy_creator_application_direct_patch_bridge",
    message: "creatorApplication patch intake is allowed only as a named deprecated compatibility bridge.",
    regex: /updates\.creatorApplication|creatorApplicationPatch/g,
    fileFilter: (filePath) => filePath.startsWith("src/"),
    requiresException: true,
  },
  {
    pattern: "admin_roster_generic_creator_application_put",
    message: "Admin Roster lifecycle actions must not PUT arbitrary creatorApplication blobs through /api/admin/users.",
    regex: /\/api\/admin\/users[\s\S]{0,2500}creatorApplication\s*:/g,
    fileFilter: (filePath) => filePath === "src/app/admin/roster/page.tsx",
  },
  {
    pattern: "raw_enum_label_in_primary_creator_ui",
    message: "Primary creator/admin UI must not derive labels by replacing raw enum underscores.",
    regex: /\.replaceAll\(\s*["']_["']\s*,/g,
    fileFilter: (filePath) => primaryCreatorUiPrefixes.some((prefix) => filePath.startsWith(prefix)),
  },
  {
    pattern: "role_only_creator_intake_filter",
    message: "Creator intake/review queues must not filter applicants by role === creator only.",
    regex: /creatorReviewQueue\.filter\([^;]*role\s*===\s*["']creator["']|intake lane still filters mainly by\s+`role === "creator"`/g,
    fileFilter: (filePath) => filePath.startsWith("src/"),
  },
  {
    pattern: "hardcoded_obsolete_creator_profile_route",
    message: "Creator links must use the canonical creator profile href builder, not hand-built /creators/${...} hrefs.",
    regex: /`\/creators\/\$\{/g,
    fileFilter: (filePath) => launchCreatorLinkPrefixes.some((prefix) => filePath.startsWith(prefix)),
  },
  {
    pattern: "view_as_replaces_auth_identity",
    message: "View-as mode must remain simulation context and must not replace Firebase auth identity.",
    regex: /admin_view_as_creator[\s\S]{0,1500}(signInWith|updateCurrentUser|customToken)|(signInWith|updateCurrentUser|customToken)[\s\S]{0,1500}admin_view_as_creator/g,
    fileFilter: (filePath) => filePath.startsWith("src/"),
  },
];

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function hasAllowedException(
  filePath: string,
  pattern: string,
  exceptions: CreatorLaneLegacyException[],
) {
  return exceptions.some((entry) => entry.filePath === filePath && entry.pattern === pattern);
}

function lineNumberForIndex(content: string, index: number) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function excerptForIndex(content: string, index: number) {
  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + 160);
  return content.slice(start, end).replace(/\s+/g, " ").trim();
}

function shouldScan(filePath: string) {
  const normalized = normalizePath(filePath);
  const extension = path.extname(normalized);
  return runtimeExtensions.has(extension)
    && scannedPrefixes.some((prefix) => normalized.startsWith(prefix))
    && !normalized.includes("/__snapshots__/")
    && !normalized.endsWith(".d.ts");
}

function readTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .filter(shouldScan)
    .map((filePath) => ({
      filePath: normalizePath(filePath),
      content: fs.readFileSync(path.join(repoRoot, filePath), "utf8"),
    }));
}

function readRequired(relativePath: string, failures: string[]) {
  const fullPath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string, failures: string[]) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include ${needle}`);
  }
}

function assertCondition(condition: boolean, message: string, failures: string[]) {
  if (!condition) {
    failures.push(message);
  }
}

export function evaluateCreatorLaneOldLogicPatterns(
  files: ScannedFile[],
  exceptions: CreatorLaneLegacyException[] = [],
): EvaluationResult {
  const violations: CreatorLaneOldLogicViolation[] = [];

  for (const file of files) {
    const filePath = normalizePath(file.filePath);
    for (const rule of forbiddenRules) {
      if (rule.fileFilter && !rule.fileFilter(filePath)) {
        continue;
      }

      const matches = file.content.matchAll(rule.regex);
      for (const match of matches) {
        if (rule.requiresException && hasAllowedException(filePath, rule.pattern, exceptions)) {
          continue;
        }

        violations.push({
          pattern: rule.pattern,
          filePath,
          lineNumber: lineNumberForIndex(file.content, match.index ?? 0),
          excerpt: excerptForIndex(file.content, match.index ?? 0),
          message: rule.message,
        });
      }
    }

    if (
      filePath.startsWith("src/")
      && /ownerOverrideActive\s*:\s*true/.test(file.content)
      && !/ownerOverrideReason|reason/.test(file.content)
    ) {
      violations.push({
        pattern: "owner_override_without_reason",
        filePath,
        lineNumber: 1,
        excerpt: "ownerOverrideActive: true",
        message: "Owner override activation must carry a reason.",
      });
    }
  }

  return { violations };
}

function parseCleanupReport(failures: string[]) {
  const reportText = readRequired("agent/state/creator-lane-old-logic-cleanup.generated.json", failures);
  if (!reportText) {
    return { exceptions: [] as CreatorLaneLegacyException[] };
  }

  try {
    const report = JSON.parse(reportText) as {
      remainingLegacyExceptions?: CreatorLaneLegacyException[];
      blockedPatterns?: string[];
    };
    return {
      report,
      exceptions: Array.isArray(report.remainingLegacyExceptions)
        ? report.remainingLegacyExceptions
        : [],
    };
  } catch (error) {
    failures.push(`Cleanup report must be valid JSON: ${(error as Error).message}`);
    return { exceptions: [] as CreatorLaneLegacyException[] };
  }
}

function runPositiveContractChecks(failures: string[]) {
  const docs = readRequired("docs/agent-truth/creator-lane-old-logic-cleanup.md", failures);
  const packageJson = readRequired("package.json", failures);
  const legacyInventoryDoc = readRequired("docs/agent-truth/creator-lane-legacy-truth-inventory.md", failures);
  const legacyMigrationDoc = readRequired("docs/agent-truth/legacy-creator-application-migration.md", failures);
  const rosterDoc = readRequired("docs/agent-truth/admin-roster-decision-queue.md", failures);
  const intakeDoc = readRequired("docs/agent-truth/creator-intake-flow.md", failures);

  for (const needle of [
    "users/{uid}.creatorApplication is projection only",
    "Do not PUT arbitrary creatorApplication blobs",
    "No raw enum labels",
    "role === creator only",
    "agreementVersion and agreementHash",
    "Owner override requires a reason",
    "actor marker",
    "idempotency key",
    "canonical creator profile href builder",
    "simulation context",
    "synthetic marker",
  ]) {
    requireIncludes(docs, needle, "Creator lane old logic cleanup doc", failures);
  }

  requireIncludes(packageJson, "check:creator-lane-old-logic-removal", "package scripts", failures);
  requireIncludes(legacyInventoryDoc, "Old Logic Removal Gate", "legacy truth inventory doc", failures);
  requireIncludes(legacyMigrationDoc, "Old Logic Removal Gate", "legacy migration doc", failures);
  requireIncludes(rosterDoc, "Old Logic Removal Gate", "admin roster decision queue doc", failures);
  requireIncludes(intakeDoc, "Old Logic Removal Gate", "creator intake flow doc", failures);

  const creatorOnboarding = readRequired("src/lib/creator-onboarding.ts", failures);
  const creatorApplication = readRequired("src/lib/creator-application.ts", failures);
  const legacyAdapter = readRequired("src/lib/server/creator-onboarding-legacy-adapter.ts", failures);
  const serverOnboarding = readRequired("src/lib/server/creator-onboarding.ts", failures);
  const adminUsers = readRequired("src/app/api/admin/users/route.ts", failures);
  const adminRoster = readRequired("src/app/api/admin/roster/route.ts", failures);
  const adminUserDetail = readRequired("src/app/api/admin/user/[userId]/route.ts", failures);

  for (const [label, source] of [
    ["creator onboarding contract", creatorOnboarding],
    ["creator application projection helper", creatorApplication],
    ["legacy creator application adapter", legacyAdapter],
    ["server onboarding bridge", serverOnboarding],
    ["admin users compatibility route", adminUsers],
    ["admin roster projection fallback", adminRoster],
    ["admin user detail projection fallback", adminUserDetail],
  ] as const) {
    requireIncludes(source, "projection", `${label} deprecation comment`, failures);
  }

  const creatorActionSource = [
    readRequired("src/app/api/admin/creators/[userId]/action/route.ts", failures),
    readRequired("src/lib/server/creator-admin-actions.ts", failures),
    readRequired("src/lib/server/creator-admin-action-contract.ts", failures),
  ].join("\n");
  for (const needle of [
    "buildAdminOnBehalfMarker",
    "actorMarkerToTelemetryPayload",
    "ownerOverrideActive",
    "source.ownerOverrideReason = reason || undefined",
  ]) {
    requireIncludes(creatorActionSource, needle, "typed creator admin lifecycle action path", failures);
  }

  const agreementEvidenceSource = [
    readRequired("src/lib/creator-agreement-version.ts", failures),
    readRequired("src/lib/server/creator-agreement-documents.ts", failures),
    readRequired("src/app/api/creator/onboarding/contract-signature/route.ts", failures),
  ].join("\n");
  for (const needle of [
    "agreementVersion",
    "agreementHash",
    "assertAgreementEvidenceComplete",
    "signaturesVersionMatch",
  ]) {
    requireIncludes(agreementEvidenceSource, needle, "creator agreement evidence path", failures);
  }

  for (const route of [
    "src/app/api/creator/subscriptions/route.ts",
    "src/app/api/creator/requests/route.ts",
    "src/app/api/creator/bookings/route.ts",
    "src/lib/server/chat.ts",
  ]) {
    const source = readRequired(route, failures);
    requireIncludes(source, "idempotencyKey", `${route} paid creator experience idempotency`, failures);
  }

  const routingSource = readRequired("src/lib/creator-profile-routing.ts", failures);
  requireIncludes(routingSource, "buildCreatorPublicHref", "creator profile routing helper", failures);

  const viewAsSource = [
    readRequired("src/lib/admin/synthetic-creators-view-as.ts", failures),
    readRequired("src/context/AdminViewAsContext.tsx", failures),
    readRequired("src/lib/authFetch.ts", failures),
  ].join("\n");
  for (const needle of [
    "adminViewingAsUserId",
    "admin_view_as_creator",
    "isAdminViewAsBlockedRequest",
  ]) {
    requireIncludes(viewAsSource, needle, "safe creator view-as simulation", failures);
  }

  const syntheticSource = [
    readRequired("src/lib/admin/synthetic-creators-view-as.ts", failures),
    readRequired("src/app/api/admin/roster/route.ts", failures),
  ].join("\n");
  for (const needle of [
    "isSyntheticCreator",
    "syntheticCreatorType",
    "syntheticReason",
    "buildSyntheticCreatorMarker",
  ]) {
    requireIncludes(syntheticSource, needle, "synthetic creator marker path", failures);
  }
}

function run() {
  const failures: string[] = [];
  const { report, exceptions } = parseCleanupReport(failures);

  const requiredPatterns = [
    "legacy_creator_application_direct_patch_bridge",
    "admin_roster_generic_creator_application_put",
    "raw_enum_label_in_primary_creator_ui",
    "role_only_creator_intake_filter",
    "legal_signature_completion_without_version_hash",
    "owner_override_without_reason",
    "admin_lifecycle_without_actor_marker",
    "creator_paid_experience_without_idempotency",
    "hardcoded_obsolete_creator_profile_route",
    "view_as_replaces_auth_identity",
    "synthetic_creator_without_marker",
  ];

  for (const pattern of requiredPatterns) {
    assertCondition(
      Array.isArray(report?.blockedPatterns) && report!.blockedPatterns!.includes(pattern),
      `Cleanup report blockedPatterns must include ${pattern}`,
      failures,
    );
  }

  for (const entry of exceptions) {
    for (const key of ["filePath", "pattern", "allowedReason", "owner", "removalPlan", "risk"] as const) {
      assertCondition(Boolean(entry[key]), `Legacy exception must include ${key}: ${JSON.stringify(entry)}`, failures);
    }
  }

  const evaluation = evaluateCreatorLaneOldLogicPatterns(readTrackedFiles(), exceptions);
  for (const violation of evaluation.violations) {
    failures.push(`${violation.pattern} in ${violation.filePath}:${violation.lineNumber} - ${violation.message} (${violation.excerpt})`);
  }

  runPositiveContractChecks(failures);

  if (failures.length > 0) {
    console.error("Creator lane old logic removal validation failed:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log("Creator lane old logic removal validation passed.");
}

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isMain) {
  run();
}
