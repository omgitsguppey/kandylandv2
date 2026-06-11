import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildFrontendTelemetryConsolidationReport, validateFrontendTelemetryConsolidationReport } from "@/lib/frontend-hardening/frontend-telemetry-usage";
import { readRepoToolchainState } from "./shared";

const ROOT = process.cwd();
const write = (path: string, value: string) => {
  const fullPath = join(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, value, "utf8");
};

const toolchain = readRepoToolchainState();
const report = buildFrontendTelemetryConsolidationReport({ currentHead: toolchain.currentHead?.slice(0, 12) ?? "unknown" });
const validation = validateFrontendTelemetryConsolidationReport(report);
const toolingFailures = toolchain.gitStatus !== "available"
  ? [`git_required: frontend telemetry consolidation cannot clear current-head proof while Git is unavailable (${toolchain.degradationReason ?? "git unavailable"}).`]
  : [];
write("agent/state/frontend-telemetry-consolidation.generated.json", JSON.stringify({ ...report, gitStatus: toolchain.gitStatus, currentHeadSource: toolchain.currentHeadSource, toolingDegraded: toolchain.toolingDegraded, degradationReason: toolchain.degradationReason, validationFailures: [...validation.failures, ...toolingFailures] }, null, 2));
write("docs/agent-truth/frontend-telemetry-consolidation.md", [
  "# Frontend Telemetry Consolidation",
  "",
  `Generated: ${report.generatedAtUtc}`,
  `Current head: ${report.currentHead}`,
  "",
  `- Direct telemetry calls audited: ${report.directTelemetryCallsAudited}`,
  `- Direct telemetry paths classified: ${report.directTelemetryCallsReduced}`,
  `- Owners: ${report.telemetryOwners.join(", ")}`,
  "",
].join("\n"));
if (validation.failures.length || toolingFailures.length) {
  console.error("Frontend telemetry consolidation validation failed:");
  for (const failure of [...validation.failures, ...toolingFailures]) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("Frontend telemetry consolidation validation passed.");
