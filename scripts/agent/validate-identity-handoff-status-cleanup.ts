import {
  buildIdentityHandoffStatusCleanupReport,
  validateIdentityHandoffStatusCleanupReport,
  writeCleanupReport,
} from "./tracking-runtime-surface-status-cleanup-shared";

const report = buildIdentityHandoffStatusCleanupReport();
const failures = validateIdentityHandoffStatusCleanupReport(report);
writeCleanupReport("identity-handoff-status-cleanup", report, failures);
if (failures.length > 0) {
  console.error(`Identity handoff status cleanup failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`Identity handoff status cleanup OK: ${report.identityStatusBefore} -> ${report.identityStatusAfter}.`);
