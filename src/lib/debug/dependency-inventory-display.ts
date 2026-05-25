import type { CompleteDependencyInventory } from "@/lib/debug/dependency-inventory-contract";

export function buildDependencyInventoryDisplay(inventory: CompleteDependencyInventory) {
  return {
    compactSummary: {
      rootRuntimeDeps: inventory.totals.rootRuntimeDeps,
      rootDevDeps: inventory.totals.rootDevDeps,
      rootOptionalDeps: inventory.totals.rootOptionalDeps,
      rootPeerDeps: inventory.totals.rootPeerDeps,
      functionsRuntimeDeps: inventory.totals.functionsRuntimeDeps,
      functionsDevDeps: inventory.totals.functionsDevDeps,
      functionsOptionalDeps: inventory.totals.functionsOptionalDeps,
      functionsPeerDeps: inventory.totals.functionsPeerDeps,
      rootOverrides: inventory.totals.rootOverrides,
      functionsOverrides: inventory.totals.functionsOverrides,
      externalServices: inventory.totals.externalServices,
      expectedAbsentDependencies: inventory.totals.expectedAbsentDependencies,
      unknownDirectDeps: inventory.totals.unknownDirectDeps,
    },
    drilldowns: {
      everyDependency: inventory.packageDependencies,
      everyOverride: inventory.transitiveAndOverrideTruth,
      everyExternalService: inventory.externalServiceDependencies,
      everyEnvConfigDependency: inventory.externalServiceDependencies.flatMap((service) => [
        ...service.envKeysRequired.map((key) => ({ serviceName: service.serviceName, key, required: true })),
        ...service.envKeysOptional.map((key) => ({ serviceName: service.serviceName, key, required: false })),
      ]),
      expectedAbsentDependencies: inventory.expectedButAbsentDependencies,
    },
    timestampLabels: {
      rootPackage: inventory.rootPackageTimestampLabel,
      functionsPackage: inventory.functionsPackageTimestampLabel,
    },
    runtimeCopy: "Package presence does not prove runtime use. Firestore connectivity and telemetry ping are separate runtime checks.",
    runtimeChecksSeparated: inventory.runtimeConnectivityChecks.packagePresenceIsRuntimeHealth === false,
  };
}
