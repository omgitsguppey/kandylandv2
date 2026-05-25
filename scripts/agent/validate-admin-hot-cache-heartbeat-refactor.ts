import {
  validateAdminHotCacheHeartbeatReport,
  writeAdminHotCacheHeartbeatArtifacts,
} from "./admin-hot-cache-heartbeat-shared";

const report = writeAdminHotCacheHeartbeatArtifacts();
const failures = validateAdminHotCacheHeartbeatReport(report);

if (failures.length > 0) {
  console.error("Admin hot-cache heartbeat refactor validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Admin hot-cache heartbeat refactor OK: ${report.adminSurfacesScanned.length} surfaces scanned.`);
