import { fileExists, readJsonFile } from "./shared";

export function runValidation() {
  const reportPath = "agent/state/agent-takeover-safety-check.generated.json";
  const failures: string[] = [];

  if (!fileExists(reportPath)) {
    failures.push(`${reportPath} is missing.`);
  } else {
    try {
      const data = readJsonFile<any>(reportPath);
      const checks = data.checks;

      if (!checks.latestCommitIdentified || checks.latestCommitIdentified !== "cfd39b411b08374c8a698bb07bb42f473ebba278") {
        failures.push("Safety check fail: latestCommitIdentified must be cfd39b411b08374c8a698bb07bb42f473ebba278");
      }
      if (!checks.activePromptLane) {
        failures.push("Safety check fail: activePromptLane is missing.");
      }
      if (checks.noOverlapWithInFlightWork !== true) {
        failures.push("Safety check fail: noOverlapWithInFlightWork must be true.");
      }
      if (checks.noStaleArtifactTreatedAsCurrent !== true) {
        failures.push("Safety check fail: noStaleArtifactTreatedAsCurrent must be true.");
      }
      if (checks.noPaymentRuntimeViolations !== true) {
        failures.push("Safety check fail: noPaymentRuntimeViolations must be true.");
      }
      if (checks.repoMemoryUpdated !== true) {
        failures.push("Safety check fail: repoMemoryUpdated must be true.");
      }
      if (checks.scoreCurrentHeadClassified !== true) {
        failures.push("Safety check fail: scoreCurrentHeadClassified must be true.");
      }
    } catch (e: any) {
      failures.push(`Failed to parse ${reportPath}: ${e.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("Agent Takeover Safety Check Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Agent Takeover Safety Check OK.");
}

if (require.main === module) {
  runValidation();
}
