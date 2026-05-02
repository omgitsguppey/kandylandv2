# Creator Onboarding Audit Trail

Creator onboarding audit truth lives in `creator_onboarding/{uid}/history/{eventId}`. Do not create a second audit collection for intake, agreement, ID, approval, account-control, fan-experience, synthetic creator, or admin view-as actions.

Required lifecycle events are typed in `src/lib/creator-onboarding.ts` and written through `buildCreatorOnboardingHistoryEntry(...)` in `src/lib/server/creator-onboarding.ts`. Each entry must include actor identity, a human-readable summary, timestamp, target creator/user when applicable, actor marker evidence when available, and agreement version/hash plus IP/user agent for signature-sensitive actions.

Admin Roster shows the audit trail collapsed by default. When opened, it shows the latest 3 events first and exposes "View full history" for the rest. The visible subcopy is: "Every intake, agreement, ID, approval, and owner action is recorded here." Technical metadata belongs behind each event's `Details` disclosure and in Admin Debug/user detail evidence, not as primary row copy.

Visible labels must be human-readable:
- `creator_contract_signed` -> "Creator signed agreement"
- `admin_contract_signed` -> "Admin countersigned agreement"
- `legal_sent` -> "Agreement sent"
- `id_requested` -> "ID requested"
- `creator_experience_settings_updated` -> "Fan experience settings updated"
- `admin_account_updated` -> "Account controls updated"

Admin Debug remains the technical evidence surface. Raw event types, actor markers, agreement hashes, target IDs, IP/user-agent evidence, and route/source details are allowed there or inside collapsed Details, but not as the primary Admin Roster copy.

Validation: run `npm run check:creator-audit-trail` after touching creator onboarding history, agreement signing, Admin Roster audit display, account controls, fan experience settings, or synthetic/view-as actions.
