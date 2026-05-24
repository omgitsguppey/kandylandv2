import {
  buildWalletFunnelSampleCleanupReport,
  validateWalletFunnelSampleCleanupReport,
  writeCleanupReport,
} from "./tracking-runtime-surface-status-cleanup-shared";

const report = buildWalletFunnelSampleCleanupReport();
const failures = validateWalletFunnelSampleCleanupReport(report);
writeCleanupReport("wallet-funnel-sample-cleanup", report, failures);
if (failures.length > 0) {
  console.error(`Wallet funnel sample cleanup failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`Wallet funnel sample cleanup OK: ${report.walletFunnelStatusBefore} -> ${report.walletFunnelStatusAfter}.`);
