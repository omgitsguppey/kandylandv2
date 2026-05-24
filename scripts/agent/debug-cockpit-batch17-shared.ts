import fs from "node:fs";
import path from "node:path";

import { buildDebugCockpitBatch17RouteRuntimeReport, createBatch17RouteRuntimeFixture, validateDebugCockpitBatch17RouteRuntimeReport } from "../../src/lib/debug/debug-cockpit-batch17-route-runtime";
import { buildRouteRuntimeDisplayStatus } from "../../src/lib/debug/route-runtime-display-status";
import { buildRouteRuntimeCohortSummary, buildRouteRuntimeRollup } from "../../src/lib/debug/route-runtime-rollup-engine";

export function assertBatch17(condition: boolean, message: string, failures: string[]) {
  if (!condition) failures.push(message);
}

export function writeJson(filePath: string, value: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeMarkdown(filePath: string, lines: string[]) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

export function buildChatRouteCohortValidationReport() {
  const fixture = createBatch17RouteRuntimeFixture();
  const cohorts = buildRouteRuntimeCohortSummary(fixture.items, fixture.options);
  return {
    reportKey: "chat-route-cohort-runtime",
    generatedAtUtc: new Date().toISOString(),
    nativeChat: cohorts.chat_native,
    compatChat: cohorts.chat_compat,
    nativeNarrativeContradictionCount: cohorts.chat_native.narrativeContradictionCount,
    compatNarrativeContradictionCount: cohorts.chat_compat.narrativeContradictionCount,
    validationFailures: [] as string[],
  };
}

export function buildRouteRuntimeDisplayValidationReport() {
  const fixture = createBatch17RouteRuntimeFixture();
  const rollup = buildRouteRuntimeRollup(fixture.items, fixture.options);
  const display = buildRouteRuntimeDisplayStatus(rollup);
  return {
    reportKey: "route-runtime-display-cleanup",
    generatedAtUtc: new Date().toISOString(),
    rollup,
    display,
    validationFailures: [] as string[],
  };
}

export function buildFinalBatch17ValidationReport() {
  const report = buildDebugCockpitBatch17RouteRuntimeReport();
  return {
    reportKey: "debug-cockpit-batch17-route-runtime",
    ...report,
    validationFailures: validateDebugCockpitBatch17RouteRuntimeReport(report),
  };
}
