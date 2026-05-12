import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { buildCoverSemanticBrief } from "@/lib/ai-cover/cover-semantic-brief";
import { buildCoverFeedbackNormalization } from "@/lib/ai-cover/cover-feedback-normalizer";
import { buildCoverNegativeMemory } from "@/lib/ai-cover/cover-negative-memory";
import { buildCoverPromptDeltaEngine } from "@/lib/ai-cover/cover-prompt-delta-engine";
import { buildCoverGenerationPreflight } from "@/lib/ai-cover/cover-generation-preflight";
import { selectDeterministicCoverReferences } from "@/lib/ai-cover/cover-reference-selector";
import { scoreCoverImprovementAttempt } from "@/lib/ai-cover/cover-improvement-score";
import type { CoverLearningRecord } from "@/lib/ai-cover/cover-learning-contract";

const repoRoot = resolve(process.cwd());
const statePath = resolve(repoRoot, "agent/state/ai-cover-learning-cutover.generated.json");

function fileExists(relativePath: string) {
  return existsSync(resolve(repoRoot, relativePath));
}

function makeRecord(overrides: Partial<CoverLearningRecord>): CoverLearningRecord {
  return {
    id: overrides.id || "record-1",
    creatorId: overrides.creatorId || "creator-1",
    title: overrides.title || "Jessi Ray's Pink Lemonade",
    creatorBrand: overrides.creatorBrand || "Jessi Ray's",
    flavorTitle: overrides.flavorTitle || "Pink Lemonade",
    semanticCategory: overrides.semanticCategory || "pink_lemonade_beverage",
    modelId: overrides.modelId || "image_2_5",
    modelFamily: overrides.modelFamily || "standard",
    referenceIds: overrides.referenceIds || ["ref-1"],
    promptCompilerVersion: overrides.promptCompilerVersion || "hard-cutover-v2",
    semanticBriefVersion: overrides.semanticBriefVersion || "hard-cutover-v2",
    feedbackKind: overrides.feedbackKind || "disliked",
    referenceEligibility: overrides.referenceEligibility || "negative_constraint",
    failureTags: overrides.failureTags || ["optimizer_contamination"],
    positiveTags: overrides.positiveTags || [],
    acceptedAt: overrides.acceptedAt,
    dislikedAt: overrides.dislikedAt || Date.now(),
    usedAsCoverAt: overrides.usedAsCoverAt,
    createdAt: overrides.createdAt || Date.now(),
    promptHash: overrides.promptHash || "prompt-hash",
    semanticBriefHash: overrides.semanticBriefHash || "brief-hash",
  };
}

const pinkBrief = buildCoverSemanticBrief({ title: "Jessi Ray's Pink Lemonade", creatorSelectedName: "Jessi Ray" });
const blueBrief = buildCoverSemanticBrief({ title: "Bloomytrip's Blueberry Muffins", creatorSelectedName: "Bloomytrip" });

const selection = selectDeterministicCoverReferences({
  brief: pinkBrief,
  modelId: "image_2_5",
  maxReferenceCount: 2,
  requestedReferenceCount: 4,
  candidates: [
    { id: "primary", title: "Template Layout", selectedAsPrimaryLayout: true, feedbackKind: "ignored" },
    { id: "accepted", title: "Pink Lemonade", creatorName: "Jessi Ray", feedbackKind: "accepted_as_cover" },
    { id: "neutral", title: "Blueberry Muffins", feedbackKind: "generated" },
    { id: "disliked", title: "Cherry Crush", feedbackKind: "disliked" },
  ],
});

const negativeMemory = buildCoverNegativeMemory({
  brief: pinkBrief,
  records: [
    makeRecord({ failureTags: ["optimizer_contamination"], dislikedAt: Date.now() }),
    makeRecord({ id: "record-2", failureTags: ["optimizer_contamination"], dislikedAt: Date.now() }),
  ],
});

const delta = buildCoverPromptDeltaEngine({
  brief: pinkBrief,
  negativeMemory,
  feedback: buildCoverFeedbackNormalization({
    action: "dislike",
    title: pinkBrief.title,
    creatorName: "Jessi Ray",
    workingPrompt: "Pink Lemonade cherry crush chocolate fudge",
  }),
  optimizerSuggestion: "Use chocolate mountain peaks and copper serving pedestal with cherry crush candy drink.",
});

const badPreflight = buildCoverGenerationPreflight({
  title: "Jessi Ray's Pink Lemonade",
  creatorSelectedName: "Jessi Ray",
  imageModel: "image_2_5",
  optimizerPrompt: "Add cherry crush chocolate fudge and copper serving pedestal.",
  requestedReferenceCount: 17,
  selectedReferenceCount: 2,
  maxReferenceCount: 2,
});

const goodScore = scoreCoverImprovementAttempt({
  titleFlavorMatch: 1,
  objectCategoryMatch: 1,
  requiredTokenCoverage: 1,
  forbiddenTokenAvoidance: 1,
  creatorBrandCorrect: 1,
  paletteFit: 1,
  topBrandPlacement: 1,
  mainTitleHierarchy: 1,
  heroObjectCentered: 1,
  bottomCtaPreserved: 1,
  squarePosterStyle: 1,
  dislikeDeltasApplied: 1,
  previousFailureAvoided: 1,
  forbiddenTokensRemoved: 1,
  referencePoolCorrected: 1,
  modelAdapterFit: 1,
});

const learningFile = readFileSync(resolve(repoRoot, "src/lib/server/ai-drop-covers.ts"), "utf8");
const optimizeStart = learningFile.indexOf("async function optimizeAdminAiDropCoverPromptPolicy");
const optimizeEnd = learningFile.indexOf("export function resolveAdminAiDropCoverRuntime", optimizeStart);
const optimizerBody = optimizeStart >= 0 && optimizeEnd > optimizeStart ? learningFile.slice(optimizeStart, optimizeEnd) : learningFile;

const state = {
  generatedAt: new Date().toISOString(),
  files: {
    learningContract: fileExists("src/lib/ai-cover/cover-learning-contract.ts"),
    referenceEligibility: fileExists("src/lib/ai-cover/cover-reference-eligibility.ts"),
    negativeMemory: fileExists("src/lib/ai-cover/cover-negative-memory.ts"),
    improvementScore: fileExists("src/lib/ai-cover/cover-improvement-score.ts"),
    promptDeltaEngine: fileExists("src/lib/ai-cover/cover-prompt-delta-engine.ts"),
    referenceSelector: fileExists("src/lib/ai-cover/cover-reference-selector.ts"),
    learningLedger: fileExists("src/lib/ai-cover/cover-learning-ledger.ts"),
    feedbackNormalizer: fileExists("src/lib/ai-cover/cover-feedback-normalizer.ts"),
  },
  selector: {
    selectedIds: selection.selectedReferences.map((entry) => entry.candidate.id),
    rejectedIds: selection.rejectedReferences.map((entry) => entry.candidate.id),
    neutralRejected: selection.rejectedReferences.some((entry) => entry.candidate.id === "neutral"),
    dislikedRejected: selection.rejectedReferences.some((entry) => entry.candidate.id === "disliked"),
  },
  learning: {
    negativeConstraint: buildCoverFeedbackNormalization({
      action: "dislike",
      title: pinkBrief.title,
      creatorName: "Jessi Ray",
      workingPrompt: "Pink Lemonade cherry crush chocolate fudge",
      referenceAssets: [{ title: "Cherry Crush", creatorName: "Other Creator" }],
    }).referenceEligibility,
    promptInstruction: delta.promptInstruction,
    rejectedSuggestions: delta.rejectedSuggestions,
    blockStrength: negativeMemory.blockStrength,
    repeatedFailureTags: negativeMemory.repeatedFailureTags,
  },
  preflight: {
    ok: badPreflight.ok,
    blockedReason: badPreflight.blockedReason,
    readinessScore: badPreflight.readinessScore,
  },
  scores: {
    goodReadiness: goodScore.overallPromptReadinessScore,
    blueberryConflict: scoreCoverImprovementAttempt({
      titleFlavorMatch: 1,
      objectCategoryMatch: 1,
      requiredTokenCoverage: 1,
      forbiddenTokenAvoidance: 1,
      creatorBrandCorrect: 1,
      paletteFit: 1,
      topBrandPlacement: 1,
      mainTitleHierarchy: 1,
      heroObjectCentered: 1,
      bottomCtaPreserved: 1,
      squarePosterStyle: 1,
      dislikeDeltasApplied: 0,
      previousFailureAvoided: 0,
      forbiddenTokensRemoved: 0,
      referencePoolCorrected: 0,
      modelAdapterFit: 1,
    }).overallPromptReadinessScore,
  },
  optimizerBlocked: {
    noGeminiInOptimizePath: !optimizerBody.includes("generateGeminiText(") && !optimizerBody.includes("getVertexAccessToken(runtime.project)"),
  },
  uiMarkers: {
    compactMarker: readFileSync(resolve(repoRoot, "src/components/Admin/AiDropCoverGeneratorPanel.tsx"), "utf8").includes("data-cover-prompt-source=\"deterministic-compiler\""),
    collapsedNotes: readFileSync(resolve(repoRoot, "src/components/Admin/AiDropCoverGeneratorPanel.tsx"), "utf8").includes("Debug notes"),
  },
  references: {
    acceptedOnly: selection.selectedReferences.some((entry) => entry.role === "accepted_style_reference"),
    primarySelected: selection.selectedReferences.some((entry) => entry.role === "primary_layout_reference"),
    referenceCapApplied: selection.referenceLimitApplied,
    pinkBriefCategory: pinkBrief.semanticCategory,
    blueBriefCategory: blueBrief.semanticCategory,
  },
};

writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify(state, null, 2));
