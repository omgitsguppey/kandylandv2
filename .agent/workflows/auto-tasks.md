---
description: "Auto-run standard project commands"
---

// turbo-all

1. Check git status:
   `git status --short`

2. Check codebase inventory:
   `npm run check:inventory`

3. Check architecture rules:
   `npm run check:architecture`

4. Check dependency cycles:
   `npm run check:cycles`

5. Run full repo verification:
   `npm run check`

6. Run continuity verification:
   `npm run check:continuity`

7. Build Storybook when UI tooling changes:
   `npm run build-storybook`

8. Audit telemetry and analytics semantics:
   `npm run check:telemetry`
   `npm run check:analytics-semantics`

9. Trace adjacent surfaces before broad audits:
   `npm run trace:adjacent -- <path>`

10. Run targeted verification for touched analytics and admin surfaces:
   `npx vitest run <test-paths>`
   `npm --prefix functions run check`

11. Run warning-focused dependency and tooling verification when cleanup touches packages or lockfiles:
   `npm run check:deps`

19. Reconcile open PRs against current repo truth:
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

14. Review and resolve open GitHub pull requests before committing local work:
   `gh pr list --state open`
   `gh pr view <number> --comments --json number,title,headRefName,baseRefName,author,mergeStateStatus,reviewDecision,isDraft,body,files,commits`
   `gh pr checks <number>`
   `gh pr close <number> --comment <reason>`
   `gh pr merge <number> --merge --delete-branch`
   `git add -A`
   `git commit -m <message>`
   `git push origin <branch>:main`

15. Build and verify repo intelligence artifacts when touching `/agent`, `AGENTS.md`, or repo-governance tooling:
   `npm run trace:adjacent -- scripts/repo-inventory.ts`
   `npm run trace:adjacent -- scripts/export-dependency-graph.ts`
   `npm run trace:adjacent -- scripts/trace-adjacent-surfaces.ts`
   `npm run trace:adjacent -- scripts/agent/build-task-context.ts`
   `npm run trace:adjacent -- scripts/agent/run-evals.ts`
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
   `npm run check:ui:audits`
   `npm run check:ui:lighthouse`
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
