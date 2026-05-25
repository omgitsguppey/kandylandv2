import { buildAdminHotCacheCostEstimate } from "../../src/lib/admin/admin-hot-cache-cost-estimator";
import { writeJson, writeMarkdown } from "./admin-hot-cache-heartbeat-shared";

const estimate = buildAdminHotCacheCostEstimate();
const failures: string[] = [];
if (estimate.oldReadPaths.length === 0 || estimate.newReadPaths.length === 0) failures.push("Cost estimate must list old and new read paths.");
if (estimate.oldEstimatedReadsPerLoad <= estimate.newEstimatedReadsPerLoad) failures.push("Cost estimate must reduce reads.");
if (estimate.newHeartbeatIntervalMs < 3_600_000) failures.push("Heartbeat interval must be hourly.");
if (estimate.oldListenerReadRisk !== "high" || estimate.newListenerReadRisk !== "low") failures.push("Listener risk reduction must be explicit.");
if (JSON.stringify(estimate).match(/\$|usd/i)) failures.push("Cost estimate must not claim currency amounts without billing export.");

writeJson("agent/state/admin-hot-cache-cost-estimate.generated.json", {
  status: failures.length === 0 ? "passed" : "failed",
  estimate,
});
writeMarkdown("docs/agent-truth/admin-hot-cache-cost-estimate.md", [
  "# Admin Hot Cache Cost Estimate",
  "",
  `- Old estimated reads per overview load: ${estimate.oldEstimatedReadsPerLoad}.`,
  `- New estimated reads per overview load: ${estimate.newEstimatedReadsPerLoad}.`,
  `- Estimated read reduction: ${estimate.estimatedReadReductionPct}%.`,
  `- Heartbeat interval: ${estimate.newHeartbeatIntervalMs}ms.`,
  "- This is an operation-level estimate only; no billing amount is claimed.",
]);

if (failures.length > 0) {
  console.error("Admin hot-cache cost estimate validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Admin hot-cache cost estimate OK.");
