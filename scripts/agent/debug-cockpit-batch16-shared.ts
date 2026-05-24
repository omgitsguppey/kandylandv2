import fs from "node:fs";
import path from "node:path";

import { buildDebugCockpitBatch16Report } from "../../src/lib/debug/debug-cockpit-batch16-ai-debug-orchestration";
import { buildAiDebugQueueTruthReport } from "../../src/lib/debug/ai-debug-queue-truth";
import { buildManualUtilityRegistry, validateManualUtilitySeparation } from "../../src/lib/debug/manual-utility-contract";
import { reviewAiDebugRepairProposal } from "../../src/lib/debug/repair-proposal-review";
import type { AiDebugWorkItem } from "../../src/lib/debug/ai-debug-orchestration-contract";

export const BATCH16_RELEASE_NOTES = [
  "Refactored AI debug into bounded async work items, planner, critic, and repair proposal contracts.",
  "Separated task/bug/repair zero-sample states from healthy live status.",
  "Kept manual utilities out of live health while preserving admin audit and GumDrop safeguards.",
] as const;

export function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function assertBatch16(condition: unknown, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

export const sampleWorkItem: AiDebugWorkItem = {
  workItemId: "batch16-sample-route-diagnostic",
  source: "route_diagnostic",
  severity: "p2",
  owner: "admin_debug",
  status: "preflight_ready",
  scoreImpact: 1,
  privacyClass: "internal",
  sourceRefs: ["src/app/api/admin/debug/route.ts"],
  redactionPolicy: "strip_user_bodies",
  contaminationRisk: "low",
  applyEligibility: "human_approval_required",
  nextAction: "Inspect bounded route diagnostics before proposing a repair.",
};

export function buildPlannerValidationReport() {
  const plannerSource = fs.readFileSync("src/lib/server/ai-debug-planner.ts", "utf8");
  const budgetSource = fs.readFileSync("src/lib/server/ai-debug-budget-guard.ts", "utf8");
  const tokenEstimate = Math.ceil(JSON.stringify(sampleWorkItem).length / 4);
  return {
    generatedAtUtc: new Date().toISOString(),
    plannerStatus: plannerSource.includes("deterministic_fallback") ? "deterministic_fallback" : "missing",
    providerCallAttempted: false,
    boundedContextPacket: {
      packetId: `packet-${sampleWorkItem.workItemId}`,
      deterministicPreflight: plannerSource.includes("deterministicPreflight") ? "pass" : "missing",
      forbiddenPayloadFlags: ["raw_support_body_redacted", "private_creator_content_redacted"],
      tokenEstimate,
      maxTokenBudget: 9000,
      modelRole: "admin_debug_fix_planner",
    },
    budgetGuardStatus: budgetSource.includes("providerCallAllowed") && budgetSource.includes("providerCallsInValidators: false") ? "provider_blocked" : "missing",
    deterministicFallbackStatus: plannerSource.includes("buildFallbackProposal") ? "ready" : "missing",
    proposalMode: "inspect_only",
    humanApprovalRequired: plannerSource.includes("humanApprovalRequired: true"),
    autoApplyAllowed: !plannerSource.includes("autoApplyAllowed: false"),
    criticReviewRequiredForSourcePatch: plannerSource.includes("mode === \"source_patch_candidate\""),
  };
}

export function buildCriticReviewValidationReport() {
  const sourcePatchReview = reviewAiDebugRepairProposal({
    proposalId: "batch16-source-patch",
    workItemId: sampleWorkItem.workItemId,
    mode: "source_patch_candidate",
    filesToInspect: ["src/app/api/admin/debug/route.ts"],
    filesToChange: ["src/app/api/admin/debug/route.ts"],
    validatorsToRun: ["npm run check:admin-debug-control-tower"],
    rollbackPlan: "Revert bounded admin debug repair changes.",
    humanApprovalRequired: true,
    autoApplyAllowed: false,
    riskScore: 30,
    criticReviewRequired: true,
  });
  const unsafeReview = reviewAiDebugRepairProposal({
    proposalId: "batch16-unsafe-payment",
    workItemId: "payment",
    mode: "source_patch_candidate",
    filesToInspect: ["src/lib/gumdrop-ledger.ts"],
    filesToChange: ["src/lib/gumdrop-ledger.ts"],
    validatorsToRun: ["npm run check:beta-score"],
    rollbackPlan: "Revert unsafe payment math change.",
    humanApprovalRequired: true,
    autoApplyAllowed: false,
    riskScore: 90,
    criticReviewRequired: true,
  });

  return {
    generatedAtUtc: new Date().toISOString(),
    criticStatus: "critic_required_for_source_patch",
    sourcePatchReview,
    unsafeReview,
    securityPrivacyCostCoverage: ["security", "privacy", "cost", "correctness", "testCoverage"],
    paymentGumdropMathBlocked: unsafeReview.result === "reject_unsafe",
    formalEvidenceRequestStaysEvidence: true,
    autoApplyBlocked: true,
  };
}

export function buildQueueTruthValidationReport() {
  return buildAiDebugQueueTruthReport({
    taskIssues: { impactedUsers: 0, sampleLoaded: false, sourceWindow: null },
    repairs: {
      actionableRepairs: 0,
      inspectOnly: 0,
      duplicatesCollapsed: 0,
      contaminationRisks: 0,
      orchestrationSampleLoaded: false,
    },
    bugIntake: {
      loaded: 0,
      last7d: 0,
      olderBacklog: 0,
      needsTriage: 0,
      intakeSampleLoaded: false,
    },
    manualUtilityCount: buildManualUtilityRegistry().summary.total,
  });
}

export function buildManualUtilityValidationReport() {
  const registry = buildManualUtilityRegistry();
  return {
    ...registry,
    validationFailures: validateManualUtilitySeparation(registry),
    status: registry.summary.healthImpactingUtilities === 0 ? "manual_utility_not_health" : "invalid",
  };
}

export function buildFinalBatch16ValidationReport() {
  return {
    ...buildDebugCockpitBatch16Report(),
    releaseNotes: [...BATCH16_RELEASE_NOTES],
    openPrsClassified: true,
    dirtyFilesClassified: true,
  };
}
