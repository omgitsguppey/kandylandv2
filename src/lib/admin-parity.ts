export const ADMIN_SURFACE_STATES = [
  "loading",
  "live",
  "degraded",
  "fallback",
  "stale",
  "unavailable",
  "failed",
] as const;

export type AdminSurfaceState = (typeof ADMIN_SURFACE_STATES)[number];

export type AdminVerificationState =
  | "canonical"
  | "degraded"
  | "fallback"
  | "stale"
  | "unavailable"
  | "failed";

export type AdminVerificationSourceRole =
  | "canonical"
  | "fallback"
  | "derived"
  | "debug";

export interface AdminVerificationSource {
  key: string;
  label: string;
  role: AdminVerificationSourceRole;
  status?: AdminSurfaceState;
  freshnessTimestamp?: number | null;
  lastSuccessfulAt?: number | null;
  detail?: string | null;
}

export interface AdminModuleVerification {
  module: string;
  status: AdminSurfaceState;
  verificationState: AdminVerificationState;
  canonicalSource: string;
  fallbackSource: string | null;
  freshnessTimestamp: number | null;
  freshnessMs: number | null;
  verifiedAt: number;
  lastSuccessfulLiveUpdate: number | null;
  degradedReason: string | null;
  countComposition?: Record<string, number>;
  dedupeKey?: string | null;
  clusteringSignature?: string | null;
  sources: AdminVerificationSource[];
}

type BuildAdminModuleVerificationInput = {
  module: string;
  canonicalSource: string;
  fallbackSource?: string | null;
  verifiedAt?: number;
  freshnessTimestamp?: number | null;
  lastSuccessfulLiveUpdate?: number | null;
  degradedReason?: string | null;
  staleAfterMs?: number;
  status?: AdminSurfaceState;
  countComposition?: Record<string, number>;
  dedupeKey?: string | null;
  clusteringSignature?: string | null;
  sources?: AdminVerificationSource[];
};

export function isAdminSurfaceState(value: unknown): value is AdminSurfaceState {
  return typeof value === "string" && (ADMIN_SURFACE_STATES as readonly string[]).includes(value);
}

export function coerceAdminSurfaceState(value: unknown): AdminSurfaceState {
  if (isAdminSurfaceState(value)) {
    return value;
  }

  if (value === "loading" || value === "waiting" || value === "pending" || value === "hydrating" || value === "connecting") {
    return "loading";
  }

  if (value === "partial" || value === "warn") {
    return "degraded";
  }

  if (value === "healthy" || value === "fresh" || value === "realtime") {
    return "live";
  }

  if (value === "polled" || value === "cached") {
    return "fallback";
  }

  if (value === "unknown" || value === "unseen") {
    return "unavailable";
  }

  return "unavailable";
}

export function formatAdminSurfaceStateLabel(state: AdminSurfaceState): string {
  return `[${state}]`;
}

export const ADMIN_SURFACE_STATE_DETAIL: Record<AdminSurfaceState, string> = {
  loading: "Canonical source request is still hydrating.",
  live: "Canonical source is current.",
  degraded: "Canonical source is connected but incomplete.",
  fallback: "Primary source failed or is absent; secondary data is displayed.",
  stale: "Last verified data is older than the allowed freshness window.",
  unavailable: "No verified source snapshot is available yet.",
  failed: "Data could not be loaded.",
};

export function resolveAdminSurfaceState(input: {
  hasCanonical: boolean;
  hasFallback: boolean;
  freshnessTimestamp?: number | null;
  verifiedAt?: number;
  staleAfterMs?: number;
  degradedReason?: string | null;
  requestedState?: AdminSurfaceState;
}): AdminSurfaceState {
  if (input.requestedState) {
    return input.requestedState;
  }

  if (!input.hasCanonical && !input.hasFallback) {
    return "unavailable";
  }

  if (input.degradedReason) {
    return input.hasCanonical ? "degraded" : input.hasFallback ? "fallback" : "failed";
  }

  const verifiedAt = input.verifiedAt ?? Date.now();
  const freshnessTimestamp = input.freshnessTimestamp ?? null;
  const freshnessMs = freshnessTimestamp && freshnessTimestamp > 0
    ? Math.max(0, verifiedAt - freshnessTimestamp)
    : null;
  const staleAfterMs = input.staleAfterMs ?? 5 * 60 * 1000;

  if (freshnessMs !== null && freshnessMs > staleAfterMs) {
    return input.hasCanonical ? "stale" : input.hasFallback ? "fallback" : "failed";
  }

  if (!input.hasCanonical && input.hasFallback) {
    return "fallback";
  }

  return "live";
}

export function buildAdminModuleVerification(
  input: BuildAdminModuleVerificationInput,
): AdminModuleVerification {
  const verifiedAt = input.verifiedAt ?? Date.now();
  const freshnessTimestamp = input.freshnessTimestamp ?? input.lastSuccessfulLiveUpdate ?? null;
  const freshnessMs = freshnessTimestamp && freshnessTimestamp > 0
    ? Math.max(0, verifiedAt - freshnessTimestamp)
    : null;
  const sources = input.sources ?? [
    {
      key: input.canonicalSource,
      label: input.canonicalSource,
      role: "canonical",
      status: "live",
      freshnessTimestamp,
      lastSuccessfulAt: input.lastSuccessfulLiveUpdate ?? freshnessTimestamp,
    },
    ...(input.fallbackSource
      ? [{
          key: input.fallbackSource,
          label: input.fallbackSource,
          role: "fallback" as const,
        }]
      : []),
  ];
  const hasCanonical = sources.some((source) => source.role === "canonical");
  const hasFallback = sources.some((source) => source.role === "fallback");
  const status = resolveAdminSurfaceState({
    hasCanonical,
    hasFallback,
    freshnessTimestamp,
    verifiedAt,
    staleAfterMs: input.staleAfterMs,
    degradedReason: input.degradedReason,
    requestedState: input.status,
  });

  const verificationState: AdminVerificationState =
    status === "loading" ? "unavailable"
      : status === "live" ? "canonical"
      : status === "degraded" ? "degraded"
      : status === "fallback" ? "fallback"
      : status === "stale" ? "stale"
      : status === "failed" ? "failed"
      : "unavailable";

  const verification = {
    module: input.module,
    status,
    verificationState,
    canonicalSource: input.canonicalSource,
    fallbackSource: input.fallbackSource ?? null,
    freshnessTimestamp,
    freshnessMs,
    verifiedAt,
    lastSuccessfulLiveUpdate: input.lastSuccessfulLiveUpdate ?? freshnessTimestamp,
    degradedReason: input.degradedReason ?? null,
    countComposition: input.countComposition,
    dedupeKey: input.dedupeKey ?? null,
    clusteringSignature: input.clusteringSignature ?? null,
    sources: sources.map((source) => ({
      ...source,
      status: source.status ? coerceAdminSurfaceState(source.status) : undefined,
    })),
  } satisfies AdminModuleVerification;

  assertAdminModuleVerification(verification);
  return verification;
}

export function assertAdminModuleVerification(
  verification: AdminModuleVerification,
): void {
  if (!verification.module.trim()) {
    throw new Error("Admin module verification requires a module key.");
  }

  if (!verification.canonicalSource.trim()) {
    throw new Error(`Admin module ${verification.module} is missing a canonical source.`);
  }

  if (verification.status === "live" && !verification.sources.some((source) => source.role === "canonical")) {
    throw new Error(`Admin module ${verification.module} cannot claim live status without a canonical source.`);
  }

  if (verification.status === "fallback" && !verification.fallbackSource) {
    throw new Error(`Admin module ${verification.module} cannot claim fallback status without a fallback source.`);
  }

  if (verification.status === "failed" && !verification.degradedReason) {
    throw new Error(`Admin module ${verification.module} must include a degraded reason when failed.`);
  }
}
