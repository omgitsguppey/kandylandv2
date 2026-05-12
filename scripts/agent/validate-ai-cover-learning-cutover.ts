import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const statePath = resolve(repoRoot, "agent/state/ai-cover-learning-cutover.generated.json");

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    fail(message);
  }
}

if (!existsSync(statePath)) {
  fail("Missing ai-cover-learning state output.");
}

const state = JSON.parse(readFileSync(statePath, "utf8")) as {
  files: Record<string, boolean>;
  selector: { selectedIds: string[]; rejectedIds: string[]; neutralRejected: boolean; dislikedRejected: boolean };
  learning: { negativeConstraint: string; promptInstruction: string; rejectedSuggestions: string[]; blockStrength: number; repeatedFailureTags: Array<{ tag: string; count: number }> };
  preflight: { ok: boolean; blockedReason: string | null; readinessScore: number };
  scores: { goodReadiness: number; blueberryConflict: number };
  optimizerBlocked: { noGeminiInOptimizePath: boolean };
  uiMarkers: { compactMarker: boolean; collapsedNotes: boolean };
  references: { acceptedOnly: boolean; primarySelected: boolean; referenceCapApplied: boolean; pinkBriefCategory: string; blueBriefCategory: string };
};

for (const [name, present] of Object.entries(state.files)) {
  assert(present, `Missing learning file: ${name}`);
}

assert(state.selector.neutralRejected, "Neutral generated reference was not rejected.");
assert(state.selector.dislikedRejected, "Disliked reference was not rejected.");
assert(state.references.referenceCapApplied, "Reference cap was not applied before request.");
assert(state.references.acceptedOnly, "Accepted reference did not remain selectable.");
assert(state.references.primarySelected, "Primary layout reference is not selected.");
assert(state.optimizerBlocked.noGeminiInOptimizePath, "Gemini optimizer is still active in the cover learning path.");
assert(state.uiMarkers.compactMarker, "Compact AI cover marker is missing from the main result UI.");
assert(state.uiMarkers.collapsedNotes, "Debug notes are not collapsed in the main AI cover UI.");
assert(state.learning.negativeConstraint === "negative_constraint", "Dislike is not treated as a negative constraint.");
assert(state.learning.promptInstruction.includes("Force the title semantics exactly"), "Prompt delta engine is missing required semantic locks.");
assert(state.learning.promptInstruction.includes("pink lemonade"), "Prompt delta engine did not preserve Pink Lemonade semantics.");
assert(state.learning.promptInstruction.includes("lemon slices"), "Prompt delta engine did not preserve category-safe enrichment.");
assert(state.learning.rejectedSuggestions.length > 0, "Conflicting optimizer suggestions were not rejected.");
assert(state.learning.blockStrength >= 0.25, "Repeated dislike block strength is too weak.");
assert(state.preflight.ok === false, "Bad prompt was not blocked before generation.");
assert(typeof state.preflight.blockedReason === "string" && state.preflight.blockedReason.length > 0, "Bad prompt did not return a blocked reason.");
assert(state.preflight.readinessScore < 0.78, "Bad prompt readiness was not reduced below the block threshold.");
assert(state.scores.goodReadiness > 0.78, "Healthy prompt readiness score is too low.");
assert(state.scores.blueberryConflict <= 1, "Reference conflict scoring is invalid.");
assert(state.references.pinkBriefCategory === "pink_lemonade_beverage", "Pink Lemonade semantic category is wrong.");
assert(state.references.blueBriefCategory === "bakery_muffin", "Blueberry Muffins semantic category is wrong.");

console.log("ai-cover-learning-cutover: PASS");
