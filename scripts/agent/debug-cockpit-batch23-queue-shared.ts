import fs from "node:fs";
import path from "node:path";

import { classifyDispatchOutcomeLane } from "../../src/lib/debug/dispatch-outcome-lane-status";
import { buildDebugCockpitBatch23QueueContinuityReport, validateDebugCockpitBatch23QueueContinuityReport } from "../../src/lib/debug/debug-cockpit-batch23-queue-continuity";
import { classifyLegacyQueueAdapterUsage } from "../../src/lib/debug/legacy-queue-adapter-policy";
import { buildQueueRuntimeContinuity } from "../../src/lib/debug/queue-runtime-continuity-engine";
import { buildQueueHeartbeatRecord, QUEUE_HEARTBEAT_INTEGRATION_POINTS } from "../../src/lib/server/queue-heartbeat";

type Report = Record<string, unknown>;

const NOW_MS = Date.parse("2026-05-24T18:00:00.000Z");

function readText(filePath: string) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function writeJson(filePath: string, value: unknown) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeMarkdown(filePath: string, lines: string[]) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function pushIf(condition: boolean, failures: string[], message: string) {
    if (!condition) failures.push(message);
}

function runValidation(reportKey: string, report: Report, failures: string[]) {
    const generatedAtUtc = new Date().toISOString();
    const result = {
        reportKey,
        generatedAtUtc,
        ...report,
        validationFailures: failures,
    };
    writeJson(`agent/state/${reportKey}.generated.json`, result);
    writeMarkdown(`docs/agent-truth/${reportKey}.md`, [
        `# ${reportKey}`,
        "",
        `Generated: ${generatedAtUtc}`,
        "",
        `Status: ${failures.length === 0 ? "pass" : "fail"}`,
        "",
        "## Summary",
        "- Queue runtime continuity separates scheduler heartbeat evidence from dispatch outcome readability.",
        "- Outcomes-only evidence is degraded_missing_heartbeat, not live scheduler continuity.",
        "- Legacy adapter usage and missing dispatch outcomes remain blocking drift until migration evidence is loaded.",
        "",
        "## Validation Failures",
        ...(failures.length === 0 ? ["- none"] : failures.map((failure) => `- ${failure}`)),
    ]);
    if (failures.length > 0) {
        console.error(`${reportKey} failed:`);
        failures.forEach((failure) => console.error(`- ${failure}`));
        process.exit(1);
    }
    console.log(`${reportKey}: pass`);
}

export function validateQueueRuntimeContinuity() {
    const ui = readText("src/app/admin/debug/components/DebugTabMonitoring.tsx");
    const api = readText("src/app/api/admin/debug/route.ts");
    const continuity = buildQueueRuntimeContinuity({
        nowMs: NOW_MS,
        queueName: "drop_lifecycle",
        heartbeats: [],
        outcomes: Array.from({ length: 40 }, (_, index) => ({ stable_id: `outcome-${index}`, status: "sent", updatedAt: NOW_MS - 60_000 })),
        runtimeWarnings: [],
        driftSourceLoaded: false,
    });
    const failures: string[] = [];
    pushIf(continuity.continuityStatus === "degraded_missing_heartbeat", failures, "heartbeat missing + outcomes present displays LIVE.");
    pushIf(continuity.dispatchOutcomes.status !== "unknown", failures, "outcome count > 0 but outcome lane remains unknown.");
    pushIf(continuity.schedulerHeartbeat.status !== "unknown" && continuity.nextAction.length > 0, failures, "heartbeat lane unknown without next action.");
    pushIf(continuity.queueDrift.sourceLoaded === false && continuity.queueDrift.status === "source_missing", failures, "queue drift=0 shown healthy without drift source loaded.");
    pushIf(ui.includes("data-queue-continuity-status") && ui.includes("liveStatusAllowed"), failures, "queue continuity display does not expose live-status gate.");
    pushIf(api.includes("buildQueueRuntimeContinuity"), failures, "admin debug route does not use continuity engine.");
    runValidation("queue-runtime-continuity", continuity as unknown as Report, failures);
}

export function validateQueueHeartbeatEvidence() {
    const helper = readText("src/lib/server/queue-heartbeat.ts");
    const queueRuntime = readText("src/lib/server/queue-runtime.ts");
    const heartbeat = buildQueueHeartbeatRecord({
        queueName: "drop_lifecycle",
        jobName: "process_queue",
        heartbeatAtMs: NOW_MS,
        cadenceMs: 6 * 60 * 60 * 1000,
        status: "completed",
        outcomeCount: 0,
        warningCount: 0,
        source: "validator_contract",
    });
    const failures: string[] = [];
    pushIf(helper.includes("QueueHeartbeatEvidenceRecord"), failures, "no heartbeat contract exists.");
    pushIf("cadenceMs" in heartbeat && "freshnessMs" in heartbeat, failures, "heartbeat status lacks cadence/freshness.");
    pushIf(!helper.includes("adminDb.collection"), failures, "heartbeat writer would mutate production in tests.");
    pushIf(QUEUE_HEARTBEAT_INTEGRATION_POINTS.length >= 3 && queueRuntime.includes("recordQueueJobHeartbeat"), failures, "integration points missing for queue lifecycle jobs.");
    runValidation("queue-heartbeat-evidence", { heartbeat, integrationPoints: QUEUE_HEARTBEAT_INTEGRATION_POINTS }, failures);
}

export function validateDispatchOutcomeLaneCleanup() {
    const lane = classifyDispatchOutcomeLane({
        nowMs: NOW_MS,
        outcomes: Array.from({ length: 40 }, (_, index) => ({ stable_id: `outcome-${index}`, status: "sent", updatedAt: NOW_MS - 60_000 })),
        sourceLoaded: true,
        savedDataCount: 0,
    });
    const failures: string[] = [];
    pushIf(lane.status !== "unknown", failures, "outcomes > 0 but outcome lane unknown.");
    pushIf(lane.failedCount === 0 && lane.sourceWindow === "current", failures, "failed=0 shown healthy without source window.");
    pushIf(lane.savedDataStatus !== "unknown", failures, "savedData=0 lacks classification.");
    pushIf(lane.readableWhenHeartbeatMissing === true, failures, "outcome records unreadable when heartbeat missing.");
    runValidation("dispatch-outcome-lane-cleanup", lane as unknown as Report, failures);
}

export function validateLegacyQueueAdapterPolicy() {
    const blocking = classifyLegacyQueueAdapterUsage({ usageCount: 1, missingDispatchOutcomeCount: 1, sourceLoaded: true });
    const unloaded = classifyLegacyQueueAdapterUsage({ usageCount: 0, missingDispatchOutcomeCount: 0, sourceLoaded: false });
    const failures: string[] = [];
    pushIf(blocking.usageCount > 0, failures, "adapter usage not tracked.");
    pushIf(blocking.blocksContinuity === true, failures, "missing dispatch outcome not blocking.");
    pushIf(blocking.removalPolicy.length > 0, failures, "legacy adapter policy missing.");
    pushIf(unloaded.status === "unknown", failures, "queue drift=0 hides unloaded adapter source.");
    runValidation("legacy-queue-adapter-policy", { blocking, unloaded }, failures);
}

export function validateDebugCockpitBatch23QueueContinuity() {
    const report = buildDebugCockpitBatch23QueueContinuityReport();
    const failures = validateDebugCockpitBatch23QueueContinuityReport(report);
    const ui = readText("src/app/admin/debug/components/DebugTabMonitoring.tsx");
    const api = readText("src/app/api/admin/debug/route.ts");
    pushIf(ui.includes("data-queue-continuity-status") && !ui.includes("queueStatus === \"live\""), failures, "queue continuity displays live while heartbeat lane is missing/unknown.");
    pushIf(report.heartbeatLaneAfter !== "unknown" && report.nextExactSteps.length > 0, failures, "heartbeat lane remains unknown without action.");
    pushIf(report.outcomesCount > 0 && report.outcomeLaneAfter !== "unknown", failures, "outcomes > 0 but outcome lane unknown.");
    pushIf(report.continuityStatusAfter === "degraded_missing_heartbeat", failures, "no heartbeat records + outcomes present not classified degraded_missing_heartbeat.");
    pushIf(api.includes("legacyAdapterStatus") && api.includes("queueDrift"), failures, "legacy adapter usage policy missing.");
    pushIf(Object.keys(report.scoreDimensions).length > 0, failures, "score dimensions missing.");
    runValidation("debug-cockpit-batch23-queue-continuity", report as unknown as Report, failures);
}
