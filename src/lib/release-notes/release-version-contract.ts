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
export const PUBLIC_RELEASE_NOTES_MAX_COUNT = 25;
export const PUBLIC_RELEASE_NOTES_PAGE_SIZE = 5;
export const PUBLIC_RELEASE_NOTES_MAJOR_LOCK = 1;
export const PUBLIC_RELEASE_VERSION_SHAPE = "BETA_ODOMETER";
export const CURRENT_BETA_RELEASE_COUNTER = 363;
export const CURRENT_BETA_RELEASE_VERSION = "1.3.63";

export const PUBLIC_RELEASE_NOTE_CATEGORIES = [
  "New",
  "Improved",
  "Fixed",
  "Security",
  "Performance",
  "Internal Reliability",
  "Internal",
  "Beta",
  "Admin",
] as const;

export type PublicReleaseNoteCategory = typeof PUBLIC_RELEASE_NOTE_CATEGORIES[number];
export type PublicReleaseAudience = "users" | "creators" | "admins" | "all";
export type PublicReleaseSurfaceCategory =
  | "App experience"
  | "Account & onboarding"
  | "Admin tools"
  | "Chat & support"
  | "Creator tools"
  | "Daily tasks"
  | "Drops & viewer"
  | "Navigation"
  | "Notifications"
  | "Privacy & security"
  | "Wallet"
  | "Internal reliability";

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
  surfaceCategory: PublicReleaseSurfaceCategory;
  bullets: string[];
  audience: PublicReleaseAudience;
  technicalDetails?: string[];
  affectedSurfaces: string[];
  hiddenFromPublic?: boolean;
  changedFiles?: string[];
  effectiveChangeCount?: number;
  excludedGeneratedChangeCount?: number;
  bumpType?: "minor" | "patch" | "none";
  sourceCommit?: string;
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
  const visible: PublicReleaseNote[] = [];
  const seenPublicCopy = new Set<string>();

  for (const note of notes) {
    if (note.hiddenFromPublic === true) continue;

    const publicCopy = `${note.title} ${note.summary} ${note.bullets.join(" ")}`.trim();
    if (seenPublicCopy.has(publicCopy)) continue;
    seenPublicCopy.add(publicCopy);
    visible.push(note);

    if (visible.length >= count) break;
  }

  return visible;
}

export function paginatePublicReleaseNotes(
  notes: PublicReleaseNote[],
  page: number,
  pageSize = PUBLIC_RELEASE_NOTES_PAGE_SIZE,
) {
  const normalizedPage = Math.max(1, Math.floor(page));
  const visible = getPublicReleaseNotesVisibleNotes(notes, PUBLIC_RELEASE_NOTES_MAX_COUNT);
  const totalVisible = visible.length;
  const totalPages = Math.max(1, Math.ceil(totalVisible / pageSize));
  const clampedPage = Math.min(normalizedPage, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalVisible);
  return {
    page: clampedPage,
    pageSize,
    totalVisible,
    totalPages,
    start: totalVisible === 0 ? 0 : start + 1,
    end,
    notes: visible.slice(start, end),
  };
}
