# Admin Truth Sample Evidence

Place redacted admin truth sample evidence JSON files in this folder.

Templates are not evidence. `evidence.template.json` must keep `"status": "template_not_evidence"` until an operator creates a separate completed evidence file.

Do not touch admin backend for this lane. Evidence must be redacted and source freshness must be visible.

Launch analytics recovery can use a completed admin truth sample only when the JSON includes `launchHistoryCoverage`.
General admin truth samples without that field remain valid admin-truth evidence, but they do not prove all-launch analytics coverage.

For launch recovery, keep counts redacted and bounded:

- `sourceCounts.first_party`: first-party day-bucket or `analytics_event_facts` rows.
- `sourceCounts.ga4`: GA4/export day rows, second-source only.
- `sourceCounts.historicalSnapshot`: historical admin snapshot rows.
- `sourceCounts.legacySupport`: legacy support/archive rows.
- `internalAdminExcludedCount`: redacted internal/admin traffic exclusions if known.

Run:

```bash
npm run check:admin-truth-sample-evidence
EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence
```
