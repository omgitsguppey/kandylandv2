import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.48.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T03:12:27.468Z",
  "generatedAtUtc": "2026-05-06T03:12:27.468Z",
  "lastCommitSha": "874c1ba93f3a1152ba26ad009491f294c4ea6d84",
  "notes": [
    {
      "version": "1.48.0",
      "previousVersion": "1.47.1",
      "commitSha": "874c1ba93f3a1152ba26ad009491f294c4ea6d84",
      "commitTitle": "fix(admin): clarify recent event flow context",
      "committedAt": "2026-05-06T03:12:12.000Z",
      "generatedAt": "2026-05-06T03:12:27.467Z",
      "committedAtUtc": "2026-05-06T03:12:12.000Z",
      "generatedAtUtc": "2026-05-06T03:12:27.467Z",
      "diffStats": {
        "rawAdditions": 233,
        "rawDeletions": 12,
        "rawChangeCount": 245,
        "additions": 233,
        "deletions": 12,
        "effectiveAdditions": 231,
        "effectiveDeletions": 10,
        "changedFiles": 8,
        "effectiveChangeCount": 241,
        "excludedGeneratedChangeCount": 4
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal event-flow diagnostics so background events and user actions are easier to tell apart.",
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
      "version": "1.47.1",
      "previousVersion": "1.47.0",
      "commitSha": "d5a84e8f29d0992eefe53c0e64d544ecb7297d48",
      "commitTitle": "fix(admin): clarify session config readiness",
      "committedAt": "2026-05-06T03:02:35.000Z",
      "generatedAt": "2026-05-06T03:02:52.202Z",
      "committedAtUtc": "2026-05-06T03:02:35.000Z",
      "generatedAtUtc": "2026-05-06T03:02:52.202Z",
      "diffStats": {
        "rawAdditions": 84,
        "rawDeletions": 10,
        "rawChangeCount": 94,
        "additions": 84,
        "deletions": 10,
        "effectiveAdditions": 84,
        "effectiveDeletions": 10,
        "changedFiles": 5,
        "effectiveChangeCount": 94,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Clarified internal admin readiness checks so config presence is not confused with live service health.",
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
