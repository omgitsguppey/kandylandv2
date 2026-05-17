# Runtime Smoke Evidence

Place deployed runtime smoke evidence JSON files in this folder.

Templates are not evidence. `evidence.template.json` must keep `"status": "template_not_evidence"` until an operator creates a separate completed evidence file.

Do not run provider calls in this lane and do not include secrets.

Run:

```bash
npm run check:runtime-smoke-evidence
EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence
```
