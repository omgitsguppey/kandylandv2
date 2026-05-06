import "server-only";

import { QueryDocumentSnapshot } from "firebase-admin/firestore";

import {
    buildPrivacyConsoleState,
    PRIVACY_CONSOLE_RANGE_MS,
    type PrivacyConsoleRange,
} from "@/lib/admin-privacy-console";
import { ANALYTICS_CANONICAL_COLLECTIONS, ANALYTICS_OPERATIONAL_COLLECTIONS } from "@/lib/server/analytics-governance";
import { adminDb } from "@/lib/server/firebase-admin";
import {
    buildRouteRuntimeRecordTruth,
    ROUTE_RUNTIME_HEALTH_COLLECTION,
    toRouteRuntimeHealthDocId,
} from "@/lib/route-runtime-health";

function toMillis(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (value && typeof value === "object") {
        const maybeDate = value as { toMillis?: () => number; _seconds?: number };
        if (typeof maybeDate.toMillis === "function") {
            try {
                return maybeDate.toMillis();
            } catch {
                return null;
            }
        }
        if (typeof maybeDate._seconds === "number") {
            return maybeDate._seconds * 1000;
        }
    }
    return null;
}

function toIso(value: unknown): string | null {
    const millis = toMillis(value);
    return millis && millis > 0 ? new Date(millis).toISOString() : null;
}

function toStringValue(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function toBoolean(value: unknown): boolean {
    return value === true;
}

function readLatestTimestamp(data: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
        const direct = data[key];
        const millis = toMillis(direct);
        if (millis && millis > 0) {
            return new Date(millis).toISOString();
        }
    }
    return null;
}

function buildRouteSignal(doc: QueryDocumentSnapshot | undefined) {
    if (!doc?.exists) {
        return {
            status: "unseen" as const,
            hasSample: false,
            lastSeenAtUtc: null,
        };
    }
    const record = buildRouteRuntimeRecordTruth(doc.data() as any);
    return {
        status: record.status,
        hasSample: record.hasSample,
        lastSeenAtUtc: record.lastSeenAtUtc,
    };
}

function parseRange(value: string | null | undefined): PrivacyConsoleRange {
    if (value === "1h" || value === "24h" || value === "7d" || value === "30d") {
        return value;
    }
    return "24h";
}

export async function buildAdminPrivacyConsoleState(rangeInput?: string | null) {
    const range = parseRange(rangeInput);
    const nowMs = Date.now();
    const rangeStartMs = nowMs - PRIVACY_CONSOLE_RANGE_MS[range];

    const [
        identifiedSnapshot,
        guestBatchSnapshot,
        exportStatusSnapshot,
        ingestRuntimeDoc,
        identifiedRuntimeDoc,
        consentRuntimeDoc,
    ] = await Promise.all([
        adminDb
            .collection(ANALYTICS_CANONICAL_COLLECTIONS.identifiedEventFacts)
            .where("timestamp", ">=", rangeStartMs)
            .orderBy("timestamp", "desc")
            .limit(120)
            .get(),
        adminDb
            .collection(ANALYTICS_CANONICAL_COLLECTIONS.guestBatches)
            .where("receivedAtMs", ">=", rangeStartMs)
            .orderBy("receivedAtMs", "desc")
            .limit(120)
            .get(),
        adminDb
            .collection(ANALYTICS_OPERATIONAL_COLLECTIONS.exportStatus)
            .limit(10)
            .get(),
        adminDb.collection(ROUTE_RUNTIME_HEALTH_COLLECTION).doc(toRouteRuntimeHealthDocId("analytics/ingest:POST")).get(),
        adminDb.collection(ROUTE_RUNTIME_HEALTH_COLLECTION).doc(toRouteRuntimeHealthDocId("analytics/ingest-identified:POST")).get(),
        adminDb.collection(ROUTE_RUNTIME_HEALTH_COLLECTION).doc(toRouteRuntimeHealthDocId("privacy/consent:POST")).get(),
    ]);

    const ingestRoute = ingestRuntimeDoc.exists ? buildRouteSignal(ingestRuntimeDoc as QueryDocumentSnapshot) : null;
    const identifiedIngestRoute = identifiedRuntimeDoc.exists ? buildRouteSignal(identifiedRuntimeDoc as QueryDocumentSnapshot) : null;
    const consentRoute = consentRuntimeDoc.exists ? buildRouteSignal(consentRuntimeDoc as QueryDocumentSnapshot) : null;

    const identifiedDocs = identifiedSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }));
    const guestDocs = guestBatchSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }));

    let latestEventAtUtc: string | null = null;
    let latestSource: string | null = null;
    const updateLatest = (timestampUtc: string | null, source: string) => {
        if (!timestampUtc) return;
        if (!latestEventAtUtc || Date.parse(timestampUtc) > Date.parse(latestEventAtUtc)) {
            latestEventAtUtc = timestampUtc;
            latestSource = source;
        }
    };

    let dedupeWithKeyCount = 0;
    let dedupeMissingKeyCount = 0;
    let consentAllowedCount = 0;
    let consentDeniedCount = 0;
    let consentUnknownCount = 0;
    let consentViolationCount = 0;
    let serverOriginSampleCount = 0;
    let clientOriginSampleCount = 0;

    for (const doc of identifiedDocs) {
        const timestampUtc = toIso(doc.data.timestamp);
        updateLatest(timestampUtc, "identified_event_fact");
        const hasCanonicalKey = Boolean(
            toStringValue(doc.data.idempotencyKey)
            || toStringValue(doc.data.eventId)
            || toStringValue(doc.data.normalizedActionId)
            || doc.id,
        );
        if (hasCanonicalKey) {
            dedupeWithKeyCount += 1;
        } else {
            dedupeMissingKeyCount += 1;
        }

        const consentMode = toStringValue(doc.data.consentMode);
        const gpc = toBoolean(doc.data.globalPrivacyControl);
        if (consentMode === "denied" || gpc) {
            consentDeniedCount += 1;
            consentViolationCount += 1;
        } else if (consentMode.length > 0) {
            consentAllowedCount += 1;
        } else {
            consentUnknownCount += 1;
        }

        const trackingOrigin = toStringValue(doc.data.trackingOrigin);
        if (trackingOrigin === "identified_api_ingest" || trackingOrigin === "server" || trackingOrigin === "canonical") {
            serverOriginSampleCount += 1;
        } else if (trackingOrigin.length > 0) {
            clientOriginSampleCount += 1;
        }
    }

    let guestAnonymousPresentCount = 0;
    let guestAnonymousMissingCount = 0;
    let lastGuestEventAtUtc: string | null = null;
    for (const doc of guestDocs) {
        const receivedAtUtc = toIso(doc.data.receivedAtMs);
        updateLatest(receivedAtUtc, "guest_batch");
        if (!lastGuestEventAtUtc || (receivedAtUtc && Date.parse(receivedAtUtc) > Date.parse(lastGuestEventAtUtc))) {
            lastGuestEventAtUtc = receivedAtUtc;
        }
        const hasCanonicalKey = Boolean(
            toStringValue(doc.data.batchId)
            || toStringValue(doc.data.idempotencyKey)
            || doc.id,
        );
        if (hasCanonicalKey) {
            dedupeWithKeyCount += 1;
        } else {
            dedupeMissingKeyCount += 1;
        }
        const consentMode = toStringValue(doc.data.consentMode);
        const gpc = toBoolean(doc.data.globalPrivacyControl);
        if (consentMode === "denied" || gpc) {
            consentDeniedCount += 1;
            consentViolationCount += 1;
        } else if (consentMode.length > 0) {
            consentAllowedCount += 1;
        } else {
            consentUnknownCount += 1;
        }
        if (toStringValue(doc.data.sessionKey) || toStringValue(doc.data.clientSessionId)) {
            guestAnonymousPresentCount += 1;
        } else {
            guestAnonymousMissingCount += 1;
        }
        const trackingOrigin = toStringValue(doc.data.trackingOrigin);
        if (trackingOrigin === "guest_client" || trackingOrigin === "client") {
            clientOriginSampleCount += 1;
        } else if (trackingOrigin.length > 0) {
            serverOriginSampleCount += 1;
        }
    }

    let exportConfigured = false;
    let exportListenerFailed = false;
    let exportFailureCount = 0;
    let exportFailureReason: string | null = null;
    let exportAffectedRange: string | null = null;
    let exportLastHeartbeatAtUtc: string | null = null;
    let exportLastSuccessAtUtc: string | null = null;

    for (const doc of exportStatusSnapshot.docs) {
        const data = doc.data() as Record<string, unknown>;
        exportConfigured = true;
        const heartbeatAt = readLatestTimestamp(data, "lastHeartbeatAtMs", "lastHeartbeatMs", "updatedAtMs", "updatedAt", "heartbeatAt");
        const successAt = readLatestTimestamp(data, "lastSuccessfulExportAtMs", "lastSuccessAtMs", "lastSuccessAt", "lastSuccessfulExportAt");
        if (heartbeatAt && (!exportLastHeartbeatAtUtc || Date.parse(heartbeatAt) > Date.parse(exportLastHeartbeatAtUtc))) {
            exportLastHeartbeatAtUtc = heartbeatAt;
        }
        if (successAt && (!exportLastSuccessAtUtc || Date.parse(successAt) > Date.parse(exportLastSuccessAtUtc))) {
            exportLastSuccessAtUtc = successAt;
        }
        exportFailureCount = Math.max(
            exportFailureCount,
            Number(data.failureCount || data.consecutiveFailures || data.errorCount || 0),
        );
        const failureReason = toStringValue(data.lastFailureReason) || toStringValue(data.error) || toStringValue(data.failureReason);
        if (!exportFailureReason && failureReason) {
            exportFailureReason = failureReason;
        }
        const affectedRange = toStringValue(data.affectedRange) || toStringValue(data.range) || toStringValue(data.lastFailedPartition);
        if (!exportAffectedRange && affectedRange) {
            exportAffectedRange = affectedRange;
        }
        const status = toStringValue(data.status).toLowerCase();
        if (status.includes("fail") || status.includes("error") || failureReason.toLowerCase().includes("fail") || failureReason.toLowerCase().includes("listener")) {
            exportListenerFailed = true;
        }
    }

    return buildPrivacyConsoleState({
        generatedAtUtc: new Date(nowMs).toISOString(),
        range,
        eventPipeline: {
            sampleCount: identifiedDocs.length + guestDocs.length,
            lastSeenAtUtc: latestEventAtUtc,
            latestSource,
            guestBatchCount: guestDocs.length,
            identifiedEventCount: identifiedDocs.length,
            ingestRoute,
            identifiedIngestRoute,
        },
        deduplication: {
            checkedEvents: identifiedDocs.length + guestDocs.length,
            withKeyCount: dedupeWithKeyCount,
            missingKeyCount: dedupeMissingKeyCount,
            duplicateSuppressionCount: null,
            lastSeenAtUtc: latestEventAtUtc,
        },
        consentGating: {
            allowedCount: consentAllowedCount,
            deniedCount: consentDeniedCount,
            unknownConsentCount: consentUnknownCount,
            blockedDueToConsentCount: 0,
            trackedDeniedConsentViolationCount: consentViolationCount,
            lastSeenAtUtc: latestEventAtUtc,
            consentRoute,
        },
        guestTracking: {
            guestEventCount: guestDocs.length,
            anonymousIdPresentCount: guestAnonymousPresentCount,
            missingAnonymousIdCount: guestAnonymousMissingCount,
            lastGuestEventAtUtc,
        },
        cloudRunIngest: {
            serverOriginSampleCount,
            clientOriginSampleCount,
            lastIngestAtUtc: latestEventAtUtc,
            ingestRoute,
            identifiedIngestRoute,
        },
        bigqueryExport: {
            configured: exportConfigured,
            listenerFailed: exportListenerFailed,
            lastHeartbeatAtUtc: exportLastHeartbeatAtUtc,
            lastSuccessfulExportAtUtc: exportLastSuccessAtUtc,
            failureCount: exportFailureCount,
            failureReason: exportFailureReason,
            affectedRange: exportAffectedRange,
        },
    });
}
