import type {
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

export const AI_DEBUG_CRITIC_CHECKS: AiDebugCriticCheck[] = [
  {
    id: "no_patch_on_top_of_stale_logic",
    label: "Do not patch on top of stale logic",
    failureMode: "A stale backlog item remains open while the proposed fix claims completion.",
  },
  {
    id: "no_duplicate_systems",
    label: "Do not create duplicate systems",
    failureMode: "A new debug, evidence, telemetry, score, route, or cost system duplicates a canonical lane.",
  },
  {
    id: "no_fake_evidence",
    label: "Do not fake evidence",
    failureMode: "Source-only output is described as runtime, provider, smoke, screenshot, or formal proof.",
  },
  {
    id: "no_formal_gate_cleared_without_artifact",
    label: "Do not clear formal gates without artifacts",
    failureMode: "A formal beta gate is marked resolved without the required generated artifact.",
  },
  {
    id: "no_monolith_growth_without_split_plan",
    label: "Do not grow monoliths without split plans",
    failureMode: "A touched source file exceeds module discipline limits without a split plan.",
  },
  {
    id: "no_chat_nav_touch_without_explicit_request",
    label: "Do not touch chat or navigation without explicit request",
    failureMode: "A protected chat or nav path changed outside the prompt scope.",
  },
  {
    id: "no_payment_math_change_without_explicit_request",
    label: "Do not touch payment or GumDrop math without explicit request",
    failureMode: "Payment, wallet, PayPal, or GumDrop math paths changed outside the prompt scope.",
  },
  {
    id: "no_unowned_debug_warning",
    label: "Do not leave debug warnings unowned",
    failureMode: "A debug backlog item lacks owner, surface, or next action.",
  },
  {
    id: "no_orphaned_telemetry",
    label: "Do not create orphaned telemetry",
    failureMode: "Telemetry changes bypass canonical event fact or catalog ownership.",
  },
  {
    id: "no_hardcoded_ui_scale_regression",
    label: "Do not hardcode UI scale regressions",
    failureMode: "UI scale tokens are hardcoded without device/layout doctrine ownership.",
  },
  {
    id: "no_new_cost_path_without_guard",
    label: "Do not add cost paths without guardrails",
    failureMode: "A new AI, cloud, analytics, storage, or scheduled path lacks a cost guard.",
  },
  {
    id: "no_source_ready_as_runtime_proof",
    label: "Do not present source readiness as runtime proof",
    failureMode: "Local source checks are used to claim deployed runtime/provider evidence.",
  },
];

const REQUIRED_VALIDATORS = [
  "npm run check:ai-debug-critic",
  "npm run check:debug-evidence-pipeline",
  "npm run check:beta-score",
];

const DUPLICATE_SYSTEM_PATTERNS = [
  /new-debug/i,
  /debug.*copy/i,
  /duplicate/i,
  /sidepath/i,
  /parallel/i,
  /new-telemetry/i,
  /new-score/i,
  /new-cost/i,
];

const CHAT_NAV_PATTERNS = [
  /(^|\/)(chat|support-chat)(\/|\.|$)/i,
  /Navbar/i,
  /Navigation/i,
  /BottomNav/i,
  /TopNav/i,
  /mobile-nav/i,
];

const PAYMENT_MATH_PATTERNS = [
  /paypal/i,
  /wallet/i,
  /gumdrop/i,
  /gumdrops/i,
  /gumdrop-ledger/i,
  /gumdrop-economics/i,
  /creator-experiences/i,
  /subscriptions\/route/i,
  /bookings\/route/i,
  /requests\/route/i,
];

const COST_PATH_PATTERNS = [
  /vertex/i,
  /gemini/i,
  /cloud/i,
  /bigquery/i,
  /storage/i,
  /scheduler/i,
  /analytics/i,
  /ai-debug-assistant/i,
];

const FAKE_EVIDENCE_PATTERN = /\b(provider|runtime|smoke|screenshot|manual qa|deployed|production|formal)\b.{0,48}\b(pass|passed|verified|cleared|complete|ready|proof)\b/i;
const SOURCE_RUNTIME_PATTERN = /(\b(source|static|local validator|typecheck)\b.{0,96}\b(runtime|provider|deployed|production|formal)\b.{0,48}\b(proof|ready|cleared|verified|passed|complete)\b)|(\b(runtime|provider|deployed|production|formal)\b.{0,48}\b(proof|ready|cleared|verified|passed|complete)\b.{0,96}\b(source|static|local validator|typecheck)\b)/i;
const UI_SCALE_PATTERN = /\b(text-\[\d|h-\[\d|w-\[\d|px\]|vh|100vh|calc\()/i;

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

function includesAny(path: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(path));
}

function normalizeChangedFiles(input: AiDebugCriticInput) {
  return unique(input.changedFiles.map((path) => path.replace(/\\/g, "/")));
}

function addFinding(findings: AiDebugCriticFinding[], finding: AiDebugCriticFinding) {
  findings.push(finding);
}

function finding(input: {
  check: AiDebugCriticCheckId;
  severity: AiDebugCriticFindingSeverity;
  title: string;
  detail: string;
  sourceFiles: string[];
  requiredFix: string;
  validators?: string[];
}): AiDebugCriticFinding {
  return {
    id: `${input.check}-${Math.abs(hash(input.title + input.sourceFiles.join("|")))}`,
    check: input.check,
    severity: input.severity,
    title: input.title,
    detail: input.detail,
    sourceFiles: unique(input.sourceFiles),
    requiredFix: input.requiredFix,
    suggestedValidators: unique(["npm run check:ai-debug-critic", ...(input.validators ?? [])]),
  };
}

function hash(value: string) {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = Math.imul(31, result) + value.charCodeAt(index);
  }
  return result;
}

function hasFormalArtifact(input: AiDebugCriticInput, artifact: string) {
  return Boolean(input.evidenceStatus?.formalArtifacts?.some((candidate) => candidate.replace(/\\/g, "/") === artifact.replace(/\\/g, "/")));
}

function buildMonolithRisks(input: AiDebugCriticInput, changedFiles: string[]) {
  const risks: AiDebugCriticMonolithRisk[] = [];
  for (const file of changedFiles) {
    if (!file.startsWith("src/")) continue;
    if (file === "src/lib/release-notes/public-release-notes.ts") continue;
    const lineCount = input.fileLineCounts?.[file] ?? 0;
    const limit = file.includes("/app/") ? 500 : 300;
    if (lineCount > limit) {
      risks.push({
        file,
        lineCount,
        limit,
        splitPlanRequired: true,
      });
    }
  }
  return risks;
}

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
    addFinding(findings, finding({
      check: "no_patch_on_top_of_stale_logic",
      severity: "required",
      title: "Stale debug logic is still active",
      detail: "Open stale backlog items must be refreshed, retired, or explicitly blocked before a patch can claim completion.",
      sourceFiles: staleItems.flatMap((item) => item.sourceFiles),
      requiredFix: "Refresh or retire stale backlog items and keep them visible until the owning evidence lane changes.",
      validators: ["npm run check:debug-backlog-engine"],
    }));
  }

  if (duplicateSystems.length > 0) {
    addFinding(findings, finding({
      check: "no_duplicate_systems",
      severity: "blocker",
      title: "Potential duplicate debug system",
      detail: "The changed files look like a parallel debug, telemetry, score, or evidence system instead of a refinement of the canonical lane.",
      sourceFiles: duplicateSystems,
      requiredFix: "Refactor into the existing debug backlog, evidence, telemetry, or score owner instead of adding a parallel system.",
      validators: ["npm run check:debug-backlog-engine", "npm run check:agent-context"],
    }));
  }

  if (FAKE_EVIDENCE_PATTERN.test(proposedText) || (input.evidenceStatus?.sourceOnlyClaims ?? []).some((claim) => FAKE_EVIDENCE_PATTERN.test(claim))) {
    evidenceMisclassificationRisks.push("source-only claim presented as formal/runtime evidence");
    addFinding(findings, finding({
      check: "no_fake_evidence",
      severity: "blocker",
      title: "Fake evidence claim detected",
      detail: "The critic found language that claims runtime, provider, smoke, deployed, screenshot, manual QA, or formal proof without matching evidence.",
      sourceFiles: changedFiles,
      requiredFix: "Downgrade the claim to source-only evidence or attach the formal artifact that proves the gate.",
      validators: ["npm run check:beta-score"],
    }));
  }

  const missingFormalGates = (input.betaScoreBlockers ?? []).filter((blocker) => blocker.evidenceStatus !== "source_backed" && !hasFormalArtifact(input, blocker.requiredArtifact));
  if (missingFormalGates.length > 0 && /\b(clear|clears|cleared|ready|complete|fixes|fixed|proof)\b/i.test(proposedText)) {
    evidenceMisclassificationRisks.push(...missingFormalGates.map((gate) => gate.requiredArtifact));
    addFinding(findings, finding({
      check: "no_formal_gate_cleared_without_artifact",
      severity: "blocker",
      title: "Formal gate lacks required artifact",
      detail: `Missing formal artifact(s): ${missingFormalGates.map((gate) => gate.requiredArtifact).join(", ")}.`,
      sourceFiles: missingFormalGates.map((gate) => gate.requiredArtifact),
      requiredFix: "Do not clear the beta gate until the formal artifact exists and the beta score validator consumes it.",
      validators: ["npm run score:beta", "npm run check:beta-score"],
    }));
  }

  if (monolithRisks.length > 0) {
    addFinding(findings, finding({
      check: "no_monolith_growth_without_split_plan",
      severity: "required",
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
      title: "Protected payment or GumDrop math path changed",
      detail: "Payment, wallet, PayPal, and GumDrop math changes require explicit prompt scope and formal evidence.",
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
      title: "Debug warning lacks ownership",
      detail: "Every debug warning must map to owner, surface, and exact next action.",
      sourceFiles: unownedDebugWarnings.flatMap((item) => item.sourceFiles),
      requiredFix: "Normalize the debug warning into a complete backlog item before accepting the fix.",
      validators: ["npm run check:debug-backlog-engine"],
    }));
  }

  const changedTelemetryFiles = input.telemetryGraph?.changedTelemetryFiles ?? changedFiles.filter((file) => /telemetry|analytics|event/i.test(file));
  const canonicalEventFiles = input.telemetryGraph?.canonicalEventFiles ?? [];
  const orphanedTelemetry = changedTelemetryFiles.filter((file) => !canonicalEventFiles.includes(file) && !/event-fact|catalog|normalizer|tracking-surface/i.test(file));
  if (orphanedTelemetry.length > 0) {
    addFinding(findings, finding({
      check: "no_orphaned_telemetry",
      severity: "blocker",
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
      title: "Cost path lacks guardrail",
      detail: "New AI, cloud, analytics, storage, or scheduled paths require explicit cost guards.",
      sourceFiles: unguardedCostPaths,
      requiredFix: "Add or reference the cost guard contract before accepting the change.",
      validators: ["npm run check:global-cost"],
    }));
  }

  if (SOURCE_RUNTIME_PATTERN.test(proposedText)) {
    evidenceMisclassificationRisks.push("source readiness presented as runtime proof");
    addFinding(findings, finding({
      check: "no_source_ready_as_runtime_proof",
      severity: "blocker",
      title: "Source readiness is not runtime proof",
      detail: "Local source checks cannot clear deployed runtime, provider, or formal smoke gates.",
      sourceFiles: changedFiles,
      requiredFix: "Keep source readiness separate from runtime proof and leave formal gates blocked until artifacts exist.",
      validators: ["npm run score:beta", "npm run check:beta-score"],
    }));
  }

  const suggestedValidators = unique([
    ...REQUIRED_VALIDATORS,
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
