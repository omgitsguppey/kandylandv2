# Event timeline management

KandyDrops event scoring and behavior profiles must consume normalized first-party facts.

## Rules

- Guest/user/creator/admin/system events flow through normalized runtime fact lanes.
- Actor/target separation is required.
- Page leave/duration is diagnostic only, not watch truth.
- GA is optional external evidence and not canonical truth.
- Behavioral/profile/index consumers require source breakdown and confidence constraints.

Command: `npm run check:event-timeline-management`
