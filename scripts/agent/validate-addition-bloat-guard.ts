import { fileExists, readJsonFile } from "./shared";
import { validateBloatGuard } from "../../src/lib/agent-governance/addition-bloat-guard";

export function runValidation() {
  const reportPath = "agent/state/addition-bloat-guard.generated.json";
  const failures: string[] = [];

  if (!fileExists(reportPath)) {
    failures.push(`${reportPath} is missing.`);
  } else {
    try {
      const data = readJsonFile<any>(reportPath);
      const errors = validateBloatGuard(data);
      failures.push(...errors);
    } catch (e: any) {
      failures.push(`Failed to parse ${reportPath}: ${e.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("Addition Bloat Guard Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Addition Bloat Guard OK.");
}

if (require.main === module) {
  runValidation();
}
