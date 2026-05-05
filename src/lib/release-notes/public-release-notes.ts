import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.20.1",
  "channel": "beta",
  "generatedAt": "2026-05-05T19:16:50.354Z",
  "generatedAtUtc": "2026-05-05T19:16:50.354Z",
  "lastCommitSha": "1f08985ddfa85ad9d9742ae5d1bfbbbf69eaf24a",
  "notes": [
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
    },
    {
      "version": "1.20.0",
      "previousVersion": "1.19.0",
      "commitSha": "f7500283807314a26d05dc1f6a86b0f28d02aeb1",
      "commitTitle": "docs(beta): lock debug-first stabilization roadmap",
      "committedAt": "2026-05-05T18:56:53.000Z",
      "generatedAt": "2026-05-05T19:15:29.544Z",
      "committedAtUtc": "2026-05-05T18:56:53.000Z",
      "generatedAtUtc": "2026-05-05T19:15:29.544Z",
      "diffStats": {
        "rawAdditions": 659,
        "rawDeletions": 148,
        "rawChangeCount": 807,
        "additions": 659,
        "deletions": 148,
        "effectiveAdditions": 403,
        "effectiveDeletions": 37,
        "changedFiles": 16,
        "effectiveChangeCount": 440,
        "excludedGeneratedChangeCount": 367
      },
      "bumpType": "minor",
      "category": "Changed",
      "userFacingTitle": "Improved beta stabilization guidance so fixes stay focused and easier to track.",
      "bullets": [
        "Beta notes stay user-safe while preserving enough detail for support follow-up.",
        "UTC timestamps make updates easier to compare with screenshots, reports, and incidents."
      ],
      "affectedSurfaces": [
        "documentation",
        "release-notes",
        "repo-tooling",
        "telemetry"
      ]
    },
    {
      "version": "1.19.0",
      "previousVersion": "1.18.0",
      "commitSha": "e262ae44f608f2b3c095bb127c2dfb4124004617",
      "commitTitle": "chore(devops): verify Codex native auth readiness",
      "committedAt": "2026-05-05T14:11:31.000Z",
      "generatedAt": "2026-05-05T18:48:32.784Z",
      "committedAtUtc": "2026-05-05T14:11:31.000Z",
      "generatedAtUtc": "2026-05-05T18:48:32.784Z",
      "diffStats": {
        "rawAdditions": 1831,
        "rawDeletions": 0,
        "rawChangeCount": 1831,
        "additions": 1831,
        "deletions": 0,
        "effectiveAdditions": 1293,
        "effectiveDeletions": 0,
        "changedFiles": 14,
        "effectiveChangeCount": 1293,
        "excludedGeneratedChangeCount": 538
      },
      "bumpType": "minor",
      "category": "Internal",
      "userFacingTitle": "Improved internal beta reliability.",
      "bullets": [
        "Improved internal beta reliability without changing your core flows."
      ],
      "affectedSurfaces": [
        "documentation",
        "repo-tooling"
      ]
    },
    {
      "version": "1.18.0",
      "previousVersion": "1.17.0",
      "commitSha": "0526931009edf197cce768fea15f91f75a7ad5af",
      "commitTitle": "audit: document KandyDrops billing runtime surfaces",
      "committedAt": "2026-05-05T13:11:22.000Z",
      "generatedAt": "2026-05-05T18:48:32.252Z",
      "committedAtUtc": "2026-05-05T13:11:22.000Z",
      "generatedAtUtc": "2026-05-05T18:48:32.252Z",
      "diffStats": {
        "rawAdditions": 246,
        "rawDeletions": 0,
        "rawChangeCount": 246,
        "additions": 246,
        "deletions": 0,
        "effectiveAdditions": 246,
        "effectiveDeletions": 0,
        "changedFiles": 2,
        "effectiveChangeCount": 246,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Changed",
      "userFacingTitle": "Updated KandyDrops with a small beta improvement.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "documentation"
      ]
    },
    {
      "version": "1.17.0",
      "previousVersion": "1.16.1",
      "commitSha": "1cbef6884a9c0f0273d22e9f14e1eff32968de26",
      "commitTitle": "chore(ci): route repo automation through cloud build",
      "committedAt": "2026-05-05T12:49:13.000Z",
      "generatedAt": "2026-05-05T12:49:32.622Z",
      "diffStats": {
        "rawAdditions": 207,
        "rawDeletions": 18,
        "rawChangeCount": 225,
        "additions": 207,
        "deletions": 18,
        "effectiveAdditions": 207,
        "effectiveDeletions": 18,
        "changedFiles": 9,
        "effectiveChangeCount": 225,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Internal",
      "userFacingTitle": "Added a Beta badge with app update notes in the top navigation.",
      "bullets": [
        "Tap Beta beside KandyDrops to see the latest app-style updates.",
        "The current beta version now stays tied to the public changelog."
      ],
      "affectedSurfaces": [
        "documentation",
        "release-notes",
        "repo-tooling"
      ],
      "committedAtUtc": "2026-05-05T12:49:13.000Z",
      "generatedAtUtc": "2026-05-05T12:49:32.622Z"
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
