import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.113.4",
  "channel": "beta",
  "generatedAt": "2026-05-06T19:58:40.374Z",
  "generatedAtUtc": "2026-05-06T19:58:40.374Z",
  "lastCommitSha": "b43f8f272fe4071e4731d9d4e24d60f416b7a902",
  "notes": [
    {
      "version": "1.113.4",
      "previousVersion": "1.113.3",
      "commitSha": "b43f8f272fe4071e4731d9d4e24d60f416b7a902",
      "commitTitle": "fix(beta): avoid repeated audit release notes",
      "committedAt": "2026-05-06T19:58:25.000Z",
      "generatedAt": "2026-05-06T19:58:40.373Z",
      "committedAtUtc": "2026-05-06T19:58:25.000Z",
      "generatedAtUtc": "2026-05-06T19:58:40.373Z",
      "diffStats": {
        "rawAdditions": 113,
        "rawDeletions": 103,
        "rawChangeCount": 216,
        "additions": 113,
        "deletions": 103,
        "effectiveAdditions": 8,
        "effectiveDeletions": 1,
        "changedFiles": 4,
        "effectiveChangeCount": 9,
        "excludedGeneratedChangeCount": 207
      },
      "bumpType": "patch",
      "category": "Fixed",
      "title": "Improved Beta update notes",
      "updatedAtUtc": "2026-05-06T19:58:40.373Z",
      "summary": "Cleaner Beta update notes with clearer summaries and timestamps.",
      "userFacingTitle": "Improved Beta update notes",
      "bullets": [
        "Improved Beta notes with cleaner summaries and compact bullets.",
        "Updated timestamps so recent changes are easier to compare with reports.",
        "Reduced technical wording in public update notes."
      ],
      "audience": "all",
      "technicalDetails": [
        "Release note summaries are generated separately from collapsed technical details."
      ],
      "affectedSurfaces": [
        "release-notes",
        "repo-tooling"
      ]
    },
    {
      "version": "1.113.3",
      "previousVersion": "1.113.2",
      "commitSha": "6b46f9325f543c95b14a83f2661814c91847a0a1",
      "commitTitle": "fix(admin): close beta and task truth gaps",
      "committedAt": "2026-05-06T19:57:06.000Z",
      "generatedAt": "2026-05-06T19:57:23.155Z",
      "committedAtUtc": "2026-05-06T19:57:06.000Z",
      "generatedAtUtc": "2026-05-06T19:57:23.155Z",
      "diffStats": {
        "rawAdditions": 46,
        "rawDeletions": 33,
        "rawChangeCount": 79,
        "additions": 46,
        "deletions": 33,
        "effectiveAdditions": 28,
        "effectiveDeletions": 15,
        "changedFiles": 7,
        "effectiveChangeCount": 43,
        "excludedGeneratedChangeCount": 36
      },
      "bumpType": "patch",
      "category": "Fixed",
      "title": "Improved Beta update notes",
      "updatedAtUtc": "2026-05-06T19:57:23.155Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools.",
      "userFacingTitle": "Improved Beta update notes",
      "bullets": [
        "Fixed repeated Beta note wording in the visible changelog.",
        "Clarified task pipeline labels for reward and guidance review.",
        "Updated unavailable analytics badges so they no longer appear as loading."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Admin metrics keep source, range, and freshness details separate from public summaries.",
        "Release note summaries are generated separately from collapsed technical details."
      ],
      "affectedSurfaces": [
        "admin",
        "release-notes",
        "repo-tooling"
      ]
    },
    {
      "version": "1.113.2",
      "previousVersion": "1.113.1",
      "commitSha": "b522306e5d1e92e473ee9fed14dbd852429a96a8",
      "commitTitle": "fix(beta): keep changelog modal above page chrome",
      "committedAt": "2026-05-06T19:46:54.000Z",
      "generatedAt": "2026-05-06T19:47:11.549Z",
      "committedAtUtc": "2026-05-06T19:46:54.000Z",
      "generatedAtUtc": "2026-05-06T19:47:11.549Z",
      "diffStats": {
        "rawAdditions": 29,
        "rawDeletions": 2,
        "rawChangeCount": 31,
        "additions": 29,
        "deletions": 2,
        "effectiveAdditions": 29,
        "effectiveDeletions": 2,
        "changedFiles": 2,
        "effectiveChangeCount": 31,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "patch",
      "category": "Fixed",
      "title": "Improved Beta update notes",
      "updatedAtUtc": "2026-05-06T19:47:11.549Z",
      "summary": "Cleaner Beta update notes with clearer summaries and timestamps.",
      "userFacingTitle": "Improved Beta update notes",
      "bullets": [
        "Fixed the Beta notes panel so it stays above page controls.",
        "Improved page locking while the changelog is open.",
        "Updated the overlay spacing for small mobile screens."
      ],
      "audience": "all",
      "technicalDetails": [
        "Release note summaries are generated separately from collapsed technical details."
      ],
      "affectedSurfaces": [
        "release-notes",
        "repo-tooling"
      ]
    },
    {
      "version": "1.113.1",
      "previousVersion": "1.113.0",
      "commitSha": "04b6e80c3f6bdd7eed4d17f2b5c337815d62cb85",
      "commitTitle": "fix(beta): ensure badge opens latest notes",
      "committedAt": "2026-05-06T19:33:17.000Z",
      "generatedAt": "2026-05-06T19:33:36.599Z",
      "committedAtUtc": "2026-05-06T19:33:17.000Z",
      "generatedAtUtc": "2026-05-06T19:33:36.599Z",
      "diffStats": {
        "rawAdditions": 9,
        "rawDeletions": 13,
        "rawChangeCount": 22,
        "additions": 9,
        "deletions": 13,
        "effectiveAdditions": 9,
        "effectiveDeletions": 13,
        "changedFiles": 3,
        "effectiveChangeCount": 22,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "patch",
      "category": "Fixed",
      "title": "Improved Beta update notes",
      "updatedAtUtc": "2026-05-06T19:33:36.599Z",
      "summary": "Cleaner Beta update notes with clearer summaries and timestamps.",
      "userFacingTitle": "Improved Beta update notes",
      "bullets": [
        "Fixed the Beta badge so taps open the current notes panel.",
        "Updated the notes request so the latest changelog is loaded.",
        "Reduced cases where an older app tab could miss the newest notes."
      ],
      "audience": "all",
      "technicalDetails": [
        "Release note summaries are generated separately from collapsed technical details."
      ],
      "affectedSurfaces": [
        "release-notes",
        "repo-tooling"
      ]
    },
    {
      "version": "1.113.0",
      "previousVersion": "1.112.0",
      "commitSha": "8b5a6256cf5b7660590df0c4e3786a1a1875ac11",
      "commitTitle": "fix(beta): polish release notes and admin truth cleanup",
      "committedAt": "2026-05-06T17:16:55.000Z",
      "generatedAt": "2026-05-06T17:17:20.048Z",
      "committedAtUtc": "2026-05-06T17:16:55.000Z",
      "generatedAtUtc": "2026-05-06T17:17:20.048Z",
      "diffStats": {
        "rawAdditions": 2413,
        "rawDeletions": 1432,
        "rawChangeCount": 3845,
        "additions": 2413,
        "deletions": 1432,
        "effectiveAdditions": 498,
        "effectiveDeletions": 35,
        "changedFiles": 15,
        "effectiveChangeCount": 533,
        "excludedGeneratedChangeCount": 3312
      },
      "bumpType": "minor",
      "category": "Fixed",
      "title": "Improved Beta update notes",
      "updatedAtUtc": "2026-05-06T17:17:20.048Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools.",
      "userFacingTitle": "Improved Beta update notes",
      "bullets": [
        "Improved Beta notes with cleaner summaries and compact bullets.",
        "Updated timestamps so recent changes are easier to compare with reports.",
        "Reduced technical wording in public update notes."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Admin metrics keep source, range, and freshness details separate from public summaries.",
        "Release note summaries are generated separately from collapsed technical details."
      ],
      "affectedSurfaces": [
        "admin",
        "release-notes",
        "repo-tooling"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
