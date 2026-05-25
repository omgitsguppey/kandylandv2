import { describe, expect, it } from "vitest";

import {
  ADMIN_HEARTBEAT_INTERVAL_SECONDS,
  buildAdminHeartbeatRecord,
  classifyAdminHeartbeatEvidence,
} from "@/lib/admin/admin-heartbeat-contract";

describe("admin heartbeat contract", () => {
  it("uses an hourly default cadence with generatedAt-compatible next due evidence", () => {
    const startedAtMs = Date.parse("2026-05-25T10:00:00.000Z");
    const record = buildAdminHeartbeatRecord({
      domain: "admin_overview",
      snapshotId: "admin_overview_snapshot",
      startedAtMs,
      completedAtMs: startedAtMs + 250,
      status: "completed",
      sourceCounts: { snapshotDocs: 1 },
      costEstimate: { readOperations: 2, writeOperations: 1 },
    });

    expect(ADMIN_HEARTBEAT_INTERVAL_SECONDS).toBe(3600);
    expect(record.startedAtUtc).toBe("2026-05-25T10:00:00.000Z");
    expect(record.completedAtUtc).toBe("2026-05-25T10:00:00.250Z");
    expect(record.durationMs).toBe(250);
    expect(record.nextDueAtUtc).toBe("2026-05-25T11:00:00.000Z");
    expect(record.costEstimate.readOperations).toBe(2);
    expect(record.sourceCounts.snapshotDocs).toBe(1);
  });

  it("does not classify a missing heartbeat as healthy", () => {
    expect(classifyAdminHeartbeatEvidence({ heartbeat: null, nowMs: Date.now() })).toBe("heartbeat_missing");
  });
});
