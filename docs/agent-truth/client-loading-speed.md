# Client loading speed

Phase 1 cleanup keeps client loading deterministic and scoped:

- No admin/debug/AI bundle imports on user-facing routes.
- Optional-heavy modules remain lazy/dynamic.
- Chat avoids eager thread-media loading before thread open.
- Duplicate version/build listeners are blocked.

Command: `npm run check:client-loading-speed`
