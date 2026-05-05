export const PUBLIC_RELEASE_CHANNEL = "beta" as const;
export const INITIAL_PUBLIC_VERSION = "1.0.0";
export const PUBLIC_RELEASE_NOTES_VISIBLE_COUNT = 5;
export const PUBLIC_RELEASE_NOTES_MAX_COUNT = 50;
export const PUBLIC_RELEASE_NOTES_MAJOR_LOCK = 1;
export const PUBLIC_RELEASE_VERSION_SHAPE = "MAJOR.MINOR.PATCH";

export const PUBLIC_RELEASE_NOTE_CATEGORIES = [
  "Added",
  "Changed",
  "Fixed",
  "Security",
  "Performance",
  "Internal",
] as const;

export type PublicReleaseNoteCategory = typeof PUBLIC_RELEASE_NOTE_CATEGORIES[number];
export type PublicReleaseBumpType = "major" | "minor" | "patch";

export type PublicReleaseNote = {
  version: string;
  previousVersion: string;
  commitSha: string;
  commitTitle: string;
  committedAt: string;
  generatedAt: string;
  diffStats: {
    rawAdditions: number;
    rawDeletions: number;
    rawChangeCount: number;
    additions: number;
    deletions: number;
    effectiveAdditions: number;
    effectiveDeletions: number;
    changedFiles: number;
    effectiveChangeCount: number;
    excludedGeneratedChangeCount: number;
  };
  bumpType: PublicReleaseBumpType;
  category: PublicReleaseNoteCategory;
  userFacingTitle: string;
  bullets: string[];
  affectedSurfaces: string[];
  hiddenFromPublic?: boolean;
};

export type PublicReleaseNotesDocument = {
  currentVersion: string;
  channel: typeof PUBLIC_RELEASE_CHANNEL;
  generatedAt: string;
  lastCommitSha: string;
  notes: PublicReleaseNote[];
};

export type VersionParts = {
  major: number;
  minor: number;
  patch: number;
};

export function parsePublicVersion(version: string): VersionParts | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/u.exec(version.trim());
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function isValidPublicVersion(version: string) {
  return parsePublicVersion(version) !== null;
}

export function comparePublicVersions(left: string, right: string) {
  const leftParts = parsePublicVersion(left);
  const rightParts = parsePublicVersion(right);
  if (!leftParts || !rightParts) return 0;

  for (const key of ["major", "minor", "patch"] as const) {
    const delta = leftParts[key] - rightParts[key];
    if (delta !== 0) return delta;
  }

  return 0;
}

export function classifyPublicVersionBump(effectiveChangeCount: number): PublicReleaseBumpType {
  return effectiveChangeCount > 100 ? "minor" : "patch";
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

export function bumpPublicVersion(
  currentVersion: string,
  bumpType: PublicReleaseBumpType,
  allowMajorVersionBump = false,
) {
  const parsed = parsePublicVersion(currentVersion) ?? parsePublicVersion(INITIAL_PUBLIC_VERSION);
  const version = parsed ?? { major: PUBLIC_RELEASE_NOTES_MAJOR_LOCK, minor: 0, patch: 0 };

  if (bumpType === "major" && allowMajorVersionBump) {
    return `${version.major + 1}.0.0`;
  }

  if (bumpType === "minor") {
    return `${version.major}.${version.minor + 1}.0`;
  }

  return `${version.major}.${version.minor}.${version.patch + 1}`;
}

export function getPublicReleaseNotesVisibleNotes(
  notes: PublicReleaseNote[],
  count = PUBLIC_RELEASE_NOTES_VISIBLE_COUNT,
) {
  return notes.filter((note) => note.hiddenFromPublic !== true).slice(0, count);
}
