import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.4.7",
  "betaReleaseCounter": 407,
  "channel": "beta",
  "generatedAt": "2026-05-24T02:55:00.000Z",
  "generatedAtUtc": "2026-05-24T02:55:00.000Z",
  "lastCommitSha": "pending-same-commit",
  "notes": [
    {
      "version": "1.4.7",
      "previousVersion": "1.4.6",
      "betaReleaseCounter": 407,
      "previousBetaReleaseCounter": 406,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(tasks): track lifecycle duration",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-24T02:55:00.000Z",
      "generatedAt": "2026-05-24T02:55:00.000Z",
      "committedAtUtc": "2026-05-24T02:55:00.000Z",
      "generatedAtUtc": "2026-05-24T02:55:00.000Z",
      "updatedAtUtc": "2026-05-24T02:55:00.000Z",
      "category": "Improved",
      "title": "Daily task lifecycle telemetry",
      "summary": "Added daily task lifecycle telemetry, active duration tracking, reward-truth separation, task person metrics, and debug visibility without counting passive page time or changing paid GumDrop math.",
      "userFacingTitle": "Daily task lifecycle telemetry",
      "surfaceCategory": "Daily tasks",
      "bullets": [
        "Added daily task lifecycle telemetry and active duration tracking.",
        "Separated task reward truth from client completion events.",
        "Added task metrics to global and per-user analytics."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added daily task lifecycle and duration contracts, check-in UI/API telemetry wiring, task person metric hydration, debug summary coverage, generated validation, and unit tests while preserving reward-only GumDrops and server reward truth."
      ],
      "affectedSurfaces": [
        "Daily tasks",
        "Check-in",
        "Admin debug",
        "Telemetry",
        "Person metrics"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/daily-task-lifecycle-telemetry.generated.json",
        "docs/agent-truth/daily-task-lifecycle-telemetry.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-daily-task-lifecycle-telemetry.ts",
        "src/app/api/admin/debug/route.ts",
        "src/app/api/checkin/route.ts",
        "src/components/Dashboard/DailyCheckIn.tsx",
        "src/lib/analytics/person-metrics-contract.ts",
        "src/lib/behavioral/event-fact-contract.ts",
        "src/lib/behavioral/event-fact-normalizer.ts",
        "src/lib/behavioral/normalize-event-fact.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "src/lib/tasks/daily-task-contract.ts",
        "src/lib/tasks/daily-task-duration.ts",
        "src/lib/tasks/daily-task-telemetry.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/daily-task-lifecycle-telemetry.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.4.6",
      "previousVersion": "1.4.5",
      "betaReleaseCounter": 406,
      "previousBetaReleaseCounter": 405,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(tasks): lock daily reset truth",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-24T02:35:00.000Z",
      "generatedAt": "2026-05-24T02:35:00.000Z",
      "committedAtUtc": "2026-05-24T02:35:00.000Z",
      "generatedAtUtc": "2026-05-24T02:35:00.000Z",
      "updatedAtUtc": "2026-05-24T02:35:00.000Z",
      "category": "Improved",
      "title": "Daily task reset truth",
      "summary": "Clarified daily task eligibility, Central-time reset timing, duplicate reward protection, reward-GD source truth, and debug visibility without changing paid GumDrop math or payment runtime.",
      "userFacingTitle": "Daily task reset truth",
      "surfaceCategory": "Daily tasks",
      "bullets": [
        "Clarified daily task eligibility, reset timing, and reward-GD source.",
        "Prevented duplicate daily reward claims.",
        "Connected daily task reset health to debug."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added daily task reset contracts, explicit calendar-day reset helpers, check-in route/UI wiring, debug summary coverage, generated validation, and unit tests while keeping reward GumDrops separate from paid GumDrops."
      ],
      "affectedSurfaces": [
        "Daily tasks",
        "Check-in",
        "Admin debug",
        "Telemetry"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/daily-task-reset-truth.generated.json",
        "docs/agent-truth/daily-task-reset-truth.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-daily-task-reset-truth.ts",
        "src/app/api/admin/debug/route.ts",
        "src/app/api/checkin/route.ts",
        "src/components/Dashboard/DailyCheckIn.tsx",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "src/lib/tasks/daily-task-contract.ts",
        "src/lib/tasks/daily-task-reset.ts",
        "tests/unit/daily-task-reset-truth.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.4.5",
      "previousVersion": "1.4.4",
      "betaReleaseCounter": 405,
      "previousBetaReleaseCounter": 404,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(chat): lock functionality readiness",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T23:00:00.000Z",
      "generatedAt": "2026-05-23T23:00:00.000Z",
      "committedAtUtc": "2026-05-23T23:00:00.000Z",
      "generatedAtUtc": "2026-05-23T23:00:00.000Z",
      "updatedAtUtc": "2026-05-23T23:00:00.000Z",
      "category": "Improved",
      "title": "Chat functionality readiness lock",
      "summary": "Locked chat realtime, typing, paid-GD gating, moderation, telemetry, transcript truth, person metrics, and debug score readiness without changing chat design, GumDrop math, or payment runtime.",
      "userFacingTitle": "Chat functionality readiness lock",
      "surfaceCategory": "Chat & support",
      "bullets": [
        "Locked chat realtime, typing, gating, moderation, and telemetry readiness.",
        "Connected chat usage and errors to admin truth and person metrics.",
        "Kept chat design, GumDrop math, and payment runtime unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the chat telemetry admin truth and functionality score-lock contracts, validators, generated evidence, unit coverage, event catalog mappings, person metric hydration, and debug summary lane without production reads, transcript dumps, UI redesign, payment runtime changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Chat",
        "Admin debug",
        "Telemetry",
        "Person metrics"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/chat-functionality-score-lock.generated.json",
        "agent/state/chat-telemetry-admin-truth.generated.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/feature-registration-gate.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/chat-functionality-score-lock.md",
        "docs/agent-truth/chat-telemetry-admin-truth.md",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/feature-registration-gate.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-chat-functionality-score-lock.ts",
        "scripts/agent/validate-chat-telemetry-admin-truth.ts",
        "scripts/agent/validate-event-translation-bridge.ts",
        "scripts/agent/validate-feature-registration-gate.ts",
        "src/app/api/admin/debug/route.ts",
        "src/components/Chat/ChatExperience.tsx",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/analytics/person-metrics-contract.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/behavioral/normalize-event-fact.ts",
        "src/lib/chat/chat-telemetry-contract.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "src/lib/server/chat.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/chat-functionality-score-lock.spec.ts",
        "tests/unit/chat-telemetry-admin-truth.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.4.4",
      "previousVersion": "1.4.3",
      "betaReleaseCounter": 404,
      "previousBetaReleaseCounter": 403,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(chat): harden gating moderation",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T22:30:00.000Z",
      "generatedAt": "2026-05-23T22:30:00.000Z",
      "committedAtUtc": "2026-05-23T22:30:00.000Z",
      "generatedAtUtc": "2026-05-23T22:30:00.000Z",
      "updatedAtUtc": "2026-05-23T22:30:00.000Z",
      "category": "Improved",
      "title": "Chat gating and moderation reliability",
      "summary": "Improved chat reliability by confirming paid-GD gating, blocked-send telemetry, media limits, bypass states, and debug visibility.",
      "userFacingTitle": "Chat gating and moderation reliability",
      "surfaceCategory": "Chat & support",
      "bullets": [
        "Verified chat paid-GD gating and moderation enforcement.",
        "Tracked blocked chat attempts and bypass states.",
        "Kept GumDrop math and payment logic unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added source-only chat gating contracts, blocked/bypass telemetry, debug evidence, generated validation, and unit coverage without production reads, UI redesign, payment runtime changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Chat",
        "Admin debug",
        "Telemetry"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/chat-gating-moderation.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/chat-gating-moderation.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-chat-gating-moderation.ts",
        "src/app/api/admin/debug/route.ts",
        "src/app/api/chat/threads/[threadId]/messages/route.ts",
        "src/components/Chat/ChatExperience.tsx",
        "src/lib/chat/chat-gating-contract.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "src/lib/server/chat.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/chat-gating-moderation.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.4.3",
      "previousVersion": "1.4.2",
      "betaReleaseCounter": 403,
      "previousBetaReleaseCounter": 402,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(chat): harden typing presence",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T22:00:00.000Z",
      "generatedAt": "2026-05-23T22:00:00.000Z",
      "committedAtUtc": "2026-05-23T22:00:00.000Z",
      "generatedAtUtc": "2026-05-23T22:00:00.000Z",
      "updatedAtUtc": "2026-05-23T22:00:00.000Z",
      "category": "Improved",
      "title": "Chat presence and typing reliability",
      "summary": "Improved chat presence by keeping typing state ephemeral, throttled, self-cleaning, and visible to debug health checks.",
      "userFacingTitle": "Chat presence and typing reliability",
      "surfaceCategory": "Chat & support",
      "bullets": [
        "Hardened chat typing and presence cleanup.",
        "Reduced typing write spam with throttled ephemeral state.",
        "Added debug visibility for presence health."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added source-only chat presence and typing contracts, throttled typing controller logic, debug evidence, generated validation, and unit coverage without production reads, UI redesign, payment changes, nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Chat",
        "Admin debug",
        "Telemetry"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/chat-presence-typing.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/chat-presence-typing.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-chat-presence-typing.ts",
        "src/components/Chat/ChatExperience.tsx",
        "src/lib/chat/chat-presence-contract.ts",
        "src/lib/chat/chat-typing-controller.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/chat-presence-typing.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.4.2",
      "previousVersion": "1.4.1",
      "betaReleaseCounter": 402,
      "previousBetaReleaseCounter": 401,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(chat): harden realtime propagation",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T21:35:00.000Z",
      "generatedAt": "2026-05-23T21:35:00.000Z",
      "committedAtUtc": "2026-05-23T21:35:00.000Z",
      "generatedAtUtc": "2026-05-23T21:35:00.000Z",
      "updatedAtUtc": "2026-05-23T21:35:00.000Z",
      "category": "Improved",
      "title": "Chat realtime reliability",
      "summary": "Improved chat reliability by tightening realtime listener scope, cleanup, and message propagation evidence.",
      "userFacingTitle": "Chat realtime reliability",
      "surfaceCategory": "Chat & support",
      "bullets": [
        "Hardened chat realtime listener scope and cleanup.",
        "Added chat message propagation telemetry.",
        "Kept chat UI and payment/GumDrop logic unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added source-only chat realtime listener contracts, propagation telemetry, debug evidence, generated validation, and unit coverage without production reads, UI redesign, payment changes, wallet changes, nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Chat",
        "Admin debug",
        "Telemetry"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/chat-realtime-cost-control.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/chat-realtime-cost-control.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-chat-realtime-cost-control.ts",
        "src/components/Chat/ChatExperience.tsx",
        "src/lib/chat/chat-realtime-contract.ts",
        "src/lib/chat/chat-realtime-telemetry.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/chat-realtime-cost-control.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.4.1",
      "previousVersion": "1.4.0",
      "betaReleaseCounter": 401,
      "previousBetaReleaseCounter": 400,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(debug): lock signal zero",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T21:10:00.000Z",
      "generatedAt": "2026-05-23T21:10:00.000Z",
      "committedAtUtc": "2026-05-23T21:10:00.000Z",
      "generatedAtUtc": "2026-05-23T21:10:00.000Z",
      "updatedAtUtc": "2026-05-23T21:10:00.000Z",
      "category": "Improved",
      "title": "Signal zero lock",
      "summary": "Improved internal beta reliability by keeping future activity out of actionable debug noise.",
      "userFacingTitle": "Signal zero lock",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked future activity signals out of actionable debug noise.",
        "Reduced false waiting-on-activity and non-event score penalties to zero.",
        "Reported score progress by dimension with exact next actions."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the source-only final signal zero lock report, validator, and unit coverage without fake activity, production reads, payment changes, chat/nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Admin debug",
        "Beta score",
        "App reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/final-signal-zero-lock.generated.json",
        "docs/agent-truth/final-signal-zero-lock.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-final-signal-zero-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/final-signal-zero-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.4.0",
      "previousVersion": "1.3.99",
      "betaReleaseCounter": 400,
      "previousBetaReleaseCounter": 399,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): stop scoring non-events",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T20:40:00.000Z",
      "generatedAt": "2026-05-23T20:40:00.000Z",
      "committedAtUtc": "2026-05-23T20:40:00.000Z",
      "generatedAtUtc": "2026-05-23T20:40:00.000Z",
      "updatedAtUtc": "2026-05-23T20:40:00.000Z",
      "category": "Improved",
      "title": "Non-event beta score policy",
      "summary": "Improved internal beta scoring so future activity placeholders no longer reduce readiness scores.",
      "userFacingTitle": "Non-event beta score policy",
      "surfaceCategory": "App experience",
      "bullets": [
        "Stopped future activity placeholders from reducing beta score.",
        "Scored actionable signal groups instead of raw debug noise.",
        "Clarified below-80 dimensions by true blocker type."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only non-event score policy, beta score report fields, validator, generated evidence, and unit coverage without fake evidence, production reads, payment changes, chat/nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Beta score",
        "Admin debug",
        "App reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/non-event-score-policy.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/non-event-score-policy.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-non-event-score-policy.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/agent-score/non-event-score-policy.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/non-event-score-policy.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.99",
      "previousVersion": "1.3.98",
      "betaReleaseCounter": 399,
      "previousBetaReleaseCounter": 398,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(debug): group duplicate signals",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T20:20:00.000Z",
      "generatedAt": "2026-05-23T20:20:00.000Z",
      "committedAtUtc": "2026-05-23T20:20:00.000Z",
      "generatedAtUtc": "2026-05-23T20:20:00.000Z",
      "updatedAtUtc": "2026-05-23T20:20:00.000Z",
      "category": "Improved",
      "title": "Debug signal grouping",
      "summary": "Improved internal beta reliability by grouping duplicate debug and telemetry signals by root cause.",
      "userFacingTitle": "Debug signal grouping",
      "surfaceCategory": "App experience",
      "bullets": [
        "Grouped duplicate debug and telemetry signals by root cause.",
        "Collapsed future activity catalog noise by default.",
        "Reduced P1/P2 counts to actionable groups."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added source-only debug signal grouping, backlog summary integration, generated evidence, and unit coverage without production reads, fake activity, payment changes, chat/nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Admin debug",
        "Analytics",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/debug-signal-grouping.generated.json",
        "docs/agent-truth/debug-signal-grouping.md",
        "package.json",
        "scripts/agent/validate-debug-signal-grouping.ts",
        "src/lib/debug/debug-signal-grouping.ts",
        "src/lib/debug/debug-backlog-builder.ts",
        "src/lib/debug/debug-backlog-contract.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/debug-signal-grouping.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.98",
      "previousVersion": "1.3.97",
      "betaReleaseCounter": 398,
      "previousBetaReleaseCounter": 397,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(debug): score signal actionability",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T19:50:00.000Z",
      "generatedAt": "2026-05-23T19:50:00.000Z",
      "committedAtUtc": "2026-05-23T19:50:00.000Z",
      "generatedAtUtc": "2026-05-23T19:50:00.000Z",
      "updatedAtUtc": "2026-05-23T19:50:00.000Z",
      "category": "Improved",
      "title": "Debug signal actionability scoring",
      "summary": "Improved internal beta reliability for debug signal prioritization.",
      "userFacingTitle": "Debug signal actionability scoring",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added actionability scoring for debug and telemetry signals.",
        "Collapsed duplicate and non-actionable future activity signals.",
        "Focused debug output on score-impacting work."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added source-only debug signal actionability scoring, backlog integration, generated evidence, and unit coverage without production reads, fake evidence, payment changes, chat/nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Admin debug",
        "Analytics",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/debug-signal-actionability.generated.json",
        "docs/agent-truth/debug-signal-actionability.md",
        "package.json",
        "scripts/agent/validate-debug-signal-actionability.ts",
        "scripts/agent/validate-debug-backlog-engine.ts",
        "src/lib/debug/debug-signal-actionability.ts",
        "src/lib/debug/debug-backlog-builder.ts",
        "src/lib/debug/debug-backlog-contract.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/debug-signal-actionability.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.97",
      "previousVersion": "1.3.96",
      "betaReleaseCounter": 397,
      "previousBetaReleaseCounter": 396,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(debug): quiet future activity signals",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T19:04:34.035Z",
      "generatedAt": "2026-05-23T19:04:34.035Z",
      "committedAtUtc": "2026-05-23T19:04:34.035Z",
      "generatedAtUtc": "2026-05-23T19:04:34.035Z",
      "updatedAtUtc": "2026-05-23T19:04:34.035Z",
      "category": "Improved",
      "title": "Beta activity signal cleanup",
      "summary": "Improved internal beta reliability for activity signal reporting.",
      "userFacingTitle": "Beta activity signal cleanup",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reclassified future user activity placeholders as quiet catalog items.",
        "Stopped source-ready future activity from appearing as actionable debug noise.",
        "Kept broken telemetry paths actionable."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added source-only future activity classifiers, actionable signal filtering, final lock reporting, generated evidence, and unit coverage without production reads, fake activity, payment changes, chat/nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Admin debug",
        "Analytics",
        "App reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/future-activity-signal-reclassification.generated.json",
        "agent/state/final-testing-tracking-telemetry-lock.generated.json",
        "docs/agent-truth/future-activity-signal-reclassification.md",
        "docs/agent-truth/final-testing-tracking-telemetry-lock.md",
        "package.json",
        "scripts/agent/validate-future-activity-signal-reclassification.ts",
        "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts",
        "src/app/admin/debug/components/DebugTrackingSummaryPanel.tsx",
        "src/lib/debug/actionable-signal-filter.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/debug/future-activity-classifier.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/future-activity-signal-reclassification.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.96",
      "previousVersion": "1.3.95",
      "betaReleaseCounter": 396,
      "previousBetaReleaseCounter": 395,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(analytics): lock testing telemetry score",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T06:48:17.048Z",
      "generatedAt": "2026-05-23T06:48:17.048Z",
      "committedAtUtc": "2026-05-23T06:48:17.048Z",
      "generatedAtUtc": "2026-05-23T06:48:17.048Z",
      "updatedAtUtc": "2026-05-23T06:48:17.048Z",
      "category": "Improved",
      "title": "Improved internal beta reliability",
      "summary": "Improved internal beta reliability for testing, tracking, and score reporting.",
      "userFacingTitle": "Improved internal beta reliability",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked testing, tracking, telemetry triggers, and person metric hydration.",
        "Reduced false waiting-on-activity states.",
        "Reported score progress by dimension, not just overall."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only final lock validator, generated evidence, and unit coverage for score dimensions without production reads, fake activity, payment changes, chat/nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Analytics",
        "Admin debug",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "agent/state/final-testing-tracking-telemetry-lock.generated.json",
        "docs/agent-truth/final-testing-tracking-telemetry-lock.md",
        "scripts/agent/validate-final-testing-tracking-telemetry-lock.ts",
        "tests/unit/final-testing-tracking-telemetry-lock.spec.ts",
        "package.json"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.95",
      "previousVersion": "1.3.94",
      "betaReleaseCounter": 395,
      "previousBetaReleaseCounter": 394,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(admin): refactor user management metrics",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T06:27:28.503Z",
      "generatedAt": "2026-05-23T06:27:28.503Z",
      "committedAtUtc": "2026-05-23T06:27:28.503Z",
      "generatedAtUtc": "2026-05-23T06:27:28.503Z",
      "updatedAtUtc": "2026-05-23T06:27:28.503Z",
      "category": "Improved",
      "title": "User management metrics refactor",
      "summary": "Refactored user management around identity, activity, and confidence summaries.",
      "userFacingTitle": "User management metrics refactor",
      "surfaceCategory": "App experience",
      "bullets": [
        "Refactored user management around identity, activity, and confidence summaries.",
        "Connected individual user metrics to hydration and debug lanes.",
        "Reduced raw user-management sprawl."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only user management contract, validator, generated evidence, debug lane, and compact admin summary UI without production reads, payment changes, chat/nav changes, or GumDrop math changes."
      ],
      "affectedSurfaces": [
        "Admin users",
        "Admin debug",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/context/validator-authority.json",
        "agent/state/user-management-refactor.generated.json",
        "docs/agent-truth/user-management-refactor.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "scripts/agent/validate-user-management-refactor.ts",
        "src/app/admin/users/page.tsx",
        "src/app/api/admin/debug/route.ts",
        "src/lib/admin/user-management-contract.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "tests/unit/user-management-refactor.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.94",
      "previousVersion": "1.3.93",
      "betaReleaseCounter": 394,
      "previousBetaReleaseCounter": 393,
      "commitSha": "pending-same-commit",
      "commitTitle": "test(analytics): cover telemetry triggers",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T05:40:10.585Z",
      "generatedAt": "2026-05-23T05:40:10.585Z",
      "committedAtUtc": "2026-05-23T05:40:10.585Z",
      "generatedAtUtc": "2026-05-23T05:40:10.585Z",
      "updatedAtUtc": "2026-05-23T05:40:10.585Z",
      "category": "Improved",
      "title": "Telemetry trigger coverage",
      "summary": "Added telemetry trigger coverage from user action to score input.",
      "userFacingTitle": "Telemetry trigger coverage",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added telemetry trigger coverage from user action to score input.",
        "Reduced waiting-on-activity gaps with deterministic tests.",
        "Cleaned stale and duplicate tracking validators."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only telemetry trigger matrix, validator, generated evidence, debug lane, and score input without production reads, live data mutation, payment math changes, or fake runtime proof."
      ],
      "affectedSurfaces": [
        "Analytics",
        "Admin debug",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/validator-authority.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/feature-registration-gate.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/telemetry-trigger-test-matrix.generated.json",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/feature-registration-gate.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "docs/agent-truth/telemetry-trigger-test-matrix.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-event-translation-bridge.ts",
        "scripts/agent/validate-person-metrics-hydration.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "scripts/agent/validate-telemetry-trigger-test-matrix.ts",
        "src/app/api/admin/debug/route.ts",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/analytics/person-metrics-contract.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "src/lib/telemetry-catalog.ts",
        "src/lib/testing/telemetry-trigger-test-matrix.ts",
        "tests/unit/debug-tracking-simplification.spec.ts",
        "tests/unit/telemetry-trigger-test-matrix.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.93",
      "previousVersion": "1.3.92",
      "betaReleaseCounter": 393,
      "previousBetaReleaseCounter": 392,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): hydrate person metrics",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T05:05:25.492Z",
      "generatedAt": "2026-05-23T05:05:25.492Z",
      "committedAtUtc": "2026-05-23T05:05:25.492Z",
      "generatedAtUtc": "2026-05-23T05:05:25.492Z",
      "updatedAtUtc": "2026-05-23T05:05:25.492Z",
      "category": "Improved",
      "title": "Person metrics hydration reliability",
      "summary": "Hydrated individual user metrics from canonical event envelopes.",
      "userFacingTitle": "Person metrics hydration reliability",
      "surfaceCategory": "App experience",
      "bullets": [
        "Hydrated individual user metrics from canonical event envelopes.",
        "Added confidence explanations for global, guest, user, and linked-person metrics.",
        "Cleaned stale person-metric logic."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only person metrics hydration bridge, validator, generated evidence, and debug lane without production reads, live data mutation, payment math changes, or fake metric counts."
      ],
      "affectedSurfaces": [
        "Analytics",
        "Admin debug",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/person-metrics-contract.generated.json",
        "agent/state/person-metrics-hydration.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/person-metrics-contract.md",
        "docs/agent-truth/person-metrics-hydration.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-person-metrics-hydration.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "src/app/api/admin/debug/route.ts",
        "src/lib/analytics/person-metrics-contract.ts",
        "src/lib/analytics/person-metrics-hydration.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "tests/unit/debug-tracking-simplification.spec.ts",
        "tests/unit/person-metrics-contract.spec.ts",
        "tests/unit/person-metrics-hydration.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.92",
      "previousVersion": "1.3.91",
      "betaReleaseCounter": 392,
      "previousBetaReleaseCounter": 391,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): bridge event translation",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T04:25:13.808Z",
      "generatedAt": "2026-05-23T04:25:13.808Z",
      "committedAtUtc": "2026-05-23T04:25:13.808Z",
      "generatedAtUtc": "2026-05-23T04:25:13.808Z",
      "updatedAtUtc": "2026-05-23T04:25:13.808Z",
      "category": "Improved",
      "title": "Event translation bridge reliability",
      "summary": "Connected tracked events to feature activity, person metrics, debug evidence, and score inputs.",
      "userFacingTitle": "Event translation bridge reliability",
      "surfaceCategory": "App experience",
      "bullets": [
        "Connected tracked events to feature activity, person metrics, debug evidence, and score inputs.",
        "Reduced false waiting-on-activity states.",
        "Cleaned stale event translation logic."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the source-level event translation bridge and validator covering raw events, envelopes, feature activity, person metrics, debug evidence, and score dimensions."
      ],
      "affectedSurfaces": [
        "Analytics",
        "Admin debug",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/activity-verification-engine.generated.json",
        "agent/state/debug-tracking-simplification.generated.json",
        "agent/state/event-translation-bridge.generated.json",
        "agent/state/evidence-capture-status.generated.json",
        "agent/state/gumdrop-economy-accuracy.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/debug-tracking-simplification.md",
        "docs/agent-truth/event-translation-bridge.md",
        "docs/agent-truth/evidence-capture-status.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-event-translation-bridge.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "src/app/api/admin/debug/route.ts",
        "src/lib/analytics/activity-verification-engine.ts",
        "src/lib/analytics/event-translation-bridge.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/summary.ts",
        "tests/unit/debug-tracking-simplification.spec.ts",
        "tests/unit/event-translation-bridge.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.91",
      "previousVersion": "1.3.90",
      "betaReleaseCounter": 391,
      "previousBetaReleaseCounter": 390,
      "commitSha": "pending-same-commit",
      "commitTitle": "chore(repo): finalize open prs",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T02:50:00.000Z",
      "generatedAt": "2026-05-23T02:50:00.000Z",
      "committedAtUtc": "2026-05-23T02:50:00.000Z",
      "generatedAtUtc": "2026-05-23T02:50:00.000Z",
      "updatedAtUtc": "2026-05-23T02:50:00.000Z",
      "category": "Fixed",
      "title": "Notification and security reliability fixes",
      "summary": "Improved notification accessibility and tightened redirect safety while cleaning up stale PR backlog work.",
      "userFacingTitle": "Notification and security reliability fixes",
      "surfaceCategory": "Notifications",
      "bullets": [
        "Resolved open PR backlog by merging, cherry-picking, or closing stale work.",
        "Integrated safe security, accessibility, and admin performance fixes.",
        "Closed superseded monolith/analytics PRs where current doctrine already covers them."
      ],
      "audience": "users",
      "technicalDetails": [
        "Ported code-only fixes from PRs #278, #281, #282, and #283, closed PR #279 as superseded, and added an open PR finalization validator/report lane without landing Jules scratch notes."
      ],
      "affectedSurfaces": [
        "Notifications",
        "Privacy & security",
        "Admin tools",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/open-pr-finalization.generated.json",
        "docs/agent-truth/open-pr-finalization.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-open-pr-finalization.ts",
        "src/app/api/admin/analytics/historical/route.ts",
        "src/app/api/admin/overview/route.ts",
        "src/components/Dashboard/NotificationPromptBanner.tsx",
        "src/lib/admin-drop-form.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-analytics-historical-engagement.ts",
        "tests/unit/admin-drop-form.spec.ts",
        "tests/unit/admin-overview-route.spec.ts",
        "tests/unit/open-pr-finalization.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.90",
      "previousVersion": "1.3.89",
      "betaReleaseCounter": 390,
      "previousBetaReleaseCounter": 389,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(user): harden profile settings contract",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T02:05:00.000Z",
      "generatedAt": "2026-05-23T02:05:00.000Z",
      "committedAtUtc": "2026-05-23T02:05:00.000Z",
      "generatedAtUtc": "2026-05-23T02:05:00.000Z",
      "updatedAtUtc": "2026-05-23T02:05:00.000Z",
      "category": "Fixed",
      "title": "Profile settings contract hardening",
      "summary": "Hardened Account Settings profile saves around one backend profile contract.",
      "userFacingTitle": "Profile settings contract hardening",
      "surfaceCategory": "Account & onboarding",
      "bullets": [
        "Hardened Account Settings profile saves around one backend profile contract.",
        "Blocked stale profile writes from changing server-owned account fields.",
        "Kept Delete Account, Creator Settings, chat, navigation, payment, and GumDrop logic unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a user profile API contract, validator, generated evidence, and unit coverage while keeping profile reads and writes caller-scoped through /api/user/profile."
      ],
      "affectedSurfaces": [
        "Account Settings",
        "User profile API",
        "Privacy & security"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/user-profile-api-contract.generated.json",
        "docs/agent-truth/user-profile-api-contract.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-user-profile-api-contract.ts",
        "src/app/api/user/profile/route.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/user/user-profile-contract.ts",
        "tests/unit/user-profile-api-contract.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.89",
      "previousVersion": "1.3.88",
      "betaReleaseCounter": 389,
      "previousBetaReleaseCounter": 388,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(settings): consolidate support policy surfaces",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T01:50:00.000Z",
      "generatedAt": "2026-05-23T01:50:00.000Z",
      "committedAtUtc": "2026-05-23T01:50:00.000Z",
      "generatedAtUtc": "2026-05-23T01:50:00.000Z",
      "updatedAtUtc": "2026-05-23T01:50:00.000Z",
      "category": "Fixed",
      "title": "Support and policy surface cleanup",
      "summary": "Connected support, FAQ, policy, privacy, and data export links to canonical trust surfaces with debug visibility.",
      "userFacingTitle": "Support and policy surface cleanup",
      "surfaceCategory": "Account & onboarding",
      "bullets": [
        "Connected FAQ, Support, Policies, Privacy Policy, and Download My Data to canonical trust surfaces.",
        "Consolidated policy links so Account Settings avoids dead or duplicated placeholder pages.",
        "Added debug visibility for support and policy surface health."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a support policy surface contract, validator, generated evidence, and unit coverage while preserving Delete Account, account settings padding, chat, navigation components, payment, wallet, PayPal, and GumDrop math."
      ],
      "affectedSurfaces": [
        "Account Settings",
        "Support",
        "FAQ",
        "Privacy & security",
        "Admin debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/support-policy-surface-cleanup.generated.json",
        "docs/agent-truth/support-policy-surface-cleanup.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-support-policy-surface-cleanup.ts",
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/features/feature-registration-registry.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/support-policy/support-policy-surface-contract.ts",
        "tests/unit/support-policy-surface-cleanup.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.88",
      "previousVersion": "1.3.87",
      "betaReleaseCounter": 388,
      "previousBetaReleaseCounter": 387,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(settings): remove stale client preferences",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T01:30:00.000Z",
      "generatedAt": "2026-05-23T01:30:00.000Z",
      "committedAtUtc": "2026-05-23T01:30:00.000Z",
      "generatedAtUtc": "2026-05-23T01:30:00.000Z",
      "updatedAtUtc": "2026-05-23T01:30:00.000Z",
      "category": "Fixed",
      "title": "Settings preference cleanup",
      "summary": "Cleaned up stale client-only preference paths so Account Settings and Creator Settings stay tied to backend truth.",
      "userFacingTitle": "Settings preference cleanup",
      "surfaceCategory": "Account & onboarding",
      "bullets": [
        "Phased out stale client-only preference truth paths.",
        "Kept privacy and creator settings tied to backend contracts.",
        "Added debug visibility for stale client preference bypasses."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a client preference cleanup contract, validator, generated evidence, and unit coverage while preserving Delete Account, settings padding, chat, navigation components, payment, wallet, PayPal, and GumDrop math."
      ],
      "affectedSurfaces": [
        "Account Settings",
        "Creator Settings",
        "Privacy & security",
        "Admin debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/stale-client-preferences-cleanup.generated.json",
        "docs/agent-truth/stale-client-preferences-cleanup.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-stale-client-preferences-cleanup.ts",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/settings/client-preferences-contract.ts",
        "tests/unit/stale-client-preferences-cleanup.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.87",
      "previousVersion": "1.3.86",
      "betaReleaseCounter": 387,
      "previousBetaReleaseCounter": 386,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(settings): clean stale route aliases",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T01:05:00.000Z",
      "generatedAt": "2026-05-23T01:05:00.000Z",
      "committedAtUtc": "2026-05-23T01:05:00.000Z",
      "generatedAtUtc": "2026-05-23T01:05:00.000Z",
      "updatedAtUtc": "2026-05-23T01:05:00.000Z",
      "category": "Fixed",
      "title": "Settings route cleanup",
      "summary": "Cleaned stale Settings route aliases and kept Account Settings and Creator Settings separated by canonical routes.",
      "userFacingTitle": "Settings route cleanup",
      "surfaceCategory": "Account & onboarding",
      "bullets": [
        "Cleaned stale Settings route aliases and redirects.",
        "Separated Account Settings and Creator Settings routes.",
        "Kept chat, navigation components, payment, and GumDrop logic unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a canonical settings route contract, route-alias cleanup validator, generated evidence, and unit coverage while preserving existing settings control wiring, delete flow, padding, chat, navigation components, payment, wallet, PayPal, and GumDrop math."
      ],
      "affectedSurfaces": [
        "Account Settings",
        "Creator Settings",
        "Privacy & security",
        "Routing"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/settings-route-alias-cleanup.generated.json",
        "docs/agent-truth/settings-route-alias-cleanup.md",
        "docs/agent-truth/creator-nav-role-consolidation.md",
        "docs/agent-truth/creator-surface-routing.md",
        "docs/agent-truth/user-settings-surface.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-settings-creator-dashboard-split.ts",
        "scripts/agent/validate-settings-route-alias-cleanup.ts",
        "src/app/(legal)/privacy/page.tsx",
        "src/app/dashboard/profile/page.tsx",
        "src/lib/analytics-semantics.ts",
        "src/lib/creator-profile-routing.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/settings/settings-route-contract.ts",
        "src/lib/settings/settings-surface-contract.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/settings-route-alias-cleanup.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.86",
      "previousVersion": "1.3.85",
      "betaReleaseCounter": 386,
      "previousBetaReleaseCounter": 385,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(settings): finalize account creator parity",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-23T00:30:41.000Z",
      "generatedAt": "2026-05-23T00:30:41.000Z",
      "committedAtUtc": "2026-05-23T00:30:41.000Z",
      "generatedAtUtc": "2026-05-23T00:30:41.000Z",
      "updatedAtUtc": "2026-05-23T00:30:41.000Z",
      "category": "Fixed",
      "title": "Account and Creator Settings parity",
      "summary": "Connected Account Settings and Creator Settings to backend state, telemetry, debug visibility, and shell-aligned mobile spacing.",
      "userFacingTitle": "Account and Creator Settings parity",
      "surfaceCategory": "Account & onboarding",
      "bullets": [
        "Connected Account Settings and Creator Settings to backend state and telemetry.",
        "Cleaned up stale/conflicting settings logic.",
        "Aligned Account Settings mobile padding with the app shell."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a canonical settings surface contract, settings connection and mobile padding validators, generated evidence, unit coverage, and a single Settings connection health debug lane without touching chat, top nav, bottom nav, payment, wallet, PayPal, GumDrop math, booking attribution math, or Firebase rules."
      ],
      "affectedSurfaces": [
        "Account Settings",
        "Creator Settings",
        "Privacy & security",
        "Mobile UI",
        "Admin debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/account-settings-mobile-padding.generated.json",
        "agent/state/settings-connection-parity.generated.json",
        "docs/agent-truth/account-settings-mobile-padding.md",
        "docs/agent-truth/settings-connection-parity.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-account-settings-mobile-padding.ts",
        "scripts/agent/validate-settings-connection-parity.ts",
        "scripts/rewrite_profile_page.py",
        "scripts/shred_profile.py",
        "scripts/shred_profile_components.py",
        "src/app/dashboard/profile/components/ProfileNotificationsSection.tsx",
        "src/app/dashboard/profile/components/ProfilePrimitives.tsx",
        "src/app/dashboard/profile/components/ProfilePrivacyDataSection.tsx",
        "src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx",
        "src/app/dashboard/profile/hooks/useProfileState.tsx",
        "src/components/Creators/CreatorDashboardSettingsHub.tsx",
        "src/components/Settings/UserSettingsPage.tsx",
        "src/lib/debug/debug-panel-tracking-summary.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/settings/settings-surface-contract.ts",
        "src/lib/telemetry-catalog.ts",
        "src/lib/telemetry.ts",
        "tests/unit/account-settings-mobile-padding.spec.ts",
        "tests/unit/settings-connection-parity.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.85",
      "previousVersion": "1.3.84",
      "betaReleaseCounter": 385,
      "previousBetaReleaseCounter": 384,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(account): finalize delete flow",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-22T23:58:00.000Z",
      "generatedAt": "2026-05-22T23:58:00.000Z",
      "committedAtUtc": "2026-05-22T23:58:00.000Z",
      "generatedAtUtc": "2026-05-22T23:58:00.000Z",
      "updatedAtUtc": "2026-05-22T23:58:00.000Z",
      "category": "Fixed",
      "title": "Account settings delete flow",
      "summary": "Refined Account Settings mobile spacing and finalized the Delete Account confirmation flow with clear failure states.",
      "userFacingTitle": "Account settings delete flow",
      "surfaceCategory": "Account & onboarding",
      "bullets": [
        "Added safe bottom spacing for Account Settings on mobile.",
        "Finalized the Delete Account flow with confirmation and clear failure states.",
        "Kept Report issue, navigation, chat, payment, and GumDrop logic unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added Account Settings bottom safe-area markers, modal confirmation, deletion telemetry, debug-visible failure reporting, generated evidence, and unit coverage without changing Report issue, navigation, chat, payment, wallet, PayPal, or GumDrop logic."
      ],
      "affectedSurfaces": [
        "Account Settings",
        "Privacy & security",
        "Mobile UI"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/account-settings-delete-flow.generated.json",
        "docs/agent-truth/account-settings-delete-flow.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-account-settings-delete-flow.ts",
        "src/app/dashboard/profile/components/ProfileSupportSafetySection.tsx",
        "src/app/dashboard/profile/hooks/useProfileState.tsx",
        "src/components/Settings/UserSettingsPage.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/telemetry-catalog.ts",
        "src/lib/telemetry.ts",
        "tests/unit/account-settings-delete-flow.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.84",
      "previousVersion": "1.3.83",
      "betaReleaseCounter": 384,
      "previousBetaReleaseCounter": 383,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(chat): lift new message modal",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-22T23:55:00.000Z",
      "generatedAt": "2026-05-22T23:55:00.000Z",
      "committedAtUtc": "2026-05-22T23:55:00.000Z",
      "generatedAtUtc": "2026-05-22T23:55:00.000Z",
      "updatedAtUtc": "2026-05-22T23:55:00.000Z",
      "category": "Fixed",
      "title": "New message modal polish",
      "summary": "Refined the Chat tab New message modal so it clears the mobile bottom navigation and uses the black frosted glass panel treatment.",
      "userFacingTitle": "New message modal polish",
      "surfaceCategory": "Chat & support",
      "bullets": [
        "Lifted the new message modal above the bottom navigation on mobile.",
        "Matched the new message modal to the black frosted glass design.",
        "Kept chat routing, messaging, and creator picker logic unchanged."
      ],
      "audience": "all",
      "technicalDetails": [
        "Updated only the New message modal presentation in ChatExperience with shared bottom-nav safe-area offset markers, black glass styling, generated evidence, and unit coverage."
      ],
      "affectedSurfaces": [
        "Chat",
        "Mobile UI"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/chat-composer-modal-lift.generated.json",
        "docs/agent-truth/chat-composer-modal-lift.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-chat-composer-modal-lift.ts",
        "src/components/Chat/ChatExperience.tsx",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/chat-composer-modal-lift.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.83",
      "previousVersion": "1.3.82",
      "betaReleaseCounter": 383,
      "previousBetaReleaseCounter": 382,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(analytics): lock user tracking handoff",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-22T23:35:00.000Z",
      "generatedAt": "2026-05-22T23:35:00.000Z",
      "committedAtUtc": "2026-05-22T23:35:00.000Z",
      "generatedAtUtc": "2026-05-22T23:35:00.000Z",
      "updatedAtUtc": "2026-05-22T23:35:00.000Z",
      "category": "Improved",
      "title": "Final user tracking handoff lock",
      "summary": "Locked guest-to-user tracking, per-person analytics, event envelope, legacy recovery, and debug lane contracts for future telemetry work.",
      "userFacingTitle": "Final user tracking handoff lock",
      "surfaceCategory": "Privacy & security",
      "bullets": [
        "Locked guest-to-user tracking and per-person analytics handoff.",
        "Simplified debug tracking lanes.",
        "Prepared telemetry for future features without recurring refactors."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the final user tracking handoff lock validator, generated evidence, documentation, and unit coverage without reading production data, mutating legacy records, or changing payment, GumDrop, chat, or navigation runtime."
      ],
      "affectedSurfaces": [
        "Analytics",
        "Privacy",
        "Admin debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/final-user-tracking-handoff-lock.generated.json",
        "agent/state/new-additions-score-coverage.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/current-beta-exit-status.md",
        "docs/agent-truth/final-user-tracking-handoff-lock.md",
        "docs/agent-truth/new-additions-score-coverage.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-final-user-tracking-handoff-lock.ts",
        "scripts/agent/validate-new-additions-score-coverage.ts",
        "src/app/api/admin/debug/route.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/final-user-tracking-handoff-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    }
  ]
} satisfies PublicReleaseNotesDocument;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion;
export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;
