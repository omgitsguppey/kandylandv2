# Server Unlock Telemetry Emission

Batch 33 adds a canonical server unlock telemetry contract for successful `/api/drops/unlock` writes.

- Canonical event: `drop_unwrapped`
- Source truth: `server_unlock_route`
- Required linkage: user, Drop, transaction, entitlement, GumDrop spend split
- Idempotency: deterministic event id

Expected unlock failures, already-unlocked responses, access checks, and GumDrop spend math remain unchanged.
