import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findMissingWorkflowNpmScripts } from "../../scripts/agent/check-agent-context";

describe("agent-context workflow command references", () => {
  it("accepts current workflow npm scripts and rejects a stale command", () => {
    const root = process.cwd();
    const workflow = readFileSync(join(root, ".agent/workflows/auto-tasks.md"), "utf8");
    const packageScripts = Object.keys(JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts);

    expect(workflow).toMatch(/^---\r?\ndescription: "Select the smallest valid KandyDrops verification path\."\r?\n---/u);
    expect(findMissingWorkflowNpmScripts(workflow, packageScripts)).toEqual([]);
    expect(findMissingWorkflowNpmScripts("`npm run build-storybook`", packageScripts)).toEqual(["build-storybook"]);
  });
});
