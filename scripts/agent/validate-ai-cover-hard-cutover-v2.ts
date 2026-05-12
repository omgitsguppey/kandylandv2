import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { getAiModelReferenceLimit } from "@/lib/admin-ai-models";
import { buildCoverGenerationPreflight, validateCoverPromptAgainstSemanticBrief } from "@/lib/ai-cover/cover-generation-preflight";
import { buildCoverSemanticBrief } from "@/lib/ai-cover/cover-semantic-brief";
import { applyCoverOptimizerGuard } from "@/lib/ai-cover/cover-optimizer-guard";
import { compileCoverPrompt } from "@/lib/ai-cover/cover-prompt-compiler";
import { trimReferencePoolToModelLimit } from "@/lib/ai-cover/cover-reference-policy";

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function expectContains(haystack: string, needle: string, message: string) {
  assert.ok(haystack.includes(needle), message);
}

function expectNotContains(haystack: string, needle: string, message: string) {
  assert.ok(!haystack.includes(needle), message);
}

function run() {
  const pinkBrief = buildCoverSemanticBrief({ title: "Jessi Ray’s Pink Lemonade", creatorSelectedName: "Jessi Ray" });
  assert.equal(pinkBrief.creatorBrand, "Jessi Ray’s");
  assert.equal(pinkBrief.flavorTitle, "Pink Lemonade");
  assert.equal(pinkBrief.semanticCategory, "pink_lemonade_beverage");
  assert.equal(pinkBrief.heroObject, "pink lemonade with lemon slices and pink citrus sparkle");

  const muffinBrief = buildCoverSemanticBrief({ title: "Bloomytrip’s Blueberry Muffins", creatorSelectedName: "Bloomytrip" });
  assert.equal(muffinBrief.semanticCategory, "bakery_muffin");
  assert.equal(muffinBrief.heroObject, "blueberry muffins with baked blueberries and muffin crumb texture");

  const chocolateBrief = buildCoverSemanticBrief({ title: "Jessi Ray’s Chocolate Bar", creatorSelectedName: "Jessi Ray" });
  assert.equal(chocolateBrief.semanticCategory, "chocolate_bar");
  assert.equal(chocolateBrief.heroObject, "glossy chocolate bar");

  const contaminatedOptimizer = [
    "creamy milk-chocolate mountain peaks",
    "molten fudge",
    "soft-focus warm brown gradient",
    "copper serving pedestal",
  ].join("\n");
  const optimizerGuard = applyCoverOptimizerGuard({ brief: pinkBrief, optimizerPrompt: contaminatedOptimizer });
  assert.equal(optimizerGuard.conflictDetected, true, "Optimizer contamination should be rejected.");
  assert.equal(optimizerGuard.acceptedText, "", "Unsafe optimizer text must not survive the guard.");
  assert.ok(optimizerGuard.rejectedText.length >= 1, "Rejected optimizer text should be tracked.");

  const safeOptimizer = [
    "lemon slices",
    "pink citrus sparkle",
    "sugar crystals",
  ].join("\n");
  const safeGuard = applyCoverOptimizerGuard({ brief: pinkBrief, optimizerPrompt: safeOptimizer });
  assert.equal(safeGuard.conflictDetected, false, "Category-safe optimizer text should pass.");
  assert.ok(safeGuard.acceptedText.length > 0, "Safe optimizer text should be retained.");

  const pinkPrompt = compileCoverPrompt({
    title: "Jessi Ray’s Pink Lemonade",
    creatorSelectedName: "Jessi Ray",
    imageModel: "drop_cover_standard",
    optimizerPrompt: contaminatedOptimizer,
  }).prompt;
  expectContains(pinkPrompt, "pink lemonade", "Pink Lemonade prompt should preserve the title concept.");
  expectContains(pinkPrompt, "lemon", "Pink Lemonade prompt should keep lemon semantics.");
  expectContains(pinkPrompt, "citrus", "Pink Lemonade prompt should keep citrus semantics.");
  expectContains(pinkPrompt, "pink", "Pink Lemonade prompt should keep pink semantics.");
  expectNotContains(pinkPrompt, "cherry crush", "Pink Lemonade prompt must not drift to cherry.");
  expectNotContains(pinkPrompt, "chocolate", "Pink Lemonade prompt must not drift to chocolate.");
  expectNotContains(pinkPrompt, "fudge", "Pink Lemonade prompt must not drift to fudge.");
  expectNotContains(pinkPrompt, "brown", "Pink Lemonade prompt must not drift to brown palette contamination.");
  expectNotContains(pinkPrompt, "copper", "Pink Lemonade prompt must not drift to copper props.");
  expectNotContains(pinkPrompt, "honeycomb", "Pink Lemonade prompt must not drift to honey.");
  expectNotContains(pinkPrompt, "muffin", "Pink Lemonade prompt must not drift to muffin.");
  expectNotContains(pinkPrompt, "apple pie", "Pink Lemonade prompt must not drift to apple pie.");

  const muffinPrompt = compileCoverPrompt({
    title: "Bloomytrip’s Blueberry Muffins",
    creatorSelectedName: "Bloomytrip",
    imageModel: "drop_cover_standard",
    optimizerPrompt: contaminatedOptimizer,
  }).prompt;
  expectContains(muffinPrompt, "blueberry muffins", "Blueberry Muffins prompt should preserve muffin semantics.");
  expectContains(muffinPrompt, "muffin", "Blueberry Muffins prompt should keep muffin semantics.");
  expectContains(muffinPrompt, "bakery", "Blueberry Muffins prompt should stay in bakery semantics.");
  expectNotContains(muffinPrompt, "drink", "Blueberry Muffins prompt must not drift to beverage language.");
  expectNotContains(muffinPrompt, "slush", "Blueberry Muffins prompt must not drift to slush.");
  expectNotContains(muffinPrompt, "cup", "Blueberry Muffins prompt must not drift to beverage props.");
  expectNotContains(muffinPrompt, "cherry soda", "Blueberry Muffins prompt must not drift to soda/cherry.");
  expectNotContains(muffinPrompt, "cocktail", "Blueberry Muffins prompt must not drift to cocktail language.");

  const badPromptReason = validateCoverPromptAgainstSemanticBrief(
    "Top brand text: Jessi Ray’s. Main title: Pink Lemonade. Lock the semantic category to cherry crush. Hero object: cherry crush candy drink.",
    pinkBrief,
  );
  assert.ok(badPromptReason && badPromptReason.length > 0, "A semantic prompt conflict should be blocked.");

  const preflight = buildCoverGenerationPreflight({
    title: "Jessi Ray’s Pink Lemonade",
    creatorSelectedName: "Jessi Ray",
    imageModel: "drop_cover_standard",
    optimizerPrompt: contaminatedOptimizer,
    requestedReferenceCount: 17,
    selectedReferenceCount: 2,
    maxReferenceCount: 2,
  });
  assert.equal(preflight.ok, false, "Contaminated optimizer prompts should be blocked before generation.");
  assert.equal(preflight.optimizerGuard.conflictDetected, true, "Preflight should record discarded optimizer contamination.");
  assert.equal(preflight.readinessScore < 0.78, true, "Contaminated optimizer prompts should fall below the readiness threshold.");
  assert.equal(preflight.referencePolicy.referencePoolTrimmed, true, "Reference pools above the cap should be trimmed.");

  const trimmed = trimReferencePoolToModelLimit([1, 2, 3, 4], 2);
  assert.equal(trimmed.selectedReferences.length, 2, "Reference trimming should honor the model cap.");
  assert.equal(trimmed.referencePoolTrimmed, true, "Reference trimming should report trimmed pools.");

  assert.equal(getAiModelReferenceLimit("drop_cover_standard"), 2, "Standard cover model reference cap should remain intact.");
  assert.equal(getAiModelReferenceLimit("drop_cover_premium"), 2, "Premium cover model reference cap should remain intact.");

  const recentGenerationsSource = readRepoFile("src/app/admin/ai/components/AdminAiRecentgenerationsSection.tsx");
  expectContains(recentGenerationsSource, "Debug details", "Recent generations should collapse technical detail by default.");
  expectNotContains(recentGenerationsSource, "v{job.promptPolicyVersion", "Prompt policy version should not be shown in the primary result card.");

  const coverPanelSource = readRepoFile("src/components/Admin/AiDropCoverGeneratorPanel.tsx");
  expectContains(coverPanelSource, "Debug notes", "Reference cap warnings should be collapsed in the main create flow.");
  expectNotContains(coverPanelSource, "This model uses up to", "The old reference-cap warning should not be visible in the primary flow.");
  expectNotContains(coverPanelSource, 'label="live"', "The cover panel should not use a live chip in the primary flow.");

  const promptPolicyRouteSource = readRepoFile("src/app/api/admin/ai/drop-covers/prompt-policy/route.ts");
  expectContains(promptPolicyRouteSource, "cover_prompt_refinement_blocked", "Cover prompt refinement LLM routes must remain blocked.");

  const serverCoverSource = readRepoFile("src/lib/server/ai-drop-covers.ts");
  expectContains(serverCoverSource, "Generation blocked: prompt conflicted with title semantics.", "Server preflight should block semantic drift.");
  expectContains(serverCoverSource, "buildCoverGenerationPreflight", "Server generation should route through the semantic preflight.");

  const compilerSource = readRepoFile("src/lib/ai-cover/cover-prompt-compiler.ts");
  expectContains(compilerSource, "semanticCategory.replace(/_/g, \" \")", "The compiler should lock the semantic category explicitly.");
  expectContains(compilerSource, "Safe refinement from feedback", "Optimizer suggestions should only contribute safe refinements.");

  console.log("ai-cover-hard-cutover-v2: PASS");
}

run();
