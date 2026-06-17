import { buildGeneratedArtifactSizePolicyReport, validateGeneratedArtifactSizePolicyReport } from "@/lib/test-hardening/generated-artifact-size-policy";
import { buildGeneratedReportCompleteness } from "@/lib/agent-governance/generated-reports/generated-report-contract";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";

const report = buildGeneratedArtifactSizePolicyReport();
const validation = validateGeneratedArtifactSizePolicyReport(report);
const compact = {
  ...report,
  ...buildGeneratedReportCompleteness({
    totalFindingCount: report.oversizedArtifacts.length,
    emittedFindingCount: Math.min(report.oversizedArtifacts.length, 30),
    capLimit: 30,
    capStrategy: report.oversizedArtifacts.length > 30 ? "top_risk" : "none",
    capReason: report.oversizedArtifacts.length > 30 ? "compact artifact emits first 30 oversized entries and preserves total/omitted counts" : null,
    rankingInputCompleteness: "complete",
    highRiskCounts: report.highRiskCounts,
  }),
  oversizedArtifacts: report.oversizedArtifacts.slice(0, 30),
  validation,
};

writeCompactJson("agent/state/generated-artifact-size-policy.generated.json", compact);
writeText("docs/agent-truth/generated-artifact-size-policy.md", [
  "# Generated Artifact Size Policy",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  `Artifacts audited: ${report.generatedArtifactsAudited}`,
  `Default max lines: ${report.defaultMaxLines}`,
  `Default max bytes: ${report.defaultMaxBytes}`,
  `Oversized classified artifacts: ${report.oversizedArtifacts.length}`,
  `Unsafe unknowns: ${report.unsafeUnknowns}`,
  "",
  "## Policy",
  "",
  "- Generated JSON artifacts default to compact summary output.",
  "- Full details must be drilldown-only or derivable from source.",
  "- Oversized legacy snapshots are classified instead of treated as proof.",
  "",
].join("\n"));

if (!validation.ok) {
  console.error(validation.failures.join("\n"));
  process.exit(1);
}

console.log(`Generated artifact size policy passed: artifacts=${report.generatedArtifactsAudited}`);
