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

const rules = read("src/lib/behavioral/review-badge-rules.ts");
const badge = read("src/components/Admin/AdminReviewBadge.tsx");
const usersPage = read("src/app/admin/users/page.tsx");
const userDetailPage = read("src/app/admin/user/[userId]/page.tsx");
const statsBar = read("src/components/Admin/AdminStatsBar.tsx");
const docs = read("docs/agent-truth/admin-review-badges.md");
const packageJson = read("package.json");

assert(rules.includes("buildAdminReviewBadge"), "Review badge rules helper is missing.");
assert(rules.includes("buildBehaviorRollupReviewBadge"), "Behavior rollup review helper is missing.");
assert(rules.includes("watch_time_missing_despite_views"), "Review rules do not flag missing watch time despite views.");
assert(rules.includes("onboarded_missing_auth_stats"), "Review rules do not flag onboarded users missing auth stats.");
assert(rules.includes("revenue_missing_purchase_count"), "Review rules do not flag revenue without purchases.");
assert(rules.includes("personalized_output_low_confidence"), "Review rules do not flag low-confidence personalized output.");
assert(rules.includes("expected_settlement_delay"), "Review rules do not preserve delayed as expected settlement only.");

assert(badge.includes("data-admin-review-reason"), "Admin review badge does not expose a concrete reason code.");
assert(badge.includes("getAdminReviewLabel(decision.severity)") && badge.includes("decision.reasonCode"), "Admin review badge does not render severity with a reason code.");

assert(usersPage.includes("AdminReviewBadge"), "User Management does not render admin review badges.");
assert(usersPage.includes("buildBehaviorRollupReviewBadge"), "User Management does not use canonical behavior review rules.");
assert(usersPage.includes("buildAdminReviewBadge"), "User Management summary metrics do not use canonical review rules.");

assert(userDetailPage.includes("AdminReviewBadge"), "User detail does not render admin review badges.");
assert(userDetailPage.includes("buildBehaviorRollupReviewBadge"), "User detail does not use canonical behavior review rules.");
assert(userDetailPage.includes("reviewDecision={recommendationReviewDecision}"), "Recommendation verdict card is missing review badge wiring.");

assert(statsBar.includes("AdminReviewBadge"), "Admin stats bar does not surface review badges.");
assert(statsBar.includes("buildAdminReviewBadge"), "Admin stats bar does not use canonical review rules.");

assert(!badge.includes(">ERROR<"), "Admin review badge still allows a naked ERROR label.");
assert(!badge.includes(">REVIEW<"), "Admin review badge still allows a naked REVIEW label.");

assert(packageJson.includes("\"check:admin-review-badges\""), "Package script check:admin-review-badges is missing.");
assert(docs.includes("reason code"), "Admin review badges doctrine doc does not require a reason code.");

console.log("Admin review badges validator passed.");
