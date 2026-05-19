# Creator Dashboard Overview Stats

Creator Dashboard is a creator-owned operational surface. Creator Dashboard stats use creator-scoped truth, not public discovery truth.

Public fans may only see public/available/eligible drops. Creator Dashboard content counts drops owned or explicitly assigned to that creator, including expired, archived, and unlisted states when the creator owns or is assigned to them. The dashboard must never count or show another creator's drops.

Creator Dashboard overview uses a follower-style relationship metric. The product-facing overview label is Followers, and the metric still comes from relationship/follow records where `creatorId` matches, then source-backed creator profile follower count, then creator settings or relationship snapshot only when marked as partial evidence. Missing follower evidence is partial or unavailable, not a canonical zero.

The Creator Overview remains one compact wrapper module. Its inner metric grid stays two columns on mobile and uses the `mobile_4x4_compact` grid density marker so the overview reads as a tight operational summary instead of a stack of large standalone cards.

Drops for all creators is not the same as owned by every creator. A global/all-creator drop counts for one creator only when the source explicitly assigns, links, or scopes that creator to the drop.

If a creator has no setup document but has source-backed relationships or drops, the dashboard shows the source-backed counts with a compact setup notice instead of replacing valid metrics with zeros.
