# Device Layout Repair

Status: Active public beta deterministic repair doctrine  
Last updated: 2026-05-04  
Repair command: `npm run repair:layout`  
Apply command: `npm run repair:layout -- --apply`  
Scoring dependency: `npm run score:layout`

## Doctrine

KandyDrops layout repair is deterministic. It may apply only exact, high-confidence source-token replacements that are already marked safe by `src/lib/device-layout-score.ts`. It must escalate anything that needs visual judgment, product intent, keyboard runtime verification, content-protection review, copy review, payment/auth/unlock review, or creator eligibility review.

Google owns the structural contract: viewport units, display modes, responsive tiers, safe-area variables, and input-delay risk.

Apple owns the cohesion contract: safe areas, navigation stability, touch targets, and separation between navigation and actions.

KandyDrops owns product physics: browser converts, PWA retains, desktop manages, and admin/debug surfaces must report truthfully.

## Command Behavior

`npm run repair:layout` is a dry run. It builds the current layout score report, prints every available safe plan, writes the read-only generated score artifact, and exits without modifying source files.

`npm run repair:layout -- --apply` applies plans one at a time. After each applied fix, the repair command reruns the layout scorer. If the score decreases or a new critical finding appears, that specific file change is reverted and the plan is reported as skipped.

The generated report remains:

```text
agent/state/device-layout-score.generated.json
```

## Allowed Autofixes

Only these exact classes of fixes may be applied:

- `100vh` to `100dvh` in the approved shell/chat/preview file allowlist.
- `CHAT_LIST_FLOATING_ACTION_BOTTOM_OFFSET = "0px"` to the shared chat bottom-nav-safe token.
- hardcoded `GlobalBugReportTrigger` or `ScrollToTop` bottom offsets to the shared floating-control token when that token already exists.
- exact deprecated spacing constants to approved tokens when the score engine marks the finding safe.
- exact data attributes on known shell wrappers only when the scorer marks the fix safe and the edit does not change visible behavior.

## Never Autofix

The repair lane must never modify:

- payment, PayPal, ledger, source-of-funds, or wallet economics logic.
- auth, session, role, or creator eligibility logic.
- unlock enforcement or locked content access rules.
- content-protection decisions for locked previews.
- product copy or visible UI language.
- keyboard runtime behavior or visual layout judgment.

## Safety Gate

Every applied plan must pass all gates:

- `canAutofix = true`.
- `autofixConfidence >= 0.95`.
- exact file path match.
- exact old text occurrence count match.
- protected paths are rejected.
- old and new text differ.
- layout score does not get worse after the individual fix.
- no new critical finding appears after the individual fix.

If any gate fails, the tool prints a human-readable skipped reason and leaves the source unchanged.

## Verification

Default verification for this lane is source-only:

```bash
npm run repair:layout
npm run score:layout
```

Run `npm run repair:layout -- --apply` only when the dry run reports safe plans. Do not run Playwright, Lighthouse, Cypress, broad UI audits, or full repo checks as part of this repair lane.
