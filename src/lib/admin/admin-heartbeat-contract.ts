import { ADMIN_HOT_CACHE_TTL_SECONDS, type AdminHotCacheSnapshotId } from "@/lib/admin/admin-hot-cache-contract";

export const ADMIN_HEARTBEAT_INTERVAL_SECONDS = 60 * 60;
export const ADMIN_HEARTBEAT_INTERVAL_MS = ADMIN_HEARTBEAT_INTERVAL_SECONDS * 1000;

export type AdminHeartbeatStatus =
  | "started"
  | "completed"
  | "partial"
  | "failed"
  | "skipped";

export type AdminHeartbeatRecord = {
  heartbeatId: string;
  domain: string;
  snapshotId: AdminHotCacheSnapshotId;
  startedAtUtc: string;
  completedAtUtc: string | null;
  durationMs: number | null;
  status: AdminHeartbeatStatus;
  sourceCounts: Record<string, number>;
  warningCount: number;
  errorCount: number;
  costEstimate: {
    readOperations: number;
    writeOperations: number;
    providerCalls: number;
    notes: string[];
  };
  nextDueAtUtc: string;
};

export type AdminHeartbeatEvidenceState =
  | "heartbeat_current"
  | "heartbeat_due"
  | "heartbeat_missing"
  | "heartbeat_failed";

export function buildAdminHeartbeatId(snapshotId: AdminHotCacheSnapshotId, startedAtUtc: string) {
  return `${snapshotId}:${startedAtUtc}`;
}

export function buildAdminHeartbeatRecord(input: {
  domain: string;
  snapshotId: AdminHotCacheSnapshotId;
  startedAtMs: number;
  completedAtMs?: number | null;
  status: AdminHeartbeatStatus;
  sourceCounts?: Record<string, number>;
  warningCount?: number;
  errorCount?: number;
  costEstimate?: Partial<AdminHeartbeatRecord["costEstimate"]>;
}): AdminHeartbeatRecord {
  const completedAtMs = input.completedAtMs ?? null;
  const startedAtUtc = new Date(input.startedAtMs).toISOString();
  const completedAtUtc = completedAtMs ? new Date(completedAtMs).toISOString() : null;
  const nextDueAtUtc = new Date(input.startedAtMs + ADMIN_HEARTBEAT_INTERVAL_MS).toISOString();

  return {
    heartbeatId: buildAdminHeartbeatId(input.snapshotId, startedAtUtc),
    domain: input.domain,
    snapshotId: input.snapshotId,
    startedAtUtc,
    completedAtUtc,
    durationMs: completedAtMs ? Math.max(0, completedAtMs - input.startedAtMs) : null,
    status: input.status,
    sourceCounts: input.sourceCounts ?? {},
    warningCount: input.warningCount ?? 0,
    errorCount: input.errorCount ?? 0,
    costEstimate: {
      readOperations: input.costEstimate?.readOperations ?? 0,
      writeOperations: input.costEstimate?.writeOperations ?? 0,
      providerCalls: input.costEstimate?.providerCalls ?? 0,
      notes: input.costEstimate?.notes ?? [],
    },
    nextDueAtUtc,
  };
}

export function classifyAdminHeartbeatEvidence(input: {
  heartbeat: Pick<AdminHeartbeatRecord, "status" | "nextDueAtUtc"> | null;
  nowMs: number;
}): AdminHeartbeatEvidenceState {
  if (!input.heartbeat) return "heartbeat_missing";
  if (input.heartbeat.status === "failed") return "heartbeat_failed";
  const dueMs = Date.parse(input.heartbeat.nextDueAtUtc);
  if (!Number.isFinite(dueMs)) return "heartbeat_missing";
  return input.nowMs > dueMs + ADMIN_HOT_CACHE_TTL_SECONDS * 1000 ? "heartbeat_due" : "heartbeat_current";
}
