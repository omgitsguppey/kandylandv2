import "server-only";

export const ADMIN_DEBUG_DEFAULT_SECTION = "summary";
export const ADMIN_DEBUG_INITIAL_LOAD_COST_GUARD = "debug_cost_reduced_initial_summary";
export const ADMIN_DEBUG_QUEUE_HEARTBEAT_LIMIT = 25;
export const ADMIN_DEBUG_INITIAL_LOAD_CACHE_TTL_MS = 30_000;

export function readAdminDebugSummaryPayloadStatus() {
  return {
    defaultSection: ADMIN_DEBUG_DEFAULT_SECTION,
    truthState: "deferred" as const,
  };
}
