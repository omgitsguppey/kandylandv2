import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.6.4",
  "betaReleaseCounter": 604,
  "channel": "beta",
  "generatedAt": "2026-06-18T19:30:17.599Z",
  "generatedAtUtc": "2026-06-18T19:30:17.599Z",
  "lastCommitSha": "0df78c11d3a2ff846bdfb34c2e68a5a33c50ba4c",
  "notes": [
    {
      "version": "1.6.4",
      "previousVersion": "1.6.3",
      "betaReleaseCounter": 604,
      "previousBetaReleaseCounter": 603,
      "commitSha": "0df78c11d3a2ff846bdfb34c2e68a5a33c50ba4c",
      "commitTitle": "fix(analytics): retire raw admin realtime listener",
      "commitCount": 1,
      "commitShas": [
        "0df78c11d3a2ff846bdfb34c2e68a5a33c50ba4c"
      ],
      "committedAt": "2026-06-18T19:18:33.000Z",
      "generatedAt": "2026-06-18T19:30:17.599Z",
      "committedAtUtc": "2026-06-18T19:18:33.000Z",
      "generatedAtUtc": "2026-06-18T19:30:17.599Z",
      "updatedAtUtc": "2026-06-18T19:30:17.599Z",
      "category": "Fixed",
      "title": "Clearer Admin Analytics source status",
      "summary": "Improved Admin Analytics so source agreement, launch history recovery, and missing evidence states are easier to understand.",
      "userFacingTitle": "Clearer Admin Analytics source status",
      "surfaceCategory": "App experience",
      "bullets": [
        "Clarified when analytics history is recovered from first-party sources.",
        "Kept GA4 and legacy analytics labeled as evidence instead of product truth.",
        "Improved Admin Analytics source labels so missing data is not shown as zero."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/admin-analytics-realtime-hot-cache.generated.json",
        "agent/state/admin-realtime-hot-cache-migration.generated.json",
        "agent/state/route-diagnostics-error-map.generated.json",
        "docs/agent-truth/admin-analytics-live-pulse.md",
        "docs/agent-truth/admin-analytics-realtime-hot-cache.md",
        "docs/agent-truth/admin-analytics-realtime-to-hot-cache-audit.md",
        "docs/agent-truth/analytics-file-inventory.md",
        "docs/agent-truth/route-diagnostics-error-map.md",
        "scripts/agent/debug-cockpit-batch14-shared.ts",
        "scripts/agent/validate-route-diagnostics-error-map.ts",
        "scripts/check-admin-analytics-live-pulse.ts",
        "src/app/admin/analytics/hooks/useAdminAnalyticsRealtime.ts",
        "src/lib/admin-analytics/realtime-hot-cache-contract.ts",
        "src/lib/admin/admin-realtime-to-hot-cache-migration.ts",
        "src/lib/legacy/legacy-registry.ts",
        "tests/unit/admin-analytics-realtime-hot-cache.spec.ts",
        "tests/unit/admin-overview-truth.spec.ts",
        "tests/unit/debug-cockpit-batch14-cleanup.spec.ts"
      ],
      "sourceCommit": "0df78c11d3a2ff846bdfb34c2e68a5a33c50ba4c"
    },
    {
      "version": "1.6.3",
      "previousVersion": "1.6.2",
      "betaReleaseCounter": 603,
      "previousBetaReleaseCounter": 602,
      "commitSha": "d1371d0b5aa991193fed4ef341bce26e2c62eed3",
      "commitTitle": "fix(analytics): clarify source agreement promotion state",
      "commitCount": 11,
      "commitShas": [
        "f9d08ce8e84da383105b2a795a7b5766bbec8ca0",
        "468f66abe4da5e7ebae9ee19ad3fa95e2e38bf8d",
        "8c664d581ce64ccf3022958ce9bf2f7b275012d0",
        "257906747a1b14dec6eda849aa864ff49ca2ffe8",
        "50ce2e6693f0e0824574eaabbcfb2effbe81ecf1",
        "3690ab2fad3504ace7d2bf27bfb538a4ada291d4",
        "0d535d67a2b94ee176406bb0993421c82371bfc0",
        "07442f52388f7bc827c8df6f6705943637dd84f8",
        "8d9b35ab1f42605fc9271971e82a79b62a63e30a",
        "ef6ff6c89c7be37c4410bb0ac9ada65580acd32f",
        "d1371d0b5aa991193fed4ef341bce26e2c62eed3"
      ],
      "committedAt": "2026-06-18T18:49:23.000Z",
      "generatedAt": "2026-06-18T18:50:41.640Z",
      "committedAtUtc": "2026-06-18T18:49:23.000Z",
      "generatedAtUtc": "2026-06-18T18:50:41.640Z",
      "updatedAtUtc": "2026-06-18T18:50:41.640Z",
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
        "Grouped 11 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "scripts/rebuild-analytics-truth.ts",
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/debug/components/DebugControlTowerCards.tsx",
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-debug-control-tower-component.spec.tsx",
        "tests/unit/admin-debug-control-tower.spec.ts"
      ],
      "sourceCommit": "d1371d0b5aa991193fed4ef341bce26e2c62eed3"
    },
    {
      "version": "1.6.2",
      "previousVersion": "1.6.1",
      "betaReleaseCounter": 602,
      "previousBetaReleaseCounter": 601,
      "commitSha": "bcc001481d5d0bfb644f3402fde2826c3b7c4131",
      "commitTitle": "fix(admin): translate control tower report states",
      "commitCount": 11,
      "commitShas": [
        "db831ea0d48ca2bc9452aa33bbf0107281cf8660",
        "e4fd624accbf90cccb191c51b52fc720e0195249",
        "2bbbbd537f67ab1e43ae817d516ca08ef09ace84",
        "ad088da8cd553999a99e78c1cbeab9941ba9bb57",
        "4502617f44be83eb22af1c0aaee918a0997ea7f7",
        "2b84d852e9a0a4106ef6ac4ca32a9f8038f3dd78",
        "1b4d165f84ab3bc829413304f6a072495168163e",
        "441b70798155c33f807465cfe1f4aa1b1ccf084d",
        "42124e6c8ba63c12090c276934c302f1443b5766",
        "6d5c22a61e0b4f53e570f387f67d6976ab905404",
        "bcc001481d5d0bfb644f3402fde2826c3b7c4131"
      ],
      "committedAt": "2026-06-18T16:51:53.000Z",
      "generatedAt": "2026-06-18T16:55:16.636Z",
      "committedAtUtc": "2026-06-18T16:51:53.000Z",
      "generatedAtUtc": "2026-06-18T16:55:16.636Z",
      "updatedAtUtc": "2026-06-18T16:55:16.636Z",
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
        "Grouped 11 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-analytics-realtime-hot-cache.generated.json",
        "agent/state/analytics-legacy-history-reconciliation.generated.json",
        "agent/state/analytics-legacy-purgatory-queue.generated.json",
        "agent/state/analytics-legacy-recovery-reconciliation.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/creator-experience-simplification.generated.json",
        "agent/state/creator-monetization-readiness-lock.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/final-parity-telemetry-lock.generated.json",
        "agent/state/ga4-availability-semantics.generated.json",
        "agent/state/ga4-recovery-truth.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/media-discovery-score-lock.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "agent/state/phase-one-lock.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/self-healing-refresh-queue.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "agent/state/user-creator-ui-parity.generated.json",
        "docs/agent-truth/admin-analytics-hot-cache.md",
        "docs/agent-truth/admin-analytics-launch-final.md",
        "docs/agent-truth/admin-analytics-realtime-hot-cache.md",
        "docs/agent-truth/admin-copy-style-guide.md",
        "docs/agent-truth/analytics-legacy-history-reconciliation.md",
        "docs/agent-truth/analytics-legacy-recovery-reconciliation.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/creator-monetization-readiness-lock.md",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/final-parity-telemetry-lock.md",
        "docs/agent-truth/ga4-availability-semantics.md",
        "docs/agent-truth/ga4-recovery-truth.md",
        "docs/agent-truth/human-readable-admin-truth.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/media-discovery-score-lock.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "docs/agent-truth/self-healing-refresh-queue.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-analytics-finalization.ts",
        "scripts/agent/validate-admin-realtime-cutover.ts",
        "scripts/agent/validate-admin-user-metrics-snapshot.ts",
        "scripts/agent/validate-analytics-legacy-recovery-reconciliation.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "scripts/agent/validate-current-beta-exit-status.ts",
        "scripts/agent/validate-human-readable-admin-copy.ts",
        "scripts/agent/validate-phase-one-lock.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "scripts/agent/validate-refresh-based-hot-cache.ts",
        "scripts/agent/validate-self-healing-refresh-queue.ts",
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/debug/components/DebugControlTowerCards.tsx",
        "src/hooks/useAdminOverviewRealtime.ts",
        "src/hooks/useAdminUsersRealtime.ts",
        "src/lib/admin-analytics-live-pulse.ts",
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/admin-parity.ts",
        "src/lib/admin/copy/admin-copy-registry.ts",
        "src/lib/admin/copy/admin-truth-copy.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/agent-score/self-healing-refresh-queue.ts",
        "src/lib/analytics/admin-analytics-display-state.ts",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/analytics/legacy-recovery-reconciler.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-display-state.spec.ts",
        "tests/unit/admin-analytics-live-pulse.spec.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-debug-control-tower-component.spec.tsx",
        "tests/unit/admin-debug-control-tower.spec.ts",
        "tests/unit/admin-truth-copy.spec.ts",
        "tests/unit/analytics-legacy-recovery-reconciliation.spec.ts",
        "tests/unit/debug-control-tower-cards.spec.tsx",
        "tests/unit/public-beta-score.spec.ts",
        "tests/unit/self-healing-refresh-queue.spec.ts"
      ],
      "sourceCommit": "bcc001481d5d0bfb644f3402fde2826c3b7c4131"
    },
    {
      "version": "1.6.1",
      "previousVersion": "1.6.0",
      "betaReleaseCounter": 601,
      "previousBetaReleaseCounter": 600,
      "commitSha": "bfc2e9f4d4b657988659e671c2452037d34f4a0c",
      "commitTitle": "fix(admin): simplify debug report cards",
      "commitCount": 2,
      "commitShas": [
        "0e36338fc2a827705d72b9c3b6920e80c9097368",
        "bfc2e9f4d4b657988659e671c2452037d34f4a0c"
      ],
      "committedAt": "2026-06-18T15:29:52.000Z",
      "generatedAt": "2026-06-18T15:30:10.278Z",
      "committedAtUtc": "2026-06-18T15:29:52.000Z",
      "generatedAtUtc": "2026-06-18T15:30:10.278Z",
      "updatedAtUtc": "2026-06-18T15:30:10.278Z",
      "category": "Fixed",
      "title": "Cleaner Admin Debug evidence cards",
      "summary": "Improved Admin Debug so proof gates and report rows use clearer action-focused states.",
      "userFacingTitle": "Cleaner Admin Debug evidence cards",
      "surfaceCategory": "App experience",
      "bullets": [
        "Proof gates now show action-focused evidence states instead of raw generated-report wording.",
        "Report cards now show last-updated status first, with refresh commands kept inside source detail."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 2 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "admin"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/current-beta-exit-status.generated.json",
        "public/kandydrops-release-notes.json",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/app/admin/debug/components/DebugControlTowerCards.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-debug-control-tower-component.spec.tsx"
      ],
      "sourceCommit": "bfc2e9f4d4b657988659e671c2452037d34f4a0c"
    },
    {
      "version": "1.6.0",
      "previousVersion": "1.5.99",
      "betaReleaseCounter": 600,
      "previousBetaReleaseCounter": 599,
      "commitSha": "895d934a268a429518cd702abbf17fd08e7cd66e",
      "commitTitle": "fix(admin): clarify evidence proof states",
      "commitCount": 2,
      "commitShas": [
        "047a3d4be7a24fc7a93088270f0b38054ac9b204",
        "895d934a268a429518cd702abbf17fd08e7cd66e"
      ],
      "committedAt": "2026-06-18T15:23:55.000Z",
      "generatedAt": "2026-06-18T15:24:09.256Z",
      "committedAtUtc": "2026-06-18T15:23:55.000Z",
      "generatedAtUtc": "2026-06-18T15:24:09.256Z",
      "updatedAtUtc": "2026-06-18T15:24:09.256Z",
      "category": "Fixed",
      "title": "Cleaner Admin Debug evidence states",
      "summary": "Improved Admin Debug so validation and proof gates are easier to scan without raw generated-report labels.",
      "userFacingTitle": "Cleaner Admin Debug evidence states",
      "surfaceCategory": "App experience",
      "bullets": [
        "Data Validation now uses one issue total in the header while keeping detailed source evidence inside the panel.",
        "Proof gates now say what action is needed instead of showing raw unknown or stale evidence labels."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 2 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "admin"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/current-beta-exit-status.generated.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-debug-control-tower-component.spec.tsx",
        "tests/unit/data-validation-ui-semantic-cleanup.spec.ts"
      ],
      "sourceCommit": "895d934a268a429518cd702abbf17fd08e7cd66e"
    },
    {
      "version": "1.5.99",
      "previousVersion": "1.5.98",
      "betaReleaseCounter": 599,
      "previousBetaReleaseCounter": 598,
      "commitSha": "355aee69957a969c9d9958145ee73084f73f22f1",
      "commitTitle": "fix(admin): compact debug data validation",
      "commitCount": 1,
      "commitShas": [
        "355aee69957a969c9d9958145ee73084f73f22f1"
      ],
      "committedAt": "2026-06-18T15:16:07.000Z",
      "generatedAt": "2026-06-18T15:16:21.856Z",
      "committedAtUtc": "2026-06-18T15:16:07.000Z",
      "generatedAtUtc": "2026-06-18T15:16:21.856Z",
      "updatedAtUtc": "2026-06-18T15:16:21.856Z",
      "category": "Fixed",
      "title": "Cleaner Admin Debug validation",
      "summary": "Compact Admin Debug Data Validation so source, chart, parity, and blocked-pass states are easier to scan.",
      "userFacingTitle": "Cleaner Admin Debug validation",
      "surfaceCategory": "App experience",
      "bullets": [
        "Compact Data Validation now shows one issue total instead of repeating every validation state in the header.",
        "Detailed source, chart, parity, and blocked-pass evidence stays available in the panel body."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx",
        "tests/unit/data-validation-ui-semantic-cleanup.spec.ts"
      ],
      "sourceCommit": "355aee69957a969c9d9958145ee73084f73f22f1"
    },
    {
      "version": "1.5.98",
      "previousVersion": "1.5.97",
      "betaReleaseCounter": 598,
      "previousBetaReleaseCounter": 597,
      "commitSha": "249216111a5757af71cca4a64c17599625526b81",
      "commitTitle": "fix(admin): clarify analytics source blockers",
      "commitCount": 6,
      "commitShas": [
        "d9ab7f4855cab20ff888751d85f8ec616d8785cc",
        "ba822abce140a896b0b9ddeb2cd988410380ba03",
        "cd48ba4f9aa0591cbde774c7057c2ea2badb66ac",
        "4e2a47a10b19311e1feb406410473919ef3585b3",
        "8155e9b5051e2734d6b44fbd5432b3e8cc2ff5df",
        "249216111a5757af71cca4a64c17599625526b81"
      ],
      "committedAt": "2026-06-18T15:08:26.000Z",
      "generatedAt": "2026-06-18T15:09:26.753Z",
      "committedAtUtc": "2026-06-18T15:08:26.000Z",
      "generatedAtUtc": "2026-06-18T15:09:26.753Z",
      "updatedAtUtc": "2026-06-18T15:09:26.753Z",
      "category": "Fixed",
      "title": "Clearer Admin Analytics source status",
      "summary": "Improved Admin Analytics so source agreement, launch history recovery, and missing evidence states are easier to understand.",
      "userFacingTitle": "Clearer Admin Analytics source status",
      "surfaceCategory": "App experience",
      "bullets": [
        "Clarified when analytics history is recovered from first-party sources.",
        "Kept GA4 and legacy analytics labeled as evidence instead of product truth.",
        "Improved Admin Analytics source labels so missing data is not shown as zero."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 6 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/chart-readiness-hierarchy-repair.generated.json",
        "agent/state/codebase-hardening.generated.json",
        "agent/state/debug-cockpit-batch29-analytics-source-hierarchy.generated.json",
        "agent/state/device-ui-dry-audit.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/self-healing-refresh-queue.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "agent/state/speed-security-hardening.generated.json",
        "docs/agent-truth/chart-readiness-hierarchy-repair.md",
        "docs/agent-truth/debug-cockpit-batch29-analytics-source-hierarchy.md",
        "docs/agent-truth/self-healing-refresh-queue.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared.ts",
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/debug/components/DebugAdvancedDataValidation.tsx",
        "src/app/admin/debug/components/DebugControlTowerCards.tsx",
        "src/app/api/admin/analytics/historical/route.ts",
        "src/lib/analytics/admin-analytics-source-hierarchy.ts",
        "src/lib/debug/debug-cockpit-batch28-bug-validation.ts",
        "src/lib/server/api-cost-contract.ts",
        "src/lib/server/route-cache-contract.ts",
        "src/lib/server/security-hardening-contract.ts",
        "tests/unit/admin-analytics-historical-traffic.spec.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-debug-control-tower-component.spec.tsx",
        "tests/unit/data-validation-ui-semantic-cleanup.spec.ts"
      ],
      "sourceCommit": "249216111a5757af71cca4a64c17599625526b81"
    },
    {
      "version": "1.5.97",
      "previousVersion": "1.5.96",
      "betaReleaseCounter": 597,
      "previousBetaReleaseCounter": 596,
      "commitSha": "4378b15dd43fd41430deb989ec9a9854b9b6f71f",
      "commitTitle": "fix(admin): clarify control tower evidence gates",
      "commitCount": 5,
      "commitShas": [
        "546b6a1d9b82d96c099cc9217f5fec24826ff4d8",
        "55875cd9a2401cc264e87807ebfa2952cb6d04c6",
        "64bff1184f84d1164677baa16134dfc880947083",
        "2d59e1c0a3947ab095f88c152443d086025bfbec",
        "4378b15dd43fd41430deb989ec9a9854b9b6f71f"
      ],
      "committedAt": "2026-06-18T14:10:37.000Z",
      "generatedAt": "2026-06-18T14:13:23.852Z",
      "committedAtUtc": "2026-06-18T14:10:37.000Z",
      "generatedAtUtc": "2026-06-18T14:13:23.852Z",
      "updatedAtUtc": "2026-06-18T14:13:23.852Z",
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
        "Grouped 5 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "admin",
        "drops-viewer",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/debug-cockpit-batch29-analytics-source-hierarchy-shared.ts",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/app/admin/debug/components/DebugControlTowerCards.tsx",
        "src/app/admin/drops/page.tsx",
        "src/app/admin/users/page.tsx",
        "src/components/Admin/BalanceAdjustmentPanel.tsx",
        "src/components/Admin/CreateDropModal.tsx",
        "src/components/Admin/TransactionHistoryPanel.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-debug-control-tower-component.spec.tsx",
        "tests/unit/admin-drops-fixture-boundary.spec.ts",
        "tests/unit/source-agreement-failure-detail.spec.ts"
      ],
      "sourceCommit": "4378b15dd43fd41430deb989ec9a9854b9b6f71f"
    },
    {
      "version": "1.5.96",
      "previousVersion": "1.5.95",
      "betaReleaseCounter": 596,
      "previousBetaReleaseCounter": 595,
      "commitSha": "1a55854756b23ac23e7b9317a235f30897420c37",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 2,
      "commitShas": [
        "7e09078d10eaa2a706ccde0f9ba7f1226c0fc114",
        "1a55854756b23ac23e7b9317a235f30897420c37"
      ],
      "committedAt": "2026-06-18T12:17:36.000Z",
      "generatedAt": "2026-06-18T12:18:13.802Z",
      "committedAtUtc": "2026-06-18T12:17:36.000Z",
      "generatedAtUtc": "2026-06-18T12:18:13.802Z",
      "updatedAtUtc": "2026-06-18T12:18:13.802Z",
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
        "drops-viewer",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/drops/page.tsx",
        "src/components/Admin/CreateDropModal.tsx",
        "src/lib/analytics/source-agreement-detail.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-drops-fixture-boundary.spec.ts",
        "tests/unit/source-agreement-failure-detail.spec.ts"
      ],
      "sourceCommit": "1a55854756b23ac23e7b9317a235f30897420c37"
    },
    {
      "version": "1.5.95",
      "previousVersion": "1.5.94",
      "betaReleaseCounter": 595,
      "previousBetaReleaseCounter": 594,
      "commitSha": "c8830566965c5a5ef99e53d2d738aceb665b0fa8",
      "commitTitle": "analytics: verify launch coverage row counts",
      "commitCount": 2,
      "commitShas": [
        "facca2321b8b74acec8874d94414302a27c3888c",
        "c8830566965c5a5ef99e53d2d738aceb665b0fa8"
      ],
      "committedAt": "2026-06-18T12:03:34.000Z",
      "generatedAt": "2026-06-18T12:03:59.930Z",
      "committedAtUtc": "2026-06-18T12:03:34.000Z",
      "generatedAtUtc": "2026-06-18T12:03:59.930Z",
      "updatedAtUtc": "2026-06-18T12:03:59.930Z",
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
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/analytics/source-agreement-detail.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/source-agreement-failure-detail.spec.ts"
      ],
      "sourceCommit": "c8830566965c5a5ef99e53d2d738aceb665b0fa8"
    },
    {
      "version": "1.5.94",
      "previousVersion": "1.5.93",
      "betaReleaseCounter": 594,
      "previousBetaReleaseCounter": 593,
      "commitSha": "60f70dbb4b1c122c7cefd8b00d05c4e1a145982a",
      "commitTitle": "analytics: retire stale source agreement cleanup lane",
      "commitCount": 2,
      "commitShas": [
        "bb8b907c3e9c688ed92cc689502ebe08f9c988f7",
        "60f70dbb4b1c122c7cefd8b00d05c4e1a145982a"
      ],
      "committedAt": "2026-06-18T11:51:32.000Z",
      "generatedAt": "2026-06-18T11:52:01.056Z",
      "committedAtUtc": "2026-06-18T11:51:32.000Z",
      "generatedAtUtc": "2026-06-18T11:52:01.056Z",
      "updatedAtUtc": "2026-06-18T11:52:01.056Z",
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
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-historical-validation.ts",
        "src/types/admin-analytics.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-data-validation.spec.ts"
      ],
      "sourceCommit": "60f70dbb4b1c122c7cefd8b00d05c4e1a145982a"
    },
    {
      "version": "1.5.93",
      "previousVersion": "1.5.92",
      "betaReleaseCounter": 593,
      "previousBetaReleaseCounter": 592,
      "commitSha": "e6216fcf3b43ea17bac16676ec02bc1e2cba533f",
      "commitTitle": "analytics: label launch recovery proof windows",
      "commitCount": 2,
      "commitShas": [
        "a6e5357dee5b27a8be25c7ec3259401f6d119d07",
        "e6216fcf3b43ea17bac16676ec02bc1e2cba533f"
      ],
      "committedAt": "2026-06-18T11:36:29.000Z",
      "generatedAt": "2026-06-18T11:37:09.481Z",
      "committedAtUtc": "2026-06-18T11:36:29.000Z",
      "generatedAtUtc": "2026-06-18T11:37:09.481Z",
      "updatedAtUtc": "2026-06-18T11:37:09.481Z",
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
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/components/Admin/AiDropCoverGeneratorPanel.tsx",
        "src/components/Admin/AiDropDescriptionGeneratorPanel.tsx",
        "src/components/Admin/CreateDropModal.tsx",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-historical-validation.ts",
        "src/types/admin-analytics.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-data-validation.spec.ts"
      ],
      "sourceCommit": "e6216fcf3b43ea17bac16676ec02bc1e2cba533f"
    },
    {
      "version": "1.5.92",
      "previousVersion": "1.5.91",
      "betaReleaseCounter": 592,
      "previousBetaReleaseCounter": 591,
      "commitSha": "dbb8b712b77473f9f9f50561ba7e8cc8e88c9a4d",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 2,
      "commitShas": [
        "a369a651d2012b5dd8190eb3c2421ed5dfa37df8",
        "dbb8b712b77473f9f9f50561ba7e8cc8e88c9a4d"
      ],
      "committedAt": "2026-06-18T11:00:21.000Z",
      "generatedAt": "2026-06-18T11:12:34.826Z",
      "committedAtUtc": "2026-06-18T11:00:21.000Z",
      "generatedAtUtc": "2026-06-18T11:12:34.826Z",
      "updatedAtUtc": "2026-06-18T11:12:34.826Z",
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
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/components/Admin/AiDropCoverGeneratorPanel.tsx",
        "src/components/Admin/AiDropDescriptionGeneratorPanel.tsx",
        "src/components/Admin/CreateDropModal.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/telemetry-catalog.ts"
      ],
      "sourceCommit": "dbb8b712b77473f9f9f50561ba7e8cc8e88c9a4d"
    },
    {
      "version": "1.5.91",
      "previousVersion": "1.5.90",
      "betaReleaseCounter": 591,
      "previousBetaReleaseCounter": 590,
      "commitSha": "edcc1b76f3c3f12aded0051b5cd9f4d3743bad93",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 2,
      "commitShas": [
        "3e4bb6df95eb7268be35a461862114b1a8f1e562",
        "edcc1b76f3c3f12aded0051b5cd9f4d3743bad93"
      ],
      "committedAt": "2026-06-18T10:45:02.000Z",
      "generatedAt": "2026-06-18T10:45:47.559Z",
      "committedAtUtc": "2026-06-18T10:45:02.000Z",
      "generatedAtUtc": "2026-06-18T10:45:47.559Z",
      "updatedAtUtc": "2026-06-18T10:45:47.559Z",
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
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/page.tsx",
        "src/components/Admin/CreateDropModal.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-page.spec.tsx"
      ],
      "sourceCommit": "edcc1b76f3c3f12aded0051b5cd9f4d3743bad93"
    },
    {
      "version": "1.5.90",
      "previousVersion": "1.5.89",
      "betaReleaseCounter": 590,
      "previousBetaReleaseCounter": 589,
      "commitSha": "404d9037c67fdad6398e002b31985b2c31c62b12",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 5,
      "commitShas": [
        "6cd20ca9ab677996e9a22af28a97e4c1177e55c0",
        "889367e7f7863e2684264003cbb4a133c63891ef",
        "76843f60d482cf7bbe05c9e5f404858fe04782aa",
        "80d1eec4ad6f6140871934d0d6effca5551188cc",
        "404d9037c67fdad6398e002b31985b2c31c62b12"
      ],
      "committedAt": "2026-06-18T10:18:19.000Z",
      "generatedAt": "2026-06-18T10:27:15.177Z",
      "committedAtUtc": "2026-06-18T10:18:19.000Z",
      "generatedAtUtc": "2026-06-18T10:27:15.177Z",
      "updatedAtUtc": "2026-06-18T10:27:15.177Z",
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
        "Grouped 5 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "account-onboarding",
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/source-agreement-failure-detail.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "docs/agent-truth/source-agreement-failure-detail.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/admin/analytics/page.tsx",
        "src/components/Admin/Analytics/AdminOnboardingAnalyticsModules.tsx",
        "src/lib/admin-analytics-auth-outcome-split.ts",
        "src/lib/admin-analytics-contracts.ts",
        "src/lib/admin-analytics-event-mix.ts",
        "src/lib/admin-analytics-guest-bounce-quality.ts",
        "src/lib/admin-analytics-journey-funnel.ts",
        "src/lib/admin-analytics-live-interaction-stream.ts",
        "src/lib/admin-analytics-live-pulse.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-historical-validation.ts",
        "src/types/admin-analytics.ts",
        "tests/unit/admin-analytics-event-mix.spec.ts",
        "tests/unit/admin-analytics-guest-bounce-quality.spec.ts",
        "tests/unit/admin-analytics-journey-funnel.spec.ts",
        "tests/unit/admin-analytics-live-interaction-stream.spec.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-data-validation.spec.ts",
        "tests/unit/admin-onboarding-analytics-mobile.spec.ts",
        "tests/unit/analytics-panel-hydration.spec.ts"
      ],
      "sourceCommit": "404d9037c67fdad6398e002b31985b2c31c62b12"
    },
    {
      "version": "1.5.89",
      "previousVersion": "1.5.88",
      "betaReleaseCounter": 589,
      "previousBetaReleaseCounter": 588,
      "commitSha": "12391873198f9457193476fd262075283ffa11aa",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 3,
      "commitShas": [
        "b923482e963babe6db4367c780fe43df88cc8388",
        "6d8f75b9ff4f23fa9c506ec651ca264d3c387918",
        "12391873198f9457193476fd262075283ffa11aa"
      ],
      "committedAt": "2026-06-18T06:54:00.000Z",
      "generatedAt": "2026-06-18T07:00:28.928Z",
      "committedAtUtc": "2026-06-18T06:54:00.000Z",
      "generatedAtUtc": "2026-06-18T07:00:28.928Z",
      "updatedAtUtc": "2026-06-18T07:00:28.928Z",
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
        "Grouped 3 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/app/admin/roster/page.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-debug-control-tower-component.spec.tsx",
        "tests/unit/admin-debug-control-tower.spec.ts"
      ],
      "sourceCommit": "12391873198f9457193476fd262075283ffa11aa"
    },
    {
      "version": "1.5.88",
      "previousVersion": "1.5.87",
      "betaReleaseCounter": 588,
      "previousBetaReleaseCounter": 587,
      "commitSha": "e03a49c5ce8a670671c5b440496f8cb7bd07893f",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 2,
      "commitShas": [
        "d2cbf3d54f31d5c7c8b6cd3a2ba9475f3c35f9d8",
        "e03a49c5ce8a670671c5b440496f8cb7bd07893f"
      ],
      "committedAt": "2026-06-18T05:31:53.000Z",
      "generatedAt": "2026-06-18T05:45:25.379Z",
      "committedAtUtc": "2026-06-18T05:31:53.000Z",
      "generatedAtUtc": "2026-06-18T05:45:25.379Z",
      "updatedAtUtc": "2026-06-18T05:45:25.379Z",
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
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "scripts/agent/validate-creator-monetization-readiness-lock.ts",
        "scripts/agent/validate-debug-signal-actionability.ts",
        "scripts/agent/validate-debug-signal-grouping.ts",
        "scripts/agent/validate-final-parity-telemetry-lock.ts",
        "scripts/agent/validate-media-discovery-score-lock.ts",
        "scripts/agent/validate-score-80-refresh-pass.ts",
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/debug/components/DebugPanelStatusBySection.tsx",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-page.spec.tsx"
      ],
      "sourceCommit": "e03a49c5ce8a670671c5b440496f8cb7bd07893f"
    },
    {
      "version": "1.5.87",
      "previousVersion": "1.5.86",
      "betaReleaseCounter": 587,
      "previousBetaReleaseCounter": 586,
      "commitSha": "05f05c4d3941ab1999608032c4bd72e5da6064b2",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 1,
      "commitShas": [
        "05f05c4d3941ab1999608032c4bd72e5da6064b2"
      ],
      "committedAt": "2026-06-18T04:06:35.000Z",
      "generatedAt": "2026-06-18T04:21:01.560Z",
      "committedAtUtc": "2026-06-18T04:06:35.000Z",
      "generatedAtUtc": "2026-06-18T04:21:01.560Z",
      "updatedAtUtc": "2026-06-18T04:21:01.560Z",
      "category": "Fixed",
      "title": "Admin moderation review is clearer",
      "summary": "Admin moderation now separates weak evidence, missing proof, and confirmed review states more clearly.",
      "userFacingTitle": "Admin moderation review is clearer",
      "surfaceCategory": "App experience",
      "bullets": [
        "Clarified admin moderation risk states without treating weak evidence as confirmed proof.",
        "Kept missing evidence visible so review queues do not look healthier than they are."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "admin"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "docs/agent-truth/admin-moderation-real-risk.md",
        "scripts/agent/validate-admin-moderation-real-risk.ts",
        "src/components/Admin/AdminModerationConsole.tsx",
        "tests/unit/admin-moderation-console-ui.spec.ts"
      ],
      "sourceCommit": "05f05c4d3941ab1999608032c4bd72e5da6064b2"
    },
    {
      "version": "1.5.86",
      "previousVersion": "1.5.85",
      "betaReleaseCounter": 586,
      "previousBetaReleaseCounter": 585,
      "commitSha": "777e86944a2ff4de132ac4040959fd5261e84326",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 3,
      "commitShas": [
        "d4184ef0ca51c45eb662489ab064016adbcf3d25",
        "9bc587e3d122a0e82a0ae7174ab247b517fc1a85",
        "777e86944a2ff4de132ac4040959fd5261e84326"
      ],
      "committedAt": "2026-06-18T02:40:58.000Z",
      "generatedAt": "2026-06-18T02:42:05.593Z",
      "committedAtUtc": "2026-06-18T02:40:58.000Z",
      "generatedAtUtc": "2026-06-18T02:42:05.593Z",
      "updatedAtUtc": "2026-06-18T02:42:05.593Z",
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
        "Grouped 3 commits into one accepted patch batch."
      ],
      "affectedSurfaces": [
        "admin",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/app/admin/analytics/components/AdminAnalyticsOperationsTab.tsx",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/admin/analytics/page.tsx",
        "src/components/Admin/CreateDropModal.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/create-drop-modal-upload-block.spec.tsx"
      ],
      "sourceCommit": "777e86944a2ff4de132ac4040959fd5261e84326"
    },
    {
      "version": "1.5.85",
      "previousVersion": "1.5.84",
      "betaReleaseCounter": 585,
      "previousBetaReleaseCounter": 584,
      "commitSha": "470a3623e547c6f5f32d0f87ef98745c49fc7574",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 1,
      "commitShas": [
        "470a3623e547c6f5f32d0f87ef98745c49fc7574"
      ],
      "committedAt": "2026-06-18T01:10:02.000Z",
      "generatedAt": "2026-06-18T01:20:18.629Z",
      "committedAtUtc": "2026-06-18T01:10:02.000Z",
      "generatedAtUtc": "2026-06-18T01:20:18.629Z",
      "updatedAtUtc": "2026-06-18T01:20:18.629Z",
      "category": "Fixed",
      "title": "Cleaner admin drop actions",
      "summary": "Admin drop actions now stay in the page by default, so admins can review and finish the task without a separate overlay.",
      "userFacingTitle": "Cleaner admin drop actions",
      "surfaceCategory": "App experience",
      "bullets": [
        "Admin drop actions open in place by default.",
        "Creator drop submission keeps its existing flow."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "admin"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/admin-surface-modal-replacement.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "src/components/Admin/CreateDropModal.tsx"
      ],
      "sourceCommit": "470a3623e547c6f5f32d0f87ef98745c49fc7574"
    },
    {
      "version": "1.5.84",
      "previousVersion": "1.5.83",
      "betaReleaseCounter": 584,
      "previousBetaReleaseCounter": 583,
      "commitSha": "7c0de649892079e85dbc8884035baf6602656fcb",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 2,
      "commitShas": [
        "5d2504fb030e5ef22a7e91f0f10b349297488326",
        "7c0de649892079e85dbc8884035baf6602656fcb"
      ],
      "committedAt": "2026-06-18T00:39:28.000Z",
      "generatedAt": "2026-06-18T00:41:45.267Z",
      "committedAtUtc": "2026-06-18T00:39:28.000Z",
      "generatedAtUtc": "2026-06-18T00:41:45.267Z",
      "updatedAtUtc": "2026-06-18T00:41:45.267Z",
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
        "drops-viewer",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/drops/page.tsx",
        "src/components/Admin/CreateDropModal.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-drops-fixture-boundary.spec.ts",
        "tests/unit/create-drop-modal-upload-block.spec.tsx"
      ],
      "sourceCommit": "7c0de649892079e85dbc8884035baf6602656fcb"
    },
    {
      "version": "1.5.83",
      "previousVersion": "1.5.82",
      "betaReleaseCounter": 583,
      "previousBetaReleaseCounter": 582,
      "commitSha": "29341a2449f0d25faf3caa2ed8173e33bb86415f",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 1,
      "commitShas": [
        "29341a2449f0d25faf3caa2ed8173e33bb86415f"
      ],
      "committedAt": "2026-06-18T00:20:04.000Z",
      "generatedAt": "2026-06-18T00:20:36.966Z",
      "committedAtUtc": "2026-06-18T00:20:04.000Z",
      "generatedAtUtc": "2026-06-18T00:20:36.966Z",
      "updatedAtUtc": "2026-06-18T00:20:36.966Z",
      "category": "Fixed",
      "title": "Clearer Admin Analytics source status",
      "summary": "Improved Admin Analytics so source agreement, launch history recovery, and missing evidence states are easier to understand.",
      "userFacingTitle": "Clearer Admin Analytics source status",
      "surfaceCategory": "App experience",
      "bullets": [
        "Clarified when analytics history is recovered from first-party sources.",
        "Kept GA4 and legacy analytics labeled as evidence instead of product truth.",
        "Improved Admin Analytics source labels so missing data is not shown as zero."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/admin-surface-modal-replacement.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "src/app/admin/analytics/page.tsx",
        "tests/unit/admin-analytics-page.spec.tsx"
      ],
      "sourceCommit": "29341a2449f0d25faf3caa2ed8173e33bb86415f"
    },
    {
      "version": "1.5.82",
      "previousVersion": "1.5.81",
      "betaReleaseCounter": 582,
      "previousBetaReleaseCounter": 581,
      "commitSha": "ed52d56375c448742f08808d67668a04cf8d577a",
      "commitTitle": "analytics: classify launch source agreement gaps",
      "commitCount": 1,
      "commitShas": [
        "ed52d56375c448742f08808d67668a04cf8d577a"
      ],
      "committedAt": "2026-06-18T00:10:16.000Z",
      "generatedAt": "2026-06-18T00:10:42.876Z",
      "committedAtUtc": "2026-06-18T00:10:16.000Z",
      "generatedAtUtc": "2026-06-18T00:10:42.876Z",
      "updatedAtUtc": "2026-06-18T00:10:42.876Z",
      "category": "Fixed",
      "title": "Clearer Admin Analytics source status",
      "summary": "Improved Admin Analytics so source agreement, launch history recovery, and missing evidence states are easier to understand.",
      "userFacingTitle": "Clearer Admin Analytics source status",
      "surfaceCategory": "App experience",
      "bullets": [
        "Clarified when analytics history is recovered from first-party sources.",
        "Kept GA4 and legacy analytics labeled as evidence instead of product truth.",
        "Improved Admin Analytics source labels so missing data is not shown as zero."
      ],
      "audience": "all",
      "affectedSurfaces": [
        "app"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "src/lib/server/admin-analytics-historical-validation.ts",
        "src/types/admin-analytics.ts",
        "tests/unit/admin-data-validation.spec.ts"
      ],
      "sourceCommit": "ed52d56375c448742f08808d67668a04cf8d577a"
    },
    {
      "version": "1.5.81",
      "previousVersion": "1.5.80",
      "betaReleaseCounter": 581,
      "previousBetaReleaseCounter": 580,
      "commitSha": "baad3fda8c2c3daee290eaaf1fea4206df5ad84f",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 2,
      "commitShas": [
        "df13950384a448a1868c1f295b4811fcae9f57da",
        "baad3fda8c2c3daee290eaaf1fea4206df5ad84f"
      ],
      "committedAt": "2026-06-17T23:52:49.000Z",
      "generatedAt": "2026-06-17T23:53:31.573Z",
      "committedAtUtc": "2026-06-17T23:52:49.000Z",
      "generatedAtUtc": "2026-06-17T23:53:31.573Z",
      "updatedAtUtc": "2026-06-17T23:53:31.573Z",
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
        "drops-viewer",
        "navigation"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "public/kandydrops-release-notes.json",
        "src/app/admin/analytics/page.tsx",
        "src/app/admin/drops/page.tsx",
        "src/components/Admin/AdminDropsAtGlancePanel.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/admin-analytics-page.spec.tsx"
      ],
      "sourceCommit": "baad3fda8c2c3daee290eaaf1fea4206df5ad84f"
    },
    {
      "version": "1.5.80",
      "previousVersion": "1.5.79",
      "betaReleaseCounter": 580,
      "previousBetaReleaseCounter": 579,
      "commitSha": "b4a9133d19e95e6dd8f3594c2ee4486493ce20db",
      "commitTitle": "fix(admin): simplify surface actions",
      "commitCount": 2,
      "commitShas": [
        "9d3de6c712134dd3245e5d35e53c834b0767c82c",
        "b4a9133d19e95e6dd8f3594c2ee4486493ce20db"
      ],
      "committedAt": "2026-06-17T23:35:25.000Z",
      "generatedAt": "2026-06-17T23:36:15.796Z",
      "committedAtUtc": "2026-06-17T23:35:25.000Z",
      "generatedAtUtc": "2026-06-17T23:36:15.796Z",
      "updatedAtUtc": "2026-06-17T23:36:15.796Z",
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
        "agent/state/admin-surface-modal-replacement.generated.json",
        "agent/state/analytics-panel-hydration.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/launch-analytics-recovery.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/admin-surface-modal-replacement.md",
        "docs/agent-truth/analytics-panel-hydration.md",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/launch-analytics-recovery.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-analytics-panel-hydration.ts",
        "scripts/release/update-public-changelog.ts",
        "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
        "src/app/admin/analytics/page.tsx",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-historical-validation.ts",
        "src/types/admin-analytics.ts",
        "tests/unit/admin-analytics-page.spec.tsx",
        "tests/unit/admin-data-validation.spec.ts"
      ],
      "sourceCommit": "b4a9133d19e95e6dd8f3594c2ee4486493ce20db"
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
