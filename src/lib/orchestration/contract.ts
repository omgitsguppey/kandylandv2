export const ORCHESTRATION_ENGINE_VERSION = "2026.03.24.1";

export const ORCHESTRATION_COLLECTIONS = {
    events: "orchestration_events",
    findings: "orchestration_findings",
    repairProposals: "orchestration_repair_proposals",
    repairActions: "orchestration_repair_actions",
    actorSummaries: "orchestration_actor_summaries",
    sessionOwnership: "orchestration_session_ownership",
} as const;

export type OrchestrationSourceCollection =
    | "analytics_event_facts"
    | "analytics_guest_batches"
    | "analytics_watch_sessions"
    | "analytics_watch_assets"
    | "daily_task_events"
    | "security_events"
    | "transactions"
    | "creator_relationships"
    | "creator_subscriptions"
    | "creator_messages"
    | "creator_broadcasts"
    | "creator_custom_requests"
    | "creator_call_bookings"
    | "creator_ledger_accruals"
    | "creator_payout_requests"
    | "notifications";

export type OrchestrationSourceMutation = "create" | "update" | "delete" | "repair";

export type OrchestrationDomain =
    | "telemetry"
    | "watch_time"
    | "tasks"
    | "security"
    | "commerce"
    | "creator"
    | "notifications"
    | "operations";

export type OrchestrationActorType = "guest" | "user" | "creator" | "admin" | "system";

export type OrchestrationSeverity = "info" | "warn" | "error";

export type OrchestrationRepairActionType =
    | "rebuild_projection"
    | "inspect_source_record";

export type OrchestrationRecordStatus =
    | "healthy"
    | "observing"
    | "attention"
    | "critical";

export type OrchestrationFindingStatus =
    | "open"
    | "resolved"
    | "dismissed"
    | "applying"
    | "reviewed_no_change";

export interface OrchestrationActorOwnership {
    actorType: OrchestrationActorType;
    actorId: string;
    actorLabel: string;
    actorKey: string;
    creatorContextId: string | null;
    creatorContextLabel: string | null;
    projectContext: string;
    contaminationRisk: boolean;
}

export interface OrchestrationSessionOwnership {
    sessionKey: string;
    sourceSurface: string;
    routePath: string;
}

export interface OrchestrationDependencyReadiness {
    ready: string[];
    missing: string[];
}

export interface OrchestrationReadinessTags {
    trainingEligible: boolean;
    trainingBlockedReasons: string[];
    recommendationReady: boolean;
    recommendationBlockedReasons: string[];
    creatorLikenessEligible: boolean;
    creatorChatTrainingEligible: boolean;
    lowConfidence: boolean;
    incomplete: boolean;
}

export interface OrchestrationEventRecord {
    engineVersion: string;
    sourceCollection: OrchestrationSourceCollection;
    sourceDocumentId: string;
    sourceDocumentPath: string;
    sourceDocumentKey: string;
    sourceMutation: OrchestrationSourceMutation;
    domain: OrchestrationDomain;
    systemKey: string;
    normalizedEventName: string;
    normalizedLabel: string;
    humanSummary: string;
    explanation: string;
    observedAtMs: number;
    occurredAtMs: number;
    actor: OrchestrationActorOwnership;
    session: OrchestrationSessionOwnership;
    dependencyReadiness: OrchestrationDependencyReadiness;
    fallbackObservations: string[];
    readiness: OrchestrationReadinessTags;
    status: OrchestrationRecordStatus;
    findingCount: number;
    proposalCount: number;
}

export interface OrchestrationRepairDescriptor {
    actionType: OrchestrationRepairActionType;
    label: string;
    detail: string;
    requiresAdminConfirmation: boolean;
}

export interface OrchestrationFindingRecord {
    findingKey: string;
    sourceDocumentKey: string;
    sourceCollection: OrchestrationSourceCollection;
    sourceDocumentPath: string;
    sourceDocumentId: string;
    domain: OrchestrationDomain;
    systemKey: string;
    severity: OrchestrationSeverity;
    status: OrchestrationFindingStatus;
    title: string;
    detail: string;
    humanSummary: string;
    fixSummary: string;
    detectedAtMs: number;
    updatedAtMs: number;
    actorKey: string;
    sessionKey: string;
    eventRecordId: string;
    repair: OrchestrationRepairDescriptor;
}

export interface OrchestrationRepairProposalRecord {
    proposalKey: string;
    sourceDocumentKey: string;
    sourceCollection: OrchestrationSourceCollection;
    sourceDocumentPath: string;
    sourceDocumentId: string;
    findingKey: string;
    status: OrchestrationFindingStatus;
    actionType: OrchestrationRepairActionType;
    label: string;
    detail: string;
    requiresAdminConfirmation: boolean;
    detectedAtMs: number;
    updatedAtMs: number;
    eventRecordId: string;
}
