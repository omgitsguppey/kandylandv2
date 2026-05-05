export type AffectedAuditCommandGroup =
  | "required_static_scan"
  | "required_targeted_test"
  | "optional"
  | "forbidden_by_default";

export type CommandBudgetClass =
  | "static_only"
  | "docs_only"
  | "agent_tooling"
  | "component_only"
  | "api_security"
  | "payment_auth_unlock_rules";

export type AffectedAuditPlannedCommand = {
  command: string;
  packageScript?: string;
  group: AffectedAuditCommandGroup;
  surface: string;
  whyThisCommand: string;
  whyNotFullCheck: string;
  safeSkipReason?: string;
  budgetCost: number;
  priority: number;
};

export type TerminalRunJustification = {
  command: string;
  surface: string;
  whyThisCommand: string;
  allowedBy: "required_static_scan" | "required_targeted_test";
};

export type AffectedAuditSkipReason = {
  command: string;
  surface: string;
  whySafeToSkip: string;
};

export type AffectedAuditPlan = {
  generatedAt: string;
  source: string[];
  researchModel: string;
  taskSummary: string;
  base?: string;
  head?: string;
  changedFiles: string[];
  changedPackageScripts: string[];
  affectedSurfaces: string[];
  requiredStaticScans: AffectedAuditPlannedCommand[];
  requiredTargetedTests: AffectedAuditPlannedCommand[];
  optionalChecks: AffectedAuditPlannedCommand[];
  forbiddenByDefault: AffectedAuditPlannedCommand[];
  terminalRunJustification: TerminalRunJustification[];
  maxCommandBudget: number;
  commandBudgetClass: CommandBudgetClass;
  whyNotFullCheck: string;
  skipReasons: AffectedAuditSkipReason[];
};

export const AFFECTED_AUDIT_PLAN_PATH = "agent/state/affected-audit-plan.generated.json";
export const AFFECTED_AUDIT_DOC_PATH = "docs/agent-truth/affected-audit-router.md";

export const FULL_SUITE_FORBIDDEN_COMMANDS = [
  "npm run check",
  "npm run check:continuity",
  "npm run check:ui:audits",
  "npm run check:ui:lighthouse",
  "npm run check:ui:continuity",
  "npx cypress run",
  "playwright test",
] as const;

export function normalizeAffectedPath(value: string) {
  return value.replace(/\\/gu, "/").replace(/^\.\//u, "").trim();
}

export function uniqueAffectedValues(values: readonly string[]) {
  return Array.from(new Set(values.map(normalizeAffectedPath).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function commandForPackageScript(scriptName: string) {
  return `npm run ${scriptName}`;
}

export function packageScriptFromCommand(command: string) {
  const match = command.match(/^npm run ([a-z0-9:_-]+)(?:\s|$)/iu);
  return match?.[1];
}

export function isFullSuiteForbiddenCommand(command: string) {
  const normalized = command.trim();
  return FULL_SUITE_FORBIDDEN_COMMANDS.some((forbidden) => normalized === forbidden || normalized.startsWith(`${forbidden} `));
}

export function maxBudgetForClass(commandBudgetClass: CommandBudgetClass) {
  switch (commandBudgetClass) {
    case "payment_auth_unlock_rules":
      return 4;
    case "api_security":
      return 3;
    case "agent_tooling":
      return 3;
    case "component_only":
      return 2;
    case "docs_only":
    case "static_only":
      return 1;
  }
}

export function buildPlannedCommand(input: {
  command: string;
  group: AffectedAuditCommandGroup;
  surface: string;
  whyThisCommand: string;
  whyNotFullCheck: string;
  safeSkipReason?: string;
  priority?: number;
  budgetCost?: number;
}): AffectedAuditPlannedCommand {
  return {
    command: input.command,
    packageScript: packageScriptFromCommand(input.command),
    group: input.group,
    surface: input.surface,
    whyThisCommand: input.whyThisCommand,
    whyNotFullCheck: input.whyNotFullCheck,
    safeSkipReason: input.safeSkipReason,
    budgetCost: input.budgetCost ?? 1,
    priority: input.priority ?? 50,
  };
}

export function dedupePlannedCommands(commands: readonly AffectedAuditPlannedCommand[]) {
  const byCommand = new Map<string, AffectedAuditPlannedCommand>();

  for (const command of commands) {
    const existing = byCommand.get(command.command);
    if (!existing || command.priority > existing.priority) {
      byCommand.set(command.command, command);
      continue;
    }
    if (existing.whyThisCommand !== command.whyThisCommand) {
      byCommand.set(command.command, {
        ...existing,
        whyThisCommand: mergeCommandJustifications(existing.whyThisCommand, command.whyThisCommand),
      });
    }
  }

  return Array.from(byCommand.values()).sort((a, b) => b.priority - a.priority || a.command.localeCompare(b.command));
}

function mergeCommandJustifications(left: string, right: string) {
  return Array.from(new Set([...splitJustification(left), ...splitJustification(right)])).join(" ");
}

function splitJustification(value: string) {
  return value
    .split(/(?<=\.)\s+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function applyCommandBudget(
  commands: readonly AffectedAuditPlannedCommand[],
  maxCommandBudget: number,
  skipReasons: AffectedAuditSkipReason[],
) {
  const accepted: AffectedAuditPlannedCommand[] = [];
  let usedBudget = 0;

  for (const command of dedupePlannedCommands(commands)) {
    if (usedBudget + command.budgetCost <= maxCommandBudget) {
      accepted.push(command);
      usedBudget += command.budgetCost;
      continue;
    }
    skipReasons.push({
      command: command.command,
      surface: command.surface,
      whySafeToSkip: `Skipped by affected command budget ${maxCommandBudget}; higher-priority checks cover the same changed files first.`,
    });
  }

  return accepted;
}

export function buildTerminalRunJustification(commands: readonly AffectedAuditPlannedCommand[]): TerminalRunJustification[] {
  return commands
    .filter(
      (
        command,
      ): command is AffectedAuditPlannedCommand & { group: "required_static_scan" | "required_targeted_test" } =>
        command.group === "required_static_scan" || command.group === "required_targeted_test",
    )
    .map((command) => ({
      command: command.command,
      surface: command.surface,
      whyThisCommand: command.whyThisCommand,
      allowedBy: command.group,
    }));
}

export function explainTerminalGate(
  command: string,
  plan: AffectedAuditPlan | null,
  options: { explicitOverride?: boolean; criticalUncertainty?: boolean; overrideReason?: string } = {},
) {
  const normalizedCommand = command.trim();
  if (!plan) {
    return {
      allowed: Boolean(options.explicitOverride),
      reason: options.explicitOverride
        ? `Allowed by explicit override: ${options.overrideReason ?? "manual terminal request"}.`
        : "Blocked because no affected audit plan is available.",
    };
  }

  const planned = plan.terminalRunJustification.find(
    (entry) => entry.command === normalizedCommand || normalizedCommand.startsWith(`${entry.command} `),
  );
  if (planned) {
    return { allowed: true, reason: planned.whyThisCommand };
  }

  if (options.criticalUncertainty) {
    return { allowed: true, reason: "Allowed because a previous static scan found critical uncertainty." };
  }

  if (options.explicitOverride) {
    return {
      allowed: true,
      reason: `Allowed by explicit override: ${options.overrideReason ?? "manual terminal request"}.`,
    };
  }

  return {
    allowed: false,
    reason: "Blocked because the affected precheck did not mark this command required.",
  };
}
