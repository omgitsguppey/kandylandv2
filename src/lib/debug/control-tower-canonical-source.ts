export type ControlTowerScoreArtifact = {
  path: string;
  currentHead?: string | null;
  generatedAtUtc?: string | null;
  generatedAt?: string | null;
  overallScore?: number | null;
  score?: number | null;
  evidenceScore?: number | null;
  status?: string | null;
};

export type ControlTowerCanonicalSourceInput = {
  currentHead: string;
  publicBetaScore?: ControlTowerScoreArtifact | null;
  scoreDimensionLock?: ControlTowerScoreArtifact | null;
  latestDebugCockpitLock?: ControlTowerScoreArtifact | null;
  legacyScoreLocks?: ControlTowerScoreArtifact[];
};

export type ControlTowerCanonicalSourceResult = {
  currentHead: string;
  artifactHead: string | null;
  headMatchesMain: boolean;
  generatedAt: string | null;
  freshnessWindow: "24h";
  canonicalScoreSource: string;
  score: number | null;
  evidenceScore: number | null;
  staleSourceCount: number;
  supersededSourceCount: number;
  supersededSources: string[];
  fixFirstQueueArtifacts: string[];
  historicalArtifacts: string[];
};

const SUPERSEDED_SCORE_ARTIFACTS = new Set([
  "agent/state/score-80-path-lock.generated.json",
]);

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function generatedAt(artifact?: ControlTowerScoreArtifact | null) {
  return artifact?.generatedAtUtc ?? artifact?.generatedAt ?? null;
}

function artifactHead(artifact?: ControlTowerScoreArtifact | null) {
  return artifact?.currentHead ?? null;
}

function isCurrent(artifact: ControlTowerScoreArtifact | null | undefined, currentHead: string) {
  return Boolean(artifact?.path) && artifactHead(artifact) === currentHead;
}

export function resolveControlTowerCanonicalSource(input: ControlTowerCanonicalSourceInput): ControlTowerCanonicalSourceResult {
  const candidates = [
    input.publicBetaScore,
    input.scoreDimensionLock,
    input.latestDebugCockpitLock,
  ].filter(Boolean) as ControlTowerScoreArtifact[];
  const canonical = candidates.find((artifact) => isCurrent(artifact, input.currentHead))
    ?? input.publicBetaScore
    ?? input.scoreDimensionLock
    ?? input.latestDebugCockpitLock
    ?? null;
  const legacyLocks = input.legacyScoreLocks ?? [];
  const staleSources = [
    ...candidates,
    ...legacyLocks,
  ].filter((artifact) => artifactHead(artifact) && artifactHead(artifact) !== input.currentHead);
  const supersededSources = legacyLocks
    .filter((artifact) => SUPERSEDED_SCORE_ARTIFACTS.has(artifact.path) || /score-80-path-lock/iu.test(artifact.path))
    .map((artifact) => artifact.path);

  return {
    currentHead: input.currentHead,
    artifactHead: artifactHead(canonical),
    headMatchesMain: isCurrent(canonical, input.currentHead),
    generatedAt: generatedAt(canonical),
    freshnessWindow: "24h",
    canonicalScoreSource: canonical?.path ?? "missing",
    score: numeric(canonical?.overallScore) ?? numeric(canonical?.score),
    evidenceScore: numeric(canonical?.evidenceScore),
    staleSourceCount: staleSources.length,
    supersededSourceCount: supersededSources.length,
    supersededSources,
    fixFirstQueueArtifacts: candidates
      .filter((artifact) => !supersededSources.includes(artifact.path) && isCurrent(artifact, input.currentHead))
      .map((artifact) => artifact.path),
    historicalArtifacts: legacyLocks.map((artifact) => artifact.path),
  };
}
