# Skill: Doctrine Consultation

**Description:** Instructs the agent on how to consult the KandyDrops Doctrine before touching any UI, copy, or product-facing surface.

## Pre-Requisites
Before adjusting *any* UI layout, copy text, or interaction logic, you MUST run this consultation skill. Do not rely on your generic LLM intuition.

## Execution Steps

1. **Read Required Files:**
   Read `/docs/doctrine/kandydrops-product-doctrine.md`, `/docs/doctrine/kandydrops-copy-doctrine.md`, and `/docs/doctrine/kandydrops-ui-doctrine.md`.
   *Action:* Use `view_file` on these documents.

2. **Identify the Surface:**
   Locate the relevant surface in `/docs/doctrine/kandydrops-surface-matrix.md` and identify its Primary Job, Emotional Role, Tone Family, and Allowed Urgency.

3. **Check Banned Patterns:**
   Consult `/docs/doctrine/kandydrops-banned-patterns.md` and `/docs/doctrine/kandydrops-vocabulary-index.md` to ensure your proposed changes do not use forbidden terminology or UI anti-patterns.

4. **Identify the Source of Truth:**
   Determine where the data for this UI comes from (e.g., Firestore, Remote Config). Ensure any visual states accurately reflect this truth (live, stale, fallback, failed).

5. **Complete the Checklist:**
   Review `/docs/doctrine/kandydrops-decision-checklist.md`. You must be able to answer every question on that checklist before implementing the code change.

## Expected Outcome
You should now have a concrete understanding of *why* the surface looks the way it does and exactly *how* to modify it without violating the KandyDrops premium aesthetic and truth-first data principles. Proceed to implementation only if all checks pass.
