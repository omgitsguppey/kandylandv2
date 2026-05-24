import {
  buildPwaServiceWorkerStatusCleanupReport,
  validatePwaServiceWorkerStatusCleanupReport,
  writeCleanupReport,
} from "./tracking-runtime-surface-status-cleanup-shared";

const report = buildPwaServiceWorkerStatusCleanupReport();
const failures = validatePwaServiceWorkerStatusCleanupReport(report);
writeCleanupReport("pwa-service-worker-status-cleanup", report, failures);
if (failures.length > 0) {
  console.error(`PWA service worker status cleanup failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log(`PWA service worker status cleanup OK: ${report.pwaStatusBefore} -> ${report.pwaStatusAfter}.`);
