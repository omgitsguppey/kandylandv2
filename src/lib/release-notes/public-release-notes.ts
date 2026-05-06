import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.45.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T02:40:47.854Z",
  "generatedAtUtc": "2026-05-06T02:40:47.854Z",
  "lastCommitSha": "10b564958780c50abd44a654ef2ba485cb0e6d5c",
  "notes": [
    {
      "version": "1.45.0",
      "previousVersion": "1.44.0",
      "commitSha": "10b564958780c50abd44a654ef2ba485cb0e6d5c",
      "commitTitle": "fix(admin): correct route runtime sample states",
      "committedAt": "2026-05-06T02:40:29.000Z",
      "generatedAt": "2026-05-06T02:40:47.854Z",
      "committedAtUtc": "2026-05-06T02:40:29.000Z",
      "generatedAtUtc": "2026-05-06T02:40:47.854Z",
      "diffStats": {
        "rawAdditions": 160,
        "rawDeletions": 41,
        "rawChangeCount": 201,
        "additions": 160,
        "deletions": 41,
        "effectiveAdditions": 158,
        "effectiveDeletions": 39,
        "changedFiles": 9,
        "effectiveChangeCount": 197,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal route runtime labels so unseen routes no longer appear as fake successes.",
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
      "version": "1.44.0",
      "previousVersion": "1.43.0",
      "commitSha": "45435fb9926905f18e4ae6d32dfc76b264573c38",
      "commitTitle": "fix(admin): clarify route runtime health states",
      "committedAt": "2026-05-06T02:30:27.000Z",
      "generatedAt": "2026-05-06T02:30:41.583Z",
      "committedAtUtc": "2026-05-06T02:30:27.000Z",
      "generatedAtUtc": "2026-05-06T02:30:41.583Z",
      "diffStats": {
        "rawAdditions": 314,
        "rawDeletions": 23,
        "rawChangeCount": 337,
        "additions": 314,
        "deletions": 23,
        "effectiveAdditions": 312,
        "effectiveDeletions": 21,
        "changedFiles": 9,
        "effectiveChangeCount": 333,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal route health labels so loaded runtime metrics no longer appear stuck.",
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
