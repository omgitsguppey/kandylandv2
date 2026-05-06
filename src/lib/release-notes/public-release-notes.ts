import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.41.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T01:56:51.549Z",
  "generatedAtUtc": "2026-05-06T01:56:51.549Z",
  "lastCommitSha": "7d56e157afa44f20236a9b2093c72f4665f0832e",
  "notes": [
    {
      "version": "1.41.0",
      "previousVersion": "1.40.0",
      "commitSha": "7d56e157afa44f20236a9b2093c72f4665f0832e",
      "commitTitle": "fix(admin): dedupe debug repair proposals",
      "committedAt": "2026-05-06T01:56:39.000Z",
      "generatedAt": "2026-05-06T01:56:51.549Z",
      "committedAtUtc": "2026-05-06T01:56:39.000Z",
      "generatedAtUtc": "2026-05-06T01:56:51.549Z",
      "diffStats": {
        "rawAdditions": 413,
        "rawDeletions": 21,
        "rawChangeCount": 434,
        "additions": 413,
        "deletions": 21,
        "effectiveAdditions": 411,
        "effectiveDeletions": 19,
        "changedFiles": 10,
        "effectiveChangeCount": 430,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal repair proposal grouping so duplicate debug actions are easier to review.",
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
      "version": "1.40.0",
      "previousVersion": "1.39.0",
      "commitSha": "69ffae9bedf9635a8924fdbc1732c95c1a83539b",
      "commitTitle": "fix(admin): clarify task issue attribution",
      "committedAt": "2026-05-06T01:47:59.000Z",
      "generatedAt": "2026-05-06T01:48:10.316Z",
      "committedAtUtc": "2026-05-06T01:47:59.000Z",
      "generatedAtUtc": "2026-05-06T01:48:10.316Z",
      "diffStats": {
        "rawAdditions": 243,
        "rawDeletions": 7,
        "rawChangeCount": 250,
        "additions": 243,
        "deletions": 7,
        "effectiveAdditions": 241,
        "effectiveDeletions": 5,
        "changedFiles": 11,
        "effectiveChangeCount": 246,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal task assignment diagnostics.",
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
