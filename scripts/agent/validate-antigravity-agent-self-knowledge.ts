import { fileExists, readJsonFile, readText, writeJsonFile, writeTextFile } from "./shared";

export function runValidation() {
  const failures: string[] = [];

  // 1. Verify AGENTS.md and REPO_MEMORY_LEDGER.md are read
  if (!fileExists("AGENTS.md")) {
    failures.push("AGENTS.md is missing from the repository.");
  } else {
    const agentsContent = readText("AGENTS.md");
    if (!agentsContent.includes("Identity Tracking And Handoff Truth")) {
      failures.push("AGENTS.md does not contain expected Identity Tracking doctrine.");
    }
  }

  if (!fileExists("REPO_MEMORY_LEDGER.md")) {
    failures.push("REPO_MEMORY_LEDGER.md is missing from the repository.");
  } else {
    const ledgerContent = readText("REPO_MEMORY_LEDGER.md");
    if (!ledgerContent.includes("Identity tracking and handoff truth memory")) {
      failures.push("REPO_MEMORY_LEDGER.md does not contain expected Memory Ledger entries.");
    }
  }

  // 2. Validate JSON schema
  const reportPath = "agent/state/antigravity-agent-self-knowledge.generated.json";
  if (!fileExists(reportPath)) {
    failures.push(`${reportPath} is missing.`);
  } else {
    try {
      const data = readJsonFile<any>(reportPath);
      
      if (!data.generatedAtUtc) failures.push("Schema fail: generatedAtUtc is missing.");
      if (!data.currentHead || data.currentHead !== "cfd39b411b08374c8a698bb07bb42f473ebba278") {
        failures.push("Schema fail: currentHead must be cfd39b411b08374c8a698bb07bb42f473ebba278");
      }
      if (!data.noTouchDomains || data.noTouchDomains.length === 0) {
        failures.push("Schema fail: noTouchDomains must be present and non-empty.");
      }
      if (data.latestScore === undefined) {
        failures.push("Schema fail: latestScore must be defined.");
      }
      if (data.betaExitReady === undefined) {
        failures.push("Schema fail: betaExitReady must be defined.");
      }
      if (!data.unknowns || data.unknowns.length === 0) {
        failures.push("Schema fail: unknowns must be listed.");
      }
      if (!data.unsafeActionsBlocked || data.unsafeActionsBlocked.length === 0) {
        failures.push("Schema fail: unsafeActionsBlocked must be listed.");
      }
      if (!data.openPrStatus || typeof data.openPrStatus.count !== "number") {
        failures.push("Schema fail: openPrStatus count is missing or invalid.");
      }
      if (!data.dirtyFileStatus || typeof data.dirtyFileStatus.modifiedCount !== "number") {
        failures.push("Schema fail: dirtyFileStatus is missing or invalid.");
      }
    } catch (e: any) {
      failures.push(`Failed to parse ${reportPath}: ${e.message}`);
    }
  }

  // 3. Process outcomes
  if (failures.length > 0) {
    console.error("Antigravity Self-Knowledge Audit Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Antigravity Self-Knowledge Audit OK.");
}

if (require.main === module) {
  runValidation();
}
