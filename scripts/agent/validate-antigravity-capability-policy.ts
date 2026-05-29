import { fileExists, readJsonFile } from "./shared";
import { ANTIGRAVITY_CAPABILITY_POLICY, validatePolicy } from "../../src/lib/agent-governance/antigravity-capability-policy";

export function runValidation() {
  const failures = validatePolicy(ANTIGRAVITY_CAPABILITY_POLICY);

  // Also check generated json file
  const reportPath = "agent/state/antigravity-capability-policy.generated.json";
  if (!fileExists(reportPath)) {
    failures.push(`${reportPath} is missing.`);
  } else {
    try {
      const data = readJsonFile<any>(reportPath);
      if (data.forbiddenCapabilities.deploy !== false) {
        failures.push("JSON fail: forbiddenCapabilities.deploy must be false.");
      }
      if (data.forbiddenCapabilities.providerCalls !== false) {
        failures.push("JSON fail: forbiddenCapabilities.providerCalls must be false.");
      }
      if (data.forbiddenCapabilities.productionMutation !== false) {
        failures.push("JSON fail: forbiddenCapabilities.productionMutation must be false.");
      }
      if (data.forbiddenCapabilities.paymentGumDropMathChanges !== false) {
        failures.push("JSON fail: forbiddenCapabilities.paymentGumDropMathChanges must be false.");
      }
      if (data.forbiddenCapabilities.sourceOnlyClearingFormalGates !== false) {
        failures.push("JSON fail: forbiddenCapabilities.sourceOnlyClearingFormalGates must be false.");
      }
      if (data.constraints.multiAgentNoOverlapRule !== true) {
        failures.push("JSON fail: multiAgentNoOverlapRule must be true.");
      }
      if (data.constraints.requireMemoryWritebackAfterTask !== true) {
        failures.push("JSON fail: requireMemoryWritebackAfterTask must be true.");
      }
    } catch (e: any) {
      failures.push(`Failed to parse ${reportPath}: ${e.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("Antigravity Capability Policy Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Antigravity Capability Policy OK.");
}

if (require.main === module) {
  runValidation();
}
