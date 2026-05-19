# Creator Dashboard Overview Stats

Creator Dashboard is a creator-owned operational surface. Creator Dashboard stats use creator-scoped truth, not public discovery truth.

Public fans may only see public/available/eligible drops. Creator Dashboard content counts drops owned or explicitly assigned to that creator, including expired, archived, and unlisted states when the creator owns or is assigned to them. The dashboard must never count or show another creator's drops.

Followers may exist as an internal source name, but product-facing Creator Dashboard language is Fans. Fan count source order is relationship/follow records where `creatorId` matches, then source-backed creator profile follower count, then creator settings or relationship snapshot only when marked as partial evidence. Missing fan evidence is partial or unavailable, not a canonical zero.

Drops for all creators is not the same as owned by every creator. A global/all-creator drop counts for one creator only when the source explicitly assigns, links, or scopes that creator to the drop.

If a creator has no setup document but has source-backed relationships or drops, the dashboard shows the source-backed counts with a compact setup notice instead of replacing valid metrics with zeros.
