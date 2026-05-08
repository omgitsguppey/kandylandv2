# Google Cloud cost data handoff

Google-related lanes are cost-guarded and handoff-tracked.

## Doctrine

- SQL/Data Connect is sidecar/mirror only unless explicitly promoted.
- BigQuery exports/imports are evidence pipelines with dry-run/idempotency constraints.
- GA is optional external evidence and cannot replace first-party truth.
- Cloud Run/App Hosting/Firestore/Storage/logging lanes require route-level caps and dedupe.
- Materializers require cursor, cap, runtime budget, and owner visibility.

Command: `npm run check:google-cloud-cost-data-handoff`
