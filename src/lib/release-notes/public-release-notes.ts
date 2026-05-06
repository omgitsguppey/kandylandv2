import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.113.2",
  "channel": "beta",
  "generatedAt": "2026-05-06T19:47:11.550Z",
  "generatedAtUtc": "2026-05-06T19:47:11.550Z",
  "lastCommitSha": "b522306e5d1e92e473ee9fed14dbd852429a96a8",
  "notes": [
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
    },
    {
      "version": "1.112.0",
      "previousVersion": "1.111.0",
      "commitSha": "6b88d0fd95672cbf18e4cbcb91a4996037520dd7",
      "commitTitle": "fix(system): harden deterministic admin truth surfaces",
      "committedAt": "2026-05-06T17:01:38.000Z",
      "generatedAt": "2026-05-06T17:11:11.469Z",
      "committedAtUtc": "2026-05-06T17:01:38.000Z",
      "generatedAtUtc": "2026-05-06T17:11:11.469Z",
      "diffStats": {
        "rawAdditions": 605,
        "rawDeletions": 36,
        "rawChangeCount": 641,
        "additions": 605,
        "deletions": 36,
        "effectiveAdditions": 605,
        "effectiveDeletions": 36,
        "changedFiles": 29,
        "effectiveChangeCount": 641,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "title": "Improved admin status accuracy",
      "updatedAtUtc": "2026-05-06T17:11:11.469Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools.",
      "userFacingTitle": "Improved admin status accuracy",
      "bullets": [
        "Fixed admin labels that could appear stuck after data loaded.",
        "Improved how hidden, delayed, or unavailable data is labeled.",
        "Reduced confusing status messages in Beta admin tools."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Admin metrics keep source, range, and freshness details separate from public summaries."
      ],
      "affectedSurfaces": [
        "admin",
        "documentation",
        "repo-tooling",
        "telemetry"
      ]
    },
    {
      "version": "1.111.0",
      "previousVersion": "1.110.0",
      "commitSha": "2df00e332c340fc3b5b7cdb5c0b4dad0463341c3",
      "commitTitle": "fix(admin): clarify library viewer drilldown truth",
      "committedAt": "2026-05-06T16:37:58.000Z",
      "generatedAt": "2026-05-06T17:11:11.313Z",
      "committedAtUtc": "2026-05-06T16:37:58.000Z",
      "generatedAtUtc": "2026-05-06T17:11:11.313Z",
      "diffStats": {
        "rawAdditions": 297,
        "rawDeletions": 43,
        "rawChangeCount": 340,
        "additions": 297,
        "deletions": 43,
        "effectiveAdditions": 297,
        "effectiveDeletions": 43,
        "changedFiles": 9,
        "effectiveChangeCount": 340,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "title": "Improved admin status accuracy",
      "updatedAtUtc": "2026-05-06T17:11:11.313Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools.",
      "userFacingTitle": "Improved admin status accuracy",
      "bullets": [
        "Clarified verified and estimated viewer watch time.",
        "Improved stale and quiet viewer activity labels.",
        "Updated viewer rows to use readable names where available."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Admin metrics keep source, range, and freshness details separate from public summaries."
      ],
      "affectedSurfaces": [
        "admin",
        "repo-tooling"
      ]
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
