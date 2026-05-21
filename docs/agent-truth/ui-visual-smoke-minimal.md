# UI Visual Smoke Minimal Lane

Status: minimal UI-only visual smoke evidence lane. It defines the exact layout-sensitive surfaces that need screenshot or operator visual confirmation.

This lane does not provide proof by itself. Missing evidence stays missing until an artifact exists.

## Summary

- Status: operator_final_pending
- Passed in Codex: false
- Required surface-device targets: 9
- Surface groups: 8
- Operator-final pending surfaces: user_dashboard_mobile, wallet_mobile, creator_dashboard_mobile, creator_settings_mobile, creator_drop_manager_mobile, creator_profile_mobile, admin_debug_summary_mobile, admin_debug_summary_desktop, drops_user_library_mobile
- Non-UI lanes blocked: false
- Clears provider smoke: false
- Clears deployed runtime smoke: false

## Required Surfaces

- user_dashboard_mobile: route=/dashboard; device=mobile; status=operator_final_pending; codexScoreBlocking=false; reason=Recent activity, tasks, and dashboard density are layout-sensitive on mobile.
- wallet_mobile: route=/dashboard#wallet; device=mobile; status=operator_final_pending; codexScoreBlocking=false; reason=Wallet modal density and balance presentation are mobile layout-sensitive.
- creator_dashboard_mobile: route=/dashboard/creator; device=mobile; status=operator_final_pending; codexScoreBlocking=false; reason=Creator dashboard loading and empty-state density changed in mobile source checks.
- creator_settings_mobile: route=/dashboard/creator/settings; device=mobile; status=operator_final_pending; codexScoreBlocking=false; reason=Creator settings is a layout-sensitive creator tool surface.
- creator_drop_manager_mobile: route=/dashboard/creator/drops; device=mobile; status=operator_final_pending; codexScoreBlocking=false; reason=Creator drop manager status and empty states are layout-sensitive on mobile.
- creator_profile_mobile: route=/creators/[username]; device=mobile; status=operator_final_pending; codexScoreBlocking=false; reason=Creator profile timeline and empty-state layout need visual confirmation.
- admin_debug_summary_mobile: route=/admin/debug; device=mobile; status=operator_final_pending; codexScoreBlocking=false; reason=Admin debug cockpit summary is a layout-sensitive operational UI surface.
- admin_debug_summary_desktop: route=/admin/debug; device=desktop; status=operator_final_pending; codexScoreBlocking=false; reason=Admin debug summary needs desktop hierarchy confirmation without raw dumps first.
- drops_user_library_mobile: route=/dashboard/library; device=mobile; status=operator_final_pending; codexScoreBlocking=false; reason=Drops/user library empty and loading states are layout-sensitive on mobile.

## Excluded By Default

- Chat
- Top nav
- Bottom nav
- Non-UI telemetry/admin/cost/source/provider/runtime lanes

## Template

- Template path: agent/evidence/ui-visual-smoke/template.json
- The template is not evidence and does not clear provider, runtime, admin, or Codex score gates.

## Next Exact Steps

- Operator final visual review needed for user_dashboard_mobile; visual confirmation handled outside Codex and must not block source/debug scoring.
- Operator final visual review needed for wallet_mobile; visual confirmation handled outside Codex and must not block source/debug scoring.
- Operator final visual review needed for creator_dashboard_mobile; visual confirmation handled outside Codex and must not block source/debug scoring.
- Operator final visual review needed for creator_settings_mobile; visual confirmation handled outside Codex and must not block source/debug scoring.
- Operator final visual review needed for creator_drop_manager_mobile; visual confirmation handled outside Codex and must not block source/debug scoring.
- Operator final visual review needed for creator_profile_mobile; visual confirmation handled outside Codex and must not block source/debug scoring.
- Operator final visual review needed for admin_debug_summary_mobile; visual confirmation handled outside Codex and must not block source/debug scoring.
- Operator final visual review needed for admin_debug_summary_desktop; visual confirmation handled outside Codex and must not block source/debug scoring.
- Operator final visual review needed for drops_user_library_mobile; visual confirmation handled outside Codex and must not block source/debug scoring.
