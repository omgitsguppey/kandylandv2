# Orphaned Logic Refresh

Generated: 2026-07-14T07:19:06.296Z

```json
{
  "generatedAtUtc": "2026-07-14T07:19:06.296Z",
  "currentHead": "dc4dad82c4ee6f08f8570c9efb2b9ba61fafafaa",
  "ageBefore": 301.2,
  "ageAfter": 0,
  "statusBefore": "stale_orphaned_logic_artifact_to_refresh",
  "statusAfter": "refreshed_current",
  "sourceHeadMatchesCurrent": true,
  "findings": [
    {
      "id": "orphaned-logic-6iyd6h",
      "category": "duplicate_normalizer",
      "filePath": "src/lib/test-hardening/test-hardening-shared.ts",
      "owner": "src/lib/test-hardening/test-hardening-shared.ts",
      "nextAction": "Pick one canonical normalizePath owner and convert other exports to adapters or delete after tests prove no route depends on them."
    },
    {
      "id": "orphaned-logic-jqbu87",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/analytics/historical/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-3oj49f",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/analytics/realtime/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-qf273x",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/analytics/refresh/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1jien8z",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/content/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1n5ugjo",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/creator-account-controls/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-7epkfj",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/creator-fan-experience-settings/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1obwi3b",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/debug/assistant/fix/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-e7xhhe",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/debug/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-boxsml",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/roster/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-xzmxcj",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/user/[userId]/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1gsv4g6",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/admin/users/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1l5i1y0",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/analytics/ingest-identified/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-14c31z1",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/analytics/ingest/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-xgyvot",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/bug-reports/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-odlvty",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/checkin/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1c24jrt",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/creator/bookings/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-n5bg3g",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/creator/onboarding/application/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-fg3dsp",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/creator/onboarding/contract-signature/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-2qsmw4",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/creator/onboarding/id-submission/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-4amxsl",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/creator/onboarding/intro/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-11mul3v",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/creator/relationships/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-be4hde",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/creator/requests/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-533b84",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/creator/subscriptions/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1oswdz4",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/cron/process-creator-subscriptions/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-kepdee",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/notifications/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1wx3fr9",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/user/complete-onboarding/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1unz6sk",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/user/data/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1aghquh",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/user/delete/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1bi56pg",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/user/onboarding-progress/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1be93h8",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/user/register/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1moy1ru",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/viewer/watch-session/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1el2ylm",
      "category": "stale_generated_report_consumed",
      "filePath": "src/app/api/admin/debug/route.ts",
      "owner": "agent/state generated artifact owner; runtime code must not consume generated reports",
      "nextAction": "Remove runtime dependency on generated agent snapshots; use verified runtime source/config instead."
    },
    {
      "id": "orphaned-logic-15vn8ue",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/drops/unlock/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-1xj6ooa",
      "category": "route_inline_business_logic",
      "filePath": "src/app/api/paypal/capture/route.ts",
      "owner": "src/lib/server/",
      "nextAction": "Extract or route business math/persistence through the canonical server service owner during a targeted slice."
    },
    {
      "id": "orphaned-logic-po7pou",
      "category": "stale_generated_report_consumed",
      "filePath": "src/app/admin/debug/components/DebugControlTower.tsx",
      "owner": "agent/state generated artifact owner; runtime code must not consume generated reports",
      "nextAction": "Remove runtime dependency on generated agent snapshots; use verified runtime source/config instead."
    },
    {
      "id": "orphaned-logic-103y721",
      "category": "stale_generated_report_consumed",
      "filePath": "src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx",
      "owner": "agent/state generated artifact owner; runtime code must not consume generated reports",
      "nextAction": "Remove runtime dependency on generated agent snapshots; use verified runtime source/config instead."
    },
    {
      "id": "orphaned-logic-1403vqs",
      "category": "stale_generated_report_consumed",
      "filePath": "src/lib/admin-debug-control-tower.ts",
      "owner": "agent/state generated artifact owner; runtime code must not consume generated reports",
      "nextAction": "Remove runtime dependency on generated agent snapshots; use verified runtime source/config instead."
    },
    {
      "id": "orphaned-logic-p2ofwb",
      "category": "stale_generated_report_consumed",
      "filePath": "src/lib/admin/user-management-contract.ts",
      "owner": "agent/state generated artifact owner; runtime code must not consume generated reports",
      "nextAction": "Remove runtime dependency on generated agent snapshots; use verified runtime source/config instead."
    },
    {
      "id": "orphaned-logic-xu6rgn",
      "category": "stale_generated_report_consumed",
      "filePath": "src/lib/agent-audit/affected-surface-router.ts",
      "owner": "agent/state generated artifact owner; runtime code must not consume generated reports",
      "nextAction": "Remove runtime dependency on generated agent snapshots; use verified runtime source/config instead."
    }
  ],
  "missingScriptTreatedAsPass": false
}
```
