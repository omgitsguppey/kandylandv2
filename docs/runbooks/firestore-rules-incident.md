# Firestore Rules Incident Runbook

## Symptoms

- Unauthorized read/write, legitimate user blocked, admin route bypass, Storage exposure, emulator/rules mismatch, or unexpected permission-denied spikes.

## Immediate Containment

- Treat rules changes as security-sensitive.
- Preserve rule diff, request path, auth context, user/admin id, and emulator or production error evidence.
- Do not broaden rules as a quick fix without owner approval.

## Rollback

- Revert the smallest rules commit if the regression is source-controlled.
- If emergency restriction is needed, prefer deny-by-default over broad allow.

## Validation

- Run targeted rules validators only.
- Confirm owner/admin/user scope, locked content safety, and no public data exposure.

## Owner

- Firebase rules/storage CODEOWNER.

## Logs And Evidence

- Firestore path, Storage path, auth claims, rule line, request method, and debug evidence id.
- Remove private user/content data from any public notes.

## Follow-Up

- Add a targeted rule fixture for the failed permission boundary.
