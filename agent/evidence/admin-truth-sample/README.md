# Admin Truth Sample Evidence

Place redacted admin truth sample evidence JSON files in this folder.

Templates are not evidence. `evidence.template.json` must keep `"status": "template_not_evidence"` until an operator creates a separate completed evidence file.

Do not touch admin backend for this lane. Evidence must be redacted and source freshness must be visible.

The default truthful-evidence capture reads local generated summaries only. It emits an incomplete source diagnostic, with no claim that authoritative admin activity was sampled. A local `agent/state` report, healthy label or copied timestamp cannot clear this formal lane. A completed sample must come from the actual authorized source, retain its freshness and evidence boundary, and pass every required check. Mixed invalid evidence cannot be hidden by one passing artifact.

Launch analytics recovery can use a completed admin truth sample only when the JSON includes `launchHistoryCoverage`.
General admin truth samples without that field remain valid admin-truth evidence, but they do not prove all-launch analytics coverage.
To clear all-launch recovery, `launchHistoryCoverage.rangeProof.allLaunchRangeProven` must be `true`, `rangeStartDayKey` and `rangeEndDayKey` must match the provided day rows, and the row count must cover the declared range.

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
