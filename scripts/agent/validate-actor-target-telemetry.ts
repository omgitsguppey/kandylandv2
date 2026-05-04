import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures: string[] = [];

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

const packageJson = JSON.parse(readRequired("package.json") || "{}") as {
  scripts?: Record<string, string>;
};
const contract = readRequired("src/lib/analytics/analytics-event-contract.ts");
const parity = readRequired("src/lib/behavioral/event-fact-normalizer.ts");
const serverAnalytics = readRequired("src/lib/server/analytics.ts");
const telemetrySafety = readRequired("src/lib/telemetry-safety.ts");
const creatorExperiences = readRequired("src/lib/server/creator-experiences.ts");
const creatorProfileClient = readRequired("src/app/creators/[username]/CreatorProfileClient.tsx");
const chatExperience = readRequired("src/components/Chat/ChatExperience.tsx");
const creatorExperiencesPanel = readRequired("src/components/Creators/CreatorExperiencesPanel.tsx");
const creatorRelationshipsRoute = readRequired("src/app/api/creator/relationships/route.ts");
const userFollowRoute = readRequired("src/app/api/user/follow/route.ts");

if (packageJson.scripts?.["check:actor-target-telemetry"] !== "tsx scripts/agent/validate-actor-target-telemetry.ts") {
  failures.push('package.json must expose check:actor-target-telemetry.');
}

for (const field of [
  "actorUserId",
  "actorCreatorId",
  "actorAdminId",
  "targetUserId",
  "targetCreatorId",
]) {
  requireIncludes(contract, field, "Analytics event contract");
}

requireIncludes(parity, 'readString(params, "target_creator_id", "targetCreatorId", "creator_id", "creatorId")', "Identified metric parity target creator mapping");
requireIncludes(parity, 'readString(params, "actor_creator_id", "actorCreatorId"', "Identified metric parity creator actor mapping");
requireIncludes(serverAnalytics, "actorUserId", "Server analytics actor-target write path");
requireIncludes(serverAnalytics, "actorAdminId", "Server analytics actor-target write path");
requireIncludes(serverAnalytics, "actorCreatorId", "Server analytics actor-target write path");
requireIncludes(serverAnalytics, 'readStringParam(enrichedParams, "target_creator_id", "targetCreatorId", "creator_id", "creatorId")', "Server analytics creator target fallback");

for (const key of [
  '"actor_user_id"',
  '"actor_creator_id"',
  '"actor_admin_id"',
  '"target_user_id"',
  '"target_creator_id"',
]) {
  requireIncludes(telemetrySafety, key, "Telemetry safety priority keys");
}

requireIncludes(creatorExperiences, "target_creator_id", "Creator experience server telemetry payload");
requireIncludes(creatorExperiences, "actor_user_id", "Creator experience server actor payload");
requireIncludes(creatorProfileClient, "target_creator_id", "Creator profile client telemetry");
requireIncludes(chatExperience, "target_creator_id", "Chat telemetry payload");
requireIncludes(creatorExperiencesPanel, "target_creator_id", "Creator experiences panel telemetry");
requireIncludes(creatorRelationshipsRoute, "target_creator_id", "Creator relationships route telemetry");
requireIncludes(userFollowRoute, "target_creator_id", "User follow route telemetry");

if (failures.length > 0) {
  console.error("Actor-target telemetry validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Actor-target telemetry validator passed.");
