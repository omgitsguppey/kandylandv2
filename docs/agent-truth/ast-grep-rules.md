# Ast-Grep Source Rules

KandyDrops ast-grep rules are deterministic source guardrails. They catch forbidden shell, safe-area, preview content-protection, diagnostics, timer, and breakpoint patterns from source files without replacing targeted tests or broad runtime validation. They must output actionable findings and must not mutate product behavior.

## Command

- `npm run check:ast-grep-rules`

This command runs `scripts/agent/run-ast-grep-rules.ts`, which uses `@ast-grep/napi` for JavaScript/TypeScript AST call detection and deterministic source scanning for layout/string patterns. It does not run Playwright, Lighthouse, Cypress, full `npm run check`, or broad UI audits.

## Rule Catalog

- `kd-no-100vh-public-shell`: flags `100vh` in public shell, chat shell, and locked preview files. Suggested fix: use `100dvh` or a shared shell viewport token from `src/lib/user-mobile-shell.ts`.
- `kd-no-hardcoded-safe-area-bottom`: flags hardcoded safe-area bottom math in public shell, chat shell, floating control, and locked preview files outside `src/lib/user-mobile-shell.ts`. Suggested fix: move bottom-nav and safe-area math into shared shell tokens.
- `kd-no-shell-translate-or-negative-margin`: flags negative margins or `translate-y` positioning hacks in shell-critical files. Suggested fix: use shell-aware viewport math and spacing tokens.
- `kd-no-locked-preview-content-url`: flags `contentUrls`, `contentUrl`, internal files, or file mapping on dedicated locked preview surfaces. Suggested fix: render only safe preview fields before unlock and keep content URLs server-entitled.
- `kd-no-hot-handler-direct-reporting`: flags `reportClientIssue` or `reportRealtimeIssue` directly inside tap/focus paths. Suggested fix: defer diagnostics after paint or idle.
- `kd-no-unapproved-setinterval`: flags `setInterval` in shell, chat, and preview files unless a narrow legacy context is explicitly whitelisted. Suggested fix: use deferred readiness, visibility, or one-shot timeout helpers.
- `kd-no-duplicate-breakpoint-constants`: flags breakpoint-like constants outside `src/lib/device-layout-contract.ts`. Suggested fix: import or extend the canonical device layout contract.

## Output Contract

Every finding prints:

- file
- line
- category
- severity
- rule id
- excerpt
- suggested fix

The command exits nonzero when findings are present or when required configs/docs/package wiring are missing.

## Config Files

- `ast-grep.yml` is the KandyDrops rule catalog and source of rule ids/severity/category/suggested fixes.
- `sgconfig.yml` anchors the ast-grep language globs for ad hoc CLI usage.
- `scripts/agent/run-ast-grep-rules.ts` is the canonical validation path because KandyDrops rules need path scoping, product whitelists, and source-specific suggestions.
