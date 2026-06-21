import fs from "node:fs";
import path from "node:path";

import { buildDebugCockpitBatch17RouteRuntimeReport, createBatch17RouteRuntimeFixture, validateDebugCockpitBatch17RouteRuntimeReport } from "../../src/lib/debug/debug-cockpit-batch17-route-runtime";
import { buildRouteRuntimeDisplayStatus } from "../../src/lib/debug/route-runtime-display-status";
import { buildRouteRuntimeCohortSummary, buildRouteRuntimeRollup } from "../../src/lib/debug/route-runtime-rollup-engine";
import type { RouteRuntimeRollup, RouteRuntimeRouteClassification } from "../../src/lib/debug/route-runtime-rollup-contract";

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
    rollup: compactRouteRuntimeRollup(rollup),
    display,
    validationFailures: [] as string[],
  };
}

function rankRouteRuntimeRecord(record: RouteRuntimeRouteClassification) {
  if (record.failureIsCurrent) return 0;
  if (record.warningIsCurrent) return 1;
  if (record.slowIsCurrent) return 2;
  if (record.observedState === "observed_stale") return 3;
  if (record.observedState.startsWith("unseen")) return 4;
  return 5;
}

export function compactRouteRuntimeRollup(rollup: RouteRuntimeRollup, recordsCap = 24) {
  const selected = new Map<string, RouteRuntimeRouteClassification>();
  for (const record of rollup.exactFailRoutes) {
    selected.set(record.routeKey, record);
  }
  for (const record of [...rollup.records].sort((left, right) =>
    rankRouteRuntimeRecord(left) - rankRouteRuntimeRecord(right)
    || right.scoreImpact - left.scoreImpact
    || right.sampleCounts.total - left.sampleCounts.total
    || left.routeKey.localeCompare(right.routeKey)
  )) {
    if (selected.size >= recordsCap) break;
    selected.set(record.routeKey, record);
  }

  const records = Array.from(selected.values());
  return {
    ...rollup,
    records,
    recordsTotalCount: rollup.records.length,
    recordsEmittedCount: records.length,
    recordsOmittedCount: Math.max(0, rollup.records.length - records.length),
    recordsCapReason: "full route records are validated in memory; generated artifact keeps current failures plus top actionable samples",
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
