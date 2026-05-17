# Provider Smoke Evidence

Place redacted provider smoke evidence JSON files in this folder.

Templates are not evidence. `evidence.template.json` must keep `"status": "template_not_evidence"` until an operator creates a separate completed evidence file.

Do not include secrets, raw provider tokens, raw authorization headers, payer IDs, or unredacted transaction identifiers.

Run:

```bash
npm run check:provider-smoke-evidence
EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence
```
