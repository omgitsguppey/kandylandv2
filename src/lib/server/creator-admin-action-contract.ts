import "server-only";

import { buildCreatorOnboardingUserProjection, type CreatorOnboardingCanonicalRecord } from "@/lib/creator-onboarding";
import { AuthError } from "@/lib/server/auth";
import { shouldActivateCreatorRole, type CreatorOnboardingActor } from "@/lib/server/creator-onboarding";
import type { UserProfile } from "@/types/db";

export const CREATOR_ADMIN_ACTIONS = [
  "send_agreement",
  "send_updated_agreement",
  "countersign_agreement",
  "request_id",
  "mark_id_verified",
  "mark_id_rejected",
  "approve_creator",
  "reject_creator",
  "request_changes",
  "apply_owner_override",
  "clear_owner_override",
  "activate_creator_role",
  "update_admin_notes",
] as const;

export type CreatorAdminAction = (typeof CREATOR_ADMIN_ACTIONS)[number];

export type CreatorAdminActionRequest = {
  action: CreatorAdminAction;
  payload?: Record<string, unknown>;
  expectedVersion?: string;
  idempotencyKey?: string;
};

export type CreatorAdminActionCaller = {
  uid?: string | null;
  email?: string | null;
};

export type CreatorAdminActionResult = {
  success: true;
  userId: string;
  action: CreatorAdminAction;
  sourceState: "canonical";
  canonicalSource: "creator_onboarding";
  updatedAtMs: number;
  creatorOnboardingCanonical: CreatorOnboardingCanonicalRecord;
  creatorApplication: ReturnType<typeof buildCreatorOnboardingUserProjection>;
  queueEntry?: Record<string, unknown>;
  debug: {
    actorMarkerPresent: boolean;
    actorType: string;
    performedAs: string;
    targetUserId: string;
    targetCreatorId: string;
    actionKey: CreatorAdminAction;
    canonicalSourceUsed: boolean;
    projectionSourceUsed: boolean;
    normalizedFromLegacy: boolean;
    historyWritten: boolean;
    queueMaterialized: boolean;
  };
};

export const OWNER_ONLY_CREATOR_ADMIN_ACTIONS = new Set<CreatorAdminAction>([
  "apply_owner_override",
  "clear_owner_override",
]);

export function readCreatorAdminActionString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function readCreatorAdminActionRole(value: unknown): UserProfile["role"] {
  return value === "creator" || value === "admin" || value === "user" ? value : "user";
}

export function stripUndefinedDeep<T>(value: T): T {
  if (value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => stripUndefinedDeep(entry))
      .filter((entry) => entry !== undefined) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .flatMap(([key, entry]) => entry === undefined ? [] : [[key, stripUndefinedDeep(entry)]]),
  ) as T;
}

function readOptionalTimestamp(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.trunc(value)
    : undefined;
}

function ensureSupportedAction(value: unknown): CreatorAdminAction {
  if (CREATOR_ADMIN_ACTIONS.includes(value as CreatorAdminAction)) {
    return value as CreatorAdminAction;
  }

  throw new AuthError("Unsupported creator action.", 400);
}

function ensureIdSubmitted(input: {
  current: CreatorOnboardingCanonicalRecord;
  action: CreatorAdminAction;
}) {
  if (input.current.idVerificationStatus !== "id_submitted") {
    throw new AuthError(`${input.action} requires a submitted ID package.`, 400);
  }
}

export function parseCreatorAdminActionRequest(value: unknown): CreatorAdminActionRequest {
  const source = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const payload = source.payload && typeof source.payload === "object" && !Array.isArray(source.payload)
    ? source.payload as Record<string, unknown>
    : {};

  return {
    action: ensureSupportedAction(source.action),
    payload,
    expectedVersion: readCreatorAdminActionString(source.expectedVersion) || undefined,
    idempotencyKey: readCreatorAdminActionString(source.idempotencyKey) || undefined,
  };
}

export function buildCreatorAdminLifecycleSource(input: {
  action: CreatorAdminAction;
  payload: Record<string, unknown>;
  before: CreatorOnboardingCanonicalRecord;
  actor: CreatorOnboardingActor;
  nowMs: number;
}) {
  const source: Record<string, unknown> = {
    ...input.before,
    updatedAt: input.nowMs,
    sourceVersion: input.before.sourceVersion + 1,
    reviewedBy: input.actor.label,
    lastAdminActionAt: input.nowMs,
    lastAdminActionBy: input.actor.label,
    blockingReasons: undefined,
    readyForApproval: undefined,
    creatorReviewQueueVisible: undefined,
  };

  switch (input.action) {
    case "request_id": {
      if (input.before.idVerificationStatus === "id_verified" || input.before.idVerificationStatus === "id_submitted") {
        throw new AuthError("ID request is not available after ID has been submitted or verified.", 400);
      }
      source.idVerificationStatus = "id_requested";
      source.idVerificationRequestedAt = input.before.idVerificationRequestedAt ?? input.nowMs;
      source.kycDueAt = readOptionalTimestamp(input.payload.kycDueAt) ?? input.nowMs + (7 * 24 * 60 * 60 * 1000);
      source.idVerificationSubmittedAt = undefined;
      return source;
    }
    case "mark_id_verified": {
      if (input.before.idVerificationStatus === "id_verified") {
        return source;
      }
      ensureIdSubmitted({ current: input.before, action: input.action });
      source.idVerificationStatus = "id_verified";
      source.idVerificationReviewedAt = input.nowMs;
      return source;
    }
    case "mark_id_rejected": {
      if (input.before.idVerificationStatus === "id_rejected") {
        return source;
      }
      ensureIdSubmitted({ current: input.before, action: input.action });
      source.idVerificationStatus = "id_rejected";
      source.idVerificationReviewedAt = input.nowMs;
      return source;
    }
    case "approve_creator": {
      if (input.before.approvalStatus === "creator_approved") {
        return source;
      }
      if (!input.before.readyForApproval && !input.before.ownerOverrideActive && !input.before.legallyClearedAt) {
        throw new AuthError("Creator cannot be approved until required review steps are complete or owner override is active.", 400);
      }
      source.approvalStatus = "creator_approved";
      return source;
    }
    case "reject_creator": {
      if (input.before.role === "creator") {
        throw new AuthError("Use account controls for already-active creators.", 400);
      }
      source.approvalStatus = "creator_rejected";
      source.rejectedAt = input.nowMs;
      source.reapplyAvailableAt = input.nowMs + (30 * 24 * 60 * 60 * 1000);
      return source;
    }
    case "request_changes": {
      if (input.before.role === "creator") {
        throw new AuthError("Use account controls for already-active creators.", 400);
      }
      source.approvalStatus = "creator_needs_changes";
      return source;
    }
    case "apply_owner_override": {
      const reason = readCreatorAdminActionString(input.payload.reason);
      if (reason.length < 8) {
        throw new AuthError("Owner override requires a clear reason.", 400);
      }
      source.ownerOverrideActive = true;
      source.ownerOverrideReason = reason;
      source.ownerOverrideAt = input.nowMs;
      source.ownerOverrideBy = input.actor.label;
      return source;
    }
    case "clear_owner_override": {
      source.ownerOverrideActive = false;
      source.ownerOverrideReason = undefined;
      source.ownerOverrideAt = undefined;
      source.ownerOverrideBy = undefined;
      return source;
    }
    case "activate_creator_role": {
      if (input.before.role === "creator") {
        return source;
      }
      if (input.before.approvalStatus !== "creator_approved") {
        throw new AuthError("Creator must be approved before role activation.", 400);
      }
      if (!shouldActivateCreatorRole(input.before)) {
        throw new AuthError("Creator role activation requires completed approval checks or owner override.", 400);
      }
      source.role = "creator";
      return source;
    }
    case "update_admin_notes": {
      source.adminNotes = readCreatorAdminActionString(input.payload.notes).slice(0, 2_000);
      return source;
    }
    default:
      throw new AuthError("Unsupported lifecycle action.", 400);
  }
}

export function buildCreatorAdminLifecycleEvents(input: {
  before: CreatorOnboardingCanonicalRecord;
  after: CreatorOnboardingCanonicalRecord;
  action: CreatorAdminAction;
}) {
  const events: string[] = [];

  if (input.before.idVerificationStatus !== input.after.idVerificationStatus) {
    if (input.after.idVerificationStatus === "id_requested") {
      events.push("creator_id_requested");
    } else if (input.after.idVerificationStatus === "id_verified") {
      events.push("creator_id_verified");
    } else if (input.after.idVerificationStatus === "id_rejected") {
      events.push("creator_id_rejected");
    }
  }

  if (input.before.approvalStatus !== input.after.approvalStatus) {
    if (input.after.approvalStatus === "creator_approved") {
      events.push("creator_approved");
    } else if (input.after.approvalStatus === "creator_rejected") {
      events.push("creator_rejected");
    } else if (input.after.approvalStatus === "creator_needs_changes") {
      events.push("creator_needs_changes");
    }
  }

  if (input.before.ownerOverrideActive !== input.after.ownerOverrideActive) {
    events.push(input.after.ownerOverrideActive ? "owner_override_applied" : "owner_override_cleared");
  }

  if (input.before.role !== "creator" && input.after.role === "creator") {
    events.push("creator_role_activated");
  }

  if (
    input.after.approvalStatus === "creator_approved"
    && input.after.role !== "creator"
    && (input.before.approvalStatus !== "creator_approved" || input.before.role === "creator")
  ) {
    events.push("creator_role_activation_blocked");
  }

  if (input.action === "update_admin_notes" && input.before.adminNotes !== input.after.adminNotes) {
    events.push("admin_creator_notes_updated");
  }

  return Array.from(new Set(events));
}
