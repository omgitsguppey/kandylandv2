import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.35.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T00:40:50.880Z",
  "generatedAtUtc": "2026-05-06T00:40:50.880Z",
  "lastCommitSha": "91ab9d6700726f95ec0dc2f0dfbaaa87c538c799",
  "notes": [
    {
      "version": "1.35.0",
      "previousVersion": "1.34.0",
      "commitSha": "91ab9d6700726f95ec0dc2f0dfbaaa87c538c799",
      "commitTitle": "fix(creator): classify synthetic agreement evidence",
      "committedAt": "2026-05-06T00:40:26.000Z",
      "generatedAt": "2026-05-06T00:40:50.880Z",
      "committedAtUtc": "2026-05-06T00:40:26.000Z",
      "generatedAtUtc": "2026-05-06T00:40:50.880Z",
      "diffStats": {
        "rawAdditions": 542,
        "rawDeletions": 35,
        "rawChangeCount": 577,
        "additions": 542,
        "deletions": 35,
        "effectiveAdditions": 540,
        "effectiveDeletions": 33,
        "changedFiles": 26,
        "effectiveChangeCount": 573,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal creator classification checks.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "documentation",
        "repo-tooling",
        "telemetry"
      ]
    },
    {
      "version": "1.34.0",
      "previousVersion": "1.33.0",
      "commitSha": "ca194e18799da898e45e3a649f777afb10b1bdf1",
      "commitTitle": "fix(creator): require default live creator settings",
      "committedAt": "2026-05-06T00:04:10.000Z",
      "generatedAt": "2026-05-06T00:40:50.502Z",
      "committedAtUtc": "2026-05-06T00:04:10.000Z",
      "generatedAtUtc": "2026-05-06T00:40:50.502Z",
      "diffStats": {
        "rawAdditions": 698,
        "rawDeletions": 89,
        "rawChangeCount": 787,
        "additions": 698,
        "deletions": 89,
        "effectiveAdditions": 546,
        "effectiveDeletions": 13,
        "changedFiles": 20,
        "effectiveChangeCount": 559,
        "excludedGeneratedChangeCount": 228
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal creator experience defaults for beta reliability.",
      "bullets": [
        "Beta notes stay user-safe while preserving enough detail for support follow-up.",
        "UTC timestamps make updates easier to compare with screenshots, reports, and incidents."
      ],
      "affectedSurfaces": [
        "admin",
        "documentation",
        "release-notes",
        "repo-tooling"
      ]
    },
    {
      "version": "1.33.0",
      "previousVersion": "1.32.0",
      "commitSha": "fa7cd3ed494b6e06dc32cfb5221f28bed48a1cb5",
      "commitTitle": "fix(drops): clarify preview cover entitlement states",
      "committedAt": "2026-05-05T22:44:37.000Z",
      "generatedAt": "2026-05-05T23:56:39.730Z",
      "committedAtUtc": "2026-05-05T22:44:37.000Z",
      "generatedAtUtc": "2026-05-05T23:56:39.730Z",
      "diffStats": {
        "rawAdditions": 364,
        "rawDeletions": 90,
        "rawChangeCount": 454,
        "additions": 364,
        "deletions": 90,
        "effectiveAdditions": 364,
        "effectiveDeletions": 90,
        "changedFiles": 12,
        "effectiveChangeCount": 454,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Fixed a beta issue to make KandyDrops smoother to use.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "telemetry"
      ]
    },
    {
      "version": "1.32.0",
      "previousVersion": "1.31.0",
      "commitSha": "0a24f04764c97507d4e318e92ec8af5b5da3328a",
      "commitTitle": "fix(drops): allow creator cover preview sharing",
      "committedAt": "2026-05-05T22:33:59.000Z",
      "generatedAt": "2026-05-05T23:56:39.393Z",
      "committedAtUtc": "2026-05-05T22:33:59.000Z",
      "generatedAtUtc": "2026-05-05T23:56:39.393Z",
      "diffStats": {
        "rawAdditions": 241,
        "rawDeletions": 18,
        "rawChangeCount": 259,
        "additions": 241,
        "deletions": 18,
        "effectiveAdditions": 241,
        "effectiveDeletions": 18,
        "changedFiles": 7,
        "effectiveChangeCount": 259,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Fixed a beta issue to make KandyDrops smoother to use.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "telemetry"
      ]
    },
    {
      "version": "1.31.0",
      "previousVersion": "1.30.0",
      "commitSha": "2598da003f071e915bdc3aeb9f86d4657ad1e274",
      "commitTitle": "fix(admin): downgrade optional owner override reason",
      "committedAt": "2026-05-05T22:19:17.000Z",
      "generatedAt": "2026-05-05T22:19:29.625Z",
      "committedAtUtc": "2026-05-05T22:19:17.000Z",
      "generatedAtUtc": "2026-05-05T22:19:29.625Z",
      "diffStats": {
        "rawAdditions": 200,
        "rawDeletions": 31,
        "rawChangeCount": 231,
        "additions": 200,
        "deletions": 31,
        "effectiveAdditions": 195,
        "effectiveDeletions": 28,
        "changedFiles": 15,
        "effectiveChangeCount": 223,
        "excludedGeneratedChangeCount": 8
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Adjusted internal creator review warnings to match admin override rules.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "documentation",
        "repo-tooling"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
