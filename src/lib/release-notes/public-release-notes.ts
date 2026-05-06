import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.33.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T23:56:39.730Z",
  "generatedAtUtc": "2026-05-05T23:56:39.730Z",
  "lastCommitSha": "fa7cd3ed494b6e06dc32cfb5221f28bed48a1cb5",
  "notes": [
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
    },
    {
      "version": "1.30.0",
      "previousVersion": "1.29.0",
      "commitSha": "a0973fdb3d307dd0e79e0ec1ab9bb96f875e0e02",
      "commitTitle": "fix(creator): annotate missing ID request history evidence",
      "committedAt": "2026-05-05T22:05:42.000Z",
      "generatedAt": "2026-05-05T22:05:58.505Z",
      "committedAtUtc": "2026-05-05T22:05:42.000Z",
      "generatedAtUtc": "2026-05-05T22:05:58.505Z",
      "diffStats": {
        "rawAdditions": 268,
        "rawDeletions": 4,
        "rawChangeCount": 272,
        "additions": 268,
        "deletions": 4,
        "effectiveAdditions": 264,
        "effectiveDeletions": 1,
        "changedFiles": 9,
        "effectiveChangeCount": 265,
        "excludedGeneratedChangeCount": 7
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal creator review history checks.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "documentation",
        "repo-tooling"
      ]
    },
    {
      "version": "1.29.0",
      "previousVersion": "1.28.0",
      "commitSha": "0f4e79dc70b526231b4708f0bc312551b36ddfcd",
      "commitTitle": "fix(admin): refresh creator lane parity evidence",
      "committedAt": "2026-05-05T21:56:04.000Z",
      "generatedAt": "2026-05-05T21:56:27.587Z",
      "committedAtUtc": "2026-05-05T21:56:04.000Z",
      "generatedAtUtc": "2026-05-05T21:56:27.587Z",
      "diffStats": {
        "rawAdditions": 643,
        "rawDeletions": 85,
        "rawChangeCount": 728,
        "additions": 643,
        "deletions": 85,
        "effectiveAdditions": 620,
        "effectiveDeletions": 85,
        "changedFiles": 11,
        "effectiveChangeCount": 705,
        "excludedGeneratedChangeCount": 23
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal creator review status checks.",
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
