import {
  validateTelemetryBehaviorRefreshReport,
  writeTelemetryBehaviorRefreshReport,
} from "./debug-cockpit-batch13-shared";

const report = writeTelemetryBehaviorRefreshReport();
const failures = validateTelemetryBehaviorRefreshReport(report);

if (failures.length > 0) {
  console.error("Telemetry/behavior refresh validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Telemetry/behavior refresh OK: telemetry ${report.telemetryParityAgeAfter}h, event catalog ${report.eventCatalogStatusAfter}.`);
