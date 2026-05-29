# Antigravity Agent Self-Knowledge Audit

This document captures the onboarding self-knowledge audit for Antigravity 2.0. It tracks known facts, unknowns, no-touch domains, and critical safety rules.

## Self-Knowledge Summary

### Deployed / Runtime Truth
- **Latest Deployed Commit**: `cfd39b4 fix(creator): repair drop approvals`
- **Latest Beta Health Score**: `76.61` (overall score)
- **Beta Exit Readiness**: `false` (currently blocked)
- **Open PRs**: 6 open pull requests (`#305`, `#306`, `#307`, `#308`, `#309`, `#310`)
- **Dirty Files**: 18 modified files, 31 untracked files

### Current Blocked Gates
1. **Runtime/provider smoke**: Deployed runtime behavior unverified. Deployed route smoke/PayPal Refill tests need operator confirmation.
2. **Admin truth/sample evidence**: Production admin truth sample is missing.
3. **Report freshness and PR integrity**: Stale evidence. 8 generated reports are head-mismatched or older than the 24-hour freshness window.
4. **Debug/runtime evidence**: Debug evidence is source confidence only.
5. **Evidence bridge**: Bridged as partial confidence; cannot clear formal provider/runtime smoke.
6. **Cost review / external billing review**: Cloud Run/App Hosting, Cloud SQL/Data Connect, Gemini/Vertex AI, route 4xx cost lanes need manual billing review.
7. **Visual-only operator QA**: Final visual checks for layout/scaling on mobile/desktop surfaces.

### No-Touch Domains (Strictly Blocked)
- **PayPal & Wallet Runtime**: Do not touch PayPal SDK integration, checkout button rendering stack, or payment callbacks.
- **GumDrop Math & Pricing**: No changes to prices, package bonus formulas, or source-of-funds validation.
- **Monetization & Revenue Ledger**: Creator revenue math, subscription lifecycle contracts, and transactional outlays are forbidden.
- **Top / Bottom Shell Navigation**: Structure governed strictly by Apple Safe Areas and Google breakpoints.
- **Production Mutations**: Do not deploy, mutate production databases, or approve creator drops in production.

---

## Top 10 Repository Memory Rules
1. **Inspect Identity Chain**: When user analytics fail, inspect the guest ID, session ID, event envelope, auth state, identity link, signed-in user, linked person, metric hydration, and panel.
2. **Every Event Declared**: Every event must declare whether it counts globally, for guest, for user, for person, for creator role, or not at all.
3. **Continuous Handoff**: Guest-to-user handoff must preserve journey continuity without double-counting.
4. **Non-Zero Missing Data**: Missing individual user data is represented as collecting, source_missing, or bridge_missing—never zero.
5. **Doctrine Hierarchy Fast Path**: Use compact context first (doctrine-registry.json) rather than scanning large markdown files.
6. **Server Truth Supremacy**: Server truth outranks all UI doctrine for transactions, security, permissions, entitlements, and revenue.
7. **No Silent UI States**: Silent success, silent failure, and hidden pending states are product bugs. Expose explicit creator and admin statuses.
8. **Surface Doctrine split**: Route components to distinct User UI, Creator UI, Admin UI, Server Truth, and Brand Primitive surfaces.
9. **Mocks are Not Proof**: Mocks and unit tests must not satisfy formal runtime/provider/admin evidence gates.
10. **Module Size Limits**: Keep UI/View files < 300 lines and Orchestration pages < 500 lines limit.

---

## Top 10 Known Pitfalls
1. **pitfall__identity_tracking_handoff_truth**: Global analytics look healthy while individual user/guest metrics fail.
2. **pitfall__creator_drop_workflow_chain_fix**: Fixing only the visible button instead of form validation, route permissions, stored status, admin queue, telemetry, debug, and 4xx.
3. **pitfall__privacy_data_lifecycle_drift**: Analytics/telemetry code drifting into custom redaction patterns.
4. **pitfall__stale_lockfile_drift**: Manifest changes drifting from tracked lockfiles.
5. **pitfall__diagnostics_serialization_crash**: Logging path crashes if stringify is handled unsafely.
6. **pitfall__request_json_parse_falls_into_500**: Malformed request bodies crashing POST routes before validation.
7. **pitfall__consumed_response_stream_fallback**: Reading `response.json()` before `response.text()` consuming the stream.
8. **pitfall__generated_artifact_cleanup_miss**: Leaving build, audit, or emulator outputs in the git tree.
9. **pitfall__sidecar_truth_confusion**: Fallback RTDB or Data Connect treated as canonical serving truth.
10. **pitfall__route_runtime_stale_vs_unseen_confusion**: Collapsing stale route samples and never-observed route samples together.
