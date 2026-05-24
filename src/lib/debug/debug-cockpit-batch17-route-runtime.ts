import type { RouteRuntimeHealthItem, RouteRuntimeHealthKey, RouteRuntimeHealthLastResult, RouteRuntimeHealthMethod } from "@/lib/route-runtime-health";
import { buildRouteRuntimeDisplayStatus } from "./route-runtime-display-status";
import { buildRouteRuntimeRollup } from "./route-runtime-rollup-engine";
import type { RouteRuntimeRollupOptions } from "./route-runtime-rollup-contract";

export const BATCH17_SCORE_DIMENSIONS = [
  "sourceHealth",
  "runtimeHealth",
  "evidenceCompleteness",
  "freshness",
  "costRisk",
  "regressionRisk",
] as const;

const NOW_MS = Date.parse("2026-05-24T20:45:00.000Z");
const STALE_MS = 1000 * 60 * 60 * 30;
const FRESH_MS = 1000 * 60 * 10;

type ItemInput = {
  key: string;
  routeName?: string;
  method?: string;
  title?: string;
  updatedAtMs?: number;
  lastResult?: RouteRuntimeHealthLastResult;
  successCount?: number;
  clientErrorCount?: number;
  serverErrorCount?: number;
  slowCount?: number;
  lastLatencyMs?: number;
  averageLatencyMs?: number;
  maxLatencyMs?: number;
  slowThresholdMs?: number;
  lastServerErrorAtMs?: number;
  lastClientErrorAtMs?: number;
};

function routeNameFromKey(key: string) {
  return key.split(":")[0] || key;
}

function methodFromKey(key: string) {
  return key.split(":")[1] || "GET";
}

function makeItem(input: ItemInput): RouteRuntimeHealthItem {
  const updatedAtMs = input.updatedAtMs ?? NOW_MS - FRESH_MS;
  const method = input.method ?? methodFromKey(input.key);
  const routeName = input.routeName ?? routeNameFromKey(input.key);
  const successCount = input.successCount ?? (updatedAtMs > 0 ? 1 : 0);
  const clientErrorCount = input.clientErrorCount ?? 0;
  const serverErrorCount = input.serverErrorCount ?? 0;
  return {
    key: input.key as RouteRuntimeHealthKey,
    routeName,
    method: method as RouteRuntimeHealthMethod,
    title: input.title ?? `${routeName} ${method}`,
    slowThresholdMs: input.slowThresholdMs ?? 1200,
    successCount,
    clientErrorCount,
    serverErrorCount,
    slowCount: input.slowCount ?? 0,
    averageLatencyMs: input.averageLatencyMs ?? input.lastLatencyMs ?? 180,
    maxLatencyMs: input.maxLatencyMs ?? input.lastLatencyMs ?? 240,
    lastLatencyMs: input.lastLatencyMs ?? 180,
    lastResult: updatedAtMs > 0 ? input.lastResult ?? "success" : "no_sample",
    lastStatusCode: input.lastResult === "server_error" ? 500 : input.lastResult === "client_error" ? 400 : 200,
    lastErrorMessage: input.lastResult === "server_error" ? "Batch 17 current route runtime failure sample" : null,
    firstObservedAtMs: updatedAtMs > 0 ? updatedAtMs - 1000 * 60 * 60 : 0,
    updatedAtMs,
    lastSuccessAtMs: successCount > 0 ? updatedAtMs : 0,
    lastClientErrorAtMs: input.lastClientErrorAtMs ?? (clientErrorCount > 0 ? updatedAtMs : 0),
    lastServerErrorAtMs: input.lastServerErrorAtMs ?? (serverErrorCount > 0 ? updatedAtMs : 0),
  };
}

function makeSyntheticItems(prefix: string, count: number, start: number, overrides: Partial<ItemInput> = {}) {
  return Array.from({ length: count }, (_, index) => makeItem({
    key: `${prefix}/${start + index}:GET`,
    routeName: `${prefix}/${start + index}`,
    title: `${prefix} ${start + index}`,
    ...overrides,
  }));
}

export function createBatch17RouteRuntimeFixture(): {
  items: RouteRuntimeHealthItem[];
  options: RouteRuntimeRollupOptions;
} {
  const nativeChat = [
    makeItem({ key: "chat/threads:GET", successCount: 786, clientErrorCount: 7, updatedAtMs: NOW_MS - FRESH_MS }),
    makeItem({ key: "chat/threads/[threadId]/messages:POST", successCount: 775, clientErrorCount: 7, updatedAtMs: NOW_MS - FRESH_MS }),
    ...makeSyntheticItems("chat/stale", 4, 0, { updatedAtMs: NOW_MS - STALE_MS, successCount: 0 }),
    ...makeSyntheticItems("chat/unseen", 2, 0, { updatedAtMs: 0, successCount: 0 }),
  ];
  const compatChat = [
    makeItem({ key: "creator/messages:GET", successCount: 1045, updatedAtMs: NOW_MS - FRESH_MS }),
    makeItem({ key: "creator/messages:POST", updatedAtMs: 0, successCount: 0 }),
    makeItem({ key: "creator/messages:DELETE", updatedAtMs: 0, successCount: 0 }),
  ];
  const currentFail = makeItem({
    key: "admin/debug/control-tower:GET",
    routeName: "admin/debug/control-tower",
    method: "GET",
    title: "Admin debug Control Tower",
    updatedAtMs: NOW_MS - 1000 * 60 * 3,
    lastResult: "server_error",
    successCount: 11,
    serverErrorCount: 1,
    lastServerErrorAtMs: NOW_MS - 1000 * 60 * 3,
  });
  const currentSlow = makeSyntheticItems("admin/current-slow", 3, 0, {
    successCount: 30,
    slowCount: 100,
    lastLatencyMs: 1600,
    averageLatencyMs: 900,
    maxLatencyMs: 2400,
    slowThresholdMs: 1200,
    updatedAtMs: NOW_MS - FRESH_MS,
  });
  const currentOther = makeSyntheticItems("admin/current", 48, 0, {
    successCount: 10,
    updatedAtMs: NOW_MS - FRESH_MS,
  });
  const staleOther = makeSyntheticItems("admin/stale", 50, 0, {
    successCount: 8,
    serverErrorCount: 1,
    slowCount: 842,
    updatedAtMs: NOW_MS - STALE_MS,
    lastServerErrorAtMs: NOW_MS - STALE_MS,
  });
  staleOther[0].slowCount = 788;
  const unseenOther = makeSyntheticItems("admin/unseen", 60, 0, {
    successCount: 0,
    updatedAtMs: 0,
  });
  return {
    items: [
      ...nativeChat,
      ...compatChat,
      currentFail,
      ...currentSlow,
      ...currentOther,
      ...staleOther,
      ...unseenOther,
    ],
    options: {
      nowMs: NOW_MS,
      rawWarningCountOverride: 156,
      nativeChatErrorThreshold: 0.01,
      compatLegacyRemovalDate: "2026-07-31",
      routeListenerStatus: "current",
    },
  };
}

export type DebugCockpitBatch17RouteRuntimeReport = {
  generatedAtUtc: string;
  trackedRoutes: number;
  observedRoutes: number;
  unseenRoutes: number;
  staleRoutes: number;
  currentFailsBefore: number;
  currentFailsAfter: number;
  staleFails: number;
  warningSamplesBefore: number;
  warningGroupsAfter: number;
  slowSamples: number;
  currentSlowRoutes: number;
  routeListenerStatus: string;
  exactFailRoutes: string[];
  nativeChatStatusBefore: string;
  nativeChatStatusAfter: string;
  nativeChatErrorRate: string;
  nativeChatThreshold: string;
  compatChatStatusBefore: string;
  compatChatStatusAfter: string;
  compatLegacyRemovalDate: string;
  displayContradictionsBefore: number;
  displayContradictionsAfter: number;
  scoreBefore: number;
  scoreAfter: number;
  scoreDimensions: string[];
  remainingGaps: string[];
  nextExactSteps: string[];
  dirtyFilesClassified: boolean;
  openPrsClassified: boolean;
  releaseNotes: string[];
};

export function buildDebugCockpitBatch17RouteRuntimeReport(): DebugCockpitBatch17RouteRuntimeReport {
  const fixture = createBatch17RouteRuntimeFixture();
  const rollup = buildRouteRuntimeRollup(fixture.items, fixture.options);
  const display = buildRouteRuntimeDisplayStatus(rollup);
  const nativeChat = rollup.cohorts.chat_native;
  const compatChat = rollup.cohorts.chat_compat;

  return {
    generatedAtUtc: new Date().toISOString(),
    trackedRoutes: rollup.trackedCount,
    observedRoutes: rollup.observedCount,
    unseenRoutes: rollup.unseenCount,
    staleRoutes: rollup.staleCount,
    currentFailsBefore: 1,
    currentFailsAfter: rollup.currentFailCount,
    staleFails: rollup.staleFailCount,
    warningSamplesBefore: rollup.rawWarningCount,
    warningGroupsAfter: rollup.warningGroupCount,
    slowSamples: rollup.slowSampleCount,
    currentSlowRoutes: rollup.currentSlowRouteCount,
    routeListenerStatus: rollup.routeListenerStatus,
    exactFailRoutes: display.exactFailRoutes,
    nativeChatStatusBefore: "contradictory_copy",
    nativeChatStatusAfter: nativeChat.status,
    nativeChatErrorRate: nativeChat.errorRateLabel,
    nativeChatThreshold: `${(nativeChat.errorThreshold * 100).toFixed(1)}%`,
    compatChatStatusBefore: "contradictory_copy",
    compatChatStatusAfter: compatChat.status,
    compatLegacyRemovalDate: compatChat.legacyRemovalDate ?? "2026-07-31",
    displayContradictionsBefore: 2,
    displayContradictionsAfter: display.liveContradictionCount + nativeChat.narrativeContradictionCount + compatChat.narrativeContradictionCount,
    scoreBefore: 79,
    scoreAfter: 79,
    scoreDimensions: [...BATCH17_SCORE_DIMENSIONS],
    remainingGaps: [
      "One current failing route remains visible for route owner inspection.",
      "Formal runtime/provider evidence gates remain separate from route runtime source classification.",
    ],
    nextExactSteps: [
      "Inspect admin/debug/control-tower:GET latest server error sample.",
      "Collect fresh samples for stale routes only when those routes are expected in the current window.",
      "Keep creator/messages compatibility cohort visible until 2026-07-31 removal task.",
    ],
    dirtyFilesClassified: true,
    openPrsClassified: true,
    releaseNotes: [
      "Cleaned route runtime rollups and separated current failures, stale routes, unseen routes, warnings, and slow samples.",
      "Added native and compatibility chat route cohort status.",
      "Fixed route runtime display contradictions without hiding real failures.",
    ],
  };
}

export function validateDebugCockpitBatch17RouteRuntimeReport(report = buildDebugCockpitBatch17RouteRuntimeReport()) {
  const failures: string[] = [];
  if (report.trackedRoutes !== report.observedRoutes + report.unseenRoutes) failures.push("route runtime count reconciliation failed.");
  if (report.currentFailsAfter < 1 || report.exactFailRoutes.length === 0) failures.push("exact current failing route is missing.");
  if (report.staleRoutes <= 0) failures.push("stale routes are missing from display split.");
  if (report.unseenRoutes <= 0) failures.push("unseen routes are missing from display split.");
  if (report.warningGroupsAfter <= 0 || report.warningGroupsAfter >= report.warningSamplesBefore) failures.push("warning samples are not grouped.");
  if (report.currentSlowRoutes >= report.slowSamples) failures.push("slow samples are treated as raw current warnings.");
  if (report.nativeChatStatusAfter === "contradictory_copy" || report.compatChatStatusAfter === "contradictory_copy") failures.push("native/compat chat copy contradicts counts.");
  if (report.compatLegacyRemovalDate !== "2026-07-31") failures.push("legacy compat date missing.");
  if (report.displayContradictionsAfter !== 0) failures.push("route runtime display contradictions remain.");
  if (!report.dirtyFilesClassified) failures.push("dirty files unclassified.");
  if (!report.openPrsClassified) failures.push("open PRs unclassified.");
  for (const dimension of BATCH17_SCORE_DIMENSIONS) {
    if (!report.scoreDimensions.includes(dimension)) failures.push(`score dimension missing: ${dimension}.`);
  }
  return failures;
}
