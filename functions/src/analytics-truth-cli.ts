import {initializeApp, applicationDefault, getApps} from "firebase-admin/app"

import {rebuildAnalyticsTruthLayers} from "./analytics-truth-runtime.js"

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
  })
}

async function main() {
  console.log(JSON.stringify({
    truthClass: "canonical_fact_materializer_only",
    analyticsEvidenceOnly: true,
    schemaValidationRequired: true,
    importWritesLegacySnapshotsForbidden: true,
    canonicalFactInputs: ["analytics_event_facts", "analytics_metric_facts", "analytics_watch_sessions", "analytics_watch_assets", "analytics_watch_observations"],
    canonicalFactOutputs: ["analytics_truth_*", "canonical materializer envelopes"],
    forbiddenRuntimeMutationSurfaces: [
      "runtime_balances",
      "runtime_unlocks",
      "runtime_purchases",
      "runtime_user_rollups",
      "legacy_admin_metric_snapshots",
    ],
    blockedInputs: [
      "raw_client_event_names",
      "legacy_page_duration_as_verified_watch_truth",
    ],
  }))
  await rebuildAnalyticsTruthLayers()
  console.log("Analytics truth layers rebuilt.")
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
