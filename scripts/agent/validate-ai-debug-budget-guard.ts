import { writeAiDebugBudgetGuardReport } from "./debug-cockpit-batch10-shared";

const failures = writeAiDebugBudgetGuardReport();
if (failures.length > 0) {
  console.error("AI debug budget guard validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("AI debug budget guard validation passed.");
