# codex execution guardrails

Source-only hardening artifact. It does not run production reads, provider calls, exports, deploys, or mutate legacy/production data.

```json
{
  "reportKey": "codex-execution-guardrails",
  "generatedAtUtc": "2026-07-03T07:11:01.901Z",
  "status": "pass",
  "sourceOnly": true,
  "guardrails": [
    "Start with status, recent commits, dirty/untracked classification, and open PR classification.",
    "Build a touched-file plan before editing and read adjacent contracts.",
    "Use package script inventory and add validator plus unit test for new checks.",
    "Do not hide evidence, do not promote source checks into formal runtime/provider/admin proof, and explain accuracy/cost tradeoffs.",
    "Finish with stale/legacy/orphan search and scoped staging only; do not use git add -A."
  ]
}
```
