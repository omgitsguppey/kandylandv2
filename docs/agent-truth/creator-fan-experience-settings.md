# Creator Fan Experience Settings

Status: Launch hardening doctrine
Last updated: 2026-05-02

## Doctrine

Admin Roster can edit creator fan experience settings, but it must not create a second settings model. The source shape is `CreatorSettings` and `CreatorRestrictions` from `src/lib/creator-experiences.ts`, which is also the shape read by `CreatorExperiencesPanel`.

The selected creator record shows `Fan experience settings` collapsed by default. Admins can update Fan Pass, private chat, custom requests, live time, broadcasts, pricing, request menu, availability, and restrictions from that section.

## Server Boundary

Canonical route:

- `POST /api/admin/creator-fan-experience-settings`
- File: `src/app/api/admin/creator-fan-experience-settings/route.ts`
- Guard: `auth: "admin"` and `requireTrustedOrigin: true`
- Surface marker: `creator_experiences`
- Performed as: `admin_on_behalf`

The client sends the canonical settings shape. The server validates it before writing.

## Validation Rules

- GD values must be whole, non-negative numbers.
- Fan Pass price must be at least `CREATOR_SUBSCRIPTION_MIN_GD`.
- Phone and video live time rates must respect `CREATOR_BOOKING_RATES`.
- Live time minimum must be at least `CREATOR_BOOKING_MIN_MINUTES`.
- Fan Pass video discount must be 0 through 100.
- Availability windows must have valid day, time, and service type values, and must end after they start.
- Restrictions that pause creator earning lanes require confirmation.
- Settings cannot save without an admin actor marker.

## Audit And Telemetry

Server telemetry:

- `admin_creator_experience_settings_saved`
- `admin_creator_experience_lane_toggled`
- `admin_creator_experience_pricing_updated`
- `admin_creator_experience_restriction_updated`

Client telemetry:

- `admin_creator_experience_settings_opened`

Payloads must include `actorType`, `actorUid`, `targetUserId`, `performedAs`, `settingKey`, `oldValue`, `newValue`, and `route: /admin/roster`.

Creator onboarding history records:

- `creator_experience_settings_updated`
- `creator_restrictions_updated`

## Debug Fields

Debug may show internal keys and raw ids:

- `creatorSettingsSource`
- `settingsNormalized`
- `settingsValidationWarnings`
- `lastSettingsUpdatedAt`
- `lastSettingsUpdatedBy`
- `changedKeys`

Visible UI uses plain labels such as Fan Pass, Private chat, Custom requests, Live time, and Payouts paused.

## Validation

Run:

```bash
npm run check:creator-fan-experience-settings
npx vitest run tests/unit/admin-creator-fan-experience-settings-route.spec.ts tests/unit/creator-experiences.spec.ts tests/unit/creator-experiences-panel.spec.tsx tests/unit/admin-roster-decision-queue.spec.ts
```
