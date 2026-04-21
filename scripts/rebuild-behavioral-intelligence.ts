import {rebuildBehavioralIntelligenceSnapshots} from "../functions/src/behavioral-intelligence-runtime.js"

async function main() {
  const summary = await rebuildBehavioralIntelligenceSnapshots()
  console.log(JSON.stringify(summary, null, 2))
}

void main().catch((error) => {
  console.error("[behavioral-intelligence] rebuild failed", error)
  process.exitCode = 1
})
