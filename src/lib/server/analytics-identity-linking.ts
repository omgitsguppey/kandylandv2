import "server-only";

import { adminDb } from "@/lib/server/firebase-admin";
import {
  ANALYTICS_IDENTITY_LINK_COLLECTION,
  ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
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
  input: Omit<AnalyticsIdentityLinkRecord, "identityLinkId" | "ownerKeyVersion">,
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
    ownerKeyVersion: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
    confidence: clamp01(input.confidence),
  };
  if (!snap.exists) {
    await ref.create(payload);
  } else {
    await ref.set(payload, { merge: true });
  }

  await adminDb.collection(USER_INDEX_COLLECTIONS.identityLineageIndexes).doc(identityLinkId).set({
    identityLinkId,
    ownerKeyVersion: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
    userId: input.userId,
    anonymousVisitorId: input.anonymousVisitorId,
    sessionIds: Array.from(new Set([input.sessionId, ...(input.eligiblePastSessionIds || [])])).filter(Boolean),
    linkedAtMs: Date.parse(input.linkedAt) || Date.now(),
    consentState: input.consentState,
    consentMode: input.consentMode ?? "unknown",
    mergeAllowed: input.mergeAllowed,
    personLevelBehaviorAllowed: input.personLevelBehaviorAllowed === true,
    confidence: clamp01(input.confidence),
    linkageConfidenceSource: input.linkageConfidenceSource ?? "blocked_by_consent_mode",
    updatedAtMs: Date.now(),
  }, { merge: true });

  await trackServerEvent("identity_linked", {
    identity_link_id: identityLinkId,
    owner_key_version: ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION,
    anonymous_visitor_id: input.anonymousVisitorId,
    session_id: input.sessionId,
    method: input.method,
    consent_state: input.consentState,
    consent_mode: input.consentMode ?? "unknown",
    merge_allowed: input.mergeAllowed,
    person_level_behavior_allowed: input.personLevelBehaviorAllowed === true,
    linkage_confidence_source: input.linkageConfidenceSource ?? "blocked_by_consent_mode",
    source_truth: "canonical",
  }, input.userId).catch(() => undefined);

  return { identityLinkId, created: !snap.exists };
}
