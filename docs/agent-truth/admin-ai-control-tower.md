# Admin AI Control Tower

Status: canonical admin AI routing and fallback doctrine for Phase 1 debug-first stabilization

## Model Roles

- Canonical preview text model: `Gemini 3.1 Flash-Lite Preview` (`gemini-3.1-flash-lite-preview`)
- `admin_debug_assistant` uses `gemini-3.1-flash-lite-preview`
- `admin_debug_fix_planner` uses `gemini-3.1-flash-lite-preview`
- `cover_prompt_refinement` uses `gemini-3.1-flash-lite-preview`
- `cover_image_generation` stays on the existing image-generation models
- deterministic fallback uses no paid model

Actual image-generation routing must remain unchanged for cover generation. Do not replace image-generation lanes with Flash-Lite text models.

## Cover Reference Limit

- Cover image generation is model-aware, but the current supported image-generation lane uses up to 2 references per generation call.
- The saved reference library may contain more than 2 items.
- Generation input must cap to 2 references before the provider call.
- If more than 2 references are eligible, keep the first 2 by explicit selection order when present; otherwise keep the first 2 from the deterministic priority order.
- Return limit metadata and warning truth:
  - `referenceLimitApplied`
  - `requestedReferenceCount`
  - `usedReferenceCount`
  - `maxReferenceCount`
  - `droppedReferenceCount`
- Admin UI copy must explain:
  - "This model uses up to 2 references. We'll use the first 2 selected."

## Page-Load Cost Guard

No paid AI calls on admin page load. The admin debug assistant status route may return:

- saved guidance
- deterministic fallback
- runtime readiness

Live guidance is an explicit admin action only.

## Fallback Truth

If the live model call fails, the UI must render degraded state with deterministic fallback. Do not present fallback output as live output.

Required fallback language:

- "Live AI summary delayed. Showing deterministic fallback."

If a saved live summary exists, it may be shown as saved guidance, not as a new live result.

Required freshness fields:

- current configured model
- resolved runtime model
- displayed summary source
- displayed summary freshness
- debug evidence generated timestamp
- displayed summary generated timestamp
- last live model run timestamp
- fallback generated timestamp
- fallback latency vs live model latency

Saved summaries generated with an older model must stay distinguishable from the current configured model.

## Safe Action Model

The assistant supports inspect/apply/dismiss presentation, but safe mutation is narrow:

- inspect-only proposals must show `Inspect`, not `Apply`
- unsupported fixes must return typed manual review
- arbitrary model-produced code patches are forbidden
- auto-apply is not permitted unless a bounded, explicit repair implementation exists

## Debug Guidance Shape

The assistant should produce Jules-level debug guidance:

- issue summary
- source evidence
- likely cause
- safe fix plan
- files to inspect
- validators to run
- apply eligibility
- rollback note
- confidence

## Admin Auth and Origin

All mutation-capable assistant routes remain:

- admin-auth protected
- trusted-origin protected
- rate-limited

## Validation

Run:

```bash
npm run check:admin-ai-control-tower
npm run check:debug-control-tower-cutover
npm run check:google-cost
```

## Deterministic Cutover

- `cover_prompt_refinement` is blocked for active cover prompt generation.
- Cover prompt source is deterministic compiler output (`data-cover-prompt-source="deterministic-compiler"`).
- Description source is deterministic patterns with optional polish (`data-description-ai-polish="optional"`).
- Admin AI layout marker for compact mode: `data-ai-dashboard-density="compact-v2"`.
