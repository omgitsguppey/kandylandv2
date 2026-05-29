import { fileExists, readJsonFile } from "./shared";

export function runValidation() {
  const failures: string[] = [];
  const reportPath = "agent/state/identity-inflight-recovery-lock.generated.json";

  if (!fileExists(reportPath)) {
    failures.push(`${reportPath} is missing.`);
  } else {
    try {
      const data = readJsonFile<any>(reportPath);

      if (data.identityLaneStatus !== "completed_and_locked") {
        failures.push("Validation fail: identityLaneStatus must be 'completed_and_locked'.");
      }

      if (data.remainingUntrackedIdentityFiles.length > 0) {
        failures.push("Validation fail: remainingUntrackedIdentityFiles must be empty.");
      }

      // Check package.json scripts
      const packageJson = readJsonFile<any>("package.json");
      const scripts = packageJson.scripts ?? {};
      const requiredScripts = data.packageScriptsAdded ?? [];

      for (const script of requiredScripts) {
        if (!scripts[script]) {
          failures.push(`Validation fail: package.json is missing required script '${script}'.`);
        }
      }

    } catch (e: any) {
      failures.push(`Failed to parse ${reportPath}: ${e.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("Identity Inflight Recovery Lock Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Identity Inflight Recovery Lock OK.");
}

if (require.main === module) {
  runValidation();
}
