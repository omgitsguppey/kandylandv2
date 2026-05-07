# Content Media Pipeline

Launch rule: cover, preview, thumbnail, and creator profile media may be public-safe. Protected Drop assets must not be exposed as raw URLs in public or unauthenticated UI.

## Source Boundaries

- Protected Drop assets are server mediated through `GET /api/drops/content`.
- The content proxy requires an authenticated caller, trusted origin, and either creator ownership or a server-written unlock entitlement.
- Direct Firebase Storage reads, writes, and lists under `drops/**` are denied by `storage.rules`.
- Public Drop lists and creator profile Drops must use `sanitizeDropForClient` before the payload reaches client UI.
- Viewer components may receive asset counts, filenames, MIME metadata, and public cover images. They must fetch protected bytes through `/api/drops/content` only.

## Public Media

Cover and preview media may be public-safe because they appear on discovery cards, creator profiles, owned library cards, and viewer poster/art surfaces.

Public media rules:

- `imageUrl`, creator avatar, and creator banner are public-safe presentation fields.
- `contentUrl` and `contentUrls` are protected fields and must be blanked for public/client payloads unless the caller is a guarded admin/creator editor.
- Creator profile media must only expose active, approved Drops and sanitized public creator fields.
- Missing or broken cover images use `/candy-3d-glass.png`.

## Protected Media

Protected Drop assets require entitlement before access:

- Locked users receive a 403 from `/api/drops/content`.
- Unlocked users are verified from server-owned `unlockedContent` or `unlockedContentTimestamps`.
- Creators can view their own Drop content without a paid unlock.
- The proxy validates the target media host before streaming.
- The proxy returns `Cache-Control: private, no-store` and never writes the raw Storage URL into the page payload.

## Library And Viewer

- The library filters Drops by the authenticated user's owned/unlocked set.
- The viewer page loads the raw Drop server-side only long enough to sanitize it for the client.
- The viewer state hook fetches content by Drop id and asset index through the protected proxy.
- Thumbnail order is deterministic and remains tied to asset index.
- Media viewer fallbacks use the same public-safe cover fallback for poster/art surfaces.

## Uploads

- Admin content upload requires admin auth and trusted origin.
- Creator Drop asset upload requires authenticated creator role and trusted origin.
- Upload routes validate file type, file size, and sanitized Storage filename server-side.
- Admin/creator upload returns Admin-minted Firebase download URLs for later server-side Drop records; public clients must not treat those as entitlement.
- Drop asset uploads use a real queue state machine. `Uploading` is measured when Firebase Storage progress is available, with percentage and progress bar. `Pending` is not a final state.
- Explicit client states are `local`, `queued`, `uploading`, `processing`, `success`, `failed`, `canceled`, and `blocked`.
- Direct Storage permissions must be verified against `storage.rules`; for `drops/**`, direct client upload is blocked and the uploader must use the guarded admin or creator server route.
- Mobile upload UI keeps progress, retry, cancel, and status inside compact thumbnail overlays to cut vertical sprawl without hiding truth.

## Expired And Archived Drops

Expired or archived Drops must not leak protected content. Locked expired Drops can disappear from discovery, but an already-owned viewer request still depends on the server entitlement check and asset availability.

Deletion/archive behavior for launch:

- Deleting a Drop doc removes it from public Drop retrieval.
- Deleting a Storage object makes the protected proxy return an unavailable payload from the upstream object.
- There is no automated asset purge in this launch pass; purge/deletion jobs should be explicit and audited before rollout.

## Agent Rules

- Do not pass raw `contentUrl` or `contentUrls` into public UI.
- Do not use public Storage rules for protected content.
- Do not replace entitlement with client profile state.
- Do not add fallback images that reference missing files or old starter logos.
- If a new media surface is added, wire it into `npm run check:content-media-pipeline`.
