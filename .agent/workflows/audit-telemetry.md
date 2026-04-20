# Telemetry, Analytics & A/B Prep Hardening

**Goal:** Ensure all user metrics, telemetry fires, and session tracking paths represent ground truth. No UI should ever claim "successfully tracked" if capture failed. Prepare safe boundaries for A/B testing without polluting core metrics.

## Checklist

### 1. Parity & Capture Hardening
- [ ] Ensure all raw events map to canonical rollups with a strict canonical naming schematic.
- [ ] Enforce retry/queue logic for transient analytics pipeline failures.
- [ ] Ensure offline-safe storage or delayed-send strategies apply where user paths typically shift in connection (e.g., mobile drops).
- [ ] Implement deduplication thresholds to prevent event spam (spam from double-clicks on CTAs or excessive scroll logs).
- [ ] Fix timestamps to ensure UTC consistency and ownership tracing.
- [ ] Add explicit checks: UI success states MUST wait for tracking pipeline ack unless designed as optimistic with persistent retries.

### 2. Events to Audit
Ensure precise, consistent firing for:
- Track: Route navigation, session/dwell time.
- Track: Drop watch metrics (time, views, unique, unwrap conversions).
- Track: Commerce pipeline (Wallet opens, checkout starts, purchase completion).
- Track: Creator metrics (Profile visits, follower states, experience tab actions, message sends).
- Track: Navigation/Engagement (Notifications opened, search usage, filtering usage, settings toggles, privacy toggles).
- Track: Safety / Meta (Feedback submission, refund requests, support opens).

### 3. A/B Testing Readiness
- [ ] Normalize feature flag configurations (do not build testing UI, prepare the code).
- [ ] Strip out hardcoded branching inside UI modules; replace with centralized strategy adapters / configuration contexts.
- [ ] Ensure all telemetry events dynamically swallow "active cohort/experiment IDs" along with their default payload.
- [ ] Document strict boundaries: Keep A/B testing confined to safe areas (copy, CTA placement, hero ordering) and explicitly block tests from running on core booking verification, auth, or transactional payment hooks.
