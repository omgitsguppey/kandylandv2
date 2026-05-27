import type { CreatorDrop4xxClass } from "@/lib/creator-drops/creator-drop-4xx-policy";

export const CREATOR_DROP_WORKFLOW_STATES = [
    "draft",
    "ready_to_submit",
    "submitted",
    "pending_review",
    "approved",
    "rejected",
    "needs_changes",
    "scheduled",
    "live",
    "expired",
    "archived",
    "failed",
    "unknown_legacy",
] as const;

export type CreatorDropWorkflowState = typeof CREATOR_DROP_WORKFLOW_STATES[number];

export type CreatorDropActor = "creator_owner" | "assigned_creator" | "admin_reviewer" | "system" | "user_viewer";

export type CreatorDropTransitionKey =
    | "creator_creates_draft"
    | "creator_updates_draft"
    | "creator_submits_for_review"
    | "admin_reviews"
    | "admin_approves"
    | "admin_rejects"
    | "admin_requests_changes"
    | "system_schedules"
    | "system_expires"
    | "creator_archives"
    | "admin_archives";

export type CreatorDropWorkflowTransition = {
    transition: CreatorDropTransitionKey;
    allowedActor: CreatorDropActor;
    requiredPermission: string;
    requiredFields: readonly string[];
    validationErrorClass: CreatorDrop4xxClass;
    resultingStatus: CreatorDropWorkflowState;
    userVisibility: boolean;
    creatorVisibility: boolean;
    adminVisibility: boolean;
    rotationEligibility: boolean;
    telemetryEvent: string;
    debugLane: "creator_drop_workflow";
    fourxxPolicy: CreatorDrop4xxClass;
    nextRecoveryAction: string;
};

export const CREATOR_DROP_WORKFLOW_TRANSITIONS: readonly CreatorDropWorkflowTransition[] = [
    {
        transition: "creator_creates_draft",
        allowedActor: "creator_owner",
        requiredPermission: "creator.drop.write",
        requiredFields: ["creator_id"],
        validationErrorClass: "creator_not_configured",
        resultingStatus: "draft",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: false,
        rotationEligibility: false,
        telemetryEvent: "creator_drop_draft_created",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "creator_not_configured",
        nextRecoveryAction: "Show draft status and keep the drop hidden from public surfaces.",
    },
    {
        transition: "creator_updates_draft",
        allowedActor: "creator_owner",
        requiredPermission: "creator.drop.write",
        requiredFields: ["drop_id", "creator_id"],
        validationErrorClass: "stale_creator_draft",
        resultingStatus: "draft",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: false,
        rotationEligibility: false,
        telemetryEvent: "creator_drop_draft_saved",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "stale_creator_draft",
        nextRecoveryAction: "Refresh stale draft state and show save failure copy if the draft is gone.",
    },
    {
        transition: "creator_submits_for_review",
        allowedActor: "creator_owner",
        requiredPermission: "creator.drop.submit",
        requiredFields: ["title", "description", "cover_media", "content_asset", "unlock_cost", "valid_from"],
        validationErrorClass: "invalid_creator_drop_payload",
        resultingStatus: "pending_review",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: false,
        telemetryEvent: "creator_drop_submit_succeeded",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "invalid_creator_drop_payload",
        nextRecoveryAction: "Show pending review status and refresh creator/admin queues.",
    },
    {
        transition: "admin_reviews",
        allowedActor: "admin_reviewer",
        requiredPermission: "admin.drop.review",
        requiredFields: ["drop_id"],
        validationErrorClass: "admin_review_conflict",
        resultingStatus: "pending_review",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: false,
        telemetryEvent: "admin_creator_drop_review_viewed",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "admin_review_conflict",
        nextRecoveryAction: "Keep the pending submission visible in admin review without exposing it publicly.",
    },
    {
        transition: "admin_approves",
        allowedActor: "admin_reviewer",
        requiredPermission: "admin.drop.review",
        requiredFields: ["drop_id", "title", "description", "cover_media", "content_asset", "unlock_cost", "valid_from"],
        validationErrorClass: "media_required",
        resultingStatus: "approved",
        userVisibility: true,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: true,
        telemetryEvent: "admin_creator_drop_approved",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "media_required",
        nextRecoveryAction: "Validate full publish readiness before public discovery and rotation are enabled.",
    },
    {
        transition: "admin_rejects",
        allowedActor: "admin_reviewer",
        requiredPermission: "admin.drop.review",
        requiredFields: ["drop_id"],
        validationErrorClass: "admin_review_conflict",
        resultingStatus: "rejected",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: false,
        telemetryEvent: "admin_creator_drop_rejected",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "admin_review_conflict",
        nextRecoveryAction: "Show rejected status to the creator and keep the drop hidden from users.",
    },
    {
        transition: "admin_requests_changes",
        allowedActor: "admin_reviewer",
        requiredPermission: "admin.drop.review",
        requiredFields: ["drop_id"],
        validationErrorClass: "admin_review_conflict",
        resultingStatus: "needs_changes",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: false,
        telemetryEvent: "admin_creator_drop_needs_changes",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "admin_review_conflict",
        nextRecoveryAction: "Show needs changes status to the creator and allow resubmission after edits.",
    },
    {
        transition: "system_schedules",
        allowedActor: "system",
        requiredPermission: "system.drop.schedule",
        requiredFields: ["drop_id", "valid_from"],
        validationErrorClass: "creator_status_conflict",
        resultingStatus: "scheduled",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: false,
        telemetryEvent: "creator_drop_status_viewed",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "creator_status_conflict",
        nextRecoveryAction: "Keep scheduled status explicit until the drop becomes live.",
    },
    {
        transition: "system_expires",
        allowedActor: "system",
        requiredPermission: "system.drop.expire",
        requiredFields: ["drop_id", "valid_until"],
        validationErrorClass: "expired_drop_unavailable",
        resultingStatus: "expired",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: false,
        telemetryEvent: "creator_drop_status_viewed",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "expired_drop_unavailable",
        nextRecoveryAction: "Show expired status and require a new schedule before resubmission.",
    },
    {
        transition: "creator_archives",
        allowedActor: "creator_owner",
        requiredPermission: "creator.drop.archive",
        requiredFields: ["drop_id"],
        validationErrorClass: "creator_permission_denied",
        resultingStatus: "archived",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: false,
        telemetryEvent: "creator_drop_status_viewed",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "creator_permission_denied",
        nextRecoveryAction: "Keep archived creator drops hidden from users and visible to admins.",
    },
    {
        transition: "admin_archives",
        allowedActor: "admin_reviewer",
        requiredPermission: "admin.drop.archive",
        requiredFields: ["drop_id"],
        validationErrorClass: "admin_review_conflict",
        resultingStatus: "archived",
        userVisibility: false,
        creatorVisibility: true,
        adminVisibility: true,
        rotationEligibility: false,
        telemetryEvent: "admin_creator_drop_reviewed",
        debugLane: "creator_drop_workflow",
        fourxxPolicy: "admin_review_conflict",
        nextRecoveryAction: "Show archived status and keep public discovery disabled.",
    },
] as const;

export function getCreatorDropTransition(transition: CreatorDropTransitionKey) {
    const resolved = CREATOR_DROP_WORKFLOW_TRANSITIONS.find((entry) => entry.transition === transition);
    if (!resolved) {
        throw new Error(`Unknown creator drop transition: ${transition}`);
    }

    return resolved;
}
