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

type ActorRiskReasonCode =
    | "admin_behavior_exclusion_missing"
    | "system_event_in_user_behavior"
    | "creator_event_counted_as_user"
    | "missing_required_session"
    | "missing_required_route"
    | "actor_target_conflict"
    | "notification_target_missing"
    | "purchase_unlock_source_mismatch"
    | "synthetic_creator_metadata_incomplete"
    | "unknown";

type ActorRiskReason = {
    reasonCode: ActorRiskReasonCode;
    severity: "info" | "warn" | "error";
    count: number;
    domain: string;
    appliesToBleedRisk: boolean;
    explanation: string;
    sampleEventId?: string;
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

function actorKeyForMatch(input: {
    actorKey?: string;
    actorId?: string;
    actorLabel?: string;
    actorType?: string;
}) {
    return input.actorKey
        || input.actorId
        || input.actorLabel
        || input.actorType
        || "unknown";
}

function actorRiskReasonMeta(reasonCode: ActorRiskReasonCode) {
    switch (reasonCode) {
        case "admin_behavior_exclusion_missing":
            return {
                explanation: "Admin-originated events are entering user behavior ownership without an explicit exclusion path.",
                appliesToBleedRisk: true,
            };
        case "system_event_in_user_behavior":
            return {
                explanation: "Background or system events are being attributed to a user behavior lane and can contaminate scoring.",
                appliesToBleedRisk: true,
            };
        case "creator_event_counted_as_user":
            return {
                explanation: "Creator-lane activity is being counted as end-user behavior without a clean ownership split.",
                appliesToBleedRisk: true,
            };
        case "missing_required_session":
            return {
                explanation: "A foreground behavior event is missing required session ownership for scoring or replay attribution.",
                appliesToBleedRisk: false,
            };
        case "missing_required_route":
            return {
                explanation: "A foreground behavior event is missing required route or surface attribution.",
                appliesToBleedRisk: false,
            };
        case "actor_target_conflict":
            return {
                explanation: "Actor and target ownership disagree, so the event can bleed between user, creator, or system lanes.",
                appliesToBleedRisk: true,
            };
        case "notification_target_missing":
            return {
                explanation: "Notification ownership is missing a canonical target user, so inbox delivery cannot be tied back safely.",
                appliesToBleedRisk: true,
            };
        case "purchase_unlock_source_mismatch":
            return {
                explanation: "Commerce or unlock telemetry disagrees with its source-of-truth lane and can contaminate value analytics.",
                appliesToBleedRisk: true,
            };
        case "synthetic_creator_metadata_incomplete":
            return {
                explanation: "Synthetic creator metadata is incomplete, so the actor lane cannot be separated cleanly from user behavior.",
                appliesToBleedRisk: true,
            };
        default:
            return {
                explanation: "Risk count exists but no source reason was attached; inspect normalization evidence.",
                appliesToBleedRisk: false,
            };
    }
}

function detectActorRiskReasonCode(input: {
    actorType: string;
    findingKey?: string;
    detail?: string;
    title?: string;
    domain?: string;
    eventContext?: BehaviorEventContext;
    contaminationRisk?: boolean;
}): ActorRiskReasonCode {
    const text = [
        input.findingKey ?? "",
        input.detail ?? "",
        input.title ?? "",
        input.domain ?? "",
    ].join(" ").toLowerCase();

    if (text.includes("notification") && text.includes("target")) return "notification_target_missing";
    if (text.includes("actor_target_conflict") || (text.includes("actor") && text.includes("target") && text.includes("conflict"))) return "actor_target_conflict";
    if (text.includes("purchase_unlock_source_mismatch") || (text.includes("purchase") && text.includes("unlock") && text.includes("mismatch"))) return "purchase_unlock_source_mismatch";
    if (text.includes("synthetic") && text.includes("creator")) return "synthetic_creator_metadata_incomplete";
    if (text.includes("missing_session") || text.includes("missing session")) return "missing_required_session";
    if (text.includes("missing_route") || text.includes("missing route")) return "missing_required_route";
    if (text.includes("admin") && text.includes("behavior")) return "admin_behavior_exclusion_missing";
    if (text.includes("creator") && text.includes("user")) return "creator_event_counted_as_user";

    if (input.contaminationRisk) {
        if (input.actorType === "admin") return "admin_behavior_exclusion_missing";
        if (input.actorType === "creator") return "creator_event_counted_as_user";
        if (input.eventContext && input.eventContext !== "foreground_user") return "system_event_in_user_behavior";
    }

    return "unknown";
}

function addActorRiskReason(
    map: Map<string, ActorRiskReason>,
    input: {
        reasonCode: ActorRiskReasonCode;
        severity: "info" | "warn" | "error";
        domain: string;
        sampleEventId?: string;
        count?: number;
    },
) {
    const meta = actorRiskReasonMeta(input.reasonCode);
    const key = `${input.reasonCode}|${input.domain}|${input.sampleEventId ?? "no-sample"}`;
    const existing = map.get(key);
    if (existing) {
        existing.count += input.count ?? 1;
        if (existing.severity !== "error" && input.severity === "error") {
            existing.severity = "error";
        } else if (existing.severity === "info" && input.severity === "warn") {
            existing.severity = "warn";
        }
        if (!existing.sampleEventId && input.sampleEventId) {
            existing.sampleEventId = input.sampleEventId;
        }
        if (meta.appliesToBleedRisk) {
            existing.appliesToBleedRisk = true;
        }
        return;
    }

    map.set(key, {
        reasonCode: input.reasonCode,
        severity: input.severity,
        count: input.count ?? 1,
        domain: input.domain,
        appliesToBleedRisk: meta.appliesToBleedRisk,
        explanation: meta.explanation,
        sampleEventId: input.sampleEventId,
    });
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
            actorKey: toStringValue(data.actorKey),
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
    const eventIdsByActorKey = new Map<string, Set<string>>();
    const eventsByActorKey = new Map<string, typeof events>();
    events.forEach((entry) => {
        const actorKey = actorKeyForMatch({
            actorKey: entry.actor.actorKey,
            actorId: entry.actor.actorId,
            actorLabel: entry.actor.actorLabel,
            actorType: entry.actor.actorType,
        });
        const actorEvents = eventsByActorKey.get(actorKey) ?? [];
        actorEvents.push(entry);
        eventsByActorKey.set(actorKey, actorEvents);
        const eventIds = eventIdsByActorKey.get(actorKey) ?? new Set<string>();
        eventIds.add(entry.id);
        eventIdsByActorKey.set(actorKey, eventIds);
    });
    const contaminationRisksFromEvents = events.filter((entry) => entry.actor.contaminationRisk).length;
    const contaminationRisksFromRows = actorSummaries.reduce((total, actor) => total + actor.contaminationCount, 0);
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

    const actorSummariesWithReasons = actorSummaries.map((actor) => {
        const actorKey = actorKeyForMatch(actor);
        const actorEvents = eventsByActorKey.get(actorKey) ?? [];
        const actorEventIds = eventIdsByActorKey.get(actorKey) ?? new Set<string>();
        const actorFindings = openFindings.filter((finding) => {
            const findingActorKey = actorKeyForMatch({
                actorKey: finding.actorKey,
            });
            return findingActorKey === actorKey || (finding.eventRecordId ? actorEventIds.has(finding.eventRecordId) : false);
        });
        const reasonMap = new Map<string, ActorRiskReason>();

        actorEvents.forEach((event) => {
            if (!event.actor.contaminationRisk && !event.lowConfidenceRequired) {
                return;
            }
            const reasonCode = detectActorRiskReasonCode({
                actorType: event.actor.actorType,
                domain: event.behaviorDomain,
                eventContext: event.eventContext,
                contaminationRisk: event.actor.contaminationRisk,
            });
            addActorRiskReason(reasonMap, {
                reasonCode,
                severity: event.actor.contaminationRisk ? "error" : "warn",
                domain: event.behaviorDomain,
                sampleEventId: event.id,
            });
        });

        actorFindings.forEach((finding) => {
            const matchingEvent = finding.eventRecordId
                ? actorEvents.find((event) => event.id === finding.eventRecordId)
                : undefined;
            const reasonCode = detectActorRiskReasonCode({
                actorType: actor.actorType,
                findingKey: finding.findingKey,
                detail: finding.detail,
                title: finding.title,
                domain: finding.domain,
                eventContext: matchingEvent?.eventContext,
                contaminationRisk: matchingEvent?.actor.contaminationRisk,
            });
            addActorRiskReason(reasonMap, {
                reasonCode,
                severity: finding.severity === "error" ? "error" : finding.severity === "warn" ? "warn" : "info",
                domain: matchingEvent?.behaviorDomain ?? mapSourceCollectionToBehaviorDomain("", finding.domain),
                sampleEventId: finding.eventRecordId || matchingEvent?.id,
            });
        });

        if ((actor.criticalCount > 0 || actor.contaminationCount > 0) && reasonMap.size === 0) {
            addActorRiskReason(reasonMap, {
                reasonCode: "unknown",
                severity: actor.criticalCount > 0 ? "error" : "warn",
                domain: actor.topDomains[0] ?? "telemetry",
                count: Math.max(actor.criticalCount, actor.contaminationCount, 1),
            });
        }

        const riskReasons = Array.from(reasonMap.values()).sort((left, right) => {
            const severityDelta = (right.severity === "error" ? 2 : right.severity === "warn" ? 1 : 0)
                - (left.severity === "error" ? 2 : left.severity === "warn" ? 1 : 0);
            return severityDelta || right.count - left.count;
        }).slice(0, 4);
        const riskDomains = uniqueStrings(riskReasons.map((reason) => reason.domain));

        return {
            ...actor,
            riskReasons,
            riskDomains,
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
            contaminationRisks: Math.max(contaminationRisksFromEvents, contaminationRisksFromRows),
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
        actorSummaries: actorSummariesWithReasons.slice(0, 30),
        repairActions: repairActions.slice(0, 30),
    };
}
