import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include ${needle}`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include ${needle}`);
  }
}

const intakeContract = read("src/lib/creator-intake-flow.ts");
const intakeUi = read("src/components/Auth/CreatorIntakeFlow.tsx");
const authModal = read("src/components/Auth/AuthModal.tsx");
const authHelpers = read("src/components/Auth/AuthHelpers.ts");
const authContext = read("src/context/AuthContext.tsx");
const registerRoute = read("src/app/api/user/register/route.ts");
const creatorOnboarding = read("src/lib/creator-onboarding.ts");
const serverOnboarding = read("src/lib/server/creator-onboarding.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const packageJson = read("package.json");
const docs = read("docs/agent-truth/creator-intake-flow.md");
const identityDocs = read("docs/agent-truth/creator-identity-markers.md");
const rosterDocs = read("docs/agent-truth/admin-roster-decision-queue.md");
const tests = [
  read("tests/unit/creator-intake-flow.spec.ts"),
  read("tests/unit/creator-intake-flow-component.spec.tsx"),
  read("tests/unit/creator-onboarding-server.spec.ts"),
  read("tests/unit/user-register-route.spec.ts"),
].join("\n");

[
  "CREATOR_INTAKE_STEPS",
  "You already have attention. Let’s decide what it should become.",
  "Where do your fans already find you?",
  "Recommended creator setup",
  "Review the creator agreement",
  "Submit for review",
  "creatorMonetizationGoals",
  "creatorFollowerRange",
  "creatorPostingFrequency",
  "fansAlreadyAskForAccess",
  "creatorRecommendedSetup",
  "intakeVersion",
  "intakeSubmittedAt",
  "intakeSource",
  "creator_site",
].forEach((needle) => requireIncludes(intakeContract, needle, "creator intake contract"));

[
  "Step {step + 1} of {CREATOR_INTAKE_STEPS.length}",
  "pb-[calc(0.5rem+env(safe-area-inset-bottom))]",
  "aria-pressed",
  "Timed drops + private chat",
  "Fan pass + custom requests",
  "Live time + priority chat",
  "Drops only",
  "Start simple / decide later",
].forEach((needle) => requireIncludes(intakeContract + intakeUi + authModal, needle, "creator intake UI"));

[
  "legalStatus",
  "idVerificationStatus",
  "signature_pending",
  "id_not_requested",
  "segment_unassigned",
  "manual segment",
  "manual review",
].forEach((needle) => requireNotIncludes(intakeUi, needle, "creator-facing intake UI"));

[
  "CREATOR_SIGNUP_STEPS = CREATOR_INTAKE_STEP_COUNT",
  "creatorStepFields",
  "creatorMonetizationGoals",
  "creatorRecommendedSetup",
].forEach((needle) => requireIncludes(authHelpers, needle, "auth helper intake schema"));

[
  "creator_intake_started",
  "creator_intake_step_completed",
  "creator_intake_goal_selected",
  "creator_intake_recommended_setup_shown",
  "creator_intake_submitted",
  "actorType",
  "stepKey",
].forEach((needle) => {
  requireIncludes(authModal + registerRoute + telemetryCatalog, needle, "creator intake telemetry");
});

[
  "sanitizeCreatorIntakeFields",
  "ensureCreatorOnboardingSubmission",
  "creatorMonetizationGoals",
  "creatorFollowerRange",
  "creatorPostingFrequency",
  "fansAlreadyAskForAccess",
  "creatorRecommendedSetup",
  "intakeSubmittedAt",
].forEach((needle) => {
  requireIncludes(registerRoute + authContext + serverOnboarding + creatorOnboarding, needle, "creator intake persistence");
});

[
  "intake_started",
  "intake_step_completed",
  "intake_submitted",
  "buildCreatorOnboardingInitialHistoryEntries",
].forEach((needle) => requireIncludes(serverOnboarding + creatorOnboarding, needle, "creator intake history"));

requireIncludes(packageJson, "check:creator-intake-flow", "package scripts");
requireIncludes(docs, "five-step", "creator intake docs");
requireIncludes(identityDocs, "creator_intake_started", "identity marker docs");
requireIncludes(rosterDocs, "creator intake", "admin roster docs");
requireIncludes(tests, "creator intake flow contract", "creator intake tests");
requireIncludes(tests, "renders the expected creator-facing step titles", "creator intake component tests");

if (failures.length > 0) {
  console.error("Creator intake flow validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator intake flow validation passed.");
