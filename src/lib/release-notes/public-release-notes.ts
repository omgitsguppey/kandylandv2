import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.3.37",
  "betaReleaseCounter": 337,
  "channel": "beta",
  "generatedAt": "2026-05-20T22:03:14.706Z",
  "generatedAtUtc": "2026-05-20T22:03:14.706Z",
  "lastCommitSha": "pending-same-commit",
  "notes": [
    {
      "version": "1.3.37",
      "previousVersion": "1.3.36",
      "betaReleaseCounter": 337,
      "previousBetaReleaseCounter": 336,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): lock morning cleanup status",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T22:03:14.706Z",
      "generatedAt": "2026-05-20T22:03:14.706Z",
      "committedAtUtc": "2026-05-20T22:03:14.706Z",
      "generatedAtUtc": "2026-05-20T22:03:14.706Z",
      "updatedAtUtc": "2026-05-20T22:03:14.706Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Locked beta cleanup status after stale artifact and evidence refresh safeguards.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked beta cleanup status after stale artifact and evidence refresh safeguards.",
        "Recorded operator-confirmed GumDrop revenue smoke honestly.",
        "Kept formal beta evidence gates clear and current."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted final morning beta cleanup lock into this public beta note."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "Evidence capture",
        "Generated reports"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/final-morning-beta-lock.generated.json",
        "docs/agent-truth/final-morning-beta-lock.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-final-morning-beta-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/final-morning-beta-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.36",
      "previousVersion": "1.3.35",
      "betaReleaseCounter": 336,
      "previousBetaReleaseCounter": 335,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): prepare evidence lanes",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T21:52:05.083Z",
      "generatedAt": "2026-05-20T21:52:05.083Z",
      "committedAtUtc": "2026-05-20T21:52:05.083Z",
      "generatedAtUtc": "2026-05-20T21:52:05.083Z",
      "updatedAtUtc": "2026-05-20T21:52:05.083Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Prepared beta evidence lanes with clearer statuses and next steps.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Prepared beta evidence lanes with clearer statuses and next steps.",
        "Recognized operator-confirmed revenue without faking provider proof.",
        "Kept beta exit gates strict and understandable."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted beta evidence lane prep pass into this public beta note."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "Evidence capture",
        "Operator revenue smoke"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/beta-evidence-lane-prep.generated.json",
        "agent/state/evidence-capture-status.generated.json",
        "agent/state/operator-revenue-smoke.generated.json",
        "agent/state/beta-evidence-gap-map.generated.json",
        "agent/state/refresh-safeguards.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "docs/agent-truth/beta-evidence-lane-prep.md",
        "docs/agent-truth/evidence-capture-status.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-beta-evidence-lane-prep.ts",
        "scripts/agent/validate-evidence-capture-status.ts",
        "scripts/agent/validate-overnight-beta-readiness-lock.ts",
        "src/lib/agent-score/refresh-registry.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/beta-evidence-lane-prep.spec.ts",
        "tests/unit/refresh-safeguards.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.35",
      "previousVersion": "1.3.34",
      "betaReleaseCounter": 335,
      "previousBetaReleaseCounter": 334,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): harden refresh safeguards",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T21:38:53.783Z",
      "generatedAt": "2026-05-20T21:38:53.783Z",
      "committedAtUtc": "2026-05-20T21:38:53.783Z",
      "generatedAtUtc": "2026-05-20T21:38:53.783Z",
      "updatedAtUtc": "2026-05-20T21:38:53.783Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Added safeguards for stale beta and evidence reports.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added safeguards for stale beta and evidence reports.",
        "Mapped generated reports to exact refresh commands.",
        "Kept freshness messages plain and actionable."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted beta refresh safeguards pass into this public beta note."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "Evidence capture",
        "Generated reports"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/refresh-safeguards.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/evidence-capture-status.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/overnight-beta-readiness-lock.generated.json",
        "docs/agent-truth/refresh-safeguards.md",
        "docs/agent-truth/evidence-capture-status.md",
        "docs/agent-truth/current-beta-exit-status.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-refresh-safeguards.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "scripts/agent/validate-evidence-capture-status.ts",
        "scripts/agent/validate-current-beta-exit-status.ts",
        "scripts/agent/validate-overnight-beta-readiness-lock.ts",
        "scripts/agent/score-public-beta-readiness.ts",
        "src/lib/agent-score/refresh-registry.ts",
        "src/lib/agent-score/refresh-safeguards.ts",
        "src/lib/agent-score/freshness-actions.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/refresh-safeguards.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.34",
      "previousVersion": "1.3.33",
      "betaReleaseCounter": 334,
      "previousBetaReleaseCounter": 333,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): record operator revenue smoke",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T21:16:38.703Z",
      "generatedAt": "2026-05-20T21:16:38.703Z",
      "committedAtUtc": "2026-05-20T21:16:38.703Z",
      "generatedAtUtc": "2026-05-20T21:16:38.703Z",
      "updatedAtUtc": "2026-05-20T21:16:38.703Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Recorded operator-confirmed GumDrop revenue smoke.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Recorded operator-confirmed GumDrop revenue smoke.",
        "Separated real-world payment confirmation from formal provider evidence.",
        "Kept beta exit gates honest while preserving product signal."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted operator-confirmed revenue smoke evidence pass into this public beta note."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "Wallet evidence",
        "GumDrop revenue smoke"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/operator-revenue-smoke.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/evidence-capture-status.generated.json",
        "agent/state/beta-evidence-gap-map.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/operator-revenue-smoke.md",
        "docs/agent-truth/current-beta-exit-status.md",
        "docs/agent-truth/evidence-capture-status.md",
        "docs/agent-truth/beta-evidence-gap-map.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-operator-revenue-smoke.ts",
        "scripts/agent/validate-current-beta-exit-status.ts",
        "scripts/agent/validate-evidence-capture-status.ts",
        "scripts/agent/validate-beta-evidence-gap-map.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "scripts/agent/score-public-beta-readiness.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/operator-revenue-smoke.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.33",
      "previousVersion": "1.3.32",
      "betaReleaseCounter": 333,
      "previousBetaReleaseCounter": 332,
      "commitSha": "pending-same-commit",
      "commitTitle": "chore(repo): close stale pr cleanup",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T21:02:09.979Z",
      "generatedAt": "2026-05-20T21:02:09.979Z",
      "committedAtUtc": "2026-05-20T21:02:09.979Z",
      "generatedAtUtc": "2026-05-20T21:02:09.979Z",
      "updatedAtUtc": "2026-05-20T21:02:09.979Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Cleaned up remaining preserved PRs and stale repo artifacts.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Cleaned up remaining preserved PRs and stale repo artifacts.",
        "Kept beta cleanup lanes free of superseded PR clutter.",
        "Preserved current source-truth doctrine while closing stale work."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted PR closure and stale artifact cleanup pass into this public beta note."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "admin analytics",
        "repo cleanup",
        "accessibility"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/final-pr-stale-cleanup.generated.json",
        "docs/agent-truth/final-pr-stale-cleanup.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-final-pr-stale-cleanup.ts",
        "src/components/ui/Button.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-historical-engagement.ts",
        "tests/unit/final-pr-stale-cleanup.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.32",
      "previousVersion": "1.3.31",
      "betaReleaseCounter": 332,
      "previousBetaReleaseCounter": 331,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): lock overnight integration cleanup",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T06:37:26.045Z",
      "generatedAt": "2026-05-20T06:37:26.045Z",
      "committedAtUtc": "2026-05-20T06:37:26.045Z",
      "generatedAtUtc": "2026-05-20T06:37:26.045Z",
      "updatedAtUtc": "2026-05-20T06:37:26.045Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Locked overnight wiring, telemetry, and mobile scale cleanup.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked overnight wiring, telemetry, and mobile scale cleanup.",
        "Verified creator drop statuses and wallet mobile density where available.",
        "Kept chat and navigation unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted overnight final integration lock into this public beta note."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "creator tools",
        "wallet",
        "mobile UI",
        "telemetry"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/overnight-final-integration-lock.generated.json",
        "docs/agent-truth/overnight-final-integration-lock.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-overnight-final-integration-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/overnight-final-integration-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.31",
      "previousVersion": "1.3.30",
      "betaReleaseCounter": 331,
      "previousBetaReleaseCounter": 330,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(creator): show drop status metrics",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T06:19:43.984Z",
      "generatedAt": "2026-05-20T06:19:43.984Z",
      "committedAtUtc": "2026-05-20T06:19:43.984Z",
      "generatedAtUtc": "2026-05-20T06:19:43.984Z",
      "updatedAtUtc": "2026-05-20T06:19:43.984Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Added creator-facing drop status and expiry labels.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Added creator-facing drop status and expiry labels.",
        "Showed drop views, clicks, and unwraps inline when available.",
        "Kept admin-only drop controls hidden from creators."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator drop status and inline metrics pass into this public beta note."
      ],
      "affectedSurfaces": [
        "creator drop manager",
        "creator dashboard",
        "Drops",
        "creator metrics"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-drop-management-approval.generated.json",
        "agent/state/creator-drop-manager-mobile-refinement.generated.json",
        "agent/state/creator-drop-status-metrics.generated.json",
        "agent/state/event-facts-materializer-closure.generated.json",
        "docs/agent-truth/creator-drop-management-approval.md",
        "docs/agent-truth/creator-drop-status-metrics.md",
        "docs/agent-truth/event-facts-materializer-closure.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-drop-management-approval.ts",
        "scripts/agent/validate-creator-drop-status-metrics.ts",
        "src/app/api/creator/drops/route.ts",
        "src/components/Creators/CreatorDropManager.tsx",
        "src/lib/drops/drop-metrics-resolver.ts",
        "src/lib/drops/drop-status-resolver.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-drop-status-metrics.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.30",
      "previousVersion": "1.3.29",
      "betaReleaseCounter": 330,
      "previousBetaReleaseCounter": 329,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(ui): refine user loading and wallet mobile scale",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T06:06:29.425Z",
      "generatedAt": "2026-05-20T06:06:29.425Z",
      "committedAtUtc": "2026-05-20T06:06:29.425Z",
      "generatedAtUtc": "2026-05-20T06:06:29.425Z",
      "updatedAtUtc": "2026-05-20T06:06:29.425Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Improved user dashboard and wallet loading on mobile.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Wallet",
      "bullets": [
        "Improved user dashboard and wallet loading on mobile.",
        "Reduced wallet module scale without changing payment logic.",
        "Kept chat and navigation unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted user loading and wallet mobile refinement pass into this public beta note."
      ],
      "affectedSurfaces": [
        "Wallet",
        "User dashboard",
        "My KandyDrops",
        "Drops loading"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/gumdrop-economy-accuracy.generated.json",
        "agent/state/mobile-loading-hydration-stability.generated.json",
        "agent/state/mobile-ui-final-lock.generated.json",
        "agent/state/user-loading-wallet-mobile-refinement.generated.json",
        "docs/agent-truth/mobile-loading-hydration-stability.md",
        "docs/agent-truth/mobile-ui-final-lock.md",
        "docs/agent-truth/user-loading-wallet-mobile-refinement.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-user-loading-wallet-mobile-refinement.ts",
        "src/app/dashboard/DashboardClient.tsx",
        "src/app/dashboard/library/LibraryClient.tsx",
        "src/app/drops/[id]/preview/loading.tsx",
        "src/app/drops/loading.tsx",
        "src/components/PurchaseModal.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/user-loading-wallet-mobile-refinement.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.29",
      "previousVersion": "1.3.28",
      "betaReleaseCounter": 329,
      "previousBetaReleaseCounter": 328,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(core): refine existing algorithms",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T05:50:28.317Z",
      "generatedAt": "2026-05-20T05:50:28.317Z",
      "committedAtUtc": "2026-05-20T05:50:28.317Z",
      "generatedAtUtc": "2026-05-20T05:50:28.317Z",
      "updatedAtUtc": "2026-05-20T05:50:28.317Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Refined existing scoring, telemetry, layout, pricing, and drop-status algorithms.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Refined existing scoring, telemetry, layout, pricing, and drop-status algorithms.",
        "Removed duplicate fallback logic instead of adding new systems.",
        "Kept chat and payment logic unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted existing algorithm refinement pass into this public beta note."
      ],
      "affectedSurfaces": [
        "Creator tools",
        "Drops",
        "Analytics",
        "Mobile UI"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/existing-algorithm-refinement.generated.json",
        "docs/agent-truth/existing-algorithm-refinement.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-existing-algorithm-refinement.ts",
        "src/lib/creator-public-pages.ts",
        "src/lib/drop-status.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/ui/mobile-scale-contract.ts",
        "tests/unit/existing-algorithm-refinement.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.28",
      "previousVersion": "1.3.27",
      "betaReleaseCounter": 328,
      "previousBetaReleaseCounter": 327,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(repo): close overnight wiring gaps",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T05:30:40.497Z",
      "generatedAt": "2026-05-20T05:30:40.497Z",
      "committedAtUtc": "2026-05-20T05:30:40.497Z",
      "generatedAtUtc": "2026-05-20T05:30:40.497Z",
      "updatedAtUtc": "2026-05-20T05:30:40.497Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Checked recent creator, UI, and telemetry wiring for stale or orphaned logic.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Checked recent creator, UI, and telemetry wiring for stale or orphaned logic.",
        "Cleaned up disconnected routes, telemetry lanes, and parity conflicts.",
        "Kept chat unchanged while tightening product surface wiring."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted overnight wiring integrity pass into this public beta note."
      ],
      "affectedSurfaces": [
        "Creator tools",
        "Admin tools",
        "Analytics",
        "My KandyDrops"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/overnight-wiring-integrity.generated.json",
        "docs/agent-truth/overnight-wiring-integrity.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-overnight-wiring-integrity.ts",
        "src/app/dashboard/viewer/ViewerClient.tsx",
        "src/components/Dashboard/DailyTasksModule.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/overnight-wiring-integrity.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.27",
      "previousVersion": "1.3.26",
      "betaReleaseCounter": 327,
      "previousBetaReleaseCounter": 326,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(ui): reuse marquee for truncated titles",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T05:15:18.773Z",
      "generatedAt": "2026-05-20T05:15:18.773Z",
      "committedAtUtc": "2026-05-20T05:15:18.773Z",
      "generatedAtUtc": "2026-05-20T05:15:18.773Z",
      "updatedAtUtc": "2026-05-20T05:15:18.773Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Reused marquee behavior for long truncated titles.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reused marquee behavior for long truncated titles.",
        "Improved readability for long creator, drop, and admin labels.",
        "Respected reduced-motion preferences for title animations."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted truncated title marquee pass into this public beta note."
      ],
      "affectedSurfaces": [
        "Drops",
        "Creator tools",
        "Admin tools",
        "My KandyDrops"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/global-marquee-truncated-titles.generated.json",
        "docs/agent-truth/global-marquee-truncated-titles.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-global-marquee-truncated-titles.ts",
        "src/app/globals.css",
        "src/components/Admin/AdminAiDescriptionOperations.tsx",
        "src/components/Admin/TopDropsTable.tsx",
        "src/components/Creators/CreatorDropManager.tsx",
        "src/components/Creators/CreatorProfileTimelineFeed.tsx",
        "src/components/Creators/FanPassSubscriberRow.tsx",
        "src/components/ui/MarqueeText.tsx",
        "src/components/ui/TitleMarquee.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/global-marquee-truncated-titles.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.26",
      "previousVersion": "1.3.25",
      "betaReleaseCounter": 326,
      "previousBetaReleaseCounter": 325,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(creator): compact profile timeline mobile",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T04:59:18.825Z",
      "generatedAt": "2026-05-20T04:59:18.825Z",
      "committedAtUtc": "2026-05-20T04:59:18.825Z",
      "generatedAtUtc": "2026-05-20T04:59:18.825Z",
      "updatedAtUtc": "2026-05-20T04:59:18.825Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Reduced creator profile header scale on mobile.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Reduced creator profile header scale on mobile.",
        "Prepared creator profiles for drop and broadcast timelines.",
        "Kept private and pending creator content hidden from public profiles."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator profile mobile timeline pass into this public beta note."
      ],
      "affectedSurfaces": [
        "creator profile",
        "creator timeline",
        "Drops",
        "creator broadcasts"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-profile-mobile-timeline.generated.json",
        "docs/agent-truth/creator-profile-mobile-timeline.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-profile-mobile-timeline.ts",
        "src/app/creators/[username]/CreatorProfileClient.tsx",
        "src/components/Creators/CreatorProfileHeader.tsx",
        "src/components/Creators/CreatorProfileTimelineFeed.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-profile-mobile-timeline.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.25",
      "previousVersion": "1.3.24",
      "betaReleaseCounter": 325,
      "previousBetaReleaseCounter": 324,
      "commitSha": "pending-same-commit",
      "commitTitle": "feat(creator): prep broadcast timeline notifications",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T04:46:02.326Z",
      "generatedAt": "2026-05-20T04:46:02.326Z",
      "committedAtUtc": "2026-05-20T04:46:02.326Z",
      "generatedAtUtc": "2026-05-20T04:46:02.326Z",
      "updatedAtUtc": "2026-05-20T04:46:02.326Z",
      "category": "Improved",
      "title": "Bug fixes and general improvements",
      "summary": "Prepared creator broadcasts for follower notifications.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Prepared creator broadcasts for follower notifications.",
        "Added timeline-ready broadcast and drop source contracts.",
        "Kept broadcast fanout bounded and idempotent."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator broadcast timeline prep pass into this public beta note."
      ],
      "affectedSurfaces": [
        "creator broadcasts",
        "creator profile",
        "notifications",
        "creator timeline"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-broadcast-timeline-prep.generated.json",
        "docs/agent-truth/creator-broadcast-timeline-prep.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-broadcast-timeline-prep.ts",
        "src/app/api/creator/broadcasts/route.ts",
        "src/app/api/creators/[username]/route.ts",
        "src/app/creators/[username]/CreatorProfileClient.tsx",
        "src/components/Creators/CreatorBroadcastManager.tsx",
        "src/components/Creators/CreatorUpdatesFeed.tsx",
        "src/lib/creator-broadcasts/broadcast-contract.ts",
        "src/lib/creator-profile/timeline-contract.ts",
        "src/lib/notifications/creator-broadcast-notifications.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-broadcast-timeline-prep.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.24",
      "previousVersion": "1.3.23",
      "betaReleaseCounter": 324,
      "previousBetaReleaseCounter": 323,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(creator): wire pricing settings to experiences",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-20T04:26:48.686Z",
      "generatedAt": "2026-05-20T04:26:48.686Z",
      "committedAtUtc": "2026-05-20T04:26:48.686Z",
      "generatedAtUtc": "2026-05-20T04:26:48.686Z",
      "updatedAtUtc": "2026-05-20T04:26:48.686Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Connected creator Fan Pass pricing to user-facing flows.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Connected creator Fan Pass pricing to user-facing flows.",
        "Aligned creator experience prices with creator settings.",
        "Preserved paid-GumDrop-only rules for creator experiences."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator pricing wiring pass into this public beta note."
      ],
      "affectedSurfaces": [
        "creator settings",
        "creator profile",
        "Fan Pass",
        "creator experiences"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-pricing-wiring.generated.json",
        "docs/agent-truth/creator-pricing-wiring.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-pricing-wiring.ts",
        "src/app/api/creator/bookings/route.ts",
        "src/app/api/creator/requests/route.ts",
        "src/app/api/creator/subscriptions/route.ts",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/components/Creators/CreatorExperiencesPanel.tsx",
        "src/lib/creator-settings/creator-pricing-resolver.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-pricing-wiring.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
