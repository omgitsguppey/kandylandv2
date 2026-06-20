---
---
description: "Auto-run standard project commands"
---

// light-default

Default to the light path. Use broad checks only when the task is broad, release-risk, or the verification selector explicitly marks them as signoff-required.
This file is a command menu, not permission to run every listed command. Source-first local checks are the default; browser, provider, GitHub, merge, push, and full-suite commands require an explicit task need, selector promotion, or human instruction.

1. Check git status:
   `git status --short`

2. Generate compact task context for narrow or moderate work:
   `npm run agent:fast-start -- --task "<task description>" --mode=<mode> --file=<path>`

3. Resolve verification lanes for known touched files:
   `npm run agent:verify -- --paths=<path1,path2>`

4. Search narrowly before escalating:
   `git ls-files`
   `rg "<pattern>" --glob "!node_modules/**" --glob "!.next/**" --glob "!coverage/**" --glob "!playwright-report/**" --glob "!test-results/**" --glob "!lighthouse-results/**"`

5. Run fast local sanity:
   `npm run typecheck`
   `npm run lint`

6. Run task-scoped tests or validators:
   `npm run agent:test -- <path>`
   `npm run <task-specific-check>`

7. Signoff-only checks for broad or release-risk work:
   `npm run check:inventory`
   `npm run check:architecture`
   `npm run check:continuity`
   `npm run test:contracts`

8. Promoted external, browser, or broad gates only when explicitly required by current doctrine, selector output, a source finding, or the human operator. These commands are not source-readiness defaults and must not clear runtime/provider/admin truth unless a formal artifact contract says so:
   `npm run check:ui:audits`
   `npm run check:ui:lighthouse`
   `npm run check:firebase:rules`
   `npm run check`

9. Build Storybook when UI tooling changes:
   `npm run build-storybook`

10. Audit telemetry and analytics semantics when telemetry/analytics changed:
   `npm run check:telemetry`
   `npm run check:analytics-semantics`

11. Trace adjacent surfaces before broad audits:
   `npm run trace:adjacent -- <path>`

12. Run targeted verification for touched analytics and admin surfaces:
   `npm run agent:test <path>`
   `npm --prefix functions run check`

13. Run warning-focused dependency and tooling verification when cleanup touches packages or lockfiles:
   `npm run check:deps`

19. Reconcile open PRs against current repo truth only when PR triage is the task or the operator explicitly asks for it. Prefer cached/source metadata when available; do not let GitHub auth/network availability decide local source readiness:
   `gh pr list --state open --json number,title,headRefName,baseRefName,author,isDraft,mergeStateStatus,reviewDecision,url`
   `gh pr view <number> --json number,title,body,files,commits,comments,reviews,author,headRefName,baseRefName,url`
   `gh pr diff <number>`
   `npm run trace:adjacent -- "src/app/api/admin/users/[userId]/username/route.ts"`
   `npm run trace:adjacent -- src/components/Admin/AssetUploader.tsx`
   `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
   `npx vitest run tests/unit/admin-user-username-route.spec.ts tests/unit/admin-analytics-page.spec.tsx`
   `npm run typecheck`
   `npm run check:continuity`
   `gh pr close <number> --comment "<reason>"`
   `npm run check:versions`
   `npm run lint`
   `npm audit --audit-level=moderate`
   `npm --prefix functions audit --audit-level=moderate`

12. Apply package remediation for verified dependency findings:
   `npm uninstall <packages>`
   `npm install -D <packages>`
   `npm install <packages>`
   `corepack pnpm install --lockfile-only --ignore-scripts`

13. Run targeted contract and warning diagnosis when test suites or deprecations remain:
   `npm run test:contracts`
   `NODE_OPTIONS=--trace-deprecation npx vitest run <test-paths>`
   `npm ls punycode`
   `npm --prefix functions ls punycode`

14. Review and resolve open GitHub pull requests only when explicitly scoped. Do not close, merge, or push from this checklist without current human approval and a clean focused slice:
   `gh pr list --state open`
   `gh pr view <number> --comments --json number,title,headRefName,baseRefName,author,mergeStateStatus,reviewDecision,isDraft,body,files,commits`
   `gh pr checks <number>`
   `gh pr close <number> --comment <reason>`
   `gh pr merge <number> --merge --delete-branch`
   `git add -- <explicit-paths>` or `git add -p`
   `git commit -m <message>`
   `git push origin <branch>:main` only after explicit publish approval

15. Build and verify repo intelligence artifacts when touching `/agent`, `AGENTS.md`, or repo-governance tooling:
   `npm run trace:adjacent -- scripts/repo-inventory.ts`
   `npm run trace:adjacent -- scripts/export-dependency-graph.ts`
   `npm run trace:adjacent -- scripts/trace-adjacent-surfaces.ts`
   `npm run trace:adjacent -- scripts/agent/build-task-context.ts`
   `npm run trace:adjacent -- scripts/agent/verification-selector.ts`
   `npm run trace:adjacent -- scripts/agent/fast-start.ts`
   `npm run trace:adjacent -- scripts/agent/run-evals.ts`
   `npm run agent:fast-start -- --task "<task description>" --mode=<mode> --file=<path>`
   `npm run agent:verify -- --paths=<path1,path2>`
   `npm run agent:index`
   `npm run agent:refresh`
   `npm run check:agent-intelligence`
   `npm run check:agent-context`
   `npm run agent:task-context -- --task "<task description>" --mode=<mode> --file=<path>`
   `npm run eval:agent-context`
   `npm run typecheck`
   `npm run check:inventory`
   `npm run check:architecture`
   `npm run check:continuity`

16. Investigate and verify creator settings route regressions:
   `npm run trace:adjacent -- src/app/api/creator/settings/route.ts`
   `npm run trace:adjacent -- src/app/dashboard/profile/page.tsx`
   `npx vitest run tests/unit/api/creator-settings-route.test.ts`
   `npm run typecheck`

17. Build and verify repo-wide UI continuity hardening:
   `npm run trace:adjacent -- scripts/agent/build-ui-surface-coverage.ts`
   `npm run trace:adjacent -- scripts/agent/check-ui-surface-coverage.ts`
   `npm run trace:adjacent -- scripts/agent/build-ui-runtime-audit.ts`
   `npm run trace:adjacent -- src/app/creators/[username]/CreatorProfileClient.tsx`
   `npm run trace:adjacent -- src/components/Dashboard/CreatorWorkspacePanel.tsx`
   `npm run trace:adjacent -- src/app/api/creator/bookings/route.ts`
   `npm run trace:adjacent -- src/app/api/creator/subscriptions/route.ts`
   `npm run agent:ui-index`
   `npm run check:ui:coverage`
   `npm run check:ui:runtime`
   `npm run check:ui:audits` only when source coverage or the operator promotes browser reproduction
   `npm run check:ui:lighthouse` only when selector policy, current doctrine, a concrete source finding, or the operator explicitly promotes browser-based performance reproduction
   `npm run check:ui:continuity`
   `npx vitest run tests/unit/creator-bookings-route.spec.ts tests/unit/creator-subscriptions-route.spec.ts tests/unit/ui-continuity.spec.ts`
   `npm run typecheck`
   `npm run test:contracts`
   `npm run check:continuity`

18. Build and verify self-debugging hardening and queue runtime canonicalization:
   `npm run trace:adjacent -- src/app/api/cron/process-queue/route.ts`
   `npm run trace:adjacent -- src/app/api/cron/notify-active-drops/route.ts`
   `npm run trace:adjacent -- functions/src/index.ts`
   `npm run trace:adjacent -- src/lib/server/push-notifications.ts`
   `npm run trace:adjacent -- src/app/admin/debug/page.tsx`
   `npx vitest run tests/unit/process-queue-route.spec.ts tests/unit/notify-active-drops-route.spec.ts tests/unit/drop-queue-lifecycle.spec.ts`
   `npm run check:runtime:continuity`
   `npm run check:queue:runtime`
   `npm run check:warnings`
   `npm run check:scheduler:freshness`
   `npm run check:agent-context`
   `npm run check:continuity`
   `npm --prefix functions run check`

20. Build and verify token-efficiency and analytics/watch-session hardening:
   `npm run trace:adjacent -- scripts/agent/build-task-context.ts`
   `npm run trace:adjacent -- src/hooks/useViewerWatchSession.ts`
   `npm run trace:adjacent -- src/app/api/viewer/watch-session/route.ts`
   `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
   `npx vitest run tests/unit/analytics-ingest-route.spec.ts tests/unit/analytics-identifiers.spec.ts tests/unit/useViewerWatchSession-bench.spec.ts`
   `npm run agent:index`
   `npm run eval:agent-context`
   `npm run check:agent-context`
   `npm run check:telemetry`
   `npm run check:analytics-semantics`
   `npm run check:runtime:continuity`
   `npm run typecheck`
   `npm run test:contracts`
   `npm run check:continuity`

21. Fix verification blockers and remaining truthful warnings/non-blocking notes:
   `npm run trace:adjacent -- scripts/check-runtime-continuity.ts`
   `npm run trace:adjacent -- scripts/check-scheduler-freshness.ts`
   `npm run trace:adjacent -- scripts/runtime-admin.ts`
   `npm run trace:adjacent -- functions/src/index.ts`
   `npm run trace:adjacent -- functions/src/queue-runtime.ts`
   `npm run trace:adjacent -- src/lib/server/runtime-warning-store.ts`
   `npx vitest run tests/unit/process-queue-route.spec.ts tests/unit/notify-active-drops-route.spec.ts tests/unit/drop-queue-lifecycle.spec.ts tests/unit/admin-analytics-capture-health.spec.ts tests/unit/admin-analytics-realtime-route.spec.ts`
   `npm run typecheck`
   `npm run agent:index`
   `npm run check:agent-context`
   `npm run check:scheduler:freshness`
   `npm run check:queue:runtime`
   `npm run check:warnings`
   `npm run check:runtime:continuity`
   `npm run check:analytics:continuity`
   `npm run check:telemetry`
   `npm run check:continuity`

22. Fix mobile chat/message interaction regressions, especially untappable overlays after search focus/blur:
   `npm run trace:adjacent -- src/components/Chat/ChatExperience.tsx`
   `npm run trace:adjacent -- src/app/dashboard/chat/page.tsx`
   `npm run trace:adjacent -- src/app/dashboard/chat/layout.tsx`
   `npx vitest run <chat-related-test-paths>`
   `npm run typecheck`
   `npm run check:ui:runtime`

23. Harden admin analytics, purchase parity, and legacy-history truth reconciliation:
   `npm run trace:adjacent -- src/app/admin/analytics/page.tsx`
   `npm run trace:adjacent -- src/app/api/admin/analytics/historical/route.ts`
   `npm run trace:adjacent -- src/app/api/admin/analytics/realtime/route.ts`
   `npm run trace:adjacent -- src/lib/gumdrop-ledger.ts`
   `npm run trace:adjacent -- src/lib/server/admin-analytics-capture-health.ts`
   `npm run trace:adjacent -- scripts/check-analytics-continuity.ts`
   `npx vitest run tests/unit/admin-analytics-capture-health.spec.ts tests/unit/admin-analytics-realtime-route.spec.ts tests/unit/admin-analytics-page.spec.tsx`
   `npm run check:analytics:continuity`
   `npm run check:telemetry`
   `npm run typecheck`
   `npm run check:continuity`
