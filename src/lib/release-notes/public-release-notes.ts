import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.0.0",
  "channel": "beta",
  "generatedAt": "2026-05-05T06:55:57.093Z",
  "lastCommitSha": "b944cbd4a76840bc8a4efded2ada8d4c66c0204d",
  "notes": [
    {
      "version": "1.0.0",
      "previousVersion": "1.0.0",
      "commitSha": "b944cbd4a76840bc8a4efded2ada8d4c66c0204d",
      "commitTitle": "docs(doctrine): consolidate hierarchy and agent context",
      "committedAt": "2026-05-05T01:25:37-05:00",
      "generatedAt": "2026-05-05T06:55:57.092Z",
      "diffStats": {
        "additions": 1714,
        "deletions": 101,
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
