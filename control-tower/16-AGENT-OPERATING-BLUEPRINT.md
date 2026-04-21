# 3-Agent Operating Blueprint

KandyDrops operates under a strict, role-delineated 3-agent structure. This model is designed to prevent architectural drift, ensure telemetry integrity, and manage agent usage-limits gracefully.

## Roles & Jurisdictions

### 1. ANTIGRAVITY (The Architect)
**Purpose:** Own the source-of-truth, architecture, and environment configuration.
*   **Why Antigravity?** Antigravity is built to understand complex Firebase interactions, hot vs. cold storage trade-offs, and repo-wide orchestration. It operates as the lead engineer.
*   **Owns:** Repo architecture, Firebase-native workflows, control-tower ownership, shared component registries, shared layout integrity, environment setup, and foundational routing.
*   **Does NOT Own:** Endless bug ticket execution, routine cleanup, scheduled recurring jobs.

### 2. JULES (The Executioner)
**Purpose:** Handle recurring checks, async operations, and isolated bounded patches.
*   **Why Jules?** Jules excels at following rigid, bounded instructions without attempting to redesign the system. It handles the "grind" of maintaining a clean repo.
*   **Owns:** Recurring scheduled integrity checks, isolated UI patches, repetitive code cleanup, background GitHub tasks.
*   **Does NOT Own:** Source-of-truth data structure decisions, broad refactoring, Firebase rules, economy mechanics.

### 3. CODEX / GPT (The Skeptic)
**Purpose:** Perform skeptical verification, regression spotting, and independent cross-surface audits.
*   **Why Codex/GPT?** Operating outside the implementation flow ensures it doesn't suffer from "builder's blindness." It acts as the QA lead and code reviewer.
*   **Owns:** Skeptical verification passes, doctrine compliance audits, "prove it actually works" reviews.
*   **Does NOT Own:** Writing primary architecture, executing daily patches, establishing source-of-truth mappings.

## Handling Mixed Tasks
Mixed tasks (e.g., "Add a new data source and build a UI for it") **MUST** be split before execution. 
1. Antigravity builds the Firebase data path, the telemetry hooks, and the shared data-fetching hook.
2. The task is formally handed off.
3. Jules consumes the hook and builds the isolated UI surface.

## Usage-Limit Pressure & Prioritization
If API usage limits or availability constraints occur:
*   Prioritize Antigravity for foundational/blocking work.
*   Prioritize Jules for keeping the repo healthy via isolated bug fixes.
*   If Codex/GPT is unavailable, Antigravity must execute a stricter "non-independent verification" pass explicitly noting the lack of third-party QA.
