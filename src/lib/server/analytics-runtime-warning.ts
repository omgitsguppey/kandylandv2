import "server-only";

import { recordRuntimeWarning } from "@/lib/server/runtime-warning-store";

function buildIssueSample(issues: string[]) {
  return issues
    .filter((issue) => issue.trim().length > 0)
    .slice(0, 5);
}

export async function recordAnalyticsRuntimeWarning(input: {
  surface: string;
  routeName: string;
  truthLabel?: string | null;
  sourceLabel?: string | null;
  issues?: string[];
  moduleKey?: string | null;
}) {
  const issues = buildIssueSample(input.issues ?? []);
  const truthLabel = input.truthLabel?.trim() || "unknown";
  const sourceLabel = input.sourceLabel?.trim() || "unknown";
  const hasIssues = issues.length > 0;
  const degradedTruth = new Set(["fallback", "partial", "estimated", "stale", "failed"]);

  if (!hasIssues && !degradedTruth.has(truthLabel)) {
    return;
  }

  const status = truthLabel === "failed"
    ? "failed"
    : truthLabel === "fallback" || truthLabel === "estimated" || truthLabel === "partial"
      ? "fallback"
      : "degraded";

  await recordRuntimeWarning({
    code: "analytics_truth_degraded",
    severity: status === "failed" ? "error" : "warn",
    executionLayer: "next_route",
    status,
    surface: input.surface,
    moduleKey: input.moduleKey ?? "analytics",
    detail: {
      routeName: input.routeName,
      truthLabel,
      sourceLabel,
      issueCount: issues.length,
      issues,
    },
  });
}
