import "server-only";

import {
  CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION,
  CREATOR_AGREEMENT_SIGNATURES_SUBCOLLECTION,
  type CreatorAgreementDispatch,
  type CreatorAgreementTemplate,
  buildCreatorAgreementDebugFields,
  buildCreatorAgreementDispatch,
  buildCreatorAgreementSignature,
} from "@/lib/creator-agreement-documents";
import {
  buildCreatorOnboardingCanonicalRecord,
  normalizeCreatorOnboardingCanonicalRecord,
} from "@/lib/creator-onboarding";
import {
  buildCreatorOnboardingHistoryEntry,
  buildCreatorOnboardingStatusChangeHistoryEntries,
  CREATOR_ONBOARDING_COLLECTION,
  type CreatorOnboardingActor,
  recordCreatorOnboardingHistoryEntries,
  syncCreatorOnboardingDocuments,
} from "@/lib/server/creator-onboarding";
import { getActiveCreatorAgreementTemplate } from "@/lib/server/creator-agreement-templates";
import { adminDb } from "@/lib/server/firebase-admin";
import { recordServerDiagnostic } from "@/lib/server/server-diagnostics";

function stripUndefinedDeep<T>(value: T): T {
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

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readRole(value: unknown) {
  return value === "creator" || value === "admin" || value === "user" ? value : "user";
}

function buildFallbackDispatch(input: {
  userId: string;
  sentByUid: string;
  template: CreatorAgreementTemplate;
  sentAt: number;
  dispatchId?: string;
}) {
  return buildCreatorAgreementDispatch({
    userId: input.userId,
    sentByUid: input.sentByUid,
    template: input.template,
    sentAt: input.sentAt,
    dispatchId: input.dispatchId,
  });
}

export async function sendCreatorAgreementDispatch(input: {
  targetUserId: string;
  actor: CreatorOnboardingActor;
  sentByUid: string;
  template?: CreatorAgreementTemplate;
  sendUpdatedAgreement?: boolean;
  nowMs?: number;
}) {
  if (!adminDb) {
    throw new Error("Database not available");
  }

  const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
    ? Math.trunc(input.nowMs)
    : Date.now();
  const template = input.template ?? await getActiveCreatorAgreementTemplate(nowMs);
  const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(input.targetUserId);
  const userRef = adminDb.collection("users").doc(input.targetUserId);

  const result = await adminDb.runTransaction(async (transaction) => {
    const [onboardingSnap, userSnap] = await transaction.getAll(onboardingRef, userRef);
    const currentCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
    const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};

    if (!currentCanonical) {
      throw new Error("Creator onboarding canonical record was not found.");
    }

    const dispatch = buildCreatorAgreementDispatch({
      userId: input.targetUserId,
      sentByUid: input.sentByUid,
      template,
      sentAt: nowMs,
    });
    const previousDispatchId = currentCanonical.agreementDispatchId;

    const nextCanonical = buildCreatorOnboardingCanonicalRecord({
      userId: input.targetUserId,
      email: typeof userData.email === "string" ? userData.email : currentCanonical.email,
      username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
      displayName: readString(userData.displayName) || currentCanonical.creatorDisplayName,
      photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
      role: readRole(userData.role ?? currentCanonical.role),
      createdAt: currentCanonical.createdAt,
      queuePosition: currentCanonical.queuePosition,
      creatorDisplayName: currentCanonical.creatorDisplayName,
      creatorMonetizationGoals: currentCanonical.creatorMonetizationGoals,
      creatorPrimaryPlatform: currentCanonical.creatorPrimaryPlatform,
      creatorFollowerRange: currentCanonical.creatorFollowerRange,
      creatorPostingFrequency: currentCanonical.creatorPostingFrequency,
      creatorContentFocus: currentCanonical.creatorContentFocus,
      fansAlreadyAskForAccess: currentCanonical.fansAlreadyAskForAccess,
      creatorRecommendedSetup: currentCanonical.creatorRecommendedSetup,
      intakeVersion: currentCanonical.intakeVersion,
      intakeSubmittedAt: currentCanonical.intakeSubmittedAt,
      intakeSource: currentCanonical.intakeSource,
      nowMs,
      source: {
        ...currentCanonical,
        contractVersion: template.agreementVersion,
        agreementTemplateId: template.templateId,
        agreementTitle: template.agreementTitle,
        agreementHash: template.agreementHash,
        agreementSource: template.agreementSource,
        agreementDispatchId: dispatch.dispatchId,
        agreementDispatchStatus: dispatch.status,
        contractDocumentStatus: "contract_sent",
        legalStatus: "legal_sent",
        legalDocumentSentAt: nowMs,
        creatorSignatureStatus: "signature_pending",
        adminSignatureStatus: "signature_pending",
        updatedAt: nowMs,
      },
    });

    syncCreatorOnboardingDocuments(transaction, {
      userId: input.targetUserId,
      displayName: readString(userData.displayName) || currentCanonical.creatorDisplayName,
      canonical: nextCanonical,
    });

    transaction.set(
      onboardingRef.collection(CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION).doc(dispatch.dispatchId),
      stripUndefinedDeep(dispatch),
      { merge: false },
    );

    if (input.sendUpdatedAgreement && previousDispatchId && previousDispatchId !== dispatch.dispatchId) {
      transaction.set(
        onboardingRef.collection(CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION).doc(previousDispatchId),
        {
          status: "superseded",
          supersededByDispatchId: dispatch.dispatchId,
        },
        { merge: true },
      );
    }

    recordCreatorOnboardingHistoryEntries(
      transaction,
      input.targetUserId,
      buildCreatorOnboardingStatusChangeHistoryEntries({
        before: currentCanonical,
        after: nextCanonical,
        actor: input.actor,
        timestamp: nowMs,
      }),
    );

    if (input.sendUpdatedAgreement) {
      recordCreatorOnboardingHistoryEntries(transaction, input.targetUserId, [{
        id: `agreement_update_sent_${nowMs}`,
        entry: buildCreatorOnboardingHistoryEntry({
          eventType: "agreement_update_sent",
          actor: input.actor,
          timestamp: nowMs,
          summary: "Updated agreement sent",
          metadata: {
            templateId: template.templateId,
            agreementVersion: template.agreementVersion,
            agreementHash: template.agreementHash,
            dispatchId: dispatch.dispatchId,
            previousDispatchId,
            ...buildCreatorAgreementDebugFields({
              activeTemplate: template,
              selectedAgreementVersion: template.agreementVersion,
              selectedAgreementHash: template.agreementHash,
              dispatch,
              priorAgreementPreserved: Boolean(previousDispatchId),
              requiresResign: true,
            }),
          },
          agreementVersion: template.agreementVersion,
          agreementHash: template.agreementHash,
          targetUserId: input.targetUserId,
          targetCreatorId: input.targetUserId,
        }),
      }]);
    }

    return {
      before: currentCanonical,
      after: nextCanonical,
      dispatch,
      template,
      priorAgreementPreserved: Boolean(previousDispatchId),
    };
  });

  await recordServerDiagnostic({
    channel: "creator_onboarding",
    severity: "info",
    message: input.sendUpdatedAgreement ? "Updated creator agreement dispatch recorded" : "Creator agreement dispatch recorded",
    detail: {
      userId: input.targetUserId,
      templateId: result.template.templateId,
      agreementVersion: result.template.agreementVersion,
      agreementHash: result.template.agreementHash,
      dispatchId: result.dispatch.dispatchId,
      ...buildCreatorAgreementDebugFields({
        activeTemplate: result.template,
        selectedAgreementVersion: result.after.contractVersion,
        selectedAgreementHash: result.after.agreementHash,
        dispatch: result.dispatch,
        priorAgreementPreserved: result.priorAgreementPreserved,
        requiresResign: result.after.creatorSignatureStatus === "signature_pending",
      }),
    },
  }).catch(() => undefined);

  return result;
}

export async function countersignCreatorAgreementDispatch(input: {
  targetUserId: string;
  actor: CreatorOnboardingActor;
  signerUid: string;
  signerName: string;
  signerEmail?: string | null;
  signerIp?: string | null;
  signerUserAgent?: string | null;
  nowMs?: number;
}) {
  if (!adminDb) {
    throw new Error("Database not available");
  }

  const nowMs = typeof input.nowMs === "number" && Number.isFinite(input.nowMs)
    ? Math.trunc(input.nowMs)
    : Date.now();
  const activeTemplate = await getActiveCreatorAgreementTemplate(nowMs);
  const onboardingRef = adminDb.collection(CREATOR_ONBOARDING_COLLECTION).doc(input.targetUserId);
  const userRef = adminDb.collection("users").doc(input.targetUserId);

  return adminDb.runTransaction(async (transaction) => {
    const [onboardingSnap, userSnap] = await transaction.getAll(onboardingRef, userRef);
    const currentCanonical = normalizeCreatorOnboardingCanonicalRecord(onboardingSnap.data());
    const userData = (userSnap.data() as Record<string, unknown> | undefined) ?? {};

    if (!currentCanonical) {
      throw new Error("Creator onboarding canonical record was not found.");
    }

    if (currentCanonical.creatorSignatureStatus !== "signature_signed") {
      throw new Error("Creator signature is required before admin countersign.");
    }

    const template: CreatorAgreementTemplate = {
      ...activeTemplate,
      templateId: currentCanonical.agreementTemplateId || activeTemplate.templateId,
      agreementVersion: currentCanonical.contractVersion || activeTemplate.agreementVersion,
      agreementTitle: currentCanonical.agreementTitle || activeTemplate.agreementTitle,
      agreementHash: currentCanonical.agreementHash || activeTemplate.agreementHash,
      agreementSource: currentCanonical.agreementSource || activeTemplate.agreementSource,
    };
    const dispatch: CreatorAgreementDispatch = buildFallbackDispatch({
      userId: input.targetUserId,
      sentByUid: currentCanonical.agreementDispatchId ? input.signerUid : input.signerUid,
      template,
      sentAt: currentCanonical.legalDocumentSentAt ?? nowMs,
      dispatchId: currentCanonical.agreementDispatchId,
    });

    if (currentCanonical.adminSignatureStatus === "signature_signed") {
      return {
        before: currentCanonical,
        after: currentCanonical,
        dispatch: {
          ...dispatch,
          status: "signed" as const,
        },
        signature: null,
        template,
      };
    }

    const signature = buildCreatorAgreementSignature({
      dispatch,
      signerUid: input.signerUid,
      signerName: input.signerName,
      signerEmail: input.signerEmail,
      signerIp: input.signerIp,
      signerUserAgent: input.signerUserAgent,
      signedAt: nowMs,
      acknowledgementValues: {
        countersign: true,
        route: "/api/admin/creator-agreements",
      },
    });

    const nextCanonical = buildCreatorOnboardingCanonicalRecord({
      userId: input.targetUserId,
      email: typeof userData.email === "string" ? userData.email : currentCanonical.email,
      username: typeof userData.username === "string" ? userData.username : currentCanonical.username,
      displayName: readString(userData.displayName) || currentCanonical.creatorDisplayName,
      photoURL: typeof userData.photoURL === "string" ? userData.photoURL : currentCanonical.photoURL,
      role: readRole(userData.role ?? currentCanonical.role),
      createdAt: currentCanonical.createdAt,
      queuePosition: currentCanonical.queuePosition,
      creatorDisplayName: currentCanonical.creatorDisplayName,
      creatorMonetizationGoals: currentCanonical.creatorMonetizationGoals,
      creatorPrimaryPlatform: currentCanonical.creatorPrimaryPlatform,
      creatorFollowerRange: currentCanonical.creatorFollowerRange,
      creatorPostingFrequency: currentCanonical.creatorPostingFrequency,
      creatorContentFocus: currentCanonical.creatorContentFocus,
      fansAlreadyAskForAccess: currentCanonical.fansAlreadyAskForAccess,
      creatorRecommendedSetup: currentCanonical.creatorRecommendedSetup,
      intakeVersion: currentCanonical.intakeVersion,
      intakeSubmittedAt: currentCanonical.intakeSubmittedAt,
      intakeSource: currentCanonical.intakeSource,
      nowMs,
      source: {
        ...currentCanonical,
        agreementDispatchStatus: "signed",
        adminSignatureStatus: "signature_signed",
        legalStatus: "legal_signed",
        adminContractSignedAt: nowMs,
        adminContractSignedByName: input.signerName,
        adminContractSignedIp: input.signerIp,
        adminContractSignedUserAgent: input.signerUserAgent,
        legalDocumentSignedAt: nowMs,
        updatedAt: nowMs,
      },
    });

    syncCreatorOnboardingDocuments(transaction, {
      userId: input.targetUserId,
      displayName: readString(userData.displayName) || currentCanonical.creatorDisplayName,
      canonical: nextCanonical,
    });

    transaction.set(
      onboardingRef.collection(CREATOR_AGREEMENT_DISPATCHES_SUBCOLLECTION).doc(dispatch.dispatchId),
      stripUndefinedDeep({
        ...dispatch,
        status: "signed",
      }),
      { merge: true },
    );
    transaction.set(
      onboardingRef.collection(CREATOR_AGREEMENT_SIGNATURES_SUBCOLLECTION).doc(`admin_${dispatch.dispatchId}`),
      stripUndefinedDeep(signature),
      { merge: false },
    );
    recordCreatorOnboardingHistoryEntries(
      transaction,
      input.targetUserId,
      buildCreatorOnboardingStatusChangeHistoryEntries({
        before: currentCanonical,
        after: nextCanonical,
        actor: input.actor,
        timestamp: nowMs,
      }),
    );

    return {
      before: currentCanonical,
      after: nextCanonical,
      dispatch: {
        ...dispatch,
        status: "signed" as const,
      },
      signature,
      template,
    };
  });
}
