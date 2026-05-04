import { existsSync, readFileSync } from "fs";
import path from "path";

const repoRoot = process.cwd();
const failures: string[] = [];

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function requireFile(relativePath: string) {
  if (!existsSync(path.join(repoRoot, relativePath))) {
    failures.push(`Missing required file: ${relativePath}`);
    return "";
  }

  return read(relativePath);
}

function requireIncludes(content: string, needle: string, label: string) {
  if (!content.includes(needle)) {
    failures.push(`${label} is missing ${needle}`);
  }
}

function requireNotIncludes(content: string, needle: string, label: string) {
  if (content.includes(needle)) {
    failures.push(`${label} must not include ${needle}`);
  }
}

const route = requireFile("src/app/api/creator/subscriptions/route.ts");
const serverExperience = requireFile("src/lib/server/creator-experiences.ts");
const profileClient = requireFile("src/app/creators/[username]/CreatorProfileClient.tsx");
const problemCopy = requireFile("src/lib/problem-state-copy.ts");
const tests = requireFile("tests/unit/creator-subscriptions-route.spec.ts");
const docs = requireFile("docs/agent-truth/creator-experience-transaction-truth.md");
const packageJson = JSON.parse(requireFile("package.json")) as { scripts?: Record<string, string> };

[
  "creator_or_user_not_found",
  "creator_unavailable",
  "subscriptions_unavailable",
  "insufficient_paid_gumdrops",
  "invalid_subscription_request",
  "unauthorized",
].forEach((code) => requireIncludes(route, code, "Fan Pass typed subscription route"));

requireIncludes(serverExperience, "subscription: {", "creator spend policy registry");
requireIncludes(serverExperience, "purchasedOnly: true", "creator spend policy registry");
requireIncludes(route, 'spendCreatorExperienceGumdrops(balance, priceGd, "subscription")', "Fan Pass route");
requireIncludes(route, "purchasedOnly: true", "Fan Pass subscription record");
requireIncludes(route, "source_policy: \"creator_subscription_paid_only\"", "Fan Pass debug/telemetry payload");
requireIncludes(route, "paidBalanceBefore", "Fan Pass debug/telemetry payload");
requireIncludes(route, "paidBalanceAfter", "Fan Pass debug/telemetry payload");
requireIncludes(route, "rewardBalanceBefore", "Fan Pass debug/telemetry payload");
requireIncludes(route, "rewardBalanceAfter", "Fan Pass debug/telemetry payload");
requireIncludes(route, "gracePeriodEndsAt: null", "Fan Pass renewal readiness fields");
requireIncludes(route, "renewalFailureCount: 0", "Fan Pass renewal readiness fields");
requireIncludes(route, "lastRenewalAttemptAt: null", "Fan Pass renewal readiness fields");
requireIncludes(route, "renewalState: \"active\"", "Fan Pass renewal readiness fields");
requireIncludes(route, "code: result.action === \"subscribe\" && result.duplicatePrevented ? \"already_active\" : undefined", "Fan Pass duplicate active response");
requireNotIncludes(route, 'throw new Error("Creator or user not found")', "Fan Pass expected failures");
requireNotIncludes(route, 'throw new Error("Creator unavailable")', "Fan Pass expected failures");
requireNotIncludes(route, 'throw new Error("Subscriptions are unavailable for this creator")', "Fan Pass expected failures");
requireNotIncludes(route, "throw new Error(spend.error)", "Fan Pass expected failures");

const cancelIndex = route.indexOf('if (action === "cancel")');
const spendIndex = route.indexOf('spendCreatorExperienceGumdrops(balance, priceGd, "subscription")');
if (cancelIndex === -1 || spendIndex === -1 || cancelIndex > spendIndex) {
  failures.push("Fan Pass cancel path must return before paid spend is attempted");
}

const duplicateIndex = route.indexOf("duplicatePrevented: true");
if (duplicateIndex === -1 || spendIndex === -1 || duplicateIndex > spendIndex) {
  failures.push("Fan Pass duplicate active path must short-circuit before paid spend is attempted");
}

requireIncludes(problemCopy, "getCreatorSubscriptionProblemCopy", "Fan Pass problem copy helper");
[
  "You need ${shortfallGd} more paid GD to start this Fan Pass.",
  "Fan Pass is not available for this creator right now.",
  "This creator is unavailable right now.",
  "We could not find this creator.",
  "Fan Pass could not be updated. Try again or report the issue.",
].forEach((copy) => requireIncludes(problemCopy, copy, "Fan Pass problem copy helper"));

requireIncludes(profileClient, "getCreatorSubscriptionProblemCopy", "CreatorProfileClient Fan Pass handler");
requireIncludes(profileClient, "openPurchaseModal", "CreatorProfileClient Fan Pass refill path");
requireIncludes(profileClient, "selectedExperience: \"subscriptions\"", "CreatorProfileClient Fan Pass debug detail");
requireIncludes(profileClient, "route: \"/api/creator/subscriptions\"", "CreatorProfileClient Fan Pass debug detail");
requireNotIncludes(profileClient, 'toast.error(error.message || "Subscription update failed.")', "CreatorProfileClient Fan Pass user-facing fallback");

[
  "reward balance alone cannot start Fan Pass",
  "allows paid-pack bonus",
  "duplicate fan pass charges",
  "starts a new paid Fan Pass after a canceled subscription",
  "cancels an existing subscription successfully",
  "returns typed unavailable errors",
].forEach((needle) => requireIncludes(tests, needle, "Fan Pass targeted route tests"));

requireIncludes(docs, "Fan Pass is a paid-source GumDrops subscription.", "Fan Pass source-of-truth docs");
requireIncludes(docs, "renewal processor is a future task", "Fan Pass renewal readiness docs");

if (packageJson.scripts?.["check:fan-pass-gumdrops-truth"] !== "tsx scripts/agent/validate-fan-pass-gumdrops-truth.ts") {
  failures.push("package.json is missing check:fan-pass-gumdrops-truth script");
}

if (failures.length > 0) {
  console.error("Fan Pass GumDrops truth validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Fan Pass GumDrops truth validation passed.");
