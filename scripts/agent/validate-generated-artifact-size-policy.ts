import { buildGeneratedArtifactSizePolicyReport, validateGeneratedArtifactSizePolicyReport } from "@/lib/test-hardening/generated-artifact-size-policy";
import { writeCompactJson, writeText } from "@/lib/test-hardening/test-hardening-shared";

const report = buildGeneratedArtifactSizePolicyReport();
const validation = validateGeneratedArtifactSizePolicyReport(report);
const compact = {
  ...report,
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
