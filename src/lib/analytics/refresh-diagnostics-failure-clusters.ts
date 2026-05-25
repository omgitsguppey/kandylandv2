export type RefreshDiagnosticsRouteAttribution = "known" | "unknown" | "inferred" | "missing";

export type RefreshDiagnosticsFailureClusterInput = {
  source: string;
  reasonCode?: string;
  errorName?: string;
  count: number;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  affectedRoute?: string;
  route?: string;
  suggestedAction?: string;
  current?: boolean;
};

export type RefreshDiagnosticsFailureCluster = {
  clusterId: string;
  source: string;
  route: string | null;
  errorName: string;
  reasonCode: string;
  count: number;
  firstSeenAtUtc: string;
  lastSeenAtUtc: string;
  severity: "info" | "warning" | "error" | "blocking";
  current: boolean;
  routeAttribution: RefreshDiagnosticsRouteAttribution;
  likelyOwner: string;
  nextAction: string;
  suggestedAction: string;
  affectedRoute?: string;
  blocksTelemetryParity: boolean;
};

function parseTime(value: string | undefined) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRoute(rawRoute?: string) {
  const route = rawRoute?.trim();
  if (!route || /^route unknown$/iu.test(route)) {
    return { route: null, attribution: "unknown" as const };
  }

  if (/Analytics\.IngestIdentified/iu.test(route)) {
    return { route: "analytics/ingest-identified", attribution: "inferred" as const };
  }

  return { route, attribution: "known" as const };
}

function ownerFor(input: { route: string | null; attribution: RefreshDiagnosticsRouteAttribution; errorName: string }) {
  if (input.route === "analytics/ingest-identified" || /Analytics\.IngestIdentified/iu.test(input.errorName)) {
    return "analytics ingest identified";
  }
  if (input.attribution === "unknown" || input.attribution === "missing") {
    return "analytics diagnostics attribution";
  }
  if (input.route?.includes("analytics")) {
    return "analytics pipeline route";
  }
  return "server diagnostics";
}

function actionFor(input: { route: string | null; attribution: RefreshDiagnosticsRouteAttribution; errorName: string }) {
  if (input.route === "analytics/ingest-identified") {
    return "Inspect Analytics.IngestIdentified diagnostics, keep parity blocked while current UnknownError clusters remain, and verify the identified ingest route returns typed non-retryable domain errors for expected failures.";
  }
  if (input.attribution === "unknown" || input.attribution === "missing") {
    return "Repair analytics diagnostics route attribution so the failing route owner is known before telemetry parity can be promoted.";
  }
  return `Inspect ${input.route} diagnostics and clear current ${input.errorName} failures before promoting telemetry parity.`;
}

export function buildRefreshDiagnosticsFailureClusters(input: {
  generatedAtUtc?: string;
  currentWindowMs?: number;
  clusters: RefreshDiagnosticsFailureClusterInput[];
}): RefreshDiagnosticsFailureCluster[] {
  const generatedAtMs = parseTime(input.generatedAtUtc) || Date.now();
  const currentWindowMs = input.currentWindowMs ?? 24 * 60 * 60 * 1000;

  return input.clusters
    .map((cluster) => {
      const errorName = cluster.errorName || cluster.reasonCode || "unknown_error";
      const normalized = normalizeRoute(cluster.affectedRoute || cluster.route);
      const lastSeenAtMs = parseTime(cluster.lastSeenAtUtc);
      const current = cluster.current ?? (lastSeenAtMs > 0 && generatedAtMs - lastSeenAtMs <= currentWindowMs);
      const likelyOwner = ownerFor({
        route: normalized.route,
        attribution: normalized.attribution,
        errorName: `${errorName} ${cluster.affectedRoute ?? ""}`,
      });
      const nextAction = actionFor({
        route: normalized.route,
        attribution: normalized.attribution,
        errorName,
      });
      const routeKey = normalized.route ?? "route_unknown";

      return {
        clusterId: [cluster.source, errorName, routeKey].join(":"),
        source: cluster.source,
        route: normalized.route,
        errorName,
        reasonCode: errorName,
        count: cluster.count,
        firstSeenAtUtc: cluster.firstSeenAtUtc,
        lastSeenAtUtc: cluster.lastSeenAtUtc,
        severity: current ? "blocking" as const : "error" as const,
        current,
        routeAttribution: normalized.route ? normalized.attribution : "unknown" as const,
        likelyOwner,
        nextAction,
        suggestedAction: cluster.suggestedAction || nextAction,
        affectedRoute: normalized.route ?? undefined,
        blocksTelemetryParity: current && cluster.count > 0,
      };
    })
    .sort((left, right) => Number(right.current) - Number(left.current) || right.count - left.count || parseTime(right.lastSeenAtUtc) - parseTime(left.lastSeenAtUtc));
}
