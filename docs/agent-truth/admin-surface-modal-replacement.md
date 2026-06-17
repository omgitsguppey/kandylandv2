# Admin Surface Modal Replacement

Source snapshot only. This lane tracks admin modal replacement and first-viewport admin status simplification.

Already replaced:
- `/admin/users` action overlay cluster became an inline action workspace.
- Balance and transaction history admin user modals became connected panels.
- `/admin/drops` notification draft became an inline panel beside the drops table.

Current pass:
- `/admin/analytics` source details and panel recovery now sit behind compact neutral drawers instead of separate warning-heavy panels.
- `/admin` Drops at a glance no longer opens the large create/edit modal. It routes to `/admin/drops`, and row actions pass `dropId` so the connected Drops Manager owns filtering, expansion, and edit/create actions.
- `CreateDropModal` remains because it is connected and shared with creator tooling. Replacing it safely needs a dedicated create/edit form split.

This does not prove production admin action success, provider/payment proof, browser visual QA, or CreateDropModal replacement readiness.
