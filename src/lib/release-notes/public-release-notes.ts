import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.24.4",
  "channel": "beta",
  "generatedAt": "2026-05-05T20:38:54.620Z",
  "generatedAtUtc": "2026-05-05T20:38:54.620Z",
  "lastCommitSha": "46cfb75edefe9bc556eaf0a12af15774cd52994c",
  "notes": [
    {
      "version": "1.24.4",
      "previousVersion": "1.24.3",
      "commitSha": "46cfb75edefe9bc556eaf0a12af15774cd52994c",
      "commitTitle": "fix(chat): refresh attachment cancel read bounds",
      "committedAt": "2026-05-05T20:38:44.000Z",
      "generatedAt": "2026-05-05T20:38:54.619Z",
      "committedAtUtc": "2026-05-05T20:38:44.000Z",
      "generatedAtUtc": "2026-05-05T20:38:54.619Z",
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
      "userFacingTitle": "Improved behind-the-scenes safety checks for chat attachments.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "security"
      ]
    },
    {
      "version": "1.24.3",
      "previousVersion": "1.24.2",
      "commitSha": "14f7addf6b9ec646a31b6c712c7c9dcf3c4a401d",
      "commitTitle": "fix(auth): refresh navigation session read bounds",
      "committedAt": "2026-05-05T20:29:08.000Z",
      "generatedAt": "2026-05-05T20:29:25.369Z",
      "committedAtUtc": "2026-05-05T20:29:08.000Z",
      "generatedAtUtc": "2026-05-05T20:29:25.369Z",
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
      "userFacingTitle": "Improved behind-the-scenes session safety checks.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "security"
      ]
    },
    {
      "version": "1.24.2",
      "previousVersion": "1.24.1",
      "commitSha": "92ee96e665d2802f0ff8da3934d07f3ad7d240e0",
      "commitTitle": "fix(auth): refresh navigation session read bounds",
      "committedAt": "2026-05-05T20:24:14.000Z",
      "generatedAt": "2026-05-05T20:24:26.012Z",
      "committedAtUtc": "2026-05-05T20:24:14.000Z",
      "generatedAtUtc": "2026-05-05T20:24:26.012Z",
      "diffStats": {
        "rawAdditions": 2,
        "rawDeletions": 2,
        "rawChangeCount": 4,
        "additions": 2,
        "deletions": 2,
        "effectiveAdditions": 1,
        "effectiveDeletions": 1,
        "changedFiles": 2,
        "effectiveChangeCount": 2,
        "excludedGeneratedChangeCount": 2
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved behind-the-scenes session safety checks.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "security"
      ]
    },
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
