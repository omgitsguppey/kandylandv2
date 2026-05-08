import "server-only";

import { createHash } from "crypto";
import { adminDb } from "@/lib/server/firebase-admin";
import {
  ANALYTICS_IDENTITY_LINK_COLLECTION,
  type AnalyticsIdentityLinkRecord,
} from "@/lib/analytics/identity-link-contract";
import { trackServerEvent } from "@/lib/server/analytics";

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildIdentityLinkId(input: {
  anonymousVisitorId: string;
  sessionId: string;
  userId: string;
}) {
  const source = `${input.anonymousVisitorId}|${input.sessionId}|${input.userId}`;
  return createHash("sha256").update(source).digest("hex").slice(0, 40);
}

export async function upsertAnalyticsIdentityLink(
  input: Omit<AnalyticsIdentityLinkRecord, "identityLinkId">,
) {
  if (!adminDb) {
    return { identityLinkId: "", created: false };
  }

  const identityLinkId = buildIdentityLinkId({
    anonymousVisitorId: input.anonymousVisitorId,
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
