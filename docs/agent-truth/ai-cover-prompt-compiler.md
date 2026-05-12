# AI Cover Prompt Compiler

KandyDrops cover generation now uses deterministic title/flavor/layout compilation.

- Canonical source: `src/lib/ai-cover/*`
- Title-derived semantic brief is the only authority for creator brand, flavor title, semantic category, hero object, palette, and allowed enrichment tokens.
- Reference outputs may preserve layout and lighting polish, but they do not override title semantics.
- Optimizer suggestions are category-safe only; conflicting optimizer text is discarded before generation.
- Learning is deterministic: likes and accepted covers can strengthen future prompts, dislikes become negative constraints, and neutral/generated covers are not positive references.
- Prompt source marker: `data-cover-prompt-source="deterministic-compiler"`
- Title authority marker: `data-cover-title-source="title-prefix"`
- LLM prompt refinement route status: blocked/deprecated (`cover_prompt_refinement_blocked`)

Doctrine:
LLM prompt refinement for cover text is blocked. Image models remain active generation engines. Thumbs feedback updates compiler weights, not LLM prompt memory. Semantic drift blocks generation, while safe category enrichment remains allowed.
