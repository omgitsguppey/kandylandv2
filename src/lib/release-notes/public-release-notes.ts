import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.2.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T07:10:40.361Z",
  "lastCommitSha": "a30bea630ee0fdc8768333e8a03a9ab4b1bb44bd",
  "notes": [
    {
      "version": "1.2.0",
      "previousVersion": "1.1.0",
      "commitSha": "a30bea630ee0fdc8768333e8a03a9ab4b1bb44bd",
      "commitTitle": "fix(release): exclude generated files from version bumps",
      "committedAt": "2026-05-05T02:10:24-05:00",
      "generatedAt": "2026-05-05T07:10:40.358Z",
      "diffStats": {
        "rawAdditions": 175,
        "rawDeletions": 35,
        "rawChangeCount": 210,
        "additions": 175,
        "deletions": 35,
        "effectiveAdditions": 151,
        "effectiveDeletions": 31,
        "changedFiles": 8,
        "effectiveChangeCount": 182,
        "excludedGeneratedChangeCount": 28
      },
      "bumpType": "minor",
      "category": "Fixed",
      "userFacingTitle": "Improved Beta version numbering so generated files do not overstate app updates.",
      "bullets": [
        "Generated release-note files no longer inflate public beta version bumps.",
        "Raw change counts are still kept behind the scenes for debugging."
      ],
      "affectedSurfaces": [
        "release-notes",
        "repo-tooling"
      ]
    },
    {
      "version": "1.1.0",
      "previousVersion": "1.0.0",
      "commitSha": "c5b3501b12e69b442fcac74a4ee018a4f6fc70de",
      "commitTitle": "feat(app): add beta release notes badge",
      "committedAt": "2026-05-05T02:02:41-05:00",
      "generatedAt": "2026-05-05T07:03:00.935Z",
      "diffStats": {
        "rawAdditions": 1284,
        "rawDeletions": 10,
        "rawChangeCount": 1294,
        "additions": 1284,
        "deletions": 10,
        "effectiveAdditions": 1193,
        "effectiveDeletions": 10,
        "changedFiles": 22,
        "effectiveChangeCount": 1203,
        "excludedGeneratedChangeCount": 91
      },
      "bumpType": "minor",
      "category": "Added",
      "userFacingTitle": "Added a Beta badge with app update notes in the top navigation.",
      "bullets": [
        "Tap Beta beside KandyDrops to see the latest app-style updates.",
        "The current beta version now stays tied to the public changelog."
      ],
      "affectedSurfaces": [
        "documentation",
        "navigation",
        "release-notes",
        "repo-tooling",
        "telemetry"
      ]
    },
    {
      "version": "1.0.0",
      "previousVersion": "1.0.0",
      "commitSha": "b944cbd4a76840bc8a4efded2ada8d4c66c0204d",
      "commitTitle": "docs(doctrine): consolidate hierarchy and agent context",
      "committedAt": "2026-05-05T01:25:37-05:00",
      "generatedAt": "2026-05-05T06:55:57.092Z",
      "diffStats": {
        "rawAdditions": 1715,
        "rawDeletions": 101,
        "rawChangeCount": 1816,
        "additions": 1715,
        "deletions": 101,
        "effectiveAdditions": 1714,
        "effectiveDeletions": 101,
        "changedFiles": 33,
        "effectiveChangeCount": 1815,
        "excludedGeneratedChangeCount": 1
      },
      "bumpType": "minor",
      "category": "Internal",
      "userFacingTitle": "Updated internal product guidance so future fixes stay more consistent.",
      "bullets": [
        "Improved internal beta reliability without changing your core flows."
      ],
      "affectedSurfaces": [
        "admin",
        "documentation",
        "repo-tooling",
        "security",
        "telemetry",
        "wallet"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
