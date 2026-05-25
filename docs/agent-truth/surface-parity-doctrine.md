# Surface Parity Doctrine

Status: `pass`  
Artifact: `agent/state/surface-parity-doctrine.generated.json`  
Validator: `npm run check:surface-parity-doctrine`  
Production reads performed: `false`  
Provider calls performed: `false`

## Doctrine

This is the canonical surface parity doctrine for public, user, creator, and admin surfaces. It maps each major surface to role visibility, required layout states, data source, backend route or action, telemetry event coverage, debug visibility, score impact, mobile density status, and old-logic status.

Required states: `loading`, `empty`, `ready`, `degraded`, `error`, `permission_denied`, `not_configured`

## Major Surfaces

| Surface | Owner | Canonical route | Feature | Roles | Debug lane | Score dimensions |
| --- | --- | --- | --- | --- | --- | --- |
| public_homepage | user-ui | / | drops | guest:visible, user:visible, creator:visible, admin:visible | feature registration gate / drops behavior | sourceHealth, runtimeHealth, evidenceCompleteness |
| auth | identity | /__auth | auth_identity | guest:visible, user:redirect, creator:redirect, admin:redirect | identity analytics / auth runtime telemetry | runtimeHealth, evidenceCompleteness |
| user_dashboard | user-dashboard | /dashboard | user_dashboard | guest:redirect, user:visible, creator:visible, admin:visible | user dashboard analytics / feature registration gate | sourceHealth, evidenceCompleteness |
| wallet_purchase_modal | wallet | /dashboard?wallet=1 | wallet | guest:redirect, user:visible, creator:visible, admin:visible | commerce parity / wallet analytics | runtimeHealth, evidenceCompleteness, costRisk |
| drops_library | drops-library | /drops | library | guest:readonly, user:visible, creator:visible, admin:visible | drops and library behavior evidence | evidenceCompleteness |
| creator_dashboard | creator-dashboard | /creator | creator_dashboard | guest:redirect, user:redirect, creator:visible, admin:visible | creator lane debug parity | sourceHealth, evidenceCompleteness |
| creator_settings | creator-settings | /dashboard/creator/settings | creator_settings | guest:redirect, user:redirect, creator:visible, admin:visible | settings connection parity | sourceHealth, evidenceCompleteness |
| creator_drop_manager | creator-drops | /dashboard/creator/drops | creator_drop_manager | guest:redirect, user:redirect, creator:visible, admin:visible | creator drop status metrics | sourceHealth, evidenceCompleteness |
| creator_profile_timeline | creator-profile | /creators/[username] | creator_profile | guest:readonly, user:visible, creator:visible, admin:visible | creator profile mobile timeline | sourceHealth, evidenceCompleteness |
| chat | chat | /dashboard/chat | chat_system_internal | guest:redirect, user:visible, creator:visible, admin:hidden | chat telemetry admin truth / chat realtime cost control | runtimeHealth, evidenceCompleteness, costRisk |
| daily_tasks_checkin | retention | /experiences | daily_checkin | guest:redirect, user:visible, creator:visible, admin:visible | daily task lifecycle telemetry | evidenceCompleteness |
| notifications_pwa_prompt | notifications | native:notification-prompt | notifications | guest:readonly, user:visible, creator:visible, admin:visible | notification PWA score lock | runtimeHealth, evidenceCompleteness |
| account_settings | settings | /settings | user_dashboard | guest:redirect, user:visible, creator:visible, admin:visible | settings connection parity / privacy behavior | sourceHealth, evidenceCompleteness |
| admin_dashboard | admin | /admin | admin_debug | guest:redirect, user:redirect, creator:redirect, admin:visible | admin hot-cache heartbeat / admin debug | sourceHealth, runtimeHealth, evidenceCompleteness, freshness |
| admin_debug | admin-debug | /admin/debug | admin_debug | guest:redirect, user:redirect, creator:redirect, admin:visible | admin debug control tower | sourceHealth, runtimeHealth, evidenceCompleteness, freshness |
| user_management | admin-users | /admin/users | admin_debug | guest:redirect, user:redirect, creator:redirect, admin:visible | user management status truth | sourceHealth, runtimeHealth, evidenceCompleteness, freshness |
| support_policies | support-policy | /dashboard/support | support | guest:readonly, user:visible, creator:visible, admin:visible | support route recovery / support policy cleanup | runtimeHealth, evidenceCompleteness |

## Validator Authority

The registry is the cross-role surface state authority. Existing feature, telemetry, settings, chat, wallet, and creator validators remain active as surface-specific evidence and must not be duplicated here.

| Validator | Status | Authority | Reason |
| --- | --- | --- | --- |
| check:user-creator-ui-parity | supporting_evidence | surface_parity_doctrine | User/creator parity remains useful source evidence, but cross-role surface parity authority now lives in the canonical surface registry. |
| check:user-creator-feature-parity | supporting_evidence | surface_parity_doctrine | Feature parity stays scoped to user and creator feature coverage; it no longer defines the full public/user/creator/admin surface state contract. |
| legacy:admin-parity | superseded_removed | surface_parity_doctrine | The legacy admin parity script is compatibility-only and cannot outrank the surface parity doctrine registry. |

Active supporting validators:

- `check:feature-registration-gate`
- `check:targeted-behavior-evidence`
- `check:user-creator-ui-parity`
- `check:settings-connection-parity`
- `check:creator-lane-debug-parity`
- `check:telemetry-parity-score`

## Dirty File Classification

| Path | Classification |
| --- | --- |
| CHANGELOG.md | release_artifact_expected |
| agent/state/feature-registration-gate.generated.json | current_generated_artifact_to_commit |
| agent/state/public-beta-score.generated.json | current_generated_artifact_to_commit |
| agent/state/targeted-behavior-evidence.generated.json | stale_generated_artifact_to_regenerate |
| docs/agent-truth/targeted-behavior-evidence.md | in_flight_artifact_to_leave_alone |
| package.json | real_source_change_needs_review |
| public/kandydrops-release-notes.json | release_artifact_expected |
| src/lib/release-notes/public-release-notes.ts | release_artifact_expected |
| src/lib/release-notes/release-version-contract.ts | release_artifact_expected |
| agent/state/surface-parity-doctrine.generated.json | current_generated_artifact_to_commit |
| docs/agent-truth/surface-parity-doctrine.md | documentation_artifact_expected |
| scripts/agent/validate-surface-parity-doctrine.ts | validator_artifact_expected |
| src/lib/parity/surface-parity-contract.ts | real_source_change_needs_review |
| src/lib/parity/surface-parity-registry.ts | real_source_change_needs_review |
| tests/unit/surface-parity-doctrine.spec.ts | test_artifact_expected |

## Validation

- No validation failures.
