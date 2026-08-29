import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  isMaintenanceStateActive,
  MAINTENANCE_MODE_ENV,
  MAINTENANCE_SCHEDULES,
  resolveMaintenanceModeState,
} from "../../shared/runtime/maintenance-mode-contract";

const ROOT = process.cwd();

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(join(ROOT, directory), { withFileTypes: true }).flatMap((entry) => {
    const relativePath = join(directory, entry.name);
    if (entry.isDirectory()) return listTypeScriptFiles(relativePath);
    return entry.name.endsWith(".ts") ? [relativePath] : [];
  });
}

describe("maintenance-mode cost boundary", () => {
  it("short-circuits before normal application continuation and expensive imports", () => {
    const source = read("middleware.ts");
    const gateIndex = source.indexOf("if (isMaintenanceModeEnabled())");
    const normalContinuationIndex = source.indexOf("if (isInternalBypassPath(pathname))");

    expect(gateIndex).toBeGreaterThanOrEqual(0);
    expect(gateIndex).toBeLessThan(normalContinuationIndex);
    for (const forbiddenImport of ["firebase-admin", "@/lib/firebase", "getFirestore", "initializeApp"]) {
      expect(source).not.toContain(forbiddenImport);
    }
    expect(source).toContain("MAINTENANCE_ADMIN_ANALYTICS_REFRESH_PATH");
    expect(source).toContain("isMaintenanceBlockedAdminApiPath(pathname)");
  });

  it("guards every checked-in scheduled handler before runtime work", () => {
    const scheduledFiles = listTypeScriptFiles("functions/src")
      .filter((relativePath) => read(relativePath).includes("onSchedule("));

    expect(scheduledFiles.length).toBeGreaterThan(0);
    for (const relativePath of scheduledFiles) {
      const source = read(relativePath);
      expect(source, relativePath).toContain('from "./maintenance-job-guard.js"');
      expect(source, relativePath).toContain("runIfMaintenanceAllows");
      expect(source, relativePath).toContain("maxInstances: MAINTENANCE_SCHEDULES.");
    }
  });

  it("uses one fail-closed state parser for public and background consumers", () => {
    expect(MAINTENANCE_MODE_ENV).toBe("KANDY_MAINTENANCE_MODE");
    expect(resolveMaintenanceModeState("1")).toBe("on");
    expect(resolveMaintenanceModeState("0")).toBe("off");
    expect(resolveMaintenanceModeState(undefined)).toBe("unknown");
    expect(isMaintenanceStateActive(resolveMaintenanceModeState(undefined))).toBe(true);
    expect(isMaintenanceStateActive(resolveMaintenanceModeState("ambiguous"))).toBe(true);
  });

  it("keeps the source schedule registry explicit and maintenance-incompatible", () => {
    expect(MAINTENANCE_SCHEDULES.refreshAdminAnalyticsRealtimeSummary.schedule).toBe("every 5 minutes");
    expect(MAINTENANCE_SCHEDULES.refreshAdminAnalyticsRealtimeSummary.maintenanceAllowed).toBe(false);
    expect(MAINTENANCE_SCHEDULES.reconcileAnalyticsTruthLayers.memory).toBe("512MiB");
    expect(MAINTENANCE_SCHEDULES.buildMLFeatureProfiles.memory).toBe("512MiB");
    expect(Object.values(MAINTENANCE_SCHEDULES).every((entry) => entry.maintenanceAllowed === false)).toBe(true);
  });

  it("keeps the pure scheduled guard free of Firebase initialization", () => {
    const guard = read("functions/src/maintenance-job-guard.ts");
    expect(guard).not.toContain("firebase-admin");
    expect(guard).toContain("shouldSkipScheduledWork()");
    expect(guard).toContain("return work()");
  });

  it("keeps live provider verification explicitly opt-in", () => {
    const staticCheck = read("scripts/check-maintenance-config.ts");
    const liveCheck = read("scripts/check-maintenance-provider-drift.ts");
    const packageJson = read("package.json");

    expect(staticCheck).not.toContain("execFileSync");
    expect(liveCheck).toContain('args.includes("--live")');
    expect(liveCheck).toContain("Refusing provider access");
    expect(packageJson).toContain('"check:maintenance-config:live": "tsx scripts/check-maintenance-provider-drift.ts --live"');
  });

  it("keeps the deployed App Hosting maintenance flag and zero minimum instances explicit", () => {
    const source = read("apphosting.yaml");
    const functionsSource = read("functions/src/index.ts");
    expect(source).toContain("minInstances: 0");
    expect(functionsSource).toContain("minInstances: 0");
    expect(source).toContain("variable: KANDY_MAINTENANCE_MODE");
    expect(source).toContain('value: "1"');
  });

  it("documents provider verification as separate from source readiness", () => {
    const contract = read("docs/agent-truth/maintenance-mode-cost-contract.md");
    expect(contract).toContain("Cloud Scheduler jobs must be paused");
    expect(contract).toContain("Source/config tests cannot prove provider state");
    expect(contract).toContain("Firebase Functions runtime");
  });
});
