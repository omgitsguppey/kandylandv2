import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.24.1",
  "channel": "beta",
  "generatedAt": "2026-05-05T20:20:16.202Z",
  "generatedAtUtc": "2026-05-05T20:20:16.202Z",
  "lastCommitSha": "739808bba955704939fa378db2accfbee7a52b28",
  "notes": [
    {
      "version": "1.24.1",
      "previousVersion": "1.24.0",
      "commitSha": "739808bba955704939fa378db2accfbee7a52b28",
      "commitTitle": "fix(admin): refresh content storage guard evidence",
      "committedAt": "2026-05-05T20:20:00.000Z",
      "generatedAt": "2026-05-05T20:20:16.201Z",
      "committedAtUtc": "2026-05-05T20:20:00.000Z",
      "generatedAtUtc": "2026-05-05T20:20:16.201Z",
      "diffStats": {
        "rawAdditions": 35,
        "rawDeletions": 3,
        "rawChangeCount": 38,
        "additions": 35,
        "deletions": 3,
        "effectiveAdditions": 34,
        "effectiveDeletions": 2,
        "changedFiles": 3,
        "effectiveChangeCount": 36,
        "excludedGeneratedChangeCount": 2
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved internal content safety checks for admin media tools.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "security"
      ]
    },
    {
      "version": "1.24.0",
      "previousVersion": "1.23.0",
      "commitSha": "aa1284ac84c31d43a050e542fc4811c62fb28749",
      "commitTitle": "fix(chat): bound attachment completion lookup",
      "committedAt": "2026-05-05T20:06:27.000Z",
      "generatedAt": "2026-05-05T20:06:40.297Z",
      "committedAtUtc": "2026-05-05T20:06:27.000Z",
      "generatedAtUtc": "2026-05-05T20:06:40.297Z",
      "diffStats": {
        "rawAdditions": 143,
        "rawDeletions": 28,
        "rawChangeCount": 171,
        "additions": 143,
        "deletions": 28,
        "effectiveAdditions": 137,
        "effectiveDeletions": 5,
        "changedFiles": 4,
        "effectiveChangeCount": 142,
        "excludedGeneratedChangeCount": 29
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved behind-the-scenes safety checks for chat media uploads.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "chat",
        "repo-tooling",
        "security"
      ]
    },
    {
      "version": "1.23.0",
      "previousVersion": "1.22.0",
      "commitSha": "d1525d633c0b6b9ffaabc94eb497e78afffd96a9",
      "commitTitle": "fix(chat): make attachment cancel idempotent",
      "committedAt": "2026-05-05T19:52:48.000Z",
      "generatedAt": "2026-05-05T19:52:58.640Z",
      "committedAtUtc": "2026-05-05T19:52:48.000Z",
      "generatedAtUtc": "2026-05-05T19:52:58.640Z",
      "diffStats": {
        "rawAdditions": 386,
        "rawDeletions": 73,
        "rawChangeCount": 459,
        "additions": 386,
        "deletions": 73,
        "effectiveAdditions": 376,
        "effectiveDeletions": 15,
        "changedFiles": 4,
        "effectiveChangeCount": 391,
        "excludedGeneratedChangeCount": 68
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved reliability for canceling pending chat attachments.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "chat",
        "repo-tooling",
        "security"
      ]
    },
    {
      "version": "1.22.0",
      "previousVersion": "1.21.1",
      "commitSha": "b9d1c3fa010e9cbbcb1e47e4eacb68963404c9e9",
      "commitTitle": "fix(chat): bound attachment cancel lookup",
      "committedAt": "2026-05-05T19:44:47.000Z",
      "generatedAt": "2026-05-05T19:44:57.658Z",
      "committedAtUtc": "2026-05-05T19:44:47.000Z",
      "generatedAtUtc": "2026-05-05T19:44:57.658Z",
      "diffStats": {
        "rawAdditions": 184,
        "rawDeletions": 38,
        "rawChangeCount": 222,
        "additions": 184,
        "deletions": 38,
        "effectiveAdditions": 174,
        "effectiveDeletions": 11,
        "changedFiles": 4,
        "effectiveChangeCount": 185,
        "excludedGeneratedChangeCount": 37
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved behind-the-scenes safety checks for chat attachments.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "chat",
        "repo-tooling",
        "security"
      ]
    },
    {
      "version": "1.21.1",
      "previousVersion": "1.21.0",
      "commitSha": "20c210996e720cbc024fe1b5b002883b44cea9ab",
      "commitTitle": "fix(auth): prove navigation session Firestore read bounds",
      "committedAt": "2026-05-05T19:39:15.000Z",
      "generatedAt": "2026-05-05T19:39:26.028Z",
      "committedAtUtc": "2026-05-05T19:39:15.000Z",
      "generatedAtUtc": "2026-05-05T19:39:26.028Z",
      "diffStats": {
        "rawAdditions": 130,
        "rawDeletions": 807,
        "rawChangeCount": 937,
        "additions": 130,
        "deletions": 807,
        "effectiveAdditions": 23,
        "effectiveDeletions": 3,
        "changedFiles": 4,
        "effectiveChangeCount": 26,
        "excludedGeneratedChangeCount": 911
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved behind-the-scenes session safety checks.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "repo-tooling",
        "security"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
