import { writeMobileBottomNavWalletActionReviewReport } from "./debug-cockpit-batch11-shared";

const failures = writeMobileBottomNavWalletActionReviewReport();
if (failures.length > 0) {
  console.error("Mobile bottom nav wallet action review validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Mobile bottom nav wallet action review validation passed.");
