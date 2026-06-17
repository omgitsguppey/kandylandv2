# CI Release Discipline

Generated: 2026-06-17T01:25:35.412Z
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

- Firebase App Hosting: external_evidence_required
  - authority: deployment_rollout
  - can clear from source checks: no
  - required before beta exit: yes
  - source owner: check:environment-deployment-truth
  - next: Reauthorize or restart the Firebase App Hosting rollout in Firebase/GCP, then attach the fresh rollout check result for the current commit.
- Google Cloud Build: external_evidence_required
  - authority: source_validation_trigger
  - can clear from source checks: no
  - required before beta exit: yes
  - source owner: check:ci-release-discipline
  - next: Repair or reauthorize the Cloud Build GitHub trigger/connection externally; source checks only prove the YAML lane is valid.
- Graphite App: not_authoritative_for_source_release
  - authority: stacked_pr_tooling
  - can clear from source checks: no
  - required before beta exit: no
  - source owner: external GitHub branch protection / Graphite app settings
  - next: If Graphite is still required on main, fix the Graphite app externally; otherwise remove it from required branch checks because it is not a repo source truth gate.
