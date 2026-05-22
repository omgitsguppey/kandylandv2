import type { PublicReleaseNotesDocument } from "./release-version-contract";

export const PUBLIC_RELEASE_NOTES_FALLBACK = {
  "currentVersion": "1.3.78",
  "betaReleaseCounter": 378,
  "channel": "beta",
  "generatedAt": "2026-05-22T20:22:55.000Z",
  "generatedAtUtc": "2026-05-22T20:22:55.000Z",
  "lastCommitSha": "pending-same-commit",
  "notes": [
    {
      "version": "1.3.78",
      "previousVersion": "1.3.77",
      "betaReleaseCounter": 378,
      "previousBetaReleaseCounter": 377,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): finalize identity handoff spine",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-22T20:22:55.000Z",
      "generatedAt": "2026-05-22T20:22:55.000Z",
      "committedAtUtc": "2026-05-22T20:22:55.000Z",
      "generatedAtUtc": "2026-05-22T20:22:55.000Z",
      "updatedAtUtc": "2026-05-22T20:22:55.000Z",
      "category": "Improved",
      "title": "Identity handoff spine",
      "summary": "Finalized the guest-to-user tracking spine so events carry one current identity state, respect consent, and avoid duplicate user counts.",
      "userFacingTitle": "Identity handoff spine",
      "surfaceCategory": "Privacy & security",
      "bullets": [
        "Finalized guest-to-user identity handoff contracts.",
        "Prevented double-counting across signup and login.",
        "Simplified debug identity status into one source of truth."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a canonical identity handoff contract, event envelope builder, source validator, generated evidence, and focused unit coverage without changing payment, wallet, GumDrop, chat, or navigation runtime."
      ],
      "affectedSurfaces": [
        "Analytics",
        "Privacy",
        "Admin debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/identity-handoff-refinement.generated.json",
        "agent/state/identity-handoff-spine.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/identity-handoff-refinement.md",
        "docs/agent-truth/identity-handoff-spine.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-identity-handoff-refinement.ts",
        "scripts/agent/validate-identity-handoff-spine.ts",
        "src/app/api/admin/debug/route.ts",
        "src/app/api/analytics/ingest-identified/route.ts",
        "src/app/api/analytics/ingest/route.ts",
        "src/components/Analytics/DeepTracker.tsx",
        "src/lib/analytics/identity-handoff-contract.ts",
        "src/lib/analytics/identity-handoff-engine.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/admin-debug/identity-handoff-summary.ts",
        "src/lib/telemetry-safety.ts",
        "src/lib/telemetry.ts",
        "tests/unit/identity-handoff-spine.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.77",
      "previousVersion": "1.3.76",
      "betaReleaseCounter": 377,
      "previousBetaReleaseCounter": 376,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(wallet): refine purchase module symmetry",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-22T19:55:00.000Z",
      "generatedAt": "2026-05-22T19:55:00.000Z",
      "committedAtUtc": "2026-05-22T19:55:00.000Z",
      "generatedAtUtc": "2026-05-22T19:55:00.000Z",
      "updatedAtUtc": "2026-05-22T19:55:00.000Z",
      "category": "Improved",
      "title": "Payment module symmetry refinement",
      "summary": "Refined the Kandy Shop Wallet package rows with shorter GumDrop labels, steadier promo slots, and compact mobile spacing while keeping checkout behavior unchanged.",
      "userFacingTitle": "Payment module symmetry refinement",
      "surfaceCategory": "Wallet",
      "bullets": [
        "Refined payment module copy, symmetry, and mobile density.",
        "Shortened GumDrop bonus labels for cleaner package rows.",
        "Kept PayPal, wallet crediting, pricing, and GumDrop math unchanged."
      ],
      "audience": "users",
      "technicalDetails": [
        "Added a display-only purchase promo contract, source validator, generated evidence, and focused unit coverage without changing provider runtime or economy math."
      ],
      "affectedSurfaces": [
        "Wallet",
        "Checkout display"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/payment-module-symmetry.generated.json",
        "docs/agent-truth/legal-payment-user-trust-copy.md",
        "docs/agent-truth/payment-module-symmetry.md",
        "docs/agent-truth/payment-wallet-unlock-entitlement.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-gumdrop-source-of-funds-truth.ts",
        "scripts/agent/validate-payment-module-symmetry.ts",
        "scripts/agent/validate-wallet-density.ts",
        "src/components/PurchaseModal.tsx",
        "src/components/PurchaseModal.tsx.bak",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/wallet/purchase-promo-contract.ts",
        "tests/unit/payment-module-symmetry.spec.ts",
        "tests/unit/purchase-modal-density.spec.tsx",
        "tests/unit/purchase-modal-source-of-funds-static.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.76",
      "previousVersion": "1.3.75",
      "betaReleaseCounter": 376,
      "previousBetaReleaseCounter": 375,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): lock new addition score coverage",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T19:45:00.000Z",
      "generatedAt": "2026-05-21T19:45:00.000Z",
      "committedAtUtc": "2026-05-21T19:45:00.000Z",
      "generatedAtUtc": "2026-05-21T19:45:00.000Z",
      "updatedAtUtc": "2026-05-21T19:45:00.000Z",
      "category": "Improved",
      "title": "New additions score coverage lock",
      "summary": "Verified new privacy, behavior, telemetry, debug, and score additions stay covered without moving manual visual review back into Codex score gates.",
      "userFacingTitle": "New additions score coverage lock",
      "surfaceCategory": "App experience",
      "bullets": [
        "Verified new additions are tracked in telemetry, debug, and score systems.",
        "Closed orphaned score coverage for privacy and behavioral telemetry work.",
        "Kept manual visual review outside Codex score blocking."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only score coverage finalizer, generated report, validator, and unit coverage over existing telemetry/debug/score artifacts."
      ],
      "affectedSurfaces": [
        "Telemetry",
        "Debug evidence",
        "Beta readiness"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/new-additions-score-coverage.generated.json",
        "docs/agent-truth/new-additions-score-coverage.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-new-additions-score-coverage.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/new-additions-score-coverage.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.75",
      "previousVersion": "1.3.74",
      "betaReleaseCounter": 375,
      "previousBetaReleaseCounter": 374,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): verify feature activity paths",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T19:35:00.000Z",
      "generatedAt": "2026-05-21T19:35:00.000Z",
      "committedAtUtc": "2026-05-21T19:35:00.000Z",
      "generatedAtUtc": "2026-05-21T19:35:00.000Z",
      "updatedAtUtc": "2026-05-21T19:35:00.000Z",
      "category": "Improved",
      "title": "Guest and user activity verification",
      "summary": "Added consent-aware guest and user activity verification for feature paths.",
      "userFacingTitle": "Guest and user activity verification",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added guest and user activity verification engine.",
        "Used consent-aware activity paths to reduce manual verification.",
        "Flagged features with activity but missing telemetry or materializers."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only activity verification engine, generated report, validator, and unit coverage without production reads or formal gate clearing."
      ],
      "affectedSurfaces": [
        "Telemetry",
        "Behavior tracking",
        "Debug evidence"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/activity-verification-engine.generated.json",
        "docs/agent-truth/activity-verification-engine.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-activity-verification-engine.ts",
        "src/lib/analytics/activity-verification-engine.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/activity-verification-engine.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.74",
      "previousVersion": "1.3.73",
      "betaReleaseCounter": 374,
      "previousBetaReleaseCounter": 373,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(telemetry): require feature registration",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T19:10:00.000Z",
      "generatedAt": "2026-05-21T19:10:00.000Z",
      "committedAtUtc": "2026-05-21T19:10:00.000Z",
      "generatedAtUtc": "2026-05-21T19:10:00.000Z",
      "updatedAtUtc": "2026-05-21T19:10:00.000Z",
      "category": "Improved",
      "title": "Feature registration gate",
      "summary": "Added a feature registration gate so telemetry, debug, and score tracking stay connected as features change.",
      "userFacingTitle": "Feature registration gate",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added feature registration gate for telemetry, debug, and score tracking.",
        "Prevented new features from shipping with orphaned analytics.",
        "Mapped routes, surfaces, consent, identity, and score impact per feature."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a feature registration contract, registry, validator, generated report, docs, and unit coverage using the existing telemetry catalog."
      ],
      "affectedSurfaces": [
        "Telemetry",
        "Debug evidence",
        "Beta readiness"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/feature-registration-gate.generated.json",
        "docs/agent-truth/feature-registration-gate.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-feature-registration-gate.ts",
        "src/lib/features/feature-registration-contract.ts",
        "src/lib/features/feature-registration-registry.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/feature-registration-gate.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.73",
      "previousVersion": "1.3.72",
      "betaReleaseCounter": 373,
      "previousBetaReleaseCounter": 372,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): remove visual gate from codex score",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T18:35:00.000Z",
      "generatedAt": "2026-05-21T18:35:00.000Z",
      "committedAtUtc": "2026-05-21T18:35:00.000Z",
      "generatedAtUtc": "2026-05-21T18:35:00.000Z",
      "updatedAtUtc": "2026-05-21T18:35:00.000Z",
      "category": "Improved",
      "title": "Visual checks moved out of Codex score gates",
      "summary": "Moved visual screenshot checks out of Codex score gates while keeping them visible for operator review.",
      "userFacingTitle": "Visual checks moved out of Codex score gates",
      "surfaceCategory": "App experience",
      "bullets": [
        "Moved visual screenshot checks out of Codex score gates.",
        "Kept UI visual review as an operator-final checklist.",
        "Stopped screenshots from blocking non-UI algorithmic readiness."
      ],
      "audience": "all",
      "technicalDetails": [
        "Reclassified UI visual smoke as an operator-final checklist and kept provider, runtime, and admin formal gates unchanged."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "UI visual smoke",
        "Evidence scoring"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/codex-visual-gate-removal.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/ui-visual-smoke-minimal.generated.json",
        "docs/agent-truth/codex-visual-gate-removal.md",
        "docs/agent-truth/ui-visual-smoke-minimal.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-codex-visual-gate-removal.ts",
        "scripts/agent/validate-public-beta-score.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/evidence/ui-visual-smoke-contract.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/codex-visual-gate-removal.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.72",
      "previousVersion": "1.3.71",
      "betaReleaseCounter": 372,
      "previousBetaReleaseCounter": 371,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): add visual smoke lane",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T17:20:00.000Z",
      "generatedAt": "2026-05-21T17:20:00.000Z",
      "committedAtUtc": "2026-05-21T17:20:00.000Z",
      "generatedAtUtc": "2026-05-21T17:20:00.000Z",
      "updatedAtUtc": "2026-05-21T17:20:00.000Z",
      "category": "Improved",
      "title": "Minimal visual smoke evidence lane",
      "summary": "Added a targeted visual smoke evidence lane for layout-sensitive UI surfaces.",
      "userFacingTitle": "Minimal visual smoke evidence lane",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added minimal UI visual smoke evidence lane.",
        "Limited manual visual checks to layout-sensitive UI surfaces.",
        "Kept non-UI proof algorithmic where truthful."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a missing-by-default UI visual smoke contract, template, validator, and beta score wiring without clearing visual/manual smoke."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "UI visual smoke",
        "Evidence scoring"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/evidence/ui-visual-smoke/README.md",
        "agent/evidence/ui-visual-smoke/template.json",
        "agent/state/ui-visual-smoke-minimal.generated.json",
        "docs/agent-truth/ui-visual-smoke-minimal.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-ui-visual-smoke-minimal.ts",
        "src/lib/evidence/ui-visual-smoke-contract.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/ui-visual-smoke-minimal.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.71",
      "previousVersion": "1.3.70",
      "betaReleaseCounter": 371,
      "previousBetaReleaseCounter": 370,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): resolve blocked refresh queue",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T17:00:32.547Z",
      "generatedAt": "2026-05-21T17:00:32.547Z",
      "committedAtUtc": "2026-05-21T17:00:32.547Z",
      "generatedAtUtc": "2026-05-21T17:00:32.547Z",
      "updatedAtUtc": "2026-05-21T17:00:32.547Z",
      "category": "Improved",
      "title": "Blocked refresh queue resolver",
      "summary": "Resolved blocked score refresh queue entries without clearing formal evidence gates.",
      "userFacingTitle": "Blocked refresh queue resolver",
      "surfaceCategory": "App experience",
      "bullets": [
        "Resolved blocked score refresh queue entries.",
        "Separated refreshable stale reports from formal evidence blockers.",
        "Retired obsolete score artifacts where safe."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only blocked refresh queue resolver and replaced generic formal-gate blocker text with exact next actions."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "Evidence freshness",
        "Admin Debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/blocked-refresh-queue-resolver.generated.json",
        "agent/state/self-healing-refresh-queue.generated.json",
        "docs/agent-truth/blocked-refresh-queue-resolver.md",
        "docs/agent-truth/self-healing-refresh-queue.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-blocked-refresh-queue-resolver.ts",
        "src/lib/agent-score/self-healing-refresh-queue.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/blocked-refresh-queue-resolver.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.70",
      "previousVersion": "1.3.69",
      "betaReleaseCounter": 370,
      "previousBetaReleaseCounter": 369,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): close source cost review",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T16:48:48.601Z",
      "generatedAt": "2026-05-21T16:48:48.601Z",
      "committedAtUtc": "2026-05-21T16:48:48.601Z",
      "generatedAtUtc": "2026-05-21T16:48:48.601Z",
      "updatedAtUtc": "2026-05-21T16:48:48.601Z",
      "category": "Improved",
      "title": "Source cost review closure",
      "summary": "Refined source-verifiable cost lanes while keeping external billing review separate.",
      "userFacingTitle": "Source cost review closure",
      "surfaceCategory": "App experience",
      "bullets": [
        "Refined cost owner-review lanes using source guard evidence.",
        "Separated external billing review from source cost readiness.",
        "Reduced generic cost-risk drag without claiming fake savings."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a source-only cost owner-review classifier and routed beta cost scoring through guarded source statuses without external billing claims."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "Cost readiness",
        "Admin Debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/admin-analytics-debug-cost-reduction.generated.json",
        "agent/state/bigquery-cloud-pipeline-closure.generated.json",
        "agent/state/cloud-sql-gemini-cost-guards.generated.json",
        "agent/state/cost-4xx-reduction.generated.json",
        "agent/state/cost-owner-review-source-closure.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/final-cost-audit-lock.generated.json",
        "agent/state/overnight-beta-readiness-lock.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/scheduled-runtime-cost-reduction.generated.json",
        "agent/state/score-80-cost-readiness.generated.json",
        "docs/agent-truth/admin-analytics-debug-cost-reduction.md",
        "docs/agent-truth/bigquery-cloud-pipeline-closure.md",
        "docs/agent-truth/cloud-sql-gemini-cost-guards.md",
        "docs/agent-truth/cost-4xx-reduction.md",
        "docs/agent-truth/cost-owner-review-source-closure.md",
        "docs/agent-truth/current-beta-exit-status.md",
        "docs/agent-truth/final-cost-audit-lock.md",
        "docs/agent-truth/overnight-beta-readiness-lock.md",
        "docs/agent-truth/scheduled-runtime-cost-reduction.md",
        "docs/agent-truth/score-80-cost-readiness.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-cost-owner-review-source-closure.ts",
        "scripts/agent/validate-score-80-cost-readiness.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/agent-score/evidence-quality.ts",
        "src/lib/cost/cost-owner-review-classifier.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/cost-owner-review-source-closure.spec.ts",
        "tests/unit/score-80-cost-readiness.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.69",
      "previousVersion": "1.3.68",
      "betaReleaseCounter": 369,
      "previousBetaReleaseCounter": 368,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): execute score refresh queue",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T16:25:51.472Z",
      "generatedAt": "2026-05-21T16:25:51.472Z",
      "committedAtUtc": "2026-05-21T16:25:51.472Z",
      "generatedAtUtc": "2026-05-21T16:25:51.472Z",
      "updatedAtUtc": "2026-05-21T16:25:51.472Z",
      "category": "Improved",
      "title": "Score refresh queue execution",
      "summary": "Executed the safe score-impact refresh queue while keeping formal evidence gates separate.",
      "userFacingTitle": "Score refresh queue execution",
      "surfaceCategory": "App experience",
      "bullets": [
        "Executed safe score-impact refresh queue.",
        "Cleared stale artifact drag without changing formal evidence gates.",
        "Kept in-flight privacy telemetry work isolated."
      ],
      "audience": "all",
      "technicalDetails": [
        "Ran the source-only refresh queue validators, recorded blocked formal evidence lanes, and refreshed beta score artifacts without clearing exit gates."
      ],
      "affectedSurfaces": [
        "Beta readiness",
        "Evidence freshness",
        "Debug evidence"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/beta-evidence-gap-map.generated.json",
        "agent/state/beta-evidence-lane-prep.generated.json",
        "agent/state/beta-freshness-language.generated.json",
        "agent/state/creator-drop-status-metrics.generated.json",
        "agent/state/creator-settings-control-plane.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/debug-runtime-evidence.generated.json",
        "agent/state/evidence-capture-status.generated.json",
        "agent/state/existing-algorithm-refinement.generated.json",
        "agent/state/final-pr-stale-cleanup.generated.json",
        "agent/state/final-telemetry-closure-lock.generated.json",
        "agent/state/global-marquee-truncated-titles.generated.json",
        "agent/state/mobile-ui-final-lock.generated.json",
        "agent/state/operator-revenue-smoke.generated.json",
        "agent/state/overnight-beta-readiness-lock.generated.json",
        "agent/state/overnight-final-integration-lock.generated.json",
        "agent/state/overnight-wiring-integrity.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/refresh-safeguards.generated.json",
        "agent/state/score-80-refresh-queue-execution.generated.json",
        "agent/state/self-healing-refresh-queue.generated.json",
        "agent/state/source-truth-authority-map.generated.json",
        "agent/state/user-loading-wallet-mobile-refinement.generated.json",
        "docs/agent-truth/beta-evidence-gap-map.md",
        "docs/agent-truth/beta-evidence-lane-prep.md",
        "docs/agent-truth/beta-freshness-language.md",
        "docs/agent-truth/creator-drop-status-metrics.md",
        "docs/agent-truth/creator-settings-control-plane.md",
        "docs/agent-truth/current-beta-exit-status.md",
        "docs/agent-truth/debug-runtime-evidence.md",
        "docs/agent-truth/evidence-capture-status.md",
        "docs/agent-truth/existing-algorithm-refinement.md",
        "docs/agent-truth/final-pr-stale-cleanup.md",
        "docs/agent-truth/final-telemetry-closure-lock.md",
        "docs/agent-truth/global-marquee-truncated-titles.md",
        "docs/agent-truth/mobile-ui-final-lock.md",
        "docs/agent-truth/operator-revenue-smoke.md",
        "docs/agent-truth/overnight-beta-readiness-lock.md",
        "docs/agent-truth/overnight-final-integration-lock.md",
        "docs/agent-truth/overnight-wiring-integrity.md",
        "docs/agent-truth/refresh-safeguards.md",
        "docs/agent-truth/score-80-refresh-queue-execution.md",
        "docs/agent-truth/self-healing-refresh-queue.md",
        "docs/agent-truth/source-truth-authority-map.md",
        "docs/agent-truth/user-loading-wallet-mobile-refinement.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-score-80-refresh-queue-execution.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/score-80-refresh-queue-execution.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.68",
      "previousVersion": "1.3.67",
      "betaReleaseCounter": 368,
      "previousBetaReleaseCounter": 367,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(analytics): lock behavioral privacy telemetry",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T16:08:41.892Z",
      "generatedAt": "2026-05-21T16:08:41.892Z",
      "committedAtUtc": "2026-05-21T16:08:41.892Z",
      "generatedAtUtc": "2026-05-21T16:08:41.892Z",
      "updatedAtUtc": "2026-05-21T16:08:41.892Z",
      "category": "Improved",
      "title": "Behavioral privacy telemetry lock",
      "summary": "Locked privacy-aware behavioral telemetry across consent, identity handoff, behavior math, legacy recovery, and future event contracts.",
      "userFacingTitle": "Behavioral privacy telemetry lock",
      "surfaceCategory": "Privacy & security",
      "bullets": [
        "Locked privacy-aware behavioral telemetry.",
        "Connected cookie consent to guest, signup, and logged-in analytics.",
        "Made future behavioral events contract-driven instead of refactor-heavy."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the final behavioral privacy telemetry lock report, validator, generated artifact, and unit coverage without clearing formal beta gates."
      ],
      "affectedSurfaces": [
        "Privacy & security",
        "Telemetry",
        "Account & onboarding",
        "Admin Debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/behavior-math-verification.generated.json",
        "agent/state/behavioral-extensibility-layer.generated.json",
        "agent/state/consent-tracking-contract.generated.json",
        "agent/state/cookie-banner-settings-sync.generated.json",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/debug-backlog-engine.generated.json",
        "agent/state/final-behavioral-privacy-telemetry-lock.generated.json",
        "agent/state/final-telemetry-closure-lock.generated.json",
        "agent/state/identity-handoff-refinement.generated.json",
        "agent/state/overnight-beta-readiness-lock.generated.json",
        "agent/state/privacy-behavior-legacy-recovery.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/current-beta-exit-status.md",
        "docs/agent-truth/debug-backlog-engine.md",
        "docs/agent-truth/final-behavioral-privacy-telemetry-lock.md",
        "docs/agent-truth/final-telemetry-closure-lock.md",
        "docs/agent-truth/identity-handoff-refinement.md",
        "docs/agent-truth/overnight-beta-readiness-lock.md",
        "docs/agent-truth/privacy-behavior-legacy-recovery.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-final-behavioral-privacy-telemetry-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/final-behavioral-privacy-telemetry-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.67",
      "previousVersion": "1.3.66",
      "betaReleaseCounter": 367,
      "previousBetaReleaseCounter": 366,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(privacy): recover legacy behavior states",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T15:54:29.832Z",
      "generatedAt": "2026-05-21T15:54:29.832Z",
      "committedAtUtc": "2026-05-21T15:54:29.832Z",
      "generatedAtUtc": "2026-05-21T15:54:29.832Z",
      "updatedAtUtc": "2026-05-21T15:54:29.832Z",
      "category": "Improved",
      "title": "Legacy privacy behavior recovery",
      "summary": "Added dry-run recovery for legacy privacy and behavior records while keeping unknown consent and orphaned data out of current truth.",
      "userFacingTitle": "Legacy privacy behavior recovery",
      "surfaceCategory": "Privacy & security",
      "bullets": [
        "Added dry-run recovery for legacy privacy and behavior records.",
        "Kept unknown legacy consent from becoming full behavioral tracking.",
        "Mapped orphaned behavior data without mutating production."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a dry-run legacy privacy behavior mapper, admin debug report registration, deterministic validator, generated report, and unit coverage."
      ],
      "affectedSurfaces": [
        "Privacy & security",
        "Telemetry",
        "Admin Debug"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/behavior-math-verification.generated.json",
        "agent/state/identity-handoff-refinement.generated.json",
        "agent/state/march-first-legacy-normalization.generated.json",
        "agent/state/privacy-behavior-legacy-recovery.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/identity-handoff-refinement.md",
        "docs/agent-truth/march-first-legacy-normalization.md",
        "docs/agent-truth/privacy-behavior-legacy-recovery.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-privacy-behavior-legacy-recovery.ts",
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/legacy/legacy-normalization-contract.ts",
        "src/lib/legacy/privacy-behavior-legacy-recovery.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/privacy-behavior-legacy-recovery.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.66",
      "previousVersion": "1.3.65",
      "betaReleaseCounter": 366,
      "previousBetaReleaseCounter": 365,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(privacy): sync cookie banner tracking",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T15:37:04.441Z",
      "generatedAt": "2026-05-21T15:37:04.441Z",
      "committedAtUtc": "2026-05-21T15:37:04.441Z",
      "generatedAtUtc": "2026-05-21T15:37:04.441Z",
      "updatedAtUtc": "2026-05-21T15:37:04.441Z",
      "category": "Improved",
      "title": "Cookie banner settings sync",
      "summary": "Improved the mobile cookie banner and carried guest cookie choices into account privacy settings after signup or login.",
      "userFacingTitle": "Cookie banner settings sync",
      "surfaceCategory": "Privacy & security",
      "bullets": [
        "Improved mobile cookie banner readability.",
        "Connected cookie choices to privacy tracking settings.",
        "Synced guest consent through signup and login."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added deterministic validation and unit coverage for mobile cookie banner tracking-mode sync."
      ],
      "affectedSurfaces": [
        "Privacy & security",
        "Account & onboarding",
        "Telemetry"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/consent-tracking-contract.generated.json",
        "agent/state/cookie-banner-settings-sync.generated.json",
        "agent/state/identity-handoff-refinement.generated.json",
        "agent/state/mobile-ui-final-lock.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/cookie-banner-settings-sync.md",
        "docs/agent-truth/identity-handoff-refinement.md",
        "docs/agent-truth/mobile-ui-final-lock.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-cookie-banner-settings-sync.ts",
        "src/components/CookieBanner.tsx",
        "src/components/CoreLayoutWrapper.tsx",
        "src/lib/privacy-consent.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/cookie-banner-settings-sync.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.65",
      "previousVersion": "1.3.64",
      "betaReleaseCounter": 365,
      "previousBetaReleaseCounter": 364,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): harden behavior extensibility",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T15:20:35.641Z",
      "generatedAt": "2026-05-21T15:20:35.641Z",
      "committedAtUtc": "2026-05-21T15:20:35.641Z",
      "generatedAtUtc": "2026-05-21T15:20:35.641Z",
      "updatedAtUtc": "2026-05-21T15:20:35.641Z",
      "category": "Improved",
      "title": "Behavioral telemetry extensibility",
      "summary": "Made behavioral telemetry extensible for new features while keeping consent, identity, and materializer rules explicit.",
      "userFacingTitle": "Behavioral telemetry extensibility",
      "surfaceCategory": "Privacy & security",
      "bullets": [
        "Made behavioral telemetry extensible for new features.",
        "Required consent and identity rules for every tracked event.",
        "Prevented new features from creating orphaned analytics."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added feature registry, signal classifier, deterministic validator, and unit coverage for catalog-gated behavior telemetry."
      ],
      "affectedSurfaces": [
        "Privacy & security",
        "Telemetry",
        "Admin tools"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/behavioral-extensibility-layer.generated.json",
        "docs/agent-truth/behavioral-extensibility-layer.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-behavioral-extensibility-layer.ts",
        "src/lib/behavioral/behavior-feature-registry.ts",
        "src/lib/behavioral/behavior-math-engine.ts",
        "src/lib/behavioral/behavior-signal-classifier.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/telemetry-catalog.ts",
        "tests/unit/behavioral-extensibility-layer.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.64",
      "previousVersion": "1.3.63",
      "betaReleaseCounter": 364,
      "previousBetaReleaseCounter": 363,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(analytics): refine identity handoff",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T15:06:33.909Z",
      "generatedAt": "2026-05-21T15:06:33.909Z",
      "committedAtUtc": "2026-05-21T15:06:33.909Z",
      "generatedAtUtc": "2026-05-21T15:06:33.909Z",
      "updatedAtUtc": "2026-05-21T15:06:33.909Z",
      "category": "Improved",
      "title": "Guest-to-user analytics handoff",
      "summary": "Improved guest signup and login continuity while keeping behavioral attribution consent-aware.",
      "userFacingTitle": "Guest-to-user analytics handoff",
      "surfaceCategory": "Privacy & security",
      "bullets": [
        "Improved guest-to-user analytics handoff.",
        "Kept behavioral attribution consent-aware.",
        "Prevented double-counting across signup and login."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a consent-aware identity state machine, deterministic handoff validator, and unit coverage for signup/login linkage."
      ],
      "affectedSurfaces": [
        "Privacy & security",
        "Telemetry",
        "Account & onboarding"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/context/optimized-task-context.generated.json",
        "agent/state/behavior-math-verification.generated.json",
        "agent/state/consent-tracking-contract.generated.json",
        "agent/state/identity-handoff-refinement.generated.json",
        "agent/state/identity-transfer-telemetry-closure.generated.json",
        "docs/agent-truth/identity-handoff-refinement.md",
        "docs/agent-truth/identity-transfer-telemetry-closure.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-identity-handoff-refinement.ts",
        "src/app/api/analytics/identity-link/route.ts",
        "src/app/api/analytics/ingest/route.ts",
        "src/components/Analytics/DeepTracker.tsx",
        "src/context/AuthContext.tsx",
        "src/lib/analytics/analytics-identity-link.ts",
        "src/lib/analytics/identity-link-contract.ts",
        "src/lib/analytics/identity-state-machine.ts",
        "src/lib/behavioral/behavior-math-contract.ts",
        "src/lib/behavioral/behavior-math-engine.ts",
        "src/lib/client-session.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/analytics-identity-linking.ts",
        "src/lib/telemetry.ts",
        "tests/unit/identity-handoff-refinement.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.63",
      "previousVersion": "1.3.62",
      "betaReleaseCounter": 363,
      "previousBetaReleaseCounter": 362,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(privacy): wire consent tracking modes",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T14:47:40.397Z",
      "generatedAt": "2026-05-21T14:47:40.397Z",
      "committedAtUtc": "2026-05-21T14:47:40.397Z",
      "generatedAtUtc": "2026-05-21T14:47:40.397Z",
      "updatedAtUtc": "2026-05-21T14:47:40.397Z",
      "category": "Improved",
      "title": "Cookie consent tracking modes",
      "summary": "Connected cookie choices to real tracking modes and made the banner easier to read on mobile.",
      "userFacingTitle": "Cookie consent tracking modes",
      "surfaceCategory": "Privacy & security",
      "bullets": [
        "Connected cookie choices to actual analytics tracking modes.",
        "Made the cookie banner readable on mobile.",
        "Separated minimal analytics from full behavioral tracking."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a versioned consent tracking contract, policy validator, and unit coverage for minimal versus full behavioral analytics."
      ],
      "affectedSurfaces": [
        "Privacy & security",
        "App experience",
        "Telemetry"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/consent-tracking-contract.generated.json",
        "docs/agent-truth/consent-tracking-contract.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-consent-tracking-contract.ts",
        "src/app/api/privacy/consent/route.ts",
        "src/components/Analytics/DeepTracker.tsx",
        "src/components/CookieBanner.tsx",
        "src/lib/analytics/client-tracking-policy.ts",
        "src/lib/privacy-consent.ts",
        "src/lib/privacy/consent-tracking-contract.ts",
        "src/lib/privacy/consent-tracking-policy.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/server/privacy-consent.ts",
        "tests/unit/consent-tracking-contract.spec.ts",
        "tests/unit/privacy-consent.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.62",
      "previousVersion": "1.3.61",
      "betaReleaseCounter": 362,
      "previousBetaReleaseCounter": 361,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(beta): reconcile score 80 path",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T14:22:06.066Z",
      "generatedAt": "2026-05-21T14:22:06.066Z",
      "committedAtUtc": "2026-05-21T14:22:06.066Z",
      "generatedAtUtc": "2026-05-21T14:22:06.066Z",
      "updatedAtUtc": "2026-05-21T14:22:06.066Z",
      "category": "Improved",
      "title": "Score 80 reconciliation lock",
      "summary": "Reconciled the score-80 path and ranked remaining blockers by true proof type.",
      "userFacingTitle": "Score 80 reconciliation lock",
      "surfaceCategory": "App experience",
      "bullets": [
        "Reconciled score-80 path after algorithmic evidence refinement.",
        "Separated manual-only checks from algorithmic and runtime proof.",
        "Ranked remaining score blockers by true proof type."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added a score-80 reconciliation lock report, validator, and unit coverage without clearing formal beta gates."
      ],
      "affectedSurfaces": [
        "App experience",
        "Beta scoring",
        "Debug evidence"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/score-80-reconciliation-lock.generated.json",
        "docs/agent-truth/score-80-reconciliation-lock.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-score-80-reconciliation-lock.ts",
        "src/lib/agent-score/score-80-reconciliation-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/score-80-reconciliation-lock.spec.ts",
        "src/lib/agent-score/self-healing-refresh-queue.ts",
        "tests/unit/self-healing-refresh-queue.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.61",
      "previousVersion": "1.3.60",
      "betaReleaseCounter": 361,
      "previousBetaReleaseCounter": 360,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(runtime): map smoke substitutes",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T14:06:44.755Z",
      "generatedAt": "2026-05-21T14:06:44.755Z",
      "committedAtUtc": "2026-05-21T14:06:44.755Z",
      "generatedAtUtc": "2026-05-21T14:06:44.755Z",
      "updatedAtUtc": "2026-05-21T14:06:44.755Z",
      "category": "Improved",
      "title": "Runtime smoke substitute matrix",
      "summary": "Mapped runtime smoke checks to source, debug, telemetry, manual, and formal evidence lanes.",
      "userFacingTitle": "Runtime smoke substitute matrix",
      "surfaceCategory": "App experience",
      "bullets": [
        "Mapped runtime smoke checks to source, debug, telemetry, manual, and formal evidence lanes.",
        "Reduced manual testing scope to rows that need UI or deployed runtime confirmation.",
        "Kept deployed runtime smoke as a formal gate until a real artifact exists."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the runtime smoke substitute matrix report, validator, beta score integration, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Beta scoring",
        "Runtime evidence"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/algorithmic-evidence-policy.generated.json",
        "agent/state/creator-drop-status-metrics.generated.json",
        "agent/state/debug-panel-output-triage.generated.json",
        "agent/state/debug-runtime-evidence.generated.json",
        "agent/state/final-telemetry-closure-lock.generated.json",
        "agent/state/mobile-loading-hydration-stability.generated.json",
        "agent/state/operator-revenue-smoke.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/real-usage-confidence-calibration.generated.json",
        "agent/state/runtime-smoke-substitute-matrix.generated.json",
        "agent/state/runtime-watch-time-v2.generated.json",
        "agent/state/source-backed-runtime-confidence.generated.json",
        "agent/state/telemetry-admin-debug-truth.generated.json",
        "agent/state/user-loading-wallet-mobile-refinement.generated.json",
        "docs/agent-truth/algorithmic-evidence-policy.md",
        "docs/agent-truth/creator-drop-status-metrics.md",
        "docs/agent-truth/debug-runtime-evidence.md",
        "docs/agent-truth/final-telemetry-closure-lock.md",
        "docs/agent-truth/mobile-loading-hydration-stability.md",
        "docs/agent-truth/operator-revenue-smoke.md",
        "docs/agent-truth/runtime-smoke-substitute-matrix.md",
        "docs/agent-truth/runtime-watch-time-v2.md",
        "docs/agent-truth/source-backed-runtime-confidence.md",
        "docs/agent-truth/telemetry-admin-debug-truth.md",
        "docs/agent-truth/user-loading-wallet-mobile-refinement.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-algorithmic-evidence-policy.ts",
        "scripts/agent/validate-runtime-smoke-substitute-matrix.ts",
        "src/lib/agent-score/algorithmic-evidence-policy.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "src/lib/runtime/runtime-smoke-substitute-matrix.ts",
        "tests/unit/runtime-smoke-substitute-matrix.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.60",
      "previousVersion": "1.3.59",
      "betaReleaseCounter": 360,
      "previousBetaReleaseCounter": 359,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): calibrate real usage confidence",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T13:48:57.505Z",
      "generatedAt": "2026-05-21T13:48:57.505Z",
      "committedAtUtc": "2026-05-21T13:48:57.505Z",
      "generatedAtUtc": "2026-05-21T13:48:57.505Z",
      "updatedAtUtc": "2026-05-21T13:48:57.505Z",
      "category": "Improved",
      "title": "Real usage confidence calibration",
      "summary": "Calibrated real usage confidence from behavioral and operator-confirmed signals.",
      "userFacingTitle": "Real usage confidence calibration",
      "surfaceCategory": "App experience",
      "bullets": [
        "Calibrated real usage confidence from behavioral and operator-confirmed signals.",
        "Separated observed signals from inferred source readiness.",
        "Kept formal beta gates separate from real usage confidence."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the real usage confidence calibration report, validator, score integration, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Beta scoring",
        "Telemetry confidence"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/algorithmic-evidence-policy.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/real-usage-confidence-calibration.generated.json",
        "agent/state/real-usage-confidence.generated.json",
        "docs/agent-truth/algorithmic-evidence-policy.md",
        "docs/agent-truth/real-usage-confidence-calibration.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-algorithmic-evidence-policy.ts",
        "scripts/agent/validate-real-usage-confidence-calibration.ts",
        "src/lib/agent-score/algorithmic-evidence-policy.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/analytics/real-usage-confidence-calibration.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/real-usage-confidence-calibration.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.59",
      "previousVersion": "1.3.58",
      "betaReleaseCounter": 359,
      "previousBetaReleaseCounter": 358,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): refine algorithmic evidence gates",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T13:29:27.123Z",
      "generatedAt": "2026-05-21T13:29:27.123Z",
      "committedAtUtc": "2026-05-21T13:29:27.123Z",
      "generatedAtUtc": "2026-05-21T13:29:27.123Z",
      "updatedAtUtc": "2026-05-21T13:29:27.123Z",
      "category": "Improved",
      "title": "Algorithmic evidence gates",
      "summary": "Separated UI manual evidence from algorithmic runtime and telemetry confidence.",
      "userFacingTitle": "Algorithmic evidence gates",
      "surfaceCategory": "App experience",
      "bullets": [
        "Separated UI manual evidence from algorithmic runtime and telemetry confidence.",
        "Allowed source-backed evidence to improve non-UI beta health without faking formal proof.",
        "Kept provider, runtime, and visual gates honest."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the algorithmic evidence policy report, validator, score integration, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Beta scoring",
        "Evidence gates"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/algorithmic-evidence-policy.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/algorithmic-evidence-policy.md",
        "docs/agent-truth/beta-health-algorithm-v2.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-algorithmic-evidence-policy.ts",
        "src/lib/agent-score/algorithmic-evidence-policy.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/algorithmic-evidence-policy.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.58",
      "previousVersion": "1.3.57",
      "betaReleaseCounter": 358,
      "previousBetaReleaseCounter": 357,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(debug): resolve critic p1 triage",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T13:05:24.206Z",
      "generatedAt": "2026-05-21T13:05:24.206Z",
      "committedAtUtc": "2026-05-21T13:05:24.206Z",
      "generatedAtUtc": "2026-05-21T13:05:24.206Z",
      "updatedAtUtc": "2026-05-21T13:05:24.206Z",
      "category": "Improved",
      "title": "AI critic P1 triage",
      "summary": "Resolved source-fixable AI critic feedback and ranked the P1/P2 debug backlog by beta score impact.",
      "userFacingTitle": "AI critic P1 triage",
      "surfaceCategory": "App experience",
      "bullets": [
        "Resolved source-fixable AI critic feedback.",
        "Ranked P1/P2 debug backlog by beta score impact.",
        "Separated code fixes from formal evidence requirements."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the AI critic P1 triage report, validator, source action classification, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Admin Debug",
        "Beta scoring"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/ai-critic-p1-triage.generated.json",
        "agent/state/ai-debug-critic.generated.json",
        "agent/state/debug-backlog-engine.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/ai-critic-p1-triage.md",
        "docs/agent-truth/ai-debug-critic.md",
        "docs/agent-truth/debug-backlog-engine.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-ai-critic-p1-triage.ts",
        "scripts/agent/validate-debug-backlog-engine.ts",
        "src/lib/debug/ai-critic-p1-triage.ts",
        "src/lib/debug/ai-debug-critic-contract.ts",
        "src/lib/debug/ai-debug-critic-rules.ts",
        "src/lib/debug/ai-debug-critic.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/ai-critic-p1-triage.spec.ts",
        "tests/unit/ai-debug-critic.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.57",
      "previousVersion": "1.3.56",
      "betaReleaseCounter": 357,
      "previousBetaReleaseCounter": 356,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(debug): lock algorithmic debugging",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T07:10:00.000Z",
      "generatedAt": "2026-05-21T07:10:00.000Z",
      "committedAtUtc": "2026-05-21T07:10:00.000Z",
      "generatedAtUtc": "2026-05-21T07:10:00.000Z",
      "updatedAtUtc": "2026-05-21T07:10:00.000Z",
      "category": "Improved",
      "title": "Algorithmic debug lock",
      "summary": "Locked the debug panel, score backlog, AI critic, behavior math, and refresh queues as the primary confidence engine.",
      "userFacingTitle": "Algorithmic debug lock",
      "surfaceCategory": "App experience",
      "bullets": [
        "Locked the debug panel, score backlog, AI critic, behavior math, and refresh queues as the primary confidence engine.",
        "Reduced manual testing bottlenecks without clearing provider, runtime, or visual proof gates.",
        "Kept remaining formal evidence steps explicit for beta exit review."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the final algorithmic debug lock report, validator, package script, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Admin Debug",
        "Beta scoring"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/current-beta-exit-status.generated.json",
        "agent/state/final-algorithmic-debug-lock.generated.json",
        "docs/agent-truth/final-algorithmic-debug-lock.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-final-algorithmic-debug-lock.ts",
        "src/lib/debug/final-algorithmic-debug-lock.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/final-algorithmic-debug-lock.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.56",
      "previousVersion": "1.3.55",
      "betaReleaseCounter": 356,
      "previousBetaReleaseCounter": 355,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(admin): refine debug cockpit",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T06:30:00.000Z",
      "generatedAt": "2026-05-21T06:30:00.000Z",
      "committedAtUtc": "2026-05-21T06:30:00.000Z",
      "generatedAtUtc": "2026-05-21T06:30:00.000Z",
      "updatedAtUtc": "2026-05-21T06:30:00.000Z",
      "category": "Improved",
      "title": "Debug cockpit refinement",
      "summary": "Refined the admin debug panel into a clearer operator cockpit.",
      "userFacingTitle": "Debug cockpit refinement",
      "surfaceCategory": "App experience",
      "bullets": [
        "Refined the admin debug panel into a clearer operator cockpit.",
        "Sorted next fixes by score impact, owner, and refresh action.",
        "Kept unknown, stale, and formal evidence states visible instead of treating them as healthy."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the debug operator cockpit model, admin debug component, generated report, validator, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Admin Debug",
        "Beta scoring"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/debug-backlog-engine.generated.json",
        "agent/state/debug-operator-cockpit.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/debug-backlog-engine.md",
        "docs/agent-truth/debug-operator-cockpit.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-admin-debug-control-tower.ts",
        "scripts/agent/validate-debug-operator-cockpit.ts",
        "src/app/admin/debug/components/DebugControlTower.tsx",
        "src/app/admin/debug/components/DebugOperatorCockpit.tsx",
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/debug/debug-operator-cockpit.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/debug-operator-cockpit.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.55",
      "previousVersion": "1.3.54",
      "betaReleaseCounter": 355,
      "previousBetaReleaseCounter": 354,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): add self healing refresh queue",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T06:05:00.000Z",
      "generatedAt": "2026-05-21T06:05:00.000Z",
      "committedAtUtc": "2026-05-21T06:05:00.000Z",
      "generatedAtUtc": "2026-05-21T06:05:00.000Z",
      "updatedAtUtc": "2026-05-21T06:05:00.000Z",
      "category": "Improved",
      "title": "Self-healing refresh queue",
      "summary": "Added a self-healing refresh queue for stale beta and debug artifacts.",
      "userFacingTitle": "Self-healing refresh queue",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added a self-healing refresh queue for stale beta and debug artifacts.",
        "Ordered refresh commands by owner, dependency, and score impact.",
        "Kept formal provider, runtime, and manual proof gates blocked until real artifacts exist."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the self-healing refresh queue contract, generated report, validator, admin debug source registration, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Admin Debug",
        "Beta scoring"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/public-beta-score.generated.json",
        "agent/state/refresh-safeguards.generated.json",
        "agent/state/self-healing-refresh-queue.generated.json",
        "docs/agent-truth/refresh-safeguards.md",
        "docs/agent-truth/self-healing-refresh-queue.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-self-healing-refresh-queue.ts",
        "src/lib/admin-debug-control-tower.ts",
        "src/lib/agent-score/self-healing-refresh-queue.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/self-healing-refresh-queue.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.54",
      "previousVersion": "1.3.53",
      "betaReleaseCounter": 354,
      "previousBetaReleaseCounter": 353,
      "commitSha": "pending-same-commit",
      "commitTitle": "docs(debug): add recovery playbooks",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T05:45:00.000Z",
      "generatedAt": "2026-05-21T05:45:00.000Z",
      "committedAtUtc": "2026-05-21T05:45:00.000Z",
      "generatedAtUtc": "2026-05-21T05:45:00.000Z",
      "updatedAtUtc": "2026-05-21T05:45:00.000Z",
      "category": "Improved",
      "title": "Debug recovery playbooks",
      "summary": "Added debug-driven recovery playbooks for high-impact issue categories.",
      "userFacingTitle": "Debug recovery playbooks",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added debug-driven recovery playbooks for high-impact issue categories.",
        "Mapped triggers to exact files, commands, fixes, validation, and forbidden actions.",
        "Kept formal evidence gates separate from source-only recovery."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the debug recovery playbook registry, generated report, validator, package script, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Admin Debug",
        "Internal reliability"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/ai-debug-critic.generated.json",
        "agent/state/debug-backlog-engine.generated.json",
        "agent/state/debug-recovery-playbooks.generated.json",
        "agent/state/public-beta-score.generated.json",
        "docs/agent-truth/ai-debug-critic.md",
        "docs/agent-truth/debug-backlog-engine.md",
        "docs/agent-truth/debug-recovery-playbooks.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/validate-debug-recovery-playbooks.ts",
        "src/lib/debug/recovery-playbooks.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/debug-recovery-playbooks.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    },
    {
      "version": "1.3.53",
      "previousVersion": "1.3.52",
      "betaReleaseCounter": 353,
      "previousBetaReleaseCounter": 352,
      "commitSha": "pending-same-commit",
      "commitTitle": "fix(beta): add real usage confidence",
      "commitCount": 1,
      "commitShas": [
        "pending-same-commit"
      ],
      "committedAt": "2026-05-21T05:25:00.000Z",
      "generatedAt": "2026-05-21T05:25:00.000Z",
      "committedAtUtc": "2026-05-21T05:25:00.000Z",
      "generatedAtUtc": "2026-05-21T05:25:00.000Z",
      "updatedAtUtc": "2026-05-21T05:25:00.000Z",
      "category": "Improved",
      "title": "Real usage confidence scoring",
      "summary": "Added real usage confidence scoring from validated source signals.",
      "userFacingTitle": "Real usage confidence scoring",
      "surfaceCategory": "App experience",
      "bullets": [
        "Added real usage confidence scoring from validated source signals.",
        "Recognized operator-confirmed product usage without faking formal proof.",
        "Kept manual and provider gates separate from usage confidence."
      ],
      "audience": "all",
      "technicalDetails": [
        "Added the source-only real usage confidence engine, generated evidence artifact, validator, score integration, and unit coverage."
      ],
      "affectedSurfaces": [
        "App experience",
        "Admin Debug",
        "Beta scoring"
      ],
      "hiddenFromPublic": false,
      "changedFiles": [
        "CHANGELOG.md",
        "agent/state/behavior-math-verification.generated.json",
        "agent/state/operator-revenue-smoke.generated.json",
        "agent/state/public-beta-score.generated.json",
        "agent/state/real-usage-confidence.generated.json",
        "agent/state/telemetry-dependency-graph.generated.json",
        "docs/agent-truth/behavior-math-verification.md",
        "docs/agent-truth/operator-revenue-smoke.md",
        "docs/agent-truth/real-usage-confidence.md",
        "docs/agent-truth/telemetry-dependency-graph.md",
        "package.json",
        "public/kandydrops-release-notes.json",
        "scripts/agent/score-public-beta-readiness.ts",
        "scripts/agent/validate-real-usage-confidence.ts",
        "src/lib/agent-score/core.ts",
        "src/lib/analytics/real-usage-confidence-engine.ts",
        "src/lib/release-notes/public-release-notes.ts",
        "src/lib/release-notes/release-version-contract.ts",
        "tests/unit/real-usage-confidence.spec.ts"
      ],
      "sourceCommit": "pending-same-commit"
    }
  ]
} as const satisfies PublicReleaseNotesDocument;

export const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {
  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,
  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,
  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,
} as const;

export const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;
