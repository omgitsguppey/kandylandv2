# Admin Roster Decision Queue

Status: Launch UI doctrine  
Last updated: 2026-05-02

## Doctrine

Admin Roster is a decision queue, not a mixed cockpit. The first screen should help an operator decide what needs attention now, who is waiting on the creator, who is approved, and when a manual creator account must be created.

The primary tabs are:

- `Needs Review`
- `Waiting`
- `Approved`
- `Create`

Do not restore the old primary tab model of `Intake`, `Live creators`, and `Create creator`.

## Decision Rules

`Needs Review` means an admin can act now: request ID upload, send agreement, countersign agreement, approve creator, return for changes, reject application, or investigate a role activation issue.

`Waiting` means the creator needs to act: acknowledge intro, sign agreement, upload ID, or resubmit requested changes.

`Approved` means the user is already a creator or the creator onboarding approval state is approved.

`Create` is the guarded admin/manual creator creation form. Owner-only bypass controls stay hidden from normal admin flow and collapsed by default.

## Mobile Rules

- Use compact segmented controls for the tabs.
- Summary cards stay compact and scroll horizontally on mobile.
- Roster rows are short, one-tap, and scannable.
- The detail panel stacks below the list on mobile.
- Agreement document, ID, audit, notes, owner controls, and agreement templates stay collapsed until needed.
- Do not show raw enum labels such as `signature_pending` or `id_not_requested` in visible UI.
- Do not create fake chips. Static state text should look like text, not a button.

## Agreement Document Manager

The selected creator panel owns a collapsed `Agreement document` section. It shows the current agreement version, document title, last sent time, creator signature state, admin countersign state, full-document availability, and hash availability. It may offer `View agreement`, `Send agreement`, `Send updated agreement`, and `Countersign agreement`.

The Create tab owns a collapsed `Agreement templates` section. It lets admins save a template source, preview the active agreement, and lets the primary owner mark a template active for new creators. Storage paths and raw document paths stay out of visible UI and belong in Debug evidence only.

## Audit Trail

The selected creator panel owns a collapsed `Audit trail` section. Its visible subcopy is: "Every intake, agreement, ID, approval, and owner action is recorded here."

Default view shows only the latest 3 audit events. `View full history` expands the rest. Primary event labels must be human-readable, such as "Creator submitted application," "Agreement sent," "Creator signed agreement," "Admin countersigned agreement," "ID requested," "Creator approved," and "Owner override applied." Raw event types and metadata stay inside each event's collapsed `Details` section or Admin Debug.

## Telemetry

The Admin Roster page emits identity-marked telemetry for:

- `admin_roster_tab_changed`
- `admin_creator_record_opened`
- `admin_creator_primary_action_clicked`
- `admin_creator_section_expanded`
- `admin_creator_audit_trail_opened`
- `admin_creator_audit_event_expanded`
- `admin_creator_agreement_template_created`
- `admin_creator_agreement_template_activated`
- `admin_creator_agreement_sent`
- `admin_creator_agreement_update_sent`
- `admin_creator_agreement_countersigned`

Required payload fields include:

- `actorType`
- `actorUid`
- `targetUserId`
- `performedAs`
- `tab`
- `actionKey`
- `sectionKey` when a section is expanded
- `actorMarkerPresent`
- `rosterMode: decision_queue`

## Debug Metadata

The page exposes compact debug metadata:

- `rosterMode`
- `selectedTab`
- `selectedCreatorId`
- `primaryAction`
- `collapsedSections`
- `ownerControlsVisible`
- `actorMarkerPresent`
- `activeAgreementVersion`
- `activeAgreementHash`
- `selectedCreatorAgreementVersion`
- `selectedCreatorAgreementHash`
- `dispatchStatus`
- `signatureEvidenceComplete`
- `priorAgreementPreserved`
- `requiresResign`

Future agents must keep legal and audit evidence available, but not crowd the default review flow.

## Creator Intake Relationship

The creator intake now collects the launch setup fields before the Admin Roster decision queue sees the record:

- monetization goals
- audience range and posting rhythm
- whether fans already ask for access
- recommended creator setup

Admin Roster should use those fields as review context only. It must not push raw legal or audit machinery back into the creator-facing intake.
