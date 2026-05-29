import fs from "node:fs";

export function runValidation() {
  const failures: string[] = [];
  const artifactPath = "agent/state/identity-artifact-current-head-sanity.generated.json";

  if (!fs.existsSync(artifactPath)) {
    failures.push(`${artifactPath} is missing.`);
  } else {
    try {
      const data = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      
      if (data.totalMismatchCount !== 3) failures.push(`Expected totalMismatchCount 3, got ${data.totalMismatchCount}`);
      if (data.activeMismatchCount !== 0) failures.push(`Expected activeMismatchCount 0, got ${data.activeMismatchCount}`);
      if (data.classifiedNonBlockingCount !== 3) failures.push(`Expected classifiedNonBlockingCount 3, got ${data.classifiedNonBlockingCount}`);
      if (data.expectedNoUserMappingCount !== 3) failures.push(`Expected expectedNoUserMappingCount 3, got ${data.expectedNoUserMappingCount}`);
      if (data.scoreDragCount !== 0) failures.push(`Expected scoreDragCount 0, got ${data.scoreDragCount}`);
      if (data.individualMetricHydrationStatus !== "classified") failures.push(`Expected individualMetricHydrationStatus 'classified', got '${data.individualMetricHydrationStatus}'`);
      
      if (!data.releaseNotePolicy?.truncationCompliant || !data.releaseNotePolicy?.sameCommitOnly) {
        failures.push(`Release note policy not compliant.`);
      }
    } catch (e: any) {
      failures.push(`Failed to parse ${artifactPath}: ${e.message}`);
    }
  }

  if (failures.length > 0) {
    console.error("Identity Artifact Sanity Validation Failed:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("Identity Artifact Sanity OK.");
}

if (require.main === module) {
  runValidation();
}
