# AI Cover Prompt Compiler

KandyDrops cover generation now uses deterministic title/flavor/layout compilation.

- Canonical source: `src/lib/ai-cover/*`
- Prompt source marker: `data-cover-prompt-source="deterministic-compiler"`
- Title authority marker: `data-cover-title-source="title-prefix"`
- LLM prompt refinement route status: blocked/deprecated (`cover_prompt_refinement_blocked`)

Doctrine:
LLM prompt refinement for cover text is blocked. Image models remain active generation engines. Thumbs feedback updates compiler weights, not LLM prompt memory.
