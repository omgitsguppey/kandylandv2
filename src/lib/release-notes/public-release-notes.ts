import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.23.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T19:52:58.641Z",
  "generatedAtUtc": "2026-05-05T19:52:58.641Z",
  "lastCommitSha": "d1525d633c0b6b9ffaabc94eb497e78afffd96a9",
  "notes": [
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
    },
    {
      "version": "1.21.0",
      "previousVersion": "1.20.1",
      "commitSha": "193b4c8d663e0960cd2b9f10d0aac2241541237f",
      "commitTitle": "fix(admin): guard content storage route evidence",
      "committedAt": "2026-05-05T19:33:58.000Z",
      "generatedAt": "2026-05-05T19:34:10.416Z",
      "committedAtUtc": "2026-05-05T19:33:58.000Z",
      "generatedAtUtc": "2026-05-05T19:34:10.416Z",
      "diffStats": {
        "rawAdditions": 629,
        "rawDeletions": 302,
        "rawChangeCount": 931,
        "additions": 629,
        "deletions": 302,
        "effectiveAdditions": 449,
        "effectiveDeletions": 67,
        "changedFiles": 9,
        "effectiveChangeCount": 516,
        "excludedGeneratedChangeCount": 415
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal content safety checks for admin media tools.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "documentation",
        "repo-tooling",
        "security"
      ]
    },
    {
      "version": "1.20.1",
      "previousVersion": "1.20.0",
      "commitSha": "1f08985ddfa85ad9d9742ae5d1bfbbbf69eaf24a",
      "commitTitle": "fix(release): keep beta notes user safe",
      "committedAt": "2026-05-05T19:16:35.000Z",
      "generatedAt": "2026-05-05T19:16:50.354Z",
      "committedAtUtc": "2026-05-05T19:16:35.000Z",
      "generatedAtUtc": "2026-05-05T19:16:50.354Z",
      "diffStats": {
        "rawAdditions": 128,
        "rawDeletions": 43,
        "rawChangeCount": 171,
        "additions": 128,
        "deletions": 43,
        "effectiveAdditions": 41,
        "effectiveDeletions": 3,
        "changedFiles": 7,
        "effectiveChangeCount": 44,
        "excludedGeneratedChangeCount": 127
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved Beta update notes so changes are easier to match with support reports.",
      "bullets": [
        "Beta notes stay user-safe while preserving enough detail for support follow-up.",
        "UTC timestamps make updates easier to compare with screenshots, reports, and incidents."
      ],
      "affectedSurfaces": [
        "documentation",
        "release-notes",
        "repo-tooling"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
