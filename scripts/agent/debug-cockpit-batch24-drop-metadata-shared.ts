import fs from "node:fs";
import path from "node:path";

import {
    buildDropActivationSchedulerDebug,
    parseDropActivationSchedulerKey,
} from "../../src/lib/debug/drop-activation-scheduler-key";
import { buildDispatchOutcomeDisplayModel } from "../../src/lib/debug/dispatch-outcome-display-cleanup";
import {
    enrichQueueDropMetadata,
    shortDropId,
} from "../../src/lib/debug/queue-drop-metadata-enrichment";
import { buildQueueMetadataGapSummary } from "../../src/lib/debug/queue-metadata-gap-summary";
import {
    buildDebugCockpitBatch24DropMetadataReport,
    validateDebugCockpitBatch24DropMetadataReport,
} from "../../src/lib/debug/debug-cockpit-batch24-drop-metadata";

type Report = Record<string, unknown>;

const SAMPLE_DROP_ID = "Jgu68C61I1qfOrHmUKP8";
const SAMPLE_KEY = `drop-activation:${SAMPLE_DROP_ID}:1779620400000`;

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

function expectPass(condition: boolean, failures: string[], message: string) {
    if (!condition) failures.push(message);
}

function runValidation(reportKey: string, report: Report, failures: string[], summary: string[]) {
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
        ...summary.map((line) => `- ${line}`),
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

export function validateDropActivationSchedulerKey() {
    const parsed = parseDropActivationSchedulerKey(SAMPLE_KEY);
    const invalid = buildDropActivationSchedulerDebug({ schedulerKey: `drop-activation:${SAMPLE_DROP_ID}:not-a-time` });
    const route = readText("src/app/api/admin/debug/route.ts");
    const failures: string[] = [];
    expectPass(parsed.ok, failures, "parseable drop-activation scheduler key did not parse.");
    expectPass(parsed.dropId === SAMPLE_DROP_ID, failures, "dropId from scheduler key is ignored.");
    expectPass(parsed.scheduledAtUtc === "2026-05-24T11:00:00.000Z", failures, "parseable scheduler key displays Scheduled UTC unknown.");
    expectPass(invalid.parseError === "invalid_scheduled_at", failures, "invalid scheduler key lacks parse error.");
    expectPass(invalid.mutationAllowed === false, failures, "parser mutates or permits mutation of queue data.");
    expectPass(route.includes("parseDropActivationSchedulerKey"), failures, "admin debug route bypasses scheduler key parser.");
    runValidation("drop-activation-scheduler-key", parsed as unknown as Report, failures, [
        "Scheduler key parsing is deterministic and source-only.",
        "Drop IDs and scheduled timestamps are extracted from drop-activation keys without mutating queue data.",
    ]);
}

export function validateQueueDropMetadataEnrichment() {
    const missing = enrichQueueDropMetadata({ dropId: SAMPLE_DROP_ID });
    const resolved = enrichQueueDropMetadata({
        dropId: SAMPLE_DROP_ID,
        boundedDropRecord: { title: "Bloomytrip's Peach & Natural", creatorId: "creator-1", status: "active" },
        creatorName: "@creator",
    });
    const tombstone = enrichQueueDropMetadata({
        dropId: SAMPLE_DROP_ID,
        boundedDropRecord: { status: "archived", archivedAt: 1779620400000 },
    });
    const route = readText("src/app/api/admin/debug/route.ts");
    const failures: string[] = [];
    expectPass(missing.dropTitle === `Drop ${shortDropId(SAMPLE_DROP_ID)}`, failures, "dispatch outcome with valid dropId shows generic Unknown drop without lookup/source explanation.");
    expectPass(missing.confidence === "missing" && missing.missingReason !== null, failures, "metadata missing is treated as successful metadata.");
    expectPass(resolved.dropTitle === "Bloomytrip's Peach & Natural" && resolved.confidence === "exact", failures, "resolved drop title is not used when bounded metadata exists.");
    expectPass(tombstone.source === "tombstone" && tombstone.dropTitle.startsWith("Deleted/archived drop"), failures, "deleted/archived drop lacks tombstone classification.");
    expectPass(missing.dispatchOutcomeAffected === false, failures, "sent outcome is marked failed due to missing metadata.");
    expectPass(route.includes("adminDb.getAll(...dropRefs)") && !route.includes("adminDb.collection(\"drops\").get()"), failures, "bounded lookup can broad-read drops.");
    expectPass(!missing.dropTitle.includes("Bloomytrip"), failures, "drop title is faked.");
    runValidation("queue-drop-metadata-enrichment", { missing, resolved, tombstone }, failures, [
        "Queue drop metadata resolves from embedded snapshots or bounded explicit-ID drop lookup.",
        "Missing metadata remains visible as a debug enrichment gap and does not fail sent dispatch outcomes.",
    ]);
}

export function validateDispatchOutcomeDisplayCleanup() {
    const metadata = enrichQueueDropMetadata({ dropId: SAMPLE_DROP_ID });
    const display = buildDispatchOutcomeDisplayModel({
        schedulerKey: SAMPLE_KEY,
        outcome: "sent",
        errorCode: null,
        metadata,
    });
    const ui = readText("src/app/admin/debug/components/DebugTabMonitoring.tsx");
    const failures: string[] = [];
    expectPass(display.label === `Drop ${shortDropId(SAMPLE_DROP_ID)}`, failures, "valid dropId rows display generic Unknown drop.");
    expectPass(display.scheduledAtUtc === "2026-05-24T11:00:00.000Z", failures, "scheduled UTC remains unknown when scheduler key has timestamp.");
    expectPass(display.outcomeBadge === "sent" && display.metadataWarning === "drop_metadata_missing", failures, "metadata missing is merged into dispatch status.");
    expectPass(display.rawDetailsDefaultOpen === false && ui.includes("<details"), failures, "raw queue details open by default.");
    expectPass(display.defaultDropIdLabel === shortDropId(SAMPLE_DROP_ID), failures, "drop ID not redacted/shortened in default view when metadata missing.");
    expectPass(ui.includes("dropMetadataState") && ui.includes("Drop ${entry.shortDropId}"), failures, "queue row display does not use bounded metadata state and fallback labels.");
    runValidation("dispatch-outcome-display-cleanup", display as unknown as Report, failures, [
        "Dispatch outcome display separates sent/failed outcome truth from drop metadata enrichment.",
        "Rows with valid drop IDs fall back to short drop labels instead of generic Unknown drop.",
    ]);
}

export function validateQueueMetadataGapSummary() {
    const summary = buildQueueMetadataGapSummary([
        { outcome: "sent", schedulerKeyParsed: true, metadataConfidence: "exact", dropId: "resolved-drop" },
        { outcome: "sent", schedulerKeyParsed: true, metadataConfidence: "missing", dropId: SAMPLE_DROP_ID },
    ]);
    const failures: string[] = [];
    expectPass(summary.metadataMissing === 1, failures, "metadata missing count not reported.");
    expectPass(summary.schedulerKeysParsed === 2, failures, "scheduler parse count missing.");
    expectPass(summary.dispatchHealthStatus === "sent_outcomes_readable_with_enrichment_caveat", failures, "sent outcomes with metadata gaps are marked full healthy without enrichment caveat.");
    expectPass(summary.debugOnlyEnrichmentGapCount === 1 && summary.payloadCorrectnessGapCount === 0, failures, "payload correctness not distinguished from debug enrichment.");
    expectPass(summary.topMissingDropIds.includes(SAMPLE_DROP_ID), failures, "top missing drop IDs absent.");
    runValidation("queue-metadata-gap-summary", summary as unknown as Report, failures, [
        "Queue metadata gaps are summarized separately from dispatch outcome health.",
        "Debug enrichment gaps remain P2 unless notification payload correctness is implicated.",
    ]);
}

export function validateDebugCockpitBatch24DropMetadata() {
    const report = buildDebugCockpitBatch24DropMetadataReport();
    const route = readText("src/app/api/admin/debug/route.ts");
    const ui = readText("src/app/admin/debug/components/DebugTabMonitoring.tsx");
    const failures = validateDebugCockpitBatch24DropMetadataReport(report);
    expectPass(route.includes("buildQueueMetadataGapSummary"), failures, "queue metadata gap summary missing.");
    expectPass(route.includes("adminDb.getAll(...dropRefs)") && !route.includes("adminDb.collection(\"drops\").get()"), failures, "bounded lookup absent or broad drop reads possible.");
    expectPass(ui.includes("dropMetadataWarning") && ui.includes("metadataState"), failures, "metadata missing is hidden as live metadata.");
    expectPass(!ui.includes("entry.dropTitle || \"Unknown drop\""), failures, "valid drop IDs still show generic Unknown drop without source explanation.");
    runValidation("debug-cockpit-batch24-drop-metadata", report as unknown as Report, failures, [
        "Batch 24 resolves scheduler timestamps and fallback drop labels for queue dispatch rows.",
        "Metadata gaps are classified as debug enrichment gaps unless payload correctness evidence says otherwise.",
        "Notification dispatch behavior is unchanged.",
    ]);
}
