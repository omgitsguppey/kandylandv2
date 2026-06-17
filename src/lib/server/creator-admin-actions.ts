import "server-only";

import { buildCreatorOnboardingCanonicalRecord, buildCreatorOnboardingUserProjection, type CreatorOnboardingCanonicalRecord, normalizeCreatorOnboardingCanonicalRecord } from "@/lib/creator-onboarding";
import { isCreatorOwnerEmail } from "@/lib/creator-admin";
import { actorMarkerToTelemetryPayload, assertKnownActor, buildAdminOnBehalfMarker, type ActorMarker } from "@/lib/identity-truth/identity/actor-markers";
import { buildCreatorAdminLifecycleEvents, buildCreatorAdminLifecycleSource, CREATOR_ADMIN_ACTIONS, OWNER_ONLY_CREATOR_ADMIN_ACTIONS, parseCreatorAdminActionRequest, readCreatorAdminActionRole, readCreatorAdminActionString, stripUndefinedDeep, type CreatorAdminAction, type CreatorAdminActionCaller, type CreatorAdminActionRequest, type CreatorAdminActionResult } from "@/lib/server/creator-admin-action-contract";
import { sendCreatorAgreementDispatch, countersignCreatorAgreementDispatch } from "@/lib/server/creator-agreement-documents";
import { trackServerEvent } from "@/lib/server/analytics";
import { AuthError } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebase-admin";
import { buildCreatorOnboardingStatusChangeHistoryEntries, CREATOR_ONBOARDING_COLLECTION, recordCreatorOnboardingHistoryEntries, shouldActivateCreatorRole, syncCreatorOnboardingDocuments, type CreatorOnboardingActor } from "@/lib/server/creator-onboarding";
import { mapLegacyCreatorApplicationToCanonical } from "@/lib/server/creator-onboarding-legacy-adapter";

export { CREATOR_ADMIN_ACTIONS, parseCreatorAdminActionRequest };
export type { CreatorAdminAction, CreatorAdminActionCaller, CreatorAdminActionRequest, CreatorAdminActionResult };

type LoadedCreatorRecord = {
  canonical: CreatorOnboardingCanonicalRecord;
  userData: Record<string, unknown>;
  normalizedFromLegacy: boolean;
};

type LifecycleMutationResult = {
  before: CreatorOnboardingCanonicalRecord;
  after: CreatorOnboardingCanonicalRecord;
  queueEntry?: Record<string, unknown>;
  historyWritten: boolean;
  queueMaterialized: boolean;
  normalizedFromLegacy: boolean;
};

function buildAdminActor(input: {
  uid?: string | null;
  email?: string | null;
  isOwner: boolean;
}) {
  return {
    uid: input.uid,
    email: input.email,
    role: input.isOwner ? "owner_admin" : "admin",
    isAdmin: true,
    isOwner: input.isOwner,
  };
}

function buildCreatorOnboardingActorFromMarker(marker: ActorMarker): CreatorOnboardingActor {
  return {
    id: marker.actorUid ?? marker.actorType,
    role: marker.actorType === "owner_admin" ? "owner_admin" : "admin",
    label: marker.actorEmail ?? marker.actorUid ?? "Admin",
    marker,
  };
}

function buildActionMarker(input: {
  action: CreatorAdminAction;
  caller: CreatorAdminActionCaller;
  userId: string;
  isOwnerActor: boolean;
  nowMs: number;
  idempotencyKey?: string;
}) {
  const performedAs = OWNER_ONLY_CREATOR_ADMIN_ACTIONS.has(input.action) ? "owner_override" : "admin_on_behalf";

  return assertKnownActor(buildAdminOnBehalfMarker(
    buildAdminActor({
      uid: input.caller.uid,
      email: input.caller.email,
      isOwner: input.isOwnerActor,
    }),
    input.userId,
    {
      surface: "admin_roster",
      route: `/api/admin/creators/${input.userId}/action`,
      actionKey: input.action,
      occurredAt: input.nowMs,
      source: "admin_creator_action_route",
      performedAs,
      targetCreatorId: input.userId,
      dedupeKey: readCreatorAdminActionString(input.idempotencyKey) || undefined,
    },
  ));
}

function assertOwnerAction(input: {
  action: CreatorAdminAction;
  isOwnerActor: boolean;
}) {
  if (OWNER_ONLY_CREATOR_ADMIN_ACTIONS.has(input.action) && !input.isOwnerActor) {
    throw new AuthError("Only the owner admin can perform this creator action.", 403);
  }
}

function assertExpectedVersion(input: {
  expectedVersion?: string;
  canonical: CreatorOnboardingCanonicalRecord;
}) {
  if (!input.expectedVersion) {
    return;
  }

  const accepted = new Set([
    String(input.canonical.sourceVersion),
    String(input.canonical.updatedAt),
  ]);
  if (!accepted.has(input.expectedVersion)) {
    throw new AuthError("Creator record changed. Refresh and try again.", 409);
  }
}

function readLoadedCreatorRecord(input: {
  userId: string;
  userSnapData: Record<string, unknown> | undefined;
  onboardingSnapData: Record<string, unknown> | undefined;
  nowMs: number;
}): LoadedCreatorRecord {
  const userData = input.userSnapData ?? {};
  const canonical = normalizeCreatorOnboardingCanonicalRecord(input.onboardingSnapData);
  if (canonical) {
    return {
      canonical,
      userData,
      normalizedFromLegacy: false,
    };
  }

  const legacyMapping = mapLegacyCreatorApplicationToCanonical({
    userId: input.userId,
    userDoc: {
      id: input.userId,
      data: () => ({ ...userData, uid: input.userId }),
    },
    legacyCreatorApplication: userData.creatorApplication,
    nowMs: input.nowMs,
  });

  if (!legacyMapping.canonical) {
    throw new AuthError("Creator onboarding record was not found.", 404, "user");
  }

  return {
    canonical: legacyMapping.canonical,
    userData,
    normalizedFromLegacy: true,
  };
}

function buildCanonicalFromSource(input: {
  before: CreatorOnboardingCanonicalRecord;
  userData: Record<string, unknown>;
  source: Record<string, unknown>;
  nowMs: number;
}) {
  return buildCreatorOnboardingCanonicalRecord({
    userId: input.before.userId,
    email: readCreatorAdminActionString(input.userData.email) || input.before.email,
    username: readCreatorAdminActionString(input.userData.username) || input.before.username,
    displayName: readCreatorAdminActionString(input.userData.displayName) || input.before.creatorDisplayName,
    photoURL: typeof input.userData.photoURL === "string" ? input.userData.photoURL : input.before.photoURL,
    role: readCreatorAdminActionRole(input.source.role ?? input.userData.role ?? input.before.role),
    createdAt: input.before.createdAt,
    sourceVersion: typeof input.source.sourceVersion === "number" && Number.isFinite(input.source.sourceVersion)
      ? Math.trunc(input.source.sourceVersion)
      : input.before.sourceVersion + 1,
    queuePosition: input.before.queuePosition,
    creatorDisplayName: input.before.creatorDisplayName,
    creatorMonetizationGoals: input.before.creatorMonetizationGoals,
    creatorPrimaryPlatform: input.before.creatorPrimaryPlatform,
    creatorFollowerRange: input.before.creatorFollowerRange,
    creatorPostingFrequency: input.before.creatorPostingFrequency,
    creatorContentFocus: input.before.creatorContentFocus,
    fansAlreadyAskForAccess: input.before.fansAlreadyAskForAccess,
    creatorRecommendedSetup: input.before.creatorRecommendedSetup,
    intakeVersion: input.before.intakeVersion,
    intakeSubmittedAt: input.before.intakeSubmittedAt,
    intakeSource: input.before.intakeSource,
    nowMs: input.nowMs,
    source: input.source,
  });
}

async function emitLifecycleTelemetry(input: {
  events: string[];
  action: CreatorAdminAction;
  userId: string;
  marker: ActorMarker;
  after: CreatorOnboardingCanonicalRecord;
}) {
  const payload = {
    page_path: "/admin/roster",
    onboarding_status: input.after.submissionStatus,
    legal_status: input.after.legalStatus,
    agreement_version: input.after.contractVersion ?? "",
    approval_status: input.after.approvalStatus,
    id_verification_status: input.after.idVerificationStatus,
    source_version: input.after.sourceVersion,
    ...actorMarkerToTelemetryPayload(input.marker),
  };

  await Promise.allSettled([
    trackServerEvent("admin_creator_action_executed", {
      ...payload,
      creator_admin_action: input.action,
    }, input.userId),
    ...input.events.map((eventName) => trackServerEvent(eventName, payload, input.userId)),
  ]);
}

async function executeAgreementAction(input: {
  userId: string;
  action: Extract<CreatorAdminAction, "send_agreement" | "send_updated_agreement" | "countersign_agreement">;
  caller: CreatorAdminActionCaller;
  marker: ActorMarker;
  actor: CreatorOnboardingActor;
  nowMs: number;
  signerIp?: string | null;
  signerUserAgent?: string | null;
}): Promise<CreatorAdminActionResult> {
  if (!input.caller.uid) {
    throw new AuthError("Unauthorized", 401);
  }

  const result = input.action === "countersign_agreement"
    ? await countersignCreatorAgreementDispatch({
      targetUserId: input.userId,
      actor: input.actor,
      signerUid: input.caller.uid,
      signerEmail: input.caller.email,
      signerName: input.caller.email ?? input.caller.uid,
      signerIp: input.signerIp,
      signerUserAgent: input.signerUserAgent,
      nowMs: input.nowMs,
    })
    : await sendCreatorAgreementDispatch({
      targetUserId: input.userId,
      sentByUid: input.caller.uid,
      actor: input.actor,
      sendUpdatedAgreement: input.action === "send_updated_agreement",
      nowMs: input.nowMs,
    });

  const eventName = input.action === "send_updated_agreement"
    ? "admin_creator_agreement_update_sent"
    : input.action === "countersign_agreement"
      ? "admin_creator_agreement_countersigned"
      : "admin_creator_agreement_sent";

  await trackServerEvent(eventName, {
    page_path: "/admin/roster",
    template_id: result.template.templateId,
    agreement_version: result.template.agreementVersion,
    agreement_hash: result.template.agreementHash,
    dispatch_id: result.dispatch.dispatchId,
    ...actorMarkerToTelemetryPayload(input.marker),
  }, input.userId).catch(() => undefined);

  return buildCreatorAdminActionResult({
    userId: input.userId,
    action: input.action,
    marker: input.marker,
    canonical: result.after,
    queueEntry: undefined,
    historyWritten: result.before !== result.after,
    queueMaterialized: result.before !== result.after,
    normalizedFromLegacy: false,
  });
}

async function executeLifecycleAction(input: {
  userId: string;
  action: Exclude<CreatorAdminAction, "send_agreement" | "send_updated_agreement" | "countersign_agreement">;
  payload: Record<string, unknown>;
  expectedVersion?: string;
  marker: ActorMarker;
  actor: CreatorOnboardingActor;
  nowMs: number;
}): Promise<LifecycleMutationResult> {
  if (!adminDb) {
    throw new AuthError("Database not available", 500);
  }

  const userRef = adminDb.collection("users").doc(input.userId);
  const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(input.userId);

  return adminDb.runTransaction(async (transaction) => {
    const [userSnap, onboardingSnap] = await transaction.getAll(userRef, onboardingRef);
    if (!userSnap.exists) {
      throw new AuthError("User not found", 404, "user");
    }

    const loaded = readLoadedCreatorRecord({
      userId: input.userId,
      userSnapData: userSnap.data() as Record<string, unknown> | undefined,
      onboardingSnapData: onboardingSnap.data() as Record<string, unknown> | undefined,
      nowMs: input.nowMs,
    });

    assertExpectedVersion({
      expectedVersion: input.expectedVersion,
      canonical: loaded.canonical,
    });

    const source = buildCreatorAdminLifecycleSource({
      action: input.action,
      payload: input.payload,
      before: loaded.canonical,
      actor: input.actor,
      nowMs: input.nowMs,
    });
    let nextCanonical = buildCanonicalFromSource({
      before: loaded.canonical,
      userData: loaded.userData,
      source,
      nowMs: input.nowMs,
    });

    if (input.action === "approve_creator" && shouldActivateCreatorRole(nextCanonical)) {
      nextCanonical = buildCanonicalFromSource({
        before: loaded.canonical,
        userData: loaded.userData,
        source: {
          ...nextCanonical,
          role: "creator",
          updatedAt: input.nowMs,
          sourceVersion: nextCanonical.sourceVersion,
        },
        nowMs: input.nowMs,
      });
    }

    const synced = syncCreatorOnboardingDocuments(transaction, {
      userId: input.userId,
      displayName: readCreatorAdminActionString(loaded.userData.displayName) || nextCanonical.creatorDisplayName,
      canonical: nextCanonical,
    });

    if (loaded.canonical.role !== nextCanonical.role) {
      transaction.set(userRef, stripUndefinedDeep({
        role: nextCanonical.role,
        updatedAt: input.nowMs,
        updatedBy: input.actor.id,
      }), { merge: true });
    }

    const historyEntries = buildCreatorOnboardingStatusChangeHistoryEntries({
      before: loaded.canonical,
      after: nextCanonical,
      actor: input.actor,
      timestamp: input.nowMs,
    });
    recordCreatorOnboardingHistoryEntries(transaction, input.userId, historyEntries);

    return {
      before: loaded.canonical,
      after: nextCanonical,
      queueEntry: synced.queueEntry as Record<string, unknown>,
      historyWritten: historyEntries.length > 0,
      queueMaterialized: true,
      normalizedFromLegacy: loaded.normalizedFromLegacy,
    };
  });
}

function buildCreatorAdminActionResult(input: {
  userId: string;
  action: CreatorAdminAction;
  marker: ActorMarker;
  canonical: CreatorOnboardingCanonicalRecord;
  queueEntry?: Record<string, unknown>;
  historyWritten: boolean;
  queueMaterialized: boolean;
  normalizedFromLegacy: boolean;
}): CreatorAdminActionResult {
  return {
    success: true,
    userId: input.userId,
    action: input.action,
    sourceState: "canonical",
    canonicalSource: "creator_onboarding",
    updatedAtMs: input.canonical.updatedAt,
    creatorOnboardingCanonical: input.canonical,
    creatorApplication: buildCreatorOnboardingUserProjection(input.canonical),
    queueEntry: input.queueEntry,
    debug: {
      actorMarkerPresent: true,
      actorType: input.marker.actorType,
      performedAs: input.marker.performedAs,
      targetUserId: input.marker.targetUserId ?? input.userId,
      targetCreatorId: input.marker.targetCreatorId ?? input.userId,
      actionKey: input.action,
      canonicalSourceUsed: true,
      projectionSourceUsed: true,
      normalizedFromLegacy: input.normalizedFromLegacy,
      historyWritten: input.historyWritten,
      queueMaterialized: input.queueMaterialized,
    },
  };
}

export async function executeCreatorAdminAction(input: {
  userId: string;
  request: CreatorAdminActionRequest;
  caller: CreatorAdminActionCaller;
  signerIp?: string | null;
  signerUserAgent?: string | null;
  nowMs?: number;
}): Promise<CreatorAdminActionResult> {
  const userId = readCreatorAdminActionString(input.userId);
  if (!userId) {
    throw new AuthError("Creator user ID is required.", 400);
  }

  if (!input.caller.uid) {
    throw new AuthError("Unauthorized", 401);
  }

  const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
    ? Math.trunc(input.nowMs)
    : Date.now();
  const action = input.request.action;
  const isOwnerActor = isCreatorOwnerEmail(input.caller.email);
  assertOwnerAction({
    action,
    isOwnerActor,
  });

  const marker = buildActionMarker({
    action,
    caller: input.caller,
    userId,
    isOwnerActor,
    nowMs,
    idempotencyKey: input.request.idempotencyKey,
  });
  const actor = buildCreatorOnboardingActorFromMarker(marker);

  if (action === "send_agreement" || action === "send_updated_agreement" || action === "countersign_agreement") {
    return executeAgreementAction({
      userId,
      action,
      caller: input.caller,
      marker,
      actor,
      nowMs,
      signerIp: input.signerIp,
      signerUserAgent: input.signerUserAgent,
    });
  }

  const mutation = await executeLifecycleAction({
    userId,
    action,
    payload: input.request.payload ?? {},
    expectedVersion: input.request.expectedVersion,
    marker,
    actor,
    nowMs,
  });

  await emitLifecycleTelemetry({
    events: buildCreatorAdminLifecycleEvents({
      before: mutation.before,
      after: mutation.after,
      action,
    }),
    action,
    userId,
    marker,
    after: mutation.after,
  });

  return buildCreatorAdminActionResult({
    userId,
    action,
    marker,
    canonical: mutation.after,
    queueEntry: mutation.queueEntry,
    historyWritten: mutation.historyWritten,
    queueMaterialized: mutation.queueMaterialized,
    normalizedFromLegacy: mutation.normalizedFromLegacy,
  });
}
