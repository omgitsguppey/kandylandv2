import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.2.46",
  "betaReleaseCounter": 246,
  "channel": "beta",
  "generatedAt": "2026-05-14T22:13:15.026Z",
  "generatedAtUtc": "2026-05-14T22:13:15.026Z",
  "lastCommitSha": "ca9210a2a756a5379e10deb2aaa84fe1022fe06e",
  "notes": [
    {
      "version": "1.2.46",
      "previousVersion": "1.2.45",
      "betaReleaseCounter": 246,
      "previousBetaReleaseCounter": 245,
      "commitSha": "ca9210a2a756a5379e10deb2aaa84fe1022fe06e",
      "commitTitle": "fix(security): bound analytics fanout and request bodies",
      "commitCount": 1,
      "commitShas": [
        "ca9210a2a756a5379e10deb2aaa84fe1022fe06e"
      ],
      "committedAt": "2026-05-14T22:12:59.000Z",
      "generatedAt": "2026-05-14T22:13:15.022Z",
      "committedAtUtc": "2026-05-14T22:12:59.000Z",
      "generatedAtUtc": "2026-05-14T22:13:15.022Z",
      "updatedAtUtc": "2026-05-14T22:13:15.022Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added backend work caps for analytics processing.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added backend work caps for analytics processing.",
        "Added request body size guards for Admin Analytics routes.",
        "Made Debug speed and security findings easier to understand."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/speed-security-hardening.generated.json",
        "docs/agent-truth/admin-debug-control-tower.md",
        "docs/agent-truth/speed-security-backend-guardrails.md",
        "functions/src/analytics-event-facts.ts",
        "functions/src/analytics-semantics.ts",
        "scripts/agent/score-speed-security-hardening.ts",
        "src/app/api/admin/analytics/preferences/route.ts",
        "src/app/api/admin/analytics/refresh/route.ts",
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/server/bounded-json-body.ts",
        "tests/unit/admin-analytics-preferences-route.spec.ts",
        "tests/unit/admin-analytics-refresh-route.spec.ts",
        "tests/unit/bounded-json-body.spec.ts",
        "tests/unit/debug-speed-security-copy.spec.tsx",
        "tests/unit/speed-security-hardening.spec.ts"
      ],
      "sourceCommit": "ca9210a2a756a5379e10deb2aaa84fe1022fe06e"
    },
    {
      "version": "1.2.45",
      "previousVersion": "1.2.44",
      "betaReleaseCounter": 245,
      "previousBetaReleaseCounter": 244,
      "commitSha": "f43a78682114342113f5bc83dc5c89fe439de096",
      "commitTitle": "fix(admin): simplify auth outcomes mobile panel",
      "commitCount": 1,
      "commitShas": [
        "f43a78682114342113f5bc83dc5c89fe439de096"
      ],
      "committedAt": "2026-05-14T21:14:47.000Z",
      "generatedAt": "2026-05-14T21:14:56.788Z",
      "committedAtUtc": "2026-05-14T21:14:47.000Z",
      "generatedAtUtc": "2026-05-14T21:14:56.788Z",
      "updatedAtUtc": "2026-05-14T21:14:56.788Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Made Auth Outcomes simpler and clearer on mobile.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Made Auth Outcomes simpler and clearer on mobile.",
        "Separated email/password and Google login attempt tracking.",
        "Stopped missing auth samples from showing as errors or repeated snapshot waits."
      ],
      "audience": "users",
      "affectedSurfaces": [
        "account-onboarding",
        "admin"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "docs/agent-truth/admin-analytics-auth-outcomes.md",
        "docs/agent-truth/admin-analytics-truth.md",
        "package.json",
        "scripts/agent/validate-admin-analytics-auth-outcomes-mobile.ts",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/lib/admin-analytics-auth-outcome-split.ts",
        "src/lib/server/admin-analytics-historical-engagement.ts",
        "src/types/admin-analytics.ts",
        "tests/unit/admin-analytics-auth-outcome-split.spec.ts",
        "tests/unit/admin-analytics-auth-outcomes-mobile.spec.tsx",
        "tests/unit/admin-analytics-historical-engagement.spec.ts"
      ],
      "sourceCommit": "f43a78682114342113f5bc83dc5c89fe439de096"
    },
    {
      "version": "1.2.44",
      "previousVersion": "1.2.43",
      "betaReleaseCounter": 244,
      "previousBetaReleaseCounter": 243,
      "commitSha": "d75e1f4cf4276ee9e649fc412be344f121adffd6",
      "commitTitle": "fix(admin): compact analytics operations mobile panels",
      "commitCount": 1,
      "commitShas": [
        "d75e1f4cf4276ee9e649fc412be344f121adffd6"
      ],
      "committedAt": "2026-05-14T19:56:27.000Z",
      "generatedAt": "2026-05-14T19:56:39.575Z",
      "committedAtUtc": "2026-05-14T19:56:27.000Z",
      "generatedAtUtc": "2026-05-14T19:56:39.575Z",
      "updatedAtUtc": "2026-05-14T19:56:39.575Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Made Admin Analytics operation panels more compact on mobile.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Made Admin Analytics operation panels more compact on mobile.",
        "Stopped unavailable event-chain data from showing as errors or fake zero math.",
        "Added clearer tracking explanations when a metric cannot be measured exactly yet."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "docs/agent-truth/admin-analytics-journey-funnel.md",
        "docs/agent-truth/admin-analytics-truth.md",
        "package.json",
        "scripts/agent/validate-admin-analytics-operations-mobile.ts",
        "scripts/check-admin-analytics-live-pulse.ts",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx",
        "src/lib/admin-analytics-journey-funnel.ts",
        "src/lib/admin-analytics-live-pulse.ts",
        "tests/unit/admin-analytics-journey-funnel.spec.ts",
        "tests/unit/admin-analytics-live-pulse.spec.ts"
      ],
      "sourceCommit": "d75e1f4cf4276ee9e649fc412be344f121adffd6"
    },
    {
      "version": "1.2.43",
      "previousVersion": "1.2.42",
      "betaReleaseCounter": 243,
      "previousBetaReleaseCounter": 242,
      "commitSha": "f081f93010b8a6399b09626102b1dfd635ee73c7",
      "commitTitle": "fix(admin): simplify mobile analytics overview",
      "commitCount": 1,
      "commitShas": [
        "f081f93010b8a6399b09626102b1dfd635ee73c7"
      ],
      "committedAt": "2026-05-14T19:07:29.000Z",
      "generatedAt": "2026-05-14T19:07:42.734Z",
      "committedAtUtc": "2026-05-14T19:07:29.000Z",
      "generatedAtUtc": "2026-05-14T19:07:42.734Z",
      "updatedAtUtc": "2026-05-14T19:07:42.734Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Cleaned up the mobile Admin Analytics overview.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Cleaned up the mobile Admin Analytics overview.",
        "Moved technical snapshot details out of primary overview cards.",
        "Made Live Pulse less noisy on mobile while keeping Debug details available."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "package.json",
        "scripts/agent/validate-admin-analytics-mobile-overview.ts",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/admin/analytics/page.tsx",
        "src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx",
        "src/lib/analytics/admin-analytics-display-state.ts",
        "tests/unit/admin-analytics-display-state.spec.ts",
        "tests/unit/admin-analytics-live-pulse.spec.ts",
        "tests/unit/admin-analytics-page.spec.tsx"
      ],
      "sourceCommit": "f081f93010b8a6399b09626102b1dfd635ee73c7"
    },
    {
      "version": "1.2.42",
      "previousVersion": "1.2.41",
      "betaReleaseCounter": 242,
      "previousBetaReleaseCounter": 241,
      "commitSha": "2b582f1e47844f9ded9b5ff0f9f5c0112f4d8944",
      "commitTitle": "docs(repo): consolidate current operator doctrine",
      "commitCount": 1,
      "commitShas": [
        "2b582f1e47844f9ded9b5ff0f9f5c0112f4d8944"
      ],
      "committedAt": "2026-05-14T17:40:04.000Z",
      "generatedAt": "2026-05-14T17:40:14.469Z",
      "committedAtUtc": "2026-05-14T17:40:04.000Z",
      "generatedAtUtc": "2026-05-14T17:40:14.469Z",
      "updatedAtUtc": "2026-05-14T17:40:14.469Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Bug fixes and general improvements.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Consolidated the current operator doctrine for full-loop fixes.",
        "Clarified source-of-truth, metric cadence, and no fake realtime rules.",
        "Marked old generated reports and stale doctrine as evidence instead of live authority."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "AGENTS.md",
        "FULL_SCALE_CODEBASE_AUDIT.md",
        "README.md",
        "REPO_MEMORY_LEDGER.md",
        "agent/state/repo-doctrine-reset.generated.json",
        "docs/agent-truth/admin-analytics-truth.md",
        "docs/agent-truth/admin-debug-control-tower.md",
        "docs/agent-truth/analytics-truth-layer-v2.md",
        "docs/agent-truth/creator-dashboard-projection-lock.md",
        "docs/agent-truth/creator-dashboard-settings.md",
        "docs/agent-truth/current-operator-doctrine.md",
        "docs/agent-truth/firebase-owned-repo-automation.md",
        "docs/agent-truth/phase-one-score-ui-triage.md",
        "docs/agent-truth/public-beta-release-notes.md",
        "docs/agent-truth/public-beta-score.md",
        "docs/agent-truth/repo-spring-cleaning-rewire.md",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "docs/agent-truth/user-facing-feature-connection-audit.md",
        "docs/agent-truth/watch-time-rollup-truth.md",
        "package.json",
        "scripts/agent/validate-repo-doctrine-reset.ts",
        "tests/unit/repo-doctrine-reset.spec.ts"
      ],
      "sourceCommit": "2b582f1e47844f9ded9b5ff0f9f5c0112f4d8944"
    },
    {
      "version": "1.2.41",
      "previousVersion": "1.2.40",
      "betaReleaseCounter": 241,
      "previousBetaReleaseCounter": 240,
      "commitSha": "af8d35aea6c2695f0403023e3801f43ca7929ee8",
      "commitTitle": "chore(debug): triage panel evidence output",
      "commitCount": 1,
      "commitShas": [
        "af8d35aea6c2695f0403023e3801f43ca7929ee8"
      ],
      "committedAt": "2026-05-14T17:04:21.000Z",
      "generatedAt": "2026-05-14T17:04:39.072Z",
      "committedAtUtc": "2026-05-14T17:04:21.000Z",
      "generatedAtUtc": "2026-05-14T17:04:39.072Z",
      "updatedAtUtc": "2026-05-14T17:04:39.072Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added a Debug-panel triage map for stale, missing, and refreshable evidence.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added a Debug-panel triage map for stale, missing, and refreshable evidence.",
        "Kept stale evidence visible instead of treating it as live truth.",
        "Made Debug output clearer about which issues block Phase 1."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/debug-panel-output-triage.generated.json",
        "docs/agent-truth/debug-panel-output-triage.md",
        "package.json",
        "scripts/agent/validate-debug-panel-output-triage.ts",
        "tests/unit/debug-panel-output-triage.spec.ts"
      ],
      "sourceCommit": "af8d35aea6c2695f0403023e3801f43ca7929ee8"
    },
    {
      "version": "1.2.40",
      "previousVersion": "1.2.39",
      "betaReleaseCounter": 240,
      "previousBetaReleaseCounter": 239,
      "commitSha": "fee10e6a65174a7d7ac85448991f98eb3a3e6300",
      "commitTitle": "chore(ui): audit creator feature connections",
      "commitCount": 1,
      "commitShas": [
        "fee10e6a65174a7d7ac85448991f98eb3a3e6300"
      ],
      "committedAt": "2026-05-14T14:37:19.000Z",
      "generatedAt": "2026-05-14T14:37:32.863Z",
      "committedAtUtc": "2026-05-14T14:37:19.000Z",
      "generatedAtUtc": "2026-05-14T14:37:32.863Z",
      "updatedAtUtc": "2026-05-14T14:37:32.863Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Checked creator-facing feature connections without changing the UI design.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Checked creator-facing feature connections without changing the UI design.",
        "Mapped Fan Pass, calls, requests, chat, and broadcasts for source truth and route wiring.",
        "Added guards for race conditions and cost-bleed risks in creator-facing surfaces."
      ],
      "audience": "creators",
      "affectedSurfaces": [
        "creator"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/user-facing-feature-connection-audit.generated.json",
        "docs/agent-truth/user-facing-feature-connection-audit.md",
        "package.json",
        "scripts/agent/validate-user-facing-feature-connection-audit.ts",
        "src/app/api/creator/settings/route.ts",
        "src/components/Creators/CreatorBroadcastManager.tsx",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "tests/unit/creator-dashboard-settings.spec.tsx",
        "tests/unit/creator-settings-route.spec.ts",
        "tests/unit/user-facing-feature-connection-audit.spec.ts"
      ],
      "sourceCommit": "fee10e6a65174a7d7ac85448991f98eb3a3e6300"
    },
    {
      "version": "1.2.39",
      "previousVersion": "1.2.38",
      "betaReleaseCounter": 239,
      "previousBetaReleaseCounter": 238,
      "commitSha": "c6ce135ddaadbc2ce5843c4762e4d51076f4da82",
      "commitTitle": "docs(phase-one): add targeted behavior evidence",
      "commitCount": 1,
      "commitShas": [
        "c6ce135ddaadbc2ce5843c4762e4d51076f4da82"
      ],
      "committedAt": "2026-05-14T14:16:05.000Z",
      "generatedAt": "2026-05-14T14:16:19.998Z",
      "committedAtUtc": "2026-05-14T14:16:05.000Z",
      "generatedAtUtc": "2026-05-14T14:16:19.998Z",
      "updatedAtUtc": "2026-05-14T14:16:19.998Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added formal targeted behavior evidence for Phase 1 validators.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added formal targeted behavior evidence for Phase 1 validators.",
        "Refreshed launch readiness evidence without claiming visual or provider smoke.",
        "Kept remaining beta exit evidence gaps visible."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/public-beta-score.generated.json",
        "agent/state/targeted-behavior-evidence.generated.json",
        "docs/agent-truth/final-launch-readiness-report.md",
        "docs/agent-truth/launch-pr-triage.md",
        "docs/agent-truth/launch-readiness-final.md",
        "docs/agent-truth/public-beta-score.md",
        "docs/agent-truth/targeted-behavior-evidence.md",
        "package.json",
        "scripts/agent/validate-targeted-behavior-evidence.ts"
      ],
      "sourceCommit": "c6ce135ddaadbc2ce5843c4762e4d51076f4da82"
    },
    {
      "version": "1.2.38",
      "previousVersion": "1.2.37",
      "betaReleaseCounter": 238,
      "previousBetaReleaseCounter": 237,
      "commitSha": "4f313a98a68ca04b4aab6fa5f6012c34212cb889",
      "commitTitle": "fix(admin): show canonical beta score in debug",
      "commitCount": 1,
      "commitShas": [
        "4f313a98a68ca04b4aab6fa5f6012c34212cb889"
      ],
      "committedAt": "2026-05-14T14:05:35.000Z",
      "generatedAt": "2026-05-14T14:05:59.628Z",
      "committedAtUtc": "2026-05-14T14:05:35.000Z",
      "generatedAtUtc": "2026-05-14T14:05:59.628Z",
      "updatedAtUtc": "2026-05-14T14:05:59.628Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Connected Admin Debug to the canonical beta readiness score.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Connected Admin Debug to the canonical beta readiness score.",
        "Separated report averages from the real public beta score.",
        "Made score cap reasons easier to see in Debug."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/lib/admin-debug-control-tower.ts",
        "tests/unit/admin-debug-control-tower.spec.ts"
      ],
      "sourceCommit": "4f313a98a68ca04b4aab6fa5f6012c34212cb889"
    },
    {
      "version": "1.2.37",
      "previousVersion": "1.2.36",
      "betaReleaseCounter": 237,
      "previousBetaReleaseCounter": 236,
      "commitSha": "470ce04ab355dd9a21afc4f57118b1e46311ea3c",
      "commitTitle": "fix(analytics): lock watch time truth contract",
      "commitCount": 1,
      "commitShas": [
        "470ce04ab355dd9a21afc4f57118b1e46311ea3c"
      ],
      "committedAt": "2026-05-14T13:53:03.000Z",
      "generatedAt": "2026-05-14T13:53:26.053Z",
      "committedAtUtc": "2026-05-14T13:53:03.000Z",
      "generatedAtUtc": "2026-05-14T13:53:26.053Z",
      "updatedAtUtc": "2026-05-14T13:53:26.053Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Locked watch-time reporting to verified watch-session data.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked watch-time reporting to verified watch-session data.",
        "Kept legacy watch duration labeled as fallback instead of product truth.",
        "Updated tests so diagnostic estimates cannot become canonical watch time."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "docs/agent-truth/watch-time-rollup-truth.md",
        "scripts/agent/validate-watch-time-rollup-truth.ts",
        "src/app/admin/user/[userId]/page.tsx",
        "src/app/api/admin/user/[userId]/route.ts",
        "src/app/api/admin/users/route.ts",
        "src/lib/server/admin-user-metrics-snapshot.ts",
        "src/lib/server/user-behavior-rollup.ts",
        "tests/unit/admin-user-metrics.spec.ts",
        "tests/unit/watch-time-rollup.spec.ts"
      ],
      "sourceCommit": "470ce04ab355dd9a21afc4f57118b1e46311ea3c"
    },
    {
      "version": "1.2.36",
      "previousVersion": "1.2.35",
      "betaReleaseCounter": 236,
      "previousBetaReleaseCounter": 235,
      "commitSha": "ff66bf7f60ffee9308663e69c59509b328d75117",
      "commitTitle": "fix(score): read formal beta evidence artifacts",
      "commitCount": 1,
      "commitShas": [
        "ff66bf7f60ffee9308663e69c59509b328d75117"
      ],
      "committedAt": "2026-05-14T06:09:23.000Z",
      "generatedAt": "2026-05-14T06:10:04.981Z",
      "committedAtUtc": "2026-05-14T06:09:23.000Z",
      "generatedAtUtc": "2026-05-14T06:10:04.981Z",
      "updatedAtUtc": "2026-05-14T06:10:04.981Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Improved how beta readiness reads formal smoke evidence.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved how beta readiness reads formal smoke evidence.",
        "Kept operator-reported PayPal testing tracked without marking the provider smoke lane as done.",
        "Made beta score gates explain which evidence artifacts are still missing."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/public-beta-score.md",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "src/lib/agent-score/core.ts",
        "tests/unit/public-beta-score.spec.ts"
      ],
      "sourceCommit": "ff66bf7f60ffee9308663e69c59509b328d75117"
    },
    {
      "version": "1.2.35",
      "previousVersion": "1.2.34",
      "betaReleaseCounter": 235,
      "previousBetaReleaseCounter": 234,
      "commitSha": "99658a428a64299ff4206c58c21a758032e26ecb",
      "commitTitle": "chore(repo): add spring cleaning rewire inventory",
      "commitCount": 1,
      "commitShas": [
        "99658a428a64299ff4206c58c21a758032e26ecb"
      ],
      "committedAt": "2026-05-14T05:45:28.000Z",
      "generatedAt": "2026-05-14T05:46:42.281Z",
      "committedAtUtc": "2026-05-14T05:45:28.000Z",
      "generatedAtUtc": "2026-05-14T05:46:42.281Z",
      "updatedAtUtc": "2026-05-14T05:46:42.281Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added a spring-cleaning inventory for stale reports, docs, validators, and disconnected UI lanes.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added a spring-cleaning inventory for stale reports, docs, validators, and disconnected UI lanes.",
        "Mapped cleanup candidates without deleting runtime code.",
        "Kept Phase 1 blocker fixes separate from repo cleanup work."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "EVERY_FILE_FUNCTION_CHECKLIST.md",
        "FULL_SCALE_CODEBASE_AUDIT.md",
        "REPO_MEMORY_LEDGER.md",
        "agent/state/repo-spring-cleaning-rewire.generated.json",
        "docs/agent-truth/repo-spring-cleaning-rewire.md",
        "package.json",
        "scripts/agent/validate-repo-spring-cleaning-rewire.ts",
        "tests/unit/repo-spring-cleaning-rewire.spec.ts"
      ],
      "sourceCommit": "99658a428a64299ff4206c58c21a758032e26ecb"
    },
    {
      "version": "1.2.34",
      "previousVersion": "1.2.33",
      "betaReleaseCounter": 234,
      "previousBetaReleaseCounter": 233,
      "commitSha": "2570b5dda615c39a02af5260f5f3760ba3f0192f",
      "commitTitle": "chore(phase-one): triage score and dashboard truth wiring",
      "commitCount": 1,
      "commitShas": [
        "2570b5dda615c39a02af5260f5f3760ba3f0192f"
      ],
      "committedAt": "2026-05-14T04:04:42.000Z",
      "generatedAt": "2026-05-14T04:08:00.701Z",
      "committedAtUtc": "2026-05-14T04:04:42.000Z",
      "generatedAtUtc": "2026-05-14T04:08:00.701Z",
      "updatedAtUtc": "2026-05-14T04:08:00.701Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added a triage pass for beta score math and evidence wiring.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added a triage pass for beta score math and evidence wiring.",
        "Reviewed watch-time, Admin dashboard, and creator dashboard truth connections.",
        "Kept readiness evidence honest while identifying what needs a focused fix."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/phase-one-score-ui-triage.generated.json",
        "docs/agent-truth/phase-one-score-ui-triage.md",
        "package.json",
        "scripts/agent/validate-phase-one-score-ui-triage.ts",
        "tests/unit/phase-one-score-ui-triage.spec.ts"
      ],
      "sourceCommit": "2570b5dda615c39a02af5260f5f3760ba3f0192f"
    },
    {
      "version": "1.2.33",
      "previousVersion": "1.2.32",
      "betaReleaseCounter": 233,
      "previousBetaReleaseCounter": 232,
      "commitSha": "d1dd8a050d59f8e0261c8515c9cecc24def290a0",
      "commitTitle": "docs(phase-one): add formal smoke evidence tracking",
      "commitCount": 1,
      "commitShas": [
        "d1dd8a050d59f8e0261c8515c9cecc24def290a0"
      ],
      "committedAt": "2026-05-14T02:42:48.000Z",
      "generatedAt": "2026-05-14T02:43:59.301Z",
      "committedAtUtc": "2026-05-14T02:42:48.000Z",
      "generatedAtUtc": "2026-05-14T02:43:59.301Z",
      "updatedAtUtc": "2026-05-14T02:43:59.301Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added formal tracking for remaining smoke evidence.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added formal tracking for remaining smoke evidence.",
        "Kept PayPal/provider smoke marked as incomplete until repo evidence exists.",
        "Kept beta exit blockers visible instead of marking launch readiness complete."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/admin-truth-sample-evidence.generated.json",
        "agent/state/provider-smoke-evidence.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/runtime-smoke-evidence.generated.json",
        "docs/agent-truth/admin-truth-sample-evidence.md",
        "docs/agent-truth/final-launch-readiness-report.md",
        "docs/agent-truth/launch-readiness-final.md",
        "docs/agent-truth/paypal-smoke-evidence.md",
        "docs/agent-truth/provider-smoke-evidence.md",
        "docs/agent-truth/public-beta-score.md",
        "docs/agent-truth/runtime-smoke-evidence.md",
        "package.json",
        "scripts/agent/validate-admin-truth-sample-evidence.ts",
        "scripts/agent/validate-provider-smoke-evidence.ts",
        "scripts/agent/validate-runtime-smoke-evidence.ts"
      ],
      "sourceCommit": "d1dd8a050d59f8e0261c8515c9cecc24def290a0"
    },
    {
      "version": "1.2.32",
      "previousVersion": "1.2.31",
      "betaReleaseCounter": 232,
      "previousBetaReleaseCounter": 231,
      "commitSha": "c318d90a84bac8e24596c9be4a6376406e179f8c",
      "commitTitle": "docs(phase-one): refresh beta exit evidence",
      "commitCount": 1,
      "commitShas": [
        "c318d90a84bac8e24596c9be4a6376406e179f8c"
      ],
      "committedAt": "2026-05-14T01:40:36.000Z",
      "generatedAt": "2026-05-14T01:42:37.150Z",
      "committedAtUtc": "2026-05-14T01:40:36.000Z",
      "generatedAtUtc": "2026-05-14T01:42:37.150Z",
      "updatedAtUtc": "2026-05-14T01:42:37.150Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Refreshed Phase 1 beta readiness evidence.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Refreshed Phase 1 beta readiness evidence.",
        "Confirmed analytics rewire blockers remain cleared after the Debug panel cleanup.",
        "Kept remaining launch evidence gaps visible instead of marking them complete."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/snapshot-admin-vendor-cost-rewire.generated.json",
        "docs/agent-truth/final-launch-readiness-report.md",
        "docs/agent-truth/launch-pr-triage.md",
        "docs/agent-truth/launch-readiness-final.md",
        "docs/agent-truth/public-beta-score.md",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md"
      ],
      "sourceCommit": "c318d90a84bac8e24596c9be4a6376406e179f8c"
    },
    {
      "version": "1.2.31",
      "previousVersion": "1.2.30",
      "betaReleaseCounter": 231,
      "previousBetaReleaseCounter": 230,
      "commitSha": "d405169db235fe67cb9729077752f91ab45aef7c",
      "commitTitle": "fix(admin): simplify debug recovery panel",
      "commitCount": 1,
      "commitShas": [
        "d405169db235fe67cb9729077752f91ab45aef7c"
      ],
      "committedAt": "2026-05-14T00:49:57.000Z",
      "generatedAt": "2026-05-14T00:53:30.028Z",
      "committedAtUtc": "2026-05-14T00:49:57.000Z",
      "generatedAtUtc": "2026-05-14T00:53:30.028Z",
      "updatedAtUtc": "2026-05-14T00:53:30.028Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Simplified Admin Debug recovery evidence review.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Simplified the Admin Debug panel so recovery evidence is easier to review.",
        "Reduced redundant nested scrolling in Debug views.",
        "Refreshed analytics rewire evidence after the cost-reduction pass."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "agent/state/snapshot-admin-vendor-cost-rewire.generated.json",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "tests/unit/admin-debug-control-tower.spec.ts",
        "tests/unit/snapshot-admin-vendor-cost-rewire.spec.ts"
      ],
      "sourceCommit": "d405169db235fe67cb9729077752f91ab45aef7c"
    },
    {
      "version": "1.2.30",
      "previousVersion": "1.2.29",
      "betaReleaseCounter": 230,
      "previousBetaReleaseCounter": 229,
      "commitSha": "737f2f8cf3254231ce5dfe8e7964756387ef0403",
      "commitTitle": "fix(analytics): reduce admin analytics cost paths",
      "commitCount": 1,
      "commitShas": [
        "737f2f8cf3254231ce5dfe8e7964756387ef0403"
      ],
      "committedAt": "2026-05-13T23:41:43.000Z",
      "generatedAt": "2026-05-13T23:42:05.072Z",
      "committedAtUtc": "2026-05-13T23:41:43.000Z",
      "generatedAtUtc": "2026-05-13T23:42:05.072Z",
      "updatedAtUtc": "2026-05-13T23:42:05.072Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Reduced remaining Admin Analytics cost-risk paths behind the scenes.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reduced remaining Admin Analytics cost-risk paths behind the scenes.",
        "Kept raw analytics logs routed toward Debug evidence instead of display truth.",
        "Improved snapshot-first analytics behavior without changing public app surfaces."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "agent/state/snapshot-admin-vendor-cost-rewire.generated.json",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "functions/src/analytics-realtime-summary.ts",
        "scripts/agent/snapshot-admin-vendor-cost-rewire.ts",
        "scripts/agent/validate-admin-analytics-hot-cache.ts",
        "scripts/agent/validate-admin-analytics-no-pure-realtime.ts",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/check-admin-analytics-live-pulse.ts",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/api/admin/analytics/realtime/route.ts",
        "src/lib/server/admin-analytics-materializers.ts",
        "tests/unit/admin-analytics-realtime-route.spec.ts",
        "tests/unit/snapshot-admin-vendor-cost-rewire.spec.ts"
      ],
      "sourceCommit": "737f2f8cf3254231ce5dfe8e7964756387ef0403"
    },
    {
      "version": "1.2.29",
      "previousVersion": "1.2.28",
      "betaReleaseCounter": 229,
      "previousBetaReleaseCounter": 228,
      "commitSha": "914b0307cf4deec56ef0bbdeaf95e59812ae6dc4",
      "commitTitle": "fix(analytics): label admin source evidence",
      "commitCount": 1,
      "commitShas": [
        "914b0307cf4deec56ef0bbdeaf95e59812ae6dc4"
      ],
      "committedAt": "2026-05-13T22:55:55.000Z",
      "generatedAt": "2026-05-13T22:57:19.742Z",
      "committedAtUtc": "2026-05-13T22:55:55.000Z",
      "generatedAtUtc": "2026-05-13T22:57:19.742Z",
      "updatedAtUtc": "2026-05-13T22:57:19.742Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Improved Admin Analytics source labels behind the scenes.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved Admin Analytics source labels behind the scenes.",
        "Kept vendor analytics marked as supporting evidence instead of product truth.",
        "Kept recovery evidence review-only before any Admin Analytics promotion."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "agent/state/snapshot-admin-vendor-cost-rewire.generated.json",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "scripts/agent/snapshot-admin-vendor-cost-rewire.ts",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-admin-truth.ts",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/lib/analytics/admin-analytics-display-state.ts",
        "tests/unit/admin-analytics-display-state.spec.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/snapshot-admin-vendor-cost-rewire.spec.ts"
      ],
      "sourceCommit": "914b0307cf4deec56ef0bbdeaf95e59812ae6dc4"
    },
    {
      "version": "1.2.28",
      "previousVersion": "1.2.27",
      "betaReleaseCounter": 228,
      "previousBetaReleaseCounter": 227,
      "commitSha": "ea13680adb018ac9c94db8c5b5be18ed7bdd9112",
      "commitTitle": "fix(analytics): surface recovery evidence in admin debug",
      "commitCount": 1,
      "commitShas": [
        "ea13680adb018ac9c94db8c5b5be18ed7bdd9112"
      ],
      "committedAt": "2026-05-13T21:48:45.000Z",
      "generatedAt": "2026-05-13T21:49:36.500Z",
      "committedAtUtc": "2026-05-13T21:48:45.000Z",
      "generatedAtUtc": "2026-05-13T21:49:36.500Z",
      "updatedAtUtc": "2026-05-13T21:49:36.500Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added clearer Debug evidence for analytics recovery lanes.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added clearer Debug evidence for analytics recovery lanes.",
        "Kept recovered analytics data labeled as review-only before any Admin Analytics promotion.",
        "Improved internal visibility into source, confidence, and recovery blockers."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "agent/state/snapshot-admin-vendor-cost-rewire.generated.json",
        "docs/agent-truth/lost-data-recovery-dry-run.md",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "package.json",
        "scripts/agent/snapshot-admin-vendor-cost-rewire.ts",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-admin-truth.ts",
        "src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/app/api/admin/debug/route.ts",
        "tests/unit/admin-debug-control-tower.spec.ts",
        "tests/unit/snapshot-admin-vendor-cost-rewire.spec.ts"
      ],
      "sourceCommit": "ea13680adb018ac9c94db8c5b5be18ed7bdd9112"
    },
    {
      "version": "1.2.27",
      "previousVersion": "1.2.26",
      "betaReleaseCounter": 227,
      "previousBetaReleaseCounter": 226,
      "commitSha": "e5c7da278b19e5e7a48285ea1aebffe7ac562934",
      "commitTitle": "fix(analytics): collapse historical snapshot fallback authority",
      "commitCount": 1,
      "commitShas": [
        "e5c7da278b19e5e7a48285ea1aebffe7ac562934"
      ],
      "committedAt": "2026-05-13T21:08:52.000Z",
      "generatedAt": "2026-05-13T21:10:13.280Z",
      "committedAtUtc": "2026-05-13T21:08:52.000Z",
      "generatedAtUtc": "2026-05-13T21:10:13.280Z",
      "updatedAtUtc": "2026-05-13T21:10:13.280Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Improved historical Admin Analytics source handling behind the scenes.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved historical Admin Analytics source handling behind the scenes.",
        "Reduced raw analytics fallback behavior when verified snapshots are unavailable.",
        "Kept source, fallback, and vendor evidence labels clearer for debugging."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "agent/state/snapshot-admin-vendor-cost-rewire.generated.json",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "scripts/agent/snapshot-admin-vendor-cost-rewire.ts",
        "scripts/agent/validate-admin-analytics-hot-cache.ts",
        "src/app/api/admin/analytics/historical/route.ts",
        "src/app/api/admin/debug/route.ts",
        "tests/unit/admin-analytics-historical-traffic.spec.ts"
      ],
      "sourceCommit": "e5c7da278b19e5e7a48285ea1aebffe7ac562934"
    },
    {
      "version": "1.2.26",
      "previousVersion": "1.2.25",
      "betaReleaseCounter": 226,
      "previousBetaReleaseCounter": 225,
      "commitSha": "e84b0c602becea2704f2acf5149f52a5a99a3e22",
      "commitTitle": "fix(analytics): collapse admin snapshot display authority",
      "commitCount": 1,
      "commitShas": [
        "e84b0c602becea2704f2acf5149f52a5a99a3e22"
      ],
      "committedAt": "2026-05-13T19:54:18.000Z",
      "generatedAt": "2026-05-13T19:55:34.179Z",
      "committedAtUtc": "2026-05-13T19:54:18.000Z",
      "generatedAtUtc": "2026-05-13T19:55:34.179Z",
      "updatedAtUtc": "2026-05-13T19:55:34.179Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Improved Admin Analytics snapshot authority and source labeling behind the scenes.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved how Admin Analytics chooses verified snapshot data behind the scenes.",
        "Reduced reliance on raw analytics logs as display truth.",
        "Kept vendor analytics labeled as supporting evidence instead of product truth."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "agent/state/snapshot-admin-vendor-cost-rewire.generated.json",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "scripts/agent/validate-admin-analytics-hot-cache.ts",
        "src/app/api/admin/analytics/realtime/route.ts",
        "tests/unit/admin-analytics-realtime-route.spec.ts"
      ],
      "sourceCommit": "e84b0c602becea2704f2acf5149f52a5a99a3e22"
    },
    {
      "version": "1.2.25",
      "previousVersion": "1.2.24",
      "betaReleaseCounter": 225,
      "previousBetaReleaseCounter": 224,
      "commitSha": "4f730c3a001440d4f50075be1204b124ae63353e",
      "commitTitle": "chore(analytics): add snapshot admin vendor cost contract",
      "commitCount": 1,
      "commitShas": [
        "4f730c3a001440d4f50075be1204b124ae63353e"
      ],
      "committedAt": "2026-05-13T18:51:35.000Z",
      "generatedAt": "2026-05-13T18:52:48.910Z",
      "committedAtUtc": "2026-05-13T18:51:35.000Z",
      "generatedAtUtc": "2026-05-13T18:52:48.910Z",
      "updatedAtUtc": "2026-05-13T18:52:48.910Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Bug fixes and general improvements.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added clearer rules for which analytics snapshots should power Admin Analytics.",
        "Prepared safer Debug-first handling for recovered analytics data.",
        "Improved internal checks that keep vendor analytics and raw logs from being treated as product truth."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "agent/state/snapshot-admin-vendor-cost-rewire.generated.json",
        "docs/agent-truth/analytics-truth-layer-v2.md",
        "docs/agent-truth/lost-data-recovery-dry-run.md",
        "docs/agent-truth/snapshot-admin-vendor-cost-rewire.md",
        "package.json",
        "scripts/agent/snapshot-admin-vendor-cost-rewire.ts",
        "scripts/agent/validate-snapshot-admin-vendor-cost-rewire.ts",
        "tests/unit/snapshot-admin-vendor-cost-rewire.spec.ts"
      ],
      "sourceCommit": "4f730c3a001440d4f50075be1204b124ae63353e"
    },
    {
      "version": "1.2.24",
      "previousVersion": "1.2.23",
      "betaReleaseCounter": 224,
      "previousBetaReleaseCounter": 223,
      "commitSha": "17aad2136900861a00072446be7a0ff12e890888",
      "commitTitle": "chore(analytics): add lost data recovery dry run",
      "commitCount": 1,
      "commitShas": [
        "17aad2136900861a00072446be7a0ff12e890888"
      ],
      "committedAt": "2026-05-13T03:15:13.000Z",
      "generatedAt": "2026-05-13T03:16:49.956Z",
      "committedAtUtc": "2026-05-13T03:15:13.000Z",
      "generatedAtUtc": "2026-05-13T03:16:49.956Z",
      "updatedAtUtc": "2026-05-13T03:16:49.956Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Bug fixes and general improvements.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Prepared a dry-run recovery map for analytics data that may exist but has not surfaced yet.",
        "Added safer rules for which recovered data can appear in Admin Debug or Admin Analytics.",
        "Kept recovery planning local-only, with no production reads or backfills."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "agent/state/lost-data-recovery-dry-run.generated.json",
        "docs/agent-truth/identity-privacy-raw-ledger-rewire.md",
        "docs/agent-truth/lost-data-recovery-dry-run.md",
        "package.json",
        "scripts/agent/lost-data-recovery-dry-run.ts",
        "scripts/agent/validate-lost-data-recovery-dry-run.ts",
        "tests/unit/lost-data-recovery-dry-run.spec.ts"
      ],
      "sourceCommit": "17aad2136900861a00072446be7a0ff12e890888"
    },
    {
      "version": "1.2.23",
      "previousVersion": "1.2.22",
      "betaReleaseCounter": 223,
      "previousBetaReleaseCounter": 222,
      "commitSha": "5dfefd62b0c1f282015745cf0dd7ec08c0040c79",
      "commitTitle": "chore(analytics): add identity privacy raw ledger contract",
      "commitCount": 1,
      "commitShas": [
        "5dfefd62b0c1f282015745cf0dd7ec08c0040c79"
      ],
      "committedAt": "2026-05-13T01:25:52.000Z",
      "generatedAt": "2026-05-13T01:26:38.338Z",
      "committedAtUtc": "2026-05-13T01:25:52.000Z",
      "generatedAtUtc": "2026-05-13T01:26:38.338Z",
      "updatedAtUtc": "2026-05-13T01:26:38.338Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Bug fixes and general improvements.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved internal analytics reliability and privacy-aware data handling behind the scenes.",
        "Added clearer rules for what telemetry can be used when privacy settings are off.",
        "Prepared recovery rules for data that exists but has not surfaced in the app yet."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-rewire-phase-one.generated.json",
        "agent/state/identity-privacy-raw-ledger-rewire.generated.json",
        "docs/agent-truth/analytics-rewire-phase-one.md",
        "docs/agent-truth/analytics-truth-layer-v2.md",
        "docs/agent-truth/identity-privacy-raw-ledger-rewire.md",
        "package.json",
        "scripts/agent/identity-privacy-raw-ledger-rewire.ts",
        "scripts/agent/validate-identity-privacy-raw-ledger-rewire.ts",
        "tests/unit/identity-privacy-raw-ledger-rewire.spec.ts"
      ],
      "sourceCommit": "5dfefd62b0c1f282015745cf0dd7ec08c0040c79"
    },
    {
      "version": "1.2.22",
      "previousVersion": "1.2.21",
      "betaReleaseCounter": 222,
      "previousBetaReleaseCounter": 221,
      "commitSha": "a3618a39794e4fa3e98a4a5020980a9ac323171b",
      "commitTitle": "chore(analytics): add truth lane rewire inventory",
      "commitCount": 2,
      "commitShas": [
        "cd63341797090ac4934d190a4694af7e2f2441c7",
        "a3618a39794e4fa3e98a4a5020980a9ac323171b"
      ],
      "committedAt": "2026-05-13T00:42:13.000Z",
      "generatedAt": "2026-05-13T00:43:40.627Z",
      "committedAtUtc": "2026-05-13T00:42:13.000Z",
      "generatedAtUtc": "2026-05-13T00:43:40.627Z",
      "updatedAtUtc": "2026-05-13T00:43:40.627Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Bug fixes and reliability improvements for chat, Beta readiness, and behind-the-scenes analytics.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved chat media sizing and message-thread scrolling.",
        "Improved guest analytics and admin truth checks behind the scenes.",
        "Updated Beta readiness evidence so stale or missing launch evidence stays visible."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 2 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/analytics-rewire-phase-one.generated.json",
        "docs/agent-truth/analytics-rewire-phase-one.md",
        "docs/agent-truth/analytics-truth-layer-v2.md",
        "docs/agent-truth/public-beta-release-notes.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/analytics-rewire-phase-one.ts",
        "scripts/agent/validate-analytics-rewire-phase-one.ts",
        "scripts/agent/validate-public-beta-changelog.ts",
        "scripts/agent/validate-release-notes-cutover.ts",
        "scripts/release/update-public-changelog.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/analytics-rewire-phase-one.spec.ts"
      ],
      "sourceCommit": "a3618a39794e4fa3e98a4a5020980a9ac323171b"
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
