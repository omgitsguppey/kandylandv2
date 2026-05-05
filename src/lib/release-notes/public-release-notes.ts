import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.19.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T18:48:32.785Z",
  "generatedAtUtc": "2026-05-05T18:48:32.785Z",
  "lastCommitSha": "e262ae44f608f2b3c095bb127c2dfb4124004617",
  "notes": [
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
    },
    {
      "version": "1.16.1",
      "previousVersion": "1.16.0",
      "commitSha": "d9eef92897173dc95929d74909d5995b7dcc5e2a",
      "commitTitle": "fix(functions): raise default memory limit [skip ci]",
      "committedAt": "2026-05-05T12:14:35.000Z",
      "generatedAt": "2026-05-05T12:14:53.215Z",
      "diffStats": {
        "rawAdditions": 3,
        "rawDeletions": 0,
        "rawChangeCount": 3,
        "additions": 3,
        "deletions": 0,
        "effectiveAdditions": 3,
        "effectiveDeletions": 0,
        "changedFiles": 2,
        "effectiveChangeCount": 3,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "patch",
      "category": "Fixed",
      "userFacingTitle": "Fixed a beta issue to make KandyDrops smoother to use.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "documentation"
      ],
      "committedAtUtc": "2026-05-05T12:14:35.000Z",
      "generatedAtUtc": "2026-05-05T12:14:53.215Z"
    },
    {
      "version": "1.16.0",
      "previousVersion": "1.15.0",
      "commitSha": "408fc0dcd0a7affd9243dd591c6d9b670c8e3d1f",
      "commitTitle": "feat(experiments): add behavioral ranking holdout validation",
      "committedAt": "2026-05-05T11:55:18.000Z",
      "generatedAt": "2026-05-05T12:02:57.969Z",
      "diffStats": {
        "rawAdditions": 884,
        "rawDeletions": 4,
        "rawChangeCount": 888,
        "additions": 884,
        "deletions": 4,
        "effectiveAdditions": 884,
        "effectiveDeletions": 4,
        "changedFiles": 10,
        "effectiveChangeCount": 888,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Added",
      "userFacingTitle": "Updated KandyDrops with a small beta improvement.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
        "documentation",
        "repo-tooling"
      ],
      "committedAtUtc": "2026-05-05T11:55:18.000Z",
      "generatedAtUtc": "2026-05-05T12:02:57.969Z"
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
