# Workflow: UI & Copy Refinement

**Purpose:** To codify the exact loop required when refining or modifying any user-facing UI, copy, or product interaction. **Improvisational "just make it better" changes are strictly forbidden.**

## Step 1: Inspect Surface
*   Identify the exact React components and CSS files responsible for the surface.
*   Understand the current state handling.

## Step 2: Consult Doctrine
*   **MANDATORY:** Execute the `doctrine-consultation` skill.
*   Read the relevant entries in the `/docs/doctrine` directory.

## Step 3: Identify State Owner
*   Determine what hook, context, or data fetcher owns the state for this UI.
*   Ensure that any new states (loading, error, empty) are handled truthfully.

## Step 4: Identify Telemetry Path
*   Determine if this UI interaction triggers an analytics event.
*   If you are changing the conversion flow, you must account for the telemetry implications.

## Step 5: Identify Admin/Audit Path
*   Determine how an admin verifies the state of this UI. Does it report to `AdminTruthSurfaces` or the `_system` feed?

## Step 6: Patch
*   Make the code changes using exact vocabulary from `kandydrops-vocabulary-index.md`.
*   Enforce UI density and hierarchy rules from `kandydrops-ui-doctrine.md`.

## Step 7: Verify
*   Ensure the Typescript compiler and ESLint copy-contract rules pass.
*   Verify the aesthetic matches the "premium candy-coded" mandate.

## Step 8: Report
*   Document exactly which doctrine rules were applied and why the change was necessary in the task/walkthrough artifact.
