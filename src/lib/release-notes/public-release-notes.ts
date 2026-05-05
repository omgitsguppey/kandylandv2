import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.26.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T21:16:47.540Z",
  "generatedAtUtc": "2026-05-05T21:16:47.540Z",
  "lastCommitSha": "648a07ef1b19c9d176c9ea1cd2ec4cf4bf92c14b",
  "notes": [
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
    },
    {
      "version": "1.24.8",
      "previousVersion": "1.24.7",
      "commitSha": "b1cee605c8a7290f34b0f5f48cd97086f1f1d686",
      "commitTitle": "fix(cost): prove admin content entitlement scope",
      "committedAt": "2026-05-05T21:06:49.000Z",
      "generatedAt": "2026-05-05T21:07:01.584Z",
      "committedAtUtc": "2026-05-05T21:06:49.000Z",
      "generatedAtUtc": "2026-05-05T21:07:01.584Z",
      "diffStats": {
        "rawAdditions": 40,
        "rawDeletions": 1,
        "rawChangeCount": 41,
        "additions": 40,
        "deletions": 1,
        "effectiveAdditions": 39,
        "effectiveDeletions": 0,
        "changedFiles": 6,
        "effectiveChangeCount": 39,
        "excludedGeneratedChangeCount": 2
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved internal checks that protect locked content access.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "repo-tooling"
      ]
    },
    {
      "version": "1.24.7",
      "previousVersion": "1.24.6",
      "commitSha": "280f1e9d303c4439d34b76c3d0b54f35bf9b8508",
      "commitTitle": "fix(cost): guard admin content media egress",
      "committedAt": "2026-05-05T21:03:35.000Z",
      "generatedAt": "2026-05-05T21:03:50.291Z",
      "committedAtUtc": "2026-05-05T21:03:35.000Z",
      "generatedAtUtc": "2026-05-05T21:03:50.291Z",
      "diffStats": {
        "rawAdditions": 472,
        "rawDeletions": 113,
        "rawChangeCount": 585,
        "additions": 472,
        "deletions": 113,
        "effectiveAdditions": 46,
        "effectiveDeletions": 2,
        "changedFiles": 6,
        "effectiveChangeCount": 48,
        "excludedGeneratedChangeCount": 537
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved internal media safety checks to prevent unnecessary storage traffic.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "repo-tooling"
      ]
    },
    {
      "version": "1.24.6",
      "previousVersion": "1.24.5",
      "commitSha": "e604e86721c793094ad83d2f853ad55d59ca9495",
      "commitTitle": "fix(chat): refresh attachment completion read bounds",
      "committedAt": "2026-05-05T20:55:44.000Z",
      "generatedAt": "2026-05-05T20:55:56.911Z",
      "committedAtUtc": "2026-05-05T20:55:44.000Z",
      "generatedAtUtc": "2026-05-05T20:55:56.911Z",
      "diffStats": {
        "rawAdditions": 1,
        "rawDeletions": 1,
        "rawChangeCount": 2,
        "additions": 1,
        "deletions": 1,
        "effectiveAdditions": 0,
        "effectiveDeletions": 0,
        "changedFiles": 1,
        "effectiveChangeCount": 0,
        "excludedGeneratedChangeCount": 2
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved behind-the-scenes safety checks for chat media uploads.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "security"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
