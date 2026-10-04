import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildWorkflowGuidance } from "../../scripts/agent/extract-workflow";
import { findNpmCliPath, isAdjacentTraceSupported } from "../../scripts/agent/fast-start";

describe("agent workflow guidance", () => {
  it("indexes active workflow owners without treating scratch notes as instructions", () => {
    const paths = buildWorkflowGuidance().files.map((entry) => entry.path);

    expect(paths).toEqual(expect.arrayContaining([
      "AGENTS.md",
      ".agent/workflows/auto-tasks.md",
      ".agent/workflows/dependency-audit.md",
      ".agent/workflows/pre-commit.md",
      ".agent/workflows/simulate-ui.md",
      ".agent/workflows/sync-ledgers.md",
      ".agent/workflows/ui-copy-refinement-workflow.md",
    ]));
    expect(paths.some((path) => path.startsWith(".jules/") || path.startsWith(".Jules/"))).toBe(false);
    expect(paths.some((path) => path.startsWith(".agent/workflows/audit-"))).toBe(false);
    expect(paths).not.toContain(".agent/workflows/dependency-truth.md");
  });

  it("traces source modules and safely skips non-code entrypoints", () => {
    expect(isAdjacentTraceSupported("scripts/agent/fast-start.ts")).toBe(true);
    expect(isAdjacentTraceSupported("src/components/DropCard.tsx")).toBe(true);
    expect(isAdjacentTraceSupported(".agent/workflows/auto-tasks.md")).toBe(false);
    expect(isAdjacentTraceSupported("package.json")).toBe(false);
  });

  it("resolves npm through its CLI rather than an interpolated Windows shell command", () => {
    const npmCliPath = findNpmCliPath();

    expect(npmCliPath).not.toBeNull();
    expect(existsSync(npmCliPath!)).toBe(true);
    expect(findNpmCliPath("", join(process.cwd(), "missing-node", "node.exe"))).toBeNull();
  });
});
