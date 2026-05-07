import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.2.1",
  "betaReleaseCounter": 201,
  "channel": "beta",
  "generatedAt": "2026-05-06T19:58:40.374Z",
  "generatedAtUtc": "2026-05-06T19:58:40.374Z",
  "lastCommitSha": "b43f8f272fe4071e4731d9d4e24d60f416b7a902",
  "notes": [
    {
      "version": "1.2.1",
      "previousVersion": "1.2.0",
      "betaReleaseCounter": 201,
      "previousBetaReleaseCounter": 200,
      "commitSha": "b43f8f272fe4071e4731d9d4e24d60f416b7a902",
      "commitTitle": "fix(beta): improve beta update notes and changelog behavior",
      "commitCount": 4,
      "commitShas": [
        "8b5a6256cf5b7660590df0c4e3786a1a1875ac11",
        "04b6e80c3f6bdd7eed4d17f2b5c337815d62cb85",
        "b522306e5d1e92e473ee9fed14dbd852429a96a8",
        "b43f8f272fe4071e4731d9d4e24d60f416b7a902"
      ],
      "committedAt": "2026-05-06T19:58:25.000Z",
      "generatedAt": "2026-05-06T19:58:40.373Z",
      "committedAtUtc": "2026-05-06T19:58:25.000Z",
      "generatedAtUtc": "2026-05-06T19:58:40.373Z",
      "category": "Fixed",
      "title": "Improved Beta update notes",
      "updatedAtUtc": "2026-05-06T19:58:40.373Z",
      "summary": "Cleaner Beta update notes with clearer summaries and timestamps.",
      "userFacingTitle": "Improved Beta update notes",
      "bullets": [
        "Improved Beta notes with cleaner summaries and compact bullets.",
        "Updated the Beta badge and panel so the latest changelog opens more reliably.",
        "Reduced technical wording in public update notes."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 4 commits into one accepted beta release.",
        "Release note summaries remain separate from collapsed technical details."
      ],
      "affectedSurfaces": [
        "navigation",
        "release-notes",
        "repo-tooling"
      ]
    },
    {
      "version": "1.2.0",
      "previousVersion": "1.1.99",
      "betaReleaseCounter": 200,
      "previousBetaReleaseCounter": 199,
      "commitSha": "6b88d0fd95672cbf18e4cbcb91a4996037520dd7",
      "commitTitle": "fix(system): harden deterministic admin truth surfaces",
      "commitCount": 1,
      "commitShas": [
        "6b88d0fd95672cbf18e4cbcb91a4996037520dd7"
      ],
      "committedAt": "2026-05-06T17:01:38.000Z",
      "generatedAt": "2026-05-06T17:11:11.469Z",
      "committedAtUtc": "2026-05-06T17:01:38.000Z",
      "generatedAtUtc": "2026-05-06T17:11:11.469Z",
      "category": "Admin",
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
      "version": "1.1.99",
      "previousVersion": "1.1.98",
      "betaReleaseCounter": 199,
      "previousBetaReleaseCounter": 198,
      "commitSha": "2df00e332c340fc3b5b7cdb5c0b4dad0463341c3",
      "commitTitle": "fix(admin): clarify library viewer drilldown truth",
      "commitCount": 1,
      "commitShas": [
        "2df00e332c340fc3b5b7cdb5c0b4dad0463341c3"
      ],
      "committedAt": "2026-05-06T16:37:58.000Z",
      "generatedAt": "2026-05-06T17:11:11.313Z",
      "committedAtUtc": "2026-05-06T16:37:58.000Z",
      "generatedAtUtc": "2026-05-06T17:11:11.313Z",
      "category": "Admin",
      "title": "Improved viewer analytics",
      "updatedAtUtc": "2026-05-06T17:11:11.313Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools.",
      "userFacingTitle": "Improved viewer analytics",
      "bullets": [
        "Clarified verified and estimated viewer watch time.",
        "Improved stale and quiet viewer activity labels.",
        "Updated viewer rows to use readable names where available."
      ],
      "audience": "admins",
      "affectedSurfaces": [
        "admin",
        "repo-tooling"
      ]
    },
    {
      "version": "1.1.98",
      "previousVersion": "1.1.97",
      "betaReleaseCounter": 198,
      "previousBetaReleaseCounter": 197,
      "commitSha": "0f5c808375eb600082da4b19f178a08386119f38",
      "commitTitle": "fix(admin): tighten commerce feed mobile cards",
      "commitCount": 1,
      "commitShas": [
        "0f5c808375eb600082da4b19f178a08386119f38"
      ],
      "committedAt": "2026-05-06T16:22:45.000Z",
      "generatedAt": "2026-05-06T17:11:11.166Z",
      "committedAtUtc": "2026-05-06T16:22:45.000Z",
      "generatedAtUtc": "2026-05-06T17:11:11.166Z",
      "category": "Admin",
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
      "version": "1.1.97",
      "previousVersion": "1.1.96",
      "betaReleaseCounter": 197,
      "previousBetaReleaseCounter": 196,
      "commitSha": "05ad94d6859c78ab686e479d8eab5c976631130d",
      "commitTitle": "fix(admin): clarify top drop unwrap conversion",
      "commitCount": 1,
      "commitShas": [
        "05ad94d6859c78ab686e479d8eab5c976631130d"
      ],
      "committedAt": "2026-05-06T16:10:11.000Z",
      "generatedAt": "2026-05-06T17:11:11.020Z",
      "committedAtUtc": "2026-05-06T16:10:11.000Z",
      "generatedAtUtc": "2026-05-06T17:11:11.020Z",
      "category": "Admin",
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
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
