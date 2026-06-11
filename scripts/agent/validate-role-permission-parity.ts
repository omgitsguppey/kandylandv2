import fs from "node:fs";
import path from "node:path";

import {
  ROLE_PERMISSION_REGISTRY,
  buildRolePermissionParityReport,
} from "@/lib/parity/role-permission-resolver";
import { listWorkingTreeFiles, readRepoToolchainState } from "./shared";

const STATE_PATH = "agent/state/role-permission-parity.generated.json";
const DOC_PATH = "docs/agent-truth/role-permission-parity.md";

function writeJson(filePath: string, data: unknown) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeDoc(filePath: string, report: ReturnType<typeof buildRolePermissionParityReport>) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const rows = report.surfaces.map((surface) => {
    const visibleRoles = report.roles
      .filter((role) => surface.roles[role].canView)
      .map((role) => `${role}:${surface.roles[role].visibility}`)
      .join(", ");
    return `| ${surface.surfaceId} | ${surface.featureId} | ${visibleRoles} | ${surface.telemetry.permissionDenied} | ${surface.deniedState.copy.title} |`;
  }).join("\n");

  fs.writeFileSync(filePath, `# Role Permission Parity

Generated: ${report.generatedAtUtc}
Status: ${report.status}
Head: ${report.currentHead ?? "unknown"}

## Summary

This report is the Phase 4 role parity lock for guest, user, creator, admin, and system roles. It maps major surfaces to view permissions, action permissions, denied states, telemetry, debug visibility, and score evidence without changing auth provider logic, navigation, payment runtime, or GumDrop math.

- Surfaces registered: ${report.majorSurfacesRegistered}
- Roles: ${report.roles.join(", ")}
- Permissions: ${report.permissions.join(", ")}
- Production reads: ${report.productionReadsPerformed ? "yes" : "no"}
- Provider calls: ${report.providerCallsPerformed ? "yes" : "no"}
- Auth provider logic changed: ${report.authProviderLogicChanged ? "yes" : "no"}
- Payment runtime changed: ${report.paymentRuntimeChanged ? "yes" : "no"}
- GumDrop math changed: ${report.gumdropMathChanged ? "yes" : "no"}
- Nav changed: ${report.navChanged ? "yes" : "no"}

## Surfaces

| Surface | Feature | Visible roles | Denied telemetry | Denied title |
| --- | --- | --- | --- | --- |
${rows}

## Debug Lane

- Lane: ${report.debugLane.label}
- Route mismatches: ${report.debugLane.routeMismatchFindings.length}
- Denied-state gaps: ${report.debugLane.deniedStateCoverageFindings.length}
- Leaked controls: ${report.debugLane.leakedControlFindings.length}
- Missing role mappings: ${report.debugLane.missingRoleMappingFindings.length}

## Account / Creator Settings Split

- Account Settings user visible: ${report.accountCreatorSettingsSplit.accountSettingsUserVisible}
- Creator Settings plain user denied: ${report.accountCreatorSettingsSplit.creatorSettingsPlainUserDenied}
- Creator Settings creator visible: ${report.accountCreatorSettingsSplit.creatorSettingsCreatorVisible}

## Score Dimension Impact

- Before: ${report.scoreDimensionBeforeAfter.before}
- After: ${report.scoreDimensionBeforeAfter.after}
- Dimensions: ${report.scoreDimensionBeforeAfter.dimensions.join(", ")}

## Existing Logic Classification

${report.staleRolePermissionLogicClassification.map((item) => `- ${item.path}: ${item.classification} - ${item.reason}`).join("\n")}

## Validation

${report.validationFailures.length === 0 ? "- No validation failures." : report.validationFailures.map((failure) => `- ${failure}`).join("\n")}
`);
}

const toolchain = readRepoToolchainState();
const dirtyFiles = listWorkingTreeFiles();

const baseReport = buildRolePermissionParityReport({
  currentHead: toolchain.currentHead ?? "unknown",
  dirtyFiles,
  registry: ROLE_PERMISSION_REGISTRY,
});
const report = {
  ...baseReport,
  gitStatus: toolchain.gitStatus,
  currentHeadSource: toolchain.currentHeadSource,
  toolingDegraded: toolchain.toolingDegraded,
  degradationReason: toolchain.degradationReason,
  validationFailures: [
    ...baseReport.validationFailures,
    ...(toolchain.gitStatus !== "available"
      ? [`git_required: role permission parity cannot clear current-head/dirty-tree proof while Git is unavailable (${toolchain.degradationReason ?? "git unavailable"}).`]
      : []),
  ],
};

writeJson(STATE_PATH, report);
writeDoc(DOC_PATH, report);

if (report.validationFailures.length > 0) {
  console.error(`role permission parity failed:\n${report.validationFailures.map((failure) => `- ${failure}`).join("\n")}`);
  process.exit(1);
}

console.log(`role permission parity pass: ${report.majorSurfacesRegistered} surfaces, ${report.roles.length} roles, ${report.permissions.length} permissions`);
