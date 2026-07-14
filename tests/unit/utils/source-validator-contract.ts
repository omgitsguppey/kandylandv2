import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { expect } from "vitest";

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
