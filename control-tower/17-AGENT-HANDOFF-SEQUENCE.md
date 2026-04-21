# Agent Handoff Sequence

This document defines the exact order of collaboration for executing features, fixes, and audits in the KandyDrops repository.

## The Standard Sequence

### Step 1: Foundation (ANTIGRAVITY)
*   **Action:** Antigravity classifies the task, consults doctrine (`08-DOCTRINE-INDEX.md`) and truth maps (`06-SOURCE-OF-TRUTH-MAP.yaml`), and verifies required tools.
*   **Execution:** Antigravity implements structural changes, Firebase architecture, shared components, and telemetry hooks.
*   **Definition of Done:** Foundational code is committed, TypeScript compiles, and a formal Handoff Report (`09-HANDOFFS.md`) is generated for Jules.

### Step 2: Bounded Execution (JULES)
*   **Action:** Jules receives the Handoff Report.
*   **Execution:** Jules performs isolated implementation within the explicit boundaries set by Antigravity (e.g., wiring a specific component to the new hook). Jules follows all Banned Patterns and Doctrine constraints.
*   **Definition of Done:** UI/logic is complete, isolated patches pass linting, and changes are pushed. A Handoff Report is generated for Codex/GPT.

### Step 3: Verification (CODEX/GPT)
*   **Action:** Codex/GPT reviews the committed changes against the original prompt and the Control Tower doctrine.
*   **Execution:** Codex/GPT performs a skeptical audit—hunting for fake fallback labels, duplicated logic, or broken telemetry paths.
*   **Definition of Done:** A verification artifact is output explicitly confirming no regressions occurred, or issues are flagged to route back to Jules.

## Fallback Sequence (If Codex/GPT is Unavailable)

If the Codex/GPT verification layer is handicapped or unavailable:
1. **Antigravity assumes local verification responsibility.**
2. Antigravity must perform a dedicated, subsequent self-verification pass.
3. **MANDATORY LABEL:** Any sign-off under this fallback mode MUST be explicitly labeled: `[NON-INDEPENDENT VERIFICATION PERFORMED DUE TO CODEX UNAVAILABILITY]`. No agent may claim full independent verification if Codex/GPT was not involved. Jules continues its standard recurring background work.
