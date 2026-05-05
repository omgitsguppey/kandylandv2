import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  AUDIT_ACCURACY_STATUSES,
  AUDIT_RESOURCE_CLASSES,
  AUDIT_RUNTIME_LEDGER_PATH,
  AUDIT_RUNTIME_SUMMARY_PATH,
  createAuditCacheKey,
  createAuditRunId,
  detectAuditResourceClass,
  detectForbiddenAuditCommands,
  isAuditAccuracyStatus,
  isAuditResourceClass,
  normalizeAuditPath,
  parseAuditRuntimeLedgerLine,
  serializeAuditRuntimeLedgerEntry,
  uniqueSorted,
  type AuditAccuracyStatus,
  type AuditResourceClass,
  type AuditRuntimeLedgerEntry,
} from "../../src/lib/agent-audit/audit-runtime-contract";
import { summarizeAuditRuntime } from "../../src/lib/agent-audit/audit-speed-score";
import {
  AFFECTED_AUDIT_PLAN_PATH,
  explainTerminalGate,
  type AffectedAuditPlan,
} from "../../src/lib/agent-audit/verification-command-budget";

type PackageJson = {
  scripts?: Record<string, string>;
};

type ParsedArgs = {
  auditName: string | null;
  triggerReason: string;
  accuracyStatus: AuditAccuracyStatus;
  resourceClass: AuditResourceClass | null;
  findingsCount: number | null;
  criticalCount: number;
  majorCount: number;
  inspectedFiles: string[];
  changedFiles: string[];
  cacheHit: boolean;
  allowUnplanned: boolean;
  criticalUncertainty: boolean;
  terminalReason: string;
  passThroughArgs: string[];
};

type ResolvedAuditCommand = {
  auditName: string;
  commandDefinition: string;
  terminalCommand: string;
  executable: string;
  args: string[];
  inspectedFiles: string[];
};

const root = process.cwd();

function parseArgs(argv: string[]): ParsedArgs {
  const delimiterIndex = argv.indexOf("--");
  const ownArgs = delimiterIndex >= 0 ? argv.slice(0, delimiterIndex) : argv;
  const passThroughArgs = delimiterIndex >= 0 ? argv.slice(delimiterIndex + 1) : [];
  const parsed: ParsedArgs = {
    auditName: null,
    triggerReason: "manual",
    accuracyStatus: "unknown",
    resourceClass: null,
    findingsCount: null,
    criticalCount: 0,
    majorCount: 0,
    inspectedFiles: [],
    changedFiles: [],
    cacheHit: false,
    allowUnplanned: false,
    criticalUncertainty: false,
    terminalReason: "",
    passThroughArgs,
  };

  for (let index = 0; index < ownArgs.length; index += 1) {
    const current = ownArgs[index] ?? "";
    const equalsIndex = current.indexOf("=");
    const flag = equalsIndex >= 0 ? current.slice(0, equalsIndex) : current;
    const inlineValue = equalsIndex >= 0 ? current.slice(equalsIndex + 1) : undefined;
    const nextValue = () => inlineValue ?? ownArgs[++index] ?? "";

    switch (flag) {
      case "--audit":
        parsed.auditName = nextValue();
        break;
      case "--trigger":
      case "--triggerReason":
      case "--trigger-reason":
        parsed.triggerReason = nextValue() || "manual";
        break;
      case "--accuracy":
      case "--accuracyStatus":
      case "--accuracy-status": {
        const value = nextValue();
        if (!isAuditAccuracyStatus(value)) {
          throw new Error(`Invalid accuracy status "${value}". Expected one of: ${AUDIT_ACCURACY_STATUSES.join(", ")}`);
        }
        parsed.accuracyStatus = value;
        break;
      }
      case "--resource":
      case "--resourceClass":
      case "--resource-class": {
        const value = nextValue();
        if (!isAuditResourceClass(value)) {
          throw new Error(`Invalid resource class "${value}". Expected one of: ${AUDIT_RESOURCE_CLASSES.join(", ")}`);
        }
        parsed.resourceClass = value;
        break;
      }
      case "--findings":
      case "--findingsCount":
      case "--findings-count":
        parsed.findingsCount = readCount(nextValue(), "findings count");
        break;
      case "--critical":
      case "--criticalCount":
      case "--critical-count":
        parsed.criticalCount = readCount(nextValue(), "critical count");
        break;
      case "--major":
      case "--majorCount":
      case "--major-count":
        parsed.majorCount = readCount(nextValue(), "major count");
        break;
      case "--inspected":
      case "--inspectedFiles":
      case "--inspected-files":
        parsed.inspectedFiles.push(...splitList(nextValue()));
        break;
      case "--changed":
      case "--changedFiles":
      case "--changed-files":
        parsed.changedFiles.push(...splitList(nextValue()));
        break;
      case "--cache-hit":
      case "--cacheHit":
        parsed.cacheHit = true;
        break;
      case "--allow-unplanned":
      case "--allowUnplanned":
        parsed.allowUnplanned = true;
        break;
      case "--critical-uncertainty":
      case "--criticalUncertainty":
        parsed.criticalUncertainty = true;
        break;
      case "--terminal-reason":
      case "--terminalReason":
        parsed.terminalReason = nextValue();
        break;
      default:
        if (current.trim().length > 0) {
          throw new Error(`Unknown audit runtime option "${current}".`);
        }
    }
  }

  return parsed;
}

function readCount(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid ${label}: "${value}".`);
  }
  return parsed;
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PackageJson;
}

function readAffectedAuditPlan() {
  const planPath = join(root, AFFECTED_AUDIT_PLAN_PATH);
  if (!existsSync(planPath)) return null;
  try {
    return JSON.parse(readFileSync(planPath, "utf8")) as AffectedAuditPlan;
  } catch {
    return null;
  }
}

function resolveAuditCommand(auditName: string, scripts: Record<string, string>, passThroughArgs: string[]): ResolvedAuditCommand {
  if (scripts[auditName]) {
    const npmInvocation = createNpmInvocation(["run", auditName, ...(passThroughArgs.length > 0 ? ["--", ...passThroughArgs] : [])]);
    const terminalCommand = `npm run ${auditName}${passThroughArgs.length > 0 ? ` -- ${passThroughArgs.join(" ")}` : ""}`;
    return {
      auditName,
      commandDefinition: scripts[auditName],
      terminalCommand,
      executable: npmInvocation.executable,
      args: npmInvocation.args,
      inspectedFiles: inferInspectedFilesFromCommand(scripts[auditName], scripts),
    };
  }

  const directPath = resolveDirectValidatorPath(auditName);
  if (directPath) {
    const tsxInvocation = createTsxInvocation([normalizeAuditPath(directPath), ...passThroughArgs]);
    const normalizedPath = normalizeAuditPath(directPath);
    return {
      auditName: normalizedPath,
      commandDefinition: `tsx ${normalizedPath}`,
      terminalCommand: `tsx ${normalizedPath}${passThroughArgs.length > 0 ? ` ${passThroughArgs.join(" ")}` : ""}`,
      executable: tsxInvocation.executable,
      args: tsxInvocation.args,
      inspectedFiles: inferInspectedFilesFromScript(normalizedPath),
    };
  }

  throw new Error(`Unknown audit "${auditName}". Use a package script name or scripts/agent validator path.`);
}

function createNpmInvocation(args: string[]) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && existsSync(npmExecPath) && /\.(?:c?js|mjs)$/iu.test(npmExecPath)) {
    return { executable: process.execPath, args: [npmExecPath, ...args] };
  }

  return { executable: process.platform === "win32" ? "npm.cmd" : "npm", args };
}

function createTsxInvocation(args: string[]) {
  const tsxCli = join(root, "node_modules", "tsx", "dist", "cli.mjs");
  if (existsSync(tsxCli)) {
    return { executable: process.execPath, args: [tsxCli, ...args] };
  }

  return {
    executable: join(root, "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx"),
    args,
  };
}

function resolveDirectValidatorPath(auditName: string) {
  const candidates = [
    auditName,
    auditName.endsWith(".ts") ? auditName : `${auditName}.ts`,
    auditName.startsWith("scripts/agent/") ? auditName : `scripts/agent/${auditName}`,
    auditName.startsWith("scripts/agent/") || auditName.endsWith(".ts") ? auditName : `scripts/agent/${auditName}.ts`,
  ].map(normalizeAuditPath);

  return candidates.find((candidate) => candidate.startsWith("scripts/agent/") && existsSync(join(root, candidate))) ?? null;
}

function inferInspectedFilesFromCommand(command: string, scripts: Record<string, string>, seenScripts = new Set<string>()): string[] {
  const inspected = new Set<string>();
  for (const scriptPath of extractScriptPaths(command)) {
    inspected.add(scriptPath);
    for (const referenced of inferInspectedFilesFromScript(scriptPath)) {
      inspected.add(referenced);
    }
  }

  const packageScriptPattern = /\bnpm\s+run\s+([a-z0-9:_-]+)/giu;
  let match: RegExpExecArray | null;
  while ((match = packageScriptPattern.exec(command))) {
    const scriptName = match[1];
    if (!scriptName || seenScripts.has(scriptName) || !scripts[scriptName]) continue;
    seenScripts.add(scriptName);
    for (const referenced of inferInspectedFilesFromCommand(scripts[scriptName], scripts, seenScripts)) {
      inspected.add(referenced);
    }
  }

  return uniqueSorted(Array.from(inspected));
}

function extractScriptPaths(command: string) {
  const paths: string[] = [];
  const scriptPattern = /(?:tsx|node|ts-node)\s+([^\s&|;]+\.tsx?)/giu;
  let match: RegExpExecArray | null;
  while ((match = scriptPattern.exec(command))) {
    if (match[1]) paths.push(normalizeAuditPath(match[1]));
  }
  return paths;
}

function inferInspectedFilesFromScript(scriptPath: string) {
  const inspected = new Set<string>([normalizeAuditPath(scriptPath)]);
  const fullPath = join(root, scriptPath);
  if (!existsSync(fullPath)) return Array.from(inspected);

  const source = readFileSync(fullPath, "utf8");
  for (const referenced of extractRepoPathsFromSource(source)) {
    inspected.add(referenced);
  }

  return uniqueSorted(Array.from(inspected));
}

function extractRepoPathsFromSource(source: string) {
  const paths: string[] = [];
  const quotedPathPattern =
    /["'`]((?:(?:src|scripts|agent|docs|tests|functions|control-tower|\.agent)\/[^"'`]+?)|(?:package\.json|tsconfig\.json|vitest\.config\.ts|README\.md|AGENTS\.md|FULL_SCALE_CODEBASE_AUDIT\.md|REPO_MEMORY_LEDGER\.md|EVERY_FILE_FUNCTION_CHECKLIST\.md))["'`]/giu;
  let match: RegExpExecArray | null;
  while ((match = quotedPathPattern.exec(source))) {
    if (!match[1]) continue;
    const normalizedPath = normalizeAuditPath(match[1]);
    if (/[${}*]/u.test(normalizedPath)) continue;
    const fullPath = join(root, normalizedPath);
    if (!existsSync(fullPath) || !statSync(fullPath).isFile()) continue;
    paths.push(normalizedPath);
  }
  return paths;
}

function readGitChangedFiles() {
  const git = spawnSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" });
  if (git.status !== 0 || typeof git.stdout !== "string") return [];

  return git.stdout
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const rawPath = line.slice(3).trim();
      if (rawPath.includes(" -> ")) {
        return rawPath.split(" -> ").pop() ?? rawPath;
      }
      return rawPath;
    })
    .map(normalizeAuditPath);
}

function readLedgerEntries() {
  const ledgerPath = join(root, AUDIT_RUNTIME_LEDGER_PATH);
  if (!existsSync(ledgerPath)) return [];
  return readFileSync(ledgerPath, "utf8")
    .split(/\r?\n/u)
    .map((line, index) => parseAuditRuntimeLedgerLine(line, index + 1).entry)
    .filter((entry): entry is AuditRuntimeLedgerEntry => Boolean(entry));
}

function writeSummary() {
  const summary = summarizeAuditRuntime(readLedgerEntries());
  const summaryPath = join(root, AUDIT_RUNTIME_SUMMARY_PATH);
  mkdirSync(dirname(summaryPath), { recursive: true });
  writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function appendLedgerEntry(entry: AuditRuntimeLedgerEntry) {
  const ledgerPath = join(root, AUDIT_RUNTIME_LEDGER_PATH);
  mkdirSync(dirname(ledgerPath), { recursive: true });
  appendFileSync(ledgerPath, `${serializeAuditRuntimeLedgerEntry(entry)}\n`);
}

function main() {
  let parsed: ParsedArgs;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`audit:run failed: ${(error as Error).message}`);
    process.exit(1);
  }

  if (!parsed.auditName) {
    console.error("audit:run failed: --audit <package-script-or-validator-path> is required.");
    process.exit(1);
  }

  const packageJson = readPackageJson();
  const scripts = packageJson.scripts ?? {};
  const startedAt = Date.now();
  const changedBefore = readGitChangedFiles();
  let resolved: ResolvedAuditCommand;

  try {
    resolved = resolveAuditCommand(parsed.auditName, scripts, parsed.passThroughArgs);
  } catch (error) {
    console.error(`audit:run failed: ${(error as Error).message}`);
    process.exit(1);
  }

  const forbiddenCommandsAttempted = detectForbiddenAuditCommands([
    resolved.auditName,
    resolved.terminalCommand,
    resolved.commandDefinition,
  ]);
  const inferredInspectedFiles = uniqueSorted([
    ...resolved.inspectedFiles,
    ...parsed.inspectedFiles,
    ...parsed.passThroughArgs.filter((value) => value.includes("/") || value.includes("\\")),
  ]);
  let exitCode = 0;
  let terminalCommands: string[] = [];

  if (forbiddenCommandsAttempted.length > 0) {
    exitCode = 1;
    console.error("audit:run blocked forbidden audit command:");
    for (const command of forbiddenCommandsAttempted) {
      console.error(`- ${command}`);
    }
  } else if (parsed.cacheHit) {
    console.log(`audit:run cache hit for ${resolved.auditName}; skipped terminal execution.`);
  } else {
    const gate = explainTerminalGate(resolved.terminalCommand, readAffectedAuditPlan(), {
      explicitOverride: parsed.allowUnplanned,
      criticalUncertainty: parsed.criticalUncertainty,
      overrideReason: parsed.terminalReason || parsed.triggerReason,
    });
    if (!gate.allowed) {
      console.error(`audit:run terminal gate blocked ${resolved.terminalCommand}: ${gate.reason}`);
      forbiddenCommandsAttempted.push(`terminal_gate:${resolved.terminalCommand}`);
      exitCode = 1;
    } else {
      console.log(`audit:run terminal gate allowed ${resolved.terminalCommand}: ${gate.reason}`);
      terminalCommands = [resolved.terminalCommand];
      const result = spawnSync(resolved.executable, resolved.args, {
        cwd: root,
        stdio: "inherit",
        shell: false,
      });
      if (result.error) {
        console.error(`audit:run command failed to start: ${result.error.message}`);
      }
      exitCode = result.status ?? 1;
    }
  }

  const endedAt = Date.now();
  const changedAfter = readGitChangedFiles();
  const findingsCount = parsed.findingsCount ?? (exitCode === 0 ? 0 : 1);
  const changedFiles = uniqueSorted([...changedBefore, ...changedAfter, ...parsed.changedFiles]);
  const resourceClass = parsed.resourceClass ?? detectAuditResourceClass(resolved.auditName, resolved.commandDefinition);
  const cacheKey = createAuditCacheKey({
    auditName: resolved.auditName,
    command: resolved.commandDefinition,
    changedFiles,
    inspectedFiles: inferredInspectedFiles,
  });
  const entry: AuditRuntimeLedgerEntry = {
    runId: createAuditRunId(resolved.auditName, startedAt),
    auditName: resolved.auditName,
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
    changedFiles,
    inspectedFiles: inferredInspectedFiles,
    terminalCommands,
    forbiddenCommandsAttempted,
    cacheKey,
    cacheHit: parsed.cacheHit,
    findingsCount,
    criticalCount: parsed.criticalCount,
    majorCount: parsed.majorCount,
    accuracyStatus: parsed.accuracyStatus,
    resourceClass,
    triggerReason: parsed.triggerReason,
  };

  appendLedgerEntry(entry);
  writeSummary();

  console.log(`audit:run recorded ${entry.auditName} in ${entry.durationMs}ms with ${entry.inspectedFiles.length} inspected files.`);
  process.exit(exitCode);
}

main();
