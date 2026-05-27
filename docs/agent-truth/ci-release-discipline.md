# CI Release Discipline

Generated: 2026-05-27T04:37:34.987Z
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
