import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { ROOT, createMetadata, extractRepoPaths, readText, toStableId } from "./shared";

export type WorkflowGuidanceEntry = {
  stable_id: string;
  path: string;
  purpose: string;
  authorityLevel: "workflow_required" | "workflow_advisory";
  intendedAgents: string[];
  relatedPaths: string[];
};

function inferPurpose(repoPath: string, content: string) {
  const frontmatterMatch = content.match(/description:\s*"([^"]+)"/);
  if (frontmatterMatch) {
    return frontmatterMatch[1];
  }

  if (repoPath === "AGENTS.md") {
    return "Cross-agent operational entrypoint for repo truth order, startup, verification, and signoff.";
  }

  if (repoPath.endsWith("auto-tasks.md")) {
    return "Codified auto-run command inventory for recurring repo workflows.";
  }

  if (repoPath.endsWith("sync-ledgers.md")) {
    return "Workflow instructions for synchronizing audit and ledger artifacts.";
  }

  return `Workflow guidance for ${path.posix.basename(repoPath, path.posix.extname(repoPath))}.`;
}

function inferAuthorityLevel(repoPath: string, content: string): WorkflowGuidanceEntry["authorityLevel"] {
  if (repoPath === "AGENTS.md" || content.includes("MANDATORY") || content.includes("must")) {
    return "workflow_required";
  }

  return "workflow_advisory";
}

function inferIntendedAgents(repoPath: string) {
  if (repoPath === "AGENTS.md") {
    return ["codex", "google_antigravity", "google_jules", "generic_repo_agent"];
  }

  return ["codex"];
}

export function buildWorkflowGuidance() {
  const workflowFiles = ["AGENTS.md"];
  const workflowDirectory = path.join(ROOT, ".agent", "workflows");
  const julesDirectory = path.join(ROOT, ".jules");
  const upperJulesDirectory = path.join(ROOT, ".Jules");
  const vscodeDirectory = path.join(ROOT, ".vscode");

  if (existsSync(workflowDirectory) && statSync(workflowDirectory).isDirectory()) {
    readdirSync(workflowDirectory)
      .filter((entry) => statSync(path.join(workflowDirectory, entry)).isFile())
      .forEach((entry) => workflowFiles.push(`.agent/workflows/${entry}`));
  }

  if (existsSync(julesDirectory) && statSync(julesDirectory).isDirectory()) {
    readdirSync(julesDirectory)
      .filter((entry) => statSync(path.join(julesDirectory, entry)).isFile())
      .forEach((entry) => workflowFiles.push(`.jules/${entry}`));
  }

  if (existsSync(upperJulesDirectory) && statSync(upperJulesDirectory).isDirectory()) {
    readdirSync(upperJulesDirectory)
      .filter((entry) => statSync(path.join(upperJulesDirectory, entry)).isFile())
      .forEach((entry) => workflowFiles.push(`.Jules/${entry}`));
  }

  if (existsSync(vscodeDirectory) && statSync(vscodeDirectory).isDirectory()) {
    readdirSync(vscodeDirectory)
      .filter((entry) => statSync(path.join(vscodeDirectory, entry)).isFile())
      .forEach((entry) => workflowFiles.push(`.vscode/${entry}`));
  }

  const canonicalPaths = Array.from(
    workflowFiles.reduce((paths, entry) => {
      const normalized = entry.replace(/\\/g, "/");
      const dedupeKey = normalized.toLowerCase();
      if (!paths.has(dedupeKey)) {
        paths.set(dedupeKey, normalized.startsWith(".Jules/") ? normalized.replace(/^\.Jules\//, ".jules/") : normalized);
      }
      return paths;
    }, new Map<string, string>()).values(),
  ).sort();

  const files = canonicalPaths.map((repoPath) => {
    const content = readText(repoPath);
    return {
      stable_id: toStableId("workflow", repoPath),
      path: repoPath,
      purpose: inferPurpose(repoPath, content),
      authorityLevel: inferAuthorityLevel(repoPath, content),
      intendedAgents: inferIntendedAgents(repoPath),
      relatedPaths: extractRepoPaths(content),
    } satisfies WorkflowGuidanceEntry;
  });

  return {
    ...createMetadata(["AGENTS.md", ".agent/workflows/*", ".jules/*", ".Jules/*", ".vscode/*"]),
    files,
  };
}
