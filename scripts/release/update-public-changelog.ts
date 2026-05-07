import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  CURRENT_BETA_RELEASE_COUNTER,
  CURRENT_BETA_RELEASE_VERSION,
  INITIAL_PUBLIC_VERSION,
  PUBLIC_RELEASE_CHANNEL,
  PUBLIC_RELEASE_NOTES_MAX_COUNT,
  PUBLIC_RELEASE_NOTES_VISIBLE_COUNT,
  getPublicReleaseNotesVisibleNotes,
  isReleaseGeneratedArtifactPath,
  resolveCurrentBetaReleaseCounter,
  type PublicReleaseAudience,
  type PublicReleaseNote,
  type PublicReleaseNoteCategory,
  type PublicReleaseNotesDocument,
  type PublicReleaseSurfaceCategory,
} from "../../src/lib/release-notes/release-version-contract";
import {
  formatBetaOdometerVersion,
  getNextBetaOdometerVersion,
} from "../../src/lib/release-notes/beta-odometer-version";

type CommitRecord = {
  sha: string;
  committedAt: string;
  title: string;
};

const root = process.cwd();
const publicJsonPath = join(root, "public/kandydrops-release-notes.json");
const fallbackTsPath = join(root, "src/lib/release-notes/public-release-notes.ts");
const changelogPath = join(root, "CHANGELOG.md");
const acceptRelease = process.argv.includes("--accept") || process.env.PUBLIC_BETA_ACCEPT_RELEASE === "1";

function toUtcIso(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date(0).toISOString();
}

function nowUtcIso() {
  return new Date().toISOString();
}

function formatUtcTimestamp(value: string) {
  const date = new Date(toUtcIso(value));
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

function runGit(args: string[]) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function safeRunGit(args: string[]) {
  try {
    return runGit(args);
  } catch {
    return "";
  }
}

function readExistingDocument(): PublicReleaseNotesDocument {
  if (!existsSync(publicJsonPath)) {
    const generatedAtUtc = nowUtcIso();
    return {
      currentVersion: CURRENT_BETA_RELEASE_VERSION,
      betaReleaseCounter: CURRENT_BETA_RELEASE_COUNTER,
      channel: PUBLIC_RELEASE_CHANNEL,
      generatedAt: generatedAtUtc,
      generatedAtUtc,
      lastCommitSha: "",
      notes: [],
    };
  }

  return JSON.parse(readFileSync(publicJsonPath, "utf8")) as PublicReleaseNotesDocument;
}

function getCommit(sha: string): CommitRecord | null {
  const raw = safeRunGit(["show", "-s", "--format=%H%x00%cI%x00%s", sha]);
  if (!raw) return null;
  const [commitSha, committedAt, title] = raw.split("\u0000");
  if (!commitSha || !committedAt || !title) return null;
  return { sha: commitSha, committedAt, title };
}

function getPendingCommits(lastCommitSha: string) {
  const hasAnchor = lastCommitSha && safeRunGit(["rev-parse", "--verify", lastCommitSha]);
  const raw = hasAnchor
    ? safeRunGit(["rev-list", "--reverse", `${lastCommitSha}..HEAD`])
    : "";
  const shas = raw ? raw.split(/\r?\n/u).filter(Boolean) : [];

  return shas
    .map(getCommit)
    .filter((commit): commit is CommitRecord => Boolean(commit))
    .filter((commit) => !/\[skip release-notes\]/iu.test(commit.title));
}

function getChangedFiles(sha: string) {
  const raw = safeRunGit(["show", "--name-only", "--format=", "--no-renames", sha]);
  if (!raw) return [];

  return raw
    .split(/\r?\n/u)
    .map((path) => path.trim().replace(/\\/gu, "/"))
    .filter(Boolean);
}

function isInternalReliabilityPath(path: string, packageJsonChanged: boolean) {
  const normalizedPath = path.replace(/\\/gu, "/");
  if (isReleaseGeneratedArtifactPath(normalizedPath, packageJsonChanged)) {
    return true;
  }

  return normalizedPath === "CODEX_HANDOFF.md"
    || normalizedPath === "PHASE1_TRUTH_AUDIT.md"
    || normalizedPath === "README.md"
    || normalizedPath === "AGENTS.md"
    || normalizedPath.startsWith("src/lib/release-notes/")
    || normalizedPath.startsWith("agent/")
    || normalizedPath.startsWith("docs/")
    || normalizedPath.startsWith("scripts/")
    || normalizedPath.startsWith(".github/")
    || normalizedPath.startsWith("tests/")
    || normalizedPath.endsWith(".md")
    || normalizedPath.endsWith(".spec.ts")
    || normalizedPath.endsWith(".spec.tsx")
    || normalizedPath === "package.json";
}

function isProductFacingPath(path: string, packageJsonChanged: boolean) {
  return !isInternalReliabilityPath(path, packageJsonChanged);
}

function getEffectiveChangedFiles(commits: CommitRecord[]) {
  const allChangedFiles = Array.from(new Set(commits.flatMap((commit) => getChangedFiles(commit.sha))));
  const packageJsonChanged = allChangedFiles.includes("package.json");
  const relevantChangedFiles = allChangedFiles.filter((path) => !isReleaseGeneratedArtifactPath(path, packageJsonChanged));
  const productFacingFiles = relevantChangedFiles.filter((path) => isProductFacingPath(path, packageJsonChanged));
  const internalReliabilityFiles = relevantChangedFiles.filter((path) => !isProductFacingPath(path, packageJsonChanged));

  return {
    allChangedFiles,
    relevantChangedFiles,
    productFacingFiles,
    internalReliabilityFiles,
    packageJsonChanged,
  };
}

function affectedSurfacesFor(paths: string[]) {
  const surfaces = new Set<string>();
  for (const path of paths) {
    if (
      path.includes("Navbar")
      || path.includes("Navigation/")
      || path.includes("ReleaseNotes/")
      || path.includes("usePublicReleaseNotes")
      || path.includes("release-notes/")
    ) surfaces.add("navigation");
    if (path.includes("wallet") || path.includes("paypal")) surfaces.add("wallet");
    if (path.includes("chat") || path.includes("support")) surfaces.add("chat-support");
    if (path.includes("notification")) surfaces.add("notifications");
    if (path.includes("admin")) surfaces.add("admin");
    if (path.includes("creator")) surfaces.add("creator");
    if (path.includes("task") || path.includes("checkin")) surfaces.add("daily-tasks");
    if (path.includes("viewer") || path.includes("drop")) surfaces.add("drops-viewer");
    if (path.includes("auth") || path.includes("sign") || path.includes("onboarding") || path.includes("profile")) surfaces.add("account-onboarding");
    if (path.includes("security") || path.includes("privacy")) surfaces.add("privacy-security");
  }
  return surfaces.size > 0 ? Array.from(surfaces).sort() : ["app"];
}

function resolveSurfaceCategory(surfaces: string[]): PublicReleaseSurfaceCategory {
  if (surfaces.includes("admin")) return "Admin tools";
  if (surfaces.includes("wallet")) return "Wallet";
  if (surfaces.includes("chat-support")) return "Chat & support";
  if (surfaces.includes("drops-viewer")) return "Drops & viewer";
  if (surfaces.includes("creator")) return "Creator tools";
  if (surfaces.includes("daily-tasks")) return "Daily tasks";
  if (surfaces.includes("notifications")) return "Notifications";
  if (surfaces.includes("privacy-security")) return "Privacy & security";
  if (surfaces.includes("account-onboarding")) return "Account & onboarding";
  if (surfaces.includes("navigation")) return "Navigation";
  if (surfaces.includes("app")) return "App experience";
  return "Internal reliability";
}

function resolveAudience(titles: string[], surfaces: string[]): PublicReleaseAudience {
  const normalized = titles.join(" ").toLowerCase();
  if (surfaces.includes("admin") || normalized.includes("admin") || normalized.includes("debug")) return "admins";
  if (surfaces.includes("wallet") || surfaces.includes("chat-support") || surfaces.includes("navigation") || surfaces.includes("notifications") || surfaces.includes("daily-tasks") || surfaces.includes("drops-viewer") || surfaces.includes("account-onboarding")) return "users";
  if (normalized.includes("creator")) return "creators";
  return "all";
}

function buildReleaseTitle(
  titles: string[],
  surfaces: string[],
  audience: PublicReleaseAudience,
  surfaceCategory: PublicReleaseSurfaceCategory,
) {
  const normalized = titles.join(" ").toLowerCase();
  const isBetaUpdatesLane = surfaces.includes("navigation")
    && /beta|release note|changelog|badge|drawer/u.test(normalized);
  if (surfaceCategory === "Internal reliability") return "Internal reliability improvements";
  if (isBetaUpdatesLane) return "Improved Beta updates and version visibility";
  if (audience === "admins") {
    if (normalized.includes("viewer") || normalized.includes("watch")) return "Improved viewer analytics";
    if (normalized.includes("transaction") || normalized.includes("commerce")) return "Improved transaction review";
    if (normalized.includes("drop")) return "Improved drop conversion review";
    return "Improved admin reliability and status accuracy";
  }
  if (surfaceCategory === "Navigation") return "Improved navigation reliability";
  if (surfaceCategory === "Chat & support") return "Improved chat and support reliability";
  if (surfaceCategory === "Wallet") return "Improved wallet reliability";
  if (surfaceCategory === "Drops & viewer") return "Improved drops and viewer reliability";
  if (surfaceCategory === "Notifications") return "Improved notification reliability";
  if (surfaceCategory === "Daily tasks") return "Improved daily task reliability";
  if (surfaceCategory === "Account & onboarding") return "Improved sign-in and onboarding reliability";
  return "Bug fixes and quality-of-life improvements";
}

function buildReleaseSummary(
  surfaceCategory: PublicReleaseSurfaceCategory,
  audience: PublicReleaseAudience,
  includesInternalReliability: boolean,
  surfaces: string[],
  titles: string[],
) {
  const normalized = titles.join(" ").toLowerCase();
  const isBetaUpdatesLane = surfaces.includes("navigation")
    && /beta|release note|changelog|badge|drawer/u.test(normalized);
  if (surfaceCategory === "Internal reliability") {
    return "Internal reliability updates with no user-facing product changes.";
  }
  if (isBetaUpdatesLane) {
    return includesInternalReliability
      ? "Bug fixes and quality-of-life improvements for Beta updates, version visibility, and behind-the-scenes release reliability."
      : "Bug fixes and quality-of-life improvements for Beta updates and version visibility.";
  }
  if (audience === "admins") {
    return includesInternalReliability
      ? "Bug fixes and quality-of-life improvements for admin review tools, plus behind-the-scenes reliability work."
      : "Bug fixes and quality-of-life improvements for admin review tools.";
  }
  if (surfaceCategory === "Navigation") return "Bug fixes and quality-of-life improvements for top-level navigation and Beta update access.";
  if (surfaceCategory === "Chat & support") return "Bug fixes and quality-of-life improvements for chat and support.";
  if (surfaceCategory === "Wallet") return "Bug fixes and quality-of-life improvements for wallet flows.";
  if (surfaceCategory === "Drops & viewer") return "Bug fixes and quality-of-life improvements for drops, previews, and viewer behavior.";
  if (surfaceCategory === "Notifications") return "Bug fixes and quality-of-life improvements for notifications.";
  if (surfaceCategory === "Daily tasks") return "Bug fixes and quality-of-life improvements for daily tasks and check-ins.";
  if (surfaceCategory === "Account & onboarding") return "Bug fixes and quality-of-life improvements for sign-in and onboarding.";
  return "Bug fixes and quality-of-life improvements.";
}

function ensureBulletVerb(value: string) {
  const trimmed = value.trim().replace(/\.$/u, "");
  if (/^(Added|Clarified|Fixed|Improved|Reduced|Updated)\b/u.test(trimmed)) {
    return `${trimmed}.`;
  }
  return `Improved ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}.`;
}

function buildReleaseBullets(
  titles: string[],
  surfaces: string[],
  audience: PublicReleaseAudience,
  surfaceCategory: PublicReleaseSurfaceCategory,
  includesInternalReliability: boolean,
) {
  const normalized = titles.join(" ").toLowerCase();
  const isBetaUpdatesLane = surfaces.includes("navigation")
    && /beta|release note|changelog|badge|drawer/u.test(normalized);
  if (surfaceCategory === "Internal reliability") {
    return [
      "Improved behind-the-scenes reliability for the current Beta build.",
      "Reduced internal tooling noise so public update notes stay focused on product changes.",
    ];
  }

  if (isBetaUpdatesLane) {
    return [
      "Improved how the Beta drawer opens the latest accepted updates.",
      "Reduced stale or repeated release-note copy in the visible Beta feed.",
      includesInternalReliability
        ? "Improved behind-the-scenes release tracking without flooding public notes with internal audit churn."
        : "Updated version visibility so the latest Beta notes stay easier to follow.",
    ];
  }

  if (audience === "admins") {
    if (normalized.includes("viewer") || normalized.includes("watch")) {
      return [
        "Clarified verified and estimated viewer watch time.",
        "Improved stale and quiet viewer activity labels.",
        "Updated viewer rows to use readable names where available.",
      ];
    }

    if (normalized.includes("transaction") || normalized.includes("commerce")) {
      return [
        "Added clearer names to recent transaction rows.",
        "Improved GumDrops transaction labels and timestamps for admin review.",
        "Clarified unavailable commerce details instead of showing waiting states.",
      ];
    }

    return [
      "Fixed admin labels that could appear stuck after data loaded.",
      "Improved how hidden, delayed, or unavailable data is labeled.",
      includesInternalReliability
        ? "Improved behind-the-scenes reliability without changing core admin workflows."
        : "Reduced confusing status messages in Beta admin tools.",
    ];
  }
  if (surfaceCategory === "Navigation") {
    return [
      "Improved how key app navigation surfaces stay in sync with the latest Beta build.",
      "Reduced confusing status changes when opening update notes and top-level navigation lanes.",
    ];
  }
  if (surfaceCategory === "Chat & support") {
    return [
      "Improved chat and support reliability so common actions feel more stable.",
      "Reduced stuck or confusing states in active support and messaging flows.",
    ];
  }
  if (surfaceCategory === "Wallet") {
    return [
      "Improved wallet flow reliability so purchase-ready surfaces stay clearer.",
      "Reduced confusing state changes around wallet-related interactions.",
    ];
  }
  if (surfaceCategory === "Drops & viewer") {
    return [
      "Improved drop and viewer reliability so usage states stay easier to understand.",
      "Reduced confusing stale or delayed states across previews and viewer surfaces.",
    ];
  }

  return [
    "Fixed beta issues to make KandyDrops smoother to use.",
    "Improved reliability for the latest Beta build.",
  ];
}

function buildTechnicalDetails(
  commitCount: number,
  titles: string[],
  surfaces: string[],
  includesInternalReliability: boolean,
) {
  const details: string[] = [];

  if (commitCount > 1) {
    details.push(`Grouped ${commitCount} commits into one accepted beta release.`);
  }

  if (includesInternalReliability) {
    details.push("Includes internal reliability work that does not change the public product surface.");
  }

  if (titles.join(" ").toLowerCase().includes("unlock")) {
    details.push("Display language uses unwrap; backend entitlement fields may still use unlock.");
  }

  return details.length > 0 ? details : undefined;
}

function classifyCategory(titles: string[], surfaces: string[], surfaceCategory: PublicReleaseSurfaceCategory): PublicReleaseNoteCategory {
  const normalized = titles.join(" ").toLowerCase();
  if (normalized.includes("security")) return "Security";
  if (surfaceCategory === "Internal reliability") return "Internal";
  if (normalized.includes("feat(") || normalized.includes("feat:")) return "New";
  if (normalized.includes("perf(") || normalized.includes("perf:")) return "Improved";
  if (normalized.includes("admin")) return "Admin";
  return "Fixed";
}

function deriveReleaseDescriptor(commits: CommitRecord[]) {
  const titles = commits.map((commit) => commit.title);
  const {
    productFacingFiles,
    internalReliabilityFiles,
  } = getEffectiveChangedFiles(commits);
  const affectedSurfaces = affectedSurfacesFor(productFacingFiles);
  const surfaceCategory = resolveSurfaceCategory(affectedSurfaces);
  const includesInternalReliability = internalReliabilityFiles.length > 0;
  const audience = resolveAudience(titles, affectedSurfaces);
  const hiddenFromPublic = productFacingFiles.length === 0;

  return {
    titles,
    audience,
    affectedSurfaces,
    surfaceCategory: hiddenFromPublic ? "Internal reliability" as const : surfaceCategory,
    includesInternalReliability,
    hiddenFromPublic,
  };
}

function normalizeExistingNote(
  note: PublicReleaseNote,
  index: number,
  currentCounter: number,
): PublicReleaseNote {
  const betaReleaseCounter = typeof note.betaReleaseCounter === "number"
    ? note.betaReleaseCounter
    : Math.max(currentCounter - index, 0);
  const previousBetaReleaseCounter = betaReleaseCounter > 0 ? betaReleaseCounter - 1 : null;
  const version = formatBetaOdometerVersion(betaReleaseCounter);
  const previousVersion = previousBetaReleaseCounter === null
    ? INITIAL_PUBLIC_VERSION
    : formatBetaOdometerVersion(previousBetaReleaseCounter);
  const commitShas = Array.isArray(note.commitShas) && note.commitShas.length > 0
    ? note.commitShas
    : [note.commitSha].filter(Boolean);
  const commitCount = typeof note.commitCount === "number" && note.commitCount > 0
    ? note.commitCount
    : commitShas.length || 1;
  const commits = commitShas
    .map(getCommit)
    .filter((commit): commit is CommitRecord => Boolean(commit));
  const descriptor = deriveReleaseDescriptor(commits);
  const committedAtUtc = toUtcIso(note.committedAtUtc ?? note.committedAt);
  const generatedAtUtc = toUtcIso(note.generatedAtUtc ?? note.generatedAt);

  return {
    ...note,
    version,
    previousVersion,
    betaReleaseCounter,
    previousBetaReleaseCounter,
    commitCount,
    commitShas,
    committedAt: committedAtUtc,
    generatedAt: generatedAtUtc,
    committedAtUtc,
    generatedAtUtc,
    updatedAtUtc: note.updatedAtUtc || generatedAtUtc,
    category: classifyCategory(descriptor.titles, descriptor.affectedSurfaces, descriptor.surfaceCategory),
    title: buildReleaseTitle(descriptor.titles, descriptor.affectedSurfaces, descriptor.audience, descriptor.surfaceCategory),
    summary: buildReleaseSummary(
      descriptor.surfaceCategory,
      descriptor.audience,
      descriptor.includesInternalReliability,
      descriptor.affectedSurfaces,
      descriptor.titles,
    ),
    userFacingTitle: buildReleaseTitle(descriptor.titles, descriptor.affectedSurfaces, descriptor.audience, descriptor.surfaceCategory),
    surfaceCategory: descriptor.surfaceCategory,
    bullets: buildReleaseBullets(
      descriptor.titles,
      descriptor.affectedSurfaces,
      descriptor.audience,
      descriptor.surfaceCategory,
      descriptor.includesInternalReliability,
    ).map(ensureBulletVerb).slice(0, 5),
    audience: descriptor.audience,
    technicalDetails: buildTechnicalDetails(commitCount, descriptor.titles, descriptor.affectedSurfaces, descriptor.includesInternalReliability),
    affectedSurfaces: descriptor.affectedSurfaces,
    hiddenFromPublic: descriptor.hiddenFromPublic,
  };
}

function normalizeExistingDocument(document: PublicReleaseNotesDocument): PublicReleaseNotesDocument {
  const currentCounter = resolveCurrentBetaReleaseCounter(document.betaReleaseCounter ?? document.currentVersion);
  const generatedAtUtc = toUtcIso(document.generatedAtUtc ?? document.generatedAt);
  const notes = (document.notes ?? [])
    .slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT)
    .map((note, index) => normalizeExistingNote(note, index, currentCounter));

  return {
    currentVersion: formatBetaOdometerVersion(currentCounter),
    betaReleaseCounter: currentCounter,
    channel: PUBLIC_RELEASE_CHANNEL,
    generatedAt: generatedAtUtc,
    generatedAtUtc,
    lastCommitSha: document.lastCommitSha ?? "",
    notes,
  };
}

function createAggregatedNote(commits: CommitRecord[], previousCounter: number): PublicReleaseNote {
  const latestCommit = commits[commits.length - 1];
  const commitShas = commits.map((commit) => commit.sha);
  const descriptor = deriveReleaseDescriptor(commits);
  const nextCounter = previousCounter + 1;
  const generatedAtUtc = nowUtcIso();
  const title = buildReleaseTitle(descriptor.titles, descriptor.affectedSurfaces, descriptor.audience, descriptor.surfaceCategory);

  return {
    version: getNextBetaOdometerVersion(previousCounter),
    previousVersion: formatBetaOdometerVersion(previousCounter),
    betaReleaseCounter: nextCounter,
    previousBetaReleaseCounter: previousCounter,
    commitSha: latestCommit.sha,
    commitTitle: latestCommit.title,
    commitCount: commits.length,
    commitShas,
    committedAt: toUtcIso(latestCommit.committedAt),
    generatedAt: generatedAtUtc,
    committedAtUtc: toUtcIso(latestCommit.committedAt),
    generatedAtUtc,
    category: classifyCategory(descriptor.titles, descriptor.affectedSurfaces, descriptor.surfaceCategory),
    title,
    updatedAtUtc: generatedAtUtc,
    summary: buildReleaseSummary(
      descriptor.surfaceCategory,
      descriptor.audience,
      descriptor.includesInternalReliability,
      descriptor.affectedSurfaces,
      descriptor.titles,
    ),
    userFacingTitle: title,
    surfaceCategory: descriptor.surfaceCategory,
    bullets: buildReleaseBullets(
      descriptor.titles,
      descriptor.affectedSurfaces,
      descriptor.audience,
      descriptor.surfaceCategory,
      descriptor.includesInternalReliability,
    ).map(ensureBulletVerb).slice(0, 5),
    audience: descriptor.audience,
    technicalDetails: buildTechnicalDetails(commits.length, descriptor.titles, descriptor.affectedSurfaces, descriptor.includesInternalReliability),
    affectedSurfaces: descriptor.affectedSurfaces,
    hiddenFromPublic: descriptor.hiddenFromPublic,
  };
}

function renderFallbackTs(document: PublicReleaseNotesDocument) {
  const fallbackDocument = {
    ...document,
    notes: getPublicReleaseNotesVisibleNotes(document.notes, PUBLIC_RELEASE_NOTES_VISIBLE_COUNT),
  };

  return `import type { PublicReleaseNotesDocument } from "./release-version-contract";\n\nexport const PUBLIC_RELEASE_NOTES_FALLBACK = ${JSON.stringify(fallbackDocument, null, 2)} satisfies PublicReleaseNotesDocument;\n\nexport const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {\n  betaReleaseCounter: PUBLIC_RELEASE_NOTES_FALLBACK.betaReleaseCounter,\n  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,\n  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,\n} as const;\n\nexport const PUBLIC_APP_VERSION = PUBLIC_RELEASE_NOTES_VERSION_CONTEXT.appVersion;\n`;
}

function renderChangelog(notes: PublicReleaseNote[]) {
  const visibleNotes = getPublicReleaseNotesVisibleNotes(notes, PUBLIC_RELEASE_NOTES_MAX_COUNT);
  const lines = ["# Changelog", "", "User-facing KandyDrops Beta updates, newest first.", ""];
  for (const note of visibleNotes) {
    const committedAtUtc = note.committedAtUtc ?? toUtcIso(note.committedAt);
    const date = committedAtUtc.slice(0, 10);
    lines.push(
      `## [${note.version}] - ${date}`,
      "",
      `### ${note.surfaceCategory}`,
      "",
      `- Updated ${formatUtcTimestamp(note.updatedAtUtc || committedAtUtc)}`,
      `- ${note.title || note.userFacingTitle}`,
      `- ${note.summary}`,
    );
    for (const bullet of note.bullets.slice(0, 5)) lines.push(`- ${bullet}`);
    lines.push("");
  }
  return `${lines.join("\n").trim()}\n`;
}

function writeIfChanged(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (current !== content) writeFileSync(path, content);
}

function main() {
  const normalizedExisting = normalizeExistingDocument(readExistingDocument());
  const pendingCommits = getPendingCommits(normalizedExisting.lastCommitSha);
  let nextDocument = normalizedExisting;

  if (acceptRelease && pendingCommits.length > 0) {
    const nextDescriptor = deriveReleaseDescriptor(pendingCommits);
    if (nextDescriptor.hiddenFromPublic) {
      console.log("No product-facing unreleased commits found for an accepted beta release.");
    } else {
      const nextNote = createAggregatedNote(pendingCommits, normalizedExisting.betaReleaseCounter);
      const generatedAtUtc = nowUtcIso();
      nextDocument = {
        currentVersion: nextNote.version,
        betaReleaseCounter: nextNote.betaReleaseCounter,
        channel: PUBLIC_RELEASE_CHANNEL,
        generatedAt: generatedAtUtc,
        generatedAtUtc,
        lastCommitSha: nextNote.commitSha,
        notes: [nextNote, ...normalizedExisting.notes].slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT),
      };
    }
  } else if (acceptRelease && pendingCommits.length === 0) {
    console.log("No unreleased commits found for an accepted beta release.");
  } else {
    console.log("Release notes normalized without creating a new accepted beta release. Pass --accept or PUBLIC_BETA_ACCEPT_RELEASE=1 to publish the next beta release.");
  }

  writeIfChanged(publicJsonPath, `${JSON.stringify(nextDocument, null, 2)}\n`);
  writeIfChanged(fallbackTsPath, renderFallbackTs(nextDocument));
  writeIfChanged(changelogPath, renderChangelog(nextDocument.notes));
  console.log(`Public release notes current at v${nextDocument.currentVersion} (counter ${nextDocument.betaReleaseCounter}).`);
}

main();
