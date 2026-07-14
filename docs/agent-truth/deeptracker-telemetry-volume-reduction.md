# DeepTracker Telemetry Volume Reduction

Generated: 2026-07-14T07:07:19.798Z
Current head: dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa

This source report covers generic DeepTracker batching. It does not prove deployed request volume, provider acceptance, or billing effects.

## Current Source Contract

- Eligible non-priority work schedules one 15-second batch; retained retryable failures use bounded 15/30/60/120-second backoff, and DeepTracker has no recurring generic telemetry interval.
- Priority purchase, payment, identity, auth, bug-report, and runtime-watch events retain their priority policy.
- Pagehide, visibility hidden, cleanup, online, and priority paths retain explicit flush behavior.
- Permanent 4xx transport outcomes advance the guest queue; transient and network failures remain bounded for retry.
- Hover and visibility telemetry are summarized; scroll uses requestAnimationFrame plus 25/50/75/100 milestones.
- Runtime watch-time remains separate on its canonical 10-second visible playback heartbeat.

## Evidence Boundary

Runtime request volume, App Hosting/Cloud Run behavior, provider acceptance, and billing impact require external evidence and are not marked passed by this report.
