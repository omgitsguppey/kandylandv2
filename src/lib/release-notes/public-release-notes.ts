import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.47.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T02:58:43.643Z",
  "generatedAtUtc": "2026-05-06T02:58:43.643Z",
  "lastCommitSha": "d5451d05813434695624a15b22bfff52a02dab34",
  "notes": [
    {
      "version": "1.47.0",
      "previousVersion": "1.46.0",
      "commitSha": "d5451d05813434695624a15b22bfff52a02dab34",
      "commitTitle": "fix(admin): enrich queue runtime drop labels",
      "committedAt": "2026-05-06T02:58:32.000Z",
      "generatedAt": "2026-05-06T02:58:43.643Z",
      "committedAtUtc": "2026-05-06T02:58:32.000Z",
      "generatedAtUtc": "2026-05-06T02:58:43.643Z",
      "diffStats": {
        "rawAdditions": 306,
        "rawDeletions": 10,
        "rawChangeCount": 316,
        "additions": 306,
        "deletions": 10,
        "effectiveAdditions": 304,
        "effectiveDeletions": 8,
        "changedFiles": 9,
        "effectiveChangeCount": 312,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal queue health views so drop activation outcomes show readable drop names.",
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
      "version": "1.46.0",
      "previousVersion": "1.45.0",
      "commitSha": "662806fb6b761735a4efaba950986ec4f02b236c",
      "commitTitle": "fix(admin): enrich recent transaction identities",
      "committedAt": "2026-05-06T02:50:17.000Z",
      "generatedAt": "2026-05-06T02:50:29.677Z",
      "committedAtUtc": "2026-05-06T02:50:17.000Z",
      "generatedAtUtc": "2026-05-06T02:50:29.677Z",
      "diffStats": {
        "rawAdditions": 351,
        "rawDeletions": 25,
        "rawChangeCount": 376,
        "additions": 351,
        "deletions": 25,
        "effectiveAdditions": 351,
        "effectiveDeletions": 25,
        "changedFiles": 9,
        "effectiveChangeCount": 376,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal transaction review so admins can identify users more easily.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "admin",
        "documentation",
        "repo-tooling",
        "wallet"
      ]
    },
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
