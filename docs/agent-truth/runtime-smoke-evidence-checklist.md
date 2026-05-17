# Runtime Smoke Evidence Checklist

This checklist prepares deployed runtime smoke evidence. It does not mark runtime smoke as passed. Do not make provider calls in this lane; provider calls belong to provider smoke.

Required artifact shape:

```json
{
  "generatedAtUtc": "ISO timestamp",
  "reportKey": "runtime-smoke-evidence",
  "currentHead": "git sha",
  "status": "formal_runtime_smoke_passed | runtime_unverified | failed",
  "items": [
    {
      "route": "/",
      "status": "passed | failed",
      "evidencePath": "agent/evidence/runtime-smoke/<file>.json"
    }
  ]
}
```

Required checks:

- Deployed home route `/` loads.
- `/drops` loads public discovery.
- `/creators/[username]` loads a creator profile.
- Booking slot flow renders generated availability slots or a truthful unavailable state.
- `/dashboard/creator` loads for an authorized creator account.
- `/dashboard/chat` shell loads without proving message persistence.
- Beta release notes drawer opens and shows the current Beta note.
- API health/runtime route if an existing safe route is available; do not create a fake route for this checklist.

Failure examples:

- Route fails to load.
- Runtime shell hydrates into a blank state.
- Booking slots are replaced by arbitrary date/time picking.
- Release drawer version is stale or inaccessible.
- Evidence claims provider success without provider-smoke artifact.

Runtime smoke remains blocking for beta exit until a formal runtime artifact exists and the runtime smoke validator consumes it.
