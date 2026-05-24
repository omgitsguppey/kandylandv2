# Monolith Split Plan

Generated source-only artifact. No production reads, provider calls, deployed runtime calls, payment runtime changes, or GumDrop math changes were performed.

```json
{
  "generatedAtUtc": "2026-05-24T19:37:49.838Z",
  "currentHead": "afdc394d07b0dd0ea93aae14ae32bc47886165d9",
  "adminDebugMonolithStatus": "monolith_split_plan_required",
  "adminAnalyticsMonolithStatus": "monolith_split_plan_required",
  "unsafeBroadRefactorPerformed": false,
  "addedEvidenceLaneToDebugRoute": false,
  "namedFutureDrilldownBoundary": true,
  "adminAnalyticsTabSplitPlanPresent": true,
  "splitPlans": [
    {
      "filePath": "src/app/api/admin/debug/route.ts",
      "currentLineCount": 6792,
      "owner": "admin-debug",
      "status": "monolith_split_plan_required",
      "splitRecommendation": "Split the all-section branch into section-specific drilldown loaders after UI callers support section-specific requests.",
      "nextAction": "Extract named drilldown loaders for the highest-churn debug sections before adding more evidence lanes."
    },
    {
      "filePath": "src/app/admin/analytics/hooks/useAdminAnalyticsState.tsx",
      "currentLineCount": 3206,
      "owner": "admin-analytics",
      "status": "monolith_split_plan_required",
      "splitRecommendation": "Move metric fetch, freshness derivation, and tab-specific state into named admin analytics hooks.",
      "nextAction": "Split state by tab the next time a metric source or consumer changes in admin analytics."
    }
  ]
}
```
