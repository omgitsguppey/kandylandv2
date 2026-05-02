# Creator Profile Routing

Creator public profile links are built by `src/lib/creator-profile-routing.ts`.

Canonical rules:
- Public creator profile route: `/creators/[username]`.
- Use `buildCreatorPublicHref(creator)` for fan-facing profile links.
- Use `buildCreatorAdminHref(creator)` for admin user records.
- Use `buildCreatorReviewHref(userId)` for Admin Roster review focus links.
- Use `canLinkToCreatorPublicProfile(creator)` before rendering a public profile link.
- Use `explainCreatorProfileRouteMissing(creator)` when a profile link cannot be built.

Do not hand-build `/creators/${username}` in UI, notification links, roster controls, chat headers, or creator discovery rails. The public route expects a profile slug, so the builder prefers `username`, `handle`, or `creatorUsername`. It does not fall back to `uid` for public routes because `/creators/[uid]` is not the launch route.

If a creator profile route cannot be built, render a non-link state with a debug reason. Do not use `#`, root username paths, `router.back()`, or a link that sends a valid creator into a 404.

synthetic creators follow the same route rule. If a synthetic creator has public profile access enabled and a valid username/handle, the public link must resolve through `buildCreatorPublicHref`. If it lacks a slug or public profile access is disabled, the UI should show a non-link state and Debug should expose the reason.

Telemetry:
- `creator_profile_link_clicked`
- `creator_profile_link_missing`

Both events should include actor marker fields, `creatorId`, and `routeSource` so Admin Debug can tell whether the link came from chat, discovery, roster, notifications, or another creator surface.
