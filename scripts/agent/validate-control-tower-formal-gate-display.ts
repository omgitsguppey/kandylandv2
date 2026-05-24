import {
  buildControlTowerFormalGateDisplayReport,
  validateControlTowerFormalGateDisplayReport,
  writeAndValidateReport,
} from "./control-tower-cleanup-shared";

const report = buildControlTowerFormalGateDisplayReport();
const failures = validateControlTowerFormalGateDisplayReport(report);

try {
  writeAndValidateReport(
    "agent/state/control-tower-formal-gate-display.generated.json",
    "docs/agent-truth/control-tower-formal-gate-display.md",
    "Control Tower Formal Gate Display",
    report,
    failures,
  );
  console.log("Control Tower formal gate display passed");
} catch (error) {
  console.error("Control Tower formal gate display validation failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
