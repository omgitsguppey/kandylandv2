import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.28.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T21:43:02.235Z",
  "generatedAtUtc": "2026-05-05T21:43:02.235Z",
  "lastCommitSha": "61bbf8464515651c9bff7d85608c7da5c6bc99b5",
  "notes": [
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
    },
    {
      "version": "1.26.0",
      "previousVersion": "1.25.0",
      "commitSha": "648a07ef1b19c9d176c9ea1cd2ec4cf4bf92c14b",
      "commitTitle": "fix(cost): guard creator ID document egress",
      "committedAt": "2026-05-05T21:16:32.000Z",
      "generatedAt": "2026-05-05T21:16:47.539Z",
      "committedAtUtc": "2026-05-05T21:16:32.000Z",
      "generatedAtUtc": "2026-05-05T21:16:47.539Z",
      "diffStats": {
        "rawAdditions": 174,
        "rawDeletions": 38,
        "rawChangeCount": 212,
        "additions": 174,
        "deletions": 38,
        "effectiveAdditions": 147,
        "effectiveDeletions": 7,
        "changedFiles": 5,
        "effectiveChangeCount": 154,
        "excludedGeneratedChangeCount": 58
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal safety checks for creator verification documents.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "repo-tooling"
      ]
    },
    {
      "version": "1.25.0",
      "previousVersion": "1.24.8",
      "commitSha": "79eb57843663fa21a78a14261fb06607d4350dde",
      "commitTitle": "fix(cost): guard creator agreement document egress",
      "committedAt": "2026-05-05T21:10:32.000Z",
      "generatedAt": "2026-05-05T21:10:43.516Z",
      "committedAtUtc": "2026-05-05T21:10:32.000Z",
      "generatedAtUtc": "2026-05-05T21:10:43.516Z",
      "diffStats": {
        "rawAdditions": 139,
        "rawDeletions": 32,
        "rawChangeCount": 171,
        "additions": 139,
        "deletions": 32,
        "effectiveAdditions": 108,
        "effectiveDeletions": 7,
        "changedFiles": 5,
        "effectiveChangeCount": 115,
        "excludedGeneratedChangeCount": 56
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal document safety checks for creator agreement tools.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "repo-tooling"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
