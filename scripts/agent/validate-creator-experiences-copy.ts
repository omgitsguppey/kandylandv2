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

function requireExcludes(source: string, needle: string, label: string) {
  if (source.includes(needle)) {
    failures.push(`${label} must not include ${needle}`);
  }
}

const panel = read("src/components/Creators/CreatorExperiencesPanel.tsx");
const paidGdGuidance = read("src/components/Creators/CreatorPaidGdGuidanceCard.tsx");
const profileClient = read("src/app/creators/[username]/CreatorProfileClient.tsx");
const creatorExperiences = read("src/lib/creator-experiences.ts");
const telemetryCatalog = read("src/lib/telemetry-catalog.ts");
const docs = read("docs/agent-truth/creator-experiences-copy.md")
  + read("docs/agent-truth/creator-fan-experience-settings.md");
const tests = read("tests/unit/creator-experiences-panel.spec.tsx");
const packageJson = read("package.json");

[
  "Priority access and an exclusive connection.",
  "The most direct way to connect.",
  "No recent messages. Start the conversation!",
  "A custom treat made just for you.",
  "wear the red top",
  "Booked moment. Premium access.",
  "Date & Time",
  "Start chat",
  "Send Request",
  "Book Live Time",
  "Get more GumDrops",
  "No private thread yet. Start with a simple message.",
  "Pick a time",
  "Add Gum Drops",
].forEach((needle) => requireExcludes(panel, needle, "CreatorExperiencesPanel old copy"));

[
  "Stay closer when new access opens.",
  "Priority access to creator moments",
  "Subscriber chat perks when enabled",
  "Preferred booking offers when available",
  "Send a private message without getting lost in comments.",
  "No private thread yet. Follow {creatorGuidanceName} and start with a simple message.",
  "Ask for something specific, then let the creator decide what fits.",
  "Describe what you want, the vibe, and any details the creator should know.",
  "Reserve real time before the window closes.",
  "Available slots",
  "Start Fan Pass",
  "Open private chat",
  "Send custom request",
  "Book live time",
].forEach((needle) => requireIncludes(panel, needle, "CreatorExperiencesPanel approved copy"));

requireIncludes(panel, "CreatorPaidGdGuidanceCard", "CreatorExperiencesPanel paid-GD guidance owner");
requireIncludes(paidGdGuidance, "Open Wallet", "CreatorPaidGdGuidanceCard approved wallet CTA");
requireIncludes(paidGdGuidance, 'Add {deficit > 0 ? formatCompactGd(deficit) : "more"} GD', "CreatorPaidGdGuidanceCard approved deficit copy");

[
  "rounded-[1.4rem]",
  "p-4 sm:p-5",
  "min-h-11",
  "details",
  "data-lane-opened-count",
  "data-selected-lane",
  "data-settings-source=\"creator_settings\"",
  "data-restrictions-source=\"creator_public_state\"",
].forEach((needle) => requireIncludes(panel, needle, "CreatorExperiencesPanel mobile density/debug contract"));

["cyan-", "pink-", "orange-", "green-", "red-", "text-gray-", "bg-gray-", "border-gray-"].forEach((needle) =>
  requireExcludes(panel, needle, "CreatorExperiencesPanel KandyDrops palette"));

[
  "creator_experience_lane_opened",
  "creator_experience_lane_closed",
  "creator_experience_cta_clicked",
  "creator_experience_insufficient_balance",
  "creator_experience_request_category_selected",
  "creator_experience_booking_type_selected",
].forEach((eventName) => {
  requireIncludes(panel, eventName, "CreatorExperiencesPanel telemetry");
  requireIncludes(telemetryCatalog, eventName, "telemetry catalog");
});

[
  "actorType",
  "actorUid",
  "anonymousVisitorId",
  "sessionId",
  "creatorId",
  "lane",
  "priceGd",
  "balanceState",
  "route",
  "source: \"creator_experiences_panel\"",
].forEach((needle) => requireIncludes(panel, needle, "CreatorExperiencesPanel telemetry payload"));

requireIncludes(profileClient, "creatorId={creator.uid}", "CreatorProfileClient creatorId prop");
requireIncludes(profileClient, "creatorUsername={creator.username || username}", "CreatorProfileClient creatorUsername prop");
requireIncludes(panel, "router.push(\"/dashboard/wallet\")", "insufficient balance wallet route");

[
  "text: 1",
  "image: 5",
  "video: 10",
  "phone: 500",
  "video: 1000",
  "CREATOR_SUBSCRIPTION_MIN_GD = 500",
].forEach((needle) => requireIncludes(creatorExperiences, needle, "creator pricing constants"));

[
  "renders access-oriented copy",
  "emits lane CTA telemetry",
  "tracks insufficient balance",
  "keeps creator experience pricing constants unchanged",
].forEach((needle) => requireIncludes(tests, needle, "CreatorExperiencesPanel tests"));

requireIncludes(docs, "CreatorExperiencesPanel", "creator experiences copy docs");
requireIncludes(docs, "source: creator_experiences_panel", "creator experiences telemetry docs");
requireIncludes(packageJson, "check:creator-experiences-copy", "package scripts");

if (failures.length > 0) {
  console.error("Creator experiences copy validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Creator experiences copy validation passed.");
