import "server-only";

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

import { buildDebugRepairProposals } from "@/lib/server/admin-orchestration-repairs";
import type { OrchestrationSourceCollection } from "@/lib/orchestration/contract";

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

type BehaviorEventContext =
    | "foreground_user"
    | "identity_linkage"
    | "background_task_engine"
    | "background_ledger"
    | "materialized_relationship"
    | "notification_system"
    | "server_system"
    | "security_system"
    | "admin";

type BehaviorCoverageDomain = "telemetry" | "tasks" | "commerce" | "creator" | "notifications" | "security";

type GapCount = {
    requiredMissing: number;
    optionalMissing: number;
    backgroundExempt: number;
    affectedDomains: string[];
};

type HealthPenalty = {
    reasonCode: string;
    count: number;
    weight: number;
    appliedPenalty: number;
};

function mapSourceCollectionToBehaviorDomain(sourceCollection: string, eventDomain: string): BehaviorCoverageDomain {
    if (eventDomain === "tasks" || sourceCollection === "daily_task_events") return "tasks";
    if (eventDomain === "commerce" || sourceCollection === "transactions") return "commerce";
    if (eventDomain === "creator" || sourceCollection.startsWith("creator_")) return "creator";
    if (eventDomain === "notifications" || sourceCollection === "notifications") return "notifications";
    if (eventDomain === "security" || sourceCollection === "security_events") return "security";
    return "telemetry";
}

function getBehaviorEventContext(event: {
    sourceCollection: string;
    normalizedEventName: string;
    actorType: string;
    behaviorDomain: BehaviorCoverageDomain;
    sourceSurface: string;
}) {
    if (
        event.behaviorDomain === "notifications"
        && [
            "notification_read",
            "notification_opened",
            "notification_action_clicked",
            "notifications_dropdown_opened",
        ].includes(event.normalizedEventName)
    ) {
        return "foreground_user" as const;
    }
    if (event.normalizedEventName === "identity_linked") return "identity_linkage" as const;
    if (event.sourceCollection === "daily_task_events" || event.behaviorDomain === "tasks") return "background_task_engine" as const;
    if (event.sourceCollection === "transactions" && event.behaviorDomain === "commerce") return "background_ledger" as const;
    if (event.sourceCollection === "creator_relationships") return "materialized_relationship" as const;
    if (event.behaviorDomain === "notifications" || event.sourceCollection === "notifications") return "notification_system" as const;
    if (event.behaviorDomain === "security" || event.sourceCollection === "security_events") return "security_system" as const;
    if (event.actorType === "admin") return "admin" as const;
    if (event.actorType === "system" || event.sourceSurface === "background") return "server_system" as const;
    return "foreground_user" as const;
}

function uniqueStrings(values: string[]) {
    return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function incrementGap(gap: GapCount, bucket: keyof Omit<GapCount, "affectedDomains">, domain: string) {
    gap[bucket] += 1;
    if (!gap.affectedDomains.includes(domain)) {
        gap.affectedDomains.push(domain);
    }
}

function createGapCount(): GapCount {
    return {
        requiredMissing: 0,
        optionalMissing: 0,
        backgroundExempt: 0,
        affectedDomains: [],
    };
}

function buildPenalty(reasonCode: string, count: number, weight: number, cap?: number): HealthPenalty {
    const rawPenalty = count * weight;
    return {
        reasonCode,
        count,
        weight,
        appliedPenalty: cap === undefined ? rawPenalty : Math.min(rawPenalty, cap),
    };
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
        const sourceCollection = toStringValue(data.sourceCollection);
        const rawDomain = toStringValue(data.domain);
        const normalizedEventName = toStringValue(data.normalizedEventName);
        const actorType = toStringValue(actor.actorType);
        const sourceSurface = toStringValue(session.sourceSurface);
        const behaviorDomain = mapSourceCollectionToBehaviorDomain(sourceCollection, rawDomain);
        const eventContext = getBehaviorEventContext({
            sourceCollection,
            normalizedEventName,
            actorType,
            behaviorDomain,
            sourceSurface,
        });
        const missingDependencies = toStringArray(dependencyReadiness.missing);
        const evalEligibleByContext = readiness.trainingEligible === true
            && eventContext === "foreground_user"
            && actorType !== "system";
        const lowConfidenceRequired = (readiness.lowConfidence === true || readiness.incomplete === true)
            && evalEligibleByContext;

        return {
            id: doc.id,
            sourceCollection,
            sourceDocumentPath: toStringValue(data.sourceDocumentPath),
            sourceMutation: toStringValue(data.sourceMutation),
            domain: rawDomain,
            behaviorDomain,
            eventContext,
            systemKey: toStringValue(data.systemKey),
            normalizedEventName,
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
                sourceSurface,
                routePath: toStringValue(session.routePath),
            },
            dependencyReadiness: {
                ready: toStringArray(dependencyReadiness.ready),
                missing: missingDependencies,
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
            evalEligibleByContext,
            lowConfidenceRequired,
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

    const {
        proposals: debugRepairProposals,
        proposalGroups: debugRepairProposalGroups,
    } = buildDebugRepairProposals({ proposals, findings });

    const openFindings = findings.filter((entry) => entry.status === "open");
    const actionableProposals = debugRepairProposalGroups.filter((entry) => entry.status === "open" && entry.actionability === "actionable");
    const inspectOnlyProposals = debugRepairProposalGroups.filter((entry) => entry.status === "open" && entry.actionability === "inspect_only");
    const duplicateProposalCount = debugRepairProposals.reduce((total, proposal) => total + Math.max(0, proposal.duplicateCount - 1), 0);
    const groupedSourceRecordCount = debugRepairProposalGroups.reduce((total, group) => total + Math.max(0, group.affectedRecordCount - 1), 0);
    const uniqueFindingGroups = Array.from(openFindings.reduce((map, finding) => {
        const behaviorDomain = mapSourceCollectionToBehaviorDomain("", finding.domain);
        const key = [
            behaviorDomain,
            finding.findingKey,
            finding.sourceDocumentPath || "no-source",
            finding.eventRecordId || "no-event",
        ].join("|");
        const current = map.get(key) || {
            key,
            domain: behaviorDomain,
            severity: finding.severity,
            count: 0,
        };
        current.count += 1;
        current.severity = current.severity === "error" || finding.severity === "error"
            ? "error"
            : current.severity === "warn" || finding.severity === "warn"
                ? "warn"
                : "info";
        map.set(key, current);
        return map;
    }, new Map<string, {
        key: string;
        domain: BehaviorCoverageDomain;
        severity: string;
        count: number;
    }>()).values());
    const uniqueOpenFindingCount = uniqueFindingGroups.length;
    const duplicateFindingCount = uniqueFindingGroups.reduce((total, group) => total + Math.max(0, group.count - 1), 0) + duplicateProposalCount;
    const criticalFindings = uniqueFindingGroups.filter((entry) => entry.severity === "error");
    const reviewFindings = uniqueFindingGroups.filter((entry) => entry.severity === "warn");
    const contaminationRisks = events.filter((entry) => entry.actor.contaminationRisk).length;
    const lowConfidenceEvents = events.filter((entry) => entry.readiness.lowConfidence || entry.readiness.incomplete).length;
    const lowConfidenceRequiredEvents = events.filter((entry) => entry.lowConfidenceRequired).length;
    const trainingEligible = events.filter((entry) => entry.evalEligibleByContext).length;
    const recommendationReady = events.filter((entry) => entry.readiness.recommendationReady).length;
    const inspectOnlyFindingCount = inspectOnlyProposals.length;

    const dependencyReadiness = {
        actorMissing: createGapCount(),
        sessionMissing: createGapCount(),
        routeMissing: createGapCount(),
        creatorContextMissing: createGapCount(),
    };

    events.forEach((entry) => {
        const missing = uniqueStrings(entry.dependencyReadiness.missing);
        const domain = entry.behaviorDomain as BehaviorCoverageDomain;
        const actorRequired = ["foreground_user", "identity_linkage", "background_task_engine", "background_ledger", "materialized_relationship", "admin"].includes(entry.eventContext);
        const sessionRequired = entry.evalEligibleByContext;
        const routeRequired = entry.eventContext === "foreground_user" || entry.eventContext === "admin";
        const creatorRequired = domain === "creator" && entry.eventContext !== "materialized_relationship";

        if (missing.includes("actor")) {
            incrementGap(
                dependencyReadiness.actorMissing,
                actorRequired ? "requiredMissing" : entry.eventContext === "security_system" || entry.eventContext === "server_system" ? "backgroundExempt" : "optionalMissing",
                domain,
            );
        }
        if (missing.includes("session")) {
            incrementGap(
                dependencyReadiness.sessionMissing,
                sessionRequired ? "requiredMissing" : entry.eventContext === "background_task_engine" || entry.eventContext === "background_ledger" || entry.eventContext === "notification_system" || entry.eventContext === "server_system" || entry.eventContext === "materialized_relationship" ? "backgroundExempt" : "optionalMissing",
                domain,
            );
        }
        if (missing.includes("route")) {
            incrementGap(
                dependencyReadiness.routeMissing,
                routeRequired ? "requiredMissing" : entry.eventContext === "background_task_engine" || entry.eventContext === "background_ledger" || entry.eventContext === "notification_system" || entry.eventContext === "server_system" || entry.eventContext === "materialized_relationship" || entry.eventContext === "identity_linkage" || entry.eventContext === "security_system" ? "backgroundExempt" : "optionalMissing",
                domain,
            );
        }
        if (missing.includes("creator_context")) {
            incrementGap(
                dependencyReadiness.creatorContextMissing,
                creatorRequired ? "requiredMissing" : entry.eventContext === "materialized_relationship" ? "backgroundExempt" : "optionalMissing",
                domain,
            );
        }
    });

    const domainOrder: BehaviorCoverageDomain[] = ["telemetry", "tasks", "commerce", "creator", "notifications", "security"];
    const domainSummary = domainOrder.map((domain) => {
        const domainEvents = events.filter((entry) => entry.behaviorDomain === domain);
        const domainFindingGroups = uniqueFindingGroups.filter((group) => group.domain === domain);
        const domainProposalGroups = debugRepairProposalGroups.filter((group) => mapSourceCollectionToBehaviorDomain(group.sourceCollection as OrchestrationSourceCollection, group.sourceCollection) === domain && group.status === "open");
        const domainDuplicateFindings = domainFindingGroups.reduce((total, group) => total + Math.max(0, group.count - 1), 0)
            + domainProposalGroups.reduce((total, group) => total + group.duplicateCount, 0);
        const domainInspectOnlyFindings = domainProposalGroups.filter((group) => group.actionability === "inspect_only").length;
        const domainLowConfidenceCount = domainEvents.filter((entry) => entry.lowConfidenceRequired).length;
        const uniqueOpenFindingsForDomain = domainFindingGroups.length;
        const state = uniqueOpenFindingsForDomain === 0 && domainInspectOnlyFindings === 0
            ? "live"
            : domainFindingGroups.some((group) => group.severity === "error")
                ? "error"
                : uniqueOpenFindingsForDomain > 0 || domainInspectOnlyFindings > 0
                    ? "review"
                    : "info";
        const explanation = domainInspectOnlyFindings > 0 && domainDuplicateFindings > 0 && uniqueOpenFindingsForDomain <= domainEvents.length
            ? "Most findings are duplicate inspect-only source-context items."
            : uniqueOpenFindingsForDomain > domainEvents.length && domainEvents.length > 0
                ? "Open findings exceed event count because duplicate or grouped source-context items were collapsed separately."
                : uniqueOpenFindingsForDomain === 0
                    ? "Loaded domain sample has no unique open findings."
                    : "Unique findings are shown separately from duplicates and inspect-only items.";
        return {
            key: domain,
            domain,
            eventCount: domainEvents.length,
            findingCount: domainEvents.reduce((total, entry) => total + entry.findingCount, 0),
            openFindingCount: uniqueOpenFindingsForDomain,
            uniqueOpenFindings: uniqueOpenFindingsForDomain,
            duplicateFindings: domainDuplicateFindings,
            inspectOnlyFindings: domainInspectOnlyFindings,
            trainingEligibleCount: domainEvents.filter((entry) => entry.evalEligibleByContext).length,
            recommendationReadyCount: domainEvents.filter((entry) => entry.readiness.recommendationReady).length,
            lowConfidenceCount: domainLowConfidenceCount,
            state,
            explanation,
        };
    });

    const penalties = [
        buildPenalty("required_missing_actor", dependencyReadiness.actorMissing.requiredMissing, 12),
        buildPenalty("required_missing_session", dependencyReadiness.sessionMissing.requiredMissing, 6),
        buildPenalty("required_missing_route", dependencyReadiness.routeMissing.requiredMissing, 4),
        buildPenalty("unique_critical_findings", criticalFindings.length, 8),
        buildPenalty("unique_review_findings", reviewFindings.length, 2),
        buildPenalty("actionable_repairs", actionableProposals.length, 4),
        buildPenalty("low_confidence_required_events", lowConfidenceRequiredEvents, 1),
        buildPenalty("duplicate_findings_capped", duplicateFindingCount, 1, 5),
        buildPenalty("inspect_only_findings_capped", inspectOnlyFindingCount, 1, 10),
    ];

    let score = Math.max(0, Math.round(
        100 - penalties.reduce((total, penalty) => total + penalty.appliedPenalty, 0),
    ));

    if (criticalFindings.length > 0) score = Math.min(score, 60);
    if (dependencyReadiness.actorMissing.requiredMissing > 0) score = Math.min(score, 70);
    const healthState = score >= 90 ? "live" : score >= 70 ? "review" : "error";

    return {
        summary: {
            score,
            state: healthState,
            eventCount: events.length,
            openFindings: openFindings.length,
            uniqueOpenFindings: uniqueOpenFindingCount,
            duplicateFindings: duplicateFindingCount,
            inspectOnlyFindings: inspectOnlyFindingCount,
            criticalFindings: criticalFindings.length,
            actionableProposals: actionableProposals.length,
            inspectOnlyProposals: inspectOnlyProposals.length,
            dedupedProposals: debugRepairProposals.length,
            duplicateProposalsCollapsed: duplicateProposalCount,
            groupedProposalCards: debugRepairProposalGroups.length,
            groupedSourceRecordsCollapsed: groupedSourceRecordCount,
            contaminationRisks,
            trainingEligible,
            recommendationReady,
            lowConfidenceEvents,
            lowConfidenceRequiredEvents,
            evalEligibleDenominator: events.length,
            evalEligibleExplanation: `${trainingEligible} of ${events.length} recent normalized events are eval eligible after excluding background, system, and identity-linkage records.`,
            penalties,
        },
        domainSummary,
        dependencyReadiness: {
            actorMissingCount: dependencyReadiness.actorMissing.requiredMissing,
            sessionMissingCount: dependencyReadiness.sessionMissing.requiredMissing,
            routeMissingCount: dependencyReadiness.routeMissing.requiredMissing,
            creatorContextMissingCount: dependencyReadiness.creatorContextMissing.requiredMissing,
            actorMissing: dependencyReadiness.actorMissing,
            sessionMissing: dependencyReadiness.sessionMissing,
            routeMissing: dependencyReadiness.routeMissing,
            creatorContextMissing: dependencyReadiness.creatorContextMissing,
        },
        events: events.slice(0, 60),
        findings: findings.slice(0, 40),
        proposals: debugRepairProposals.slice(0, 40),
        proposalGroups: debugRepairProposalGroups.slice(0, 40),
        actorSummaries: actorSummaries.slice(0, 30),
        repairActions: repairActions.slice(0, 30),
    };
}
