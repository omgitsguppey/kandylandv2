import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
  });
}

async function main() {
  const { rebuildAnalyticsTruthLayers } = await import("../functions/src/analytics-truth-runtime.js");
  await rebuildAnalyticsTruthLayers();
  console.log("Analytics truth layers rebuilt.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
