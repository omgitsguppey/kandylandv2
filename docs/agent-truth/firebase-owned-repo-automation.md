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
- GitHub Actions release-note push events are intentionally skipped before runner allocation while hosted-runner billing is locked.

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

`cloudbuild.release-notes.yaml` is the automated public changelog lane. Configure it as a Cloud Build trigger on `main` pushes with Secret Manager access to a `GITHUB_TOKEN` secret that can write repository contents.

The lane:

- skips commits containing `[skip release-notes]`
- skips release artifact-only commits that touch only `public/kandydrops-release-notes.json`, `src/lib/release-notes/public-release-notes.ts`, `src/lib/release-notes/release-version-contract.ts`, `docs/agent-truth/public-beta-release-notes.md`, and `CHANGELOG.md`
- runs `npm run release:notes`
- runs `npm run check:release-notes`
- commits `public/kandydrops-release-notes.json`, `src/lib/release-notes/public-release-notes.ts`, `src/lib/release-notes/release-version-contract.ts`, and `CHANGELOG.md`
- pushes with `[skip ci] [skip release-notes]` to avoid automation loops

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
