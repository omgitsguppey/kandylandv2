import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const runtime = read("functions/src/behavioral-intelligence-runtime.ts");
const recommendationServer = read("src/lib/server/behavioral-intelligence.ts");
const adminUserPage = read("src/app/admin/user/[userId]/page.tsx");

assert(runtime.includes("confidenceScore"), "Behavioral runtime does not persist confidence score.");
assert(runtime.includes("insufficientSignal") && runtime.includes("recommendationThresholdMet"), "Behavioral runtime does not persist insufficient-signal gate fields.");
assert(runtime.includes("purchaseCount"), "Behavioral runtime confidence formula is missing purchase signal.");
assert(runtime.includes("sessionFrequency30d"), "Behavioral runtime confidence formula is missing return cadence.");
assert(recommendationServer.includes("BEHAVIORAL_PROFILE_EXPLANATION_THRESHOLD"), "Server recommendation threshold constant is missing.");
assert(recommendationServer.includes("buildBehavioralRecommendationState"), "Server recommendation state helper is missing.");
assert(!recommendationServer.includes("watchSessionCount || 0) * 2"), "Server recommendation confidence still derives from legacy watch/event counts.");
assert(!recommendationServer.includes("eventCount || 0) +"), "Server recommendation confidence still derives from legacy event counts.");
assert(
  recommendationServer.includes("if (recommendationState.insufficientSignal)") && recommendationServer.includes("return [];"),
  "Low-signal users are still receiving recommendation payloads.",
);
assert(
  recommendationServer.includes("const recommendationLimit = recommendationState.explanationEligible ? limit : Math.min(limit, 3)")
    && recommendationServer.includes(".slice(0, recommendationLimit)"),
  "Fallback recommendations are not capped to three.",
);
assert(adminUserPage.includes("Insufficient signal"), "Admin user page does not show compact insufficient signal state.");
assert(adminUserPage.includes("fallback recommendation"), "Admin user page does not clearly label fallback recommendations.");
assert(adminUserPage.includes("showBehavioralExplanationCards"), "Admin user page does not gate explanation cards by confidence.");

console.log("Behavioral intelligence confidence validator passed.");
