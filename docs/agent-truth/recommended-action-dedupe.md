# Recommended Action Dedupe

Generated: 2026-05-24T19:58:01.140Z

```json
{
  "generatedAtUtc": "2026-05-24T19:58:01.140Z",
  "currentHead": "93000a572a2968f72f0e3f3f400ee9a82acc78c9",
  "status": "duplicate_action_collapsed",
  "recommendedActionsBefore": 18,
  "recommendedActionsAfter": 9,
  "duplicateActionsCollapsed": 9,
  "collapsedActionIds": [
    "self_healing_queue_stale_copy",
    "speed_security_stale_copy",
    "admin_balance_body_cap_copy",
    "creator_account_controls_body_cap_copy",
    "creator_account_controls_typed_errors_copy",
    "creator_agreements_typed_errors_copy",
    "codebase_hardening_stale_copy",
    "viewer_entitlement_copy",
    "ai_budget_guard_copy"
  ],
  "unresolvedSecurityActions": [
    "admin_balance_body_cap",
    "creator_account_controls_body_cap",
    "creator_account_controls_typed_errors",
    "creator_agreements_typed_errors",
    "viewer_entitlement",
    "ai_budget_guard"
  ],
  "staleArtifactGroups": [
    "self_healing_queue",
    "speed_security",
    "hardening"
  ],
  "visibleActions": [
    {
      "id": "self_healing_queue_stale",
      "title": "self healing queue stale",
      "owner": "beta",
      "sourceFile": "agent/state/self-healing-refresh-queue.generated.json",
      "findingKind": "stale_artifact",
      "rootCause": "self_healing_queue",
      "refreshCommand": "npm run check:self-healing-refresh-queue",
      "severity": "moderate",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "alsoAffects": [
        "self_healing_queue_stale_copy"
      ]
    },
    {
      "id": "speed_security_stale",
      "title": "speed security stale",
      "owner": "security",
      "sourceFile": "agent/state/speed-security-hardening.generated.json",
      "findingKind": "stale_artifact",
      "rootCause": "speed_security",
      "refreshCommand": "npm run check:speed-security",
      "severity": "major",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "alsoAffects": [
        "speed_security_stale_copy"
      ]
    },
    {
      "id": "admin_balance_body_cap",
      "title": "admin balance body cap",
      "owner": "security",
      "sourceFile": "src/app/api/admin/balance/route.ts",
      "findingKind": "request_body_cap",
      "rootCause": "admin_balance_body_cap",
      "refreshCommand": "npm run check:speed-security",
      "severity": "major",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch9-cleanup.generated.json",
      "alsoAffects": [
        "admin_balance_body_cap_copy"
      ]
    },
    {
      "id": "creator_account_controls_body_cap",
      "title": "creator account controls body cap",
      "owner": "security",
      "sourceFile": "src/app/api/admin/creator-account-controls/route.ts",
      "findingKind": "request_body_cap",
      "rootCause": "creator_controls_body_cap",
      "refreshCommand": "npm run check:speed-security",
      "severity": "major",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "alsoAffects": [
        "creator_account_controls_body_cap_copy"
      ]
    },
    {
      "id": "creator_account_controls_typed_errors",
      "title": "creator account controls typed errors",
      "owner": "security",
      "sourceFile": "src/app/api/admin/creator-account-controls/route.ts",
      "findingKind": "typed_safe_errors",
      "rootCause": "creator_controls_typed_errors",
      "refreshCommand": "npm run check:speed-security",
      "severity": "major",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "alsoAffects": [
        "creator_account_controls_typed_errors_copy"
      ]
    },
    {
      "id": "creator_agreements_typed_errors",
      "title": "creator agreements typed errors",
      "owner": "security",
      "sourceFile": "src/app/api/admin/creator-agreements/route.ts",
      "findingKind": "typed_safe_errors",
      "rootCause": "creator_agreements_typed_errors",
      "refreshCommand": "npm run check:speed-security",
      "severity": "major",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "alsoAffects": [
        "creator_agreements_typed_errors_copy"
      ]
    },
    {
      "id": "codebase_hardening_stale",
      "title": "codebase hardening stale",
      "owner": "security",
      "sourceFile": "agent/state/codebase-hardening.generated.json",
      "findingKind": "stale_artifact",
      "rootCause": "hardening",
      "refreshCommand": "npm run check:hardening",
      "severity": "moderate",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "alsoAffects": [
        "codebase_hardening_stale_copy"
      ]
    },
    {
      "id": "viewer_entitlement",
      "title": "viewer entitlement",
      "owner": "viewer",
      "sourceFile": "src/app/dashboard/viewer/page.tsx",
      "findingKind": "entitlement_evidence",
      "rootCause": "viewer_entitlement",
      "refreshCommand": "npm run check:viewer-entitlement-hardening",
      "severity": "major",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "alsoAffects": [
        "viewer_entitlement_copy"
      ]
    },
    {
      "id": "ai_budget_guard",
      "title": "ai budget guard",
      "owner": "admin-ai",
      "sourceFile": "src/lib/server/ai-debug-assistant.ts",
      "findingKind": "ai_budget_guard",
      "rootCause": "ai_budget_guard",
      "refreshCommand": "npm run check:ai-debug-budget-guard",
      "severity": "major",
      "resolved": false,
      "batchArtifact": "agent/state/debug-cockpit-batch10-cleanup.generated.json",
      "alsoAffects": [
        "ai_budget_guard_copy"
      ]
    }
  ]
}
```
