import { writeJson } from "./admin-hot-cache-heartbeat-shared";
import { ADMIN_HEARTBEAT_INTERVAL_SECONDS, buildAdminHeartbeatRecord, classifyAdminHeartbeatEvidence } from "../../src/lib/admin/admin-heartbeat-contract";

const sample = buildAdminHeartbeatRecord({
  domain: "admin_overview",
  snapshotId: "admin_overview_snapshot",
  startedAtMs: Date.parse("2026-05-25T10:00:00.000Z"),
  completedAtMs: Date.parse("2026-05-25T10:00:00.500Z"),
  status: "completed",
  sourceCounts: { snapshotDocs: 1, heartbeatDocs: 1 },
  costEstimate: { readOperations: 2, writeOperations: 1, providerCalls: 0 },
});

const failures: string[] = [];
if (ADMIN_HEARTBEAT_INTERVAL_SECONDS < 3600) failures.push("Heartbeat interval must be at least 3600 seconds.");
if (!sample.startedAtUtc || !sample.nextDueAtUtc) failures.push("Heartbeat must include generatedAt-compatible startedAt/nextDueAt.");
if (sample.durationMs === null) failures.push("Heartbeat must report duration.");
if (!sample.costEstimate || typeof sample.costEstimate.readOperations !== "number") failures.push("Heartbeat must report cost estimate.");
if (Object.keys(sample.sourceCounts).length === 0) failures.push("Heartbeat must report source counts.");
if (classifyAdminHeartbeatEvidence({ heartbeat: null, nowMs: Date.now() }) !== "heartbeat_missing") failures.push("Missing heartbeat must not be healthy.");

writeJson("agent/state/admin-heartbeat-contract.generated.json", {
  status: failures.length === 0 ? "passed" : "failed",
  heartbeatCadenceSeconds: ADMIN_HEARTBEAT_INTERVAL_SECONDS,
  sample,
  missingHeartbeatState: "heartbeat_missing",
});

if (failures.length > 0) {
  console.error("Admin heartbeat contract validation failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Admin heartbeat contract OK.");
