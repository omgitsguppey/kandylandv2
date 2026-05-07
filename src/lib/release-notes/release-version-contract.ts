import {
  formatBetaOdometerVersion,
  getNextBetaOdometerVersion,
  migrateLegacyVersionToBetaCounter,
  normalizeBetaReleaseCounter,
  parseBetaOdometerVersion,
} from "./beta-odometer-version";

export const PUBLIC_RELEASE_CHANNEL = "beta" as const;
export const INITIAL_PUBLIC_VERSION = "1.0.0";
export const PUBLIC_RELEASE_NOTES_VISIBLE_COUNT = 5;
export const PUBLIC_RELEASE_NOTES_MAX_COUNT = 50;
export const PUBLIC_RELEASE_NOTES_MAJOR_LOCK = 1;
export const PUBLIC_RELEASE_VERSION_SHAPE = "1.<block>.<release>";
export const CURRENT_BETA_RELEASE_COUNTER = 201;
export const CURRENT_BETA_RELEASE_VERSION = formatBetaOdometerVersion(CURRENT_BETA_RELEASE_COUNTER);

export const PUBLIC_RELEASE_NOTE_CATEGORIES = [
  "New",
  "Improved",
  "Added",
  "Changed",
  "Fixed",
  "Security",
  "Performance",
  "Internal",
  "Admin",
  "Beta",
] as const;

export type PublicReleaseNoteCategory = typeof PUBLIC_RELEASE_NOTE_CATEGORIES[number];
export type PublicReleaseAudience = "users" | "creators" | "admins" | "all";

export type PublicReleaseNote = {
  version: string;
  previousVersion: string;
  betaReleaseCounter: number;
  previousBetaReleaseCounter: number | null;
  commitSha: string;
  commitTitle: string;
  commitCount: number;
  commitShas: string[];
  committedAt: string;
  generatedAt: string;
  committedAtUtc: string;
  generatedAtUtc: string;
  category: PublicReleaseNoteCategory;
  title: string;
  updatedAtUtc: string;
  summary: string;
  userFacingTitle: string;
  bullets: string[];
  audience: PublicReleaseAudience;
  technicalDetails?: string[];
  affectedSurfaces: string[];
  hiddenFromPublic?: boolean;
};

export type PublicReleaseNotesDocument = {
  currentVersion: string;
  betaReleaseCounter: number;
  channel: typeof PUBLIC_RELEASE_CHANNEL;
  generatedAt: string;
  generatedAtUtc: string;
  lastCommitSha: string;
  notes: PublicReleaseNote[];
};

export function parsePublicVersion(version: string) {
  return parseBetaOdometerVersion(version);
}

export function isValidPublicVersion(version: string) {
  return parsePublicVersion(version) !== null;
}

export function comparePublicVersions(left: string, right: string) {
  const leftParts = parsePublicVersion(left);
  const rightParts = parsePublicVersion(right);
  if (!leftParts || !rightParts) return 0;
  return leftParts.counter - rightParts.counter;
}

export function getCurrentBetaVersionContext() {
  return {
    betaReleaseCounter: CURRENT_BETA_RELEASE_COUNTER,
    appVersion: CURRENT_BETA_RELEASE_VERSION,
    releaseChannel: PUBLIC_RELEASE_CHANNEL,
  } as const;
}

export function resolveCurrentBetaReleaseCounter(input: unknown) {
  if (typeof input === "string") {
    const migrated = migrateLegacyVersionToBetaCounter(input);
    if (migrated !== null) return migrated;
  }

  try {
    return normalizeBetaReleaseCounter(input);
  } catch {
    return CURRENT_BETA_RELEASE_COUNTER;
  }
}

export function getNextPublicVersionFromCounter(counter: number) {
  return getNextBetaOdometerVersion(counter);
}

export function normalizeReleaseVersion(version: string, fallbackCounter = CURRENT_BETA_RELEASE_COUNTER) {
  const parsed = parsePublicVersion(version);
  if (parsed) return formatBetaOdometerVersion(parsed.counter);

  const migrated = migrateLegacyVersionToBetaCounter(version);
  if (migrated !== null) return formatBetaOdometerVersion(migrated);

  return formatBetaOdometerVersion(fallbackCounter);
}

export function isReleaseGeneratedArtifactPath(path: string, packageJsonChanged: boolean) {
  const normalizedPath = path.replace(/\\/gu, "/");

  return /^agent\/state\/.*\.generated\.json$/u.test(normalizedPath)
    || /^agent\/context\/.*\.generated\.json$/u.test(normalizedPath)
    || normalizedPath.startsWith("agent/cache/")
    || normalizedPath.startsWith("coverage/")
    || normalizedPath.startsWith(".next/")
    || normalizedPath.startsWith("dist/")
    || normalizedPath.startsWith("build/")
    || normalizedPath.startsWith("playwright-report/")
    || normalizedPath.startsWith("test-results/")
    || normalizedPath.startsWith("lighthouse-results/")
    || normalizedPath.endsWith(".generated.json")
    || normalizedPath.endsWith(".generated.md")
    || normalizedPath.endsWith(".generated.jsonl")
    || normalizedPath === "build.log"
    || normalizedPath === "public/kandydrops-release-notes.json"
    || normalizedPath === "src/lib/release-notes/public-release-notes.ts"
    || normalizedPath === "CHANGELOG.md"
    || (normalizedPath === "package-lock.json" && !packageJsonChanged);
}

export function getPublicReleaseNotesVisibleNotes(
  notes: PublicReleaseNote[],
  count = PUBLIC_RELEASE_NOTES_VISIBLE_COUNT,
) {
  return notes.filter((note) => note.hiddenFromPublic !== true).slice(0, count);
}
