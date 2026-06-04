import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.5.61",
  "betaReleaseCounter": 561,
  "channel": "beta",
  "generatedAt": "2026-06-04T02:03:15.926Z",
  "generatedAtUtc": "2026-06-04T02:03:15.926Z",
  "lastCommitSha": "2ab0582ad85954b3f8b8c99dfb84c7056fb36681",
  "notes": [
    {
      "version": "1.5.61",
      "previousVersion": "1.5.60",
      "betaReleaseCounter": 561,
      "previousBetaReleaseCounter": 560,
      "commitSha": "2ab0582ad85954b3f8b8c99dfb84c7056fb36681",
      "commitTitle": "fix(admin): add compact return cadence modes",
      "commitCount": 2,
      "commitShas": [
        "eae4c5814e0b08cd58eec360638f64b2e1bb21ae",
        "2ab0582ad85954b3f8b8c99dfb84c7056fb36681"
      ],
      "committedAt": "2026-06-04T02:03:02.000Z",
      "generatedAt": "2026-06-04T02:03:15.925Z",
      "committedAtUtc": "2026-06-04T02:03:02.000Z",
      "generatedAtUtc": "2026-06-04T02:03:15.925Z",
      "updatedAtUtc": "2026-06-04T02:03:15.925Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-audience-mobile.spec.ts",
        "tests/unit/admin-debug-compact-layout.spec.ts"
      ],
      "sourceCommit": "2ab0582ad85954b3f8b8c99dfb84c7056fb36681"
    },
    {
      "version": "1.5.60",
      "previousVersion": "1.5.59",
      "betaReleaseCounter": 560,
      "previousBetaReleaseCounter": 559,
      "commitSha": "5d2d432b82a456750d07ce4425a1ed5cd1e25ee0",
      "commitTitle": "fix(admin): simplify debug now panel",
      "commitCount": 2,
      "commitShas": [
        "885da4a8acfdfc3316a90f2539320717f34ab6c2",
        "5d2d432b82a456750d07ce4425a1ed5cd1e25ee0"
      ],
      "committedAt": "2026-06-04T01:54:20.000Z",
      "generatedAt": "2026-06-04T01:54:32.293Z",
      "committedAtUtc": "2026-06-04T01:54:20.000Z",
      "generatedAtUtc": "2026-06-04T01:54:32.293Z",
      "updatedAtUtc": "2026-06-04T01:54:32.293Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-operations-mobile.spec.ts",
        "tests/unit/admin-debug-compact-layout.spec.ts"
      ],
      "sourceCommit": "5d2d432b82a456750d07ce4425a1ed5cd1e25ee0"
    },
    {
      "version": "1.5.59",
      "previousVersion": "1.5.58",
      "betaReleaseCounter": 559,
      "previousBetaReleaseCounter": 558,
      "commitSha": "75d9c9f51c1aec46091a814946f5f03fb8e8ad80",
      "commitTitle": "fix(admin): add compact live pulse modes",
      "commitCount": 2,
      "commitShas": [
        "0686da99cd5010bb07deddeab5ef9544dab59644",
        "75d9c9f51c1aec46091a814946f5f03fb8e8ad80"
      ],
      "committedAt": "2026-06-04T01:39:31.000Z",
      "generatedAt": "2026-06-04T01:39:45.451Z",
      "committedAtUtc": "2026-06-04T01:39:31.000Z",
      "generatedAtUtc": "2026-06-04T01:39:45.451Z",
      "updatedAtUtc": "2026-06-04T01:39:45.451Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-operations-mobile.spec.ts"
      ],
      "sourceCommit": "75d9c9f51c1aec46091a814946f5f03fb8e8ad80"
    },
    {
      "version": "1.5.58",
      "previousVersion": "1.5.57",
      "betaReleaseCounter": 558,
      "previousBetaReleaseCounter": 557,
      "commitSha": "7198b17c92e356b11afa0cd1dfc67bb789e7d958",
      "commitTitle": "fix(admin): add compact guest quality modes",
      "commitCount": 2,
      "commitShas": [
        "4ef960a8e75738286aff8b722e94b483f900fda6",
        "7198b17c92e356b11afa0cd1dfc67bb789e7d958"
      ],
      "committedAt": "2026-06-04T01:30:02.000Z",
      "generatedAt": "2026-06-04T01:30:16.926Z",
      "committedAtUtc": "2026-06-04T01:30:02.000Z",
      "generatedAtUtc": "2026-06-04T01:30:16.926Z",
      "updatedAtUtc": "2026-06-04T01:30:16.926Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-operations-mobile.spec.ts"
      ],
      "sourceCommit": "7198b17c92e356b11afa0cd1dfc67bb789e7d958"
    },
    {
      "version": "1.5.57",
      "previousVersion": "1.5.56",
      "betaReleaseCounter": 557,
      "previousBetaReleaseCounter": 556,
      "commitSha": "44b3c2caa7dccab8aa18692bfb06b80f85d736a5",
      "commitTitle": "fix(admin): add compact auth outcome modes",
      "commitCount": 2,
      "commitShas": [
        "a67099557fc178d7e56aabcded629aac91b3a7db",
        "44b3c2caa7dccab8aa18692bfb06b80f85d736a5"
      ],
      "committedAt": "2026-06-04T01:17:04.000Z",
      "generatedAt": "2026-06-04T01:17:19.235Z",
      "committedAtUtc": "2026-06-04T01:17:04.000Z",
      "generatedAtUtc": "2026-06-04T01:17:19.235Z",
      "updatedAtUtc": "2026-06-04T01:17:19.235Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-audience-mobile.spec.ts",
        "tests/unit/admin-analytics-operations-mobile.spec.ts"
      ],
      "sourceCommit": "44b3c2caa7dccab8aa18692bfb06b80f85d736a5"
    },
    {
      "version": "1.5.56",
      "previousVersion": "1.5.55",
      "betaReleaseCounter": 556,
      "previousBetaReleaseCounter": 555,
      "commitSha": "9425b0663b79381f201d2989c17eaf07a8c48a6a",
      "commitTitle": "fix(admin): add compact navigation destination modes",
      "commitCount": 2,
      "commitShas": [
        "141997d2e35ceeb94a36094bd354d511c45431ef",
        "9425b0663b79381f201d2989c17eaf07a8c48a6a"
      ],
      "committedAt": "2026-06-04T01:05:53.000Z",
      "generatedAt": "2026-06-04T01:06:08.224Z",
      "committedAtUtc": "2026-06-04T01:05:53.000Z",
      "generatedAtUtc": "2026-06-04T01:06:08.224Z",
      "updatedAtUtc": "2026-06-04T01:06:08.224Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-audience-mobile.spec.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts"
      ],
      "sourceCommit": "9425b0663b79381f201d2989c17eaf07a8c48a6a"
    },
    {
      "version": "1.5.55",
      "previousVersion": "1.5.54",
      "betaReleaseCounter": 555,
      "previousBetaReleaseCounter": 554,
      "commitSha": "01b03cb4c3aedf644f96f5dd7a8d54e492d33195",
      "commitTitle": "fix(admin): add compact recent commerce feed modes",
      "commitCount": 2,
      "commitShas": [
        "3391e742fbe8f3fe0d2164d899875339c3ef93a1",
        "01b03cb4c3aedf644f96f5dd7a8d54e492d33195"
      ],
      "committedAt": "2026-06-04T00:54:06.000Z",
      "generatedAt": "2026-06-04T00:54:20.096Z",
      "committedAtUtc": "2026-06-04T00:54:06.000Z",
      "generatedAtUtc": "2026-06-04T00:54:20.096Z",
      "updatedAtUtc": "2026-06-04T00:54:20.096Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts"
      ],
      "sourceCommit": "01b03cb4c3aedf644f96f5dd7a8d54e492d33195"
    },
    {
      "version": "1.5.54",
      "previousVersion": "1.5.53",
      "betaReleaseCounter": 554,
      "previousBetaReleaseCounter": 553,
      "commitSha": "03fcb3339f8258ffadcacb2d1d3069025cedc7f1",
      "commitTitle": "fix(admin): add compact watch depth analytics modes",
      "commitCount": 2,
      "commitShas": [
        "26b2b418bde3429af2297dbab2761d75fa0933e5",
        "03fcb3339f8258ffadcacb2d1d3069025cedc7f1"
      ],
      "committedAt": "2026-06-04T00:42:29.000Z",
      "generatedAt": "2026-06-04T00:42:45.700Z",
      "committedAtUtc": "2026-06-04T00:42:29.000Z",
      "generatedAtUtc": "2026-06-04T00:42:45.700Z",
      "updatedAtUtc": "2026-06-04T00:42:45.700Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts"
      ],
      "sourceCommit": "03fcb3339f8258ffadcacb2d1d3069025cedc7f1"
    },
    {
      "version": "1.5.53",
      "previousVersion": "1.5.52",
      "betaReleaseCounter": 553,
      "previousBetaReleaseCounter": 552,
      "commitSha": "3e4fa09f66e8fe92bddd156be9a5f87413b1e060",
      "commitTitle": "fix(admin): add compact viewer journey analytics modes",
      "commitCount": 2,
      "commitShas": [
        "1f4f8b1ad25805ee7044da3fbb4dc8c3f5790171",
        "3e4fa09f66e8fe92bddd156be9a5f87413b1e060"
      ],
      "committedAt": "2026-06-04T00:25:39.000Z",
      "generatedAt": "2026-06-04T00:25:53.611Z",
      "committedAtUtc": "2026-06-04T00:25:39.000Z",
      "generatedAtUtc": "2026-06-04T00:25:53.611Z",
      "updatedAtUtc": "2026-06-04T00:25:53.611Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/admin/debug/page.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts",
        "tests/unit/admin-debug-compact-panel.spec.ts"
      ],
      "sourceCommit": "3e4fa09f66e8fe92bddd156be9a5f87413b1e060"
    },
    {
      "version": "1.5.52",
      "previousVersion": "1.5.51",
      "betaReleaseCounter": 552,
      "previousBetaReleaseCounter": 551,
      "commitSha": "1bd77282b535b0b2e847ff08c198dc854f8efa22",
      "commitTitle": "fix(admin): simplify debug panel evidence drawer",
      "commitCount": 2,
      "commitShas": [
        "7ecb60bf1826e04e063d83dcdbc13cddf75490db",
        "1bd77282b535b0b2e847ff08c198dc854f8efa22"
      ],
      "committedAt": "2026-06-04T00:17:22.000Z",
      "generatedAt": "2026-06-04T00:17:36.536Z",
      "committedAtUtc": "2026-06-04T00:17:22.000Z",
      "generatedAtUtc": "2026-06-04T00:17:36.536Z",
      "updatedAtUtc": "2026-06-04T00:17:36.536Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/debug/page.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts",
        "tests/unit/admin-debug-compact-panel.spec.ts"
      ],
      "sourceCommit": "1bd77282b535b0b2e847ff08c198dc854f8efa22"
    },
    {
      "version": "1.5.51",
      "previousVersion": "1.5.50",
      "betaReleaseCounter": 551,
      "previousBetaReleaseCounter": 550,
      "commitSha": "2a2375c01b0d3f570b793a5cba98a651eb7b3633",
      "commitTitle": "fix(admin): add compact package performance analytics modes",
      "commitCount": 2,
      "commitShas": [
        "5372621b09aff5ae82aa7e963d09df32b6660662",
        "2a2375c01b0d3f570b793a5cba98a651eb7b3633"
      ],
      "committedAt": "2026-06-04T00:02:02.000Z",
      "generatedAt": "2026-06-04T00:02:17.221Z",
      "committedAtUtc": "2026-06-04T00:02:02.000Z",
      "generatedAtUtc": "2026-06-04T00:02:17.221Z",
      "updatedAtUtc": "2026-06-04T00:02:17.221Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts"
      ],
      "sourceCommit": "2a2375c01b0d3f570b793a5cba98a651eb7b3633"
    },
    {
      "version": "1.5.50",
      "previousVersion": "1.5.49",
      "betaReleaseCounter": 550,
      "previousBetaReleaseCounter": 549,
      "commitSha": "89f8ee2b07fdb057f8ecefb96d2140c35e7e071c",
      "commitTitle": "fix(admin): add compact content conversion analytics modes",
      "commitCount": 2,
      "commitShas": [
        "6d3b27084fa70afc7cb3ab2c5453c03fb8182f90",
        "89f8ee2b07fdb057f8ecefb96d2140c35e7e071c"
      ],
      "committedAt": "2026-06-03T23:52:06.000Z",
      "generatedAt": "2026-06-03T23:52:29.432Z",
      "committedAtUtc": "2026-06-03T23:52:06.000Z",
      "generatedAtUtc": "2026-06-03T23:52:29.432Z",
      "updatedAtUtc": "2026-06-03T23:52:29.432Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts",
        "tests/unit/admin-debug-compact-layout.spec.ts"
      ],
      "sourceCommit": "89f8ee2b07fdb057f8ecefb96d2140c35e7e071c"
    },
    {
      "version": "1.5.49",
      "previousVersion": "1.5.48",
      "betaReleaseCounter": 549,
      "previousBetaReleaseCounter": 548,
      "commitSha": "53355223290248fe5d06ab6706fafc064801b90c",
      "commitTitle": "fix(admin): compact debug system health panel",
      "commitCount": 2,
      "commitShas": [
        "7a5bd39e4c2163d5daa61d1f324ff0e94dee7c08",
        "53355223290248fe5d06ab6706fafc064801b90c"
      ],
      "committedAt": "2026-06-03T23:41:23.000Z",
      "generatedAt": "2026-06-03T23:41:36.790Z",
      "committedAtUtc": "2026-06-03T23:41:23.000Z",
      "generatedAtUtc": "2026-06-03T23:41:36.790Z",
      "updatedAtUtc": "2026-06-03T23:41:36.790Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-audience-mobile.spec.ts",
        "tests/unit/admin-debug-compact-layout.spec.ts"
      ],
      "sourceCommit": "53355223290248fe5d06ab6706fafc064801b90c"
    },
    {
      "version": "1.5.48",
      "previousVersion": "1.5.47",
      "betaReleaseCounter": 548,
      "previousBetaReleaseCounter": 547,
      "commitSha": "372ced8e723961e51716e3012420d571f52ec699",
      "commitTitle": "fix(admin): add compact regions analytics modes",
      "commitCount": 2,
      "commitShas": [
        "eb3bf037f62a7da7ade027f9993db5a507210be8",
        "372ced8e723961e51716e3012420d571f52ec699"
      ],
      "committedAt": "2026-06-03T23:26:56.000Z",
      "generatedAt": "2026-06-03T23:27:08.670Z",
      "committedAtUtc": "2026-06-03T23:26:56.000Z",
      "generatedAtUtc": "2026-06-03T23:27:08.670Z",
      "updatedAtUtc": "2026-06-03T23:27:08.670Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-audience-mobile.spec.ts",
        "tests/unit/admin-analytics-live-interaction-mobile.spec.ts"
      ],
      "sourceCommit": "372ced8e723961e51716e3012420d571f52ec699"
    },
    {
      "version": "1.5.47",
      "previousVersion": "1.5.46",
      "betaReleaseCounter": 547,
      "previousBetaReleaseCounter": 546,
      "commitSha": "bdeee1f55f187f136de67ba28d83771166543b4c",
      "commitTitle": "fix(admin): add compact live interaction analytics modes",
      "commitCount": 2,
      "commitShas": [
        "e44316ba33f1db4ca0650c20309637daefa1758b",
        "bdeee1f55f187f136de67ba28d83771166543b4c"
      ],
      "committedAt": "2026-06-03T23:17:58.000Z",
      "generatedAt": "2026-06-03T23:18:11.323Z",
      "committedAtUtc": "2026-06-03T23:17:58.000Z",
      "generatedAtUtc": "2026-06-03T23:18:11.323Z",
      "updatedAtUtc": "2026-06-03T23:18:11.323Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/app/admin/debug/page.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-live-interaction-mobile.spec.ts",
        "tests/unit/admin-debug-compact-panel.spec.ts"
      ],
      "sourceCommit": "bdeee1f55f187f136de67ba28d83771166543b4c"
    },
    {
      "version": "1.5.46",
      "previousVersion": "1.5.45",
      "betaReleaseCounter": 546,
      "previousBetaReleaseCounter": 545,
      "commitSha": "3b534aac5b1890d89f3a5fa2682a19c9ea99c17d",
      "commitTitle": "fix(admin): compact debug panel default view",
      "commitCount": 2,
      "commitShas": [
        "8d7cafaaad304fff578ab1689bfb34988f6c67bc",
        "3b534aac5b1890d89f3a5fa2682a19c9ea99c17d"
      ],
      "committedAt": "2026-06-03T23:10:31.000Z",
      "generatedAt": "2026-06-03T23:10:43.936Z",
      "committedAtUtc": "2026-06-03T23:10:31.000Z",
      "generatedAtUtc": "2026-06-03T23:10:43.936Z",
      "updatedAtUtc": "2026-06-03T23:10:43.936Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/app/admin/debug/page.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-operations-mobile.spec.ts",
        "tests/unit/admin-debug-compact-panel.spec.ts"
      ],
      "sourceCommit": "3b534aac5b1890d89f3a5fa2682a19c9ea99c17d"
    },
    {
      "version": "1.5.45",
      "previousVersion": "1.5.44",
      "betaReleaseCounter": 545,
      "previousBetaReleaseCounter": 544,
      "commitSha": "af636c749138261bdbb899c8b54df7f77f2e3dea",
      "commitTitle": "fix(admin): add compact event mix analytics modes",
      "commitCount": 2,
      "commitShas": [
        "ba57a31950095eb4342a1165bee081fc34a0a94e",
        "af636c749138261bdbb899c8b54df7f77f2e3dea"
      ],
      "committedAt": "2026-06-03T22:57:03.000Z",
      "generatedAt": "2026-06-03T22:57:15.626Z",
      "committedAtUtc": "2026-06-03T22:57:03.000Z",
      "generatedAtUtc": "2026-06-03T22:57:15.626Z",
      "updatedAtUtc": "2026-06-03T22:57:15.626Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-audience-mobile.spec.ts",
        "tests/unit/admin-analytics-audience-snapshot.spec.ts",
        "tests/unit/admin-analytics-operations-mobile.spec.ts"
      ],
      "sourceCommit": "af636c749138261bdbb899c8b54df7f77f2e3dea"
    },
    {
      "version": "1.5.44",
      "previousVersion": "1.5.43",
      "betaReleaseCounter": 544,
      "previousBetaReleaseCounter": 543,
      "commitSha": "91ed0cb473c198b17c19b61fb096cb969cf346d4",
      "commitTitle": "fix(admin): add compact top paths analytics modes",
      "commitCount": 2,
      "commitShas": [
        "815177718fc1610590762fdae5d76b3ae390a2ae",
        "91ed0cb473c198b17c19b61fb096cb969cf346d4"
      ],
      "committedAt": "2026-06-03T22:46:51.000Z",
      "generatedAt": "2026-06-03T22:47:04.728Z",
      "committedAtUtc": "2026-06-03T22:46:51.000Z",
      "generatedAtUtc": "2026-06-03T22:47:04.728Z",
      "updatedAtUtc": "2026-06-03T22:47:04.728Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-audience-mobile.spec.ts",
        "tests/unit/admin-analytics-audience-snapshot.spec.ts",
        "tests/unit/admin-debug-compact-layout.spec.ts"
      ],
      "sourceCommit": "91ed0cb473c198b17c19b61fb096cb969cf346d4"
    },
    {
      "version": "1.5.43",
      "previousVersion": "1.5.42",
      "betaReleaseCounter": 543,
      "previousBetaReleaseCounter": 542,
      "commitSha": "84e368bfa3e81bbd2e611ba017e3676ce022ba69",
      "commitTitle": "fix(admin): compact debug source drilldowns",
      "commitCount": 2,
      "commitShas": [
        "d013a1ed8c552ff7f9a959df0a65b69309c936da",
        "84e368bfa3e81bbd2e611ba017e3676ce022ba69"
      ],
      "committedAt": "2026-06-03T22:35:36.000Z",
      "generatedAt": "2026-06-03T22:35:49.769Z",
      "committedAtUtc": "2026-06-03T22:35:36.000Z",
      "generatedAtUtc": "2026-06-03T22:35:49.769Z",
      "updatedAtUtc": "2026-06-03T22:35:49.769Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts",
        "tests/unit/admin-debug-compact-layout.spec.ts"
      ],
      "sourceCommit": "84e368bfa3e81bbd2e611ba017e3676ce022ba69"
    },
    {
      "version": "1.5.42",
      "previousVersion": "1.5.41",
      "betaReleaseCounter": 542,
      "previousBetaReleaseCounter": 541,
      "commitSha": "7306a99161215db9a2117fb4dd583df5adf3fdf3",
      "commitTitle": "fix(admin): compact viewer analytics drilldown",
      "commitCount": 2,
      "commitShas": [
        "8c2b6115b4b47be662d79c5bfaa05b0f2717f5d1",
        "7306a99161215db9a2117fb4dd583df5adf3fdf3"
      ],
      "committedAt": "2026-06-03T22:17:11.000Z",
      "generatedAt": "2026-06-03T22:17:25.179Z",
      "committedAtUtc": "2026-06-03T22:17:11.000Z",
      "generatedAtUtc": "2026-06-03T22:17:25.179Z",
      "updatedAtUtc": "2026-06-03T22:17:25.179Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-mobile.spec.ts"
      ],
      "sourceCommit": "7306a99161215db9a2117fb4dd583df5adf3fdf3"
    },
    {
      "version": "1.5.41",
      "previousVersion": "1.5.40",
      "betaReleaseCounter": 541,
      "previousBetaReleaseCounter": 540,
      "commitSha": "685b745736e905f807c23cc97e1b112b18018acb",
      "commitTitle": "fix(admin): simplify debug control tower",
      "commitCount": 2,
      "commitShas": [
        "0fd3c3ca0b891878622fc45514b78e9aecdca93f",
        "685b745736e905f807c23cc97e1b112b18018acb"
      ],
      "committedAt": "2026-06-03T22:02:53.000Z",
      "generatedAt": "2026-06-03T22:03:07.221Z",
      "committedAtUtc": "2026-06-03T22:02:53.000Z",
      "generatedAtUtc": "2026-06-03T22:03:07.221Z",
      "updatedAtUtc": "2026-06-03T22:03:07.221Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsAudienceTab.tsx",
        "src/app/admin/analytics/components/AdminAnalyticsCommerceTab.tsx",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-commerce-snapshot.spec.ts"
      ],
      "sourceCommit": "685b745736e905f807c23cc97e1b112b18018acb"
    },
    {
      "version": "1.5.40",
      "previousVersion": "1.5.39",
      "betaReleaseCounter": 540,
      "previousBetaReleaseCounter": 539,
      "commitSha": "8d387848990aa76d5f8a5b9c2d9a5a1af0beb2c4",
      "commitTitle": "fix(admin): compact debug control panel",
      "commitCount": 1,
      "commitShas": [
        "8d387848990aa76d5f8a5b9c2d9a5a1af0beb2c4"
      ],
      "committedAt": "2026-06-03T21:37:08.000Z",
      "generatedAt": "2026-06-03T21:49:24.976Z",
      "committedAtUtc": "2026-06-03T21:37:08.000Z",
      "generatedAtUtc": "2026-06-03T21:49:24.976Z",
      "updatedAtUtc": "2026-06-03T21:49:24.976Z",
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
      "affectedSurfaces": [
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/debug/components/DebugPrimitives.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/app/admin/debug/page.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-debug-summary-cards.spec.ts"
      ],
      "sourceCommit": "8d387848990aa76d5f8a5b9c2d9a5a1af0beb2c4"
    },
    {
      "version": "1.5.39",
      "previousVersion": "1.5.38",
      "betaReleaseCounter": 539,
      "previousBetaReleaseCounter": 538,
      "commitSha": "ce406145d6e36051dd979da2e0a8b8cadb271473",
      "commitTitle": "fix(admin): compact debug control panel",
      "commitCount": 2,
      "commitShas": [
        "d1500b65c33f9a21d7f12f14f115213fc54c6fea",
        "ce406145d6e36051dd979da2e0a8b8cadb271473"
      ],
      "committedAt": "2026-06-03T21:36:03.000Z",
      "generatedAt": "2026-06-03T21:36:39.765Z",
      "committedAtUtc": "2026-06-03T21:36:03.000Z",
      "generatedAtUtc": "2026-06-03T21:36:39.765Z",
      "updatedAtUtc": "2026-06-03T21:36:39.765Z",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/admin-analytics-source-hierarchy.generated.json",
        "agent/state/analytics-hydration-consolidation-audit.generated.json",
        "agent/state/analytics-hydration-consolidation.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "docs/agent-truth/admin-analytics-source-hierarchy.md",
        "docs/agent-truth/analytics-hydration-consolidation-audit.md",
        "docs/agent-truth/analytics-hydration-consolidation.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/debug/components/DebugPrimitives.tsx",
        "src/app/admin/debug/components/DebugTabNow.tsx",
        "src/app/admin/debug/page.tsx",
        "src/components/Admin/Analytics/AdminAnalyticsPrimitives.tsx",
        "src/hooks/useAdminOverviewRealtime.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-debug-summary-cards.spec.ts"
      ],
      "sourceCommit": "ce406145d6e36051dd979da2e0a8b8cadb271473"
    },
    {
      "version": "1.5.38",
      "previousVersion": "1.5.37",
      "betaReleaseCounter": 538,
      "previousBetaReleaseCounter": 537,
      "commitSha": "19604704a1a8b87b28d6da8c13b6e833925004e7",
      "commitTitle": "fix(admin): simplify debug control tower layout",
      "commitCount": 1,
      "commitShas": [
        "19604704a1a8b87b28d6da8c13b6e833925004e7"
      ],
      "committedAt": "2026-06-03T20:12:28.000Z",
      "generatedAt": "2026-06-03T21:06:13.926Z",
      "committedAtUtc": "2026-06-03T20:12:28.000Z",
      "generatedAtUtc": "2026-06-03T21:06:13.926Z",
      "updatedAtUtc": "2026-06-03T21:06:13.926Z",
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
      "affectedSurfaces": [
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/debug-panel-output-triage.generated.json",
        "agent/state/public-beta-score.generated.json",
        "public/kandydrops-release-notes.json",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts"
      ],
      "sourceCommit": "19604704a1a8b87b28d6da8c13b6e833925004e7"
    },
    {
      "version": "1.5.37",
      "previousVersion": "1.5.36",
      "betaReleaseCounter": 537,
      "previousBetaReleaseCounter": 536,
      "commitSha": "8450d4ab093503ba4b72464f966321cb61fea027",
      "commitTitle": "fix(admin): simplify debug control tower layout",
      "commitCount": 2,
      "commitShas": [
        "2aa75e5a9ea59a7c2285758666161d2789c6be20",
        "8450d4ab093503ba4b72464f966321cb61fea027"
      ],
      "committedAt": "2026-06-03T20:10:15.000Z",
      "generatedAt": "2026-06-03T20:11:18.100Z",
      "committedAtUtc": "2026-06-03T20:10:15.000Z",
      "generatedAtUtc": "2026-06-03T20:11:18.100Z",
      "updatedAtUtc": "2026-06-03T20:11:18.100Z",
      "category": "New",
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
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.json",
        "agent/evidence/admin-truth-sample/automated-admin-truth-sample.20260603T183719Z.redacted.json",
        "agent/evidence/runtime-smoke/automated-runtime-smoke.20260603T183719Z.json",
        "agent/state/admin-truth-sample-evidence.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/debug-panel-output-triage.generated.json",
        "agent/state/evidence-capture-status.generated.json",
        "agent/state/formal-evidence-bridge.generated.json",
        "agent/state/provider-smoke-evidence.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/runtime-smoke-evidence.generated.json",
        "docs/agent-truth/evidence-capture-status.md",
        "docs/agent-truth/formal-evidence-bridge.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/capture-truthful-evidence.ts",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-admin-truth-sample-evidence.ts",
        "scripts/agent/validate-current-beta-exit-status.ts",
        "scripts/agent/validate-evidence-capture-status.ts",
        "scripts/agent/validate-formal-evidence-bridge.ts",
        "scripts/agent/validate-provider-smoke-evidence.ts",
        "scripts/agent/validate-runtime-smoke-evidence.ts",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/lib/agent-score/core.ts",
        "src/lib/agent-score/formal-evidence-bridge.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/evidence-capture-status.spec.ts"
      ],
      "sourceCommit": "8450d4ab093503ba4b72464f966321cb61fea027"
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
