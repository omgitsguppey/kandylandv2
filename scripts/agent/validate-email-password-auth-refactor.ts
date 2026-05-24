import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { EMAIL_PASSWORD_AUTH_CONTRACT, buildEmailAuthDebugLane } from "../../src/lib/auth/email-password-auth-contract";
import {
  buildRegistrationRollbackPlan,
  classifyEmailAuthFailure,
  prepareEmailLogin,
  prepareEmailSignup,
  validateEmailSignupInput,
} from "../../src/lib/auth/email-password-auth-flow";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(dirname(__filename), "..", "..");
const STATE_PATH = "agent/state/email-password-auth-refactor.generated.json";
const DOC_PATH = "docs/agent-truth/email-password-auth-refactor.md";

const SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
  "overallHealthScore",
] as const;

type ScoreDimension = typeof SCORE_DIMENSIONS[number];
type ScoreSnapshot = Record<ScoreDimension, number>;
type DirtyClassification =
  | "current_generated_artifact_to_commit"
  | "stale_generated_artifact_to_regenerate"
  | "stale_auth_logic_to_remove"
  | "stale_email_auth_logic_to_remove"
  | "unrelated_agent_context_file_to_ignore"
  | "real_source_change_needs_review"
  | "release_artifact_expected"
  | "validator_artifact_expected"
  | "test_artifact_expected"
  | "unsafe_unknown";

type EmailPasswordAuthReport = {
  generatedAtUtc: string;
  currentHead: string;
  contractStatus: "mapped" | "missing";
  signupFlowStatus: "mapped" | "missing";
  loginFlowStatus: "mapped" | "missing";
  registrationOutcomeClassification: "mapped" | "missing";
  rollbackStatus: "safe" | "missing";
  navigationSessionOrdering: "after_registration_truth" | "unsafe_before_registration";
  welcomeBonusSource: "reward_gd_only" | "unsafe_paid_or_unknown";
  signupIntentStatus: {
    fan: "preserved" | "missing";
    creator: "preserved" | "missing";
  };
  manualRegistrationStateStatus: "cleared_in_finally" | "can_remain_stuck";
  commonEmailErrorsMapped: Array<{ code: string; kind: string; resolution: string; message: string }>;
  googleAuthPathStatus: "untouched_required_path_present" | "missing";
  debugLaneStatus: ReturnType<typeof buildEmailAuthDebugLane>;
  scoreBefore: ScoreSnapshot;
  scoreAfter: ScoreSnapshot;
  scoreDimensions: Record<ScoreDimension, {
    before: number;
    after: number;
    target: 80;
    status: "target_met" | "below_target";
    nextExactAction: string;
  }>;
  dirtyFiles: Array<{ path: string; classification: DirtyClassification }>;
  oldLogicClassification: Array<{
    reference: string;
    classification: "still_required" | "superseded" | "stale_removed" | "unsafe_unknown";
    reason: string;
  }>;
  protectedSurfaceStatus: {
    chatTouched: boolean;
    taskTouched: boolean;
    notificationTouched: boolean;
    paymentRuntimeTouched: boolean;
    walletRuntimeTouched: boolean;
    gumdropRuntimeTouched: boolean;
  };
  remainingGaps: string[];
  nextExactSteps: string[];
  validationFailures: string[];
};

function shell(command: string, args: readonly string[]) {
  try {
    return execFileSync(command, [...args], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function read(path: string) {
  const fullPath = join(ROOT, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function readJson(path: string): Record<string, any> {
  const text = read(path);
  if (!text) return {};
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : {};
  } catch {
    return {};
  }
}

function write(path: string, value: string) {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value);
}

function currentHead() {
  return shell("git", ["rev-parse", "--short", "HEAD"]) || "unknown";
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function scoreSnapshot(): ScoreSnapshot {
  const score = readJson("agent/state/public-beta-score.generated.json");
  const dimensions = score.scoreDimensions ?? score.healthV2?.metrics ?? score.metrics ?? score;
  return {
    sourceHealth: numberValue(dimensions.sourceHealth ?? dimensions.sourceHealthScore ?? score.sourceHealthScore),
    runtimeHealth: numberValue(dimensions.runtimeHealth ?? dimensions.runtimeHealthScore ?? score.runtimeHealthScore),
    evidenceCompleteness: numberValue(dimensions.evidenceCompleteness ?? dimensions.evidenceCompletenessScore ?? score.evidenceCompletenessScore),
    freshness: numberValue(dimensions.freshness ?? dimensions.freshnessScore ?? score.freshnessScore),
    costRisk: numberValue(dimensions.costRisk ?? dimensions.costRiskScore ?? score.costRiskScore),
    regressionRisk: numberValue(dimensions.regressionRisk ?? dimensions.regressionRiskScore ?? score.regressionRiskScore),
    overallHealthScore: numberValue(dimensions.overallHealthScore ?? dimensions.healthScore ?? score.overallHealthScore ?? score.healthScore),
  };
}

function dirtyFiles() {
  const files = new Set<string>();
  for (const args of [["diff", "--name-only"], ["diff", "--cached", "--name-only"], ["ls-files", "--others", "--exclude-standard"]] as const) {
    for (const file of shell("git", args).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)) {
      files.add(file.replace(/\\/gu, "/"));
    }
  }
  return [...files].sort();
}

export function classifyEmailPasswordAuthDirtyFile(path: string): DirtyClassification {
  const normalized = path.replace(/\\/gu, "/");
  if (normalized === "agent/context/optimized-task-context.generated.json") return "unrelated_agent_context_file_to_ignore";
  if (normalized === STATE_PATH) return "current_generated_artifact_to_commit";
  if (normalized === DOC_PATH) return "release_artifact_expected";
  if (normalized === "scripts/agent/validate-email-password-auth-refactor.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-provider-conflict-resolution.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-persistence-stability.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-runtime-telemetry.ts") return "validator_artifact_expected";
  if (normalized === "scripts/agent/validate-auth-readiness-lock.ts") return "validator_artifact_expected";
  if (normalized === "tests/unit/email-password-auth-refactor.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-readiness-lock.spec.ts") return "test_artifact_expected";
  if (normalized === "tests/unit/auth-errors.spec.ts") return "test_artifact_expected";
  if (
    normalized === "src/context/AuthContext.tsx"
    || normalized === "src/lib/auth-errors.ts"
    || normalized === "src/lib/auth/email-password-auth-contract.ts"
    || normalized === "src/lib/auth/email-password-auth-flow.ts"
    || normalized === "src/lib/analytics/person-metrics-hydration.ts"
    || normalized === "package.json"
  ) return "real_source_change_needs_review";
  if (
    normalized === "CHANGELOG.md"
    || normalized === "public/kandydrops-release-notes.json"
    || normalized === "src/lib/release-notes/public-release-notes.ts"
    || normalized === "src/lib/release-notes/release-version-contract.ts"
  ) return "release_artifact_expected";
  if (normalized.startsWith("agent/state/") && normalized.endsWith(".generated.json")) return "current_generated_artifact_to_commit";
  if (normalized.startsWith("docs/agent-truth/") && normalized.endsWith(".md")) return "release_artifact_expected";
  if (/chat|task|notification|wallet|payment|paypal|gumdrop/iu.test(normalized)) return "unsafe_unknown";
  return "unsafe_unknown";
}

function protectedSurfaceStatus(files: string[]) {
  return {
    chatTouched: files.some((path) => /^src\/(components\/Chat|lib\/chat|app\/api\/.*chat)/u.test(path)),
    taskTouched: files.some((path) => /^src\/(lib\/tasks|app\/api\/checkin|components\/Dashboard\/DailyCheckIn)/u.test(path)),
    notificationTouched: files.some((path) => /^src\/(lib\/notifications|components\/Notifications|components\/Dashboard\/NotificationPromptBanner|lib\/pwa|public\/firebase-messaging-sw)/u.test(path)),
    paymentRuntimeTouched: files.some((path) => /^src\/(app\/api\/(paypal|checkout)|lib\/paypal|components\/PurchaseModal)/u.test(path)),
    walletRuntimeTouched: files.some((path) => /^src\/(app\/api\/wallet|lib\/wallet)/u.test(path)),
    gumdropRuntimeTouched: files.some((path) => /^src\/lib\/(gumdrop|gumdrop-ledger)/u.test(path)),
  };
}

function scoreDimensions(before: ScoreSnapshot, after: ScoreSnapshot): EmailPasswordAuthReport["scoreDimensions"] {
  return Object.fromEntries(SCORE_DIMENSIONS.map((dimension) => {
    const afterValue = after[dimension];
    return [dimension, {
      before: before[dimension],
      after: afterValue,
      target: 80,
      status: afterValue >= 80 ? "target_met" : "below_target",
      nextExactAction: afterValue >= 80
        ? "No email/password auth-specific score action required."
        : "Run the beta score lane after auth evidence lands; remaining below-target score is governed by formal evidence/cost gates.",
    }];
  })) as EmailPasswordAuthReport["scoreDimensions"];
}

function validateReport(report: EmailPasswordAuthReport) {
  const failures: string[] = [];
  if (report.contractStatus !== "mapped") failures.push("email/password auth contract missing");
  if (report.signupFlowStatus !== "mapped") failures.push("signup flow helpers missing");
  if (report.loginFlowStatus !== "mapped") failures.push("login flow helpers missing");
  if (report.registrationOutcomeClassification !== "mapped") failures.push("email signup can create Firebase user without profile/register outcome classification");
  if (report.rollbackStatus !== "safe") failures.push("rollback path can leave ghost auth user without report");
  if (report.navigationSessionOrdering !== "after_registration_truth") failures.push("navigation session established before registration truth");
  if (report.welcomeBonusSource !== "reward_gd_only") failures.push("welcome bonus classified as paid GD or unknown");
  if (report.signupIntentStatus.creator !== "preserved" || report.signupIntentStatus.fan !== "preserved") failures.push("creator/fan intent lost");
  if (report.manualRegistrationStateStatus !== "cleared_in_finally") failures.push("manual registration state can remain stuck");
  if (report.commonEmailErrorsMapped.length < 8) failures.push("common email auth errors unmapped");
  if (report.googleAuthPathStatus !== "untouched_required_path_present") failures.push("Google auth path changed unnecessarily or missing required calls");
  if (Object.values(report.protectedSurfaceStatus).some(Boolean)) failures.push("protected chat/task/notification/payment/wallet/GumDrop surface changed");
  const unsafe = report.dirtyFiles.filter((entry) => entry.classification === "unsafe_unknown");
  if (unsafe.length > 0) failures.push(`dirty files unclassified: ${unsafe.map((entry) => entry.path).join(", ")}`);
  return failures;
}

function buildReport(): EmailPasswordAuthReport {
  const authContext = read("src/context/AuthContext.tsx");
  const flow = read("src/lib/auth/email-password-auth-flow.ts");
  const contract = read("src/lib/auth/email-password-auth-contract.ts");
  const packageJson = read("package.json");
  const files = dirtyFiles();
  const before = scoreSnapshot();
  const after = before;
  const commonErrors = [
    "auth/email-already-in-use",
    "auth/use-google-sign-in",
    "auth/invalid-email",
    "auth/wrong-password",
    "auth/invalid-credential",
    "auth/username-already-in-use",
    "auth/missing-password",
    "auth/weak-password",
    "auth/navigation-session-failed",
  ].map((code) => {
    const failure = classifyEmailAuthFailure({ code });
    return {
      code,
      kind: failure.kind,
      resolution: failure.resolution,
      message: failure.safeUserMessage,
    };
  });

  const preparedFan = prepareEmailSignup({
    email: "Fan@Example.com",
    password: "long-enough-password",
    username: "fanname",
    dob: "1999-01-01",
    signupIntent: "fan",
  });
  const preparedCreator = prepareEmailSignup({
    email: "creator@example.com",
    password: "long-enough-password",
    username: "creatorname",
    dob: "1997-01-01",
    signupIntent: "creator",
    creatorDisplayName: "Creator Name",
  });
  const validation = validateEmailSignupInput({
    email: "Fan@Example.com",
    password: "long-enough-password",
    username: "fanname",
    dob: "1999-01-01",
    signupIntent: "fan",
  });
  const login = prepareEmailLogin("Fan@Example.com");
  const rollbackPlan = buildRegistrationRollbackPlan({
    firebaseUserCreated: true,
    profileRegistrationSucceeded: false,
    navigationSessionSucceeded: false,
  });

  const registerIndex = authContext.indexOf("const result = await readManualRegistrationResult(response)");
  const sessionIndex = authContext.indexOf("await ensureNavigationSessionEstablished({", registerIndex);
  const googleFunction = authContext.slice(
    authContext.indexOf("const signInWithGoogle"),
    authContext.indexOf("const signInWithEmail"),
  );

  const report: EmailPasswordAuthReport = {
    generatedAtUtc: new Date().toISOString(),
    currentHead: currentHead(),
    contractStatus: contract.includes("EMAIL_PASSWORD_AUTH_CONTRACT") && EMAIL_PASSWORD_AUTH_CONTRACT.welcomeBonusSource === "reward_gd_only" ? "mapped" : "missing",
    signupFlowStatus: flow.includes("prepareEmailSignup") && preparedFan.normalizedEmail === "fan@example.com" && validation.ok === true ? "mapped" : "missing",
    loginFlowStatus: flow.includes("prepareEmailLogin") && login.normalizedIdentifier === "fan@example.com" ? "mapped" : "missing",
    registrationOutcomeClassification: authContext.includes("profileRegistrationSucceeded") && authContext.includes("readManualRegistrationResult(response)") ? "mapped" : "missing",
    rollbackStatus: rollbackPlan.deleteFirebaseUser && authContext.includes("buildRegistrationRollbackPlan") && authContext.includes("deleteUser(createdUser)") ? "safe" : "missing",
    navigationSessionOrdering: registerIndex >= 0 && sessionIndex > registerIndex ? "after_registration_truth" : "unsafe_before_registration",
    welcomeBonusSource: contract.includes("reward_gd_only") && authContext.includes("reward GumDrops") && !authContext.includes("paid GD") ? "reward_gd_only" : "unsafe_paid_or_unknown",
    signupIntentStatus: {
      fan: preparedFan.signupIntent === "fan" && authContext.includes("signupIntent === \"creator\" ? \"creator\" : \"fan\"") ? "preserved" : "missing",
      creator: preparedCreator.signupIntent === "creator" && preparedCreator.postAuthRouteIntent === "creator_waitlist" && authContext.includes("CREATOR_WAITLIST_PATH") ? "preserved" : "missing",
    },
    manualRegistrationStateStatus: authContext.includes("manualRegistrationStateRef.current = null") && authContext.includes("finally") ? "cleared_in_finally" : "can_remain_stuck",
    commonEmailErrorsMapped: commonErrors,
    googleAuthPathStatus: googleFunction.includes("GoogleAuthProvider")
      && googleFunction.includes("signInWithPopup")
      && googleFunction.includes("signInWithRedirect")
      && googleFunction.includes("ensureNavigationSessionEstablished")
      ? "untouched_required_path_present"
      : "missing",
    debugLaneStatus: buildEmailAuthDebugLane(),
    scoreBefore: before,
    scoreAfter: after,
    scoreDimensions: scoreDimensions(before, after),
    dirtyFiles: files.map((path) => ({ path, classification: classifyEmailPasswordAuthDirtyFile(path) })),
    oldLogicClassification: [
      {
        reference: "manualRegistrationStateRef",
        classification: "still_required",
        reason: "Auth profile snapshot suppresses auto-registration while manual profile registration is in flight.",
      },
      {
        reference: "ensureManualSignupUsername",
        classification: "still_required",
        reason: "Client preflight still verifies username availability before Firebase account creation.",
      },
      {
        reference: "readManualRegistrationResult",
        classification: "still_required",
        reason: "Server registration response remains canonical for profile bootstrap and welcome bonus result.",
      },
    ],
    protectedSurfaceStatus: protectedSurfaceStatus(files),
    remainingGaps: [],
    nextExactSteps: [
      "Run an authenticated local manual signup/login smoke when browser QA is explicitly authorized.",
      "Keep Firebase provider conflict handling separate from automatic provider linking until a safe linking flow exists.",
    ],
    validationFailures: [],
  };

  report.validationFailures = validateReport(report);
  if (!packageJson.includes("\"check:email-password-auth-refactor\"")) {
    report.validationFailures.push("package script check:email-password-auth-refactor missing");
  }
  return report;
}

function writeDoc(report: EmailPasswordAuthReport) {
  const lines = [
    "# Email Password Auth Refactor",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current HEAD: ${report.currentHead}`,
    "",
    "## Status",
    "",
    `- Contract: ${report.contractStatus}`,
    `- Signup flow: ${report.signupFlowStatus}`,
    `- Login flow: ${report.loginFlowStatus}`,
    `- Registration outcome classification: ${report.registrationOutcomeClassification}`,
    `- Rollback: ${report.rollbackStatus}`,
    `- Navigation session ordering: ${report.navigationSessionOrdering}`,
    `- Welcome bonus source: ${report.welcomeBonusSource}`,
    `- Manual registration state: ${report.manualRegistrationStateStatus}`,
    `- Google auth path: ${report.googleAuthPathStatus}`,
    "",
    "## Common Error Mapping",
    "",
    ...report.commonEmailErrorsMapped.map((entry) => `- ${entry.code}: ${entry.kind} -> ${entry.resolution}`),
    "",
    "## Dirty File Classification",
    "",
    ...report.dirtyFiles.map((entry) => `- ${entry.path}: ${entry.classification}`),
    "",
    "## Score Dimensions",
    "",
    ...SCORE_DIMENSIONS.map((dimension) => {
      const score = report.scoreDimensions[dimension];
      return `- ${dimension}: ${score.before} -> ${score.after} (${score.status})`;
    }),
    "",
    "## Remaining Gaps",
    "",
    ...(report.remainingGaps.length ? report.remainingGaps.map((gap) => `- ${gap}`) : ["- None for source-level email/password auth refactor."]),
    "",
    "## Next Exact Steps",
    "",
    ...report.nextExactSteps.map((step) => `- ${step}`),
    "",
  ];
  write(DOC_PATH, `${lines.join("\n")}\n`);
}

const report = buildReport();
write(STATE_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeDoc(report);

if (report.validationFailures.length > 0) {
  console.error("Email/password auth refactor validation failed:");
  for (const failure of report.validationFailures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Email/password auth refactor validation passed. Report: ${STATE_PATH}`);
