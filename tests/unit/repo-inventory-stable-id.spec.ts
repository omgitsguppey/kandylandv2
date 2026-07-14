import { readFileSync, statSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildVerificationCommandEntries } from "../../scripts/agent/build-agent-indexes";
import { classifyRepoFile, withUniqueStableIds } from "../../scripts/agent/classify-repo-files";
import { discoverRepoFiles, fileExists, listRepoFiles, readJsonFile } from "../../scripts/agent/shared";

describe("repo inventory stable ids", () => {
  it("adds deterministic suffixes when distinct paths collide after normalization", () => {
    const entries = withUniqueStableIds([
      classifyRepoFile("agent/context/doctrine-cards.jsonl"),
      classifyRepoFile("agent/context/doctrine.cards.jsonl"),
    ]);

    expect(entries[0]?.stable_id).not.toEqual(entries[1]?.stable_id);
    expect(entries[0]?.stable_id).toMatch(/^file__agent__context__doctrine-cards-jsonl__[a-f0-9]{8}$/u);
    expect(entries[1]?.stable_id).toMatch(/^file__agent__context__doctrine-cards-jsonl__[a-f0-9]{8}$/u);
  });

  it("keeps default repo-intelligence artifacts bounded while declaring complete pre-cap counts", () => {
    const fullInventoryCount = listRepoFiles().filter(fileExists).length;
    const fullCommands = buildVerificationCommandEntries();
    const inventory = readJsonFile<{
      reportCompleteness: string;
      totalFindingCount: number;
      emittedFindingCount: number;
      omittedFindingCount: number;
      items: unknown[];
      counts: { total: number; emitted: number; omitted: number };
    }>("agent/index/repo-inventory.json");
    const commands = readJsonFile<{
      reportCompleteness: string;
      totalFindingCount: number;
      emittedFindingCount: number;
      omittedFindingCount: number;
      commands: unknown[];
      counts: { total: number; emitted: number; omitted: number };
    }>("agent/index/verification-commands.json");

    expect(inventory.reportCompleteness).toBe("capped");
    expect(inventory.totalFindingCount).toBe(fullInventoryCount);
    expect(inventory.emittedFindingCount).toBe(inventory.items.length);
    expect(inventory.omittedFindingCount).toBe(fullInventoryCount - inventory.items.length);
    expect(inventory.counts).toEqual({
      ...inventory.counts,
      total: fullInventoryCount,
      emitted: inventory.items.length,
      omitted: fullInventoryCount - inventory.items.length,
    });

    expect(commands.reportCompleteness).toBe("capped");
    expect(commands.totalFindingCount).toBe(fullCommands.length);
    expect(commands.emittedFindingCount).toBe(commands.commands.length);
    expect(commands.omittedFindingCount).toBe(fullCommands.length - commands.commands.length);

    for (const repoPath of [
      "agent/index/repo-inventory.json",
      "agent/index/retrieval-index.json",
      "agent/index/blast-radius.json",
      "agent/index/verification-commands.json",
    ]) {
      expect(statSync(repoPath).size, `${repoPath} bytes`).toBeLessThanOrEqual(250_000);
      expect(readFileSync(repoPath, "utf8").split(/\r?\n/u).length, `${repoPath} lines`).toBeLessThanOrEqual(500);
    }
  });

  it("uses filesystem discovery when Git is unavailable and the tracked inventory is intentionally capped", () => {
    const previous = process.env.KANDYDROPS_DISABLE_GIT;
    process.env.KANDYDROPS_DISABLE_GIT = "1";
    try {
      const discovery = discoverRepoFiles();
      expect(discovery.sourceFileDiscovery).toBe("filesystem");
      expect(discovery.toolingDegraded).toBe(true);
      expect(discovery.files).toContain("package.json");
      expect(discovery.files).toContain("scripts/agent/build-agent-indexes.ts");
    } finally {
      if (typeof previous === "undefined") delete process.env.KANDYDROPS_DISABLE_GIT;
      else process.env.KANDYDROPS_DISABLE_GIT = previous;
    }
  });

  it("records the Functions pnpm workspace as package-manager policy truth", () => {
    const packageManagerTruth = readJsonFile<{
      source: string[];
      functions: { pnpmWorkspaceConfig: string | null };
      syncInvariants: string[];
    }>("agent/index/package-manager-truth.json");

    expect(packageManagerTruth.source).toContain("functions/pnpm-workspace.yaml");
    expect(packageManagerTruth.functions.pnpmWorkspaceConfig).toBe("functions/pnpm-workspace.yaml");
    expect(packageManagerTruth.syncInvariants).toContain(
      "Functions pnpm override policy is owned by functions/pnpm-workspace.yaml and must stay aligned with functions/package.json.",
    );
  });
});
