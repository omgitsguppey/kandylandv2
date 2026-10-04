# Runtime Smoke Evidence

Place deployed runtime smoke evidence JSON files in this folder.

Templates are not evidence. `evidence.template.json` must keep `"status": "template_not_evidence"` until an operator creates a separate completed evidence file.

Completed evidence must record the exact full `currentHead` it validates and be captured within the 24-hour evidence window. Old evidence cannot be rewrapped as current.

Keep identified expired or wrong-revision historical receipts in `archive/` with their original bytes and source identity preserved. The existing validator selects JSON files directly in this folder; archived history cannot satisfy current acceptance. Do not archive an invalid current receipt to force a PASS. Missing current evidence remains unresolved.

`capture:truthful-evidence -- --runtime-smoke` records bounded GET reachability diagnostics. It cannot verify the deployed revision, booking actions or release drawer interaction. Its output remains incomplete with blocked formal checks, a `localSourceHead` and `generated_snapshot` classification. Attach independently verified deployment-revision and exercised behavior evidence to complete this lane. Every required formal check must pass; a complete label cannot override a failed or blocked check.

Do not run provider calls in this lane and do not include secrets.

Run:

```bash
npm run check:runtime-smoke-evidence
EVIDENCE_STRICT=1 npm run check:runtime-smoke-evidence
```
