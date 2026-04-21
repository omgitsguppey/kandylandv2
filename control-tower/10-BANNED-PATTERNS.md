# Banned Patterns (Anti-Pattern Registry)

If you see these, remove them. Do not build them.

## UI & Interaction
- **Fake tabs or chips:** Elements that look tappable but do nothing.
- **Decorative controls:** Toggles or checkboxes with no behavior.
- **"Works on this screen only" logic:** Hardcoding a generic layout pattern (like a nav bar) into a single page instead of using the shared layout.

## State & Data Truth
- **Stale state pretending to be live:** Showing cached data older than TTL without labeling it.
- **Fallback data labeled healthy:** Showing a green checkmark when the system is actually using synthetic fallback data.
- **Silent catch blocks:** Empty `catch(e){}` blocks that swallow errors and result in a blank or "stuck" UI.

## Architecture
- **Duplicated shared components:** Copying `SearchBar.tsx` to `SearchBar2.tsx` instead of extending the original.
- **Detached telemetry:** Modifying a core conversion UI without hooking it into the canonical analytics events.
- **UI-only fixes that ignore truth:** Fixing how a button looks but ignoring that it points to a deprecated state path.
- **Monolithic god-files:** Files > 500 lines mixing UI, state, API calls, and telemetry.
- **Broad refactors without ownership mapping:** Touching 20 files without reading the source-of-truth map.

## Rhetoric
- **Copy freestyling outside doctrine:** Ignoring `/docs/doctrine/kandydrops-vocabulary-index.md` to use "Oops" or "Tokens".
