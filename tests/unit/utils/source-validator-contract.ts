import { execFileSync, execSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import ts from "typescript";
import { captureTakeoverSourceState, startTakeoverEvidence, type TakeoverTaskInput } from "../../../scripts/agent/validate-agent-takeover-safety-check";

import { afterEach, expect } from "vitest";

type SourceValidatorReport = {
  status?: unknown;
  checks?: Record<string, unknown>;
  failures?: unknown;
  validationFailures?: unknown;
  [key: string]: unknown;
};

type FailurePattern = string | RegExp;

function matchesFailurePattern(value: string, pattern: FailurePattern) {
  if (typeof pattern === "string") return value === pattern;
  pattern.lastIndex = 0;
  return pattern.test(value);
}

export function expectNoFailuresOrOnlyNamedIsolation({
  failures,
  expectedIsolationFailures,
  allowedIsolationFailures = expectedIsolationFailures,
}: {
  failures: unknown[];
  expectedIsolationFailures: FailurePattern[];
  allowedIsolationFailures?: FailurePattern[];
}) {
  const normalizedFailures = failures.map(String);
  if (normalizedFailures.length === 0) return;

  expect(
    normalizedFailures.filter((failure) =>
      !allowedIsolationFailures.some((pattern) => matchesFailurePattern(failure, pattern))),
  ).toEqual([]);
  for (const pattern of expectedIsolationFailures) {
    expect(normalizedFailures.some((failure) => matchesFailurePattern(failure, pattern))).toBe(true);
  }
}

export function expectSourceValidatorWithDirtyTreeIsolation({
  artifact,
  allowedIsolationFailures,
  command,
  expectedIsolationFailure,
  isolationCheck,
}: {
  artifact: string;
  command: string;
  expectedIsolationFailure: FailurePattern | FailurePattern[];
  allowedIsolationFailures?: FailurePattern[];
  isolationCheck: string | string[];
}) {
  const commandStartedAt = Date.now();
  let commandFailure: unknown;
  try {
    execSync(command, {
      cwd: process.cwd(),
      stdio: "pipe",
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "core.autocrlf",
        GIT_CONFIG_VALUE_0: "false",
      },
    });
  } catch (error) {
    commandFailure = error;
  }

  const report = JSON.parse(readFileSync(join(process.cwd(), artifact), "utf8")) as SourceValidatorReport;
  expect(Date.parse(String(report.generatedAtUtc))).toBeGreaterThanOrEqual(commandStartedAt - 5_000);
  const falseChecks = Object.entries(report.checks ?? {})
    .filter(([, value]) => value === false)
    .map(([key]) => key);
  const falseTopLevelFields = Object.entries(report)
    .filter(([, value]) => value === false)
    .map(([key]) => key);
  const isolationChecks = Array.isArray(isolationCheck) ? isolationCheck : [isolationCheck];
  const expectedIsolationFailures = Array.isArray(expectedIsolationFailure)
    ? expectedIsolationFailure
    : [expectedIsolationFailure];

  if (!commandFailure) {
    expect(falseChecks).toEqual([]);
    expect(falseTopLevelFields).toEqual([]);
    expect(String(report.status)).toMatch(/^pass(?:ed)?$/u);
    return;
  }

  const failures = Array.isArray(report.validationFailures)
    ? report.validationFailures
    : Array.isArray(report.failures)
      ? report.failures
      : [];

  expect([...falseChecks].sort()).toEqual([...isolationChecks].sort());
  expect(falseTopLevelFields.every((key) => isolationChecks.includes(key))).toBe(true);
  expectNoFailuresOrOnlyNamedIsolation({
    failures,
    expectedIsolationFailures,
    allowedIsolationFailures,
  });
  expect(String(report.status)).toMatch(/^fail(?:ed)?$/u);
}

const taskFixtureRoots: string[] = [];
const taskFixturePrefix = "kd-source-validator-task-";

export function createSourceValidatorTaskFixture({ validator, report, allowedSourceFiles = [] }: {
  validator: string;
  report: string;
  allowedSourceFiles?: string[];
}) {
  const repository = process.cwd();
  const root = mkdtempSync(join(tmpdir(), taskFixturePrefix));
  taskFixtureRoots.push(root);
  const write = (file: string, value: string) => {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, value);
  };
  const read = (file: string) => readFileSync(join(root, file), "utf8");
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore", shell: false });
  const source = readFileSync(join(repository, validator), "utf8");
  const copied = new Set<string>();
  const visitedImports = new Set<string>();
  const resolveSource = (candidate: string) => [candidate, `${candidate}.ts`, `${candidate}.tsx`, `${candidate}.json`, join(candidate, "index.ts")].find(file => existsSync(file) && statSync(file).isFile());
  const copySource = (file: string, imports = true) => {
    const normalized = file.replaceAll("\\", "/");
    const original = join(repository, normalized);
    if (!copied.has(normalized)) {
      copied.add(normalized);
      mkdirSync(dirname(join(root, normalized)), { recursive: true });
      copyFileSync(original, join(root, normalized));
    }
    if (!imports || visitedImports.has(normalized) || !/\.(ts|tsx)$/u.test(normalized)) return;
    visitedImports.add(normalized);
    const tree = ts.createSourceFile(normalized, readFileSync(original, "utf8"), ts.ScriptTarget.Latest, true, normalized.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    for (const statement of tree.statements) {
      if ((!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) || !statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const name = statement.moduleSpecifier.text;
      const candidate = name.startsWith("@/") ? join(repository, "src", name.slice(2)) : name.startsWith(".") ? resolve(dirname(original), name) : null;
      if (!candidate) continue;
      const localPath = relative(repository, candidate).replaceAll("\\", "/");
      if (!localPath.startsWith("src/") && !localPath.startsWith("shared/runtime/")) continue;
      const resolved = resolveSource(candidate);
      if (resolved) copySource(relative(repository, resolved));
    }
  };
  for (const match of source.matchAll(/\bread\("([^"]+)"\)/gu)) copySource(match[1], false);
  const tree = ts.createSourceFile(validator, source, ts.ScriptTarget.Latest, true);
  for (const statement of tree.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || !statement.moduleSpecifier.text.startsWith("@/")) continue;
    const resolved = resolveSource(join(repository, "src", statement.moduleSpecifier.text.slice(2)));
    if (resolved) copySource(relative(repository, resolved));
  }
  const protectedFile = "src/lib/payment-fixture.ts";
  write(".gitignore", "output/\nagent/state/\ndocs/agent-truth/\n");
  write("AGENTS.md", "Isolated local source-validator authority.\n");
  write("fixture.ts", "export const value = 1;\n");
  write(protectedFile, "export const value = 1;\n");
  const tsconfig = join(root, "tsconfig.json");
  write("tsconfig.json", JSON.stringify({ extends: join(repository, "tsconfig.json"), compilerOptions: { paths: { "@/*": [join(root, "src", "*")] } } }));
  git("init", "--quiet"); git("config", "user.name", "Source fixture"); git("config", "user.email", "fixture@example.invalid");
  git("add", "."); git("commit", "--quiet", "-m", "Fixture baseline");
  write(protectedFile, "export const value = 2;\n");
  const input: TakeoverTaskInput = { taskKey: "source-validator-fixture", activePromptLane: "source-validator-caller", goal: "Validate task-bound source gates and preserve standalone incidents.", authority: "Isolated fixture only.", allowedFiles: ["fixture.ts", ...allowedSourceFiles], forbiddenFiles: [protectedFile], inFlightLanes: ["sole fixture"], unknowns: ["No runtime/provider evidence."], memoryWriteback: { required: false, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "Test fixture only." }, releaseNoteImpact: "None", justificationForNetAdditions: "Distinct inherited/undeclared CLI caller proof.", authorityFiles: ["AGENTS.md"] };
  const inputPath = "output/source-validator-fixture/input.json";
  write(inputPath, JSON.stringify(input));
  startTakeoverEvidence(inputPath, root);
  const run = (args: string[] = ["--task-input", inputPath]) => {
    const result = spawnSync(process.execPath, [createRequire(import.meta.url).resolve("tsx/cli"), "--tsconfig", tsconfig, join(repository, validator), ...args], { cwd: root, encoding: "utf8", timeout: 30_000, env: { ...process.env, ALLOW_GH_PR_LIST: "0", NODE_PATH: [join(repository, "node_modules"), process.env.NODE_PATH].filter(Boolean).join(delimiter), GIT_CONFIG_COUNT: "1", GIT_CONFIG_KEY_0: "core.autocrlf", GIT_CONFIG_VALUE_0: "false" } });
    return { ...result, output: result.stdout + result.stderr };
  };
  return { root, write, read, git, run, protectedFile, report, sourceFiles: [...copied].sort(), fingerprint: () => captureTakeoverSourceState(root).sourceFingerprint };
}

afterEach(() => {
  for (const root of taskFixtureRoots.splice(0)) {
    const target = resolve(root);
    if (!target.startsWith(join(resolve(tmpdir()), taskFixturePrefix))) throw new Error("Unexpected source-validator fixture cleanup target.");
    rmSync(target, { recursive: true, force: true });
  }
});
