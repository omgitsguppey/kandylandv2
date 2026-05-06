import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.50.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T03:54:21.999Z",
  "generatedAtUtc": "2026-05-06T03:54:21.999Z",
  "lastCommitSha": "e1ff6cd52370d9f6cf7be29ea084b5d86722ca5a",
  "notes": [
    {
      "version": "1.50.0",
      "previousVersion": "1.49.0",
      "commitSha": "e1ff6cd52370d9f6cf7be29ea084b5d86722ca5a",
      "commitTitle": "fix(tasks): separate paid and potential rewards",
      "committedAt": "2026-05-06T03:53:59.000Z",
      "generatedAt": "2026-05-06T03:54:21.999Z",
      "committedAtUtc": "2026-05-06T03:53:59.000Z",
      "generatedAtUtc": "2026-05-06T03:54:21.999Z",
      "diffStats": {
        "rawAdditions": 597,
        "rawDeletions": 34,
        "rawChangeCount": 631,
        "additions": 597,
        "deletions": 34,
        "effectiveAdditions": 597,
        "effectiveDeletions": 34,
        "changedFiles": 14,
        "effectiveChangeCount": 631,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved daily task reward tracking so task totals reflect completed rewards more accurately.",
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
      "version": "1.49.0",
      "previousVersion": "1.48.1",
      "commitSha": "59435d8e5864bf43db5a453be94e21003fa105e3",
      "commitTitle": "fix(tasks): materialize daily task reset windows",
      "committedAt": "2026-05-06T03:34:58.000Z",
      "generatedAt": "2026-05-06T03:35:20.858Z",
      "committedAtUtc": "2026-05-06T03:34:58.000Z",
      "generatedAtUtc": "2026-05-06T03:35:20.858Z",
      "diffStats": {
        "rawAdditions": 691,
        "rawDeletions": 23,
        "rawChangeCount": 714,
        "additions": 691,
        "deletions": 23,
        "effectiveAdditions": 691,
        "effectiveDeletions": 23,
        "changedFiles": 15,
        "effectiveChangeCount": 714,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved daily task reset reliability so tasks are prepared on the daily schedule.",
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
      "version": "1.48.1",
      "previousVersion": "1.48.0",
      "commitSha": "0dd9d1e33525a45e777f6e1a01ecbe36e653ac36",
      "commitTitle": "fix(admin): normalize recent event flow context",
      "committedAt": "2026-05-06T03:16:38.000Z",
      "generatedAt": "2026-05-06T03:16:50.927Z",
      "committedAtUtc": "2026-05-06T03:16:38.000Z",
      "generatedAtUtc": "2026-05-06T03:16:50.927Z",
      "diffStats": {
        "rawAdditions": 51,
        "rawDeletions": 24,
        "rawChangeCount": 75,
        "additions": 51,
        "deletions": 24,
        "effectiveAdditions": 51,
        "effectiveDeletions": 24,
        "changedFiles": 6,
        "effectiveChangeCount": 75,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Improved internal event-flow diagnostics so background system events are not confused with user actions.",
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
