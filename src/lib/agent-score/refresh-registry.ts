export type RefreshArtifactKey =
  | "public-beta-score"
  | "current-beta-exit-status"
  | "evidence-capture-status"
  | "source-truth-authority-map"
  | "final-telemetry-closure-lock"
  | "mobile-ui-final-lock"
  | "overnight-final-integration-lock"
  | "creator-settings-control-plane"
  | "creator-drop-status-metrics"
  | "operator-revenue-smoke"
  | "beta-evidence-gap-map"
  | "beta-evidence-lane-prep"
  | "beta-freshness-language"
  | "final-pr-stale-cleanup"
  | "overnight-wiring-integrity"
  | "existing-algorithm-refinement"
  | "user-loading-wallet-mobile-refinement"
  | "global-marquee-truncated-titles";

export type RefreshArtifactRegistryEntry = {
  key: RefreshArtifactKey;
  reportKey: string;
  artifactPath: string;
  refreshCommand: string;
  owner: "beta" | "evidence" | "telemetry" | "mobile" | "creator" | "repo";
  maxAgeHours: number;
  userFacingLabel: string;
  ownedSourcePaths?: string[];
};

export const DEFAULT_REFRESH_MAX_AGE_HOURS = 24;

export const REFRESH_ARTIFACT_REGISTRY: RefreshArtifactRegistryEntry[] = [
  {
    key: "public-beta-score",
    reportKey: "public-beta-score",
    artifactPath: "agent/state/public-beta-score.generated.json",
    refreshCommand: "npm run score:beta && npm run check:beta-score",
    owner: "beta",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Public beta score",
    ownedSourcePaths: [
      "scripts/agent/score-public-beta-readiness.ts",
      "scripts/agent/validate-public-beta-score.ts",
    ],
  },
  {
    key: "current-beta-exit-status",
    reportKey: "current-beta-exit-status",
    artifactPath: "agent/state/current-beta-exit-status.generated.json",
    refreshCommand: "npm run check:current-beta-exit-status",
    owner: "beta",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Current beta exit status",
    ownedSourcePaths: [
      "scripts/agent/validate-current-beta-exit-status.ts",
      "agent/state/public-beta-score.generated.json",
    ],
  },
  {
    key: "evidence-capture-status",
    reportKey: "evidence-capture-status",
    artifactPath: "agent/state/evidence-capture-status.generated.json",
    refreshCommand: "npm run check:evidence-capture-status",
    owner: "evidence",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Evidence capture status",
    ownedSourcePaths: ["scripts/agent/validate-evidence-capture-status.ts"],
  },
  {
    key: "source-truth-authority-map",
    reportKey: "source-truth-authority-map",
    artifactPath: "agent/state/source-truth-authority-map.generated.json",
    refreshCommand: "npm run check:source-truth-authority-map",
    owner: "evidence",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Source truth authority map",
    ownedSourcePaths: ["scripts/agent/validate-source-truth-authority-map.ts"],
  },
  {
    key: "final-telemetry-closure-lock",
    reportKey: "final-telemetry-closure-lock",
    artifactPath: "agent/state/final-telemetry-closure-lock.generated.json",
    refreshCommand: "npm run check:final-telemetry-closure-lock",
    owner: "telemetry",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Telemetry closure lock",
    ownedSourcePaths: ["scripts/agent/validate-final-telemetry-closure-lock.ts"],
  },
  {
    key: "mobile-ui-final-lock",
    reportKey: "mobile-ui-final-lock",
    artifactPath: "agent/state/mobile-ui-final-lock.generated.json",
    refreshCommand: "npm run check:mobile-ui-final-lock",
    owner: "mobile",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Mobile UI final lock",
    ownedSourcePaths: ["scripts/agent/validate-mobile-ui-final-lock.ts"],
  },
  {
    key: "overnight-final-integration-lock",
    reportKey: "overnight-final-integration-lock",
    artifactPath: "agent/state/overnight-final-integration-lock.generated.json",
    refreshCommand: "npm run check:overnight-final-integration-lock",
    owner: "repo",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Overnight final integration lock",
    ownedSourcePaths: [
      "scripts/agent/validate-overnight-final-integration-lock.ts",
      "agent/state/public-beta-score.generated.json",
    ],
  },
  {
    key: "creator-settings-control-plane",
    reportKey: "creator-settings-control-plane",
    artifactPath: "agent/state/creator-settings-control-plane.generated.json",
    refreshCommand: "npm run check:creator-settings-control-plane",
    owner: "creator",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Creator settings control plane",
    ownedSourcePaths: ["scripts/agent/validate-creator-settings-control-plane.ts"],
  },
  {
    key: "creator-drop-status-metrics",
    reportKey: "creator-drop-status-metrics",
    artifactPath: "agent/state/creator-drop-status-metrics.generated.json",
    refreshCommand: "npm run check:creator-drop-status-metrics",
    owner: "creator",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Creator drop status metrics",
    ownedSourcePaths: ["scripts/agent/validate-creator-drop-status-metrics.ts"],
  },
  {
    key: "operator-revenue-smoke",
    reportKey: "operator-revenue-smoke",
    artifactPath: "agent/state/operator-revenue-smoke.generated.json",
    refreshCommand: "npm run check:operator-revenue-smoke",
    owner: "evidence",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Operator revenue smoke",
    ownedSourcePaths: ["scripts/agent/validate-operator-revenue-smoke.ts"],
  },
  {
    key: "beta-evidence-gap-map",
    reportKey: "beta-evidence-gap-map",
    artifactPath: "agent/state/beta-evidence-gap-map.generated.json",
    refreshCommand: "npm run check:beta-evidence-gap-map",
    owner: "evidence",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Beta evidence gap map",
    ownedSourcePaths: [
      "scripts/agent/validate-beta-evidence-gap-map.ts",
      "agent/state/public-beta-score.generated.json",
      "agent/state/current-beta-exit-status.generated.json",
    ],
  },
  {
    key: "beta-evidence-lane-prep",
    reportKey: "beta-evidence-lane-prep",
    artifactPath: "agent/state/beta-evidence-lane-prep.generated.json",
    refreshCommand: "npm run check:beta-evidence-lane-prep",
    owner: "evidence",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Beta evidence lane prep",
    ownedSourcePaths: [
      "scripts/agent/validate-beta-evidence-lane-prep.ts",
      "agent/state/evidence-capture-status.generated.json",
      "agent/state/operator-revenue-smoke.generated.json",
    ],
  },
  {
    key: "beta-freshness-language",
    reportKey: "beta-freshness-language",
    artifactPath: "agent/state/beta-freshness-language.generated.json",
    refreshCommand: "npm run check:beta-freshness-language",
    owner: "beta",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Beta freshness language",
    ownedSourcePaths: ["scripts/agent/validate-beta-freshness-language.ts"],
  },
  {
    key: "final-pr-stale-cleanup",
    reportKey: "final-pr-stale-cleanup",
    artifactPath: "agent/state/final-pr-stale-cleanup.generated.json",
    refreshCommand: "npm run check:final-pr-stale-cleanup",
    owner: "repo",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Final PR stale cleanup",
    ownedSourcePaths: ["scripts/agent/validate-final-pr-stale-cleanup.ts"],
  },
  {
    key: "overnight-wiring-integrity",
    reportKey: "overnight-wiring-integrity",
    artifactPath: "agent/state/overnight-wiring-integrity.generated.json",
    refreshCommand: "npm run check:overnight-wiring-integrity",
    owner: "repo",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Overnight wiring integrity",
    ownedSourcePaths: ["scripts/agent/validate-overnight-wiring-integrity.ts"],
  },
  {
    key: "existing-algorithm-refinement",
    reportKey: "existing-algorithm-refinement",
    artifactPath: "agent/state/existing-algorithm-refinement.generated.json",
    refreshCommand: "npm run check:existing-algorithm-refinement",
    owner: "repo",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Existing algorithm refinement",
    ownedSourcePaths: ["scripts/agent/validate-existing-algorithm-refinement.ts"],
  },
  {
    key: "user-loading-wallet-mobile-refinement",
    reportKey: "user-loading-wallet-mobile-refinement",
    artifactPath: "agent/state/user-loading-wallet-mobile-refinement.generated.json",
    refreshCommand: "npm run check:user-loading-wallet-mobile-refinement",
    owner: "mobile",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "User loading and wallet mobile refinement",
    ownedSourcePaths: ["scripts/agent/validate-user-loading-wallet-mobile-refinement.ts"],
  },
  {
    key: "global-marquee-truncated-titles",
    reportKey: "global-marquee-truncated-titles",
    artifactPath: "agent/state/global-marquee-truncated-titles.generated.json",
    refreshCommand: "npm run check:global-marquee-truncated-titles",
    owner: "mobile",
    maxAgeHours: DEFAULT_REFRESH_MAX_AGE_HOURS,
    userFacingLabel: "Global marquee title rollout",
    ownedSourcePaths: ["scripts/agent/validate-global-marquee-truncated-titles.ts"],
  },
];

function normalizeArtifactPath(artifactPath: string) {
  return artifactPath.replace(/\\/g, "/").replace(/^\.\//u, "");
}

export function findRefreshRegistryEntry(artifactPathOrKey: string) {
  const normalized = normalizeArtifactPath(artifactPathOrKey);
  return REFRESH_ARTIFACT_REGISTRY.find((entry) =>
    entry.key === normalized
    || entry.reportKey === normalized
    || normalizeArtifactPath(entry.artifactPath) === normalized
  ) ?? null;
}

export function getRegisteredRefreshCommand(artifactPathOrKey: string) {
  return findRefreshRegistryEntry(artifactPathOrKey)?.refreshCommand ?? null;
}
