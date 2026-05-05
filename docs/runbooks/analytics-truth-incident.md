# Analytics Truth Incident Runbook

## Symptoms

- Revenue inflation, unlock count mismatch, admin/projection events counted as user behavior, actor/target confusion, duplicated notification/read facts, or stale admin metrics shown as live.

## Immediate Containment

- Stop dashboards or exports from treating suspect facts as canonical.
- Preserve event names, actor ids, target ids, transaction ids, sourceTruth, source route, and ingestion timestamps.
- Label affected admin metrics as partial, stale, failed, or unknown until corrected.

## Rollback

- Revert the smallest telemetry normalization, route emission, or rollup commit.
- Do not delete raw evidence unless privacy or retention policy requires it.

## Validation

- Run the affected telemetry/behavioral validator.
- Confirm canonical facts come from server/entitlement/ledger truth where required.
- Confirm product analytics, operational telemetry, security evidence, audit evidence, and business metrics remain separate.

## Owner

- Analytics/telemetry/behavioral intelligence CODEOWNER.

## Logs And Evidence

- Event fact id, raw event id, sourceTruth, user id or anonymized id, route, and debug evidence id.
- Do not paste personal data into public tickets.

## Follow-Up

- Add an alias/dedupe/sourceTruth validator if the incident came from fragmented naming or client-only facts.
