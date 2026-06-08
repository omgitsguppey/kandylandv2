import { describe, expect, it } from "vitest";

import { buildSignalSourceGraphReport, buildWritableSignalSourceGraphReport } from "../../scripts/agent/collect-signal-source-graph";
import { readFileModifiedMarker } from "../../scripts/agent/shared";
import { SIGNAL_FINDING_SCHEMA_VERSION } from "@/lib/agent-score/signal-finding-contract";

const availableToolchain = {
  gitStatus: "available" as const,
  sourceFileDiscovery: "git" as const,
  currentHead: "abc123",
  currentHeadSource: "git" as const,
  workingTreeStatus: [] as string[],
  toolingDegraded: false,
  degradationReason: null,
};

describe("SIGNAL source graph collector", () => {
  it("builds a compact local source graph report without raw source dumps", () => {
    const contractPath = "src/lib/agent-score/signal-finding-contract.ts";
    const collectorPath = "scripts/agent/collect-signal-source-graph.ts";
    const report = buildSignalSourceGraphReport({
      trackedFiles: [contractPath, collectorPath],
      inventoryItems: [
        { path: contractPath, last_modified_or_hash: readFileModifiedMarker(contractPath) },
        { path: collectorPath, last_modified_or_hash: readFileModifiedMarker(collectorPath) },
      ],
      inventoryMetadata: {
        generatedAt: new Date().toISOString(),
        currentHead: "abc123",
        currentHeadSource: "git",
      },
      toolchain: availableToolchain,
      canonicalHelpers: [
        {
          path: contractPath,
          family: "signal_contract",
          purpose: "Typed SIGNAL finding contract.",
          reuseBeforeNew: true,
        },
      ],
      surfaceDomains: [
        {
          name: "repo_intelligence",
          path_prefixes: ["scripts/agent", "src/lib/agent-score"],
        },
      ],
      verificationCommands: [],
      packageScripts: {
        "signal:source-graph": "tsx scripts/agent/collect-signal-source-graph.ts",
      },
    });

    expect(report.schemaVersion).toBe(SIGNAL_FINDING_SCHEMA_VERSION);
    expect(report.reportPath).toBe("agent/state/signal-source-graph.generated.json");
    expect(report.summary.sourceFileCount).toBe(2);
    expect(report.nodes.examples.length).toBeLessThanOrEqual(25);
    expect(report.findings.examples.length).toBeLessThanOrEqual(100);
    expect(report.rankInputFindings.length).toBe(report.summary.findingCount);
    const writableReport = buildWritableSignalSourceGraphReport(report);
    expect("rankInputFindings" in writableReport).toBe(false);
    expect(report.commandBudget.forbiddenCommands).toContain("npm run check");
    expect(JSON.stringify(report)).not.toContain("process.env");
    expect(JSON.stringify(report)).not.toContain(".env.local");
  });

  it("marks Git-missing fallback metadata as degraded and not Git-backed proof", () => {
    const report = buildSignalSourceGraphReport({
      trackedFiles: ["scripts/agent/collect-signal-source-graph.ts"],
      inventoryItems: [{ path: "scripts/agent/collect-signal-source-graph.ts", last_modified_or_hash: "mtime:stale-hash" }],
      inventoryMetadata: {
        generatedAt: new Date().toISOString(),
        currentHead: "inventory-head",
        currentHeadSource: "repo_inventory",
      },
      toolchain: {
        gitStatus: "missing",
        sourceFileDiscovery: "repo_inventory",
        currentHead: "inventory-head",
        currentHeadSource: "repo_inventory",
        workingTreeStatus: "unavailable_git_missing",
        toolingDegraded: true,
        degradationReason: "spawnSync git ENOENT",
      },
      canonicalHelpers: [],
      surfaceDomains: [],
      verificationCommands: [],
      packageScripts: {},
    });

    expect(report.gitStatus).toBe("missing");
    expect(report.sourceFileDiscovery).toBe("repo_inventory");
    expect(report.toolingDegraded).toBe(true);
    expect(report.degradationReason).toContain("ENOENT");
    expect(report.sourceInputs[0]).toBe("repo_inventory fallback");
    expect(report.inventoryBaselineStatus).toBe("unknown");
    expect(report.baselineHashDrift.classification).toBe("review");
    expect(report.touchedFiles.count).toBe(0);
    expect(report.rankInputFindings.every((finding) => finding.confidence === "low")).toBe(true);
  });

  it("classifies stale inventory hash drift separately from normal touched files", () => {
    const report = buildSignalSourceGraphReport({
      trackedFiles: ["scripts/agent/collect-signal-source-graph.ts"],
      inventoryItems: [{ path: "scripts/agent/collect-signal-source-graph.ts", last_modified_or_hash: "mtime:stale-hash" }],
      inventoryMetadata: {
        generatedAt: "2020-01-01T00:00:00.000Z",
        currentHead: "old-head",
        currentHeadSource: "git",
      },
      toolchain: availableToolchain,
      canonicalHelpers: [],
      surfaceDomains: [],
      verificationCommands: [],
      packageScripts: {},
    });

    expect(report.inventoryBaselineStatus).toBe("stale");
    expect(report.baselineHashDrift.count).toBeGreaterThan(0);
    expect(report.baselineHashDrift.classification).toBe("baseline_stale_hash_drift");
    expect(report.summary.touchedTrackedFileCount).toBe(0);
    expect(report.generatedReportFreshness.freshnessSignal).toBe("review");
  });

  it("does not classify App Router route handlers as UI server-import violations", () => {
    const routePath = "src/app/api/analytics/ingest/route.ts";
    const report = buildSignalSourceGraphReport({
      trackedFiles: [routePath, "src/lib/server/privacy-consent.ts"],
      inventoryItems: [
        { path: routePath, last_modified_or_hash: readFileModifiedMarker(routePath) },
        { path: "src/lib/server/privacy-consent.ts", last_modified_or_hash: readFileModifiedMarker("src/lib/server/privacy-consent.ts") },
      ],
      inventoryMetadata: {
        generatedAt: new Date().toISOString(),
        currentHead: "abc123",
        currentHeadSource: "git",
      },
      toolchain: availableToolchain,
      canonicalHelpers: [],
      surfaceDomains: [],
      verificationCommands: [],
      packageScripts: {},
    });

    expect(report.nodes.examples.find((node) => node.path === routePath)?.sourceSurface).toBe("server_truth");
    expect(report.rankInputFindings.some((finding) => finding.ruleId === "signal.source-graph.ui-server-import" && finding.affectedFiles.some((file) => file.path === routePath))).toBe(false);
  });

  it("resolves TypeScript source files imported through ESM .js specifiers", () => {
    const entryPath = "tests/fixtures/signal-source-graph/functions-entry.ts";
    const helperPath = "tests/fixtures/signal-source-graph/functions-helper.ts";
    const report = buildSignalSourceGraphReport({
      trackedFiles: [entryPath, helperPath],
      inventoryItems: [
        { path: entryPath, last_modified_or_hash: readFileModifiedMarker(entryPath) },
        { path: helperPath, last_modified_or_hash: readFileModifiedMarker(helperPath) },
      ],
      inventoryMetadata: {
        generatedAt: new Date().toISOString(),
        currentHead: "abc123",
        currentHeadSource: "git",
      },
      toolchain: availableToolchain,
      canonicalHelpers: [],
      surfaceDomains: [],
      verificationCommands: [],
      packageScripts: {},
    });

    expect(report.nodes.examples.find((node) => node.path === entryPath)?.resolvedImports).toContain(helperPath);
    expect(report.importGraph.unresolvedImportCount).toBe(0);
  });
});
