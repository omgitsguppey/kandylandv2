# User Settings Surface

Status: launch-hardening truth note

Global Account Settings lives at `/settings` and owns account and app preferences only.

Allowed sections:

- Account
- Privacy
- Notifications
- App Preferences
- Support & Legal

If the current user is a creator, the page may show a small migration card that points to the Creator Dashboard. It must not duplicate creator broadcasts, Fan Pass, bookings, requests, earnings, availability, or monetization tools.

Copy rule:

- Keep the page user-facing and simple.
- Do not use admin/debug language.
- Use human next steps instead of internal codes.

Telemetry:

- `user_settings_viewed`
- `user_settings_creator_tools_cta_clicked`

Validation:

- Creator tools are blocked from global user settings.
- Settings navigation must point users to `/settings` for Account Settings and creators to Creator Settings for creator operations.
