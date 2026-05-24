import {
  validateTelemetryDuplicateIntentClassificationReport,
  writeTelemetryDuplicateIntentClassificationReport,
} from "./debug-cockpit-batch14-shared";

const report = writeTelemetryDuplicateIntentClassificationReport();
const failures = validateTelemetryDuplicateIntentClassificationReport(report);

if (failures.length > 0) {
  console.error("Telemetry duplicate intent classification validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Telemetry duplicate intent classification OK: ${report.status}.`);
