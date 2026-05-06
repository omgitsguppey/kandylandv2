import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildAdminOrchestrationSnapshot } from "@/lib/server/admin-orchestration";

function doc(id: string, data: Record<string, unknown>) {
    return {
        id,
        data: () => data,
    } as any;
}

describe("buildAdminOrchestrationSnapshot repair proposals", () => {
    it("dedupes inspect-only repair proposals and excludes them from actionable count", () => {
        const snapshot = buildAdminOrchestrationSnapshot({
            eventDocs: [],
            findingDocs: [
                doc("finding-a", {
                    findingKey: "missing_actor_context",
                    sourceDocumentPath: "analytics_event_facts/srv_server_drop_clicked_mot4jcvf_1ccaa4127dbb410d",
                    sourceCollection: "analytics_event_facts",
                    sourceDocumentId: "srv_server_drop_clicked_mot4jcvf_1ccaa4127dbb410d",
                    severity: "warn",
                    status: "open",
                    detail: "The canonical record does not identify the actor who caused it.",
                }),
            ],
            proposalDocs: [
                doc("proposal-a", {
                    sourceCollection: "analytics_event_facts",
                    sourceDocumentId: "srv_server_drop_clicked_mot4jcvf_1ccaa4127dbb410d",
                    sourceDocumentPath: "analytics_event_facts/srv_server_drop_clicked_mot4jcvf_1ccaa4127dbb410d",
                    findingKey: "missing_actor_context",
                    status: "open",
                    actionType: "inspect_source_record",
                    label: "Inspect canonical source",
                    detail: "Inspect the underlying canonical record because required source context is missing.",
                    detectedAtMs: Date.UTC(2026, 4, 6, 1, 0, 0),
                    updatedAtMs: Date.UTC(2026, 4, 6, 1, 5, 0),
                }),
                doc("proposal-b", {
                    sourceCollection: "analytics_event_facts",
                    sourceDocumentId: "srv_server_drop_clicked_mot4jcvf_1ccaa4127dbb410d",
                    sourceDocumentPath: "analytics_event_facts/srv_server_drop_clicked_mot4jcvf_1ccaa4127dbb410d",
                    findingKey: "missing_actor_context",
                    status: "open",
                    actionType: "inspect_source_record",
                    label: "Inspect canonical source",
                    detail: "Inspect the underlying canonical record because required source context is missing.",
                    detectedAtMs: Date.UTC(2026, 4, 6, 1, 2, 0),
                    updatedAtMs: Date.UTC(2026, 4, 6, 1, 10, 0),
                }),
            ],
            actorSummaryDocs: [],
            repairActionDocs: [],
        });

        expect(snapshot.summary.actionableProposals).toBe(0);
        expect(snapshot.summary.inspectOnlyProposals).toBe(1);
        expect(snapshot.summary.duplicateProposalsCollapsed).toBe(1);
        expect(snapshot.proposals).toHaveLength(1);
        expect(snapshot.proposals[0]).toMatchObject({
            canonicalSourcePath: "analytics_event_facts/srv_server_drop_clicked_mot4jcvf_1ccaa4127dbb410d",
            actionability: "inspect_only",
            sourceContextState: "missing_required_context",
            duplicateCount: 2,
            duplicateProposalIds: ["proposal-a", "proposal-b"],
        });
        expect(snapshot.proposals[0]?.dedupeKey).toBe("analytics_event_facts:analytics_event_facts/srv_server_drop_clicked_mot4jcvf_1ccaa4127dbb410d:inspect_canonical_source:missing_actor_context");
        expect(snapshot.proposals[0]?.missingContextFields).toContain("actorUserId or analyticsUserId");
        expect(snapshot.proposalGroups).toHaveLength(1);
        expect(snapshot.proposalGroups[0]).toMatchObject({
            title: "Drop click canonical source context missing",
            affectedRecordCount: 1,
            hiddenRecordCount: 0,
            actionability: "inspect_only",
        });
    });

    it("keeps rebuild projection proposals actionable after dedupe", () => {
        const snapshot = buildAdminOrchestrationSnapshot({
            eventDocs: [],
            findingDocs: [],
            proposalDocs: [
                doc("proposal-rebuild", {
                    sourceCollection: "analytics_watch_sessions",
                    sourceDocumentId: "watch-1",
                    sourceDocumentPath: "analytics_watch_sessions/watch-1",
                    findingKey: "viewer_event_missing_watch_session",
                    status: "open",
                    actionType: "rebuild_projection",
                    label: "Rebuild orchestration projection",
                    detail: "Re-run the orchestration pipeline for this canonical record.",
                    detectedAtMs: Date.UTC(2026, 4, 6, 1, 0, 0),
                    updatedAtMs: Date.UTC(2026, 4, 6, 1, 5, 0),
                }),
            ],
            actorSummaryDocs: [],
            repairActionDocs: [],
        });

        expect(snapshot.summary.actionableProposals).toBe(1);
        expect(snapshot.summary.inspectOnlyProposals).toBe(0);
        expect(snapshot.proposals[0]).toMatchObject({
            actionability: "actionable",
            repairKind: "repair_missing_source_context",
            duplicateCount: 1,
        });
    });

    it("groups repeated notification source context records and shows only the first five", () => {
        const proposalDocs = Array.from({ length: 6 }, (_, index) => {
            const sourceDocumentId = `notification-${index + 1}`;
            return doc(`proposal-notification-${index + 1}`, {
                sourceCollection: "notifications",
                sourceDocumentId,
                sourceDocumentPath: `notifications/${sourceDocumentId}`,
                findingKey: "notification_missing_target_user",
                status: "open",
                actionType: "inspect_source_record",
                label: "Inspect canonical source",
                detail: "Inspect the underlying canonical record because required source context is missing.",
                detectedAtMs: Date.UTC(2026, 4, 6, 1, index, 0),
                updatedAtMs: Date.UTC(2026, 4, 6, 1, index + 10, 0),
            });
        });

        const snapshot = buildAdminOrchestrationSnapshot({
            eventDocs: [],
            findingDocs: [],
            proposalDocs,
            actorSummaryDocs: [],
            repairActionDocs: [],
        });

        expect(snapshot.summary.actionableProposals).toBe(0);
        expect(snapshot.summary.inspectOnlyProposals).toBe(1);
        expect(snapshot.summary.groupedProposalCards).toBe(1);
        expect(snapshot.summary.groupedSourceRecordsCollapsed).toBe(5);
        expect(snapshot.proposalGroups).toHaveLength(1);
        expect(snapshot.proposalGroups[0]).toMatchObject({
            title: "Notification source context missing",
            sourceCollection: "notifications",
            affectedRecordCount: 6,
            hiddenRecordCount: 1,
            actionability: "inspect_only",
            sourceContextState: "missing_required_context",
        });
        expect(snapshot.proposalGroups[0]?.visibleRecords).toHaveLength(5);
        expect(snapshot.proposalGroups[0]?.missingContextFields).toEqual(expect.arrayContaining([
            "targetUserId or recipientUserId",
            "actorUserId / actorType",
            "notificationType",
            "notificationId",
            "sourceEntityId",
            "route or surface (foreground only)",
            "sourceComponent",
            "createdAt",
        ]));
    });

    it("treats background ledger route gaps as exempt and foreground route gaps as required", () => {
        const snapshot = buildAdminOrchestrationSnapshot({
            eventDocs: [
                doc("event-ledger", {
                    sourceCollection: "transactions",
                    domain: "commerce",
                    normalizedEventName: "gumdrops_purchased",
                    actor: { actorType: "user", actorId: "user-1", actorLabel: "User 1" },
                    session: { sourceSurface: "background", routePath: "" },
                    dependencyReadiness: { ready: ["actor"], missing: ["route"] },
                    readiness: { trainingEligible: false, recommendationReady: true, lowConfidence: false, incomplete: false },
                }),
                doc("event-foreground", {
                    sourceCollection: "analytics_event_facts",
                    domain: "telemetry",
                    normalizedEventName: "dashboard_viewed",
                    actor: { actorType: "user", actorId: "user-2", actorLabel: "User 2" },
                    session: { sourceSurface: "dashboard", routePath: "" },
                    dependencyReadiness: { ready: ["actor"], missing: ["route", "session"] },
                    readiness: { trainingEligible: true, recommendationReady: true, lowConfidence: true, incomplete: false },
                }),
            ],
            findingDocs: [],
            proposalDocs: [],
            actorSummaryDocs: [],
            repairActionDocs: [],
        });

        expect(snapshot.dependencyReadiness.routeMissing.requiredMissing).toBe(1);
        expect(snapshot.dependencyReadiness.routeMissing.backgroundExempt).toBe(1);
        expect(snapshot.dependencyReadiness.sessionMissing.requiredMissing).toBe(1);
        expect(snapshot.summary.lowConfidenceRequiredEvents).toBe(1);
    });

    it("collapses duplicate inspect-only notification findings in domain summary", () => {
        const snapshot = buildAdminOrchestrationSnapshot({
            eventDocs: [
                doc("event-notification", {
                    sourceCollection: "notifications",
                    domain: "notifications",
                    normalizedEventName: "notification_opened",
                    actor: { actorType: "system", actorId: "", actorLabel: "System process" },
                    session: { sourceSurface: "background", routePath: "" },
                    dependencyReadiness: { ready: [], missing: ["route", "session"] },
                    readiness: { trainingEligible: false, recommendationReady: false, lowConfidence: false, incomplete: false },
                    findingCount: 6,
                }),
            ],
            findingDocs: [
                doc("finding-notification-1", {
                    findingKey: "missing_route_context",
                    sourceDocumentPath: "notifications/notification-1",
                    sourceCollection: "notifications",
                    sourceDocumentId: "notification-1",
                    domain: "notifications",
                    severity: "warn",
                    status: "open",
                    eventRecordId: "event-notification",
                }),
                doc("finding-notification-2", {
                    findingKey: "missing_route_context",
                    sourceDocumentPath: "notifications/notification-1",
                    sourceCollection: "notifications",
                    sourceDocumentId: "notification-1",
                    domain: "notifications",
                    severity: "warn",
                    status: "open",
                    eventRecordId: "event-notification",
                }),
            ],
            proposalDocs: [
                doc("proposal-notification-1", {
                    sourceCollection: "notifications",
                    sourceDocumentId: "notification-1",
                    sourceDocumentPath: "notifications/notification-1",
                    findingKey: "notification_missing_target_user",
                    status: "open",
                    actionType: "inspect_source_record",
                    label: "Inspect canonical source",
                    detail: "Inspect the underlying canonical record because required source context is missing.",
                    detectedAtMs: Date.UTC(2026, 4, 6, 1, 0, 0),
                    updatedAtMs: Date.UTC(2026, 4, 6, 1, 5, 0),
                }),
                doc("proposal-notification-2", {
                    sourceCollection: "notifications",
                    sourceDocumentId: "notification-2",
                    sourceDocumentPath: "notifications/notification-2",
                    findingKey: "notification_missing_target_user",
                    status: "open",
                    actionType: "inspect_source_record",
                    label: "Inspect canonical source",
                    detail: "Inspect the underlying canonical record because required source context is missing.",
                    detectedAtMs: Date.UTC(2026, 4, 6, 1, 1, 0),
                    updatedAtMs: Date.UTC(2026, 4, 6, 1, 6, 0),
                }),
            ],
            actorSummaryDocs: [],
            repairActionDocs: [],
        });

        const notificationsDomain = snapshot.domainSummary.find((entry) => entry.key === "notifications");
        expect(snapshot.summary.uniqueOpenFindings).toBe(1);
        expect(snapshot.summary.duplicateFindings).toBeGreaterThan(0);
        expect(snapshot.summary.inspectOnlyFindings).toBe(1);
        expect(notificationsDomain).toMatchObject({
            eventCount: 1,
            uniqueOpenFindings: 1,
            inspectOnlyFindings: 1,
            state: "review",
        });
        expect(notificationsDomain?.explanation).toContain("duplicate inspect-only");
    });

    it("adds actor bleed-risk reasons and keeps header contamination totals aligned with row counts", () => {
        const snapshot = buildAdminOrchestrationSnapshot({
            eventDocs: [
                doc("event-admin-1", {
                    sourceCollection: "analytics_event_facts",
                    domain: "telemetry",
                    normalizedEventName: "admin_user_opened",
                    actor: {
                        actorType: "admin",
                        actorId: "admin-1",
                        actorLabel: "Will Risk",
                        actorKey: "admin-1",
                        contaminationRisk: true,
                    },
                    session: { sourceSurface: "admin", routePath: "/admin/debug" },
                    dependencyReadiness: { ready: ["actor"], missing: [] },
                    readiness: { trainingEligible: false, recommendationReady: false, lowConfidence: false, incomplete: false },
                }),
            ],
            findingDocs: [
                doc("finding-admin-1", {
                    findingKey: "missing_route_context",
                    sourceDocumentPath: "analytics_event_facts/event-admin-1",
                    domain: "telemetry",
                    severity: "error",
                    status: "open",
                    actorKey: "admin-1",
                    eventRecordId: "event-admin-1",
                    title: "Missing route context",
                    detail: "Foreground event is missing route context.",
                }),
            ],
            proposalDocs: [],
            actorSummaryDocs: [
                doc("actor-admin-1", {
                    actorKey: "admin-1",
                    actorType: "admin",
                    actorLabel: "Will Risk",
                    actorId: "admin-1",
                    eventCount: 2,
                    warningCount: 0,
                    criticalCount: 1,
                    contaminationCount: 2,
                    topDomains: ["telemetry"],
                }),
            ],
            repairActionDocs: [],
        });

        expect(snapshot.summary.contaminationRisks).toBe(2);
        expect(snapshot.actorSummaries).toHaveLength(1);
        expect(snapshot.actorSummaries[0]).toMatchObject({
            actorId: "admin-1",
            contaminationCount: 2,
            criticalCount: 1,
            riskDomains: ["telemetry"],
        });
        expect(snapshot.actorSummaries[0]?.riskReasons).toEqual(expect.arrayContaining([
            expect.objectContaining({
                reasonCode: "admin_behavior_exclusion_missing",
                appliesToBleedRisk: true,
            }),
            expect.objectContaining({
                reasonCode: "missing_required_route",
            }),
        ]));
    });

    it("adds unknown actor risk reasons when counts exist without attached evidence", () => {
        const snapshot = buildAdminOrchestrationSnapshot({
            eventDocs: [],
            findingDocs: [],
            proposalDocs: [],
            actorSummaryDocs: [
                doc("actor-unknown-1", {
                    actorType: "user",
                    actorLabel: "Unknown Risk",
                    actorId: "user-unknown",
                    eventCount: 4,
                    warningCount: 0,
                    criticalCount: 1,
                    contaminationCount: 1,
                    topDomains: ["notifications"],
                }),
            ],
            repairActionDocs: [],
        });

        expect(snapshot.actorSummaries[0]?.riskReasons).toEqual([
            expect.objectContaining({
                reasonCode: "unknown",
                explanation: "Risk count exists but no source reason was attached; inspect normalization evidence.",
            }),
        ]);
    });
});
