# Creator Drop Manager Mobile Refinement

Generated source: `agent/state/creator-drop-manager-mobile-refinement.generated.json`

## Canonical Behavior

- `/dashboard/creator/drops` remains the creator drop submission manager.
- Creator Drop Manager uses the shared admin/creator Drop form contract and `CreateDropModal` in creator mode.
- The mobile screen has one primary action: `Submit drop`.
- Creator copy says `Submit for review`, not publish.
- Creator submissions remain separated from My KandyDrops and require admin approval before public discovery or rotation.

## Status

- Dependency present: true
- Mobile primary action clear: true
- Compact list enabled: true
- Admin-only fields hidden: true
- Bottom nav safe: true

## Validation

Run:

```bash
npm run check:creator-drop-manager-mobile-refinement
```
