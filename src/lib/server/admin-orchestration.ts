import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

function toNumber(value: unknown) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
}

function toStringValue(value: unknown) {
    return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
        : [];
}

function asRecord(value: unknown) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

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

function actionabilityForProposal(input: {
    status: string;
    actionType: string;
}): DebugRepairProposal["actionability"] {
    if (input.status !== "open") return "not_actionable";
    if (input.actionType === "rebuild_projection") return "actionable";
    if (input.actionType === "inspect_source_record") return "inspect_only";
    return "manual_review";
}

function severityForProposal(finding?: { severity: string }): DebugRepairProposal["severity"] {
    if (finding?.severity === "error") return "error";
    if (finding?.severity === "warn") return "review";
    return "info";
}

function sourceContextStateForProposal(input: {
    findingKey: string;
    detail: string;
    actionType: string;
}): DebugRepairProposal["sourceContextState"] {
    const contextText = `${input.findingKey} ${input.detail}`.toLowerCase();
    if (contextText.includes("missing") || input.actionType === "inspect_source_record") {
        return "missing_required_context";
    }
    if (contextText.includes("stale")) return "stale";
    return "unknown";
}

function missingContextFieldsForProposal(input: {
    sourceCollection: string;
    findingKey: string;
}) {
    const fields = new Set<string>();
    if (input.findingKey === "missing_actor_context") {
        fields.add("userId");
        fields.add("actor ownership");
    }
    if (input.findingKey === "missing_route_context") {
        fields.add("routePath");
        fields.add("sourceSurface");
    }
    if (input.findingKey === "viewer_event_missing_watch_session") {
        fields.add("watchSessionId");
        fields.add("sessionId");
    }
    if (input.findingKey === "notification_missing_target_user") {
        fields.add("userId");
        fields.add("notification type");
        fields.add("source event");
    }
    if (input.findingKey === "creator_signal_missing_creator_context") {
        fields.add("creatorId");
        fields.add("creator context");
    }
    if (input.findingKey === "security_event_missing_surface_context") {
        fields.add("routePath");
        fields.add("sourceSurface");
    }
    if (input.sourceCollection === "analytics_event_facts" && fields.size === 0) {
        fields.add("userId");
        fields.add("sessionId");
        fields.add("sourceSurface");
        fields.add("dropId");
    }
    if (input.sourceCollection === "notifications" && fields.size === 0) {
        fields.add("userId");
        fields.add("notification type");
        fields.add("source event");
    }
    return Array.from(fields);
}

function buildDedupeKey(input: {
    canonicalSourcePath: string;
    repairKind: DebugRepairProposal["repairKind"];
    missingContextReason: string;
}) {
    return `${input.canonicalSourcePath}:${input.repairKind}:${input.missingContextReason || "no-reason"}`;
}

function toUtcString(value: number) {
    return new Date(value > 0 ? value : Date.now()).toISOString();
}

export function buildAdminOrchestrationSnapshot(input: {
    eventDocs: QueryDocumentSnapshot[];
    findingDocs: QueryDocumentSnapshot[];
    proposalDocs: QueryDocumentSnapshot[];
    actorSummaryDocs: QueryDocumentSnapshot[];
    repairActionDocs: QueryDocumentSnapshot[];
}) {
    const events = input.eventDocs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const actor = asRecord(data.actor);
        const session = asRecord(data.session);
        const readiness = asRecord(data.readiness);
        const dependencyReadiness = asRecord(data.dependencyReadiness);

        return {
            id: doc.id,
            sourceCollection: toStringValue(data.sourceCollection),
            sourceDocumentPath: toStringValue(data.sourceDocumentPath),
            sourceMutation: toStringValue(data.sourceMutation),
            domain: toStringValue(data.domain),
            systemKey: toStringValue(data.systemKey),
            normalizedEventName: toStringValue(data.normalizedEventName),
            normalizedLabel: toStringValue(data.normalizedLabel),
            humanSummary: toStringValue(data.humanSummary),
            explanation: toStringValue(data.explanation),
            observedAtMs: toNumber(data.observedAtMs),
            occurredAtMs: toNumber(data.occurredAtMs),
            status: toStringValue(data.status),
            findingCount: toNumber(data.findingCount),
            proposalCount: toNumber(data.proposalCount),
            actor: {
                actorType: toStringValue(actor.actorType),
                actorId: toStringValue(actor.actorId),
                actorLabel: toStringValue(actor.actorLabel),
                actorKey: toStringValue(actor.actorKey),
                contaminationRisk: actor.contaminationRisk === true,
                creatorContextId: toStringValue(actor.creatorContextId) || null,
                creatorContextLabel: toStringValue(actor.creatorContextLabel) || null,
                projectContext: toStringValue(actor.projectContext) || "kandydrops",
            },
            session: {
                sessionKey: toStringValue(session.sessionKey),
                sourceSurface: toStringValue(session.sourceSurface),
                routePath: toStringValue(session.routePath),
            },
            dependencyReadiness: {
                ready: toStringArray(dependencyReadiness.ready),
                missing: toStringArray(dependencyReadiness.missing),
            },
            fallbackObservations: toStringArray(data.fallbackObservations),
            readiness: {
                trainingEligible: readiness.trainingEligible === true,
                trainingBlockedReasons: toStringArray(readiness.trainingBlockedReasons),
                recommendationReady: readiness.recommendationReady === true,
                recommendationBlockedReasons: toStringArray(readiness.recommendationBlockedReasons),
                creatorLikenessEligible: readiness.creatorLikenessEligible === true,
                creatorChatTrainingEligible: readiness.creatorChatTrainingEligible === true,
                lowConfidence: readiness.lowConfidence === true,
                incomplete: readiness.incomplete === true,
            },
        };
    });

    const findings = input.findingDocs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        const repair = asRecord(data.repair);
        return {
            id: doc.id,
            findingKey: toStringValue(data.findingKey),
            sourceDocumentPath: toStringValue(data.sourceDocumentPath),
            domain: toStringValue(data.domain),
            systemKey: toStringValue(data.systemKey),
            severity: toStringValue(data.severity),
            status: toStringValue(data.status),
            title: toStringValue(data.title),
            detail: toStringValue(data.detail),
            humanSummary: toStringValue(data.humanSummary),
            fixSummary: toStringValue(data.fixSummary),
            detectedAtMs: toNumber(data.detectedAtMs),
            updatedAtMs: toNumber(data.updatedAtMs),
            actorKey: toStringValue(data.actorKey),
            sessionKey: toStringValue(data.sessionKey),
            eventRecordId: toStringValue(data.eventRecordId),
            repair: {
                actionType: toStringValue(repair.actionType),
                label: toStringValue(repair.label),
                detail: toStringValue(repair.detail),
                requiresAdminConfirmation: repair.requiresAdminConfirmation === true,
            },
        };
    });

    const proposals = input.proposalDocs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
            id: doc.id,
            proposalKey: toStringValue(data.proposalKey),
            sourceCollection: toStringValue(data.sourceCollection),
            sourceDocumentId: toStringValue(data.sourceDocumentId),
            sourceDocumentPath: toStringValue(data.sourceDocumentPath),
            findingKey: toStringValue(data.findingKey),
            status: toStringValue(data.status),
            actionType: toStringValue(data.actionType),
            label: toStringValue(data.label),
            detail: toStringValue(data.detail),
            requiresAdminConfirmation: data.requiresAdminConfirmation === true,
            detectedAtMs: toNumber(data.detectedAtMs),
            updatedAtMs: toNumber(data.updatedAtMs),
            eventRecordId: toStringValue(data.eventRecordId),
        };
    });

    const actorSummaries = input.actorSummaryDocs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
            id: doc.id,
            actorType: toStringValue(data.actorType),
            actorLabel: toStringValue(data.actorLabel),
            actorId: toStringValue(data.actorId),
            lastSeenAtMs: toNumber(data.lastSeenAtMs),
            eventCount: toNumber(data.eventCount),
            warningCount: toNumber(data.warningCount),
            criticalCount: toNumber(data.criticalCount),
            contaminationCount: toNumber(data.contaminationCount),
            topDomains: toStringArray(data.topDomains),
            topSurfaces: toStringArray(data.topSurfaces),
        };
    });

    const repairActions = input.repairActionDocs.map((doc) => {
        const data = doc.data() as Record<string, unknown>;
        return {
            id: doc.id,
            proposalId: toStringValue(data.proposalId),
            actionType: toStringValue(data.actionType),
            status: toStringValue(data.status),
            createdAtMs: toNumber(data.createdAtMs),
            appliedAtMs: toNumber(data.appliedAtMs),
            resultSummary: toStringValue(data.resultSummary),
        };
    });

    const findingsByProposalId = new Map(findings.map((finding) => [finding.id, finding]));
    const debugRepairProposals = Array.from(proposals.reduce((groups, proposal) => {
        const finding = findingsByProposalId.get(proposal.id)
            || findings.find((entry) => entry.sourceDocumentPath === proposal.sourceDocumentPath && entry.findingKey === proposal.findingKey);
        const repairKind = repairKindForAction(proposal.actionType);
        const missingContextReason = proposal.findingKey || finding?.findingKey || "no-reason";
        const canonicalSourcePath = proposal.sourceDocumentPath || `${proposal.sourceCollection}/${proposal.sourceDocumentId}`;
        const dedupeKey = buildDedupeKey({ canonicalSourcePath, repairKind, missingContextReason });
        const existing = groups.get(dedupeKey);
        const detectedAtMs = proposal.detectedAtMs || proposal.updatedAtMs;
        const updatedAtMs = proposal.updatedAtMs || proposal.detectedAtMs;
        const proposalId = existing?.proposalId ?? proposal.id;
        const duplicateProposalIds = existing
            ? Array.from(new Set([...existing.duplicateProposalIds, proposal.id]))
            : [proposal.id];

        groups.set(dedupeKey, {
            proposalId,
            canonicalSourcePath,
            repairKind,
            status: existing?.status ?? normalizeProposalStatus(proposal.status),
            severity: existing?.severity === "error" ? "error" : severityForProposal(finding),
            actionability: existing?.actionability === "actionable" ? "actionable" : actionabilityForProposal({
                status: proposal.status,
                actionType: proposal.actionType,
            }),
            sourceContextState: sourceContextStateForProposal({
                findingKey: missingContextReason,
                detail: proposal.detail || finding?.detail || "",
                actionType: proposal.actionType,
            }),
            duplicateCount: duplicateProposalIds.length,
            duplicateProposalIds,
            firstSeenAtUtc: toUtcString(Math.min(
                Date.parse(existing?.firstSeenAtUtc ?? "") || detectedAtMs || updatedAtMs,
                detectedAtMs || updatedAtMs,
            )),
            lastSeenAtUtc: toUtcString(Math.max(
                Date.parse(existing?.lastSeenAtUtc ?? "") || updatedAtMs || detectedAtMs,
                updatedAtMs || detectedAtMs,
            )),
            suggestedAction: repairKind === "inspect_canonical_source"
                ? "Inspect the canonical source record and repair the writer that omitted required context."
                : "Queue the canonical repair only after confirming the grouped source record is safe to rebuild.",
            sourceType: proposal.sourceCollection,
            missingContextReason,
            missingContextFields: missingContextFieldsForProposal({
                sourceCollection: proposal.sourceCollection,
                findingKey: missingContextReason,
            }),
            dedupeKey,
            label: proposal.label,
            detail: proposal.detail,
            sourceDocumentPath: canonicalSourcePath,
            statusRaw: proposal.status,
            actionType: proposal.actionType,
            requiresAdminConfirmation: proposal.requiresAdminConfirmation,
        } satisfies DebugRepairProposal);
        return groups;
    }, new Map<string, DebugRepairProposal>()).values())
        .sort((left, right) => {
            const actionDelta = (right.actionability === "actionable" ? 1 : 0) - (left.actionability === "actionable" ? 1 : 0);
            return actionDelta || Date.parse(right.lastSeenAtUtc) - Date.parse(left.lastSeenAtUtc);
        });

    const openFindings = findings.filter((entry) => entry.status === "open");
    const actionableProposals = debugRepairProposals.filter((entry) => entry.status === "open" && entry.actionability === "actionable");
    const inspectOnlyProposals = debugRepairProposals.filter((entry) => entry.status === "open" && entry.actionability === "inspect_only");
    const duplicateProposalCount = debugRepairProposals.reduce((total, proposal) => total + Math.max(0, proposal.duplicateCount - 1), 0);
    const criticalFindings = openFindings.filter((entry) => entry.severity === "error");
    const contaminationRisks = events.filter((entry) => entry.actor.contaminationRisk).length;
    const lowConfidenceEvents = events.filter((entry) => entry.readiness.lowConfidence || entry.readiness.incomplete).length;
    const trainingEligible = events.filter((entry) => entry.readiness.trainingEligible).length;
    const recommendationReady = events.filter((entry) => entry.readiness.recommendationReady).length;

    const domainSummary = Array.from(events.reduce((map, entry) => {
        const current = map.get(entry.domain) || {
            key: entry.domain,
            eventCount: 0,
            findingCount: 0,
            openFindingCount: 0,
            trainingEligibleCount: 0,
            recommendationReadyCount: 0,
            lowConfidenceCount: 0,
        };
        current.eventCount += 1;
        current.findingCount += entry.findingCount;
        current.trainingEligibleCount += entry.readiness.trainingEligible ? 1 : 0;
        current.recommendationReadyCount += entry.readiness.recommendationReady ? 1 : 0;
        current.lowConfidenceCount += entry.readiness.lowConfidence || entry.readiness.incomplete ? 1 : 0;
        map.set(entry.domain, current);
        return map;
    }, new Map<string, {
        key: string;
        eventCount: number;
        findingCount: number;
        openFindingCount: number;
        trainingEligibleCount: number;
        recommendationReadyCount: number;
        lowConfidenceCount: number;
    }>()).values()).map((entry) => ({
        ...entry,
        openFindingCount: openFindings.filter((finding) => finding.domain === entry.key).length,
    })).sort((left, right) => right.eventCount - left.eventCount);

    const dependencyReadiness = {
        actorMissingCount: events.filter((entry) => entry.dependencyReadiness.missing.includes("actor")).length,
        sessionMissingCount: events.filter((entry) => entry.dependencyReadiness.missing.includes("session")).length,
        routeMissingCount: events.filter((entry) => entry.dependencyReadiness.missing.includes("route")).length,
        creatorContextMissingCount: events.filter((entry) => entry.dependencyReadiness.missing.includes("creator_context")).length,
    };

    // Capped penalties — each category is bounded so high-volume signals
    // degrade the score proportionally instead of zeroing it out.
    const criticalPenalty = Math.min(criticalFindings.length * 5, 30);
    const nonCriticalPenalty = Math.min((openFindings.length - criticalFindings.length) * 1, 25);
    const contaminationPenalty = Math.min(contaminationRisks * 3, 15);
    const lowConfidencePenalty = Math.min(Math.round(lowConfidenceEvents * 0.5), 20);

    let score = Math.max(0, Math.round(
        100 - criticalPenalty - nonCriticalPenalty - contaminationPenalty - lowConfidencePenalty,
    ));

    // Ceiling rules — prevent false-green when structural issues exist
    if (criticalFindings.length > 0) score = Math.min(score, 60);
    if (openFindings.length >= 20) score = Math.min(score, 70);

    return {
        summary: {
            score,
            eventCount: events.length,
            openFindings: openFindings.length,
            criticalFindings: criticalFindings.length,
            actionableProposals: actionableProposals.length,
            inspectOnlyProposals: inspectOnlyProposals.length,
            dedupedProposals: debugRepairProposals.length,
            duplicateProposalsCollapsed: duplicateProposalCount,
            contaminationRisks,
            trainingEligible,
            recommendationReady,
            lowConfidenceEvents,
        },
        domainSummary,
        dependencyReadiness,
        events: events.slice(0, 60),
        findings: findings.slice(0, 40),
        proposals: debugRepairProposals.slice(0, 40),
        actorSummaries: actorSummaries.slice(0, 30),
        repairActions: repairActions.slice(0, 30),
    };
}
