# CI Release Discipline

Generated: 2026-06-17T01:38:25.591Z
Workflows audited: 5
Release notes owner: check:release-notes
Open PR hygiene owner: check:open-pr-dependency-hygiene
Beta exit freshness owner: check:current-beta-exit-status

## Workflows

- .github/workflows/ci.yml: source_validation, provider=none, deploy=manual_only
- .github/workflows/cloud-readiness-smoke.yml: manual_cloud_readiness, provider=read_only, deploy=manual_only
- .github/workflows/dependency-review.yml: dependency_window, provider=none, deploy=manual_only
- .github/workflows/openssf-scorecard.yml: report_only, provider=none, deploy=manual_only
- .github/workflows/public-release-notes.yml: release_notes_fallback, provider=none, deploy=manual_only

## External Check Providers

- App Hosting - Rollout (kandydrops-by-ikandy/us-central1/kandydrops): external_evidence_required
  - authority: deployment_rollout
  - can clear from source checks: no
  - required before beta exit: yes
  - source owner: check:environment-deployment-truth
  - stuck symptom: GitHub check remains in_progress with output title Build queued for multiple commits.
  - source-safe disposition: external_provider_blocker
  - provider action: Open the Firebase App Hosting backend for kandydrops in us-central1, inspect the queued rollout/build, then reauthorize Developer Connect/GitHub integration or restart the rollout from Firebase/GCP. Do not use another source commit as the retry mechanism.
  - next: Reauthorize or restart the Firebase App Hosting rollout in Firebase/GCP, then attach the fresh rollout check result for the current commit.
- Google Cloud Build: external_evidence_required
  - authority: source_validation_trigger
  - can clear from source checks: no
  - required before beta exit: yes
  - source owner: check:ci-release-discipline
  - stuck symptom: No source-owned GitHub Actions run is pending while App Hosting reports Build queued, which means Cloud Build start/trigger health is provider-side evidence.
  - source-safe disposition: external_provider_blocker
  - provider action: Inspect the App Hosting-created Cloud Build or Developer Connect trigger in Google Cloud, repair authorization/trigger delivery externally, then capture a fresh provider result.
  - next: Repair or reauthorize the Cloud Build GitHub trigger/connection externally; source checks only prove the YAML lane is valid.
- Graphite App: not_authoritative_for_source_release
  - authority: stacked_pr_tooling
  - can clear from source checks: no
  - required before beta exit: no
  - source owner: external GitHub branch protection / Graphite app settings
  - stuck symptom: Graphite status is stale or pending even though stacked PR tooling is not the source release authority for main.
  - source-safe disposition: branch_protection_cleanup
  - provider action: If Graphite is no longer the merge queue authority, remove it from required branch protection checks in GitHub settings; if it is still required, repair the Graphite app externally.
  - next: If Graphite is still required on main, fix the Graphite app externally; otherwise remove it from required branch checks because it is not a repo source truth gate.
