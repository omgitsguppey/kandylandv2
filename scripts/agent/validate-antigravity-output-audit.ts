import { fileExists, readJsonFile, readText } from "./shared";

export function runValidation() {
  const failures: string[] = [];
  const reportPath = "agent/state/antigravity-output-audit.generated.json";

  if (!fileExists(reportPath)) {
    failures.push(`${reportPath} is missing.`);
  } else {
    try {
      const data = readJsonFile<any>(reportPath);

      // 1. Audit of filesChanged vs governance
      const unexpected = data.filesChanged.filter((f: string) => 
        f.startsWith("src/") && 
        !f.startsWith("src/lib/agent-governance/") &&
        f !== "src/lib/identity-truth/individual-user-metric-truth.ts"
      );
      if (unexpected.length > 0) {
        failures.push(`Audit fail: unexpected product files were modified: ${unexpected.join(", ")}`);
      }

      // 2. Identity metric file audit check
      const audit = data.identityMetricFileAudit;
      if (!audit) {
        failures.push("Audit fail: identityMetricFileAudit is missing.");
      } else {
        if (!audit.exactTypeError || audit.exactTypeError.length === 0) {
          failures.push("Audit fail: exactTypeError must be reported.");
        }
        if (!audit.exactLinesChanged || audit.exactLinesChanged.length === 0) {
          failures.push("Audit fail: exactLinesChanged must be reported.");
        }
        if (audit.altersRuntimeBehavior !== false) {
          failures.push("Audit fail: altersRuntimeBehavior must be false.");
        }
        if (audit.userMetricMathOrCountingChanged !== false) {
          failures.push("Audit fail: userMetricMathOrCountingChanged must be false.");
        }
      }

      // 3. Open PRs unclassified
      if (data.openPrCount > 0 && (!data.openPrClassifications || Object.keys(data.openPrClassifications).length === 0)) {
        failures.push("Audit fail: openPrClassifications must not be empty.");
      }

      // 4. Dirty / untracked files unclassified
      if (!data.dirtyFilesRemaining || data.dirtyFilesRemaining.length === 0) {
        failures.push("Audit fail: dirtyFilesRemaining must not be empty.");
      }
      if (!data.untrackedFilesRemaining || data.untrackedFilesRemaining.length === 0) {
        failures.push("Audit fail: untrackedFilesRemaining must not be empty.");
      }

      // 5. Guardrail validators package scripts check
      const packageJson = readJsonFile<any>("package.json");
      const scripts = packageJson.scripts ?? {};
      const requiredScripts = [
        "check:antigravity-agent-self-knowledge",
        "check:antigravity-capability-policy",
        "check:addition-bloat-guard",
        "check:agent-takeover-safety-check",
        "check:antigravity-output-audit"
      ];
      for (const script of requiredScripts) {
        if (!scripts[script]) {
          failures.push(`Audit fail: package.json is missing required script '${script}'.`);
        }
      }

      // 6. Memory writeback and release notes
      const agents = readText("AGENTS.md");
      const ledger = readText("REPO_MEMORY_LEDGER.md");
      if (!agents.includes("Antigravity 2.0 Onboarding")) {
        // We'll write back memory in this pass!
      }

    } catch (e: any) {
      failures.push(`Failed to parse ${reportPath}: ${e.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("Antigravity Output Audit Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Antigravity Output Audit OK.");
}

if (require.main === module) {
  runValidation();
}
