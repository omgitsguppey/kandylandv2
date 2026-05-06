# Creator Fan Experience Settings

Status: Launch hardening doctrine
Last updated: 2026-05-02

## Doctrine

Admin Roster can edit creator fan experience settings, but it must not create a second settings model. The source shape is `CreatorSettings` and `CreatorRestrictions` from `src/lib/creator-experiences.ts`, which is also the shape read by `CreatorExperiencesPanel`.

Approved/live creators must always have a normalized `CreatorSettings` record. If a creator becomes live through role, approval, approved queue bucket, or creator experience activity before manually configuring settings, the canonical fallback is `buildDefaultCreatorFanExperienceSettings(userId, actor)`.

Default settings must be safe, not promotional:

- Fan Pass, private chat, custom requests, messaging, and broadcasts use canonical default pricing and lane flags.
- Live Time bookings are not enabled unless availability exists.
- Empty availability records mean `creator_availability_not_configured`, not hidden open booking hours.
- Defaults include `schemaVersion`, `normalizedBy`, timestamps, and provenance.
- Debug self-heal uses `normalizedBy: "admin_debug_self_heal"` and never overwrites existing creator settings.

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

## Fan-Facing Panel Copy

`CreatorExperiencesPanel` reads this same `CreatorSettings` shape but must not expose raw internal settings names. Fan-facing copy uses access-oriented labels:

- Fan Pass: "Stay closer when new access opens."
- Private chat: "Send a private message without getting lost in comments."
- Custom Request: "Ask for something specific, then let the creator decide what fits."
- Live Time: "Reserve real time before the window closes."

The fan panel may compact secondary details into rows or collapsed sections, but it must not change pricing logic or billing behavior. See `docs/agent-truth/creator-experiences-copy.md`.

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
