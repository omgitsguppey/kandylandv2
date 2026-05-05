import {
  FULL_SUITE_FORBIDDEN_COMMANDS,
  AFFECTED_AUDIT_PLAN_PATH,
  buildPlannedCommand,
  buildTerminalRunJustification,
  commandForPackageScript,
  maxBudgetForClass,
  normalizeAffectedPath,
  uniqueAffectedValues,
  applyCommandBudget,
  type AffectedAuditPlan,
  type AffectedAuditPlannedCommand,
  type AffectedAuditSkipReason,
  type CommandBudgetClass,
} from "./verification-command-budget";

export type AffectedSurfaceMapDomain = {
  name: string;
  path_prefixes: string[];
  broad_work_trigger?: boolean;
};

export type AffectedDependencyGraphSummary = {
  highInboundFiles?: Array<{ path: string; inboundCount?: number; runtimeCritical?: boolean; likelySharedHelper?: boolean }>;
  blastRadiusSurfaces?: Array<{ path: string; reason?: string }>;
};

export type AffectedAuditRouterInput = {
  changedFiles: string[];
  taskSummary?: string;
  base?: string;
  head?: string;
  changedPackageScripts?: string[];
  packageScripts?: Record<string, string>;
  surfaceMap?: { domains?: AffectedSurfaceMapDomain[] };
  dependencyGraph?: AffectedDependencyGraphSummary;
};

type SurfaceRule = {
  id: string;
  label: string;
  priority: number;
  match: (filePath: string) => boolean;
  staticScripts: string[];
  targetedScripts?: string[];
  optionalScripts?: string[];
  targetedCommand?: (filePath: string) => string | null;
  budgetClass?: CommandBudgetClass;
  why: string;
  safeSkips: string[];
};

const WHY_NOT_FULL_CHECK =
  "The affected router uses changed files plus KandyDrops surface and dependency rules to select the minimum targeted checks; full-suite checks stay forbidden unless explicitly overridden with a reason.";

const SURFACE_RULES: SurfaceRule[] = [
  {
    id: "wallet",
    label: "wallet_purchase_surface",
    priority: 100,
    match: (filePath) => filePath === "src/components/PurchaseModal.tsx" || filePath.includes("wallet") || filePath.includes("gumdrop"),
    staticScripts: ["check:wallet-density", "check:gumdrop-economy", "check:purchase-telemetry-truth"],
    optionalScripts: ["typecheck"],
    budgetClass: "payment_auth_unlock_rules",
    why: "Wallet and purchase UI changes affect GumDrop balance, checkout density, and purchase telemetry truth.",
    safeSkips: ["No unrelated UI audits: wallet density is source-scanned directly.", "No full check: payment/economy validators cover this path first."],
  },
  {
    id: "paypal_api",
    label: "paypal_purchase_api",
    priority: 100,
    match: (filePath) => filePath.startsWith("src/app/api/paypal/"),
    staticScripts: ["check:purchase-telemetry-truth", "check:gumdrop-economy", "check:speed-security"],
    targetedCommand: (filePath) => `npm run agent:test -- ${filePath}`,
    budgetClass: "payment_auth_unlock_rules",
    why: "PayPal API changes affect server-truth purchases, economy balances, route security, and targeted route contracts.",
    safeSkips: ["No UI audit: this is an API route.", "No full check: targeted purchase/economy/security commands cover the changed route."],
  },
  {
    id: "chat",
    label: "chat_runtime_surface",
    priority: 90,
    match: (filePath) => filePath.startsWith("src/components/Chat/") || filePath.startsWith("src/app/api/chat/") || filePath.startsWith("src/lib/chat/"),
    staticScripts: ["check:user-chat-shell-routing", "check:event-catalog-telemetry", "check:device-ui"],
    budgetClass: "api_security",
    why: "Chat changes affect shell routing, telemetry continuity, and source-level device UI constraints.",
    safeSkips: ["No broad UI audit by default: device UI dry audit is the deterministic precheck.", "No full check: chat shell and telemetry validators are narrower."],
  },
  {
    id: "viewer",
    label: "viewer_watch_surface",
    priority: 90,
    match: (filePath) =>
      filePath.startsWith("src/app/dashboard/viewer/") ||
      filePath.includes("MediaViewer") ||
      filePath.includes("ViewerClient") ||
      filePath.includes("viewer-watch") ||
      filePath.includes("useViewerWatchSession"),
    staticScripts: ["check:watch-time-truth", "check:content-protection", "check:viewer-file-tracking"],
    budgetClass: "api_security",
    why: "Viewer changes affect watch-session continuity, locked-content protection, and per-file view tracking.",
    safeSkips: ["No Lighthouse or Playwright: viewer truth is source/route validated first.", "No full check: targeted viewer validators cover the touched surface."],
  },
  {
    id: "admin_users",
    label: "admin_user_truth_surface",
    priority: 80,
    match: (filePath) => filePath.startsWith("src/app/admin/users/") || filePath.startsWith("src/app/api/admin/user/"),
    staticScripts: ["check:admin-user-behavior-truth", "check:telemetry-identified-parity"],
    budgetClass: "api_security",
    why: "Admin user changes affect user behavior truth and identified telemetry projection.",
    safeSkips: ["No admin UI broad audit by default: user behavior and telemetry parity are narrower.", "No full check: targeted admin truth validators run first."],
  },
  {
    id: "firestore_rules",
    label: "firestore_rules",
    priority: 100,
    match: (filePath) => filePath === "firestore.rules",
    staticScripts: [],
    targetedScripts: ["test:rules:firestore"],
    budgetClass: "payment_auth_unlock_rules",
    why: "Firestore rule changes require the targeted Firestore rules test only.",
    safeSkips: ["No full firebase rules suite: only firestore.rules changed.", "No app typecheck: rules are not TypeScript runtime code."],
  },
  {
    id: "storage_rules",
    label: "storage_rules",
    priority: 100,
    match: (filePath) => filePath === "storage.rules",
    staticScripts: [],
    targetedScripts: ["test:rules:storage"],
    budgetClass: "payment_auth_unlock_rules",
    why: "Storage rule changes require the targeted Storage rules test only.",
    safeSkips: ["No full firebase rules suite: only storage.rules changed.", "No app typecheck: rules are not TypeScript runtime code."],
  },
  {
    id: "compact_agent_context",
    label: "compact_agent_context_surface",
    priority: 98,
    match: (filePath) =>
      filePath.startsWith("agent/context/") ||
      filePath.includes("compact-agent-context") ||
      filePath.endsWith("build-compact-agent-context.ts") ||
      filePath.endsWith("validate-compact-agent-context.ts"),
    staticScripts: ["check:agent-context", "check:affected-audit-router", "typecheck"],
    budgetClass: "agent_tooling",
    why: "Compact agent context changes affect doctrine cards, validator maps, task packs, and agent context load plans.",
    safeSkips: ["No app tests by default: compact context changes only affect agent retrieval metadata.", "No full check: compact context and router self-checks cover this path first."],
  },
  {
    id: "audit_cache",
    label: "audit_cache_surface",
    priority: 95,
    match: (filePath) =>
      filePath.includes("audit-cache") ||
      filePath.includes("file-fingerprint") ||
      filePath.startsWith("agent/cache/"),
    staticScripts: ["check:audit-cache", "check:affected-audit-router", "typecheck"],
    budgetClass: "agent_tooling",
    why: "Audit cache changes affect terminal suppression, cache fingerprints, and audit result reuse.",
    safeSkips: ["No app tests by default: audit cache changes only affect agent audit execution.", "No full check: cache/router self-checks cover this path first."],
  },
  {
    id: "legacy_phaseout",
    label: "legacy_phaseout_surface",
    priority: 94,
    match: (filePath) =>
      filePath.includes("legacy-registry") ||
      filePath.includes("legacy-phaseout") ||
      filePath.includes("orphaned-logic-score"),
    staticScripts: ["check:legacy-phaseout", "check:affected-audit-router", "typecheck"],
    optionalScripts: ["check:orphaned-logic"],
    budgetClass: "agent_tooling",
    why: "Legacy phaseout changes affect blocked-reference guardrails, owner deadlines, and orphaned-logic governance.",
    safeSkips: ["No app tests by default: legacy phaseout changes only affect deterministic audit/governance metadata.", "No full check: legacy phaseout and router self-checks cover this path first."],
  },
  {
    id: "agent_tooling",
    label: "agent_tooling_surface",
    priority: 80,
    match: (filePath) =>
      filePath.startsWith("scripts/agent/") ||
      filePath.startsWith("src/lib/agent-audit/") ||
      filePath.startsWith("agent/index/") ||
      filePath.startsWith("agent/state/"),
    staticScripts: ["check:affected-audit-router", "check:audit-runtime-ledger", "typecheck"],
    budgetClass: "agent_tooling",
    why: "Agent tooling changes should validate the affected router and audit runtime metadata before any app tests.",
    safeSkips: ["No app tests by default: only agent tooling changed.", "No full check: self-check validators cover the tooling path first."],
  },
  {
    id: "agent_truth_docs",
    label: "agent_truth_docs",
    priority: 75,
    match: (filePath) => filePath.startsWith("docs/agent-truth/") || filePath === "REPO_MEMORY_LEDGER.md" || filePath === "EVERY_FILE_FUNCTION_CHECKLIST.md",
    staticScripts: ["check:generated-artifacts"],
    budgetClass: "docs_only",
    why: "Agent truth docs require docs/generated-artifact consistency only.",
    safeSkips: ["No typecheck: docs-only edits do not affect TypeScript runtime.", "No app tests: docs cannot change product behavior."],
  },
  {
    id: "functions",
    label: "functions_runtime_surface",
    priority: 85,
    match: (filePath) => filePath.startsWith("functions/src/"),
    staticScripts: [],
    targetedScripts: ["check:functions"],
    budgetClass: "api_security",
    why: "Functions runtime changes require the functions package check, not app-wide checks.",
    safeSkips: ["No app UI audit: functions runtime is isolated.", "No full check: functions check is narrower."],
  },
  {
    id: "unlock",
    label: "unlock_entitlement_surface",
    priority: 95,
    match: (filePath) => filePath.includes("/drops/unlock") || filePath.includes("LockedDropPreview"),
    staticScripts: ["check:unlock-telemetry-truth", "check:payment-unlock-security", "check:content-protection"],
    budgetClass: "payment_auth_unlock_rules",
    why: "Unlock changes affect entitlement truth, payment security, and locked content exposure.",
    safeSkips: ["No broad UI audit by default: entitlement and content-protection checks run first."],
  },
  {
    id: "dataconnect",
    label: "dataconnect_agent_context_mirror",
    priority: 70,
    match: (filePath) => filePath.startsWith("dataconnect/"),
    staticScripts: ["check:cloud-cost", "check:google-cost"],
    budgetClass: "api_security",
    why: "Data Connect mirror changes affect Cloud SQL/Google cost guardrails.",
    safeSkips: ["No runtime app tests: Data Connect is an agent-context mirror unless explicitly promoted."],
  },
];

export function planAffectedAudits(input: AffectedAuditRouterInput): AffectedAuditPlan {
  const changedFiles = uniqueAffectedValues(input.changedFiles);
  const packageScripts = input.packageScripts ?? {};
  const changedPackageScripts = uniqueAffectedValues(input.changedPackageScripts ?? []);
  const affectedSurfaces = new Set<string>();
  const rawRequiredStatic: AffectedAuditPlannedCommand[] = [];
  const rawRequiredTargeted: AffectedAuditPlannedCommand[] = [];
  const optionalChecks: AffectedAuditPlannedCommand[] = [];
  const skipReasons: AffectedAuditSkipReason[] = [];
  const matchedRules = new Set<SurfaceRule>();

  for (const filePath of changedFiles) {
    for (const rule of SURFACE_RULES) {
      if (!rule.match(filePath)) continue;
      matchedRules.add(rule);
      affectedSurfaces.add(rule.label);
      addRuleCommands(rule, filePath, packageScripts, rawRequiredStatic, rawRequiredTargeted, optionalChecks, skipReasons);
    }
    addSurfaceMapMatches(filePath, input.surfaceMap, affectedSurfaces);
    addDependencyMatches(filePath, input.dependencyGraph, affectedSurfaces, optionalChecks, packageScripts, skipReasons);
  }

  if (changedPackageScripts.some((scriptName) => scriptName.startsWith("check:") || scriptName.startsWith("audit:") || scriptName.startsWith("plan:"))) {
    affectedSurfaces.add("package_script_validation");
    addScriptCommand("check:affected-audit-router", "package_script_validation", "Changed package audit/check scripts need affected-router validation.", packageScripts, rawRequiredStatic, skipReasons, 85);
  }

  if (changedFiles.length === 0) {
    skipReasons.push({
      command: "npm run typecheck",
      surface: "no_changes",
      whySafeToSkip: "No changed files were detected, so no TypeScript or app checks are required.",
    });
  }

  if (matchedRules.size === 0 && changedFiles.length > 0) {
    addFallbackForUnmatchedChanges(changedFiles, packageScripts, rawRequiredStatic, optionalChecks, skipReasons, affectedSurfaces);
  }

  const commandBudgetClass = classifyBudget(changedFiles, Array.from(matchedRules));
  const maxCommandBudget = maxBudgetForClass(commandBudgetClass);
  const requiredTargetedTests = applyCommandBudget(rawRequiredTargeted, maxCommandBudget, skipReasons);
  const remainingBudget = Math.max(0, maxCommandBudget - requiredTargetedTests.reduce((total, command) => total + command.budgetCost, 0));
  const requiredStaticScans = applyCommandBudget(rawRequiredStatic, remainingBudget, skipReasons);
  const allowedCommands = [...requiredStaticScans, ...requiredTargetedTests];
  const forbiddenByDefault = FULL_SUITE_FORBIDDEN_COMMANDS.map((command) =>
    buildPlannedCommand({
      command,
      group: "forbidden_by_default",
      surface: "repo_wide",
      whyThisCommand: "Full-suite or browser-heavy command is not needed for the affected files.",
      whyNotFullCheck: WHY_NOT_FULL_CHECK,
      safeSkipReason: "Targeted affected checks must run before broad terminal sweeps.",
      priority: 0,
    }),
  );

  addDefaultSkips(changedFiles, skipReasons);

  return {
    generatedAt: new Date().toISOString(),
    source: [
      AFFECTED_AUDIT_PLAN_PATH,
      "agent/index/surface-map.json",
      "agent/index/dependency-graph.summary.json",
      "agent/index/verification-commands.json",
      "package.json",
    ],
    researchModel:
      "Nx-style affected planning: Git changed files plus repo surface map and dependency/ownership hints determine the minimum affected checks; Nx is not required.",
    taskSummary: input.taskSummary ?? "",
    base: input.base,
    head: input.head,
    changedFiles,
    changedPackageScripts,
    affectedSurfaces: uniqueAffectedValues(Array.from(affectedSurfaces)),
    requiredStaticScans,
    requiredTargetedTests,
    optionalChecks: dedupeOptionalChecks(optionalChecks, allowedCommands),
    forbiddenByDefault,
    terminalRunJustification: buildTerminalRunJustification(allowedCommands),
    maxCommandBudget,
    commandBudgetClass,
    whyNotFullCheck: WHY_NOT_FULL_CHECK,
    skipReasons,
  };
}

function addRuleCommands(
  rule: SurfaceRule,
  filePath: string,
  packageScripts: Record<string, string>,
  staticScans: AffectedAuditPlannedCommand[],
  targetedTests: AffectedAuditPlannedCommand[],
  optionalChecks: AffectedAuditPlannedCommand[],
  skipReasons: AffectedAuditSkipReason[],
) {
  for (const scriptName of rule.staticScripts) {
    addScriptCommand(scriptName, rule.label, rule.why, packageScripts, staticScans, skipReasons, rule.priority);
  }
  for (const scriptName of rule.targetedScripts ?? []) {
    addScriptCommand(scriptName, rule.label, rule.why, packageScripts, targetedTests, skipReasons, rule.priority);
  }
  const targetedCommand = rule.targetedCommand?.(filePath);
  if (targetedCommand) {
    targetedTests.push(
      buildPlannedCommand({
        command: targetedCommand,
        group: "required_targeted_test",
        surface: rule.label,
        whyThisCommand: `${rule.why} It is scoped to ${filePath}.`,
        whyNotFullCheck: WHY_NOT_FULL_CHECK,
        priority: rule.priority - 5,
      }),
    );
  }
  for (const scriptName of rule.optionalScripts ?? []) {
    addScriptCommand(scriptName, rule.label, `${rule.why} This is optional unless TypeScript uncertainty remains.`, packageScripts, optionalChecks, skipReasons, rule.priority - 20, "optional");
  }
  for (const skip of rule.safeSkips) {
    skipReasons.push({ command: "broad checks", surface: rule.label, whySafeToSkip: skip });
  }
}

function addScriptCommand(
  scriptName: string,
  surface: string,
  whyThisCommand: string,
  packageScripts: Record<string, string>,
  target: AffectedAuditPlannedCommand[],
  skipReasons: AffectedAuditSkipReason[],
  priority: number,
  group: "required_static_scan" | "required_targeted_test" | "optional" = "required_static_scan",
) {
  if (packageScripts[scriptName] === undefined) {
    skipReasons.push({
      command: commandForPackageScript(scriptName),
      surface,
      whySafeToSkip: "Package script is not defined in this workspace.",
    });
    return;
  }

  target.push(
    buildPlannedCommand({
      command: commandForPackageScript(scriptName),
      group,
      surface,
      whyThisCommand,
      whyNotFullCheck: WHY_NOT_FULL_CHECK,
      safeSkipReason: group === "optional" ? "Optional unless the required affected checks leave critical uncertainty." : undefined,
      priority,
    }),
  );
}

function addSurfaceMapMatches(filePath: string, surfaceMap: AffectedAuditRouterInput["surfaceMap"], affectedSurfaces: Set<string>) {
  for (const domain of surfaceMap?.domains ?? []) {
    if (domain.path_prefixes.some((prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`))) {
      affectedSurfaces.add(`surface_map:${domain.name}`);
    }
  }
}

function addDependencyMatches(
  filePath: string,
  dependencyGraph: AffectedAuditRouterInput["dependencyGraph"],
  affectedSurfaces: Set<string>,
  optionalChecks: AffectedAuditPlannedCommand[],
  packageScripts: Record<string, string>,
  skipReasons: AffectedAuditSkipReason[],
) {
  const highInbound = dependencyGraph?.highInboundFiles?.find((entry) => normalizeAffectedPath(entry.path) === filePath);
  if (!highInbound) return;
  affectedSurfaces.add("dependency_graph:high_inbound_shared_helper");
  addScriptCommand(
    "typecheck",
    "dependency_graph:high_inbound_shared_helper",
    `High-inbound shared helper changed (${highInbound.inboundCount ?? "unknown"} inbound references); typecheck is optional after targeted validators.`,
    packageScripts,
    optionalChecks,
    skipReasons,
    45,
    "optional",
  );
}

function addFallbackForUnmatchedChanges(
  changedFiles: string[],
  packageScripts: Record<string, string>,
  staticScans: AffectedAuditPlannedCommand[],
  optionalChecks: AffectedAuditPlannedCommand[],
  skipReasons: AffectedAuditSkipReason[],
  affectedSurfaces: Set<string>,
) {
  if (changedFiles.every((filePath) => filePath.endsWith(".md") || filePath.startsWith("docs/"))) {
    affectedSurfaces.add("docs_only");
    addScriptCommand("check:generated-artifacts", "docs_only", "Docs-only changes need docs/generated-artifact consistency only.", packageScripts, staticScans, skipReasons, 50);
    return;
  }

  if (changedFiles.some((filePath) => /\.(?:ts|tsx|js|jsx|mjs|cjs)$/u.test(filePath))) {
    affectedSurfaces.add("unmatched_typescript");
    addScriptCommand("typecheck", "unmatched_typescript", "Unmatched TypeScript/JavaScript changed; typecheck is the narrow fallback.", packageScripts, staticScans, skipReasons, 50);
    return;
  }

  affectedSurfaces.add("static_only");
  addScriptCommand("check:generated-artifacts", "static_only", "Static config/docs changed; generated-artifact consistency is the narrow fallback.", packageScripts, staticScans, skipReasons, 40);
}

function classifyBudget(changedFiles: string[], rules: SurfaceRule[]): CommandBudgetClass {
  if (rules.some((rule) => rule.budgetClass === "payment_auth_unlock_rules")) return "payment_auth_unlock_rules";
  if (rules.some((rule) => rule.budgetClass === "api_security")) return "api_security";
  if (rules.some((rule) => rule.budgetClass === "agent_tooling")) return "agent_tooling";
  if (changedFiles.length > 0 && changedFiles.every((filePath) => filePath.endsWith(".md") || filePath.startsWith("docs/"))) return "docs_only";
  if (changedFiles.length > 0 && changedFiles.every((filePath) => filePath.startsWith("src/components/") || filePath.endsWith(".tsx"))) {
    return "component_only";
  }
  return "static_only";
}

function dedupeOptionalChecks(optionalChecks: AffectedAuditPlannedCommand[], requiredCommands: AffectedAuditPlannedCommand[]) {
  const required = new Set(requiredCommands.map((command) => command.command));
  const byCommand = new Map<string, AffectedAuditPlannedCommand>();
  for (const command of optionalChecks) {
    if (!required.has(command.command)) {
      byCommand.set(command.command, command);
    }
  }
  return Array.from(byCommand.values()).sort((a, b) => b.priority - a.priority || a.command.localeCompare(b.command));
}

function addDefaultSkips(changedFiles: string[], skipReasons: AffectedAuditSkipReason[]) {
  if (changedFiles.every((filePath) => filePath.endsWith(".md") || filePath.startsWith("docs/"))) {
    skipReasons.push({
      command: "npm run typecheck",
      surface: "docs_only",
      whySafeToSkip: "Docs-only edits cannot affect TypeScript runtime behavior.",
    });
  }
  if (changedFiles.every((filePath) => filePath.startsWith("scripts/agent/") || filePath.startsWith("src/lib/agent-audit/"))) {
    skipReasons.push({
      command: "app tests",
      surface: "agent_tooling_surface",
      whySafeToSkip: "Agent tooling changes do not modify app runtime surfaces.",
    });
  }
}
