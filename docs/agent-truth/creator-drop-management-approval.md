# Creator Drop Management Approval

Generated source: `agent/state/creator-drop-management-approval.generated.json`

## Canonical Behavior

- Creator Dashboard `Manage drops` routes to `/dashboard/creator/drops`.
- `/dashboard/creator/drops` is a creator submission manager, not the user My KandyDrops library.
- Creator submissions reuse the admin Drop form and server mutation validation through shared Drop contracts.
- Creator-submitted Drops start with `reviewStatus: pending_admin_approval`, `approvalStatus: pending_review`, `publicDiscovery: false`, and `rotationEligibility: false`.
- Creators cannot set publish, live, approval, public discovery, or rotation flags directly.
- Creator reads are scoped to Drops they submitted, own, or are explicitly assigned.
- Admin approval remains the only path that can move creator submissions toward public discovery and rotation.

## Status

- Existing admin pipeline reused: true
- Creator manager route created: true
- Admin approval required: true
- Public discovery guarded: true
- Rotation guarded: true

## Validation

Run:

```bash
npm run check:creator-drop-management-approval
```
