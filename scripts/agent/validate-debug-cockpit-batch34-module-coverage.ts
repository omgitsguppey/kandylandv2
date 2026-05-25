import { existsSync, readFileSync } from "node:fs";

const failures: string[] = [];
const read = (path: string) => existsSync(path) ? readFileSync(path, "utf8") : (failures.push(`Missing ${path}`), "");
const expect = (condition: boolean, message: string) => { if (!condition) failures.push(message); };
const report = JSON.parse(read("agent/state/debug-cockpit-batch34-module-coverage.generated.json") || "{}");

expect(report.totalModules === 14, "module coverage total is not the expected Batch 34 module set.");
expect(report.ga4RequirementPolicyStatus === "ga4_optional_or_external_for_internal_modules", "module coverage still blindly requires GA4 for all modules.");
expect(report.adminRuntimeInternalSourceStatus === "admin_runtime_internal_sources_mapped", "Admin/Runtime internal evidence is not mapped.");
expect(report.acceptedSubstituteStatus === "accepted_substitute_sources_counted", "accepted substitutes are not counted.");
expect(report.optionalBlockingStatus === "optional_gaps_nonblocking", "optional modules block required pass.");
expect(report.requiredGapsAfter < report.requiredGapsBefore, "required gaps did not improve.");
expect(Array.isArray(report.modulesStillBlocked) && report.modulesStillBlocked.includes("navigation"), "remaining module blockers missing.");
expect(Array.isArray(report.scoreDimensions) && report.scoreDimensions.length >= 4, "score dimensions missing.");
expect(Array.isArray(report.dirtyClassifications) && report.dirtyClassifications.every((entry: { classification: string }) => entry.classification !== "unsafe_unknown"), "dirty files unclassified.");
expect(Array.isArray(report.openPrClassifications) && report.openPrClassifications.length === 0, "open PRs unclassified.");

if (failures.length) {
  console.error("debug-cockpit-batch34-module-coverage failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("debug-cockpit-batch34-module-coverage: pass");
