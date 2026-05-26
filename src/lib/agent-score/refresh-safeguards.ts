import {
  DEFAULT_REFRESH_MAX_AGE_HOURS,
  findRefreshRegistryEntry,
  getRegisteredRefreshCommand,
  REFRESH_ARTIFACT_REGISTRY,
  type RefreshArtifactRegistryEntry,
} from "./refresh-registry";
import {
  classifyGeneratedArtifactVersion,
} from "./generated-artifact-version-policy";

export type RefreshArtifactInput = {
  artifactPath: string;
  generatedAtUtc?: string;
  generatedAt?: string;
  sourceCommit?: string;
  currentHead?: string;
  currentCodeVersion?: string;
  parentHead?: string | null;
  changedFilesInHead?: string[];
  changedFilesSinceArtifactHead?: string[];
  ownedSourcePaths?: string[];
  nowUtc?: string;
  maxAgeHours?: number;
  exists?: boolean;
};

export type ArtifactRefreshStatus =
  & {
    artifactPath: string;
    reportKey?: string;
    label: string;
    status:
      | "current"
      | "same_commit_snapshot"
      | "current_by_impact"
      | "missing"
      | "stale_source_version"
      | "missing_version"
      | "stale_age"
      | "unknown_freshness"
      | "unregistered";
    needsRefresh: boolean;
    generatedAtUtc?: string;
    ageHours?: number;
    refreshCommand: string | null;
    message: string;
    nextAction: string;
    formalEvidenceGateCanClear: boolean;
  }
  & Pick<RefreshArtifactRegistryEntry, "owner" | "maxAgeHours">;

function readTimestamp(input: RefreshArtifactInput) {
  return input.generatedAtUtc ?? input.generatedAt;
}

function statusIsCurrent(status: ArtifactRefreshStatus["status"]) {
  return status === "current" || status === "same_commit_snapshot" || status === "current_by_impact";
}

function ageHours(generatedAtUtc: string | undefined, nowUtc: string) {
  if (!generatedAtUtc) return undefined;
  const generatedMs = Date.parse(generatedAtUtc);
  const nowMs = Date.parse(nowUtc);
  if (!Number.isFinite(generatedMs) || !Number.isFinite(nowMs)) return undefined;
  return Math.max(0, (nowMs - generatedMs) / (60 * 60 * 1000));
}

function statusFromInput(
  input: RefreshArtifactInput,
  registryEntry: RefreshArtifactRegistryEntry | null,
  generatedAgeHours: number | undefined,
) {
  if (input.exists === false) return "missing" as const;
  if (!registryEntry) return "unregistered" as const;
  if (input.currentCodeVersion) {
    const version = classifyGeneratedArtifactVersion({
      artifactPath: input.artifactPath,
      artifactHead: input.sourceCommit ?? input.currentHead,
      currentHead: input.currentCodeVersion,
      parentHead: input.parentHead,
      changedFilesInHead: input.changedFilesInHead,
      changedFilesSinceArtifactHead: input.changedFilesSinceArtifactHead,
      ownedSourcePaths: input.ownedSourcePaths,
    });
    if (version.status !== "current_head") {
      return version.status === "same_commit_snapshot" || version.status === "current_by_impact"
        ? version.status
        : version.status satisfies "stale_source_version" | "missing_version";
    }
  }
  if (typeof generatedAgeHours !== "number") return "unknown_freshness" as const;
  if (generatedAgeHours > (input.maxAgeHours ?? registryEntry.maxAgeHours)) {
    return "stale_age" as const;
  }
  return "current" as const;
}

export function getRefreshCommand(artifactPathOrKey: string) {
  return getRegisteredRefreshCommand(artifactPathOrKey);
}

export function buildPlainRefreshMessage(status: Pick<ArtifactRefreshStatus, "label" | "status" | "refreshCommand">) {
  if (status.status === "current") {
    return `${status.label} is current for the latest code version.`;
  }
  if (status.status === "same_commit_snapshot") {
    return `${status.label} is current as a same-commit generated report snapshot.`;
  }
  if (status.status === "current_by_impact") {
    return `${status.label} is current because its owned source inputs did not change.`;
  }
  if (status.status === "missing") {
    return `${status.label} is missing. Refresh this report from the latest code version.`;
  }
  if (status.status === "stale_source_version") {
    return `${status.label} was generated from an older code version. Refresh this report from the latest code version.`;
  }
  if (status.status === "missing_version") {
    return `${status.label} does not include source version metadata. Refresh this report from the latest code version.`;
  }
  if (status.status === "stale_age") {
    return `${status.label} is older than the freshness window. Refresh this report from the latest code version.`;
  }
  if (status.status === "unknown_freshness") {
    return `${status.label} does not include enough freshness metadata. Refresh this report from the latest code version.`;
  }
  return `${status.label} is not registered for refresh tracking. Add a refresh command before relying on it.`;
}

export function getArtifactRefreshStatus(input: RefreshArtifactInput): ArtifactRefreshStatus {
  const registryEntry = findRefreshRegistryEntry(input.artifactPath);
  const generatedAtUtc = readTimestamp(input);
  const nowUtc = input.nowUtc ?? new Date().toISOString();
  const computedAgeHours = ageHours(generatedAtUtc, nowUtc);
  const status = statusFromInput(input, registryEntry, computedAgeHours);
  const refreshCommand = registryEntry?.refreshCommand ?? null;
  const label = registryEntry?.userFacingLabel ?? input.artifactPath;
  const base = {
    artifactPath: registryEntry?.artifactPath ?? input.artifactPath,
    reportKey: registryEntry?.reportKey,
    label,
    status,
    needsRefresh: !statusIsCurrent(status),
    generatedAtUtc,
    ageHours: computedAgeHours,
    refreshCommand,
    owner: registryEntry?.owner ?? "repo",
    maxAgeHours: input.maxAgeHours ?? registryEntry?.maxAgeHours ?? DEFAULT_REFRESH_MAX_AGE_HOURS,
    message: "",
    nextAction: "",
    formalEvidenceGateCanClear: statusIsCurrent(status),
  } satisfies ArtifactRefreshStatus;
  const message = buildPlainRefreshMessage(base);
  return {
    ...base,
    message,
    nextAction: statusIsCurrent(status)
      ? "No refresh needed."
      : refreshCommand
        ? `${message} Run: ${refreshCommand}`
        : `${message} Register an exact refresh command for this report.`,
  };
}

export function classifyStaleArtifact(input: RefreshArtifactInput) {
  return getArtifactRefreshStatus(input);
}

export function buildRefreshPlan(
  requiredArtifacts: RefreshArtifactInput[] = REFRESH_ARTIFACT_REGISTRY.map((entry) => ({
    artifactPath: entry.artifactPath,
  })),
  options: {
    currentCodeVersion?: string;
    parentHead?: string | null;
    changedFilesInHead?: string[];
    changedFilesSinceArtifactHead?: string[];
    nowUtc?: string;
  } = {},
) {
  return requiredArtifacts.map((artifact) =>
    getArtifactRefreshStatus({
      ...artifact,
      currentCodeVersion: artifact.currentCodeVersion ?? options.currentCodeVersion,
      parentHead: artifact.parentHead ?? options.parentHead,
      changedFilesInHead: artifact.changedFilesInHead ?? options.changedFilesInHead,
      changedFilesSinceArtifactHead: artifact.changedFilesSinceArtifactHead ?? options.changedFilesSinceArtifactHead,
      nowUtc: artifact.nowUtc ?? options.nowUtc,
    }));
}

export function uniqueRefreshCommands(plan: ArtifactRefreshStatus[]) {
  return Array.from(new Set(
    plan
      .map((entry) => entry.refreshCommand)
      .filter((command): command is string => typeof command === "string" && command.length > 0),
  ));
}

export function staleArtifactsFromPlan(plan: ArtifactRefreshStatus[]) {
  return plan.filter((entry) => entry.needsRefresh).map((entry) => ({
    artifactPath: entry.artifactPath,
    reportKey: entry.reportKey,
    status: entry.status,
    message: entry.message,
    nextAction: entry.nextAction,
    refreshCommand: entry.refreshCommand,
  }));
}
