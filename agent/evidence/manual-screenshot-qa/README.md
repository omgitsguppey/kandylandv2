# Manual Screenshot QA Evidence

Place completed manual screenshot QA evidence JSON files in this folder and image files under `screenshots/`.

Templates are not evidence. `evidence.template.json` must keep `"status": "template_not_evidence"` until an operator creates a separate completed evidence file.

Run:

```bash
npm run check:manual-screenshot-evidence
EVIDENCE_STRICT=1 npm run check:manual-screenshot-evidence
```

Default mode reports missing evidence without failing. Strict mode fails until a complete non-template evidence JSON includes every required route and existing relative screenshot path.
