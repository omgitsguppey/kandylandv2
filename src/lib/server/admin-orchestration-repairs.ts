import "server-only";

export type RawAdminRepairProposal = {
    id: string;
    sourceCollection: string;
    sourceDocumentId: string;
    sourceDocumentPath: string;
    findingKey: string;
    status: string;
    actionType: string;
    label: string;
    detail: string;
    requiresAdminConfirmation: boolean;
    detectedAtMs: number;
    updatedAtMs: number;
};

export type RawAdminFindingForRepair = {
    id: string;
    findingKey: string;
    sourceDocumentPath: string;
    severity: string;
    detail: string;
};

export type DebugRepairProposal = {
    proposalId: string;
    canonicalSourcePath: string;
    repairKind:
        | "inspect_canonical_source"
        | "repair_missing_source_context"
        | "dismiss_false_positive"
        | "manual_review_required";
    status: "open" | "applied" | "dismissed" | "superseded" | "duplicate";
    severity: "info" | "review" | "error";
    actionability: "actionable" | "inspect_only" | "manual_review" | "not_actionable";
    sourceContextState: "complete" | "missing_required_context" | "stale" | "unknown";
    duplicateCount: number;
    duplicateProposalIds: string[];
    firstSeenAtUtc: string;
    lastSeenAtUtc: string;
    suggestedAction: string;
    sourceType: string;
    missingContextReason: string;
    missingContextFields: string[];
    dedupeKey: string;
    label: string;
    detail: string;
    sourceDocumentPath: string;
    statusRaw: string;
    actionType: string;
    requiresAdminConfirmation: boolean;
};

export type DebugRepairProposalGroup = {
    groupId: string;
    title: string;
    sourceCollection: string;
    repairKind: DebugRepairProposal["repairKind"];
    missingContextReason: string;
    actionability: DebugRepairProposal["actionability"];
    sourceContextState: DebugRepairProposal["sourceContextState"];
    severity: DebugRepairProposal["severity"];
    status: DebugRepairProposal["status"];
    duplicateCount: number;
    affectedRecordCount: number;
    hiddenRecordCount: number;
    firstSeenAtUtc: string;
    lastSeenAtUtc: string;
    suggestedAction: string;
    missingContextFields: string[];
    visibleRecords: DebugRepairProposal[];
    affectedProposalIds: string[];
    canonicalSourcePaths: string[];
    representativeProposalId: string;
    dedupeKey: string;
};

function normalizeProposalStatus(status: string): DebugRepairProposal["status"] {
    if (status === "open") return "open";
    if (status === "dismissed" || status === "reviewed_no_change") return "dismissed";
    if (status === "applying" || status === "resolved") return "applied";
    return "superseded";
}

function repairKindForAction(actionType: string): DebugRepairProposal["repairKind"] {
    if (actionType === "rebuild_projection") return "repair_missing_source_context";
    if (actionType === "inspect_source_record") return "inspect_canonical_source";
    return "manual_review_required";
}

function actionabilityForProposal(status: string, actionType: string): DebugRepairProposal["actionability"] {
    if (status !== "open") return "not_actionable";
    if (actionType === "rebuild_projection") return "actionable";
    if (actionType === "inspect_source_record") return "inspect_only";
    return "manual_review";
}

function severityForProposal(finding?: RawAdminFindingForRepair): DebugRepairProposal["severity"] {
    if (finding?.severity === "error") return "error";
    if (finding?.severity === "warn") return "review";
    return "info";
}

function sourceContextStateForProposal(findingKey: string, detail: string, actionType: string): DebugRepairProposal["sourceContextState"] {
    const contextText = `${findingKey} ${detail}`.toLowerCase();
    if (contextText.includes("missing") || actionType === "inspect_source_record") return "missing_required_context";
    if (contextText.includes("stale")) return "stale";
    return "unknown";
}

function missingContextFieldsForProposal(sourceCollection: string, findingKey: string) {
    const fields = new Set<string>();
    if (findingKey === "missing_actor_context") {
        fields.add("actorUserId");
        fields.add("actorType");
    }
    if (findingKey === "missing_route_context") {
        fields.add("routePath");
        fields.add("surface");
    }
    if (findingKey === "viewer_event_missing_watch_session") {
        fields.add("watchSessionId");
        fields.add("sessionId");
    }
    if (sourceCollection === "analytics_event_facts") {
        fields.add("actorUserId or analyticsUserId");
        fields.add("sessionId");
        fields.add("dropId");
        fields.add("sourceSurface");
        fields.add("sourceTruth");
        fields.add("normalizedAction");
    }
    if (sourceCollection === "notifications") {
        fields.add("targetUserId or recipientUserId");
        fields.add("actorUserId / actorType");
        fields.add("notificationType");
        fields.add("notificationId");
        fields.add("sourceEntityId");
        fields.add("route or surface (foreground only)");
        fields.add("sourceComponent");
        fields.add("createdAt");
    }
    return Array.from(fields);
}

function toUtcString(value: number) {
    return new Date(Number.isFinite(value) && value > 0 ? value : Date.now()).toISOString();
}

function shouldGroupInspectProposal(proposal: DebugRepairProposal) {
    if (proposal.actionability !== "inspect_only") return false;
    if (proposal.sourceType === "notifications") return true;
    return proposal.sourceType === "analytics_event_facts" && proposal.canonicalSourcePath.includes("srv_server_drop_clicked_");
}

function groupedRepairTitle(sourceCollection: string) {
    if (sourceCollection === "notifications") return "Notification source context missing";
    if (sourceCollection === "analytics_event_facts") return "Drop click canonical source context missing";
    return "Canonical source context missing";
}

export function buildDebugRepairProposalDedupeKey(input: {
    sourceCollection: string;
    canonicalSourcePath: string;
    repairKind: DebugRepairProposal["repairKind"];
    missingContextReason: string;
}) {
    return `${input.sourceCollection}:${input.canonicalSourcePath}:${input.repairKind}:${input.missingContextReason || "missing_context"}`;
}

export function buildDebugRepairProposals(input: {
    proposals: RawAdminRepairProposal[];
    findings: RawAdminFindingForRepair[];
}) {
    const findingsByProposalId = new Map(input.findings.map((finding) => [finding.id, finding]));
    const proposals = Array.from(input.proposals.reduce((groups, proposal) => {
        const finding = findingsByProposalId.get(proposal.id)
            || input.findings.find((entry) => entry.sourceDocumentPath === proposal.sourceDocumentPath && entry.findingKey === proposal.findingKey);
        const repairKind = repairKindForAction(proposal.actionType);
        const missingContextReason = proposal.findingKey || finding?.findingKey || "missing_context";
        const canonicalSourcePath = proposal.sourceDocumentPath || `${proposal.sourceCollection}/${proposal.sourceDocumentId}`;
        const dedupeKey = buildDebugRepairProposalDedupeKey({ sourceCollection: proposal.sourceCollection, canonicalSourcePath, repairKind, missingContextReason });
        const existing = groups.get(dedupeKey);
        const duplicateProposalIds = existing ? Array.from(new Set([...existing.duplicateProposalIds, proposal.id])) : [proposal.id];
        const detectedAtMs = proposal.detectedAtMs || proposal.updatedAtMs;
        const updatedAtMs = proposal.updatedAtMs || proposal.detectedAtMs;

        groups.set(dedupeKey, {
            proposalId: existing?.proposalId ?? proposal.id,
            canonicalSourcePath,
            repairKind,
            status: existing?.status ?? normalizeProposalStatus(proposal.status),
            severity: existing?.severity === "error" ? "error" : severityForProposal(finding),
            actionability: existing?.actionability === "actionable" ? "actionable" : actionabilityForProposal(proposal.status, proposal.actionType),
            sourceContextState: sourceContextStateForProposal(missingContextReason, proposal.detail || finding?.detail || "", proposal.actionType),
            duplicateCount: duplicateProposalIds.length,
            duplicateProposalIds,
            firstSeenAtUtc: toUtcString(Math.min(Date.parse(existing?.firstSeenAtUtc ?? "") || detectedAtMs || updatedAtMs, detectedAtMs || updatedAtMs)),
            lastSeenAtUtc: toUtcString(Math.max(Date.parse(existing?.lastSeenAtUtc ?? "") || updatedAtMs || detectedAtMs, updatedAtMs || detectedAtMs)),
            suggestedAction: repairKind === "inspect_canonical_source"
                ? "Inspect the canonical source record and repair the writer that omitted required context."
                : "Queue the canonical repair only after confirming the grouped source record is safe to rebuild.",
            sourceType: proposal.sourceCollection,
            missingContextReason,
            missingContextFields: missingContextFieldsForProposal(proposal.sourceCollection, missingContextReason),
            dedupeKey,
            label: proposal.label,
            detail: proposal.detail,
            sourceDocumentPath: canonicalSourcePath,
            statusRaw: proposal.status,
            actionType: proposal.actionType,
            requiresAdminConfirmation: proposal.requiresAdminConfirmation,
        });
        return groups;
    }, new Map<string, DebugRepairProposal>()).values());

    const groups = buildDebugRepairProposalGroups(proposals);
    return { proposals: sortRepairProposals(proposals), proposalGroups: groups };
}

function sortRepairProposals(proposals: DebugRepairProposal[]) {
    return [...proposals].sort((left, right) => {
        const actionDelta = (right.actionability === "actionable" ? 1 : 0) - (left.actionability === "actionable" ? 1 : 0);
        return actionDelta || Date.parse(right.lastSeenAtUtc) - Date.parse(left.lastSeenAtUtc);
    });
}

export function buildDebugRepairProposalGroups(proposals: DebugRepairProposal[]) {
    return Array.from(proposals.reduce((groups, proposal) => {
        const groupKey = shouldGroupInspectProposal(proposal)
            ? `${proposal.sourceType}:group:${proposal.repairKind}:${proposal.missingContextReason || "missing_context"}`
            : proposal.dedupeKey;
        const existing = groups.get(groupKey);
        const records = existing ? [...existing.visibleRecords, proposal] : [proposal];
        const affectedProposalIds = Array.from(new Set([...(existing?.affectedProposalIds ?? []), ...proposal.duplicateProposalIds]));
        const canonicalSourcePaths = Array.from(new Set([...(existing?.canonicalSourcePaths ?? []), proposal.canonicalSourcePath]));
        const duplicateCount = records.reduce((total, entry) => total + Math.max(0, entry.duplicateCount - 1), 0);
        const sortedRecords = sortRepairProposals(records);
        const visibleRecords = sortedRecords.slice(0, 5);
        const affectedRecordCount = canonicalSourcePaths.length;
        const firstRecord = visibleRecords[0] ?? proposal;

        groups.set(groupKey, {
            groupId: groupKey,
            title: shouldGroupInspectProposal(proposal) ? groupedRepairTitle(proposal.sourceType) : proposal.label,
            sourceCollection: proposal.sourceType,
            repairKind: proposal.repairKind,
            missingContextReason: proposal.missingContextReason,
            actionability: proposal.actionability,
            sourceContextState: proposal.sourceContextState,
            severity: records.some((entry) => entry.severity === "error") ? "error" : records.some((entry) => entry.severity === "review") ? "review" : "info",
            status: records.some((entry) => entry.status === "open") ? "open" : firstRecord.status,
            duplicateCount,
            affectedRecordCount,
            hiddenRecordCount: Math.max(0, affectedRecordCount - visibleRecords.length),
            firstSeenAtUtc: toUtcString(Math.min(...records.map((entry) => Date.parse(entry.firstSeenAtUtc)))),
            lastSeenAtUtc: toUtcString(Math.max(...records.map((entry) => Date.parse(entry.lastSeenAtUtc)))),
            suggestedAction: proposal.actionability === "inspect_only"
                ? "Inspect the grouped canonical source records and repair the writer that omitted required context."
                : proposal.suggestedAction,
            missingContextFields: Array.from(new Set(records.flatMap((entry) => entry.missingContextFields))),
            visibleRecords,
            affectedProposalIds,
            canonicalSourcePaths,
            representativeProposalId: firstRecord.proposalId,
            dedupeKey: groupKey,
        });
        return groups;
    }, new Map<string, DebugRepairProposalGroup>()).values())
        .sort((left, right) => {
            const actionDelta = (right.actionability === "actionable" ? 1 : 0) - (left.actionability === "actionable" ? 1 : 0);
            return actionDelta || Date.parse(right.lastSeenAtUtc) - Date.parse(left.lastSeenAtUtc);
        });
}
