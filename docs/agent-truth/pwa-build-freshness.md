# PWA Build Freshness

## User-facing policy

- Normal user surfaces do not render:
  - `New version available`
  - `Refresh to load the latest KandyDrops build.`
- Build freshness remains operational but silent.

## Runtime behavior

- `PwaRuntimeBridge` registers service worker once.
- Update watcher is singleton-scoped to prevent duplicate listeners.
- Manifest checks use no-store/no-cache request policy.
- Same-build parity does not trigger visible prompts.
