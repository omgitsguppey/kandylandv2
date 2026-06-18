# Launch Analytics Evidence

This folder is for local, redacted launch-history coverage exports only.

Accepted input paths:

- `agent/evidence/launch-analytics/launch-history-coverage.local.json`
- `agent/evidence/launch-analytics/launch-history-coverage.export.json`

Use `launch-history-coverage.template.json` as the shape reference, then copy it to one
of the accepted paths when an approved export is available. Keep `status:
"template_not_evidence"` in templates and drafts. Only complete, redacted exports with
real `launchHistoryCoverage.days` rows can be used as source agreement evidence.

Rules:

- First-party rows are primary product truth.
- GA4 rows are second-source evidence only.
- Historical snapshot and legacy support rows are fallback evidence only.
- Missing first-party data is source missing, not zero.
- Do not include raw user identifiers, emails, payment details, secrets, or provider
  credentials.
- Do not use this folder to write or backfill product truth.

Refresh the recovery report after adding a real export:

```bash
npm run check:analytics-panel-hydration
npm run analytics:truth:rebuild
```
