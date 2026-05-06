import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.43.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T02:19:29.663Z",
  "generatedAtUtc": "2026-05-06T02:19:29.663Z",
  "lastCommitSha": "0ad07275579c41228c0b793f181d7f722e36918e",
  "notes": [
    {
      "version": "1.43.0",
      "previousVersion": "1.42.0",
      "commitSha": "0ad07275579c41228c0b793f181d7f722e36918e",
      "commitTitle": "fix(admin): clarify bug intake triage states",
      "committedAt": "2026-05-06T02:19:16.000Z",
      "generatedAt": "2026-05-06T02:19:29.663Z",
      "committedAtUtc": "2026-05-06T02:19:16.000Z",
      "generatedAtUtc": "2026-05-06T02:19:29.663Z",
      "diffStats": {
        "rawAdditions": 352,
        "rawDeletions": 54,
        "rawChangeCount": 406,
        "additions": 352,
        "deletions": 54,
        "effectiveAdditions": 350,
        "effectiveDeletions": 52,
        "changedFiles": 10,
        "effectiveChangeCount": 402,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal bug report triage labels so loaded reports no longer appear stuck.",
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
      "version": "1.42.0",
      "previousVersion": "1.41.0",
      "commitSha": "488a5750056f3b31076940183e006b43af7f6e45",
      "commitTitle": "fix(admin): group inspect-only repair proposals",
      "committedAt": "2026-05-06T02:05:25.000Z",
      "generatedAt": "2026-05-06T02:05:40.352Z",
      "committedAtUtc": "2026-05-06T02:05:25.000Z",
      "generatedAtUtc": "2026-05-06T02:05:40.352Z",
      "diffStats": {
        "rawAdditions": 418,
        "rawDeletions": 217,
        "rawChangeCount": 635,
        "additions": 418,
        "deletions": 217,
        "effectiveAdditions": 416,
        "effectiveDeletions": 215,
        "changedFiles": 11,
        "effectiveChangeCount": 631,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal repair proposal grouping so repeated debug items are easier to review.",
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
