# Admin Truth Sample Evidence

Place redacted admin truth sample evidence JSON files in this folder.

Templates are not evidence. `evidence.template.json` must keep `"status": "template_not_evidence"` until an operator creates a separate completed evidence file.

Do not touch admin backend for this lane. Evidence must be redacted and source freshness must be visible.

Run:

```bash
npm run check:admin-truth-sample-evidence
EVIDENCE_STRICT=1 npm run check:admin-truth-sample-evidence
```
