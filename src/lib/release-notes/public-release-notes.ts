import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.2.4",
  "betaReleaseCounter": 204,
  "channel": "beta",
  "generatedAt": "2026-05-08T02:13:08.504Z",
  "generatedAtUtc": "2026-05-08T02:13:08.504Z",
  "lastCommitSha": "4b9c3f538e3d33ec2a3ee10986e2c51b345a2ee6",
  "notes": [
    {
      "version": "1.2.4",
      "previousVersion": "1.2.3",
      "betaReleaseCounter": 204,
      "previousBetaReleaseCounter": 203,
      "commitSha": "4b9c3f538e3d33ec2a3ee10986e2c51b345a2ee6",
      "commitTitle": "fix(beta): finalize release notes cutover",
      "commitCount": 10,
      "commitShas": [
        "7d29606a265a76f6979140e20c387783b596f5da",
        "51cfd774a159e68147d80aa5afbe48a99d3d4947",
        "7ed7de998f0555b54ac2cb84d3ae53b93fb0a3b9",
        "8b6de1d711c283c80663c9bcbb23529cfd628077",
        "2bdfa9abde198a1aa2c5f8737f880d6d26306e06",
        "87e51414d24bc762009cdb8e95f7f24468bda955",
        "5528ba6d262dd32644629d70f2ecb050fbedabfe",
        "e8b7b3ef2626e27a431e25a07d6fe5db5f5f0bc4",
        "de0378d4f21050638dabffa735bc58085573094c",
        "4b9c3f538e3d33ec2a3ee10986e2c51b345a2ee6"
      ],
      "committedAt": "2026-05-08T02:12:38.000Z",
      "generatedAt": "2026-05-08T02:13:08.503Z",
      "committedAtUtc": "2026-05-08T02:12:38.000Z",
      "generatedAtUtc": "2026-05-08T02:13:08.503Z",
      "category": "Beta",
      "title": "Improved Beta updates and version visibility",
      "updatedAtUtc": "2026-05-08T02:13:08.503Z",
      "summary": "Bug fixes and quality-of-life improvements for Beta updates, version visibility, and behind-the-scenes release reliability.",
      "userFacingTitle": "Improved Beta updates and version visibility",
      "surfaceCategory": "Navigation",
      "bullets": [
        "Improved how the Beta drawer opens the latest accepted updates.",
        "Reduced stale or repeated release-note copy in the visible Beta feed.",
        "Improved behind-the-scenes release tracking without flooding public notes with internal audit churn."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 10 commits into one accepted beta release.",
        "Includes internal reliability work that does not change the public product surface."
      ],
      "affectedSurfaces": [
        "account-onboarding",
        "admin",
        "chat-support",
        "navigation",
        "privacy-security",
        "wallet"
      ],
      "hiddenFromPublic": false
    },
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
      "category": "Internal",
      "title": "Internal admin reliability improvements",
      "updatedAtUtc": "2026-05-07T22:13:11.677Z",
      "summary": "Internal reliability updates for admin-only tooling with no public app change.",
      "userFacingTitle": "Internal admin reliability improvements",
      "surfaceCategory": "Admin tools",
      "bullets": [
        "Improved behind-the-scenes reliability for the current Beta build.",
        "Reduced internal admin tooling churn from appearing as a public app update."
      ],
      "audience": "admins",
      "technicalDetails": [
        "Grouped 3 commits into one accepted beta release.",
        "Includes internal reliability work that does not change the public product surface."
      ],
      "affectedSurfaces": [
        "admin"
      ],
      "hiddenFromPublic": true
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
      "category": "Beta",
      "title": "Improved Beta updates and version visibility",
      "updatedAtUtc": "2026-05-07T04:14:54.576Z",
      "summary": "Bug fixes and quality-of-life improvements for Beta updates, version visibility, and behind-the-scenes release reliability.",
      "userFacingTitle": "Improved Beta updates and version visibility",
      "bullets": [
        "Improved how the Beta drawer opens the latest accepted updates.",
        "Reduced stale or repeated release-note copy in the visible Beta feed.",
        "Improved behind-the-scenes release tracking without flooding public notes with internal audit churn."
      ],
      "audience": "all",
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
      "surfaceCategory": "Navigation",
      "hiddenFromPublic": false
    },
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
      "category": "Beta",
      "title": "Improved Beta updates and version visibility",
      "updatedAtUtc": "2026-05-06T19:58:40.373Z",
      "summary": "Bug fixes and quality-of-life improvements for Beta updates, version visibility, and behind-the-scenes release reliability.",
      "userFacingTitle": "Improved Beta updates and version visibility",
      "bullets": [
        "Improved how the Beta drawer opens the latest accepted updates.",
        "Reduced stale or repeated release-note copy in the visible Beta feed.",
        "Improved behind-the-scenes release tracking without flooding public notes with internal audit churn."
      ],
      "audience": "all",
      "technicalDetails": [
        "Grouped 4 commits into one accepted beta release.",
        "Includes internal reliability work that does not change the public product surface."
      ],
      "affectedSurfaces": [
        "admin",
        "navigation"
      ],
      "surfaceCategory": "Navigation",
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
      "category": "Fixed",
      "title": "Improved drops and viewer reliability",
      "updatedAtUtc": "2026-05-06T17:11:11.469Z",
      "summary": "Bug fixes and quality-of-life improvements for drops, previews, and viewer behavior.",
      "userFacingTitle": "Improved drops and viewer reliability",
      "bullets": [
        "Improved drop and viewer reliability so usage states stay easier to understand.",
        "Reduced confusing stale or delayed states across previews and viewer surfaces."
      ],
      "audience": "users",
      "technicalDetails": [
        "Includes internal reliability work that does not change the public product surface."
      ],
      "affectedSurfaces": [
        "admin",
        "drops-viewer"
      ],
      "surfaceCategory": "Drops & viewer",
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
      "category": "Fixed",
      "title": "Improved drops and viewer reliability",
      "updatedAtUtc": "2026-05-06T17:11:11.313Z",
      "summary": "Bug fixes and quality-of-life improvements for drops, previews, and viewer behavior.",
      "userFacingTitle": "Improved drops and viewer reliability",
      "bullets": [
        "Improved drop and viewer reliability so usage states stay easier to understand.",
        "Reduced confusing stale or delayed states across previews and viewer surfaces."
      ],
      "audience": "users",
      "affectedSurfaces": [
        "admin",
        "drops-viewer"
      ],
      "surfaceCategory": "Drops & viewer",
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
      "category": "Internal",
      "title": "Internal admin reliability improvements",
      "updatedAtUtc": "2026-05-06T17:11:11.166Z",
      "summary": "Internal reliability updates for admin-only tooling with no public app change.",
      "userFacingTitle": "Internal admin reliability improvements",
      "bullets": [
        "Improved behind-the-scenes reliability for the current Beta build.",
        "Reduced internal admin tooling churn from appearing as a public app update."
      ],
      "audience": "admins",
      "affectedSurfaces": [
        "admin"
      ],
      "surfaceCategory": "Admin tools",
      "technicalDetails": [
        "Includes internal reliability work that does not change the public product surface."
      ],
      "hiddenFromPublic": true
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
      "category": "Fixed",
      "title": "Improved drops and viewer reliability",
      "updatedAtUtc": "2026-05-06T17:11:11.020Z",
      "summary": "Bug fixes and quality-of-life improvements for drops, previews, and viewer behavior.",
      "userFacingTitle": "Improved drops and viewer reliability",
      "bullets": [
        "Improved drop and viewer reliability so usage states stay easier to understand.",
        "Reduced confusing stale or delayed states across previews and viewer surfaces."
      ],
      "audience": "users",
      "technicalDetails": [
        "Includes internal reliability work that does not change the public product surface."
      ],
      "affectedSurfaces": [
        "admin",
        "drops-viewer"
      ],
      "surfaceCategory": "Drops & viewer",
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
