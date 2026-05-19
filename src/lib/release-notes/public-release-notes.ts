import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.3.15",
  "betaReleaseCounter": 315,
  "channel": "beta",
  "generatedAt": "2026-05-19T23:00:23.317Z",
  "generatedAtUtc": "2026-05-19T23:00:23.317Z",
  "lastCommitSha": "pending-same-commit",
  "notes": [
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
    },
    {
      "version": "1.2.98",
      "previousVersion": "1.2.97",
      "betaReleaseCounter": 298,
      "previousBetaReleaseCounter": 297,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(dashboard): isolate creator dashboard surface",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T16:45:00.000Z",
      "generatedAt": "2026-05-19T16:45:00.000Z",
      "committedAtUtc": "2026-05-19T16:45:00.000Z",
      "generatedAtUtc": "2026-05-19T16:45:00.000Z",
      "updatedAtUtc": "2026-05-19T16:45:00.000Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Separated Creator Dashboard from the normal user dashboard body while preserving user reward and library sections.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Separated Creator Dashboard from user reward and library sections.",
        "Kept Daily Rewards and My KandyDrops on the normal user dashboard.",
        "Cleaned up creator dashboard route boundaries on mobile."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator dashboard role-boundary fix into this public beta note."
      ],
      "affectedSurfaces": [
        "creator dashboard",
        "user dashboard",
        "mobile navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-dashboard-role-boundary.generated.json",
        "docs/agent-truth/creator-dashboard-role-boundary.md",
        "docs/agent-truth/creator-surface-routing.md",
        "docs/agent-truth/user-creator-ui-parity.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-dashboard-role-boundary.ts",
        "src/app/dashboard/DashboardClient.tsx",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/components/Navigation/MobileBottomBar.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-dashboard-role-boundary.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.2.97",
      "previousVersion": "1.2.96",
      "betaReleaseCounter": 297,
      "previousBetaReleaseCounter": 296,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(creator): improve fan pass crm and broadcasts",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T16:30:18.338Z",
      "generatedAt": "2026-05-19T16:30:18.338Z",
      "committedAtUtc": "2026-05-19T16:30:18.338Z",
      "generatedAtUtc": "2026-05-19T16:30:18.338Z",
      "updatedAtUtc": "2026-05-19T16:30:18.338Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Made Fan Pass subscribers readable and clarified Creator Broadcast audience language.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Made Fan Pass subscribers readable in Creator Dashboard.",
        "Added mobile-first Fan Pass CRM rows.",
        "Clarified Creator Broadcast audience language."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator fan pass CRM and broadcast semantics fix into this public beta note."
      ],
      "affectedSurfaces": [
        "creator dashboard",
        "fan pass",
        "creator broadcasts"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-fan-pass-crm-broadcast.generated.json",
        "docs/agent-truth/creator-fan-pass-crm-broadcast.md",
        "docs/agent-truth/creator-settings-source-health.md",
        "docs/agent-truth/creator-surface-routing.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-fan-pass-crm-broadcast.ts",
        "scripts/agent/validate-user-creator-visual-confirmation.ts",
        "src/app/api/creator/broadcasts/route.ts",
        "src/app/api/creator/subscriptions/route.ts",
        "src/components/Creators/CreatorBroadcastManager.tsx",
        "src/components/Creators/CreatorFanPassManager.tsx",
        "src/components/Creators/FanPassSubscriberRow.tsx",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/creator-broadcast-manager.spec.tsx",
        "tests/unit/creator-broadcasts-route.spec.ts",
        "tests/unit/creator-fan-pass-crm-broadcast.spec.ts",
        "tests/unit/creator-fan-pass-manager.spec.tsx",
        "tests/unit/creator-subscriptions-route.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.2.96",
      "previousVersion": "1.2.95",
      "betaReleaseCounter": 296,
      "previousBetaReleaseCounter": 295,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(creator): consolidate overview stats sources",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T16:02:57.385Z",
      "generatedAt": "2026-05-19T16:02:57.385Z",
      "committedAtUtc": "2026-05-19T16:02:57.385Z",
      "generatedAtUtc": "2026-05-19T16:02:57.385Z",
      "updatedAtUtc": "2026-05-19T16:02:57.385Z",
      "category": "Fixed",
      "title": "Bug fixes and general improvements",
      "summary": "Consolidated Creator Dashboard stats and corrected creator-scoped fan and content source mapping.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "Creator tools",
      "bullets": [
        "Combined Creator Dashboard stats into one compact overview.",
        "Fixed creator fan and content count source mapping.",
        "Separated creator-owned content counts from public drop discovery."
      ],
      "audience": "creators",
      "technicalDetails": [
        "Grouped 1 accepted creator dashboard overview stats source fix into this public beta note."
      ],
      "affectedSurfaces": [
        "creator dashboard",
        "creator settings",
        "drop visibility"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/creator-dashboard-overview-stats.generated.json",
        "docs/agent-truth/creator-dashboard-overview-stats.md",
        "docs/agent-truth/creator-landing-dashboard-mobile.md",
        "docs/agent-truth/creator-settings-source-health.md",
        "docs/agent-truth/creator-surface-routing.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-creator-dashboard-overview-stats.ts",
        "scripts/agent/validate-creator-landing-dashboard-mobile.ts",
        "scripts/agent/validate-creator-surface-routing.ts",
        "src/app/api/creator/settings/route.ts",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/components/Dashboard/CreatorWorkspacePanel.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/creator-drop-scope.ts",
        "tests/unit/creator-dashboard-overview-stats.spec.ts",
        "tests/unit/creator-drop-scope.spec.ts",
        "tests/unit/creator-landing-dashboard-mobile.spec.ts",
        "tests/unit/creator-settings-route.spec.ts",
        "tests/unit/creator-surface-routing.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.2.95",
      "previousVersion": "1.2.94",
      "betaReleaseCounter": 295,
      "previousBetaReleaseCounter": 294,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(cost): lock final cost audit readiness",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-19T15:40:07.320Z",
      "generatedAt": "2026-05-19T15:40:07.320Z",
      "committedAtUtc": "2026-05-19T15:40:07.320Z",
      "generatedAtUtc": "2026-05-19T15:40:07.320Z",
      "updatedAtUtc": "2026-05-19T15:40:07.320Z",
      "category": "Performance",
      "title": "Bug fixes and general improvements",
      "summary": "Locked the full analytics cost cleanup audit and refreshed Beta readiness without marking unproven evidence as ready.",
      "userFacingTitle": "Bug fixes and general improvements",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked the full analytics cost cleanup audit.",
        "Verified cost reductions do not compromise tracking accuracy.",
        "Refreshed Beta readiness with cost and analytics evidence."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 1 accepted final cost audit lock into this public beta note."
      ],
      "affectedSurfaces": [
        "analytics",
        "admin",
        "runtime jobs",
        "beta readiness"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/final-cost-audit-lock.generated.json",
        "docs/agent-truth/final-cost-audit-lock.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-final-cost-audit-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/final-cost-audit-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  currentVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
  generatedAtUtc: PUBLIC_RELEASE_NOTES_FALLBACK.generatedAtUtc,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion;
