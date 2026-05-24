import {
  validateMonolithSplitPlanReport,
  writeMonolithSplitPlanReport,
} from "./debug-cockpit-batch13-shared";

const report = writeMonolithSplitPlanReport();
const failures = validateMonolithSplitPlanReport(report);

if (failures.length > 0) {
  console.error("Monolith split plan validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Monolith split plan OK: ${report.splitPlans.length} critical plans.`);
