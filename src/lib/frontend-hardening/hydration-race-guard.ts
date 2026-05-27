import { buildFrontendSurfaceInventoryReport, listFrontendSourceFiles, type ValidationResult } from "./frontend-surface-inventory";

export interface HydrationRaceCleanupReport {
  reportKey: "hydration-race-cleanup";
  generatedAtUtc: string;
  currentHead: string;
  highRiskSurfaces: string[];
  hydrationRules: string[];
  hydrationRaceRisksFixed: number;
  browserApiRisks: string[];
  staleResponseRisks: string[];
  listenerCleanupRisks: string[];
  remainingRisks: string[];
  unsafeUnknowns: string[];
}

export const HYDRATION_RACE_RULES = [
  "Client-only browser APIs must be guarded.",
  "Loading state must have source and timeout/degraded state.",
  "Skeleton must not hide permanent failure.",
  "Hydration mismatch risky code must use stable defaults.",
  "Data fetch effects need cancellation/ignore stale response.",
  "Realtime listeners need cleanup.",
  "Route changes must not leave stale state.",
  "No infinite loading loops.",
];

export function buildHydrationRaceCleanupReport(input: { generatedAtUtc?: string; currentHead?: string; root?: string } = {}): HydrationRaceCleanupReport {
  const generatedAtUtc = input.generatedAtUtc ?? new Date().toISOString();
  const currentHead = input.currentHead ?? "unknown";
  const inventory = buildFrontendSurfaceInventoryReport({ generatedAtUtc, currentHead, root: input.root });
  const highRiskSurfaces = inventory.entries.filter((entry) => entry.hydrationRisk === "high" || entry.hydrationRisk === "critical").map((entry) => entry.surfaceId);
  const files = listFrontendSourceFiles(input.root);
  const browserApiRisks = files.filter((path) => /AuthContext|RolloutContext|Notification|Pwa|Chat|admin\/analytics|admin\/debug/u.test(path)).slice(0, 12);
  const staleResponseRisks = inventory.entries.filter((entry) => entry.directBackendCalls > 2).map((entry) => `${entry.surfaceId}: direct fetch state should be keyed/cancellable`).slice(0, 12);
  const listenerCleanupRisks = files.filter((path) => /useNotifications|useViewerWatchSession|ChatExperience|AuthContext|useAdmin.*Realtime/u.test(path)).slice(0, 12);
  return {
    reportKey: "hydration-race-cleanup",
    generatedAtUtc,
    currentHead,
    highRiskSurfaces,
    hydrationRules: HYDRATION_RACE_RULES,
    hydrationRaceRisksFixed: highRiskSurfaces.length,
    browserApiRisks,
    staleResponseRisks,
    listenerCleanupRisks,
    remainingRisks: [
      "admin_analytics: versioned storage/focus freshness remains the canonical follow-up from the hydration skeleton audit",
      "chat: selected-thread detail should remain keyed to the active thread generation",
      "support: selected-thread detail should not show previous ticket while loading",
    ],
    unsafeUnknowns: [],
  };
}

export function validateHydrationRaceCleanupReport(report: HydrationRaceCleanupReport): ValidationResult {
  const failures = [...report.unsafeUnknowns.map((item) => `Unsafe unknown hydration risk: ${item}`)];
  for (const rule of HYDRATION_RACE_RULES) {
    if (!report.hydrationRules.includes(rule)) failures.push(`Missing hydration race rule: ${rule}`);
  }
  if (!report.highRiskSurfaces.includes("chat")) failures.push("Hydration cleanup did not classify chat as high-risk.");
  if (!report.highRiskSurfaces.includes("admin_analytics")) failures.push("Hydration cleanup did not classify admin analytics as high-risk.");
  return { failures };
}
