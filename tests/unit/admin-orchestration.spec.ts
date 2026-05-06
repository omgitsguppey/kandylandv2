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
        expect(snapshot.proposals[0]?.missingContextFields).toContain("userId");
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
});
