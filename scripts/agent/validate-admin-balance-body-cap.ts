import { writeAdminBalanceBodyCapReport } from "./debug-cockpit-batch9-shared";

const failures = writeAdminBalanceBodyCapReport();

if (failures.length > 0) {
  console.error("Admin balance body cap validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Admin balance body cap validation passed.");
