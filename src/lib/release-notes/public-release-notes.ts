import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.2.3",
  "betaReleaseCounter": 203,
  "channel": "beta",
  "generatedAt": "2026-05-07T22:13:11.677Z",
  "generatedAtUtc": "2026-05-07T22:13:11.677Z",
  "lastCommitSha": "6225b319e620d1e4385016b0cfebf2e7b99b2546",
  "notes": [
    {
      "version": "1.2.3",
      "previousVersion": "1.2.2",
      "betaReleaseCounter": 203,
      "previousBetaReleaseCounter": 202,
      "commitSha": "6225b319e620d1e4385016b0cfebf2e7b99b2546",
      "commitTitle": "fix(admin): rebuild drop asset upload progress",
      "commitCount": 3,
      "commitShas": [
        "6beb73fd97782acb9d51b79ddafc1898b14c2a19",
        "623500cbab6d4f75c0dee0d8d93b4281fbdfe8b6",
        "6225b319e620d1e4385016b0cfebf2e7b99b2546"
      ],
      "committedAt": "2026-05-07T21:23:52.000Z",
      "generatedAt": "2026-05-07T22:13:11.677Z",
      "committedAtUtc": "2026-05-07T21:23:52.000Z",
      "generatedAtUtc": "2026-05-07T22:13:11.677Z",
      "category": "Admin",
      "title": "Improved drop conversion review",
      "updatedAtUtc": "2026-05-07T22:13:11.677Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools, plus behind-the-scenes reliability work.",
      "userFacingTitle": "Improved drop conversion review",
      "surfaceCategory": "Admin tools",
      "bullets": [
        "Fixed admin labels that could appear stuck after data loaded.",
        "Improved how hidden, delayed, or unavailable data is labeled.",
        "Improved behind-the-scenes reliability without changing core admin workflows."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Grouped 3 commits into one accepted beta release.",
        "Includes internal reliability work that does not change the public product surface."
      ],
      "affectedSurfaces": [
        "admin"
      ],
      "hiddenFromPublic": false
    },
    {
      "version": "1.2.2",
      "previousVersion": "1.2.1",
      "betaReleaseCounter": 202,
      "previousBetaReleaseCounter": 201,
      "commitSha": "75cf6cad6b805bc086d0f6b884596028c25bf012",
      "commitTitle": "docs(agent): record phase 1 truth gate",
      "commitCount": 21,
      "commitShas": [
        "d0be5219bcfd0ab2146215653ec9bbf0a6d5a958",
        "1e6c789b6c45c87dbe805f2ba6c1f28c8f6541df",
        "001975daf654eda04da0c6cb5045a5b3aaf2470a",
        "502f677b07df5d10c7157316374e438bdf7f6446",
        "983b2a7cc33a17f563c4899d8e8ccdb4367e1c0e",
        "db8528aa6c86cd9dc34e36d9d27385511e20bc5e",
        "8db96e0ee276bf2ac32f0023846943b5ba87f982",
        "60a0ab66d9298efd7aa8dd3cea0409f39410bc62",
        "f1ce2463fcf29285316fb98bb0d0a4323c02a9c0",
        "1e2f4dcadb46d645713b5d92a0e1a4bff4d8f948",
        "8e0ca36b0ce7216ba9b0d5561a384ca790773d61",
        "ab86315907b63b0292353a71e99bd1ec94a6d845",
        "d335d5e9742453c2cca000b1407782ff7a2a2508",
        "3e62f9141c956d0039c96ec4266b28ddc9918d72",
        "7995314e8a4997928c5031ee2f1fd80fbde335dc",
        "c50086810738f2c91c0853f8b0e9d3db66279f4b",
        "765ed141f86a13b7592374605814b5a3f44d7829",
        "8e9bbffe96603ffd424f2747a5dfc1ce081adc6f",
        "a330e8fa9ddcb1f97b4e0642b7d54e1f492e8e18",
        "aec5d53347d2b1c8cd5e364c1391ce9a645053a8",
        "75cf6cad6b805bc086d0f6b884596028c25bf012"
      ],
      "committedAt": "2026-05-07T04:09:56.000Z",
      "generatedAt": "2026-05-07T04:14:54.576Z",
      "committedAtUtc": "2026-05-07T04:09:56.000Z",
      "generatedAtUtc": "2026-05-07T04:14:54.576Z",
      "category": "Admin",
      "title": "Improved Beta updates and version visibility",
      "updatedAtUtc": "2026-05-07T04:14:54.576Z",
      "summary": "Bug fixes and quality-of-life improvements for Beta updates, version visibility, and behind-the-scenes release reliability.",
      "userFacingTitle": "Improved Beta updates and version visibility",
      "bullets": [
        "Improved how the Beta drawer opens the latest accepted updates.",
        "Reduced stale or repeated release-note copy in the visible Beta feed.",
        "Improved behind-the-scenes release tracking without flooding public notes with internal audit churn."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Grouped 21 commits into one accepted beta release.",
        "Includes internal reliability work that does not change the public product surface."
      ],
      "affectedSurfaces": [
        "account-onboarding",
        "admin",
        "creator",
        "drops-viewer",
        "navigation",
        "notifications",
        "wallet"
      ],
      "surfaceCategory": "Admin tools",
      "hiddenFromPublic": false
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
      "title": "Improved admin reliability and status accuracy",
      "updatedAtUtc": "2026-05-06T17:11:11.469Z",
      "summary": "Bug fixes and quality-of-life improvements for admin review tools, plus behind-the-scenes reliability work.",
      "userFacingTitle": "Improved admin reliability and status accuracy",
      "bullets": [
        "Fixed admin labels that could appear stuck after data loaded.",
        "Improved how hidden, delayed, or unavailable data is labeled.",
        "Improved behind-the-scenes reliability without changing core admin workflows."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Includes internal reliability work that does not change the public product surface."
      ],
      "affectedSurfaces": [
        "admin",
        "drops-viewer"
      ],
      "surfaceCategory": "Admin tools",
      "hiddenFromPublic": false
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
      "summary": "Bug fixes and quality-of-life improvements for admin review tools, plus behind-the-scenes reliability work.",
      "userFacingTitle": "Improved viewer analytics",
      "bullets": [
        "Clarified verified and estimated viewer watch time.",
        "Improved stale and quiet viewer activity labels.",
        "Updated viewer rows to use readable names where available."
      ],
      "audience": "admins",
      "affectedSurfaces": [
        "admin",
        "drops-viewer"
      ],
      "surfaceCategory": "Admin tools",
      "technicalDetails": [
        "Includes internal reliability work that does not change the public product surface."
      ],
      "hiddenFromPublic": false
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
      "summary": "Bug fixes and quality-of-life improvements for admin review tools, plus behind-the-scenes reliability work.",
      "userFacingTitle": "Improved transaction review",
      "bullets": [
        "Added clearer names to recent transaction rows.",
        "Improved GumDrops transaction labels and timestamps for admin review.",
        "Clarified unavailable commerce details instead of showing waiting states."
      ],
      "audience": "admins",
      "affectedSurfaces": [
        "admin"
      ],
      "surfaceCategory": "Admin tools",
      "technicalDetails": [
        "Includes internal reliability work that does not change the public product surface."
      ],
      "hiddenFromPublic": false
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
