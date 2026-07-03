import type {
  AiDebugCriticFinding,
  AiDebugCriticInput,
  AiDebugCriticReport,
  AiDebugCriticStatus,
  AiDebugCriticSummary,
} from "./ai-debug-critic-contract";
import {
  AI_DEBUG_CRITIC_CHECKS,
  CHAT_NAV_PATTERNS,
  COST_PATH_PATTERNS,
  DUPLICATE_SYSTEM_PATTERNS,
  FAKE_EVIDENCE_PATTERN,
  PAYMENT_MATH_PATTERNS,
  REQUIRED_AI_DEBUG_CRITIC_VALIDATORS,
  SOURCE_RUNTIME_PATTERN,
  UI_SCALE_PATTERN,
  addFinding,
  buildMonolithRisks,
  classifyBacklogAction,
  finding,
  hasFormalArtifact,
  includesAny,
  normalizeChangedFiles,
  severityForActionClass,
  unique,
} from "./ai-debug-critic-rules";

export type {
  AiDebugCriticCheck,
  AiDebugCriticCheckId,
  AiDebugCriticFinding,
  AiDebugCriticFindingSeverity,
  AiDebugCriticGateBlocker,
  AiDebugCriticInput,
  AiDebugCriticMonolithRisk,
  AiDebugCriticReport,
  AiDebugCriticStatus,
  AiDebugCriticSummary,
} from "./ai-debug-critic-contract";
export { AI_DEBUG_CRITIC_CHECKS } from "./ai-debug-critic-rules";

export function buildAiDebugCriticReport(input: AiDebugCriticInput): AiDebugCriticReport {
  const changedFiles = normalizeChangedFiles(input);
  const findings: AiDebugCriticFinding[] = [];
  const unsafeChanges: string[] = [];
  const duplicateSystems = changedFiles.filter((file) => includesAny(file, DUPLICATE_SYSTEM_PATTERNS));
  const monolithRisks = buildMonolithRisks(input, changedFiles);
  const evidenceMisclassificationRisks: string[] = [];
  const proposedText = input.proposedFixSummary ?? "";

  const staleItems = (input.debugBacklog ?? []).filter((item) => item.evidenceStatus === "stale" && item.status === "open");
  if (staleItems.length > 0) {
    const actionClasses = unique(staleItems.map(classifyBacklogAction));
    const actionClass = actionClasses.includes("needs_code_change")
      ? "needs_code_change"
      : actionClasses.includes("needs_refresh")
        ? "needs_refresh"
        : actionClasses.includes("needs_operator_ui_confirmation")
          ? "needs_operator_ui_confirmation"
          : actionClasses.includes("blocked_formal_evidence")
            ? "blocked_formal_evidence"
            : "needs_evidence_artifact";
    addFinding(findings, finding({
      check: "no_patch_on_top_of_stale_logic",
      severity: severityForActionClass(actionClass),
      actionClass,
      title: "Stale debug logic is still active",
      detail: actionClass === "needs_code_change"
        ? "Open stale backlog items include source-fixable work and must be resolved before the patch can claim completion."
        : "Open stale backlog items are classified as refresh, source evidence, or operator context work; they must stay visible but do not imply a source code request-change.",
      sourceFiles: staleItems.flatMap((item) => item.sourceFiles),
      requiredFix: actionClass === "needs_code_change"
        ? "Fix the source-owned stale backlog item or defer it with an exact owner and reason."
        : "Keep the stale backlog item visible in the owning evidence or refresh lane until the required artifact changes.",
      blockedReason: actionClass === "blocked_formal_evidence" || actionClass === "needs_operator_ui_confirmation"
        ? "This critic finding requires source evidence or operator context, not source code changes."
        : undefined,
      validators: ["npm run check:debug-backlog-engine"],
    }));
  }

  if (duplicateSystems.length > 0) {
    addFinding(findings, finding({
      check: "no_duplicate_systems",
      severity: "blocker",
      actionClass: "needs_code_change",
      title: "Potential duplicate debug system",
      detail: "The changed files look like a parallel debug, telemetry, score, or evidence system instead of a refinement of the canonical lane.",
      sourceFiles: duplicateSystems,
      requiredFix: "Refactor into the existing debug backlog, evidence, telemetry, or score owner instead of adding a parallel system.",
      validators: ["npm run check:debug-backlog-engine", "npm run check:agent-context"],
    }));
  }

  if (FAKE_EVIDENCE_PATTERN.test(proposedText) || (input.evidenceStatus?.sourceOnlyClaims ?? []).some((claim) => FAKE_EVIDENCE_PATTERN.test(claim))) {
    evidenceMisclassificationRisks.push("source-only claim presented as deployed runtime or provider-backed evidence");
    addFinding(findings, finding({
      check: "no_fake_evidence",
      severity: "blocker",
      actionClass: "blocked_formal_evidence",
      title: "Fake evidence claim detected",
      detail: "The critic found language that claims deployed, provider, admin, or screenshot evidence without matching records.",
      sourceFiles: changedFiles,
      requiredFix: "Downgrade the claim to source-only evidence or produce the matching source activity record.",
      validators: ["npm run check:beta-score"],
    }));
  }

  const missingFormalGates = (input.betaScoreBlockers ?? []).filter((blocker) => blocker.evidenceStatus !== "source_backed" && !hasFormalArtifact(input, blocker.requiredArtifact));
  if (missingFormalGates.length > 0 && /\b(clear|clears|cleared|ready|complete|fixes|fixed|proof)\b/i.test(proposedText)) {
    evidenceMisclassificationRisks.push(...missingFormalGates.map((gate) => gate.requiredArtifact));
    addFinding(findings, finding({
      check: "no_formal_gate_cleared_without_artifact",
      severity: "blocker",
      actionClass: "blocked_formal_evidence",
      title: "Source evidence gate lacks required record",
      detail: `Missing source evidence record(s): ${missingFormalGates.map((gate) => gate.requiredArtifact).join(", ")}.`,
      sourceFiles: missingFormalGates.map((gate) => gate.requiredArtifact),
      requiredFix: "Do not clear the beta gate until the source record exists and the beta score validator consumes it.",
      validators: ["npm run score:beta", "npm run check:beta-score"],
    }));
  }

  if (monolithRisks.length > 0) {
    addFinding(findings, finding({
      check: "no_monolith_growth_without_split_plan",
      severity: "required",
      actionClass: "needs_code_change",
      title: "Monolith split plan required",
      detail: "A changed source file exceeds the repo module-size budget.",
      sourceFiles: monolithRisks.map((risk) => risk.file),
      requiredFix: "Split logic into contract, builder, validator, and view/source helpers or document a bounded split plan.",
      validators: ["npm run check:code-organization"],
    }));
  }

  const protectedChatNav = input.explicitRequest?.chatNav ? [] : changedFiles.filter((file) => includesAny(file, CHAT_NAV_PATTERNS));
  if (protectedChatNav.length > 0) {
    unsafeChanges.push(...protectedChatNav);
    addFinding(findings, finding({
      check: "no_chat_nav_touch_without_explicit_request",
      severity: "blocker",
      actionClass: "needs_code_change",
      title: "Protected chat/nav path changed",
      detail: "Chat and navigation changes require explicit prompt scope.",
      sourceFiles: protectedChatNav,
      requiredFix: "Revert or isolate the protected chat/nav edits unless the human explicitly requested them.",
      validators: ["npm run check:debug-backlog-engine"],
    }));
  }

  const protectedPaymentMath = input.explicitRequest?.paymentMath ? [] : changedFiles.filter((file) => includesAny(file, PAYMENT_MATH_PATTERNS));
  if (protectedPaymentMath.length > 0) {
    unsafeChanges.push(...protectedPaymentMath);
    addFinding(findings, finding({
      check: "no_payment_math_change_without_explicit_request",
      severity: "blocker",
      actionClass: "needs_code_change",
      title: "Protected payment or GumDrop math path changed",
      detail: "Payment, wallet, PayPal, and GumDrop math changes require explicit prompt scope and source-backed evidence.",
      sourceFiles: protectedPaymentMath,
      requiredFix: "Remove the protected change from this patch or run an explicitly authorized economy/payment lane.",
      validators: ["npm run check:beta-score"],
    }));
  }

  const unownedDebugWarnings = (input.debugBacklog ?? []).filter((item) => !item.owner || !item.surface || !item.exactNextAction);
  if (unownedDebugWarnings.length > 0) {
    addFinding(findings, finding({
      check: "no_unowned_debug_warning",
      severity: "required",
      actionClass: "needs_code_change",
      title: "Debug warning lacks ownership",
      detail: "Every debug warning must map to owner, surface, and exact next action.",
      sourceFiles: unownedDebugWarnings.flatMap((item) => item.sourceFiles),
      requiredFix: "Normalize the debug warning into a complete backlog item before accepting the fix.",
      validators: ["npm run check:debug-backlog-engine"],
    }));
  }

  const changedTelemetryFiles = input.telemetryGraph?.changedTelemetryFiles
    ?? changedFiles.filter((file) => /^(src|functions)\//i.test(file) && /telemetry|analytics|event/i.test(file));
  const canonicalEventFiles = input.telemetryGraph?.canonicalEventFiles ?? [];
  const orphanedTelemetry = changedTelemetryFiles.filter((file) => !canonicalEventFiles.includes(file) && !/event-fact|catalog|normalizer|tracking-surface/i.test(file));
  if (orphanedTelemetry.length > 0) {
    addFinding(findings, finding({
      check: "no_orphaned_telemetry",
      severity: "blocker",
      actionClass: "needs_code_change",
      title: "Orphaned telemetry path detected",
      detail: "Telemetry changes must attach to the canonical event fact/catalog path instead of a side path.",
      sourceFiles: orphanedTelemetry,
      requiredFix: "Route telemetry through the canonical event fact normalizer or tracking surface map.",
      validators: ["npm run check:telemetry-parity-score", "npm run check:debug-evidence-pipeline"],
    }));
  }

  const hardcodedScaleFiles = changedFiles.filter((file) => /components|app/i.test(file) && UI_SCALE_PATTERN.test(file));
  if (hardcodedScaleFiles.length > 0) {
    addFinding(findings, finding({
      check: "no_hardcoded_ui_scale_regression",
      severity: "required",
      actionClass: "needs_code_change",
      title: "Hardcoded UI scale risk",
      detail: "UI scale changes must use the device/layout contracts and targeted source checks.",
      sourceFiles: hardcodedScaleFiles,
      requiredFix: "Move scale behavior to the shared device/layout contract or run the targeted device UI lane.",
      validators: ["npm run check:device-ui"],
    }));
  }

  const guardedCostPaths = input.costReadiness?.guardedCostPaths ?? [];
  const unguardedCostPaths = changedFiles.filter((file) => includesAny(file, COST_PATH_PATTERNS) && !guardedCostPaths.includes(file) && !file.includes("ai-debug-critic"));
  if (unguardedCostPaths.length > 0) {
    addFinding(findings, finding({
      check: "no_new_cost_path_without_guard",
      severity: "blocker",
      actionClass: "needs_code_change",
      title: "Cost path lacks guardrail",
      detail: "New AI, cloud, analytics, storage, or scheduled paths require explicit cost guards.",
      sourceFiles: unguardedCostPaths,
      requiredFix: "Add or reference the cost guard contract before accepting the change.",
      validators: ["npm run check:global-cost"],
    }));
  }

  if (SOURCE_RUNTIME_PATTERN.test(proposedText)) {
    evidenceMisclassificationRisks.push("source readiness presented as deployed runtime truth");
    addFinding(findings, finding({
      check: "no_source_ready_as_runtime_proof",
      severity: "blocker",
      actionClass: "blocked_formal_evidence",
      title: "Source readiness is not deployed runtime truth",
      detail: "Local source checks cannot clear deployed route, provider-backed source activity, or admin source evidence lanes.",
      sourceFiles: changedFiles,
      requiredFix: "Keep source readiness separate from deployed route truth and leave typed source evidence lanes blocked until records exist.",
      validators: ["npm run score:beta", "npm run check:beta-score"],
    }));
  }

  const suggestedValidators = unique([
    ...REQUIRED_AI_DEBUG_CRITIC_VALIDATORS,
    ...(input.validatorMap?.suggestedValidators ?? []),
    ...findings.flatMap((item) => item.suggestedValidators),
  ]);
  const requiredFixes = unique(findings.filter((item) => item.severity === "blocker" || item.severity === "required").map((item) => item.requiredFix));
  const criticStatus: AiDebugCriticStatus = findings.some((item) => item.severity === "blocker")
    ? "blocked"
    : findings.some((item) => item.severity === "required")
      ? "request_changes"
      : "pass";

  return {
    generatedAt: new Date().toISOString(),
    reportKey: "ai-debug-critic",
    criticStatus,
    checks: AI_DEBUG_CRITIC_CHECKS,
    findings,
    requiredFixes,
    suggestedValidators,
    unsafeChanges: unique(unsafeChanges),
    duplicateSystems: unique(duplicateSystems),
    monolithRisks,
    evidenceMisclassificationRisks: unique(evidenceMisclassificationRisks),
    sourceOnly: true,
    externalAiCallsAllowed: false,
  };
}

export function summarizeAiDebugCritic(report: AiDebugCriticReport): AiDebugCriticSummary {
  return {
    totalFindings: report.findings.length,
    blockedFindings: report.findings.filter((finding) => finding.severity === "blocker").length,
    requiredFindings: report.findings.filter((finding) => finding.severity === "required").length,
    warningFindings: report.findings.filter((finding) => finding.severity === "warning").length,
    unsafeChangeCount: report.unsafeChanges.length,
    duplicateSystemCount: report.duplicateSystems.length,
    monolithRiskCount: report.monolithRisks.length,
    evidenceMisclassificationRiskCount: report.evidenceMisclassificationRisks.length,
  };
}
