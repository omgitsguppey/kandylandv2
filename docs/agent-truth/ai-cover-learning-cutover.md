# AI Cover Learning Cutover

KandyDrops AI cover learning is deterministic.

- Title-derived semantic briefs remain the highest authority.
- Accepted or liked covers are the only positive visual references.
- Disliked outputs are negative constraints only.
- Neutral generated covers are not positive references.
- Failed or blocked covers are not references.
- Reference selection is capped before request and trims to explicit positive eligibility plus the primary layout anchor.
- Prompt refinement LLMs for covers are blocked.
- Dislikes immediately update the next deterministic prompt delta.
- Prompt readiness is scored before generation and low-readiness prompts are blocked before image generation.
- Debug provenance remains collapsed in the admin UI.

Doctrine:
AI cover improvement is a deterministic learning system, not a model-invented optimizer. The system learns from explicit feedback, stores normalized learning records, blocks semantic drift before cost is spent, and keeps reference use explainable and title-safe.

Source-of-truth hierarchy:

1. Semantic brief: title-derived creator brand, flavor title, semantic category, hero object, palette, required tokens, allowed enrichment tokens, and forbidden tokens.
2. Feedback normalization: explicit admin actions only. Likes and accepted covers become positive reference evidence; dislikes become negative constraints; neutral/generated covers stay history/debug only.
3. Negative memory: repeated disliked or blocked outcomes become deterministic forbidden-token/category pressure. Negative memory never becomes positive prompt instruction.
4. Reference eligibility: primary layout anchors may guide layout; only liked/accepted category-safe references can guide style; disliked, failed, blocked, neutral, or cross-category outputs are excluded before request.
5. Prompt delta: compressed deterministic deltas may add only title-safe, category-safe refinements. Unsafe optimizer text is rejected and summarized for debug.
6. Improvement score and preflight: readiness is scored before provider calls. Low readiness or semantic conflict blocks image generation before cost is spent.
7. Admin display: admin AI shows compact human-readable status first; prompt provenance, reference metadata, optimizer notes, and missing evidence stay collapsed and must degrade to unavailable or needs review rather than healthy.

Validator path:

- `npm run score:ai-cover-learning` regenerates `agent/state/ai-cover-learning-cutover.generated.json`.
- `npm run check:ai-cover-learning-cutover` validates the generated snapshot.
- `npm run check:ai-cover-hard-cutover-v2` validates compiler/preflight/admin UI hard-cutover rules.
