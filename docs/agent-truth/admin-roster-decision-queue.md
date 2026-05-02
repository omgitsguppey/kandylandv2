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
- Legal, ID, audit, notes, and owner controls stay collapsed until needed.
- Do not show raw enum labels such as `signature_pending` or `id_not_requested` in visible UI.
- Do not create fake chips. Static state text should look like text, not a button.

## Telemetry

The Admin Roster page emits identity-marked telemetry for:

- `admin_roster_tab_changed`
- `admin_creator_record_opened`
- `admin_creator_primary_action_clicked`
- `admin_creator_section_expanded`

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

Future agents must keep legal and audit evidence available, but not crowd the default review flow.
