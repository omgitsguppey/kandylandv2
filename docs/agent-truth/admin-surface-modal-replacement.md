# Admin Surface Modal Replacement

Source snapshot only. This lane tracks admin modal replacement and first-viewport admin status simplification. It does not prove production admin action success, provider/payment proof, browser visual QA, or creator modal removal.

Current refresh: reviewed against `05f05c4d3941ab1999608032c4bd72e5da6064b2`. Admin Analytics source agreement blockers use plain visible copy (`needs a connected source`) while preserving the canonical source-state enum for validators and Debug.

## Already Replaced

- `/admin/users` action overlay cluster became an inline action workspace.
- Balance and transaction history admin user modals became connected panels.
- `/admin/drops` notification draft became an inline panel beside the drops table.
- `/admin` Drops at a glance routes to the dedicated Drops Manager instead of owning a second create/edit modal lifecycle.
- `/admin/analytics` source details and panel recovery sit behind compact neutral drawers instead of separate warning-heavy panels.
- `/admin/analytics` source agreement blockers stay connected through the compact Data status source drilldown instead of a standalone first-viewport warning panel.
- `/admin/debug` panel status keeps the same source rows and data attributes, but repeated header badges and per-signal chips are collapsed into one summary plus plain text detail.

## Current Pass

`src/components/Admin/CreateDropModal.tsx` remains the canonical drop form owner, but it now supports `presentation="inline"`. `/admin/drops` uses that inline presentation for create, edit, and duplicate actions, so the action stays connected to the existing admin drop route and form contract without forcing the operator into a full-screen overlay.

The inline admin presentation now renders as a plain `section` with `data-admin-drop-form-presentation="inline"` instead of mounting `Dialog.Root` / `Dialog.Content`. Admin mode also defaults to inline presentation when the prop is omitted, so future admin call sites do not accidentally reintroduce the modal shell. Creator drop submission still keeps the default modal presentation because that flow is creator-facing and already uses the shared drop form contract.

Payment runtime, GumDrop math, top nav, and bottom nav were not touched.

## Source Ownership

| Surface | Source owner | Action owner | Decision |
| --- | --- | --- | --- |
| `/admin/drops` | `src/hooks/useAdminDropsFeed.ts` | `src/app/api/admin/drops/route.ts`, `src/lib/admin-drop-form.ts` | Replace admin overlay with inline connected panel |

## Remaining Debt

- Future admin overlays should be rejected unless they have a truthful source/action owner and a clear reason not to be inline.
- Debug raw evidence should stay behind existing drilldowns, not new modal shells.
- Browser QA still needs a verified admin session before claiming runtime visual proof.
- Production admin action success, provider/payment proof, and GumDrop treasury truth still require separate evidence.
