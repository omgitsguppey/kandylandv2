export const CREATOR_DROP_4XX_CLASSES = [
    "creator_not_configured",
    "creator_permission_denied",
    "creator_status_conflict",
    "stale_creator_draft",
    "missing_creator_drop_id",
    "invalid_creator_drop_payload",
    "media_required",
    "media_access_denied",
    "approval_required",
    "admin_review_conflict",
    "expired_drop_unavailable",
    "unknown_legacy_drop",
    "suspicious_creator_request",
] as const;

export type CreatorDrop4xxClass = typeof CREATOR_DROP_4XX_CLASSES[number];

export type CreatorDrop4xxPolicy = {
    errorClass: CreatorDrop4xxClass;
    statusCode: 400 | 403 | 404 | 409 | 422;
    retryable: boolean;
    safeCreatorCopy: string;
    safeAdminCopy: string;
    debugSeverity: "info" | "warn" | "error";
    diagnosticRollupFingerprint: string;
    telemetryEvent: "creator_drop_submit_failed" | "admin_creator_drop_review_failed";
    recoveryAction: string;
};

function policy(input: Omit<CreatorDrop4xxPolicy, "diagnosticRollupFingerprint">): CreatorDrop4xxPolicy {
    return {
        ...input,
        diagnosticRollupFingerprint: `creator_drop:${input.errorClass}:{route}:{actor}:{hour}`,
    };
}

export const CREATOR_DROP_4XX_POLICIES: readonly CreatorDrop4xxPolicy[] = [
    policy({
        errorClass: "creator_not_configured",
        statusCode: 403,
        retryable: false,
        safeCreatorCopy: "Your creator account is not ready to submit drops yet.",
        safeAdminCopy: "Creator account lacks the required creator role or drop submission permission.",
        debugSeverity: "warn",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Refresh creator setup, then ask support if the creator role is missing.",
    }),
    policy({
        errorClass: "creator_permission_denied",
        statusCode: 403,
        retryable: false,
        safeCreatorCopy: "You do not have permission to change this creator drop.",
        safeAdminCopy: "Caller attempted to mutate a creator drop outside their owned or submitted scope.",
        debugSeverity: "warn",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Return to your creator dashboard and reopen the drop from your own drop manager.",
    }),
    policy({
        errorClass: "creator_status_conflict",
        statusCode: 409,
        retryable: false,
        safeCreatorCopy: "This drop status changed. Refresh before submitting another update.",
        safeAdminCopy: "Creator tried to update a drop whose review status no longer accepts creator edits.",
        debugSeverity: "info",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Refresh the drop manager to see the latest admin review state.",
    }),
    policy({
        errorClass: "stale_creator_draft",
        statusCode: 404,
        retryable: false,
        safeCreatorCopy: "This draft is no longer available. Refresh your drop manager.",
        safeAdminCopy: "Creator referenced a missing or deleted creator draft/drop id.",
        debugSeverity: "info",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Refresh the drop manager and submit a new draft if needed.",
    }),
    policy({
        errorClass: "missing_creator_drop_id",
        statusCode: 422,
        retryable: false,
        safeCreatorCopy: "The drop submission is missing its drop id.",
        safeAdminCopy: "Creator update request omitted the drop id.",
        debugSeverity: "warn",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Reopen the drop from the creator drop manager before submitting again.",
    }),
    policy({
        errorClass: "invalid_creator_drop_payload",
        statusCode: 422,
        retryable: false,
        safeCreatorCopy: "Some required drop details are missing or invalid.",
        safeAdminCopy: "Creator submission failed shared drop publish validation.",
        debugSeverity: "info",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Review required fields, media, schedule, and destination details before resubmitting.",
    }),
    policy({
        errorClass: "media_required",
        statusCode: 422,
        retryable: false,
        safeCreatorCopy: "Add the required cover and locked content media before submitting.",
        safeAdminCopy: "Creator submission lacks required cover or content media for publish readiness.",
        debugSeverity: "info",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Upload cover media and required locked content, then submit again.",
    }),
    policy({
        errorClass: "media_access_denied",
        statusCode: 403,
        retryable: false,
        safeCreatorCopy: "You do not have access to one of the selected media files.",
        safeAdminCopy: "Creator submission referenced media outside the creator accessible scope.",
        debugSeverity: "warn",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Remove the media item and upload it again from your creator account.",
    }),
    policy({
        errorClass: "approval_required",
        statusCode: 409,
        retryable: false,
        safeCreatorCopy: "Admin approval is required before this drop can go live.",
        safeAdminCopy: "Creator workflow attempted to bypass admin approval.",
        debugSeverity: "warn",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Wait for admin review or check the status shown in your creator drop manager.",
    }),
    policy({
        errorClass: "admin_review_conflict",
        statusCode: 409,
        retryable: false,
        safeCreatorCopy: "This drop is already in admin review. Refresh before making changes.",
        safeAdminCopy: "Admin review state conflicts with the attempted creator or admin transition.",
        debugSeverity: "info",
        telemetryEvent: "admin_creator_drop_review_failed",
        recoveryAction: "Refresh the admin queue or creator drop manager before retrying the action.",
    }),
    policy({
        errorClass: "expired_drop_unavailable",
        statusCode: 409,
        retryable: false,
        safeCreatorCopy: "This drop has expired and cannot be submitted without a new schedule.",
        safeAdminCopy: "Creator submission references expired timing.",
        debugSeverity: "info",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Set a new valid schedule and submit the drop again.",
    }),
    policy({
        errorClass: "unknown_legacy_drop",
        statusCode: 409,
        retryable: false,
        safeCreatorCopy: "This older drop needs review before it can be changed.",
        safeAdminCopy: "Legacy creator drop state cannot be mapped to a safe approval transition.",
        debugSeverity: "warn",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Ask an admin to review the legacy drop before editing.",
    }),
    policy({
        errorClass: "suspicious_creator_request",
        statusCode: 400,
        retryable: false,
        safeCreatorCopy: "This request could not be accepted. Check the drop details and try from the dashboard.",
        safeAdminCopy: "Creator request looked malformed or unsafe and should be sampled in diagnostics.",
        debugSeverity: "warn",
        telemetryEvent: "creator_drop_submit_failed",
        recoveryAction: "Use the creator dashboard form instead of a stale or modified request.",
    }),
] as const;

const POLICY_BY_CLASS = new Map<CreatorDrop4xxClass, CreatorDrop4xxPolicy>(
    CREATOR_DROP_4XX_POLICIES.map((entry) => [entry.errorClass, entry]),
);

export function getCreatorDrop4xxPolicy(errorClass: CreatorDrop4xxClass) {
    const resolved = POLICY_BY_CLASS.get(errorClass);
    if (!resolved) {
        return POLICY_BY_CLASS.get("suspicious_creator_request")!;
    }

    return resolved;
}

export function isCreatorDrop4xxRetryable(errorClass: CreatorDrop4xxClass) {
    return getCreatorDrop4xxPolicy(errorClass).retryable;
}

export function buildCreatorDrop4xxPayload(
    errorClass: CreatorDrop4xxClass,
    options: { details?: string[]; overrideCopy?: string } = {},
) {
    const resolved = getCreatorDrop4xxPolicy(errorClass);
    return {
        error: options.overrideCopy || resolved.safeCreatorCopy,
        errorClass: resolved.errorClass,
        retryable: resolved.retryable,
        recoveryAction: resolved.recoveryAction,
        details: options.details ?? [],
        diagnosticRollupFingerprint: resolved.diagnosticRollupFingerprint,
    };
}
