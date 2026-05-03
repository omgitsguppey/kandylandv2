import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];
const requiredDoctrineNote =
  "DailyCheckIn has two allowed presentation variants. Dashboard uses the full account-status version with welcome header and subtitle. Experiences uses the compact retention-hub version that hides the welcome header/subtitle and tightens vertical rhythm. Logic, reward ladder, check-in state, confetti, and telemetry remain shared.";

function readRequired(relativePath: string) {
  const fullPath = join(root, relativePath);
  if (!existsSync(fullPath)) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function requireIncludes(source: string, needle: string, label: string) {
  if (!source.includes(needle)) {
    failures.push(`${label} must include "${needle}".`);
  }
}

function requireNotIncludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include "${needle}".`);
  }
}

const experiencesClient = readRequired("src/app/experiences/ExperiencesClient.tsx");
const dailyCheckIn = readRequired("src/components/Dashboard/DailyCheckIn.tsx");
const dashboardClient = readRequired("src/app/dashboard/DashboardClient.tsx");
const readme = readRequired("README.md");
const agents = readRequired("AGENTS.md");
const repoMemory = readRequired("REPO_MEMORY_LEDGER.md");
const fullAudit = readRequired("FULL_SCALE_CODEBASE_AUDIT.md");
const compactDoctrine = readRequired("docs/agent-truth/experiences-compact-daily-hub.md");
const mobileDoctrine = readRequired("docs/agent-truth/mobile-shell-safe-area.md");
const pwaDoctrine = readRequired("docs/agent-truth/pwa-service-worker-mobile.md");
const packageJson = readRequired("package.json");

for (const removedHeroCard of [
  "Daily reset",
  "Reward loop",
  "Syncs with your check-in timer",
  "Earn Gum Drops for coming back daily",
]) {
  requireNotIncludes(experiencesClient, removedHeroCard, "Experiences compact hero");
}

for (const needle of [
  "data-experiences-layout=\"public-beta-compact\"",
  "data-experiences-hero-explainer-cards=\"removed\"",
  "className=\"mx-auto max-w-4xl space-y-4\"",
  "<DailyCheckIn variant=\"experiences\" />",
  "<CreatorDiscoveryRail surface=\"experiences\" compact",
  "experience_hub_viewed",
]) {
  requireIncludes(experiencesClient, needle, "Experiences compact layout");
}

for (const bannedLayout of [
  "-mt-",
  "mt-[-",
  "-mb-",
  "mb-[-",
  "translate-y",
  "h-screen",
  "100vh",
]) {
  requireNotIncludes(experiencesClient, bannedLayout, "Experiences compact layout");
  requireNotIncludes(dailyCheckIn, bannedLayout, "DailyCheckIn compact variant");
}

for (const needle of [
  "type DailyCheckInVariant = \"dashboard\" | \"experiences\"",
  "variant = \"dashboard\"",
  "const isExperiencesVariant = variant === \"experiences\"",
  "data-daily-checkin-variant={variant}",
  "Welcome back to the Kandy Shop",
  "Claim your streak and stay ready to unwrap",
  "{!isExperiencesVariant ? (",
  "min-h-[14rem] p-3.5 sm:p-5",
  "isExperiencesVariant ? \"p-3.5 sm:p-5\" : \"p-4 sm:p-6\"",
  "daily_check_in_claim",
  "DAILY_CHECK_IN_REWARD_LADDER",
  "canvas-confetti",
]) {
  requireIncludes(dailyCheckIn, needle, "DailyCheckIn variant contract");
}

requireIncludes(dashboardClient, "<DailyCheckIn />", "Dashboard DailyCheckIn full variant");
requireNotIncludes(dashboardClient, "variant=\"experiences\"", "Dashboard DailyCheckIn full variant");

for (const [label, source] of [
  ["README user manual", readme],
  ["AGENTS AI context", agents],
  ["Repo memory dev truth", repoMemory],
  ["Full audit dev truth", fullAudit],
  ["Experiences compact agent truth", compactDoctrine],
  ["Mobile shell agent truth", mobileDoctrine],
  ["PWA mobile agent truth", pwaDoctrine],
] as const) {
  requireIncludes(source, requiredDoctrineNote, label);
}

requireIncludes(packageJson, "\"check:experiences-compact-layout\": \"tsx scripts/agent/validate-experiences-compact-layout.ts\"", "Package scripts");

if (failures.length > 0) {
  console.error("Experiences compact layout validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Experiences compact layout validation passed.");
