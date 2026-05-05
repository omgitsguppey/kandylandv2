# Viewer Doctrine

Authority level: 4

Owner: viewer/file tracking

## Must

- Emit `file_viewed` when a file/media index becomes visible.
- Include dropId, fileId, assetKey, mediaIndex, mediaType, and viewerSessionId.
- Connect file views to watch session started/ended facts.
- Deduplicate repeated same-file views within the approved window.

## Must Not

- Put internal content URLs in telemetry.
- Count render-time file mapping as a view.
- Disconnect file tracking from viewer session truth.

## Source Truth

- Viewer session contract, media visibility, watch session contract.

## Validators

- `check:viewer-file-tracking`
- `check:watch-time-truth`
- `check:content-protection`
