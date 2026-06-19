# UI Surface Coverage Gate

Status: deterministic source-owned UI surface coverage lane.

This lane lets the codebase tell on itself before any manual viewing. Screenshots are optional follow-up evidence only when a source/UI-surface check identifies a visual issue to reproduce.

## Summary

- Status: source_surface_checks_current
- Source checks passed: true
- Required surface-device targets: 9
- Surface groups: 8
- Source gap surfaces: none
- Non-UI lanes blocked: false
- Clears provider smoke: false
- Clears deployed runtime smoke: false

## Required Surfaces

- user_dashboard_mobile: route=/dashboard; device=mobile; status=source_surface_checked; codexScoreBlocking=false; reason=Recent activity, tasks, and dashboard density are layout-sensitive on mobile.
- wallet_mobile: route=/dashboard#wallet; device=mobile; status=source_surface_checked; codexScoreBlocking=false; reason=Wallet modal density and balance presentation are mobile layout-sensitive.
- creator_dashboard_mobile: route=/dashboard/creator; device=mobile; status=source_surface_checked; codexScoreBlocking=false; reason=Creator dashboard loading and empty-state density changed in mobile source checks.
- creator_settings_mobile: route=/dashboard/creator/settings; device=mobile; status=source_surface_checked; codexScoreBlocking=false; reason=Creator settings is a layout-sensitive creator tool surface.
- creator_drop_manager_mobile: route=/dashboard/creator/drops; device=mobile; status=source_surface_checked; codexScoreBlocking=false; reason=Creator drop manager status and empty states are layout-sensitive on mobile.
- creator_profile_mobile: route=/creators/[username]; device=mobile; status=source_surface_checked; codexScoreBlocking=false; reason=Creator profile timeline and empty-state layout need visual confirmation.
- admin_debug_summary_mobile: route=/admin/debug; device=mobile; status=source_surface_checked; codexScoreBlocking=false; reason=Admin debug cockpit summary is a layout-sensitive operational UI surface.
- admin_debug_summary_desktop: route=/admin/debug; device=desktop; status=source_surface_checked; codexScoreBlocking=false; reason=Admin debug summary needs desktop hierarchy confirmation without raw dumps first.
- drops_user_library_mobile: route=/dashboard/library; device=mobile; status=source_surface_checked; codexScoreBlocking=false; reason=Drops/user library empty and loading states are layout-sensitive on mobile.

## Deterministic Checks

- `npm run check:ui:coverage`
- `npm run check:admin-browser-surface-smoke`
- `npm run check:device-ui`

## Not Cleared By This Lane

- Provider proof
- Deployed runtime smoke
- Production admin truth samples
- Payment or GumDrop treasury truth

## Template

- Template path: agent/evidence/ui-visual-smoke/template.json
- The template is optional context only. It is not required to clear UI source coverage and does not clear provider, runtime, admin, or payment gates.

## Next Exact Steps

- Keep npm run check:ui:coverage, npm run check:admin-browser-surface-smoke, and npm run check:device-ui in the UI/admin fast lane.
- Use screenshots or browser viewing only to reproduce a specific source-reported UI issue, not as the readiness gate.
