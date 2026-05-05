import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.17.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T12:49:32.625Z",
  "lastCommitSha": "1cbef6884a9c0f0273d22e9f14e1eff32968de26",
  "notes": [
    {
      "version": "1.17.0",
      "previousVersion": "1.16.1",
      "commitSha": "1cbef6884a9c0f0273d22e9f14e1eff32968de26",
      "commitTitle": "chore(ci): route repo automation through cloud build",
      "committedAt": "2026-05-05T07:49:13-05:00",
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
      ]
    },
    {
      "version": "1.16.1",
      "previousVersion": "1.16.0",
      "commitSha": "d9eef92897173dc95929d74909d5995b7dcc5e2a",
      "commitTitle": "fix(functions): raise default memory limit [skip ci]",
      "committedAt": "2026-05-05T07:14:35-05:00",
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
      ]
    },
    {
      "version": "1.16.0",
      "previousVersion": "1.15.0",
      "commitSha": "408fc0dcd0a7affd9243dd591c6d9b670c8e3d1f",
      "commitTitle": "feat(experiments): add behavioral ranking holdout validation",
      "committedAt": "2026-05-05T06:55:18-05:00",
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
      ]
    },
    {
      "version": "1.15.0",
      "previousVersion": "1.14.0",
      "commitSha": "6a7e79c065680ef4ea03cbb83651b1d781750ce4",
      "commitTitle": "feat(recommendations): add integrity demotion layer",
      "committedAt": "2026-05-05T06:40:11-05:00",
      "generatedAt": "2026-05-05T12:02:57.633Z",
      "diffStats": {
        "rawAdditions": 626,
        "rawDeletions": 4,
        "rawChangeCount": 630,
        "additions": 626,
        "deletions": 4,
        "effectiveAdditions": 626,
        "effectiveDeletions": 4,
        "changedFiles": 10,
        "effectiveChangeCount": 630,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Added",
      "userFacingTitle": "Updated KandyDrops with a small beta improvement.",
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
      "version": "1.14.0",
      "previousVersion": "1.13.0",
      "commitSha": "f7258668a3b29e5b29f970664f2df5bd8db43463",
      "commitTitle": "feat(creator): add creator supply quality score",
      "committedAt": "2026-05-05T06:33:36-05:00",
      "generatedAt": "2026-05-05T12:02:57.294Z",
      "diffStats": {
        "rawAdditions": 724,
        "rawDeletions": 3,
        "rawChangeCount": 727,
        "additions": 724,
        "deletions": 3,
        "effectiveAdditions": 724,
        "effectiveDeletions": 3,
        "changedFiles": 15,
        "effectiveChangeCount": 727,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Added",
      "userFacingTitle": "Updated KandyDrops with a small beta improvement.",
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
