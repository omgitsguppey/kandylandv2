# Admin Truth Sample Evidence Checklist

This checklist prepares admin truth sample evidence only. Do not touch admin backend, Admin UI, Admin Analytics, or Admin Debug in this lane.

Required artifact shape:

```json
{
  "generatedAtUtc": "ISO timestamp",
  "reportKey": "admin-truth-sample-evidence",
  "currentHead": "git sha",
  "status": "formal_admin_truth_sample_passed | external_proof_required | stale_admin_truth_sample_evidence | failed",
  "sourceFreshnessUtc": "ISO timestamp",
  "redactionsApplied": true,
  "sampleCount": 1,
  "evidencePaths": [
    "agent/evidence/admin-truth/<file>.redacted.json"
  ]
}
```

The sample must show:

- Source freshness timestamp.
- Sample count.
- Which admin truth surface or source produced the sample.
- Whether the source is live, cached, refresh_due, source_missing, bridge_missing, materializer_missing, permission_blocked, failed, or unavailable.
- Enough route or report context to connect the sample to beta exit evidence.

Acceptable evidence:

- Redacted JSON sample.
- Optional redacted screenshot only as corroboration when a visual source-state claim cannot be represented by the JSON sample.

Redaction rules:

- Redact user identifiers, email addresses, transaction IDs, provider IDs, raw auth data, and private support content.
- Keep source-state labels, timestamps, counts, and route/report keys visible.
- Do not call admin truth passed without an attached artifact path and source freshness timestamp.

Admin truth sample evidence remains blocking for beta exit until the formal artifact exists and the admin truth sample validator consumes it.
