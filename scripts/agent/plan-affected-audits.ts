import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { planAffectedAudits, type AffectedDependencyGraphSummary, type AffectedSurfaceMapDomain } from "../../src/lib/agent-audit/affected-surface-router";
import {
  AFFECTED_AUDIT_PLAN_PATH,
  normalizeAffectedPath,
  uniqueAffectedValues,
  type AffectedAuditPlan,
} from "../../src/lib/agent-audit/verification-command-budget";

type ParsedArgs = {
  base?: string;
  head?: string;
  taskSummary: string;
  files: string[];
  changedPackageScripts: string[];
};

type ValidatorAuthorityStatus = "canonical" | "supporting" | "legacy" | "blocked";

type ValidatorAuthorityEntry = {
  status: ValidatorAuthorityStatus;
  reason: string;
};

type ValidatorAuthorityDocument = {
  defaultAffectedAuditBlockedStatuses?: ValidatorAuthorityStatus[];
  defaults?: Array<ValidatorAuthorityEntry & { match: string }>;
  overrides?: Record<string, ValidatorAuthorityEntry>;
};

const root = process.cwd();

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    taskSummary: "",
    files: [],
    changedPackageScripts: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index] ?? "";
    const equalsIndex = current.indexOf("=");
    const flag = equalsIndex >= 0 ? current.slice(0, equalsIndex) : current;
    const inlineValue = equalsIndex >= 0 ? current.slice(equalsIndex + 1) : undefined;
    const nextValue = () => inlineValue ?? argv[++index] ?? "";

    switch (flag) {
      case "--base":
        parsed.base = nextValue();
        break;
      case "--head":
        parsed.head = nextValue();
        break;
      case "--task":
      case "--summary":
      case "--task-summary":
        parsed.taskSummary = nextValue();
        break;
      case "--file":
        parsed.files.push(nextValue());
        break;
      case "--files":
        parsed.files.push(...splitList(nextValue()));
        break;
      case "--changed-script":
        parsed.changedPackageScripts.push(nextValue());
        break;
      case "--changed-scripts":
        parsed.changedPackageScripts.push(...splitList(nextValue()));
        break;
      default:
        if (current.trim()) {
          parsed.files.push(current);
        }
    }
  }

  return parsed;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readJsonFile<T>(filePath: string, fallback: T): T {
  const fullPath = join(root, filePath);
  if (!existsSync(fullPath)) return fallback;
  return JSON.parse(readFileSync(fullPath, "utf8")) as T;
}

function readPackageScripts() {
  return readJsonFile<{ scripts?: Record<string, string> }>("package.json", {}).scripts ?? {};
}

function readSurfaceMap() {
  return readJsonFile<{ domains?: AffectedSurfaceMapDomain[] }>("agent/index/surface-map.json", { domains: [] });
}

function readDependencyGraph() {
  return readJsonFile<AffectedDependencyGraphSummary>("agent/index/dependency-graph.summary.json", {});
}

function readValidatorAuthority() {
  return readJsonFile<ValidatorAuthorityDocument>("agent/context/validator-authority.json", {
    defaultAffectedAuditBlockedStatuses: ["legacy", "blocked"],
    defaults: [],
    overrides: {},
  });
}

function matchesPattern(value: string, pattern: string) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "u").test(value);
}

function resolveValidatorAuthorityEntry(
  filePath: string,
  authority: ValidatorAuthorityDocument,
): ValidatorAuthorityEntry | null {
  const override = authority.overrides?.[filePath];
  if (override) {
    return override;
  }

  for (const entry of authority.defaults ?? []) {
    if (matchesPattern(filePath, entry.match)) {
      return {
        status: entry.status,
        reason: entry.reason,
      };
    }
  }

  return null;
}

function extractValidatorFilesFromPackageScript(script: string) {
  return Array.from(
    script.matchAll(/scripts\/(?:agent\/validate-[^"'`\s;&|]+\.ts|check-[^"'`\s;&|]+\.ts)/gu),
    (match) => normalizeAffectedPath(match[0] ?? ""),
  ).filter(Boolean);
}

function filterPlanByValidatorAuthority(
  plan: AffectedAuditPlan,
  packageScripts: Record<string, string>,
  authority: ValidatorAuthorityDocument,
) {
  const blockedStatuses = new Set<ValidatorAuthorityStatus>(
    authority.defaultAffectedAuditBlockedStatuses ?? ["legacy", "blocked"],
  );

  const shouldKeepCommand = (command: string) => {
    const match = command.match(/^npm run ([^ ]+)$/u);
    if (!match) {
      return { keep: true as const };
    }

    const scriptName = match[1] ?? "";
    const packageScript = packageScripts[scriptName];
    if (!packageScript) {
      return { keep: true as const };
    }

    const validatorFiles = extractValidatorFilesFromPackageScript(packageScript);
    if (validatorFiles.length === 0) {
      return { keep: true as const };
    }

    const excluded = validatorFiles
      .map((filePath) => ({ filePath, authority: resolveValidatorAuthorityEntry(filePath, authority) }))
      .filter((entry) => entry.authority && blockedStatuses.has(entry.authority.status));

    if (excluded.length === 0) {
      return { keep: true as const };
    }

    return {
      keep: false as const,
      why: excluded
        .map((entry) => `${entry.filePath} is ${entry.authority?.status}: ${entry.authority?.reason}`)
        .join(" | "),
      scriptName,
    };
  };

  const skipReasons = [...plan.skipReasons];
  const filterCommands = (commands: AffectedAuditPlan["requiredStaticScans"]) =>
    commands.filter((entry) => {
      const verdict = shouldKeepCommand(entry.command);
      if (!verdict.keep) {
        skipReasons.push({
          command: entry.command,
          surface: entry.surface,
          whySafeToSkip: `Validator authority excludes it from the default affected audit plan because ${verdict.why}`,
        });
      }
      return verdict.keep;
    });

  return {
    ...plan,
    requiredStaticScans: filterCommands(plan.requiredStaticScans),
    requiredTargetedTests: filterCommands(plan.requiredTargetedTests),
    optionalChecks: filterCommands(plan.optionalChecks),
    skipReasons,
  } satisfies AffectedAuditPlan;
}

function gitOutput(args: string[]) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" });
  } catch {
    return "";
  }
}

function readGitChangedFiles(args: ParsedArgs) {
  // Mirrors the Nx affected input model: git diff changed files feed the surface router.
  if (args.files.length > 0) {
    return uniqueAffectedValues(args.files);
  }

  if (args.base && args.head) {
    return parseGitNameOnly(gitOutput(["diff", "--name-only", args.base, args.head]));
  }

  if (args.base) {
    return parseGitNameOnly(gitOutput(["diff", "--name-only", args.base]));
  }

  return uniqueAffectedValues([
    ...parseGitNameOnly(gitOutput(["diff", "--name-only"])),
    ...parseGitNameOnly(gitOutput(["diff", "--cached", "--name-only"])),
    ...parseGitStatus(gitOutput(["status", "--short"])),
  ]);
}

function parseGitNameOnly(source: string) {
  return source
    .split(/\r?\n/u)
    .map(normalizeAffectedPath)
    .filter(Boolean);
}

function parseGitStatus(source: string) {
  return source
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const filePath = line.slice(3).trim();
      return filePath.includes(" -> ") ? filePath.split(" -> ").pop() ?? filePath : filePath;
    })
    .map(normalizeAffectedPath)
    .filter(Boolean);
}

function readChangedPackageScripts(args: ParsedArgs, changedFiles: string[]) {
  const explicit = uniqueAffectedValues(args.changedPackageScripts);
  if (!changedFiles.includes("package.json")) return explicit;

  const diffArgs = args.base && args.head ? ["diff", args.base, args.head, "--", "package.json"] : ["diff", "--", "package.json"];
  const diff = gitOutput(diffArgs);
  const detected: string[] = [];
  for (const line of diff.split(/\r?\n/u)) {
    if (!/^[+-]\s+"/u.test(line)) continue;
    const match = line.match(/^[+-]\s+"([^"]+)":\s+"/u);
    if (match?.[1]) detected.push(match[1]);
  }
  return uniqueAffectedValues([...explicit, ...detected]);
}

function writePlan(plan: AffectedAuditPlan) {
  const fullPath = join(root, AFFECTED_AUDIT_PLAN_PATH);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(plan, null, 2)}\n`);
}

function printPlan(plan: AffectedAuditPlan) {
  const required = [...plan.requiredStaticScans, ...plan.requiredTargetedTests];
  console.log(`Affected audit plan written to ${AFFECTED_AUDIT_PLAN_PATH}`);
  console.log(`Changed files: ${plan.changedFiles.length}`);
  console.log(`Affected surfaces: ${plan.affectedSurfaces.length > 0 ? plan.affectedSurfaces.join(", ") : "(none)"}`);
  console.log(`Command budget: ${plan.maxCommandBudget} (${plan.commandBudgetClass})`);
  console.log("Required commands:");
  if (required.length === 0) {
    console.log("- none");
  } else {
    for (const command of required) {
      console.log(`- ${command.command} # ${command.whyThisCommand}`);
    }
  }
  console.log(`Why not full check: ${plan.whyNotFullCheck}`);
}

const args = parseArgs(process.argv.slice(2));
const changedFiles = readGitChangedFiles(args);
const rawPlan = planAffectedAudits({
  changedFiles,
  changedPackageScripts: readChangedPackageScripts(args, changedFiles),
  taskSummary: args.taskSummary,
  base: args.base,
  head: args.head,
  packageScripts: readPackageScripts(),
  surfaceMap: readSurfaceMap(),
  dependencyGraph: readDependencyGraph(),
});
const plan = filterPlanByValidatorAuthority(rawPlan, readPackageScripts(), readValidatorAuthority());

writePlan(plan);
printPlan(plan);
