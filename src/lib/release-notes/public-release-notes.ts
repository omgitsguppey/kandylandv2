import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.2.94",
  "betaReleaseCounter": 294,
  "channel": "beta",
  "generatedAt": "2026-05-19T15:23:15.848Z",
  "generatedAtUtc": "2026-05-19T15:23:15.848Z",
  "lastCommitSha": "pending-same-commit",
  "notes": [
    {
      "version": "1.2.94",
      "previousVersion": "1.2.93",
      "betaReleaseCounter": 294,
      "previousBetaReleaseCounter": 293,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(cost): guard sql and ai cost paths",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T15:23:15.848Z",
      "generatedAt": "2026-05-19T15:23:15.848Z",
      "committedAtUtc": "2026-05-19T15:23:15.848Z",
      "generatedAtUtc": "2026-05-19T15:23:15.848Z",
      "updatedAtUtc": "2026-05-19T15:23:15.848Z",
      "category": "Performance",
      "title": "Bug fixes and general improvements",
      "summary": "Guarded SQL mirror and Data Connect paths while keeping Cloud SQL and Gemini cost owner-review lanes visible.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Guarded SQL mirror and Data Connect cost paths.",
        "Clarified Cloud SQL and Gemini cost owner-review lanes.",
        "Blocked accidental background AI or SQL cost work."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted SQL and AI cost guard patch into this public beta note."
      ],
      "affectedSurfaces": [
        "agent tooling",
        "cloud cost guards",
        "admin AI"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/cloud-sql-gemini-cost-guards.generated.json",
        "docs/agent-truth/cloud-sql-gemini-cost-guards.md",
        "docs/doctrine/kandydrops-google-analytics-cloud-doctrine.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/sync-sql.ts",
        "scripts/agent/validate-cloud-sql-gemini-cost-guards.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/cloud-sql-gemini-cost-guards.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.2.93",
      "previousVersion": "1.2.92",
      "betaReleaseCounter": 293,
      "previousBetaReleaseCounter": 292,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(runtime): reduce scheduled job scan cost",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T15:04:59.522Z",
      "generatedAt": "2026-05-19T15:04:59.522Z",
      "committedAtUtc": "2026-05-19T15:04:59.522Z",
      "generatedAtUtc": "2026-05-19T15:04:59.522Z",
      "updatedAtUtc": "2026-05-19T15:04:59.522Z",
      "category": "Performance",
      "title": "Bug fixes and general improvements",
      "summary": "Reduced scheduled analytics and runtime scan costs while preserving queue, notification, and subscription correctness.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reduced scheduled analytics and runtime scan costs.",
        "Moved recurring jobs toward due-only and incremental work.",
        "Kept subscription, notification, and queue correctness intact."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted scheduled runtime cost patch into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "notifications",
        "creator subscriptions",
        "runtime jobs"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/scheduled-runtime-cost-reduction.generated.json",
        "docs/agent-truth/scheduled-runtime-cost-reduction.md",
        "functions/src/analytics-truth-runtime.ts",
        "functions/src/behavioral-intelligence-runtime.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-scheduled-runtime-cost-reduction.ts",
        "src/app/api/cron/process-creator-subscriptions/route.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/queue-runtime.ts",
        "tests/unit/scheduled-runtime-cost-reduction.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.2.92",
      "previousVersion": "1.2.91",
      "betaReleaseCounter": 292,
      "previousBetaReleaseCounter": 291,
      "commitSha": "83d085481f237358a857f16ca55c99b662ecbed5",
      "commitTitle": "fix(admin): reduce analytics debug read cost",
      "commitCount": 1,
      "commitShas": [
        "83d085481f237358a857f16ca55c99b662ecbed5"
      ],
      "committedAt": "2026-05-19T14:42:08.131Z",
      "generatedAt": "2026-05-19T14:42:08.131Z",
      "committedAtUtc": "2026-05-19T14:42:08.131Z",
      "generatedAtUtc": "2026-05-19T14:42:08.131Z",
      "updatedAtUtc": "2026-05-19T14:42:08.131Z",
      "category": "Performance",
      "title": "Bug fixes and general improvements",
      "summary": "Reduced default Admin Analytics and Debug read costs while preserving truth labels.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reduced default Admin Analytics and Debug read costs.",
        "Moved expensive admin sections behind snapshots, cache, or drilldowns.",
        "Preserved truth labels for stale, missing, and unavailable data."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted admin analytics/debug cost patch into this public beta note."
      ],
      "affectedSurfaces": [
        "admin",
        "analytics",
        "debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-analytics-debug-cost-reduction.generated.json",
        "docs/agent-truth/admin-analytics-debug-cost-reduction.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-analytics-debug-cost-reduction.ts",
        "src/app/api/admin/analytics/historical/route.ts",
        "src/app/api/admin/debug/route.ts",
        "src/app/api/admin/roster/route.ts",
        "src/app/api/admin/support/threads/route.ts",
        "src/app/api/admin/users/route.ts",
        "src/app/api/support/threads/route.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-data.ts",
        "src/lib/server/support-threads.ts",
        "tests/unit/admin-analytics-debug-cost-reduction.spec.ts"
      ],
      "sourceCommit": "83d085481f237358a857f16ca55c99b662ecbed5"
    },
    {
      "version": "1.2.91",
      "previousVersion": "1.2.90",
      "betaReleaseCounter": 291,
      "previousBetaReleaseCounter": 290,
      "commitSha": "03c39a8af422bc530f24536644c61672f8815b24",
      "commitTitle": "fix(analytics): reduce client telemetry volume",
      "commitCount": 1,
      "commitShas": [
        "03c39a8af422bc530f24536644c61672f8815b24"
      ],
      "committedAt": "2026-05-19T14:15:07.248Z",
      "generatedAt": "2026-05-19T14:15:07.248Z",
      "committedAtUtc": "2026-05-19T14:15:07.248Z",
      "generatedAtUtc": "2026-05-19T14:15:07.248Z",
      "updatedAtUtc": "2026-05-19T14:15:07.248Z",
      "category": "Performance",
      "title": "Bug fixes and general improvements",
      "summary": "Reduced non-priority client analytics volume while preserving priority tracking.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reduced non-priority client analytics flush volume.",
        "Summarized hover, visibility, and scroll telemetry.",
        "Kept priority conversion and watch-time tracking accurate."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted client telemetry cost patch into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/deeptracker-telemetry-volume-reduction.generated.json",
        "docs/agent-truth/deeptracker-telemetry-volume-reduction.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-deeptracker-telemetry-volume-reduction.ts",
        "src/components/Analytics/DeepTracker.tsx",
        "src/lib/analytics/analytics-identity-link.ts",
        "src/lib/analytics/client-telemetry-priority.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/deeptracker-telemetry-volume-reduction.spec.ts"
      ],
      "sourceCommit": "03c39a8af422bc530f24536644c61672f8815b24"
    },
    {
      "version": "1.2.90",
      "previousVersion": "1.2.89",
      "betaReleaseCounter": 290,
      "previousBetaReleaseCounter": 289,
      "commitSha": "b83c1225ffd93a16f6aecdd9b0081695613e32da",
      "commitTitle": "fix(analytics): reduce hot path cost churn",
      "commitCount": 1,
      "commitShas": [
        "b83c1225ffd93a16f6aecdd9b0081695613e32da"
      ],
      "committedAt": "2026-05-19T13:43:56.853Z",
      "generatedAt": "2026-05-19T13:43:56.853Z",
      "committedAtUtc": "2026-05-19T13:43:56.853Z",
      "generatedAtUtc": "2026-05-19T13:43:56.853Z",
      "updatedAtUtc": "2026-05-19T13:43:56.853Z",
      "category": "Performance",
      "title": "Bug fixes and general improvements",
      "summary": "Reduced hot-path analytics ingest and export cost risks while preserving priority tracking.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reduced hot-path analytics ingest and export cost risks.",
        "Moved low-priority analytics work toward batched lanes.",
        "Kept priority tracking accuracy intact while cutting retry and export churn."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted analytics cost patch into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/analytics-hot-path-cost-reduction.generated.json",
        "docs/agent-truth/analytics-hot-path-cost-reduction.md",
        "functions/src/analytics-bigquery-export.ts",
        "functions/src/analytics-event-facts.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-analytics-hot-path-cost-reduction.ts",
        "src/app/api/analytics/ingest/route.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/analytics-hot-path-cost-reduction.spec.ts"
      ],
      "sourceCommit": "b83c1225ffd93a16f6aecdd9b0081695613e32da"
    },
    {
      "version": "1.2.89",
      "previousVersion": "1.2.88",
      "betaReleaseCounter": 289,
      "previousBetaReleaseCounter": 288,
      "commitSha": "d8f818a75f5b7e195937878e15058d63a4cc40fd",
      "commitTitle": "fix(analytics): reduce hot path cost churn",
      "commitCount": 1,
      "commitShas": [
        "d8f818a75f5b7e195937878e15058d63a4cc40fd"
      ],
      "committedAt": "2026-05-19T13:26:53.122Z",
      "generatedAt": "2026-05-19T13:26:53.122Z",
      "committedAtUtc": "2026-05-19T13:26:53.122Z",
      "generatedAtUtc": "2026-05-19T13:26:53.122Z",
      "updatedAtUtc": "2026-05-19T13:26:53.122Z",
      "category": "Performance",
      "title": "Bug fixes and general improvements",
      "summary": "Reduced hot-path analytics cost risks while preserving priority tracking.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reduced hot-path analytics and export cost risks.",
        "Moved non-priority analytics work toward batched and cached lanes.",
        "Kept priority tracking accuracy intact while reducing retry and export churn."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted analytics cost patch into this public beta note."
      ],
      "affectedSurfaces": [
        "admin",
        "analytics"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/analytics-cost-hot-path-reduction.generated.json",
        "docs/agent-truth/analytics-cost-hot-path-reduction.md",
        "functions/src/analytics-bigquery-export.ts",
        "functions/src/analytics-realtime-summary.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-analytics-cost-hot-path-reduction.ts",
        "src/app/api/admin/analytics/historical/route.ts",
        "src/app/api/admin/debug/route.ts",
        "src/app/api/analytics/ingest/route.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/runtime-warning-store.ts",
        "tests/unit/analytics-cost-hot-path-reduction.spec.ts"
      ],
      "sourceCommit": "d8f818a75f5b7e195937878e15058d63a4cc40fd"
    },
    {
      "version": "1.2.88",
      "previousVersion": "1.2.87",
      "betaReleaseCounter": 288,
      "previousBetaReleaseCounter": 287,
      "commitSha": "5f06f4f9e9af5ef7e63878ac7e984007a9a7cc28",
      "commitTitle": "perf(debug-route): replace O(N^2) array filters with Map lookup (#260)",
      "commitCount": 5,
      "commitShas": [
        "d256354ab2b6c084f84564f328a00befebb727d6",
        "c70e7c6417831368a46626c646a84ed8e04f441a",
        "5f5e18886ffce7e16691e12e64c52ad8738386b2",
        "cb748bbc3495cb35b75b264a2bd741ba1d22aaf8",
        "5f06f4f9e9af5ef7e63878ac7e984007a9a7cc28"
      ],
      "committedAt": "2026-05-18T18:19:17.000Z",
      "generatedAt": "2026-05-18T18:21:17.540Z",
      "committedAtUtc": "2026-05-18T18:19:17.000Z",
      "generatedAtUtc": "2026-05-18T18:21:17.540Z",
      "updatedAtUtc": "2026-05-18T18:21:17.540Z",
      "category": "Performance",
      "title": "Bug fixes and general improvements",
      "summary": "Improved admin truth visibility, debug performance, and CI security maintenance.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Kept admin debug panels from showing missing evidence as healthy.",
        "Reduced duplicate admin analytics and debug lookup work.",
        "Updated the Scorecard security action and closed out the remaining PR lane."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 5 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "admin",
        "drops-viewer",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        ".github/workflows/openssf-scorecard.yml",
        ".jules/bolt.md",
        "CHANGELOG.md",
        "agent/state/open-pr-final-action.generated.json",
        "docs/agent-truth/open-pr-final-action.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-open-pr-final-action.ts",
        "src/app/admin/debug/components/DebugAdvancedTruth.tsx",
        "src/app/admin/debug/components/DebugTabMonitoring.tsx",
        "src/app/api/admin/debug/route.ts",
        "src/lib/admin-debug-summary-cards.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-historical-viewer.ts",
        "src/lib/server/admin-page-data-loader.ts",
        "tests/unit/open-pr-final-action.spec.ts"
      ],
      "sourceCommit": "5f06f4f9e9af5ef7e63878ac7e984007a9a7cc28"
    },
    {
      "version": "1.2.87",
      "previousVersion": "1.2.86",
      "betaReleaseCounter": 287,
      "previousBetaReleaseCounter": 286,
      "commitSha": "cd6c02ef2f85095907a2a1aaf95c1833afe3447d",
      "commitTitle": "🎨 Palette: Add aria-busy to Button component for loading states (#233)",
      "commitCount": 3,
      "commitShas": [
        "c834dbec9299590a5a280bc08754eee9d33180d4",
        "60316496565107ef446e38dd81503ff0cd78f079",
        "cd6c02ef2f85095907a2a1aaf95c1833afe3447d"
      ],
      "committedAt": "2026-05-18T18:10:01.000Z",
      "generatedAt": "2026-05-18T18:11:22.425Z",
      "committedAtUtc": "2026-05-18T18:10:01.000Z",
      "generatedAtUtc": "2026-05-18T18:11:22.425Z",
      "updatedAtUtc": "2026-05-18T18:11:22.425Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Improved loading state accessibility and finalized PR cleanup evidence.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved loading state accessibility for buttons.",
        "Kept remaining risky PRs out of the beta cleanup lane.",
        "Recorded final open PR owner-review actions."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 3 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        ".Jules/palette.md",
        "CHANGELOG.md",
        "agent/state/analytics-cadence-cost-policy.generated.json",
        "agent/state/analytics-legacy-history-reconciliation.generated.json",
        "agent/state/analytics-semantics-final-lock.generated.json",
        "agent/state/guest-user-identity-transfer.generated.json",
        "agent/state/pr-cleanup-final.generated.json",
        "agent/state/runtime-watch-time-v2.generated.json",
        "docs/agent-truth/analytics-cadence-cost-policy.md",
        "docs/agent-truth/analytics-legacy-history-reconciliation.md",
        "docs/agent-truth/analytics-semantics-final-lock.md",
        "docs/agent-truth/guest-user-identity-transfer.md",
        "docs/agent-truth/pr-cleanup-final.md",
        "docs/agent-truth/runtime-watch-time-v2.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-analytics-semantics-final-lock.ts",
        "scripts/agent/validate-pr-cleanup-final.ts",
        "scripts/agent/validate-runtime-watch-time-v2.ts",
        "src/components/Analytics/RuntimeWatchTracker.tsx",
        "src/components/ui/Button.tsx",
        "src/lib/analytics/analytics-event-contract.ts",
        "src/lib/analytics/runtime-watch-time-v2.ts",
        "src/lib/analytics/watch-time-v2.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/analytics-semantics-final-lock.spec.ts",
        "tests/unit/pr-cleanup-final.spec.ts",
        "tests/unit/runtime-watch-time-v2.spec.ts",
        "tests/unit/runtime-watch-tracker.spec.tsx"
      ],
      "sourceCommit": "cd6c02ef2f85095907a2a1aaf95c1833afe3447d"
    },
    {
      "version": "1.2.86",
      "previousVersion": "1.2.85",
      "betaReleaseCounter": 286,
      "previousBetaReleaseCounter": 285,
      "commitSha": "b0ca63c46d97d0f957902d4f37053a4589db489c",
      "commitTitle": "fix(analytics): lock runtime watch time semantics",
      "commitCount": 1,
      "commitShas": [
        "b0ca63c46d97d0f957902d4f37053a4589db489c"
      ],
      "committedAt": "2026-05-18T14:43:13.248Z",
      "generatedAt": "2026-05-18T14:43:13.248Z",
      "committedAtUtc": "2026-05-18T14:43:13.248Z",
      "generatedAtUtc": "2026-05-18T14:43:13.248Z",
      "updatedAtUtc": "2026-05-18T14:43:13.248Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added runtime-based media watch-time tracking rules.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added runtime-based media watch-time tracking rules.",
        "Separated real watch time from page-open time.",
        "Locked guest, user, legacy, and watch analytics semantics with cost guards."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/lib/analytics/runtime-watch-time-v2.ts",
        "src/lib/analytics/watch-time-v2.ts",
        "src/components/Analytics/RuntimeWatchTracker.tsx",
        "src/lib/analytics/analytics-event-contract.ts",
        "agent/state/runtime-watch-time-v2.generated.json",
        "docs/agent-truth/runtime-watch-time-v2.md",
        "scripts/agent/validate-runtime-watch-time-v2.ts",
        "agent/state/analytics-semantics-final-lock.generated.json",
        "docs/agent-truth/analytics-semantics-final-lock.md",
        "scripts/agent/validate-analytics-semantics-final-lock.ts",
        "tests/unit/runtime-watch-time-v2.spec.ts",
        "tests/unit/runtime-watch-tracker.spec.tsx",
        "tests/unit/analytics-semantics-final-lock.spec.ts",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "b0ca63c46d97d0f957902d4f37053a4589db489c"
    },
    {
      "version": "1.2.85",
      "previousVersion": "1.2.84",
      "betaReleaseCounter": 285,
      "previousBetaReleaseCounter": 284,
      "commitSha": "f99dfcd24808078a69f8d77985a2f8d23e556d24",
      "commitTitle": "docs(analytics): reconcile legacy tracking history",
      "commitCount": 1,
      "commitShas": [
        "f99dfcd24808078a69f8d77985a2f8d23e556d24"
      ],
      "committedAt": "2026-05-18T14:33:22.786Z",
      "generatedAt": "2026-05-18T14:33:22.786Z",
      "committedAtUtc": "2026-05-18T14:33:22.786Z",
      "generatedAtUtc": "2026-05-18T14:33:22.786Z",
      "updatedAtUtc": "2026-05-18T14:33:22.786Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Mapped legacy analytics history without overwriting current truth.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Mapped legacy analytics history without overwriting current truth.",
        "Added confidence and duplicate-risk checks for recovered history.",
        "Kept older realtime sources from driving current analytics totals."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/lib/analytics/legacy-history-reconciler.ts",
        "agent/state/analytics-legacy-history-reconciliation.generated.json",
        "docs/agent-truth/analytics-legacy-history-reconciliation.md",
        "scripts/agent/validate-analytics-legacy-history-reconciliation.ts",
        "tests/unit/analytics-legacy-history-reconciliation.spec.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "f99dfcd24808078a69f8d77985a2f8d23e556d24"
    },
    {
      "version": "1.2.84",
      "previousVersion": "1.2.83",
      "betaReleaseCounter": 284,
      "previousBetaReleaseCounter": 283,
      "commitSha": "fa8d18a61c85cfcc97a17def243b70c743731984",
      "commitTitle": "fix(analytics): link guest history to users",
      "commitCount": 1,
      "commitShas": [
        "fa8d18a61c85cfcc97a17def243b70c743731984"
      ],
      "committedAt": "2026-05-18T14:25:06.697Z",
      "generatedAt": "2026-05-18T14:25:06.697Z",
      "committedAtUtc": "2026-05-18T14:25:06.697Z",
      "generatedAtUtc": "2026-05-18T14:25:06.697Z",
      "updatedAtUtc": "2026-05-18T14:25:06.697Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Linked guest analytics history to signed-in users without double-counting.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Linked guest analytics history to signed-in users without double-counting.",
        "Improved individual user tracking semantics.",
        "Kept identity transfer idempotent and low-cost."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/lib/analytics/identity-transfer.ts",
        "agent/state/guest-user-identity-transfer.generated.json",
        "docs/agent-truth/guest-user-identity-transfer.md",
        "scripts/agent/validate-guest-user-identity-transfer.ts",
        "tests/unit/guest-user-identity-transfer.spec.ts",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "fa8d18a61c85cfcc97a17def243b70c743731984"
    },
    {
      "version": "1.2.83",
      "previousVersion": "1.2.82",
      "betaReleaseCounter": 283,
      "previousBetaReleaseCounter": 282,
      "commitSha": "9aa5fdd94d740986306b3f4555225c9ede1d644d",
      "commitTitle": "fix(analytics): reduce non priority cadence cost",
      "commitCount": 1,
      "commitShas": [
        "9aa5fdd94d740986306b3f4555225c9ede1d644d"
      ],
      "committedAt": "2026-05-18T14:16:03.043Z",
      "generatedAt": "2026-05-18T14:16:03.043Z",
      "committedAtUtc": "2026-05-18T14:16:03.043Z",
      "generatedAtUtc": "2026-05-18T14:16:03.043Z",
      "updatedAtUtc": "2026-05-18T14:16:03.043Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Moved non-priority analytics checks toward a daily cadence.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Moved non-priority analytics checks toward a daily cadence.",
        "Added cost guards for analytics exports and evidence refreshes.",
        "Kept live tracking separate from lower-priority evidence work."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/lib/analytics/analytics-cadence-policy.ts",
        "src/lib/server/admin-analytics-data.ts",
        "functions/src/analytics-bigquery-export.ts",
        "agent/state/analytics-cadence-cost-policy.generated.json",
        "docs/agent-truth/analytics-cadence-cost-policy.md",
        "scripts/agent/validate-analytics-cadence-cost-policy.ts",
        "tests/unit/analytics-cadence-cost-policy.spec.ts",
        "agent/state/analytics-cost-runtime-inventory.generated.json",
        "docs/agent-truth/analytics-cost-runtime-inventory.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "9aa5fdd94d740986306b3f4555225c9ede1d644d"
    },
    {
      "version": "1.2.82",
      "previousVersion": "1.2.81",
      "betaReleaseCounter": 282,
      "previousBetaReleaseCounter": 281,
      "commitSha": "1ae808dd4f8d569aacd1eb6c8148762261c9976f",
      "commitTitle": "docs(analytics): map cost and runtime tracking",
      "commitCount": 1,
      "commitShas": [
        "1ae808dd4f8d569aacd1eb6c8148762261c9976f"
      ],
      "committedAt": "2026-05-18T14:08:29.415Z",
      "generatedAt": "2026-05-18T14:08:29.415Z",
      "committedAtUtc": "2026-05-18T14:08:29.415Z",
      "generatedAtUtc": "2026-05-18T14:08:29.415Z",
      "updatedAtUtc": "2026-05-18T14:08:29.415Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Mapped analytics cost and runtime tracking surfaces.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Mapped analytics cost and runtime tracking surfaces.",
        "Added Cloud Run, Cloud SQL, BigQuery, and Gemini cost inventories.",
        "Prepared focused follow-ups for 4xx, retry, and analytics cadence cleanup."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-cost-runtime-inventory.generated.json",
        "docs/agent-truth/analytics-cost-runtime-inventory.md",
        "scripts/agent/validate-analytics-cost-runtime-inventory.ts",
        "tests/unit/analytics-cost-runtime-inventory.spec.ts",
        "agent/state/speed-security-hardening.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "1ae808dd4f8d569aacd1eb6c8148762261c9976f"
    },
    {
      "version": "1.2.81",
      "previousVersion": "1.2.80",
      "betaReleaseCounter": 281,
      "previousBetaReleaseCounter": 280,
      "commitSha": "c015ed78b1220ed718e2691394e3336d0fe64a3e",
      "commitTitle": "docs(analytics): lock tracking semantics readiness",
      "commitCount": 1,
      "commitShas": [
        "c015ed78b1220ed718e2691394e3336d0fe64a3e"
      ],
      "committedAt": "2026-05-18T13:56:43.998Z",
      "generatedAt": "2026-05-18T13:56:43.998Z",
      "committedAtUtc": "2026-05-18T13:56:43.998Z",
      "generatedAtUtc": "2026-05-18T13:56:43.998Z",
      "updatedAtUtc": "2026-05-18T13:56:43.998Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Locked guest, user, legacy, and watch-time analytics semantics.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked guest, user, legacy, and watch-time analytics semantics.",
        "Updated Beta evidence to recognize analytics source readiness.",
        "Kept runtime proof and cost review blockers visible."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-semantics-final-lock.generated.json",
        "docs/agent-truth/analytics-semantics-final-lock.md",
        "scripts/agent/validate-analytics-semantics-final-lock.ts",
        "tests/unit/analytics-semantics-final-lock.spec.ts",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/current-beta-exit-status.md",
        "scripts/agent/validate-current-beta-exit-status.ts",
        "tests/unit/current-beta-exit-status.spec.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "c015ed78b1220ed718e2691394e3336d0fe64a3e"
    },
    {
      "version": "1.2.80",
      "previousVersion": "1.2.79",
      "betaReleaseCounter": 280,
      "previousBetaReleaseCounter": 279,
      "commitSha": "5ca8a3b9cdcc0ceb2062b82e2b0f0b9a9c00f91f",
      "commitTitle": "fix(analytics): add runtime watch time v2",
      "commitCount": 1,
      "commitShas": [
        "5ca8a3b9cdcc0ceb2062b82e2b0f0b9a9c00f91f"
      ],
      "committedAt": "2026-05-18T13:46:39.851Z",
      "generatedAt": "2026-05-18T13:46:39.851Z",
      "committedAtUtc": "2026-05-18T13:46:39.851Z",
      "generatedAtUtc": "2026-05-18T13:46:39.851Z",
      "updatedAtUtc": "2026-05-18T13:46:39.851Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Added runtime-based watch-time tracking rules.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added runtime-based watch-time tracking rules.",
        "Separated media watch time from page-open time.",
        "Added cost-safe heartbeat and visibility guards for watch tracking."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/lib/analytics/watch-time-v2.ts",
        "src/components/Analytics/RuntimeWatchTracker.tsx",
        "agent/state/runtime-watch-time-v2.generated.json",
        "docs/agent-truth/runtime-watch-time-v2.md",
        "scripts/agent/validate-runtime-watch-time-v2.ts",
        "tests/unit/runtime-watch-time-v2.spec.ts",
        "tests/unit/runtime-watch-tracker.spec.tsx",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "5ca8a3b9cdcc0ceb2062b82e2b0f0b9a9c00f91f"
    },
    {
      "version": "1.2.79",
      "previousVersion": "1.2.78",
      "betaReleaseCounter": 279,
      "previousBetaReleaseCounter": 278,
      "commitSha": "d14d5d10899b0784d0743319a45c83854443a49a",
      "commitTitle": "docs(analytics): reconcile legacy history recovery",
      "commitCount": 1,
      "commitShas": [
        "d14d5d10899b0784d0743319a45c83854443a49a"
      ],
      "committedAt": "2026-05-18T13:34:57.288Z",
      "generatedAt": "2026-05-18T13:34:57.288Z",
      "committedAtUtc": "2026-05-18T13:34:57.288Z",
      "generatedAtUtc": "2026-05-18T13:34:57.288Z",
      "updatedAtUtc": "2026-05-18T13:34:57.288Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Mapped legacy analytics recovery without changing current product truth.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Mapped legacy analytics recovery without overwriting current truth.",
        "Added duplicate-risk checks for historical analytics recovery.",
        "Kept external analytics sources evidence-only until reconciled."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/lib/analytics/legacy-recovery-reconciler.ts",
        "agent/state/analytics-legacy-recovery-reconciliation.generated.json",
        "docs/agent-truth/analytics-legacy-recovery-reconciliation.md",
        "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts",
        "tests/unit/analytics-legacy-recovery-reconciliation.spec.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "d14d5d10899b0784d0743319a45c83854443a49a"
    },
    {
      "version": "1.2.78",
      "previousVersion": "1.2.77",
      "betaReleaseCounter": 278,
      "previousBetaReleaseCounter": 277,
      "commitSha": "c22c712b34199c29435c9d6f1c20d14b4e3c6a4d",
      "commitTitle": "fix(analytics): link guest history to users",
      "commitCount": 1,
      "commitShas": [
        "c22c712b34199c29435c9d6f1c20d14b4e3c6a4d"
      ],
      "committedAt": "2026-05-18T05:02:17.741Z",
      "generatedAt": "2026-05-18T05:02:17.741Z",
      "committedAtUtc": "2026-05-18T05:02:17.741Z",
      "generatedAtUtc": "2026-05-18T05:02:17.741Z",
      "updatedAtUtc": "2026-05-18T05:02:17.741Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Improved guest-to-user analytics identity continuity.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added guest-to-user analytics identity linking.",
        "Kept guest history recoverable without double-counting user activity.",
        "Improved individual user tracking semantics."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/lib/analytics/analytics-identity-link.ts",
        "src/lib/analytics/analytics-event-contract.ts",
        "src/lib/analytics/identity-link-contract.ts",
        "src/context/AuthContext.tsx",
        "src/app/api/analytics/identity-link/route.ts",
        "src/app/api/analytics/ingest-identified/route.ts",
        "agent/state/guest-user-identity-transfer.generated.json",
        "docs/agent-truth/guest-user-identity-transfer.md",
        "scripts/agent/validate-guest-user-identity-transfer.ts",
        "tests/unit/guest-user-identity-transfer.spec.ts",
        "tests/unit/guest-user-identity-transfer-validator.spec.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "c22c712b34199c29435c9d6f1c20d14b4e3c6a4d"
    },
    {
      "version": "1.2.77",
      "previousVersion": "1.2.76",
      "betaReleaseCounter": 277,
      "previousBetaReleaseCounter": 276,
      "commitSha": "5804de2bee6bb7ee37b6764af26094c391d03abf",
      "commitTitle": "docs(analytics): map identity transfer truth",
      "commitCount": 1,
      "commitShas": [
        "5804de2bee6bb7ee37b6764af26094c391d03abf"
      ],
      "committedAt": "2026-05-18T04:39:33.805Z",
      "generatedAt": "2026-05-18T04:39:33.805Z",
      "committedAtUtc": "2026-05-18T04:39:33.805Z",
      "generatedAtUtc": "2026-05-18T04:39:33.805Z",
      "updatedAtUtc": "2026-05-18T04:39:33.805Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Mapped analytics identity transfer readiness behind the scenes.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Mapped guest-to-user analytics identity transfer points.",
        "Separated analytics product truth from external evidence layers.",
        "Added Cloud Run, Cloud SQL, Gemini, and 4xx cost checks to analytics tracking inventory."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-identity-transfer-inventory.generated.json",
        "docs/agent-truth/analytics-identity-transfer-inventory.md",
        "scripts/agent/validate-analytics-identity-transfer-inventory.ts",
        "tests/unit/analytics-identity-transfer-inventory.spec.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "5804de2bee6bb7ee37b6764af26094c391d03abf"
    },
    {
      "version": "1.2.76",
      "previousVersion": "1.2.75",
      "betaReleaseCounter": 276,
      "previousBetaReleaseCounter": 275,
      "commitSha": "8241f31557d2340f691695affc3d2851af3b8fa0",
      "commitTitle": "fix(creator): make settings source partial safe",
      "commitCount": 1,
      "commitShas": [
        "8241f31557d2340f691695affc3d2851af3b8fa0"
      ],
      "committedAt": "2026-05-18T01:02:43.775Z",
      "generatedAt": "2026-05-18T01:02:43.775Z",
      "committedAtUtc": "2026-05-18T01:02:43.775Z",
      "generatedAtUtc": "2026-05-18T01:02:43.775Z",
      "updatedAtUtc": "2026-05-18T01:02:43.775Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Made Creator Settings safer when creator source data is missing.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Made Creator Settings load safely when some creator data is missing.",
        "Separated Account Settings from Creator Settings labels.",
        "Kept creator dashboard source issues from showing as raw server errors."
      ],
      "audience": "creators",
      "affectedSurfaces": [
        "creator"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/app/api/creator/settings/route.ts",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/components/Navigation/ProfileDropdown.tsx",
        "src/components/Navigation/ProfileSidebar.tsx",
        "agent/state/creator-settings-source-health.generated.json",
        "docs/agent-truth/creator-settings-source-health.md",
        "scripts/agent/validate-creator-settings-source-health.ts",
        "scripts/agent/validate-creator-surface-routing.ts",
        "tests/unit/creator-settings-route.spec.ts",
        "tests/unit/creator-settings-source-health.spec.ts",
        "tests/unit/creator-dashboard-settings.spec.tsx",
        "tests/unit/creator-surface-routing.spec.ts",
        "tests/unit/human-error-surface-wiring.spec.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "8241f31557d2340f691695affc3d2851af3b8fa0"
    },
    {
      "version": "1.2.75",
      "previousVersion": "1.2.74",
      "betaReleaseCounter": 275,
      "previousBetaReleaseCounter": 274,
      "commitSha": "0a35888279ccfba99c30a37dbfa566f9fa7eb2c4",
      "commitTitle": "fix(creator): tighten landing dashboard routes",
      "commitCount": 1,
      "commitShas": [
        "0a35888279ccfba99c30a37dbfa566f9fa7eb2c4"
      ],
      "committedAt": "2026-05-17T23:08:44.718Z",
      "generatedAt": "2026-05-17T23:08:44.718Z",
      "committedAtUtc": "2026-05-17T23:08:44.718Z",
      "generatedAtUtc": "2026-05-17T23:08:44.718Z",
      "updatedAtUtc": "2026-05-17T23:08:44.718Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Tightened Creator Dashboard routing and mobile layout.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Fixed Creator Dashboard create-drop routing.",
        "Made the creator landing dashboard tighter on mobile.",
        "Kept creator dashboard and creator settings routes clearly separated."
      ],
      "audience": "creators",
      "affectedSurfaces": [
        "creator"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/lib/creator-profile-routing.ts",
        "docs/agent-truth/creator-surface-routing.md",
        "agent/state/creator-surface-routing.generated.json",
        "agent/state/creator-landing-dashboard-mobile.generated.json",
        "docs/agent-truth/creator-landing-dashboard-mobile.md",
        "scripts/agent/validate-creator-surface-routing.ts",
        "scripts/agent/validate-creator-landing-dashboard-mobile.ts",
        "tests/unit/creator-surface-routing.spec.ts",
        "tests/unit/creator-landing-dashboard-mobile.spec.ts",
        "tests/unit/human-error-surface-wiring.spec.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "0a35888279ccfba99c30a37dbfa566f9fa7eb2c4"
    },
    {
      "version": "1.2.74",
      "previousVersion": "1.2.73",
      "betaReleaseCounter": 274,
      "previousBetaReleaseCounter": 273,
      "commitSha": "fd5c54023430f7d0dc820234d9585e3b82200908",
      "commitTitle": "fix(creator): separate dashboard and settings routes",
      "commitCount": 1,
      "commitShas": [
        "fd5c54023430f7d0dc820234d9585e3b82200908"
      ],
      "committedAt": "2026-05-17T22:10:34.782Z",
      "generatedAt": "2026-05-17T22:10:34.782Z",
      "committedAtUtc": "2026-05-17T22:10:34.782Z",
      "generatedAtUtc": "2026-05-17T22:10:34.782Z",
      "updatedAtUtc": "2026-05-17T22:10:34.782Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Separated Creator Dashboard and Creator Settings routing.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Separated Creator Dashboard from Creator Settings routing.",
        "Cleaned up mobile layouts across creator dashboard surfaces.",
        "Removed raw creator settings errors from creator-facing views."
      ],
      "audience": "creators",
      "affectedSurfaces": [
        "creator"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/app/dashboard/creator/page.tsx",
        "src/app/dashboard/creator/settings/page.tsx",
        "src/app/dashboard/profile/creator/page.tsx",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/components/Navigation/ProfileDropdown.tsx",
        "src/components/Navigation/ProfileSidebar.tsx",
        "src/components/Settings/UserSettingsPage.tsx",
        "src/lib/creator-profile-routing.ts",
        "docs/agent-truth/creator-surface-routing.md",
        "agent/state/creator-surface-routing.generated.json",
        "scripts/agent/validate-creator-surface-routing.ts",
        "tests/unit/creator-surface-routing.spec.ts",
        "tests/unit/creator-dashboard-settings.spec.tsx",
        "tests/unit/user-creator-ui-parity.spec.ts",
        "tests/unit/human-error-surface-wiring.spec.ts",
        "package.json",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "fd5c54023430f7d0dc820234d9585e3b82200908"
    },
    {
      "version": "1.2.73",
      "previousVersion": "1.2.72",
      "betaReleaseCounter": 273,
      "previousBetaReleaseCounter": 272,
      "commitSha": "df4c879a6edd33286f7ee44e48d4eb4a31c014bc",
      "commitTitle": "fix(creator): compact dashboard and translate settings errors",
      "commitCount": 1,
      "commitShas": [
        "df4c879a6edd33286f7ee44e48d4eb4a31c014bc"
      ],
      "committedAt": "2026-05-17T20:27:44.380Z",
      "generatedAt": "2026-05-17T20:27:44.380Z",
      "committedAtUtc": "2026-05-17T20:27:44.380Z",
      "generatedAtUtc": "2026-05-17T20:27:44.380Z",
      "updatedAtUtc": "2026-05-17T20:27:44.380Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Cleaned up Creator Dashboard mobile errors and density.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Cleaned up Creator Dashboard error messages on mobile.",
        "Made Creator Dashboard cards more compact on small screens.",
        "Kept raw settings errors routed away from normal creator views."
      ],
      "audience": "creators",
      "affectedSurfaces": [
        "creator"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/lib/errors/error-dictionary.ts",
        "tests/unit/creator-dashboard-settings.spec.tsx",
        "tests/unit/human-error-surface-wiring.spec.ts",
        "scripts/agent/validate-human-error-surface-wiring.ts",
        "agent/state/human-error-surface-wiring.generated.json",
        "docs/agent-truth/human-error-surface-wiring.md",
        "agent/state/error-truth-debug-visibility.generated.json",
        "docs/agent-truth/error-truth-debug-visibility.md",
        "agent/state/error-handling-final-readiness.generated.json",
        "docs/agent-truth/error-handling-final-readiness.md",
        "public/kandydrops-release-notes.json",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "CHANGELOG.md"
      ],
      "sourceCommit": "df4c879a6edd33286f7ee44e48d4eb4a31c014bc"
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
