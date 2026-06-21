# Launch Analytics Evidence

This folder is for local, redacted launch-history coverage exports only.

Accepted input paths:

- `agent/evidence/launch-analytics/launch-history-coverage.local.json`
- `agent/evidence/launch-analytics/launch-history-coverage.export.json`

Use `launch-history-coverage.template.json` as the shape reference, then copy it to one
of the accepted paths when an approved export is available. Keep `status:
"template_not_evidence"` in templates and drafts. Only complete, redacted exports with
real `launchHistoryCoverage.days` rows can be used as source agreement evidence.
When the saved Admin Analytics response includes `eventFamilyCoverage`, keep the
compact family rows in the export so recovery can show which launch-critical
actions are observed, modeled, inferred, cached, or still missing.

To convert a saved, redacted all-range Admin Analytics historical response into
the compact local export shape, run:

```bash
npm run capture:truthful-evidence -- --launch-coverage-from <redacted-all-range-historical-export.json>
```

This command reads a local JSON file only. It rejects local-window evidence and
does not call production routes, GA, Firebase, or providers. By default it writes
`agent/evidence/launch-analytics/launch-history-coverage.export.json`; pass
`--launch-coverage-output <path>` only when you intentionally need another
accepted path.

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
