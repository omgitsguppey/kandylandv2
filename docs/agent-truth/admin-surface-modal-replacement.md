# Admin Surface Modal Replacement

Source snapshot only. This pass replaced the `/admin/users` action overlay cluster with an inline action workspace and renamed the balance/history admin user modals to connected panels.

The `/admin/drops` notification draft now renders inline beside the drops table instead of as a blocking overlay. `CreateDropModal` remains because it is connected and shared with creator tooling; replacing it safely needs a dedicated create/edit form split.

This does not prove production admin action success, provider/payment proof, browser visual QA, or CreateDropModal replacement readiness.
