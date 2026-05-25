import { describe, expect, it } from "vitest";

import { buildCompleteDependencyInventory, reconcileDependencyCounts } from "@/lib/debug/dependency-inventory-engine";

const rootPackage = {
  dependencies: {
    next: "^16.2.4",
    firebase: "^12.12.1",
    "posthog-js": "^1.367.0",
  },
  devDependencies: {
    vitest: "^4.1.4",
    typescript: "^6",
  },
  overrides: {
    "google-gax": "^5.0.6",
  },
};

const functionsPackage = {
  dependencies: {
    "firebase-admin": "^13.8.0",
    "@google-cloud/bigquery": "^8.1.1",
  },
  devDependencies: {
    eslint: "^9.39.4",
  },
  overrides: {
    protobufjs: "^7.5.5",
  },
};

describe("complete dependency inventory", () => {
  it("reconciles every root/functions dependency and override without treating runtime checks as package health", () => {
    const inventory = buildCompleteDependencyInventory({
      rootPackage,
      rootLockfile: { packages: { "node_modules/next": { version: "16.2.4" } } },
      functionsPackage,
      functionsLockfile: { packages: { "node_modules/firebase-admin": { version: "13.8.0" } } },
      sourceFiles: {
        "package.json": true,
        "package-lock.json": true,
        "functions/package.json": true,
        "functions/package-lock.json": true,
        "firebase.json": true,
        "next.config.ts": true,
        ".env.example": true,
      },
      envExampleText: "NEXT_PUBLIC_POSTHOG_KEY=\nPAYPAL_CLIENT_ID=\nVERTEX_AI_LOCATION=\n",
      runtimeChecks: {
        firestoreConnectivity: "live",
        lastTelemetryPingAtUtc: "2026-05-24T15:49:20.528Z",
      },
      packageFreshness: {
        rootPackageUpdatedAtUtc: "1980-01-01T00:00:01.000Z",
        functionsPackageUpdatedAtUtc: "1980-01-01T00:00:01.000Z",
      },
    });

    expect(inventory.totals.rootRuntimeDeps).toBe(3);
    expect(inventory.totals.rootDevDeps).toBe(2);
    expect(inventory.totals.functionsRuntimeDeps).toBe(2);
    expect(inventory.totals.functionsDevDeps).toBe(1);
    expect(inventory.totals.rootOverrides).toBe(1);
    expect(inventory.totals.functionsOverrides).toBe(1);
    expect(inventory.packageDependencies.map((entry) => entry.name)).toEqual(expect.arrayContaining([
      "next",
      "firebase",
      "posthog-js",
      "vitest",
      "typescript",
      "firebase-admin",
      "@google-cloud/bigquery",
      "eslint",
    ]));
    expect(inventory.transitiveAndOverrideTruth.map((entry) => entry.name)).toEqual(expect.arrayContaining(["google-gax", "protobufjs"]));
    expect(inventory.runtimeConnectivityChecks.firestoreConnectivity.status).toBe("live");
    expect(inventory.runtimeConnectivityChecks.packagePresenceIsRuntimeHealth).toBe(false);
    expect(inventory.dependencyFreshness.find((entry) => entry.sourceFile === "package.json")?.status).toBe("fake_default_timestamp");
    expect(inventory.dependencyFreshness.find((entry) => entry.sourceFile === "package.json")?.displayLabel).toBe("timestamp unavailable");
    expect(reconcileDependencyCounts(inventory).status).toBe("pass");
  });
});
