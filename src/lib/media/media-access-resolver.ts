import {
  MEDIA_ACCESS_CONTRACT_VERSION,
  MEDIA_ACCESS_EVENTS,
  MEDIA_ACCESS_REASONS,
  cleanMediaAccessText,
  fingerprintMediaAccessStoragePath,
  resolveMediaAssetUrlPolicy,
  sameMediaAccessIdentity,
  type MediaAccessDecision,
  type MediaAccessEventName,
  type MediaAccessFailureClass,
  type MediaAccessInput,
  type MediaAccessReason,
  type MediaAccessSourceTruth,
  type MediaAccessTelemetryPayload,
  type PrivateMediaAccessDebugLane,
} from "./media-access-contract";

export {
  MEDIA_ACCESS_CONTRACT_VERSION,
  MEDIA_ACCESS_EVENTS,
  MEDIA_ACCESS_REASONS,
};
export type {
  MediaAccessDecision,
  MediaAccessEventName,
  MediaAccessFailureClass,
  MediaAccessInput,
  MediaAccessReason,
  MediaAccessSourceTruth,
  MediaAccessTelemetryPayload,
  PrivateMediaAccessDebugLane,
};

const HUMAN_REASONS: Record<MediaAccessReason, string> = {
  public_allowed: "This media is public.",
  owner_allowed: "This account owns this media.",
  creator_allowed: "This creator owns this media.",
  admin_allowed: "Admin review is allowed for this media.",
  unlocked_allowed: "This Drop has been unlocked for this account.",
  fan_pass_allowed: "Fan Pass access allows this media.",
  chat_thread_participant_allowed: "This account is a participant in the chat thread.",
  expired_blocked: "This media has expired.",
  locked_blocked: "This media is locked for this account.",
  purchase_required: "This media requires an unlock before viewing.",
  auth_required: "Sign in is required before viewing this media.",
  moderation_blocked: "This media is blocked for moderation review.",
  not_found: "This media asset could not be found.",
  unsafe_unknown: "KandyDrops cannot confirm access to this media.",
};

const DEBUG_REASONS: Record<MediaAccessReason, string> = {
  public_allowed: "public discovery or public asset flag allowed the request.",
  owner_allowed: "viewerUserId matched ownerUserId.",
  creator_allowed: "viewerUserId matched creatorId.",
  admin_allowed: "admin review bypass allowed the request.",
  unlocked_allowed: "server unlock entitlement evidence allowed the request.",
  fan_pass_allowed: "Fan Pass entitlement evidence allowed the request.",
  chat_thread_participant_allowed: "chat thread participant evidence allowed the request.",
  expired_blocked: "expiration state blocked media access.",
  locked_blocked: "private chat or creator-owned media lacked participant/owner proof.",
  purchase_required: "locked Drop media lacked unlock or Fan Pass evidence.",
  auth_required: "no authenticated viewer was present for private media.",
  moderation_blocked: "moderation state blocked media access.",
  not_found: "asset existence check failed before access.",
  unsafe_unknown: "No allow condition or typed block condition matched this media request.",
};

const HTTP_STATUS_BY_REASON: Record<MediaAccessReason, MediaAccessDecision["httpStatus"]> = {
  public_allowed: 200,
  owner_allowed: 200,
  creator_allowed: 200,
  admin_allowed: 200,
  unlocked_allowed: 200,
  fan_pass_allowed: 200,
  chat_thread_participant_allowed: 200,
  expired_blocked: 410,
  locked_blocked: 423,
  purchase_required: 403,
  auth_required: 401,
  moderation_blocked: 403,
  not_found: 404,
  unsafe_unknown: 500,
};

const FAILURE_CLASS_BY_REASON: Record<MediaAccessReason, MediaAccessFailureClass> = {
  public_allowed: "none",
  owner_allowed: "none",
  creator_allowed: "none",
  admin_allowed: "none",
  unlocked_allowed: "none",
  fan_pass_allowed: "none",
  chat_thread_participant_allowed: "none",
  expired_blocked: "expired",
  locked_blocked: "creator_ownership",
  purchase_required: "purchase_or_unlock",
  auth_required: "auth",
  moderation_blocked: "moderation",
  not_found: "not_found",
  unsafe_unknown: "unsafe_unknown",
};

function isAllowedReason(reason: MediaAccessReason) {
  return reason.endsWith("_allowed");
}

function eventForReason(reason: MediaAccessReason): MediaAccessEventName {
  if (reason === "not_found") return "media_asset_missing";
  if (reason === "expired_blocked") return "media_expired_blocked";
  if (reason === "unsafe_unknown") return "media_access_failed";
  return isAllowedReason(reason) ? "media_access_allowed" : "media_access_blocked";
}

function sourceTruthForReason(input: MediaAccessInput, reason: MediaAccessReason): MediaAccessSourceTruth {
  if (input.sourceTruth) return input.sourceTruth;
  if (reason === "public_allowed") return "public_discovery";
  if (reason === "owner_allowed" || reason === "creator_allowed") return "creator_ownership";
  if (reason === "admin_allowed") return "admin_review";
  if (reason === "chat_thread_participant_allowed" || input.surface === "chat_attachment") return "chat_thread_membership";
  if (reason === "unlocked_allowed" || reason === "fan_pass_allowed" || reason === "purchase_required") return "server_entitlement";
  return "unknown";
}

function makeDecision(input: MediaAccessInput, reason: MediaAccessReason): MediaAccessDecision {
  return {
    contractVersion: MEDIA_ACCESS_CONTRACT_VERSION,
    surface: input.surface,
    mediaId: cleanMediaAccessText(input.mediaId, "unknown_media").slice(0, 140),
    assetId: cleanMediaAccessText(input.assetId) || null,
    viewerUserId: cleanMediaAccessText(input.viewerUserId) || null,
    ownerUserId: cleanMediaAccessText(input.ownerUserId) || null,
    creatorId: cleanMediaAccessText(input.creatorId) || null,
    allowed: isAllowedReason(reason),
    reason,
    eventName: eventForReason(reason),
    failureClass: FAILURE_CLASS_BY_REASON[reason],
    httpStatus: HTTP_STATUS_BY_REASON[reason],
    humanReason: HUMAN_REASONS[reason],
    debugReason: DEBUG_REASONS[reason],
    sourceTruth: sourceTruthForReason(input, reason),
    storagePathFingerprint: fingerprintMediaAccessStoragePath(input),
    assetUrlPolicy: resolveMediaAssetUrlPolicy(input),
    route: cleanMediaAccessText(input.route) || null,
  };
}

export function resolveMediaAccess(input: MediaAccessInput): MediaAccessDecision {
  if (input.exists === false) return makeDecision(input, "not_found");
  if (input.isAdmin === true) return makeDecision(input, "admin_allowed");
  if (input.moderationState === "blocked") return makeDecision(input, "moderation_blocked");
  if (input.isExpired === true) return makeDecision(input, "expired_blocked");
  if (input.isPublic === true) return makeDecision(input, "public_allowed");

  const hasViewer = cleanMediaAccessText(input.viewerUserId).length > 0;
  if (!hasViewer && (input.surface === "chat_attachment" || input.surface === "creator_upload" || input.surface === "profile_timeline_media" || input.isLocked === true)) {
    return makeDecision(input, "auth_required");
  }

  if (sameMediaAccessIdentity(input.viewerUserId, input.ownerUserId)) return makeDecision(input, "owner_allowed");
  if (sameMediaAccessIdentity(input.viewerUserId, input.creatorId)) return makeDecision(input, "creator_allowed");
  if (input.isChatThreadParticipant === true) return makeDecision(input, "chat_thread_participant_allowed");
  if (input.hasUnlockedDrop === true) return makeDecision(input, "unlocked_allowed");
  if (input.hasFanPass === true) return makeDecision(input, "fan_pass_allowed");
  if (input.surface === "drop_media" && input.isLocked === true) return makeDecision(input, "purchase_required");
  if (input.surface === "chat_attachment" || input.surface === "creator_upload" || input.surface === "profile_timeline_media") {
    if (!input.ownerUserId && !input.creatorId) return makeDecision(input, "unsafe_unknown");
    return makeDecision(input, "locked_blocked");
  }
  return makeDecision(input, "unsafe_unknown");
}

export function explainMediaAccess(input: MediaAccessDecision | MediaAccessInput) {
  const decision = "reason" in input ? input : resolveMediaAccess(input);
  return {
    humanReason: decision.humanReason,
    debugReason: decision.debugReason,
    reason: decision.reason,
    sourceTruth: decision.sourceTruth,
  };
}

export function classifyMediaAccessFailure(input: MediaAccessDecision | MediaAccessInput): MediaAccessFailureClass {
  const decision = "reason" in input ? input : resolveMediaAccess(input);
  return decision.failureClass;
}

export function buildMediaAccessTelemetry(input: (MediaAccessDecision | MediaAccessInput) & {
  storagePath?: string | null;
  assetUrl?: string | null;
}): MediaAccessTelemetryPayload {
  const decision = "reason" in input ? input : resolveMediaAccess(input);
  return {
    contractVersion: MEDIA_ACCESS_CONTRACT_VERSION,
    eventName: decision.eventName,
    surface: decision.surface,
    mediaId: decision.mediaId,
    assetId: decision.assetId,
    viewerUserId: decision.viewerUserId,
    ownerUserId: decision.ownerUserId,
    creatorId: decision.creatorId,
    allowed: decision.allowed,
    reason: decision.reason,
    failureClass: decision.failureClass,
    httpStatus: decision.httpStatus,
    sourceTruth: decision.sourceTruth,
    storagePathFingerprint: decision.storagePathFingerprint || fingerprintMediaAccessStoragePath(input),
    assetUrlPolicy: decision.assetUrlPolicy,
    route: decision.route,
    debugLane: "Private media access",
  };
}

export function validateMediaAccessTelemetryPayload(payload: MediaAccessTelemetryPayload): string[] {
  const failures: string[] = [];
  if (!MEDIA_ACCESS_EVENTS.includes(payload.eventName)) failures.push("private media access telemetry has unknown event.");
  if (!MEDIA_ACCESS_REASONS.includes(payload.reason)) failures.push("private media access telemetry has unknown reason.");
  if (!payload.mediaId) failures.push("private media access telemetry lacks mediaId.");
  if (!payload.surface) failures.push("private media access telemetry lacks surface.");
  if (!payload.debugLane) failures.push("private media access telemetry lacks debug lane.");
  const serialized = JSON.stringify(payload);
  if (/(?:firebasestorage\.googleapis\.com|storage\.googleapis\.com|token=|alt=media|creator\/messages\/|\/drops\/|gs:\/\/|https?:\/\/)/iu.test(serialized)) {
    failures.push("private media access telemetry leaks raw storage path or private URL.");
  }
  return failures;
}

export function buildPrivateMediaAccessDebugLane(decisions: readonly MediaAccessDecision[]): PrivateMediaAccessDebugLane {
  const blockedByReason: Partial<Record<MediaAccessReason, number>> = {};
  for (const decision of decisions) {
    if (!decision.allowed) {
      blockedByReason[decision.reason] = (blockedByReason[decision.reason] ?? 0) + 1;
    }
  }
  const allowed = decisions.filter((decision) => decision.allowed).length;
  const missingAssets = decisions.filter((decision) => decision.reason === "not_found").length;
  const unsafeUnknown = decisions.filter((decision) => decision.reason === "unsafe_unknown").length;
  const expiredOrLockedMismatches = decisions.filter((decision) =>
    decision.reason === "expired_blocked" || decision.reason === "locked_blocked" || decision.reason === "purchase_required",
  ).length;
  const bypassObserved = decisions.some((decision) =>
    decision.reason === "owner_allowed" || decision.reason === "creator_allowed" || decision.reason === "admin_allowed",
  );
  const degraded = missingAssets + unsafeUnknown + expiredOrLockedMismatches > 0;

  return {
    label: "Private media access",
    status: degraded ? "degraded" : "live",
    totalDecisions: decisions.length,
    allowed,
    blocked: decisions.length - allowed,
    blockedByReason,
    missingAssets,
    unsafeUnknown,
    expiredOrLockedMismatches,
    ownerCreatorAdminBypassHealth: bypassObserved || decisions.length > 0 ? "monitored" : "missing",
    sourceTruth: "media_access_contract",
    privacy: "storage_paths_and_private_urls_redacted",
  };
}
