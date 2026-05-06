import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.53.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T04:58:48.626Z",
  "generatedAtUtc": "2026-05-06T04:58:48.626Z",
  "lastCommitSha": "fef2058a653f662446f2453c2a939a59b5fd2766",
  "notes": [
    {
      "version": "1.53.0",
      "previousVersion": "1.52.0",
      "commitSha": "fef2058a653f662446f2453c2a939a59b5fd2766",
      "commitTitle": "fix(admin): upgrade debug assistant model routing",
      "committedAt": "2026-05-06T04:48:48.000Z",
      "generatedAt": "2026-05-06T04:58:48.626Z",
      "committedAtUtc": "2026-05-06T04:48:48.000Z",
      "generatedAtUtc": "2026-05-06T04:58:48.626Z",
      "diffStats": {
        "rawAdditions": 1527,
        "rawDeletions": 245,
        "rawChangeCount": 1772,
        "additions": 1527,
        "deletions": 245,
        "effectiveAdditions": 1527,
        "effectiveDeletions": 245,
        "changedFiles": 24,
        "effectiveChangeCount": 1772,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved internal admin tools used to keep beta features stable.",
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
      "version": "1.52.0",
      "previousVersion": "1.51.0",
      "commitSha": "4234e36711426775f67e05653593fd2bcd4d59f6",
      "commitTitle": "fix(admin): complete dependency inventory panel",
      "committedAt": "2026-05-06T04:17:55.000Z",
      "generatedAt": "2026-05-06T04:18:07.080Z",
      "committedAtUtc": "2026-05-06T04:17:55.000Z",
      "generatedAtUtc": "2026-05-06T04:18:07.080Z",
      "diffStats": {
        "rawAdditions": 770,
        "rawDeletions": 238,
        "rawChangeCount": 1008,
        "additions": 770,
        "deletions": 238,
        "effectiveAdditions": 685,
        "effectiveDeletions": 157,
        "changedFiles": 7,
        "effectiveChangeCount": 842,
        "excludedGeneratedChangeCount": 166
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved Beta update notes so changes are easier to match with support reports.",
      "bullets": [
        "Beta notes stay user-safe while preserving enough detail for support follow-up.",
        "UTC timestamps make updates easier to compare with screenshots, reports, and incidents."
      ],
      "affectedSurfaces": [
        "admin",
        "release-notes",
        "repo-tooling"
      ]
    },
    {
      "version": "1.51.0",
      "previousVersion": "1.50.0",
      "commitSha": "4eb73b3eaa23a74611c19278c63de430c609f83d",
      "commitTitle": "fix(admin): enrich receipt sample context",
      "committedAt": "2026-05-06T04:07:47.000Z",
      "generatedAt": "2026-05-06T04:17:27.967Z",
      "committedAtUtc": "2026-05-06T04:07:47.000Z",
      "generatedAtUtc": "2026-05-06T04:17:27.967Z",
      "diffStats": {
        "rawAdditions": 424,
        "rawDeletions": 100,
        "rawChangeCount": 524,
        "additions": 424,
        "deletions": 100,
        "effectiveAdditions": 340,
        "effectiveDeletions": 18,
        "changedFiles": 6,
        "effectiveChangeCount": 358,
        "excludedGeneratedChangeCount": 166
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved Beta update notes so changes are easier to match with support reports.",
      "bullets": [
        "Beta notes stay user-safe while preserving enough detail for support follow-up.",
        "UTC timestamps make updates easier to compare with screenshots, reports, and incidents."
      ],
      "affectedSurfaces": [
        "admin",
        "release-notes",
        "repo-tooling"
      ]
    },
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
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
