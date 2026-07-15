import { execFileSync } from "node:child_process";

export type GeneratedArtifactVersionStatus =
  | "current_head"
  | "same_commit_snapshot"
  | "current_by_impact"
  | "stale_source_version"
  | "missing_version";

export type GeneratedArtifactVersionInput = {
  artifactPath: string;
  artifactHead?: string;
  currentHead?: string;
  parentHead?: string | null;
  changedFilesInHead?: string[];
  changedFilesSinceArtifactHead?: string[];
  ownedSourcePaths?: string[];
};

export type GeneratedArtifactVersionResult = {
  artifactPath: string;
  artifactHead?: string;
  currentHead?: string;
  status: GeneratedArtifactVersionStatus;
  needsRefresh: boolean;
  reason: string;
};

export type GeneratedArtifactGitContext = {
  currentHead: string;
  parentHead: string | null;
  artifactCommit: string | null;
  effectiveComparisonHead: string | null;
  changedFilesInHead: string[];
  changedFilesSinceArtifactHead: string[];
};

function normalizePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\.\//u, "");
}

function normalizeList(paths: string[] | undefined) {
  return new Set((paths ?? []).map(normalizePath));
}

function listContainsPath(paths: Set<string>, path: string) {
  return paths.has(normalizePath(path));
}

function ownedSourceChanged(input: GeneratedArtifactVersionInput) {
  const changed = normalizeList(input.changedFilesSinceArtifactHead);
  const owned = (input.ownedSourcePaths ?? []).map(normalizePath);
  if (changed.size === 0 || owned.length === 0) return false;
  return owned.some((path) => changed.has(path) || Array.from(changed).some((changedPath) => changedPath.startsWith(`${path}/`)));
}

export function classifyGeneratedArtifactVersion(input: GeneratedArtifactVersionInput): GeneratedArtifactVersionResult {
  const artifactPath = normalizePath(input.artifactPath);
  const artifactHead = input.artifactHead?.trim();
  const currentHead = input.currentHead?.trim();

  if (!artifactHead) {
    return {
      artifactPath,
      artifactHead,
      currentHead,
      status: "missing_version",
      needsRefresh: true,
      reason: `${artifactPath} does not include source version metadata.`,
    };
  }

  if (!currentHead) {
    return {
      artifactPath,
      artifactHead,
      currentHead,
      status: "missing_version",
      needsRefresh: true,
      reason: `${artifactPath} cannot be current because the current code version is unavailable.`,
    };
  }

  if (artifactHead === currentHead) {
    return {
      artifactPath,
      artifactHead,
      currentHead,
      status: "current_head",
      needsRefresh: false,
      reason: `${artifactPath} was generated for the current code version.`,
    };
  }

  if (
    input.parentHead
    && artifactHead === input.parentHead
    && listContainsPath(normalizeList(input.changedFilesInHead), artifactPath)
  ) {
    return {
      artifactPath,
      artifactHead,
      currentHead,
      status: "same_commit_snapshot",
      needsRefresh: false,
      reason: `${artifactPath} is a same commit generated artifact snapshot.`,
    };
  }

  if (input.ownedSourcePaths && !ownedSourceChanged(input)) {
    return {
      artifactPath,
      artifactHead,
      currentHead,
      status: "current_by_impact",
      needsRefresh: false,
      reason: `${artifactPath} is older than HEAD but no owned source inputs changed.`,
    };
  }

  return {
    artifactPath,
    artifactHead,
    currentHead,
    status: "stale_source_version",
    needsRefresh: true,
    reason: `${artifactPath} was generated from an older code version.`,
  };
}

export function isGeneratedArtifactCurrent(result: GeneratedArtifactVersionResult) {
  return !result.needsRefresh;
}

export function artifactVersionFailureMessage(result: GeneratedArtifactVersionResult) {
  return result.reason;
}

function git(cwd: string, args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function gitList(cwd: string, args: string[]) {
  const output = git(cwd, args);
  return output.length > 0 ? output.split(/\r?\n/u).map(normalizePath) : [];
}

export function readGeneratedArtifactGitContext(
  cwd: string,
  artifactHead?: string,
  artifactPath?: string,
): GeneratedArtifactGitContext {
  const currentHead = git(cwd, ["rev-parse", "HEAD"]);
  let parentHead: string | null = null;
  try {
    parentHead = git(cwd, ["rev-parse", "HEAD^"]);
  } catch {
    parentHead = null;
  }

  let artifactCommit: string | null = null;
  if (artifactPath) {
    try {
      artifactCommit = git(cwd, ["log", "-n", "1", "--format=%H", "--", normalizePath(artifactPath)]);
    } catch {
      artifactCommit = null;
    }
  }

  let effectiveComparisonHead: string | null = artifactHead ?? null;
  if (artifactHead && artifactCommit) {
    try {
      const artifactCommitParent = git(cwd, ["rev-parse", `${artifactCommit}^`]);
      if (artifactCommitParent === artifactHead) {
        effectiveComparisonHead = artifactCommit;
      }
    } catch {
      effectiveComparisonHead = artifactHead;
    }
  }

  let changedFilesSinceArtifactHead: string[] = [];
  if (effectiveComparisonHead) {
    try {
      changedFilesSinceArtifactHead = gitList(cwd, ["diff", "--name-only", `${effectiveComparisonHead}..HEAD`]);
    } catch {
      changedFilesSinceArtifactHead = [];
    }
  }

  return {
    currentHead,
    parentHead,
    artifactCommit,
    effectiveComparisonHead,
    changedFilesInHead: gitList(cwd, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"]),
    changedFilesSinceArtifactHead,
  };
}

export function classifyGeneratedArtifactFromGit(input: {
  cwd: string;
  artifactPath: string;
  artifactHead?: string;
  ownedSourcePaths?: string[];
}) {
  const context = readGeneratedArtifactGitContext(input.cwd, input.artifactHead, input.artifactPath);
  return classifyGeneratedArtifactVersion({
    artifactPath: input.artifactPath,
    artifactHead: input.artifactHead,
    currentHead: context.currentHead,
    parentHead: context.parentHead,
    changedFilesInHead: context.changedFilesInHead,
    changedFilesSinceArtifactHead: context.changedFilesSinceArtifactHead,
    ownedSourcePaths: input.ownedSourcePaths,
  });
}
