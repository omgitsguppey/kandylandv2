import {
  validateAdminAnalyticsRealtimeHotCacheReport,
  writeAdminAnalyticsRealtimeHotCacheReport,
} from "./debug-cockpit-batch14-shared";

const report = writeAdminAnalyticsRealtimeHotCacheReport();
const failures = validateAdminAnalyticsRealtimeHotCacheReport(report);

if (failures.length > 0) {
  console.error("Admin analytics realtime hot-cache validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Admin analytics realtime hot-cache OK: ${report.status}.`);
