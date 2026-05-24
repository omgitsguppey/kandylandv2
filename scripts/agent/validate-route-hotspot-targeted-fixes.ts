import { buildRouteHotspotTargetedValidationReport, writeJson, writeMarkdown } from "./debug-cockpit-batch18-shared";

const REPORT_PATH = "agent/state/route-hotspot-targeted-fixes.generated.json";
const DOC_PATH = "docs/agent-truth/route-hotspot-targeted-fixes.md";

export function validateRouteHotspotTargetedFixes() {
  const report = buildRouteHotspotTargetedValidationReport();
  if (report.validationFailures.length > 0) {
    throw new Error(`Route hotspot targeted fixes validation failed:\n- ${report.validationFailures.join("\n- ")}`);
  }
  writeJson(REPORT_PATH, report);
  writeMarkdown(DOC_PATH, [
    "# Route Hotspot Targeted Fixes",
    "",
    `Summary-first policies: ${report.summaryFirstPolicies.join(", ")}`,
    `Expected 4xx mappings: ${report.expected4xxMappings.join(", ")}`,
    `Unsafe broad refactor performed: ${report.unsafeBroadRefactorPerformed}`,
    "",
    "## Targeted Fixes",
    ...report.targetedFixesApplied.map((item) => `- ${item}`),
    "",
    "## Follow-ups",
    ...report.followUps.map((item) => `- ${item}`),
  ]);
  return report;
}

if (require.main === module) {
  const report = validateRouteHotspotTargetedFixes();
  console.log(`Route hotspot targeted fixes passed: fixes=${report.targetedFixesApplied.length}.`);
}
