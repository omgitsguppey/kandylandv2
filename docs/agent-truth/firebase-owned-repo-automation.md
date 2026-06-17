# Firebase-Owned Repo Automation

Authority: Supporting doctrine for the Cloud Build, Firebase App Hosting, and GitHub Actions split.  
Current operator doctrine: `docs/agent-truth/current-operator-doctrine.md`.

GitHub is the source repository. GitHub-hosted Actions are not the source of deployment truth for KandyDrops because they can fail before checkout when hosted-runner billing is locked.

## Authority Split

- `git push` to `main` remains the source handoff into GitHub.
- Firebase App Hosting remains the deployment build and rollout truth.
- Cloud Build runs deterministic repo checks from source-controlled YAML.
- Firebase Functions may ingest webhooks, record automation events, or enqueue work, but must not pretend to be a general-purpose repo build runner.
- GitHub Actions workflows are manual fallbacks only until hosted-runner billing is reliable again.
- GitHub Actions release-note workflow is workflow_dispatch-only so push commits do not create skipped or pending fallback checks.

## Cloud Build CI

`cloudbuild.yaml` is the automated lightweight CI lane. It runs:

- `npm ci`
- `npm run plan:affected-audits -- --task=cloud build`
- `npm run check:affected-audit-router`
- `npm run check:human-dev-readiness`
- `npm run check:release-notes`
- `npm run typecheck`

Do not add Playwright, Lighthouse, Cypress, deploy commands, or full `npm run check` to this default lane.

## Cloud Build Release Notes

`cloudbuild.release-notes.yaml` is the automated public changelog validation lane. Configure it as a Cloud Build trigger on `main` pushes; it does not need a repository write token.

The lane:

- skips commits containing `[skip release-notes]`
- skips release artifact-only commits that touch only `public/kandydrops-release-notes.json`, `src/lib/release-notes/public-release-notes.ts`, `src/lib/release-notes/release-version-contract.ts`, `docs/agent-truth/public-beta-release-notes.md`, and `CHANGELOG.md`
- runs `npm run release:notes`
- fails if release-note artifacts change, proving the patch did not commit its own notes
- runs `npm run check:release-notes`
- never commits or pushes release-note artifacts

## Function Boundary

Firebase Functions are appropriate for:

- verified GitHub webhook ingestion
- writing automation evidence to Firestore
- enqueueing Cloud Tasks or Cloud Build requests
- recording deployment status evidence for Admin Debug

Firebase Functions are not appropriate for:

- running `npm ci`
- running TypeScript typecheck over the whole repo
- running validators that need a mutable Git checkout
- committing generated artifacts without a dedicated GitHub token and idempotency contract

If a future Function triggers Cloud Build, it must verify the GitHub signature, dedupe by delivery id and commit SHA, use Secret Manager for any token, cap retries, and write debug evidence without blocking deployment.
