import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import {
  ANALYTICS_IDENTITY_LINK_COLLECTION,
  type AnalyticsIdentityLinkRecord,
} from "@/lib/analytics/identity-link-contract";
import { buildGuestUserIdentityLinkId } from "@/lib/analytics/identity-transfer";
import { trackServerEvent } from "@/lib/server/analytics";
import { USER_INDEX_COLLECTIONS } from "@/lib/user-indexes/user-tracking-index-contract";

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export async function upsertAnalyticsIdentityLink(
  input: Omit<AnalyticsIdentityLinkRecord, "identityLinkId">,
) {
  if (!adminDb) {
    return { identityLinkId: "", created: false };
  }

  const identityLinkId = buildGuestUserIdentityLinkId({
    guestId: input.anonymousVisitorId,
    sessionId: input.sessionId,
    userId: input.userId,
  });
  const ref = adminDb.collection(ANALYTICS_IDENTITY_LINK_COLLECTION).doc(identityLinkId);
  const snap = await ref.get();

  const payload: AnalyticsIdentityLinkRecord = {
    ...input,
    identityLinkId,
    confidence: clamp01(input.confidence),
  };
  if (!snap.exists) {
    await ref.create(payload);
  } else {
    await ref.set(payload, { merge: true });
  }

  await adminDb.collection(USER_INDEX_COLLECTIONS.identityLineageIndexes).doc(identityLinkId).set({
    identityLinkId,
    userId: input.userId,
    anonymousVisitorId: input.anonymousVisitorId,
    sessionIds: Array.from(new Set([input.sessionId, ...(input.eligiblePastSessionIds || [])])).filter(Boolean),
    linkedAtMs: Date.parse(input.linkedAt) || Date.now(),
    consentState: input.consentState,
    mergeAllowed: input.mergeAllowed,
    confidence: clamp01(input.confidence),
    updatedAtMs: Date.now(),
  }, { merge: true });

  await trackServerEvent("identity_linked", {
    identity_link_id: identityLinkId,
    anonymous_visitor_id: input.anonymousVisitorId,
    session_id: input.sessionId,
    method: input.method,
    consent_state: input.consentState,
    merge_allowed: input.mergeAllowed,
    source_truth: "canonical",
  }, input.userId).catch(() => undefined);

  return { identityLinkId, created: !snap.exists };
}
