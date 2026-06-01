import type { Drop, UserProfile } from "@/types/db";

export type DropViewAccessStatus =
  | "loading_auth"
  | "loading_drop"
  | "loading_entitlement"
  | "allowed_owner"
  | "allowed_admin_or_staff"
  | "allowed_creator"
  | "allowed_unwrapped"
  | "denied_not_logged_in"
  | "denied_not_unwrapped"
  | "denied_drop_missing"
  | "denied_drop_not_public"
  | "error";

export type DropViewAccessState = {
  status: DropViewAccessStatus;
  allowed: boolean;
  loading: boolean;
  dropId: string | null;
  requestedDropId: string | null;
  reason: string;
};

type ViewerProfile = Pick<UserProfile, "uid" | "role" | "unlockedContent" | "unlockedContentTimestamps">;
type DropViewAccessDrop = Pick<Drop, "id"> & Partial<
  Pick<Drop, "creatorId" | "submittedByCreatorId" | "submittedByUserId" | "approvalStatus" | "reviewStatus">
>;

export type DropViewAccessInput = {
  drop: DropViewAccessDrop | null;
  requestedDropId?: string | null;
  authLoading: boolean;
  dropLoading?: boolean;
  userId?: string | null;
  userProfile?: ViewerProfile | null;
  entitlementTimedOut?: boolean;
  visibilityLoading?: boolean;
  contentProtectionDeniedReason?: string | null;
};

const LOADING_STATUSES = new Set<DropViewAccessStatus>([
  "loading_auth",
  "loading_drop",
  "loading_entitlement",
]);

function buildState(
  status: DropViewAccessStatus,
  input: DropViewAccessInput,
  reason: string,
): DropViewAccessState {
  return {
    status,
    allowed: status.startsWith("allowed_"),
    loading: LOADING_STATUSES.has(status),
    dropId: input.drop?.id ?? null,
    requestedDropId: normalizeId(input.requestedDropId),
    reason,
  };
}

export function resolveDropViewAccess(input: DropViewAccessInput): DropViewAccessState {
  const requestedDropId = normalizeId(input.requestedDropId);
  const userId = normalizeId(input.userId);

  if (input.authLoading) {
    return buildState("loading_auth", input, "auth_state_pending");
  }

  if (input.dropLoading) {
    return buildState("loading_drop", input, "drop_read_pending");
  }

  if (!requestedDropId || !input.drop) {
    return buildState("denied_drop_missing", input, "drop_missing");
  }

  if (normalizeId(input.drop.id) !== requestedDropId) {
    return buildState("error", input, "route_drop_mismatch");
  }

  if (!userId) {
    return buildState("denied_not_logged_in", input, "auth_required");
  }

  if (!input.userProfile) {
    return buildState(
      input.entitlementTimedOut ? "error" : "loading_entitlement",
      input,
      input.entitlementTimedOut ? "entitlement_profile_timeout" : "entitlement_profile_pending",
    );
  }

  if (input.contentProtectionDeniedReason) {
    return buildState("error", input, `content_protection_denied:${input.contentProtectionDeniedReason}`);
  }

  if (input.userProfile.role === "admin") {
    return buildState("allowed_admin_or_staff", input, "admin_or_staff_review");
  }

  if (sameId(userId, input.drop.submittedByUserId)) {
    return buildState("allowed_owner", input, "drop_submitter_owner");
  }

  if (sameId(userId, input.drop.creatorId) || sameId(userId, input.drop.submittedByCreatorId)) {
    return buildState("allowed_creator", input, "creator_owner");
  }

  if (hasUnwrappedDrop(input.userProfile, input.drop.id)) {
    return buildState("allowed_unwrapped", input, "user_unwrapped_entitlement");
  }

  if (!isDropPublicForViewer(input.drop)) {
    return buildState(
      input.visibilityLoading ? "loading_drop" : "denied_drop_not_public",
      input,
      input.visibilityLoading ? "drop_visibility_pending" : "drop_not_public",
    );
  }

  return buildState("denied_not_unwrapped", input, "unlock_required");
}

export function hasUnwrappedDrop(profile: ViewerProfile | null | undefined, dropId: string) {
  if (!profile) return false;
  return profile.unlockedContent?.includes(dropId) === true
    || Object.prototype.hasOwnProperty.call(profile.unlockedContentTimestamps ?? {}, dropId);
}

export function isDropViewAccessLoading(state: Pick<DropViewAccessState, "status">) {
  return LOADING_STATUSES.has(state.status);
}

export function telemetryEventForDropViewAccess(state: Pick<DropViewAccessState, "status" | "reason">) {
  switch (state.status) {
    case "allowed_unwrapped":
      return "drop_view_access_allowed_unwrapped";
    case "denied_not_unwrapped":
      return "drop_view_access_denied_not_unwrapped";
    case "error":
      if (state.reason === "entitlement_profile_timeout") {
        return "drop_view_access_loading_timeout";
      }
      return "drop_view_access_error";
    default:
      return null;
  }
}

function isDropPublicForViewer(drop: Pick<Drop, "approvalStatus" | "reviewStatus">) {
  const approvalStatus = drop.approvalStatus ?? "approved";
  const reviewStatus = drop.reviewStatus ?? "approved";
  return approvalStatus === "approved" && reviewStatus === "approved";
}

function sameId(left: unknown, right: unknown) {
  const normalizedLeft = normalizeId(left);
  const normalizedRight = normalizeId(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function normalizeId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
