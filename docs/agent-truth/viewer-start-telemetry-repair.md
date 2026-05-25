# Viewer Start Telemetry Repair

Viewer start telemetry is emitted from the server watch-session route only after entitlement has been checked and the first watch-session sequence is accepted.

The event does not fire for skeletons, locked previews, unauthorized content, or repeated flushes. Telemetry failure is caught and does not block the viewer.
