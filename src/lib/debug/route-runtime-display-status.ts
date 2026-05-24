import type { RouteRuntimeRollup } from "./route-runtime-rollup-contract";
import { explainRouteRuntimeStatus } from "./route-runtime-rollup-engine";

export type RouteRuntimeDisplayBadgeState = "current" | "stale" | "no_sample" | "warning" | "fail" | "info";

export type RouteRuntimeDisplayBadge = {
  label: string;
  value: number | string;
  state: RouteRuntimeDisplayBadgeState;
};

export type RouteRuntimeDisplayStatus = {
  displayState: "healthy" | "degraded" | "failed" | "unknown";
  badges: RouteRuntimeDisplayBadge[];
  exactFailRoutes: string[];
  nextAction: string;
  liveContradictionCount: number;
};

export function buildRouteRuntimeDisplayStatus(rollup: RouteRuntimeRollup): RouteRuntimeDisplayStatus {
  const exactFailRoutes = rollup.exactFailRoutes.map((route) => route.routeKey);
  const badges: RouteRuntimeDisplayBadge[] = [
    { label: `${rollup.currentFailCount} current fail`, value: rollup.currentFailCount, state: rollup.currentFailCount > 0 ? "fail" : "current" },
    { label: `${rollup.unseenCount} unseen tracked routes`, value: rollup.unseenCount, state: rollup.unseenCount > 0 ? "no_sample" : "current" },
    { label: `${rollup.staleCount} stale route samples`, value: rollup.staleCount, state: rollup.staleCount > 0 ? "stale" : "current" },
    { label: `${rollup.rawWarningCount} warning samples`, value: `${rollup.rawWarningCount} -> ${rollup.warningGroupCount} groups`, state: rollup.warningGroupCount > 0 ? "warning" : "current" },
    { label: `${rollup.slowSampleCount} slow samples`, value: `${rollup.currentSlowRouteCount} current slow routes`, state: "info" },
  ];

  return {
    displayState: rollup.status === "failed" ? "failed" : rollup.status === "degraded" ? "degraded" : rollup.status === "healthy" ? "healthy" : "unknown",
    badges,
    exactFailRoutes,
    nextAction: rollup.currentFailCount > 0
      ? `Inspect current failed route(s): ${exactFailRoutes.join(", ")}. Keep stale and unseen routes out of current failure count.`
      : explainRouteRuntimeStatus(rollup),
    liveContradictionCount: badges.filter((badge) => badge.state === "current" && /stale|unseen|fail|warn/iu.test(badge.label) && Number(badge.value) > 0).length,
  };
}
