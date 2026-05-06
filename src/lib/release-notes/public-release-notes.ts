import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.39.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T01:39:08.312Z",
  "generatedAtUtc": "2026-05-06T01:39:08.312Z",
  "lastCommitSha": "b0a9c66bd1a4845d15de04275013910999d9c2e3",
  "notes": [
    {
      "version": "1.39.0",
      "previousVersion": "1.38.0",
      "commitSha": "b0a9c66bd1a4845d15de04275013910999d9c2e3",
      "commitTitle": "fix(admin): classify debug signals by severity",
      "committedAt": "2026-05-06T01:38:46.000Z",
      "generatedAt": "2026-05-06T01:39:08.312Z",
      "committedAtUtc": "2026-05-06T01:38:46.000Z",
      "generatedAtUtc": "2026-05-06T01:39:08.312Z",
      "diffStats": {
        "rawAdditions": 451,
        "rawDeletions": 44,
        "rawChangeCount": 495,
        "additions": 451,
        "deletions": 44,
        "effectiveAdditions": 449,
        "effectiveDeletions": 42,
        "changedFiles": 11,
        "effectiveChangeCount": 491,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal debug status labels so inventory counts do not look like system failures.",
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
      "version": "1.38.0",
      "previousVersion": "1.37.0",
      "commitSha": "7762d379fe865b5845609e5ada26ebd304b8dcf8",
      "commitTitle": "fix(admin): clarify downstream writer freshness",
      "committedAt": "2026-05-06T01:29:36.000Z",
      "generatedAt": "2026-05-06T01:29:49.267Z",
      "committedAtUtc": "2026-05-06T01:29:36.000Z",
      "generatedAtUtc": "2026-05-06T01:29:49.267Z",
      "diffStats": {
        "rawAdditions": 438,
        "rawDeletions": 34,
        "rawChangeCount": 472,
        "additions": 438,
        "deletions": 34,
        "effectiveAdditions": 436,
        "effectiveDeletions": 32,
        "changedFiles": 12,
        "effectiveChangeCount": 468,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal health panels so writer freshness and repeated diagnostics are easier to read.",
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
      "version": "1.37.0",
      "previousVersion": "1.36.0",
      "commitSha": "38cbbf4ae10c432322454efaab57ed5348a33535",
      "commitTitle": "fix(admin): separate diagnostics sample freshness",
      "committedAt": "2026-05-06T01:19:52.000Z",
      "generatedAt": "2026-05-06T01:20:04.721Z",
      "committedAtUtc": "2026-05-06T01:19:52.000Z",
      "generatedAtUtc": "2026-05-06T01:20:04.721Z",
      "diffStats": {
        "rawAdditions": 441,
        "rawDeletions": 18,
        "rawChangeCount": 459,
        "additions": 441,
        "deletions": 18,
        "effectiveAdditions": 439,
        "effectiveDeletions": 16,
        "changedFiles": 11,
        "effectiveChangeCount": 455,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal diagnostics timing so health panels separate current issues from older samples.",
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
      "version": "1.36.0",
      "previousVersion": "1.35.1",
      "commitSha": "57b3e05b3320996d6a60f8067ba444ca4f86050a",
      "commitTitle": "fix(creator): require synthetic creator default settings",
      "committedAt": "2026-05-06T01:12:13.000Z",
      "generatedAt": "2026-05-06T01:12:24.521Z",
      "committedAtUtc": "2026-05-06T01:12:13.000Z",
      "generatedAtUtc": "2026-05-06T01:12:24.521Z",
      "diffStats": {
        "rawAdditions": 161,
        "rawDeletions": 11,
        "rawChangeCount": 172,
        "additions": 161,
        "deletions": 11,
        "effectiveAdditions": 159,
        "effectiveDeletions": 9,
        "changedFiles": 11,
        "effectiveChangeCount": 168,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal creator experience defaults for beta reliability.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "documentation",
        "repo-tooling"
      ]
    },
    {
      "version": "1.35.1",
      "previousVersion": "1.35.0",
      "commitSha": "5fb376874b728d59e981d5001d07ff16c62f30c7",
      "commitTitle": "fix(creator): classify synthetic countersign evidence",
      "committedAt": "2026-05-06T01:04:20.000Z",
      "generatedAt": "2026-05-06T01:04:37.379Z",
      "committedAtUtc": "2026-05-06T01:04:20.000Z",
      "generatedAtUtc": "2026-05-06T01:04:37.379Z",
      "diffStats": {
        "rawAdditions": 57,
        "rawDeletions": 12,
        "rawChangeCount": 69,
        "additions": 57,
        "deletions": 12,
        "effectiveAdditions": 55,
        "effectiveDeletions": 10,
        "changedFiles": 9,
        "effectiveChangeCount": 65,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved internal creator classification checks.",
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
