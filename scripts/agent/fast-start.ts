import { execFileSync, execSync } from "node:child_process";

import { buildTaskContext } from "./build-task-context";
import { createMetadata, writeJsonFile, writeTextFile } from "./shared";
import { selectVerificationPlan, writeVerificationPlan } from "./verification-selector";

type FastStartArgs = {
  task: string;
  mode?: string;
  files: string[];
};

function parseArgs(): FastStartArgs {
  let task = "";
  let mode: string | undefined;
  const files: string[] = [];

  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--task=")) {
      task = arg.slice("--task=".length).trim();
      continue;
    }

    if (arg.startsWith("--mode=")) {
      mode = arg.slice("--mode=".length).trim();
      continue;
    }

    if (arg.startsWith("--file=")) {
      files.push(arg.slice("--file=".length).replace(/\\/g, "/"));
      continue;
    }
  }

  if (!task || files.length === 0) {
    throw new Error("Usage: tsx scripts/agent/fast-start.ts --task=\"<task>\" [--mode=<mode>] --file=<path> [--file=<path>]");
  }

  return { task, mode, files };
}

function runCommand(command: string, args: string[]) {
  if (process.platform === "win32" && command === "npm") {
    return execSync(`npm ${args.map((entry) => `"${entry}"`).join(" ")}`, {
      cwd: process.cwd(),
      encoding: "utf8",
    });
  }

  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

export function buildIssueSpecMarkdown(input: {
  task: string;
  mode: string;
  files: string[];
  acceptanceCriteria: string[];
  allowedFiles: string[];
  forbiddenFiles: string[];
  doctrineContextPack: { hot?: string[]; warm?: string[]; cold?: string[] };
  canonicalHelpersToReuse: string[];
  likelyDuplicateLogicSearches: string[];
  fastCommands: string[];
  signoffCommands: string[];
  forbiddenSurfaces: string[];
  releaseNoteImpact: string;
  rollbackNote: string;
}) {
  const doctrineFiles = [
    ...(input.doctrineContextPack.hot ?? []),
    ...(input.doctrineContextPack.warm ?? []),
    ...(input.doctrineContextPack.cold ?? []),
  ].slice(0, 12);
  const lines = [
    "# Agent Task Spec",
    "",
    "## Goal",
    input.task,
    "",
    "## Acceptance Criteria",
    ...input.acceptanceCriteria.map((entry) => `- ${entry}`),
    "",
    "## Allowed Files",
    ...input.allowedFiles.map((entry) => `- ${entry}`),
    "",
    "## Forbidden Files",
    ...(input.forbiddenFiles.length > 0 ? input.forbiddenFiles.map((entry) => `- ${entry}`) : ["- None pre-classified."]),
    "",
    "## Doctrine / Context Pack",
    ...(doctrineFiles.length > 0 ? doctrineFiles.map((entry) => `- ${entry}`) : ["- Use generated task context first; no doctrine files pre-selected."]),
    "",
    "## Likely Entrypoints",
    ...input.files.map((entry) => `- ${entry}`),
    "",
    "## Canonical Helpers To Reuse",
    ...(input.canonicalHelpersToReuse.length > 0 ? input.canonicalHelpersToReuse.map((entry) => `- ${entry}`) : ["- None pre-selected; search before adding a new helper."]),
    "",
    "## Likely Duplicate Logic Searches",
    ...(input.likelyDuplicateLogicSearches.length > 0 ? input.likelyDuplicateLogicSearches.map((entry) => `- ${entry}`) : ["- Run targeted rg searches in the touched domain before adding new ownership."]),
    "",
    "## Forbidden Surfaces",
    ...input.forbiddenSurfaces.map((entry) => `- ${entry}`),
    "",
    "## Fast Verification",
    ...input.fastCommands.map((entry) => `- ${entry}`),
    "",
    "## Signoff Verification",
    ...(input.signoffCommands.length > 0 ? input.signoffCommands.map((entry) => `- ${entry}`) : ["- None selected; do not substitute full npm run check by default."]),
    "",
    "## Release Note Impact",
    `- ${input.releaseNoteImpact}`,
    "",
    "## Rollback Note",
    `- ${input.rollbackNote}`,
    "",
    "## Notes",
    `- Mode: ${input.mode}`,
    "- Format follow-up implementation prompts like an issue: goal, acceptance criteria, entrypoints, forbidden surfaces, and exact verification lanes.",
  ];

  return `${lines.join("\n")}\n`;
}

export function runAgentFastStart(args: FastStartArgs) {
  const originalArgv = [...process.argv];
  process.argv = [
    process.argv[0] ?? "node",
    process.argv[1] ?? "scripts/agent/fast-start.ts",
    `--task=${args.task}`,
    ...(args.mode ? [`--mode=${args.mode}`] : []),
    ...args.files.map((entry) => `--file=${entry}`),
  ];
  const taskContext = buildTaskContext();
  process.argv = originalArgv;

  const verificationPlan = selectVerificationPlan({ paths: args.files });
  writeVerificationPlan(verificationPlan);
  const gitStatus = runCommand("git", ["status", "--short"]).trim();
  const traceOutputs = args.files.map((entry) => ({
    path: entry,
    output: runCommand("npm", ["run", "trace:adjacent", "--", entry]).trim(),
  }));

  const payload = {
    ...createMetadata([
      "scripts/agent/build-task-context.ts",
      "scripts/agent/verification-selector.ts",
      "scripts/trace-adjacent-surfaces.ts",
    ]),
    input: args,
    gitStatus,
    taskContextStableId: taskContext.stable_id,
    likelyTouchedFiles: taskContext.likelyTouchedFiles,
    canonicalHelpersToReuse: taskContext.canonicalHelpersToReuse,
    fastVerificationCommands: verificationPlan.fastCommands,
    signoffVerificationCommands: verificationPlan.signoffCommands,
    forbiddenSurfaces: verificationPlan.forbiddenSurfaces,
    traceOutputs,
  };

  writeJsonFile("agent/state/fast-start.generated.json", payload);
  writeTextFile(
    "agent/prompts/task-issue-spec.generated.md",
    buildIssueSpecMarkdown({
      task: args.task,
      mode: args.mode ?? String(taskContext.taskModeClassification),
      files: args.files,
      acceptanceCriteria: taskContext.acceptanceCriteria as string[],
      allowedFiles: taskContext.allowedFiles as string[],
      forbiddenFiles: taskContext.forbiddenFiles as string[],
      doctrineContextPack: taskContext.doctrineContextPack as { hot?: string[]; warm?: string[]; cold?: string[] },
      canonicalHelpersToReuse: taskContext.canonicalHelpersToReuse as string[],
      likelyDuplicateLogicSearches: taskContext.likelyDuplicateLogicSearches as string[],
      fastCommands: verificationPlan.fastCommands,
      signoffCommands: verificationPlan.signoffCommands,
      forbiddenSurfaces: verificationPlan.forbiddenSurfaces,
      releaseNoteImpact: String(taskContext.releaseNoteImpact),
      rollbackNote: String(taskContext.rollbackNote),
    }),
  );

  return payload;
}

if (require.main === module) {
  const payload = runAgentFastStart(parseArgs());
  console.log("Agent fast-start written to agent/state/fast-start.generated.json");
  console.log(`Fast verification commands: ${payload.fastVerificationCommands.length}`);
  console.log(`Signoff verification commands: ${payload.signoffVerificationCommands.length}`);
}
