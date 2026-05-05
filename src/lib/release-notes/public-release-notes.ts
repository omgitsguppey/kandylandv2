import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.30.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T22:05:58.505Z",
  "generatedAtUtc": "2026-05-05T22:05:58.505Z",
  "lastCommitSha": "a0973fdb3d307dd0e79e0ec1ab9bb96f875e0e02",
  "notes": [
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
    },
    {
      "version": "1.28.0",
      "previousVersion": "1.27.1",
      "commitSha": "61bbf8464515651c9bff7d85608c7da5c6bc99b5",
      "commitTitle": "fix(admin): refresh system health truth",
      "committedAt": "2026-05-05T21:42:49.000Z",
      "generatedAt": "2026-05-05T21:43:02.235Z",
      "committedAtUtc": "2026-05-05T21:42:49.000Z",
      "generatedAtUtc": "2026-05-05T21:43:02.235Z",
      "diffStats": {
        "rawAdditions": 473,
        "rawDeletions": 12,
        "rawChangeCount": 485,
        "additions": 473,
        "deletions": 12,
        "effectiveAdditions": 469,
        "effectiveDeletions": 8,
        "changedFiles": 12,
        "effectiveChangeCount": 477,
        "excludedGeneratedChangeCount": 8
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal health reporting so beta issues show fresher, clearer status.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "repo-tooling",
        "security"
      ]
    },
    {
      "version": "1.27.1",
      "previousVersion": "1.27.0",
      "commitSha": "40b96762e144c2f5983c1f8437dd903639d33606",
      "commitTitle": "fix(security): verify media and Firestore guard evidence",
      "committedAt": "2026-05-05T21:28:06.000Z",
      "generatedAt": "2026-05-05T21:28:21.886Z",
      "committedAtUtc": "2026-05-05T21:28:06.000Z",
      "generatedAtUtc": "2026-05-05T21:28:21.886Z",
      "diffStats": {
        "rawAdditions": 15,
        "rawDeletions": 43,
        "rawChangeCount": 58,
        "additions": 15,
        "deletions": 43,
        "effectiveAdditions": 6,
        "effectiveDeletions": 0,
        "changedFiles": 3,
        "effectiveChangeCount": 6,
        "excludedGeneratedChangeCount": 52
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved internal media and session safety checks.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "repo-tooling",
        "security"
      ]
    },
    {
      "version": "1.27.0",
      "previousVersion": "1.26.0",
      "commitSha": "d706c48009e93b61f92d02246fa74cd29cec6f32",
      "commitTitle": "fix(cost): guard creator agreement document egress",
      "committedAt": "2026-05-05T21:22:00.000Z",
      "generatedAt": "2026-05-05T21:22:15.204Z",
      "committedAtUtc": "2026-05-05T21:22:00.000Z",
      "generatedAtUtc": "2026-05-05T21:22:15.204Z",
      "diffStats": {
        "rawAdditions": 269,
        "rawDeletions": 36,
        "rawChangeCount": 305,
        "additions": 269,
        "deletions": 36,
        "effectiveAdditions": 242,
        "effectiveDeletions": 5,
        "changedFiles": 5,
        "effectiveChangeCount": 247,
        "excludedGeneratedChangeCount": 58
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved safety checks for creator agreement document access.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "repo-tooling"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
