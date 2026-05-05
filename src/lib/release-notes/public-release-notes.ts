import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.16.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T12:02:57.969Z",
  "lastCommitSha": "408fc0dcd0a7affd9243dd591c6d9b670c8e3d1f",
  "notes": [
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
    },
    {
      "version": "1.13.0",
      "previousVersion": "1.12.0",
      "commitSha": "1420446301c40159345fb5aa96a4e268ef32b942",
      "commitTitle": "feat(recommendations): add cold-start exploration budget",
      "committedAt": "2026-05-05T06:20:34-05:00",
      "generatedAt": "2026-05-05T12:02:56.927Z",
      "diffStats": {
        "rawAdditions": 873,
        "rawDeletions": 32,
        "rawChangeCount": 905,
        "additions": 873,
        "deletions": 32,
        "effectiveAdditions": 873,
        "effectiveDeletions": 32,
        "changedFiles": 11,
        "effectiveChangeCount": 905,
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
      "version": "1.12.0",
      "previousVersion": "1.11.0",
      "commitSha": "b441e04bd5b8578a3ac2c04543f6aee23efe25d3",
      "commitTitle": "feat(behavioral): add content satisfaction signal",
      "committedAt": "2026-05-05T06:04:48-05:00",
      "generatedAt": "2026-05-05T12:02:56.598Z",
      "diffStats": {
        "rawAdditions": 1154,
        "rawDeletions": 27,
        "rawChangeCount": 1181,
        "additions": 1154,
        "deletions": 27,
        "effectiveAdditions": 1142,
        "effectiveDeletions": 17,
        "changedFiles": 20,
        "effectiveChangeCount": 1159,
        "excludedGeneratedChangeCount": 22
      },
      "bumpType": "minor",
      "category": "Added",
      "userFacingTitle": "Updated KandyDrops with a small beta improvement.",
      "bullets": [
        "Kept the update focused on user-visible polish and reliability."
      ],
      "affectedSurfaces": [
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
