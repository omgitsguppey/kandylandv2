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
1. Reuse an existing focused test first. Create a temporary test only when the framework requires it, keep it outside tracked source when possible, and remove it through the supported cleanup path.
2. Run the narrowest framework command that exercises the reported behavior.

## Step 3: Classify And Report
1. Read the framework's terminal output or visual generation.
2. For a simulation-only request, report the observed behavior and leave source untouched.
3. If the task also authorizes a fix, route the evidence through compact context, the surface doctrine, and the normal source-first implementation flow; do not treat a browser result as sufficient proof of the cause.
4. Report findings in the task response or an explicitly requested artifact. Do not leave a generic `omni_ui_report.md` in the repository.
