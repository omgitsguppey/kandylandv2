# Admin Surface Modal Replacement

Source snapshot only. This lane tracks admin modal replacement and first-viewport admin status simplification. It does not prove production admin action success, provider/payment proof, browser visual QA, or creator modal removal.

Current refresh: reviewed against `87c45861396dab9629bad0ad54bcee01a7117889`. Admin Analytics source agreement blockers use plain visible copy (`needs a connected source`) while preserving the canonical source-state enum for validators and Debug.

## Already Replaced

- `/admin/users` action overlay cluster became an inline action workspace.
- Balance and transaction history admin user modals became connected panels.
- `/admin/drops` notification draft became an inline panel beside the drops table.
- `/admin` Drops at a glance routes to the dedicated Drops Manager instead of owning a second create/edit modal lifecycle.
- `/admin/analytics` source detail and panel recovery now share one compact neutral drawer instead of separate warning-heavy panels.
- `/admin/analytics` source agreement blockers stay connected through the compact Data status source drilldown instead of a standalone first-viewport warning panel.
- `/admin/debug` panel status keeps the same source rows and data attributes, but repeated header badges and per-signal chips are collapsed into one summary plus plain text detail.
- `/admin/debug` Control Tower keeps launch blockers, current issues, source rows, and the readiness reason in the same model-backed summary, but no longer renders those values as four separate chips.

## Current Pass

This pass kept the remaining Admin Analytics source drilldown connected to the existing panel hydration source, simplified the visible label to `Source status`, replaced the broken separator artifact with plain hyphens, and kept panel details inside the inline disclosure. The canonical source-state attributes remain intact for validators and Debug.

`src/components/Admin/CreateDropModal.tsx` remains the canonical drop form owner. `/admin/drops` still uses `presentation="inline"` for create, edit, and duplicate actions, so the action stays connected to the existing admin drop route and form contract without forcing the operator into a full-screen overlay.

Payment runtime, GumDrop math, top nav, and bottom nav were not touched.

## Source Ownership

| Surface | Source owner | Action owner | Decision |
| --- | --- | --- | --- |
| `/admin/drops` | `src/hooks/useAdminDropsFeed.ts` | `src/app/api/admin/drops/route.ts`, `src/lib/admin-drop-form.ts` | Replace admin overlay with inline connected panel |
| `/admin/roster` | `src/app/admin/roster/page.tsx` | `src/app/api/admin/creator-agreements`, creator agreement helpers | Replace shared preview state with local inline disclosure |
| `/admin/analytics` | `src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx` | `agent/state/analytics-panel-hydration.generated.json`, source hierarchy helpers | Keep one connected source status disclosure with plain summary text |

## Remaining Debt

- Future admin overlays should be rejected unless they have a truthful source/action owner and a clear reason not to be inline.
- Debug raw evidence should stay behind existing drilldowns, not new modal shells.
- Browser QA still needs a verified admin session before claiming runtime visual proof.
- Production admin action success, provider/payment proof, and GumDrop treasury truth still require separate evidence.
