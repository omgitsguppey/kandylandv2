import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.113.0",
  "channel": "beta",
  "generatedAt": "2026-05-06T17:17:20.048Z",
  "generatedAtUtc": "2026-05-06T17:17:20.048Z",
  "lastCommitSha": "8b5a6256cf5b7660590df0c4e3786a1a1875ac11",
  "notes": [
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
    },
    {
      "version": "1.110.0",
      "previousVersion": "1.109.0",
      "commitSha": "0f5c808375eb600082da4b19f178a08386119f38",
      "commitTitle": "fix(admin): tighten commerce feed mobile cards",
      "committedAt": "2026-05-06T16:22:45.000Z",
      "generatedAt": "2026-05-06T17:11:11.166Z",
      "committedAtUtc": "2026-05-06T16:22:45.000Z",
      "generatedAtUtc": "2026-05-06T17:11:11.166Z",
      "diffStats": {
        "rawAdditions": 364,
        "rawDeletions": 29,
        "rawChangeCount": 393,
        "additions": 364,
        "deletions": 29,
        "effectiveAdditions": 364,
        "effectiveDeletions": 29,
        "changedFiles": 8,
        "effectiveChangeCount": 393,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "title": "Improved transaction review",
      "updatedAtUtc": "2026-05-06T17:11:11.166Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools.",
      "userFacingTitle": "Improved transaction review",
      "bullets": [
        "Added clearer names to recent transaction rows.",
        "Improved GumDrops transaction labels and timestamps for admin review.",
        "Clarified unavailable commerce details instead of showing waiting states."
      ],
      "audience": "admins",
      "affectedSurfaces": [
        "admin",
        "repo-tooling"
      ]
    },
    {
      "version": "1.109.0",
      "previousVersion": "1.108.0",
      "commitSha": "05ad94d6859c78ab686e479d8eab5c976631130d",
      "commitTitle": "fix(admin): clarify top drop unwrap conversion",
      "committedAt": "2026-05-06T16:10:11.000Z",
      "generatedAt": "2026-05-06T17:11:11.020Z",
      "committedAtUtc": "2026-05-06T16:10:11.000Z",
      "generatedAtUtc": "2026-05-06T17:11:11.020Z",
      "diffStats": {
        "rawAdditions": 532,
        "rawDeletions": 131,
        "rawChangeCount": 663,
        "additions": 532,
        "deletions": 131,
        "effectiveAdditions": 532,
        "effectiveDeletions": 131,
        "changedFiles": 12,
        "effectiveChangeCount": 663,
        "excludedGeneratedChangeCount": 0
      },
      "bumpType": "minor",
      "category": "Fixed",
      "title": "Improved drop conversion review",
      "updatedAtUtc": "2026-05-06T17:11:11.020Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools.",
      "userFacingTitle": "Improved drop conversion review",
      "bullets": [
        "Improved drop rows with readable names instead of long IDs.",
        "Clarified unwrap counts and small conversion percentages.",
        "Added page controls when more drop rows are available."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Display language uses unwrap; backend entitlement fields may still use unlock."
      ],
      "affectedSurfaces": [
        "admin",
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
