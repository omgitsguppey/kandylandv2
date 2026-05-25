import { existsSync, readFileSync } from "node:fs";
import {
  MODULE_COVERAGE_SOURCE_POLICIES,
  getModuleCoveragePolicy,
} from "../../src/lib/analytics/module-coverage-source-policy";

const failures: string[] = [];
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");

const expectedModules = ["auth", "onboarding", "navigation", "notifications", "daily_tasks", "task_guidance", "commerce", "unlock_watch", "creator_experiences", "engagement", "admin", "runtime", "support", "ai_debug"];
expect(JSON.stringify(MODULE_COVERAGE_SOURCE_POLICIES.map((policy) => policy.moduleId)) === JSON.stringify(expectedModules), "required module policy set is incomplete.");

for (const policy of MODULE_COVERAGE_SOURCE_POLICIES) {
  expect(policy.dependentPanels.length > 0, `${policy.moduleId} lacks dependent panels.`);
  expect(policy.validators.length > 0, `${policy.moduleId} lacks validators.`);
  expect(Boolean(policy.passPolicy && policy.blockPolicy && policy.nextAction), `${policy.moduleId} lacks pass/block semantics.`);
}

expect(!getModuleCoveragePolicy("admin").requiredSources.includes("ga4"), "Admin requires GA4 as primary source.");
expect(!getModuleCoveragePolicy("runtime").requiredSources.includes("ga4"), "Runtime requires GA4 as primary source.");
expect(getModuleCoveragePolicy("admin").internalCanonicalSources.includes("admin_truth_snapshot"), "Admin internal source policy missing.");
expect(getModuleCoveragePolicy("runtime").internalCanonicalSources.includes("route_runtime"), "Runtime internal source policy missing.");
expect(getModuleCoveragePolicy("notifications").acceptedSubstituteSources.includes("notification_outcomes"), "Notification substitute source policy missing.");
expect(getModuleCoveragePolicy("daily_tasks").acceptedSubstituteSources.includes("task_lifecycle"), "Daily Tasks lifecycle substitute missing.");
expect(read("agent/state/module-coverage-source-policy.generated.json").includes("ga4_optional_policy"), "source policy artifact missing GA4 optional status.");
expect(read("docs/agent-truth/module-coverage-source-policy.md").includes("GA4 is not a universal required source"), "source policy doc missing GA4 policy.");

if (failures.length) {
  console.error("module-coverage-source-policy failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("module-coverage-source-policy: pass");
