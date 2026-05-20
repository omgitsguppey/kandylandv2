import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.3.23",
  "betaReleaseCounter": 323,
  "channel": "beta",
  "generatedAt": "2026-05-20T04:12:15.962Z",
  "generatedAtUtc": "2026-05-20T04:12:15.962Z",
  "lastCommitSha": "pending-same-commit",
  "notes": [
    {
      "version": "1.3.23",
      "previousVersion": "1.3.22",
      "betaReleaseCounter": 323,
      "previousBetaReleaseCounter": 322,
      "commitSha": "pending-same-commit",
      "commitTitle": "feat(creator): finalize settings control plane",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T04:12:15.962Z",
      "generatedAt": "2026-05-20T04:12:15.962Z",
      "committedAtUtc": "2026-05-20T04:12:15.962Z",
      "generatedAtUtc": "2026-05-20T04:12:15.962Z",
      "updatedAtUtc": "2026-05-20T04:12:15.962Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Added creator settings controls for Fan Pass, broadcasts, and creator experiences.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Added creator settings controls for Fan Pass, broadcasts, and creator experiences.",
        "Connected creator setup warnings to actual settings.",
        "Kept creator settings mobile-first and user-facing safe."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted Creator Settings control-plane pass into this public beta note."
      ],
      "affectedSurfaces": [
        "creator settings",
        "creator profile",
        "Fan Pass",
        "broadcasts",
        "creator experiences"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-settings-control-plane.generated.json",
        "docs/agent-truth/creator-settings-control-plane.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-settings-control-plane.ts",
        "src/app/api/creator/settings/route.ts",
        "src/app/creators/[username]/CreatorProfileClient.tsx",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/lib/creator-experiences.ts",
        "src/lib/creator-settings/creator-settings-contract.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/types/db.ts",
        "tests/unit/creator-dashboard-settings.spec.tsx",
        "tests/unit/creator-settings-control-plane.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.22",
      "previousVersion": "1.3.21",
      "betaReleaseCounter": 322,
      "previousBetaReleaseCounter": 321,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(ui): lock mobile self checks",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T00:34:33.985Z",
      "generatedAt": "2026-05-20T00:34:33.985Z",
      "committedAtUtc": "2026-05-20T00:34:33.985Z",
      "generatedAtUtc": "2026-05-20T00:34:33.985Z",
      "updatedAtUtc": "2026-05-20T00:34:33.985Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Locked mobile UI scaling and organization checks.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked mobile UI scaling and organization checks.",
        "Added self-check rules for future UI changes.",
        "Kept navigation and chat protected from broad mobile cleanup."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted mobile UI final lock pass into this public beta note."
      ],
      "affectedSurfaces": [
        "mobile UI",
        "admin screens",
        "creator screens",
        "user screens"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-surface-routing.generated.json",
        "agent/state/mobile-hardcoded-css-cleanup.generated.json",
        "agent/state/mobile-loading-hydration-stability.generated.json",
        "agent/state/mobile-surface-organization.generated.json",
        "agent/state/mobile-ui-final-lock.generated.json",
        "agent/state/mobile-ui-scaling-doctrine.generated.json",
        "agent/state/source-truth-authority-map.generated.json",
        "agent/state/user-creator-ui-parity.generated.json",
        "docs/agent-truth/mobile-hardcoded-css-cleanup.md",
        "docs/agent-truth/mobile-loading-hydration-stability.md",
        "docs/agent-truth/mobile-surface-organization.md",
        "docs/agent-truth/mobile-ui-final-lock.md",
        "docs/agent-truth/mobile-ui-scaling-doctrine.md",
        "docs/agent-truth/source-truth-authority-map.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-surface-routing.ts",
        "scripts/agent/validate-mobile-ui-final-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-surface-routing.spec.ts",
        "tests/unit/mobile-ui-final-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.21",
      "previousVersion": "1.3.20",
      "betaReleaseCounter": 321,
      "previousBetaReleaseCounter": 320,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(ui): organize mobile surfaces",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T00:20:42.819Z",
      "generatedAt": "2026-05-20T00:20:42.819Z",
      "committedAtUtc": "2026-05-20T00:20:42.819Z",
      "generatedAtUtc": "2026-05-20T00:20:42.819Z",
      "updatedAtUtc": "2026-05-20T00:20:42.819Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Improved mobile organization across admin, user, and creator screens.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved mobile organization across admin, user, and creator screens.",
        "Collapsed desktop-heavy sections into mobile summaries and drilldowns.",
        "Kept navigation and chat unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted mobile surface organization pass into this public beta note."
      ],
      "affectedSurfaces": [
        "mobile UI",
        "admin screens",
        "creator screens",
        "user screens"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/mobile-surface-organization.generated.json",
        "docs/agent-truth/mobile-surface-organization.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-mobile-surface-organization.ts",
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/debug/page.tsx",
        "src/app/admin/queue/page.tsx",
        "src/app/dashboard/DashboardClient.tsx",
        "src/app/dashboard/library/LibraryClient.tsx",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/mobile-surface-organization.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.20",
      "previousVersion": "1.3.19",
      "betaReleaseCounter": 320,
      "previousBetaReleaseCounter": 319,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(ui): stabilize mobile loading states",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T00:10:16.213Z",
      "generatedAt": "2026-05-20T00:10:16.213Z",
      "committedAtUtc": "2026-05-20T00:10:16.213Z",
      "generatedAtUtc": "2026-05-20T00:10:16.213Z",
      "updatedAtUtc": "2026-05-20T00:10:16.213Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Improved mobile loading and skeleton stability.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Improved mobile loading and skeleton stability.",
        "Reduced layout shift during dashboard hydration.",
        "Added stale-request guards for mobile data loading."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted mobile loading hydration stability pass into this public beta note."
      ],
      "affectedSurfaces": [
        "mobile UI",
        "admin screens",
        "creator screens",
        "user screens"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/mobile-loading-hydration-stability.generated.json",
        "docs/agent-truth/mobile-loading-hydration-stability.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-mobile-loading-hydration-stability.ts",
        "src/app/admin/analytics/loading.tsx",
        "src/app/admin/queue/page.tsx",
        "src/app/dashboard/DashboardClient.tsx",
        "src/app/dashboard/library/LibraryClient.tsx",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/ui/loading-state-contract.ts",
        "tests/unit/mobile-loading-hydration-stability.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.19",
      "previousVersion": "1.3.18",
      "betaReleaseCounter": 319,
      "previousBetaReleaseCounter": 318,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(ui): reduce mobile layout sprawl",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T23:56:06.022Z",
      "generatedAt": "2026-05-19T23:56:06.022Z",
      "committedAtUtc": "2026-05-19T23:56:06.022Z",
      "generatedAtUtc": "2026-05-19T23:56:06.022Z",
      "updatedAtUtc": "2026-05-19T23:56:06.022Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Reduced oversized mobile layouts across admin, user, and creator screens.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reduced oversized mobile layouts across admin, user, and creator screens.",
        "Replaced desktop-scale spacing with compact mobile density rules.",
        "Kept navigation and chat surfaces unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted mobile layout sprawl cleanup pass into this public beta note."
      ],
      "affectedSurfaces": [
        "mobile UI",
        "admin screens",
        "creator screens",
        "user screens"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/mobile-hardcoded-css-cleanup.generated.json",
        "agent/state/mobile-ui-scaling-doctrine.generated.json",
        "docs/agent-truth/mobile-hardcoded-css-cleanup.md",
        "docs/agent-truth/mobile-ui-scaling-doctrine.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-mobile-hardcoded-css-cleanup.ts",
        "src/app/admin/queue/page.tsx",
        "src/app/dashboard/DashboardClient.tsx",
        "src/app/dashboard/library/LibraryClient.tsx",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/mobile-hardcoded-css-cleanup.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.18",
      "previousVersion": "1.3.17",
      "betaReleaseCounter": 318,
      "previousBetaReleaseCounter": 317,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(ui): add mobile scaling doctrine",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T23:50:00.000Z",
      "generatedAt": "2026-05-19T23:50:00.000Z",
      "committedAtUtc": "2026-05-19T23:50:00.000Z",
      "generatedAtUtc": "2026-05-19T23:50:00.000Z",
      "updatedAtUtc": "2026-05-19T23:50:00.000Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Added mobile-first scaling doctrine and shared density guidance for future UI cleanup.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added mobile-first UI scaling rules.",
        "Prepared shared density and skeleton guidance for admin, user, and creator screens.",
        "Protected navigation and chat surfaces from broad UI cleanup."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted mobile UI scaling doctrine foundation pass into this public beta note."
      ],
      "affectedSurfaces": [
        "mobile UI",
        "admin screens",
        "creator screens",
        "user screens"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/mobile-ui-scaling-doctrine.generated.json",
        "docs/agent-truth/mobile-ui-scaling-doctrine.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-mobile-ui-scaling-doctrine.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/ui/mobile-scale-contract.ts",
        "tests/unit/mobile-ui-scaling-doctrine.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.17",
      "previousVersion": "1.3.16",
      "betaReleaseCounter": 317,
      "previousBetaReleaseCounter": 316,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(analytics): lock telemetry closure",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T23:59:00.000Z",
      "generatedAt": "2026-05-19T23:59:00.000Z",
      "committedAtUtc": "2026-05-19T23:59:00.000Z",
      "generatedAtUtc": "2026-05-19T23:59:00.000Z",
      "updatedAtUtc": "2026-05-19T23:59:00.000Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Locked telemetry dependency closure status while keeping beta evidence requirements separate from source readiness.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked telemetry dependency closure status.",
        "Mapped analytics from client tracking through admin evidence.",
        "Kept beta evidence requirements separate from source readiness."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted final telemetry closure lock into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "admin evidence",
        "beta readiness"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/final-telemetry-closure-lock.generated.json",
        "docs/agent-truth/final-telemetry-closure-lock.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-final-telemetry-closure-lock.ts",
        "scripts/agent/validate-overnight-beta-readiness-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/final-telemetry-closure-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.16",
      "previousVersion": "1.3.15",
      "betaReleaseCounter": 316,
      "previousBetaReleaseCounter": 315,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(admin): simplify telemetry truth",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T23:20:00.000Z",
      "generatedAt": "2026-05-19T23:20:00.000Z",
      "committedAtUtc": "2026-05-19T23:20:00.000Z",
      "generatedAtUtc": "2026-05-19T23:20:00.000Z",
      "updatedAtUtc": "2026-05-19T23:20:00.000Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Simplified Admin Debug telemetry health reporting while keeping raw telemetry details behind drilldowns.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Simplified admin telemetry health reporting.",
        "Separated live, degraded, unavailable, and unproven analytics lanes.",
        "Kept raw telemetry details behind debug drilldowns."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted admin telemetry truth simplification into this public beta note."
      ],
      "affectedSurfaces": [
        "admin debug",
        "admin analytics",
        "telemetry"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/telemetry-admin-debug-truth.generated.json",
        "docs/agent-truth/telemetry-admin-debug-truth.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-telemetry-admin-debug-truth.ts",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/app/admin/debug/components/DebugTelemetryHealthSummary.tsx",
        "src/app/api/admin/debug/route.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "src/lib/server/admin-telemetry-health.ts",
        "tests/unit/telemetry-admin-debug-truth.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.15",
      "previousVersion": "1.3.14",
      "betaReleaseCounter": 315,
      "previousBetaReleaseCounter": 314,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): close external analytics truth",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T23:00:23.317Z",
      "generatedAt": "2026-05-19T23:00:23.317Z",
      "committedAtUtc": "2026-05-19T23:00:23.317Z",
      "generatedAtUtc": "2026-05-19T23:00:23.317Z",
      "updatedAtUtc": "2026-05-19T23:00:23.317Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Closed Google Analytics and external analytics evidence ambiguity while keeping first-party analytics as product truth.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Closed Google Analytics evidence ambiguity.",
        "Kept external analytics separate from product truth.",
        "Prevented missing external analytics from showing as zero traffic."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted external analytics truth closure fix into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "admin analytics",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/external-analytics-truth-closure.generated.json",
        "docs/agent-truth/external-analytics-truth-closure.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-external-analytics-truth-closure.ts",
        "src/lib/analytics/external-analytics-truth.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/external-analytics-truth-closure.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.14",
      "previousVersion": "1.3.13",
      "betaReleaseCounter": 314,
      "previousBetaReleaseCounter": 313,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): close bigquery export pipeline",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T22:49:48.551Z",
      "generatedAt": "2026-05-19T22:49:48.551Z",
      "committedAtUtc": "2026-05-19T22:49:48.551Z",
      "generatedAtUtc": "2026-05-19T22:49:48.551Z",
      "updatedAtUtc": "2026-05-19T22:49:48.551Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Clarified BigQuery export readiness while keeping analytics exports batched, bounded, and evidence-based.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Clarified BigQuery export readiness.",
        "Kept analytics exports batched, bounded, and evidence-based.",
        "Prevented missing BigQuery from showing as zero activity."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted BigQuery export and cloud pipeline truth fix into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "admin analytics",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "functions/src/analytics-bigquery-export.ts",
        "functions/src/index.ts",
        "package.json",
        "agent/state/bigquery-cloud-pipeline-closure.generated.json",
        "docs/agent-truth/bigquery-cloud-pipeline-closure.md",
        "scripts/agent/validate-bigquery-cloud-pipeline-closure.ts",
        "src/lib/analytics/bigquery-export-contract.ts",
        "tests/unit/bigquery-cloud-pipeline-closure.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.13",
      "previousVersion": "1.3.12",
      "betaReleaseCounter": 313,
      "previousBetaReleaseCounter": 312,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): close event fact materializers",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T22:38:43.178Z",
      "generatedAt": "2026-05-19T22:38:43.178Z",
      "committedAtUtc": "2026-05-19T22:38:43.178Z",
      "generatedAtUtc": "2026-05-19T22:38:43.178Z",
      "updatedAtUtc": "2026-05-19T22:38:43.178Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Closed telemetry materialization gaps by mapping Firestore analytics records into event facts, summaries, and legacy archive lanes.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Closed telemetry materialization gaps.",
        "Mapped Firestore analytics records to event facts and summaries.",
        "Separated legacy analytics from current truth."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted Firestore event facts and materializer closure fix into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "admin analytics",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/event-facts-materializer-closure.generated.json",
        "docs/agent-truth/event-facts-materializer-closure.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-event-facts-materializer-closure.ts",
        "src/lib/analytics/materialization-contract.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/event-facts-materializer-closure.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.12",
      "previousVersion": "1.3.11",
      "betaReleaseCounter": 312,
      "previousBetaReleaseCounter": 311,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): close behavior tracking semantics",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T22:26:12.428Z",
      "generatedAt": "2026-05-19T22:26:12.428Z",
      "committedAtUtc": "2026-05-19T22:26:12.428Z",
      "generatedAtUtc": "2026-05-19T22:26:12.428Z",
      "updatedAtUtc": "2026-05-19T22:26:12.428Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Closed behavior tracking event gaps while keeping watch time separate from passive page activity.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Closed behavior tracking event gaps.",
        "Aligned behavior telemetry with tracking toggles.",
        "Kept watch time separate from passive page activity."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted behavioral tracking semantics and toggle coverage fix into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/behavioral-tracking-semantics-closure.generated.json",
        "docs/agent-truth/behavioral-tracking-semantics-closure.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-behavioral-tracking-semantics-closure.ts",
        "src/components/Analytics/DeepTracker.tsx",
        "src/lib/analytics/client-tracking-policy.ts",
        "src/lib/behavioral/tracking-surface-map.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/telemetry.ts",
        "tests/unit/behavioral-tracking-semantics-closure.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.11",
      "previousVersion": "1.3.10",
      "betaReleaseCounter": 311,
      "previousBetaReleaseCounter": 310,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): close identity transfer telemetry",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T22:10:08.039Z",
      "generatedAt": "2026-05-19T22:10:08.039Z",
      "committedAtUtc": "2026-05-19T22:10:08.039Z",
      "generatedAtUtc": "2026-05-19T22:10:08.039Z",
      "updatedAtUtc": "2026-05-19T22:10:08.039Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Closed guest-to-user telemetry continuity gaps and linked-user counting rules.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Closed guest-to-user telemetry transfer gaps.",
        "Improved individual user tracking continuity.",
        "Prevented linked guest history from double-counting users."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted identity transfer telemetry closure fix into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/identity-transfer-telemetry-closure.generated.json",
        "docs/agent-truth/identity-transfer-telemetry-closure.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-identity-transfer-telemetry-closure.ts",
        "src/app/api/analytics/ingest-identified/route.ts",
        "src/lib/analytics/analytics-event-contract.ts",
        "src/lib/analytics/analytics-identity-link.ts",
        "src/lib/analytics/identity-transfer.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/analytics-identity-linking.ts",
        "tests/unit/identity-transfer-telemetry-closure.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.10",
      "previousVersion": "1.3.9",
      "betaReleaseCounter": 310,
      "previousBetaReleaseCounter": 309,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): harden ingest firestore path",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T21:57:13.630Z",
      "generatedAt": "2026-05-19T21:57:13.630Z",
      "committedAtUtc": "2026-05-19T21:57:13.630Z",
      "generatedAtUtc": "2026-05-19T21:57:13.630Z",
      "updatedAtUtc": "2026-05-19T21:57:13.630Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Hardened analytics ingest contracts and clarified telemetry Firestore destinations.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Hardened analytics ingest event contracts.",
        "Clarified Firestore write destinations for telemetry.",
        "Reduced retry and diagnostic noise for invalid analytics payloads."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted analytics ingest and Firestore write path fix into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/analytics-ingest-firestore-closure.generated.json",
        "docs/agent-truth/analytics-ingest-firestore-closure.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-analytics-ingest-firestore-closure.ts",
        "src/app/api/analytics/ingest/route.ts",
        "src/lib/analytics/ingest-contract.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/analytics-ingest-firestore-closure.spec.ts",
        "tests/unit/analytics-ingest-route.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.9",
      "previousVersion": "1.3.8",
      "betaReleaseCounter": 309,
      "previousBetaReleaseCounter": 308,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): close telemetry dependency graph",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T20:49:14.070Z",
      "generatedAt": "2026-05-19T20:49:14.070Z",
      "committedAtUtc": "2026-05-19T20:49:14.070Z",
      "generatedAtUtc": "2026-05-19T20:49:14.070Z",
      "updatedAtUtc": "2026-05-19T20:49:14.070Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Mapped telemetry dependencies from client events through analytics evidence and exports.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Mapped telemetry dependencies from client events to analytics evidence.",
        "Closed broken telemetry lanes and stale tracking claims.",
        "Kept product truth separate from debug and external evidence."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted telemetry dependency graph and route closure fix into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "admin analytics",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/telemetry-dependency-graph.generated.json",
        "docs/agent-truth/telemetry-dependency-graph.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-telemetry-dependency-graph.ts",
        "src/lib/analytics/telemetry-dependency-graph.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/telemetry-dependency-graph.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.8",
      "previousVersion": "1.3.7",
      "betaReleaseCounter": 308,
      "previousBetaReleaseCounter": 307,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): clarify ga4 evidence truth",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T20:37:09.392Z",
      "generatedAt": "2026-05-19T20:37:09.392Z",
      "committedAtUtc": "2026-05-19T20:37:09.392Z",
      "generatedAtUtc": "2026-05-19T20:37:09.392Z",
      "updatedAtUtc": "2026-05-19T20:37:09.392Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Clarified Google Analytics evidence status while keeping KandyDrops analytics truth separate.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Clarified Google Analytics evidence status.",
        "Kept first-party analytics as product truth.",
        "Prevented missing GA4 data from showing as zero traffic."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted GA4 recovery and analytics fallback truth fix into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "admin analytics",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/ga4-recovery-truth.generated.json",
        "docs/agent-truth/ga4-recovery-truth.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-ga4-recovery-truth.ts",
        "src/app/api/admin/analytics/historical/route.ts",
        "src/app/layout.tsx",
        "src/components/Analytics/Ga4EvidenceTracker.tsx",
        "src/lib/analytics/ga4-truth.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-data.ts",
        "src/lib/server/admin-analytics/ga4-evidence.ts",
        "tests/unit/ga4-recovery-truth.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.7",
      "previousVersion": "1.3.6",
      "betaReleaseCounter": 307,
      "previousBetaReleaseCounter": 306,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(admin): split analytics monoliths",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T20:20:38.232Z",
      "generatedAt": "2026-05-19T20:20:38.232Z",
      "committedAtUtc": "2026-05-19T20:20:38.232Z",
      "generatedAtUtc": "2026-05-19T20:20:38.232Z",
      "updatedAtUtc": "2026-05-19T20:20:38.232Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Split admin analytics and debug logic while keeping unavailable analytics clearly labeled.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Split large Admin Analytics and Debug logic into focused modules.",
        "Removed or deferred unnecessary admin analytics work.",
        "Classified GA4 as configured, missing, or evidence-only instead of guessing."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted admin analytics cleanup into this public beta note."
      ],
      "affectedSurfaces": [
        "admin analytics",
        "admin debug",
        "app reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-analytics-monolith-cleanup.generated.json",
        "docs/agent-truth/admin-analytics-monolith-cleanup.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-analytics-monolith-cleanup.ts",
        "src/app/api/admin/debug/route.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-data.ts",
        "src/lib/server/admin-analytics/ga4-evidence.ts",
        "src/lib/server/admin-debug/summary.ts",
        "src/lib/server/admin-debug/truth-state.ts",
        "tests/unit/admin-analytics-monolith-cleanup.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.6",
      "previousVersion": "1.3.5",
      "betaReleaseCounter": 306,
      "previousBetaReleaseCounter": 305,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(dashboard): clean user creator logic",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T20:05:36.000Z",
      "generatedAt": "2026-05-19T20:05:36.000Z",
      "committedAtUtc": "2026-05-19T20:05:36.000Z",
      "generatedAtUtc": "2026-05-19T20:05:36.000Z",
      "updatedAtUtc": "2026-05-19T20:05:36.000Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Cleaned up creator and user dashboard routing and stale dashboard logic.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Navigation",
      "bullets": [
        "Cleaned up creator and user dashboard logic.",
        "Consolidated creator navigation and dashboard surface rules.",
        "Reduced stale duplicated dashboard logic."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted user/creator dashboard logic cleanup into this public beta note."
      ],
      "affectedSurfaces": [
        "creator dashboard",
        "user dashboard",
        "navigation",
        "release notes"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/user-creator-logic-cleanup.generated.json",
        "docs/agent-truth/user-creator-logic-cleanup.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-user-creator-logic-cleanup.ts",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/components/Dashboard/creator-workspace/CreatorActionQueuePanel.tsx",
        "src/components/Dashboard/creator-workspace/CreatorBroadcastCard.tsx",
        "src/components/Dashboard/creator-workspace/CreatorDashboardOverviewModule.tsx",
        "src/components/Dashboard/creator-workspace/CreatorDashboardQuickActions.tsx",
        "src/components/Dashboard/creator-workspace/CreatorDashboardSourceNotice.tsx",
        "src/components/Dashboard/creator-workspace/CreatorFanPassCrmPanel.tsx",
        "src/components/Dashboard/creator-workspace/types.ts",
        "src/lib/creator-profile-routing.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/user-creator-logic-cleanup.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.5",
      "previousVersion": "1.3.4",
      "betaReleaseCounter": 305,
      "previousBetaReleaseCounter": 304,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(creator): refine drop manager mobile ux",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T19:41:55.000Z",
      "generatedAt": "2026-05-19T19:41:55.000Z",
      "committedAtUtc": "2026-05-19T19:41:55.000Z",
      "generatedAtUtc": "2026-05-19T19:41:55.000Z",
      "updatedAtUtc": "2026-05-19T19:41:55.000Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Refined the Creator Drop Manager mobile flow with clearer review actions and compact layout.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Refined Creator Drop Manager for mobile.",
        "Clarified submit-for-review flow for creator drops.",
        "Kept creator drop management separate from My KandyDrops."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator drop manager mobile refinement into this public beta note."
      ],
      "affectedSurfaces": [
        "creator drop manager",
        "creator dashboard",
        "admin drop form",
        "release notes"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-drop-manager-mobile-refinement.generated.json",
        "docs/agent-truth/creator-drop-manager-mobile-refinement.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-drop-manager-mobile-refinement.ts",
        "src/app/dashboard/creator/drops/page.tsx",
        "src/components/Admin/CreateDropModal.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-drop-management-approval.spec.ts",
        "tests/unit/creator-drop-manager-mobile-refinement.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.4",
      "previousVersion": "1.3.3",
      "betaReleaseCounter": 304,
      "previousBetaReleaseCounter": 303,
      "commitSha": "pending-same-commit",
      "commitTitle": "feat(creator): add drop submissions for approval",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T19:26:54.000Z",
      "generatedAt": "2026-05-19T19:26:54.000Z",
      "committedAtUtc": "2026-05-19T19:26:54.000Z",
      "generatedAtUtc": "2026-05-19T19:26:54.000Z",
      "updatedAtUtc": "2026-05-19T19:26:54.000Z",
      "category": "New",
      "title": "Bug fixes and general improvements",
      "summary": "Added a creator drop management lane for admin-reviewed Drop submissions.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Added a creator drop management lane separate from My KandyDrops.",
        "Let creators submit drops for admin approval.",
        "Kept pending creator submissions out of public rotation until approved."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator drop management approval update into this public beta note."
      ],
      "affectedSurfaces": [
        "creator dashboard",
        "creator drop manager",
        "admin drops",
        "release notes"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-drop-management-approval.generated.json",
        "docs/agent-truth/creator-drop-management-approval.md",
        "docs/agent-truth/creator-dashboard-role-boundary.md",
        "docs/agent-truth/creator-surface-routing.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-drop-management-approval.ts",
        "scripts/agent/validate-creator-dashboard-role-boundary.ts",
        "scripts/agent/validate-creator-surface-routing.ts",
        "scripts/agent/validate-security-role-boundaries.ts",
        "scripts/agent/validate-user-creator-ui-parity.ts",
        "src/app/api/admin/drops/route.ts",
        "src/app/api/creator/drops/route.ts",
        "src/app/dashboard/creator/drops/page.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/lib/creator-profile-routing.ts",
        "src/lib/drops/drop-form-contract.ts",
        "src/lib/drops/drop-submission-contract.ts",
        "src/lib/drop-normalizers.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/creator-drop-scope.ts",
        "src/lib/telemetry-catalog.ts",
        "src/types/db.ts",
        "tests/unit/creator-dashboard-role-boundary.spec.ts",
        "tests/unit/creator-drop-management-approval.spec.ts",
        "tests/unit/creator-surface-routing.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.3",
      "previousVersion": "1.3.2",
      "betaReleaseCounter": 303,
      "previousBetaReleaseCounter": 302,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(creator): tighten overview grid and follower labeling",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T19:05:00.000Z",
      "generatedAt": "2026-05-19T19:05:00.000Z",
      "committedAtUtc": "2026-05-19T19:05:00.000Z",
      "generatedAtUtc": "2026-05-19T19:05:00.000Z",
      "updatedAtUtc": "2026-05-19T19:05:00.000Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Refined the Creator Dashboard mobile overview layout and follower metric labeling.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Refined creator dashboard mobile overview layout.",
        "Changed creator overview Fans label to Followers.",
        "Reduced creator overview grid density for a more compact mobile fit."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator dashboard mobile overview polish into this public beta note."
      ],
      "affectedSurfaces": [
        "creator dashboard",
        "creator overview",
        "mobile layout",
        "release notes"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-dashboard-overview-stats.generated.json",
        "agent/state/creator-fan-pass-crm-broadcast.generated.json",
        "agent/state/creator-landing-dashboard-mobile.generated.json",
        "docs/agent-truth/creator-dashboard-overview-stats.md",
        "docs/agent-truth/creator-fan-pass-crm-broadcast.md",
        "docs/agent-truth/creator-landing-dashboard-mobile.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-dashboard-overview-stats.ts",
        "scripts/agent/validate-creator-fan-pass-crm-broadcast.ts",
        "scripts/agent/validate-creator-landing-dashboard-mobile.ts",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-dashboard-overview-stats.spec.ts",
        "tests/unit/creator-landing-dashboard-mobile.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.2",
      "previousVersion": "1.3.1",
      "betaReleaseCounter": 302,
      "previousBetaReleaseCounter": 301,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): translate freshness jargon",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T18:40:00.000Z",
      "generatedAt": "2026-05-19T18:40:00.000Z",
      "committedAtUtc": "2026-05-19T18:40:00.000Z",
      "generatedAtUtc": "2026-05-19T18:40:00.000Z",
      "updatedAtUtc": "2026-05-19T18:40:00.000Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Made Beta readiness freshness messages clearer while preserving strict internal freshness checks.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Made Beta readiness freshness messages easier to understand.",
        "Replaced Git jargon with plain refresh guidance.",
        "Kept internal freshness checks strict while improving operator copy."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted beta freshness language cleanup into this public beta note."
      ],
      "affectedSurfaces": [
        "beta readiness",
        "evidence freshness",
        "operator reports",
        "release notes"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/beta-evidence-gap-map.generated.json",
        "agent/state/beta-freshness-language.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/evidence-capture-status.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/beta-evidence-gap-map.md",
        "docs/agent-truth/beta-freshness-language.md",
        "docs/agent-truth/current-beta-exit-status.md",
        "docs/agent-truth/evidence-capture-status.md",
        "docs/agent-truth/public-beta-score.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-beta-evidence-gap-map.ts",
        "scripts/agent/validate-beta-freshness-language.ts",
        "scripts/agent/validate-evidence-capture-status.ts",
        "scripts/agent/validate-overnight-beta-readiness-lock.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/agent-score/evidence-quality.ts",
        "src/lib/agent-score/freshness-actions.ts",
        "src/lib/agent-score/freshness-language.ts",
        "src/lib/agent-score/reporting.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/beta-freshness-language.spec.ts",
        "tests/unit/beta-health-algorithm-v2.spec.ts",
        "tests/unit/current-beta-exit-status.spec.ts",
        "tests/unit/public-beta-score-v2.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.1",
      "previousVersion": "1.3.0",
      "betaReleaseCounter": 301,
      "previousBetaReleaseCounter": 300,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): refresh evidence gap map",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T18:15:00.000Z",
      "generatedAt": "2026-05-19T18:15:00.000Z",
      "committedAtUtc": "2026-05-19T18:15:00.000Z",
      "generatedAtUtc": "2026-05-19T18:15:00.000Z",
      "updatedAtUtc": "2026-05-19T18:15:00.000Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Refreshed Beta readiness from the latest source state and mapped the remaining evidence gaps.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Refreshed Beta readiness from the latest source state.",
        "Mapped remaining Beta evidence gaps with exact next steps.",
        "Kept revenue, runtime, and admin proof separate from source-only checks."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted beta evidence truth-refresh pass into this public beta note."
      ],
      "affectedSurfaces": [
        "beta readiness",
        "evidence capture",
        "source truth",
        "release notes"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/beta-evidence-gap-map.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/evidence-capture-status.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/source-truth-authority-map.generated.json",
        "docs/agent-truth/beta-evidence-gap-map.md",
        "docs/agent-truth/current-beta-exit-status.md",
        "docs/agent-truth/evidence-capture-status.md",
        "docs/agent-truth/public-beta-score.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-beta-evidence-gap-map.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/beta-evidence-gap-map.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.0",
      "previousVersion": "1.2.99",
      "betaReleaseCounter": 300,
      "previousBetaReleaseCounter": 299,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): refine health scoring algorithm",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T17:55:00.000Z",
      "generatedAt": "2026-05-19T17:55:00.000Z",
      "committedAtUtc": "2026-05-19T17:55:00.000Z",
      "generatedAtUtc": "2026-05-19T17:55:00.000Z",
      "updatedAtUtc": "2026-05-19T17:55:00.000Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Refined Beta health scoring beyond hard pass/fail gates while keeping formal launch proof required.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Refined Beta health scoring beyond hard pass/fail gates.",
        "Separated source readiness, runtime proof, evidence freshness, and cost risk.",
        "Kept formal beta exit gates intact while improving score nuance."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted beta health scoring refactor into this public beta note."
      ],
      "affectedSurfaces": [
        "beta readiness",
        "evidence scoring",
        "cost readiness",
        "admin reports"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/beta-health-algorithm-v2.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/beta-health-algorithm-v2.md",
        "docs/agent-truth/current-beta-exit-status.md",
        "docs/agent-truth/public-beta-score.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-beta-health-algorithm-v2.ts",
        "scripts/agent/validate-current-beta-exit-status.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/agent-score/evidence-quality.ts",
        "src/lib/agent-score/reporting.ts",
        "src/lib/agent-score/weights.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/beta-health-algorithm-v2.spec.ts",
        "tests/unit/current-beta-exit-status.spec.ts",
        "tests/unit/public-beta-score-v2.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.2.99",
      "previousVersion": "1.2.98",
      "betaReleaseCounter": 299,
      "previousBetaReleaseCounter": 298,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(creator): consolidate nav and role boundaries",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T16:57:10.000Z",
      "generatedAt": "2026-05-19T16:57:10.000Z",
      "committedAtUtc": "2026-05-19T16:57:10.000Z",
      "generatedAtUtc": "2026-05-19T16:57:10.000Z",
      "updatedAtUtc": "2026-05-19T16:57:10.000Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Cleaned up Creator Dashboard navigation, role boundaries, Fan Pass CRM identity, and broadcast audience behavior.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Cleaned up Creator Dashboard and Creator Settings navigation.",
        "Removed stale creator/user dashboard stacking rules.",
        "Locked readable Fan Pass CRM and broadcast audience behavior."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator navigation and role-boundary consolidation fix into this public beta note."
      ],
      "affectedSurfaces": [
        "creator dashboard",
        "creator settings",
        "account navigation",
        "fan pass",
        "creator broadcasts"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-nav-role-consolidation.generated.json",
        "docs/agent-truth/creator-nav-role-consolidation.md",
        "docs/agent-truth/creator-surface-routing.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-dashboard-role-boundary.ts",
        "scripts/agent/validate-creator-nav-role-consolidation.ts",
        "scripts/agent/validate-creator-surface-routing.ts",
        "src/app/dashboard/profile/components/ProfileCreatorToolsSection.tsx",
        "src/app/dashboard/profile/hooks/useProfileState.tsx",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/components/Navigation/ProfileDropdown.tsx",
        "src/components/Navigation/ProfileSidebar.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-dashboard-role-boundary.spec.ts",
        "tests/unit/creator-nav-role-consolidation.spec.ts",
        "tests/unit/creator-surface-routing.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
