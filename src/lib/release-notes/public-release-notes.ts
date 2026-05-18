import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.2.77",
  "betaReleaseCounter": 277,
  "channel": "beta",
  "generatedAt": "2026-05-18T04:39:33.805Z",
  "generatedAtUtc": "2026-05-18T04:39:33.805Z",
  "lastCommitSha": "5804de2bee6bb7ee37b6764af26094c391d03abf",
  "notes": [
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
