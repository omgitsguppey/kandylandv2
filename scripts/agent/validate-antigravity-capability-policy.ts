import { ANTIGRAVITY_CAPABILITY_POLICY, validatePolicy } from "../../src/lib/agent-governance/antigravity-capability-policy";

export function runValidation() {
  const failures = validatePolicy(ANTIGRAVITY_CAPABILITY_POLICY);

  if (failures.length > 0) {
    console.error("Antigravity Capability Policy Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Antigravity Capability Policy source contract OK.");
}

if (require.main === module) {
  runValidation();
}
