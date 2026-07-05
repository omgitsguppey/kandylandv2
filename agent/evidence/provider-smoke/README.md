# Provider-Backed Source Activity Evidence

Place redacted provider-backed source activity evidence JSON files in this folder.

Templates are not evidence. `evidence.template.json` must keep `"status": "template_not_evidence"` until an operator creates a separate completed evidence file.

Accepted evidence is source-derived and redacted: PayPal capture/order artifacts, server transaction or ledger proof, GumDrop source-of-funds corroboration, and webhook or route evidence when available.

Do not include secrets, raw provider tokens, raw authorization headers, payer IDs, or unredacted transaction identifiers. Screenshots, manual notes, and operator confirmation alone do not clear this gate.

Run:

```bash
npm run check:provider-smoke-evidence
EVIDENCE_STRICT=1 npm run check:provider-smoke-evidence
```
