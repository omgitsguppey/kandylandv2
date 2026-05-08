export const GENERATED_REPORT_DEFAULT_STALE_HOURS = 24;

export const GENERATED_REPORT_AUTHORITY_STATE_PATH =
  "agent/state/generated-report-authority.generated.json" as const;

export const GENERATED_REPORT_SCAN_ROOTS = [
  "agent/state",
  "agent/index",
  "agent/context",
] as const;

export const GENERATED_REPORT_RUNTIME_FORBIDDEN_ROOTS = [
  "src/app",
  "src/components",
  "src/lib/server",
] as const;

export const GENERATED_REPORT_FRESHNESS_STATES = [
  "fresh",
  "stale",
  "unknown",
] as const;

export type GeneratedReportFreshness = (typeof GENERATED_REPORT_FRESHNESS_STATES)[number];

export type GeneratedReportMetadataSource =
  | "embedded"
  | "filesystem_fallback"
  | "authority_manifest";

export function isGeneratedReportPath(repoPath: string) {
  const normalized = repoPath.replace(/\\/gu, "/");

  if (normalized.startsWith("agent/state/")) {
    return normalized.endsWith(".generated.json");
  }

  if (normalized.startsWith("agent/index/")) {
    return normalized.endsWith(".json");
  }

  if (normalized.startsWith("agent/context/")) {
    return normalized.endsWith(".generated.json");
  }

  return false;
}

export function deriveGeneratedReportFreshness(input: {
  generatedAt?: string | null;
  nowMs?: number;
  staleAfterHours?: number;
}): GeneratedReportFreshness {
  const generatedAt = input.generatedAt?.trim();
  if (!generatedAt) {
    return "unknown";
  }

  const generatedAtMs = Date.parse(generatedAt);
  if (!Number.isFinite(generatedAtMs)) {
    return "unknown";
  }

  const staleAfterHours = input.staleAfterHours ?? GENERATED_REPORT_DEFAULT_STALE_HOURS;
  const nowMs = input.nowMs ?? Date.now();
  const staleAfterMs = staleAfterHours * 60 * 60 * 1000;

  return nowMs - generatedAtMs > staleAfterMs ? "stale" : "fresh";
}
