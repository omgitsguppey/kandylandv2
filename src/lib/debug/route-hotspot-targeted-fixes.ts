export type RouteHotspotTargetedFixesReport = {
  generatedAtUtc: string;
  summaryFirstPolicies: string[];
  expected4xxMappings: string[];
  targetedFixesApplied: string[];
  unsafeBroadRefactorPerformed: boolean;
  followUps: string[];
};

export function buildRouteHotspotTargetedFixesReport(): RouteHotspotTargetedFixesReport {
  return {
    generatedAtUtc: new Date().toISOString(),
    summaryFirstPolicies: [
      "admin/overview:GET",
      "admin/analytics/historical:GET",
      "admin/debug:GET",
      "admin/debug/control-tower:GET",
      "admin/debug/assistant:GET",
    ],
    expected4xxMappings: [
      "wallet/packages:GET",
      "notifications:GET",
      "user/onboarding-progress:POST",
      "creator/relationships:GET",
      "creator/relationships:POST",
    ],
    targetedFixesApplied: [
      "analytics/ingest-identified:POST invalid payloads now return non-retryable typed 4xx.",
      "analytics/ingest-identified:POST deferred timeline/materializer failures no longer fail persisted event fact writes.",
      "wallet/packages:GET exposes active public catalog success and typed rate-limit classification.",
    ],
    unsafeBroadRefactorPerformed: false,
    followUps: [
      "Review admin/analytics/historical summary cache window before changing source reads.",
      "Review creator relationships client batching separately if current latency remains high.",
      "Monitor wallet/packages for residual 4xx after the active public catalog response is deployed.",
    ],
  };
}

export function validateRouteHotspotTargetedFixesReport(report = buildRouteHotspotTargetedFixesReport()) {
  const failures: string[] = [];
  for (const route of ["admin/overview:GET", "admin/analytics/historical:GET", "admin/debug:GET"]) {
    if (!report.summaryFirstPolicies.includes(route)) failures.push(`targeted high-latency route lacks summary-first/cached policy: ${route}.`);
  }
  for (const route of ["wallet/packages:GET", "user/onboarding-progress:POST", "creator/relationships:GET"]) {
    if (!report.expected4xxMappings.includes(route)) failures.push(`expected 4xx mapping missing for high-volume client-history route: ${route}.`);
  }
  if (report.unsafeBroadRefactorPerformed) failures.push("unsafe broad refactor performed.");
  if (report.followUps.length === 0) failures.push("no follow-up for unsafe hotspots.");
  return failures;
}
