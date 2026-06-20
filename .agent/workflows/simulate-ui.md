// turbo-all
# Omni-System UI Simulation Workflow

This workflow routes explicit UI simulation requests. It is not the default detector for broken admin surfaces, modals, source-state labels, or beta-exit readiness. Source coverage, route contracts, selectors, hydration markers, and client-error fixtures should report the issue first; browser simulation is reproduction or diagnostic evidence after that boundary is clear.

## Step 1: Routing & Dev Environment
1. Identify what the user asked to test.
   - If they ask for isolated component rendering/styling checks -> Navigate to `.storybook/` and `src/components`. Start `npm run test:ui:storybook`.
   - If they ask for React State debugging or Time-Travel -> Start `npm run test:ui:cypress`. Provide them a boilerplate test.
   - If they ask for deep scraping, automation exports, or auth-tokens -> Run `npm run test:ui:puppeteer`.
   - If they ask for cross-browser, strict structural verification, or a source finding promotes visual reproduction -> Run `npm run check:ui:audits` (Playwright).
   - If they ask whether an admin action, modal, or source-state label is connected -> start with `npm run check:ui:coverage`, `npm run check:ui:runtime`, and the surface-specific source validator before browser reproduction.

## Step 2: Test Orchestration
1. Formulate a temporary test script inside the matching framework's directory (e.g. `cypress/e2e/temp.cy.ts`).
2. Run the specific script using the framework's strict runner command.

## Step 3: Flag and Report (Strictly No Code Changes)
1. Read the framework's terminal output or visual generation.
2. **CRITICAL RULE:** Do NOT modify any source code (`.tsx`, `.ts`, etc.) to fix the issues discovered by the framework. 
3. Compile the errors into an artifact titled `omni_ui_report.md`.
4. Delete the temporary script file created in Step 2.
5. Present the specific error stack gracefully and wait for confirmation before fixing any UI bugs.
