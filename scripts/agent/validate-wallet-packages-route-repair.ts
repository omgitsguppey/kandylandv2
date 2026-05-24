import { buildWalletPackagesValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch18-shared";

const REPORT_PATH = "agent/state/wallet-packages-route-repair.generated.json";
const DOC_PATH = "docs/agent-truth/wallet-packages-route-repair.md";

export function validateWalletPackagesRouteRepair() {
  const report = buildWalletPackagesValidationReport();
  if (report.validationFailures.length > 0) {
    throw new Error(`Wallet packages route repair validation failed:\n- ${report.validationFailures.join("\n- ")}`);
  }
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Wallet Packages Route Repair",
    "",
    `Status: ${report.statusBefore} -> ${report.statusAfter}`,
    `Failure class: ${report.failureClass}`,
    `Success path: ${report.successPath}`,
    `Payment runtime changed: ${report.paymentRuntimeChanged}`,
    `GumDrop math changed: ${report.gumdropMathChanged}`,
  ]);
  return report;
}

if (require.main === module) {
  const report = validateWalletPackagesRouteRepair();
  console.log(`Wallet packages route repair passed: ${report.statusAfter}.`);
}
