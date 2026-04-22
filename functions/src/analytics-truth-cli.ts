import {initializeApp, applicationDefault, getApps} from "firebase-admin/app"

import {rebuildAnalyticsTruthLayers} from "./analytics-truth-runtime.js"

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
  })
}

async function main() {
  await rebuildAnalyticsTruthLayers()
  console.log("Analytics truth layers rebuilt.")
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
