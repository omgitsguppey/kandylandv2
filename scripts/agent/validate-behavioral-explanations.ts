import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readBehavioralAdminConsumers, hasRenderedExpression } from "./validate-behavioral-truth-source";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const helper = read("src/lib/behavioral/behavioral-explanation.ts");
const verdictCard = read("src/components/Admin/BehavioralVerdictCard.tsx");
const adminUserPage = read("src/app/admin/user/[userId]/page.tsx");
const adminUsersPage = read("src/app/admin/users/page.tsx");
const runtime = read("functions/src/behavioral-intelligence-runtime.ts");
const recommendationExplanations = read("src/lib/recommendations/recommendation-explanations.ts");
const docs = read("docs/agent-truth/behavioral-explanations.md");
const consumers = readBehavioralAdminConsumers();

assert(helper.includes("buildEngagementBehavioralExplanation"), "Behavioral explanation helper is missing engagement explanation builder.");
assert(helper.includes("buildValueBehavioralExplanation"), "Behavioral explanation helper is missing value explanation builder.");
assert(helper.includes("buildRecommendationBehavioralExplanation"), "Behavioral explanation helper is missing recommendation explanation builder.");
assert(helper.includes("Insufficient signal") || helper.includes("insufficient_signal"), "Behavioral explanation helper does not model insufficient signal.");

assert(verdictCard.includes("Why this verdict?"), "Behavioral verdict card does not collapse debug detail under 'Why this verdict?'.");
assert(verdictCard.includes("AdminTruthBadge"), "Behavioral verdict card does not show truth-state badges.");

assert(adminUserPage.includes("BehavioralVerdictCard"), "Admin user detail does not use the shared verdict card.");
assert(adminUserPage.includes("Recommendation verdict"), "Admin user detail does not show a recommendation verdict first.");
assert(!adminUserPage.includes("Score {entry.score}"), "Recommendation score chips are still primary UI on admin user detail.");
assert(adminUserPage.includes("showBehavioralExplanationCards"), "Admin user detail no longer gates explanation cards by confidence.");

assert(adminUsersPage.includes("buildEngagementBehavioralExplanation"), "Admin users page does not use the shared engagement explanation helper.");
assert(adminUsersPage.includes("buildValueBehavioralExplanation"), "Admin users page does not use the shared value explanation helper.");
assert(adminUsersPage.includes("engagementExplanation.verdict"), "Admin users page is not rendering verdict-first engagement copy.");
assert(consumers.hasDirectoryReason("engagement") && consumers.hasDirectoryReason("value"), "Loaded Admin directory must render canonical plain-English behavior reasons.");
assert(consumers.hasDetailReasons("engagement") && consumers.hasDetailReasons("value") && hasRenderedExpression(consumers.verdictRender, "explanation.summary"), "Admin user detail must render canonical summaries and top-three reasons.");

assert(runtime.includes("insufficientSignal"), "Behavioral runtime no longer persists insufficient-signal truth.");
assert(runtime.includes("recommendationState"), "Behavioral runtime no longer persists recommendation state.");
assert(recommendationExplanations.includes("fallback-only because no creator or content affinity has formed yet"), "Fallback recommendation explanation is not plain-English.");

assert(!helper.includes("setInterval(") && !verdictCard.includes("setInterval(") && !adminUserPage.includes("setInterval(") && !adminUsersPage.includes("setInterval("), "Behavioral explanation surfaces added polling.");
assert(docs.includes("verdicts and plain-English reasons by default"), "Behavioral explanation doctrine doc is missing the verdict-first rule.");

console.log("Behavioral explanations validator passed.");
