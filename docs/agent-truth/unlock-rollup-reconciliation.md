# Unlock Rollup Reconciliation

Unlock access parity now separates transaction count, rollup unlock count, rollup document count, telemetry count, date window, and mismatch reason.

Current Batch 33 state remains failed: 47 unlock transactions vs 145 canonical unlock rollups with 0 server unlock telemetry events. The classified reason is `missing_server_unlock_telemetry`; no production backfill is performed.
