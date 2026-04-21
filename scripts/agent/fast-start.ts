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

function buildIssueSpecMarkdown(input: {
  task: string;
  mode: string;
  files: string[];
  fastCommands: string[];
  signoffCommands: string[];
  forbiddenSurfaces: string[];
}) {
  const lines = [
    "# Agent Task Spec",
    "",
    "## Goal",
    input.task,
    "",
    "## Acceptance Criteria",
    "- Stay within the touched entrypoints unless adjacency proves a shared helper must move with them.",
    "- Reuse canonical helpers before inventing new paths.",
    "- Do not claim success unless the fast loop ran cleanly or the failure is stated explicitly.",
    "- Keep broad signoff lanes separate from the fast loop.",
    "",
    "## Likely Entrypoints",
    ...input.files.map((entry) => `- ${entry}`),
    "",
    "## Forbidden Surfaces",
    ...input.forbiddenSurfaces.map((entry) => `- ${entry}`),
    "",
    "## Fast Verification",
    ...input.fastCommands.map((entry) => `- ${entry}`),
    "",
    "## Signoff Verification",
    ...input.signoffCommands.map((entry) => `- ${entry}`),
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
      fastCommands: verificationPlan.fastCommands,
      signoffCommands: verificationPlan.signoffCommands,
      forbiddenSurfaces: verificationPlan.forbiddenSurfaces,
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
