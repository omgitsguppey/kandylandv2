import "server-only";

import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/server/firebase-admin";
import type { AdminAiDropCoverJobRecord } from "@/lib/ai-drop-covers";
import type { CoverSemanticBrief } from "./cover-semantic-brief";
import { COVER_LEARNING_COLLECTION, COVER_PROMPT_COMPILER_VERSION, COVER_SEMANTIC_BRIEF_VERSION, type CoverFailureTag, type CoverFeedbackKind, type CoverLearningRecord, type CoverReferenceEligibility } from "./cover-learning-contract";
import type { CoverFeedbackWeightTag } from "./cover-feedback-weights";
import { buildCoverFeedbackRecordHash } from "./cover-learning-utils";

export type CoverLearningRecordInput = {
  job: Pick<AdminAiDropCoverJobRecord, "id" | "title" | "creatorId" | "creatorName" | "model" | "referenceAssets" | "requestedAtMs" | "workingPrompt" | "optimizerAdjustedPrompt" | "providerEnhancedPrompt" | "acceptedAtMs" | "acceptedForDropId" | "feedback" | "accepted" | "status">;
  brief: CoverSemanticBrief;
  feedbackKind: CoverFeedbackKind;
  referenceEligibility: CoverReferenceEligibility;
  failureTags: CoverFailureTag[];
  positiveTags: CoverFeedbackWeightTag[];
  semanticBriefHash?: string | null;
};

function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[â€™']/g, "'");
}

function getReferenceIds(job: CoverLearningRecordInput["job"]) {
  return (job.referenceAssets || []).map((asset) => asset.id).filter(Boolean);
}

export function buildCoverLearningRecord(input: CoverLearningRecordInput): CoverLearningRecord {
  const promptText = [
    input.job.workingPrompt,
    input.job.optimizerAdjustedPrompt,
    input.job.providerEnhancedPrompt,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0).join("\n");
  const semanticBriefText = JSON.stringify({
    title: input.brief.title,
    creatorBrand: input.brief.creatorBrand,
    flavorTitle: input.brief.flavorTitle,
    semanticCategory: input.brief.semanticCategory,
    heroObject: input.brief.heroObject,
    requiredTokens: input.brief.requiredTokens,
    allowedIngredientTokens: input.brief.allowedIngredientTokens,
    allowedTextureTokens: input.brief.allowedTextureTokens,
    allowedPaletteTokens: input.brief.allowedPaletteTokens,
    forbiddenTokens: input.brief.forbiddenTokens,
    forbiddenCategories: input.brief.forbiddenCategories,
  });

  return {
    id: buildCoverFeedbackRecordHash({
      jobId: input.job.id,
      title: input.brief.title,
      feedbackKind: input.feedbackKind,
      semanticCategory: input.brief.semanticCategory,
      promptText,
    }),
    creatorId: input.job.creatorId || "",
    title: input.brief.title,
    creatorBrand: input.brief.creatorBrand,
    flavorTitle: input.brief.flavorTitle,
    semanticCategory: input.brief.semanticCategory,
    modelId: input.job.model,
    modelFamily: input.job.model.includes("preview") ? "preview" : "standard",
    referenceIds: getReferenceIds(input.job),
    promptCompilerVersion: COVER_PROMPT_COMPILER_VERSION,
    semanticBriefVersion: COVER_SEMANTIC_BRIEF_VERSION,
    feedbackKind: input.feedbackKind,
    referenceEligibility: input.referenceEligibility,
    failureTags: input.failureTags,
    positiveTags: input.positiveTags,
    acceptedAt: input.job.acceptedAtMs || undefined,
    dislikedAt: input.feedbackKind === "disliked" ? Date.now() : undefined,
    usedAsCoverAt: input.feedbackKind === "used_as_cover" ? Date.now() : undefined,
    createdAt: Date.now(),
    promptHash: hashText(normalizeText(promptText)),
    semanticBriefHash: hashText(semanticBriefText + (input.semanticBriefHash ? `:${input.semanticBriefHash}` : "")),
  };
}

export async function appendCoverLearningRecord(record: CoverLearningRecord) {
  if (!adminDb) {
    return null;
  }

  await adminDb.collection(COVER_LEARNING_COLLECTION).doc(record.id).set({
    ...record,
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return record.id;
}

export async function listCoverLearningRecords(input?: {
  creatorId?: string | null;
  semanticCategory?: string | null;
  limit?: number;
}) {
  if (!adminDb) {
    return [] as CoverLearningRecord[];
  }

  const normalizedLimit = Math.max(1, Math.min(input?.limit || 24, 100));
  let query: FirebaseFirestore.Query = adminDb.collection(COVER_LEARNING_COLLECTION);
  if (input?.creatorId) {
    query = query.where("creatorId", "==", input.creatorId);
  } else if (input?.semanticCategory) {
    query = query.where("semanticCategory", "==", input.semanticCategory);
  }

  const snapshot = await query.limit(normalizedLimit).get();
  const records = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CoverLearningRecord[];
  return records
    .filter((record) => (!input?.creatorId || record.creatorId === input.creatorId)
      && (!input?.semanticCategory || record.semanticCategory === input.semanticCategory))
    .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0));
}
