import "server-only";

import {
  CREATOR_AGREEMENT_ACTIVE_TEMPLATE_DOC_ID,
  CREATOR_AGREEMENT_TEMPLATE_COLLECTION,
  type CreatorAgreementTemplate,
  buildDefaultCreatorAgreementTemplate,
  normalizeCreatorAgreementTemplate,
} from "@/lib/creator-agreement-documents";
import { adminDb } from "@/lib/server/firebase-admin";

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

export async function getActiveCreatorAgreementTemplate(nowMs = Date.now()) {
  if (!adminDb) {
    return buildDefaultCreatorAgreementTemplate(nowMs);
  }

  const snapshot = await adminDb
    .collection(CREATOR_AGREEMENT_TEMPLATE_COLLECTION)
    .doc(CREATOR_AGREEMENT_ACTIVE_TEMPLATE_DOC_ID)
    .get();
  const activeTemplate = normalizeCreatorAgreementTemplate(snapshot.data());

  return activeTemplate ?? buildDefaultCreatorAgreementTemplate(nowMs);
}

export async function saveCreatorAgreementTemplate(template: CreatorAgreementTemplate) {
  if (!adminDb) {
    throw new Error("Database not available");
  }

  const sanitized = stripUndefinedDeep(template);
  const collection = adminDb.collection(CREATOR_AGREEMENT_TEMPLATE_COLLECTION);
  await collection.doc(template.templateId).set(sanitized, { merge: true });

  if (template.activeForNewCreators) {
    await collection.doc(CREATOR_AGREEMENT_ACTIVE_TEMPLATE_DOC_ID).set(sanitized, { merge: true });
  }

  return template;
}

export async function activateCreatorAgreementTemplate(input: {
  template: CreatorAgreementTemplate;
  activatedAt: number;
  activatedByUid: string;
}) {
  if (!adminDb) {
    throw new Error("Database not available");
  }

  const activeTemplate: CreatorAgreementTemplate = {
    ...input.template,
    activeForNewCreators: true,
    activatedAt: input.activatedAt,
    activatedByUid: input.activatedByUid,
    effectiveAt: input.template.effectiveAt ?? input.activatedAt,
  };
  const sanitized = stripUndefinedDeep(activeTemplate);
  const collection = adminDb.collection(CREATOR_AGREEMENT_TEMPLATE_COLLECTION);

  await Promise.all([
    collection.doc(activeTemplate.templateId).set(sanitized, { merge: true }),
    collection.doc(CREATOR_AGREEMENT_ACTIVE_TEMPLATE_DOC_ID).set(sanitized, { merge: true }),
    collection.doc(activeTemplate.templateId).collection("history").doc(`agreement_template_activated_${input.activatedAt}`).set(stripUndefinedDeep({
      eventType: "agreement_template_activated",
      actorId: input.activatedByUid,
      actorRole: "owner_admin",
      actorLabel: input.activatedByUid,
      timestamp: input.activatedAt,
      summary: "Creator agreement template activated",
      metadata: {
        templateId: activeTemplate.templateId,
        agreementVersion: activeTemplate.agreementVersion,
        agreementHash: activeTemplate.agreementHash,
      },
    }), { merge: true }),
  ]);

  return activeTemplate;
}
