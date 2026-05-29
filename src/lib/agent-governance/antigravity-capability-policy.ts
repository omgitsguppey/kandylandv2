export interface CapabilityPolicy {
  allowLocalSourceSafeChecks: boolean;
  allowVisualOnlyLayoutEvidence: boolean;
  allowAsyncMultiAgentWork: boolean;
  multiAgentNoOverlapRule: boolean;
  allowDeploy: boolean;
  allowProviderCalls: boolean;
  allowProductionMutation: boolean;
  allowProductionCreatorDropApproval: boolean;
  allowPaymentGumDropMathChanges: boolean;
  allowSourceOnlyClearingFormalGates: boolean;
  requireCompactMemoryBeforeBroadGrep: boolean;
  requireMemoryWritebackAfterTask: boolean;
}

export const ANTIGRAVITY_CAPABILITY_POLICY: CapabilityPolicy = {
  allowLocalSourceSafeChecks: true,
  allowVisualOnlyLayoutEvidence: true,
  allowAsyncMultiAgentWork: true,
  multiAgentNoOverlapRule: true,
  allowDeploy: false, // Strictly Forbidden
  allowProviderCalls: false, // Strictly Forbidden
  allowProductionMutation: false, // Strictly Forbidden
  allowProductionCreatorDropApproval: false, // Strictly Forbidden
  allowPaymentGumDropMathChanges: false, // Strictly Forbidden
  allowSourceOnlyClearingFormalGates: false, // Strictly Forbidden
  requireCompactMemoryBeforeBroadGrep: true,
  requireMemoryWritebackAfterTask: true,
};

export function validatePolicy(policy: CapabilityPolicy): string[] {
  const failures: string[] = [];

  if (policy.allowDeploy) {
    failures.push("Policy violation: allowDeploy must be false.");
  }
  if (policy.allowProviderCalls) {
    failures.push("Policy violation: allowProviderCalls must be false.");
  }
  if (policy.allowProductionMutation) {
    failures.push("Policy violation: allowProductionMutation must be false.");
  }
  if (policy.allowProductionCreatorDropApproval) {
    failures.push("Policy violation: allowProductionCreatorDropApproval must be false.");
  }
  if (policy.allowPaymentGumDropMathChanges) {
    failures.push("Policy violation: allowPaymentGumDropMathChanges must be false.");
  }
  if (policy.allowSourceOnlyClearingFormalGates) {
    failures.push("Policy violation: allowSourceOnlyClearingFormalGates must be false.");
  }
  if (!policy.multiAgentNoOverlapRule) {
    failures.push("Policy violation: multiAgentNoOverlapRule must be true.");
  }
  if (!policy.requireMemoryWritebackAfterTask) {
    failures.push("Policy violation: requireMemoryWritebackAfterTask must be true.");
  }

  return failures;
}
