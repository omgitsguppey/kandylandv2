import {
  buildControlTowerCanonicalSourceReport,
  validateControlTowerCanonicalSourceReport,
  writeAndValidateReport,
} from "./control-tower-cleanup-shared";

const report = buildControlTowerCanonicalSourceReport();
const failures = validateControlTowerCanonicalSourceReport(report);

try {
  writeAndValidateReport(
    "agent/state/control-tower-canonical-source.generated.json",
    "docs/agent-truth/control-tower-canonical-source.md",
    "Control Tower Canonical Source",
    report,
    failures,
  );
  console.log("Control Tower canonical source passed");
} catch (error) {
  console.error("Control Tower canonical source validation failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
