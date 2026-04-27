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

    const openFindings = findings.filter((entry) => entry.status === "open");
    const actionableProposals = proposals.filter((entry) => entry.status === "open" && entry.actionType === "rebuild_projection");
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
            contaminationRisks,
            trainingEligible,
            recommendationReady,
            lowConfidenceEvents,
        },
        domainSummary,
        dependencyReadiness,
        events: events.slice(0, 60),
        findings: findings.slice(0, 40),
        proposals: proposals.slice(0, 40),
        actorSummaries: actorSummaries.slice(0, 30),
        repairActions: repairActions.slice(0, 30),
    };
}
