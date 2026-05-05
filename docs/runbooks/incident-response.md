# Incident Response Runbook

## Symptoms

- User-impacting outage, data exposure, payment failure, auth failure, content-protection failure, or major analytics/source-truth corruption.

## Immediate Containment

- Stop risky writes if possible.
- Preserve logs, debug evidence ids, PR/commit ids, release time, and affected routes.
- Do not rotate or delete evidence until owner review.
- If secrets are involved, revoke and rotate them immediately.

## Rollback

- Prefer reverting the smallest release or feature flag.
- Do not deploy unrelated changes during containment.
- Record rollback commit, time, owner, and validation commands.

## Validation

- Run the narrow validator for the affected surface.
- Confirm source truth, UI state, telemetry, and admin/debug evidence align.
- Verify no broad audit was used as a substitute for owner review.

## Owner

- Primary: repo owner or surface CODEOWNER.
- Backup: emergency security contact in `SECURITY.md`.

## Logs And Evidence

- GitHub Actions run id.
- Commit/PR id.
- Firebase/Cloud logs if applicable.
- Debug evidence id if generated.
- Screenshots with secrets and user data removed.

## Follow-Up

- Open a private incident issue if security-sensitive.
- Add or update a runbook, validator, and doctrine if the gap was not already covered.
