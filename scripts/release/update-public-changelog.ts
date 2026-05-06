import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  INITIAL_PUBLIC_VERSION,
  PUBLIC_RELEASE_CHANNEL,
  PUBLIC_RELEASE_NOTES_MAX_COUNT,
  PUBLIC_RELEASE_NOTES_VISIBLE_COUNT,
  bumpPublicVersion,
  classifyPublicVersionBump,
  isReleaseGeneratedArtifactPath,
  type PublicReleaseBumpType,
  type PublicReleaseAudience,
  type PublicReleaseNote,
  type PublicReleaseNoteCategory,
  type PublicReleaseNotesDocument,
} from "../../src/lib/release-notes/release-version-contract";

type CommitRecord = {
  sha: string;
  committedAt: string;
  title: string;
};

type NumstatRecord = {
  additions: number;
  deletions: number;
  path: string;
};

const root = process.cwd();
const publicJsonPath = join(root, "public/kandydrops-release-notes.json");
const fallbackTsPath = join(root, "src/lib/release-notes/public-release-notes.ts");
const changelogPath = join(root, "CHANGELOG.md");

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
    const generatedAtUtc = new Date(0).toISOString();
    return {
      currentVersion: INITIAL_PUBLIC_VERSION,
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
  const raw = lastCommitSha && safeRunGit(["rev-parse", "--verify", lastCommitSha])
    ? safeRunGit(["rev-list", "--reverse", `${lastCommitSha}..HEAD`])
    : safeRunGit(["rev-parse", "HEAD"]);
  const shas = raw ? raw.split(/\r?\n/u).filter(Boolean) : [];

  return shas
    .map(getCommit)
    .filter((commit): commit is CommitRecord => Boolean(commit))
    .filter((commit) => !/\[skip release-notes\]/iu.test(commit.title));
}

function parseNumstat(sha: string): NumstatRecord[] {
  const raw = safeRunGit(["show", "--numstat", "--format=", "--no-renames", sha]);
  if (!raw) return [];

  return raw.split(/\r?\n/u).flatMap((line) => {
    const [rawAdditions, rawDeletions, ...pathParts] = line.split(/\t/u);
    const path = pathParts.join("\t");
    if (!path) return [];

    return [{
      additions: Number.parseInt(rawAdditions, 10) || 0,
      deletions: Number.parseInt(rawDeletions, 10) || 0,
      path: path.replace(/\\/gu, "/"),
    }];
  });
}

function buildDiffStats(sha: string) {
  const stats = parseNumstat(sha);
  const packageJsonChanged = stats.some((item) => item.path === "package.json");
  const changedFiles = new Set(stats.map((item) => item.path));
  let rawAdditions = 0;
  let rawDeletions = 0;
  let effectiveAdditions = 0;
  let effectiveDeletions = 0;
  let excludedGeneratedChangeCount = 0;

  for (const item of stats) {
    const changeCount = item.additions + item.deletions;
    rawAdditions += item.additions;
    rawDeletions += item.deletions;

    if (isReleaseGeneratedArtifactPath(item.path, packageJsonChanged)) {
      excludedGeneratedChangeCount += changeCount;
      continue;
    }
    effectiveAdditions += item.additions;
    effectiveDeletions += item.deletions;
  }

  return {
    rawAdditions,
    rawDeletions,
    rawChangeCount: rawAdditions + rawDeletions,
    additions: rawAdditions,
    deletions: rawDeletions,
    effectiveAdditions,
    effectiveDeletions,
    changedFiles: changedFiles.size,
    effectiveChangeCount: effectiveAdditions + effectiveDeletions,
    excludedGeneratedChangeCount,
  };
}

function normalizeExistingNote(note: PublicReleaseNote): PublicReleaseNote {
  const diffStats = buildDiffStats(note.commitSha);
  const bumpType = classifyPublicVersionBump(diffStats.effectiveChangeCount);
  const committedAtUtc = toUtcIso(note.committedAtUtc ?? note.committedAt);
  const generatedAtUtc = toUtcIso(note.generatedAtUtc ?? note.generatedAt);
  const changedFiles = getChangedFiles(note.commitSha);
  const affectedSurfaces = note.affectedSurfaces?.length ? note.affectedSurfaces : affectedSurfacesFor(changedFiles);
  const category = normalizeAppStoreCategory(note.commitTitle, note.category, affectedSurfaces);
  const title = !note.title || note.title === "Bug fixes and quality-of-life improvements"
    ? buildAppStoreTitle(note.commitTitle, category, affectedSurfaces)
    : note.title;
  const summary = note.summary || buildAppStoreSummary(note.commitTitle, category, affectedSurfaces);
  const bullets = buildAppStoreBullets(note.commitTitle, category, affectedSurfaces, note.bullets);

  return {
    ...note,
    committedAt: committedAtUtc,
    generatedAt: generatedAtUtc,
    committedAtUtc,
    generatedAtUtc,
    diffStats,
    bumpType,
    category,
    title,
    updatedAtUtc: note.updatedAtUtc || generatedAtUtc,
    summary,
    userFacingTitle: title,
    bullets,
    audience: note.audience || resolveAudience(note.commitTitle, affectedSurfaces),
    technicalDetails: note.technicalDetails || buildTechnicalDetails(note.commitTitle, affectedSurfaces),
    affectedSurfaces,
  };
}

function normalizeExistingDocument(document: PublicReleaseNotesDocument): PublicReleaseNotesDocument {
  const generatedAtUtc = toUtcIso(document.generatedAtUtc ?? document.generatedAt);

  return {
    ...document,
    generatedAt: generatedAtUtc,
    generatedAtUtc,
    notes: document.notes.map(normalizeExistingNote),
  };
}

function getChangedFiles(sha: string) {
  return parseNumstat(sha).map((item) => item.path);
}

function classifyCategory(title: string, changedFiles: string[]): PublicReleaseNoteCategory {
  const normalized = title.toLowerCase();
  if (/^(security|sec)(\(|:)/u.test(normalized)) return "Security";
  if (/^perf(\(|:)/u.test(normalized)) return "Improved";
  if (/^fix(\(|:)/u.test(normalized)) return "Fixed";
  if (/^feat(\(|:)/u.test(normalized)) return "New";

  const touchesUserSurface = changedFiles.some((path) =>
    path.startsWith("src/app/")
    || path.startsWith("src/components/")
    || path.startsWith("src/hooks/")
    || path.startsWith("public/"),
  );

  if (/^(docs|chore|test)(\(|:)/u.test(normalized) && !touchesUserSurface) return "Admin";
  return "Improved";
}

function affectedSurfacesFor(paths: string[]) {
  const surfaces = new Set<string>();
  for (const path of paths) {
    if (path.includes("ReleaseNotes") || path.includes("release-notes") || path.includes("kandydrops-release-notes") || path === "CHANGELOG.md") surfaces.add("release-notes");
    if (path.includes("Navbar") || path.includes("Navigation/")) surfaces.add("navigation");
    if (path.includes("telemetry")) surfaces.add("telemetry");
    if (path.startsWith("docs/") || path === "README.md" || path === "AGENTS.md") surfaces.add("documentation");
    if (path.startsWith("scripts/") || path === "package.json" || path.startsWith(".github/")) surfaces.add("repo-tooling");
    if (path.includes("wallet") || path.includes("paypal")) surfaces.add("wallet");
    if (path.includes("chat")) surfaces.add("chat");
    if (path.includes("admin")) surfaces.add("admin");
    if (path.includes("security")) surfaces.add("security");
  }
  return surfaces.size > 0 ? Array.from(surfaces).sort() : ["app"];
}

function isInternalBetaStabilizationChange(title: string, surfaces: string[]) {
  const normalized = title.toLowerCase();
  const internalOnlyPrefixes = /^(docs|chore|test|audit)(\(|:)/u.test(normalized);
  const toolingOnly = surfaces.every((surface) =>
    ["documentation", "repo-tooling", "release-notes"].includes(surface),
  );

  return internalOnlyPrefixes && toolingOnly;
}

function shippedBetaBadgeFeature(title: string) {
  const normalized = title.toLowerCase();
  return normalized.includes("add beta release notes badge")
    || normalized.includes("beta release notes badge")
    || normalized.includes("public beta release notes badge");
}

const releaseBulletVerbs = ["Added", "Clarified", "Fixed", "Improved", "Reduced", "Updated"] as const;

function normalizeAppStoreCategory(
  title: string,
  category: PublicReleaseNoteCategory,
  surfaces: string[],
): PublicReleaseNoteCategory {
  const normalized = title.toLowerCase();
  if (category === "Security") return "Security";
  if (shippedBetaBadgeFeature(title)) return "New";
  if (normalized.startsWith("feat")) return "New";
  if (normalized.startsWith("fix")) return "Fixed";
  if (surfaces.includes("admin") || surfaces.includes("repo-tooling") || surfaces.includes("documentation")) return "Admin";
  if (category === "Added") return "New";
  if (category === "Internal" || category === "Changed" || category === "Performance") return "Improved";
  return category;
}

function resolveAudience(title: string, surfaces: string[]): PublicReleaseAudience {
  const normalized = title.toLowerCase();
  if (surfaces.includes("admin") || normalized.includes("admin") || normalized.includes("debug")) return "admins";
  if (surfaces.includes("wallet") || surfaces.includes("chat") || surfaces.includes("navigation")) return "users";
  if (normalized.includes("creator")) return "creators";
  return "all";
}

function cleanReleaseCopy(value: string) {
  return value
    .replace(/\broute runtime\b/giu, "health")
    .replace(/\btelemetry parity\b/giu, "tracking checks")
    .replace(/\bsourceTruth\b/gu, "source")
    .replace(/\bFirestore\b/gu, "data")
    .replace(/\bgeneratedAt\b/gu, "updated time")
    .replace(/\bmaterializer\b/giu, "background update")
    .replace(/\bcanonical\b/giu, "verified")
    .replace(/\bstale sample\b/giu, "older sample")
    .replace(/\bunlock(s|ed|ing)?\b/giu, (match) => {
      const lower = match.toLowerCase();
      if (lower === "unlocks") return "unwraps";
      if (lower === "unlocked") return "unwrapped";
      if (lower === "unlocking") return "unwrapping";
      return "unwrap";
    })
    .replace(/\s+/gu, " ")
    .trim();
}

function ensureReleaseVerb(value: string) {
  const trimmed = cleanReleaseCopy(value).replace(/\.$/u, "");
  if (releaseBulletVerbs.some((verb) => trimmed.startsWith(`${verb} `))) return `${trimmed}.`;
  return `Improved ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}.`;
}

function buildAppStoreTitle(title: string, category: PublicReleaseNoteCategory, surfaces: string[]) {
  const normalized = title.toLowerCase();
  if (shippedBetaBadgeFeature(title) || surfaces.includes("release-notes")) return "Improved Beta update notes";
  if (normalized.includes("admin") && normalized.includes("truth")) return "Improved admin status accuracy";
  if (normalized.includes("gumdrops") || normalized.includes("treasury") || normalized.includes("economy")) return "Improved GumDrops review tools";
  if (normalized.includes("task") && normalized.includes("reward")) return "Improved task reward accuracy";
  if (normalized.includes("transaction") || normalized.includes("receipt") || normalized.includes("commerce")) return "Improved transaction review";
  if (normalized.includes("top drop") || normalized.includes("drop conversion")) return "Improved drop conversion review";
  if (normalized.includes("content conversion")) return "Improved content conversion review";
  if (normalized.includes("package performance")) return "Improved package performance review";
  if (normalized.includes("viewer") || normalized.includes("watch")) return "Improved viewer analytics";
  if (normalized.includes("notification")) return "Improved notification reporting";
  if (normalized.includes("daily task")) return "Improved daily task tracking";
  if (normalized.includes("route") || normalized.includes("runtime") || normalized.includes("debug")) return "Improved admin health labels";
  if (normalized.includes("ai")) return "Improved admin AI status";
  if (normalized.includes("creator")) return "Improved creator review tools";
  if (category === "Security") return "Improved safety checks";
  if (category === "New") return "Added Beta improvements";
  if (category === "Fixed") return "Bug fixes and quality-of-life improvements";
  if (category === "Admin") return "Improved admin reliability";
  return "Improved Beta reliability";
}

function buildAppStoreSummary(title: string, category: PublicReleaseNoteCategory, surfaces: string[]) {
  const audience = resolveAudience(title, surfaces);
  if (audience === "admins") return "Bug fixes and quality-of-life improvements for admin review tools.";
  if (category === "Security") return "Safety and reliability improvements for the beta.";
  if (surfaces.includes("release-notes")) return "Cleaner Beta update notes with clearer summaries and timestamps.";
  return "Bug fixes and quality-of-life improvements.";
}

function buildAdminBullets(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("route") || normalized.includes("runtime")) {
    return [
      "Fixed an issue where unavailable health checks could appear successful.",
      "Improved labels for loaded, delayed, missing, and older samples.",
      "Reduced confusing status messages in admin tools.",
    ];
  }
  if (normalized.includes("transaction") || normalized.includes("receipt") || normalized.includes("commerce")) {
    return [
      "Added clearer names to recent transaction rows.",
      "Improved GumDrops transaction labels and timestamps for admin review.",
      "Clarified unavailable commerce details instead of showing waiting states.",
    ];
  }
  if (normalized.includes("top drop") || normalized.includes("drop conversion")) {
    return [
      "Improved drop rows with readable names instead of long IDs.",
      "Clarified unwrap counts and small conversion percentages.",
      "Added page controls when more drop rows are available.",
    ];
  }
  if (normalized.includes("content conversion")) {
    return [
      "Improved content conversion rows so available preview and unwrap data can appear.",
      "Clarified when content details are missing or unavailable.",
      "Updated content group labels for easier admin review.",
    ];
  }
  if (normalized.includes("package performance")) {
    return [
      "Improved GumDrops package rows so purchase data can appear when available.",
      "Clarified when checkout data is unavailable for package conversion.",
      "Updated package labels, prices, and GumDrops values for review.",
    ];
  }
  if (normalized.includes("task") && normalized.includes("reward")) {
    return [
      "Clarified which task rewards were earned versus only available.",
      "Improved reward totals so expired tasks do not inflate paid rewards.",
      "Updated admin labels for task reward review.",
    ];
  }
  if (normalized.includes("viewer") || normalized.includes("watch")) {
    return [
      "Clarified verified and estimated viewer watch time.",
      "Improved stale and quiet viewer activity labels.",
      "Updated viewer rows to use readable names where available.",
    ];
  }
  if (normalized.includes("debug") || normalized.includes("truth") || normalized.includes("admin")) {
    return [
      "Fixed admin labels that could appear stuck after data loaded.",
      "Improved how hidden, delayed, or unavailable data is labeled.",
      "Reduced confusing status messages in Beta admin tools.",
    ];
  }
  return [
    "Improved admin reliability and status accuracy.",
    "Clarified unavailable data without showing fake zeroes.",
    "Updated labels for review and support follow-up.",
  ];
}

function buildAppStoreBullets(
  title: string,
  category: PublicReleaseNoteCategory,
  surfaces: string[],
  existingBullets: string[] = [],
) {
  const normalized = title.toLowerCase();
  let bullets: string[];
  if (surfaces.includes("release-notes") || normalized.includes("release notes") || normalized.includes("beta")) {
    bullets = [
      "Improved Beta notes with cleaner summaries and compact bullets.",
      "Updated timestamps so recent changes are easier to compare with reports.",
      "Reduced technical wording in public update notes.",
    ];
  } else if (resolveAudience(title, surfaces) === "admins") {
    bullets = buildAdminBullets(title);
  } else if (category === "Security") {
    bullets = [
      "Improved safety checks behind the scenes.",
      "Updated admin review labels for clearer follow-up.",
    ];
  } else if (existingBullets.length > 0 && !existingBullets.some((bullet) => /Kept the update focused/iu.test(bullet))) {
    bullets = existingBullets;
  } else {
    bullets = [
      "Fixed a beta issue to make KandyDrops smoother to use.",
      "Improved labels and loading states in the app.",
    ];
  }

  const uniqueBullets = Array.from(new Set(bullets.map(ensureReleaseVerb))).slice(0, 5);
  return uniqueBullets.length >= 2 ? uniqueBullets : [...uniqueBullets, "Improved Beta reliability."];
}

function buildTechnicalDetails(title: string, surfaces: string[]) {
  const normalized = title.toLowerCase();
  const details: string[] = [];
  if (normalized.includes("route") || normalized.includes("runtime")) {
    details.push("Route health labels now distinguish unseen, stale, and loaded states.");
    details.push("Runtime rows no longer show fake success states.");
  }
  if (normalized.includes("source") || normalized.includes("truth") || normalized.includes("analytics")) {
    details.push("Admin metrics keep source, range, and freshness details separate from public summaries.");
  }
  if (normalized.includes("unlock") || normalized.includes("unwrap")) {
    details.push("Display language uses unwrap; backend entitlement fields may still use unlock.");
  }
  if (surfaces.includes("release-notes")) {
    details.push("Release note summaries are generated separately from collapsed technical details.");
  }
  return details.length > 0 ? details : undefined;
}

function buildUserFacingTitle(title: string, category: PublicReleaseNoteCategory, surfaces: string[]) {
  const normalized = title.toLowerCase();
  if (normalized.includes("debug-first") || normalized.includes("stabilization roadmap") || normalized.includes("roadmap")) {
    return "Improved beta stabilization guidance so fixes stay focused and easier to track.";
  }
  if (normalized.includes("refresh system health truth") || normalized.includes("health reporting")) {
    return "Improved internal health reporting so beta issues show fresher, clearer status.";
  }
  if (normalized.includes("separate diagnostics sample freshness") || normalized.includes("diagnostics sample freshness")) {
    return "Improved internal diagnostics timing so health panels separate current issues from older samples.";
  }
  if (normalized.includes("clarify downstream writer freshness") || normalized.includes("downstream writer freshness")) {
    return "Improved internal health panels so writer freshness and repeated diagnostics are easier to read.";
  }
  if (normalized.includes("classify debug signals by severity") || normalized.includes("debug signals by severity")) {
    return "Improved internal debug status labels so inventory counts do not look like system failures.";
  }
  if (normalized.includes("clarify task issue attribution") || normalized.includes("task issue attribution")) {
    return "Improved internal task assignment diagnostics.";
  }
  if (normalized.includes("dedupe debug repair proposals") || normalized.includes("debug repair proposals")) {
    return "Improved internal repair proposal grouping so duplicate debug actions are easier to review.";
  }
  if (normalized.includes("group inspect-only repair proposals") || normalized.includes("inspect-only repair proposals")) {
    return "Improved internal repair proposal grouping so repeated debug items are easier to review.";
  }
  if (normalized.includes("clarify bug intake triage states") || normalized.includes("bug intake triage")) {
    return "Improved internal bug report triage labels so loaded reports no longer appear stuck.";
  }
  if (normalized.includes("clarify route runtime health states") || normalized.includes("route runtime health states")) {
    return "Improved internal route health labels so loaded runtime metrics no longer appear stuck.";
  }
  if (normalized.includes("correct route runtime sample states") || normalized.includes("route runtime sample states")) {
    return "Improved internal route runtime labels so unseen routes no longer appear as fake successes.";
  }
  if (normalized.includes("enrich recent transaction identities") || normalized.includes("recent transaction identities")) {
    return "Improved internal transaction review so admins can identify users more easily.";
  }
  if (normalized.includes("enrich queue runtime drop labels") || normalized.includes("queue runtime drop labels")) {
    return "Improved internal queue health views so drop activation outcomes show readable drop names.";
  }
  if (normalized.includes("clarify session config readiness") || normalized.includes("session config readiness")) {
    return "Clarified internal admin readiness checks so config presence is not confused with live service health.";
  }
  if (normalized.includes("normalize recent event flow context")) {
    return "Improved internal event-flow diagnostics so background system events are not confused with user actions.";
  }
  if (normalized.includes("materialize daily task reset windows") || normalized.includes("daily task reset windows")) {
    return "Improved daily task reset reliability so tasks are prepared on the daily schedule.";
  }
  if (normalized.includes("separate paid and potential rewards") || normalized.includes("paid and potential rewards")) {
    return "Improved daily task reward tracking so task totals reflect completed rewards more accurately.";
  }
  if (normalized.includes("clarify recent event flow context") || normalized.includes("recent event flow context")) {
    return "Improved internal event-flow diagnostics so background events and user actions are easier to tell apart.";
  }
  if (normalized.includes("refresh creator lane parity evidence") || normalized.includes("creator review status")) {
    return "Improved internal creator review status checks.";
  }
  if (normalized.includes("annotate missing id request history evidence") || normalized.includes("id request history")) {
    return "Improved internal creator review history checks.";
  }
  if (
    normalized.includes("downgrade optional owner override reason")
    || normalized.includes("owner override reason")
    || normalized.includes("admin override rules")
  ) {
    return "Adjusted internal creator review warnings to match admin override rules.";
  }
  if (
    normalized.includes("require default live creator settings")
    || normalized.includes("default live creator settings")
    || normalized.includes("creator experience defaults")
    || normalized.includes("synthetic creator default settings")
  ) {
    return "Improved internal creator experience defaults for beta reliability.";
  }
  if (
    normalized.includes("classify synthetic agreement evidence")
    || normalized.includes("classify synthetic countersign evidence")
    || normalized.includes("internal creator classification")
    || normalized.includes("synthetic agreement evidence")
    || normalized.includes("synthetic countersign evidence")
  ) {
    return "Improved internal creator classification checks.";
  }
  if (isInternalBetaStabilizationChange(title, surfaces)) {
    return "Improved internal beta reliability and support traceability.";
  }
  if (shippedBetaBadgeFeature(title)) {
    return "Added a Beta badge with app update notes in the top navigation.";
  }
  if (
    normalized.includes("verify media and firestore guard evidence")
    || normalized.includes("media and session safety checks")
  ) {
    return "Improved internal media and session safety checks.";
  }
  if (
    normalized.includes("guard creator id document egress")
    || (normalized.includes("creator id document") && normalized.includes("egress"))
    || (normalized.includes("creator verification") && normalized.includes("documents"))
  ) {
    return "Improved internal safety checks for creator verification documents.";
  }
  if (
    normalized.includes("guard creator agreement document egress")
    || (normalized.includes("creator agreement") && normalized.includes("document") && normalized.includes("egress"))
    || (normalized.includes("creator agreement") && normalized.includes("document safety"))
  ) {
    return "Improved safety checks for creator agreement document access.";
  }
  if (
    normalized.includes("prove admin content entitlement scope")
    || normalized.includes("protect locked content access")
    || (normalized.includes("admin") && normalized.includes("content") && normalized.includes("entitlement"))
  ) {
    return "Improved internal checks that protect locked content access.";
  }
  if (
    normalized.includes("guard admin content media egress")
    || normalized.includes("prevent unnecessary storage traffic")
    || (normalized.includes("admin") && normalized.includes("content") && normalized.includes("media egress"))
  ) {
    return "Improved internal media safety checks to prevent unnecessary storage traffic.";
  }
  if (
    normalized.includes("guard content storage route evidence")
    || (normalized.includes("admin") && normalized.includes("content") && normalized.includes("storage"))
  ) {
    return "Improved internal content safety checks for admin media tools.";
  }
  if (
    normalized.includes("refresh navigation session read bounds")
    || normalized.includes("navigation session read bounds")
    || normalized.includes("navigation session firestore read bounds")
    || normalized.includes("prove navigation session firestore read bounds")
    || (normalized.includes("auth") && normalized.includes("navigation session") && normalized.includes("firestore"))
  ) {
    return "Improved behind-the-scenes session safety checks.";
  }
  if (
    normalized.includes("make attachment cancel idempotent")
    || normalized.includes("refresh attachment cancel idempotency")
    || normalized.includes("attachment cancel idempotency")
    || normalized.includes("attachment cancel idempotent")
  ) {
    return "Improved reliability for canceling pending chat attachments.";
  }
  if (
    normalized.includes("bound attachment completion lookup")
    || (normalized.includes("chat") && normalized.includes("attachment") && normalized.includes("completion"))
  ) {
    return "Improved behind-the-scenes safety checks for chat media uploads.";
  }
  if (
    normalized.includes("bound attachment cancel lookup")
    || (normalized.includes("chat") && normalized.includes("attachment") && normalized.includes("cancel"))
  ) {
    return "Improved behind-the-scenes safety checks for chat attachments.";
  }
  if (surfaces.includes("release-notes")) {
    return "Improved Beta update notes so changes are easier to match with support reports.";
  }
  if (normalized.includes("chat")) {
    return "Improved chat spacing and stability for a cleaner mobile experience.";
  }
  if (normalized.includes("wallet") || normalized.includes("paypal")) {
    return "Improved wallet checkout clarity behind the scenes.";
  }
  if (category === "Security" || normalized.includes("security")) {
    return "Improved security checks behind the scenes.";
  }
  if (normalized.includes("admin")) {
    return "Improved internal admin tools used to keep beta features stable.";
  }
  if (normalized.includes("doctrine") || normalized.startsWith("docs")) {
    return "Updated internal product guidance so future fixes stay more consistent.";
  }
  if (category === "Fixed") return "Fixed a beta issue to make KandyDrops smoother to use.";
  if (category === "Performance") return "Improved app speed and reliability behind the scenes.";
  if (category === "Internal") return "Improved internal beta reliability.";
  return "Updated KandyDrops with a small beta improvement.";
}

function buildBullets(category: PublicReleaseNoteCategory, surfaces: string[]) {
  if (surfaces.includes("release-notes")) {
    return [
      "Beta notes stay user-safe while preserving enough detail for support follow-up.",
      "UTC timestamps make updates easier to compare with screenshots, reports, and incidents.",
    ];
  }
  if (category === "Security") return ["Improved security checks behind the scenes."];
  if (category === "Performance") return ["Reduced behind-the-scenes friction for a smoother beta."];
  if (category === "Internal") return ["Improved internal beta reliability without changing your core flows."];
  return ["Kept the update focused on user-visible polish and reliability."];
}

function createNote(commit: CommitRecord, previousVersion: string, isInitial: boolean): PublicReleaseNote {
  const changedFiles = getChangedFiles(commit.sha);
  const diffStats = buildDiffStats(commit.sha);
  const bumpType = classifyPublicVersionBump(diffStats.effectiveChangeCount);
  const nextVersion = isInitial ? INITIAL_PUBLIC_VERSION : bumpPublicVersion(previousVersion, bumpType);
  const category = classifyCategory(commit.title, changedFiles);
  const affectedSurfaces = affectedSurfacesFor(changedFiles);
  const appCategory = normalizeAppStoreCategory(commit.title, category, affectedSurfaces);
  const committedAtUtc = toUtcIso(commit.committedAt);
  const generatedAtUtc = nowUtcIso();
  const title = buildAppStoreTitle(commit.title, appCategory, affectedSurfaces);

  return {
    version: nextVersion,
    previousVersion,
    commitSha: commit.sha,
    commitTitle: commit.title,
    committedAt: committedAtUtc,
    generatedAt: generatedAtUtc,
    committedAtUtc,
    generatedAtUtc,
    diffStats,
    bumpType: bumpType as PublicReleaseBumpType,
    category: appCategory,
    title,
    updatedAtUtc: generatedAtUtc,
    summary: buildAppStoreSummary(commit.title, appCategory, affectedSurfaces),
    userFacingTitle: title,
    bullets: buildAppStoreBullets(commit.title, appCategory, affectedSurfaces, buildBullets(category, affectedSurfaces)),
    audience: resolveAudience(commit.title, affectedSurfaces),
    technicalDetails: buildTechnicalDetails(commit.title, affectedSurfaces),
    affectedSurfaces,
  };
}

function renderFallbackTs(document: PublicReleaseNotesDocument) {
  const fallbackDocument = {
    ...document,
    notes: document.notes.slice(0, PUBLIC_RELEASE_NOTES_VISIBLE_COUNT),
  };

  return `import type { PublicReleaseNotesDocument } from "./release-version-contract";\n\nexport const PUBLIC_RELEASE_NOTES_FALLBACK = ${JSON.stringify(fallbackDocument, null, 2)} satisfies PublicReleaseNotesDocument;\n\nexport const PUBLIC_RELEASE_NOTES_VERSION_CONTEXT = {\n  appVersion: PUBLIC_RELEASE_NOTES_FALLBACK.currentVersion,\n  releaseChannel: PUBLIC_RELEASE_NOTES_FALLBACK.channel,\n} as const;\n`;
}

function renderChangelog(notes: PublicReleaseNote[]) {
  const lines = ["# Changelog", "", "User-facing KandyDrops Beta updates, newest first.", ""];
  for (const note of notes) {
    const committedAtUtc = note.committedAtUtc ?? toUtcIso(note.committedAt);
    const date = committedAtUtc.slice(0, 10);
    lines.push(
      `## [${note.version}] - ${date}`,
      "",
      `### ${note.category}`,
      "",
      `- Updated ${formatUtcTimestamp(committedAtUtc)}`,
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
  const existing = normalizeExistingDocument(readExistingDocument());
  const pendingCommits = getPendingCommits(existing.lastCommitSha);
  if (pendingCommits.length === 0 && existsSync(publicJsonPath) && existsSync(fallbackTsPath) && existsSync(changelogPath)) {
    writeIfChanged(publicJsonPath, `${JSON.stringify(existing, null, 2)}\n`);
    writeIfChanged(fallbackTsPath, renderFallbackTs(existing));
    writeIfChanged(changelogPath, renderChangelog(existing.notes));
    console.log("Public release notes already current.");
    return;
  }

  let currentVersion = existing.currentVersion || INITIAL_PUBLIC_VERSION;
  const newNotes: PublicReleaseNote[] = [];
  for (const commit of pendingCommits) {
    const note = createNote(commit, currentVersion, existing.notes.length === 0 && newNotes.length === 0);
    currentVersion = note.version;
    newNotes.push(note);
  }

  const nextNotes = [...newNotes.reverse(), ...existing.notes].slice(0, PUBLIC_RELEASE_NOTES_MAX_COUNT);
  const generatedAtUtc = nowUtcIso();
  const nextDocument: PublicReleaseNotesDocument = {
    currentVersion,
    channel: PUBLIC_RELEASE_CHANNEL,
    generatedAt: generatedAtUtc,
    generatedAtUtc,
    lastCommitSha: newNotes[0]?.commitSha ?? existing.lastCommitSha,
    notes: nextNotes,
  };

  writeIfChanged(publicJsonPath, `${JSON.stringify(nextDocument, null, 2)}\n`);
  writeIfChanged(fallbackTsPath, renderFallbackTs(nextDocument));
  writeIfChanged(changelogPath, renderChangelog(nextNotes));
  console.log(`Public release notes current at v${nextDocument.currentVersion}.`);
}

main();
