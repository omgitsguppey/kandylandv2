import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "P0" | "P1" | "P2";

type Finding = {
  id: string;
  severity: Severity;
  status: "pass" | "fail" | "note";
  file?: string;
  summary: string;
};

type CreatorProfileMobileTimelineReport = {
  generatedAtUtc: string;
  reportKey: "creator-profile-mobile-timeline";
  currentHead: string;
  summary: {
    broadcastTimelinePrepDetected: boolean;
    timelineContractDetected: boolean;
    creatorDropContractDetected: boolean;
    mobileHeaderCompact: boolean;
    profileCountDensityCompact: boolean;
    compactButtonsPresent: boolean;
    timelineFeedRendered: boolean;
    timelineUsesSharedContract: boolean;
    pendingDraftExcluded: boolean;
    duplicateDropCardAvoided: boolean;
    protectedNavChatUntouched: boolean;
    releaseNotesUpdated: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  uiFindings: Finding[];
  timelineFindings: Finding[];
  protectedFileDiffs: string[];
  fixesApplied: string[];
  nextFixOrder: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const reportPath = join(repoRoot, "agent", "state", "creator-profile-mobile-timeline.generated.json");
const docPath = join(repoRoot, "docs", "agent-truth", "creator-profile-mobile-timeline.md");

const files = {
  header: "src/components/Creators/CreatorProfileHeader.tsx",
  client: "src/app/creators/[username]/CreatorProfileClient.tsx",
  feed: "src/components/Creators/CreatorProfileTimelineFeed.tsx",
  timelineContract: "src/lib/creator-profile/timeline-contract.ts",
  broadcastArtifact: "agent/state/creator-broadcast-timeline-prep.generated.json",
  dropSubmissionContract: "src/lib/drops/drop-submission-contract.ts",
  packageJson: "package.json",
  releaseNotes: "public/kandydrops-release-notes.json",
};

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function optionalRead(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function changedFiles() {
  const unstaged = execFileSync("git", ["diff", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged])).map((file) => file.replaceAll("\\", "/"));
}

function isProtectedPath(file: string) {
  return /^src\/components\/Navigation\//u.test(file)
    || /^src\/components\/Chat\//u.test(file)
    || /^src\/app\/chat\//u.test(file)
    || /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u.test(file);
}

function okFinding(id: string, ok: boolean, summary: string, file?: string, severity: Severity = "P1"): Finding {
  return {
    id,
    severity,
    status: ok ? "pass" : "fail",
    file,
    summary,
  };
}

function countFailures(findings: Finding[], severity: Severity) {
  return findings.filter((finding) => finding.status === "fail" && finding.severity === severity).length;
}

function buildReport(): CreatorProfileMobileTimelineReport {
  const header = read(files.header);
  const client = read(files.client);
  const feed = read(files.feed);
  const timelineContract = read(files.timelineContract);
  const packageJson = read(files.packageJson);
  const releaseNotes = read(files.releaseNotes);
  const changed = changedFiles();
  const protectedFileDiffs = changed.filter(isProtectedPath);

  const broadcastTimelinePrepDetected = existsSync(join(repoRoot, files.broadcastArtifact))
    && optionalRead(files.broadcastArtifact).includes("\"timelineContractCreated\": true");
  const timelineContractDetected = timelineContract.includes("buildCreatorProfileTimeline")
    && timelineContract.includes("sourceTruth: \"published_creator_broadcast\"")
    && timelineContract.includes("status !== \"published\" && status !== \"sent\"");
  const creatorDropContractDetected = existsSync(join(repoRoot, files.dropSubmissionContract))
    || read("src/app/api/creators/[username]/route.ts").includes("sanitizeDropForClient");
  const mobileHeaderCompact = header.includes("data-creator-profile-mobile-scale=\"compact\"")
    && header.includes("h-20 w-20")
    && !header.includes("text-2xl font-black tracking-tight text-white sm:text-4xl");
  const profileCountDensityCompact = header.includes("data-profile-count-density=\"compact\"")
    && header.includes("text-lg font-black text-white sm:mt-1 sm:text-2xl")
    && !header.includes("mt-1 text-2xl font-black text-white");
  const compactButtonsPresent = header.includes("min-h-11")
    && header.includes("text-xs font-bold")
    && header.includes("sm:text-sm");
  const timelineFeedRendered = client.includes("CreatorProfileTimelineFeed")
    && client.includes("visibleTimelineItems")
    && feed.includes("data-creator-profile-timeline-feed=\"true\"")
    && feed.includes("data-creator-profile-timeline-card");
  const timelineUsesSharedContract = client.includes("import type { CreatorProfileTimelineItem }")
    && feed.includes("import type { CreatorProfileTimelineItem }")
    && feed.includes("data-creator-profile-timeline-source=\"creator_profile_timeline_contract\"");
  const pendingDraftExcluded = timelineContract.includes("status !== \"active\"")
    && timelineContract.includes("status !== \"published\" && status !== \"sent\"")
    && timelineContract.includes("timelineEligible === false");
  const duplicateDropCardAvoided = !existsSync(join(repoRoot, "src", "components", "Creators", "CreatorTimelineDropCard.tsx"))
    && feed.includes("onOpenDrop(drop)")
    && !feed.includes("DropCard");
  const protectedNavChatUntouched = protectedFileDiffs.length === 0;
  const releaseNotesUpdated = releaseNotes.includes("Reduced creator profile header scale on mobile.")
    && releaseNotes.includes("Prepared creator profiles for drop and broadcast timelines.")
    && releaseNotes.includes("Kept private and pending creator content hidden from public profiles.");

  const dependencyFindings: Finding[] = [
    okFinding("broadcast-timeline-prep", broadcastTimelinePrepDetected, "Broadcast timeline prep artifact is present and reports timeline contract readiness.", files.broadcastArtifact, "P2"),
    okFinding("timeline-contract", timelineContractDetected, "Creator profile timeline contract exists and filters broadcast visibility.", files.timelineContract, "P0"),
    okFinding("creator-drop-contract", creatorDropContractDetected, "Public profile keeps approved public drops sanitized through existing drop contract/read model.", "src/app/api/creators/[username]/route.ts", "P1"),
  ];
  const uiFindings: Finding[] = [
    okFinding("mobile-header-compact", mobileHeaderCompact, "Creator profile header uses compact mobile scale markers and smaller mobile avatar/title.", files.header, "P1"),
    okFinding("count-density-compact", profileCountDensityCompact, "Follower and Drop counts use compact mobile font sizes.", files.header, "P1"),
    okFinding("compact-buttons", compactButtonsPresent, "Follow, message, and alerts actions keep touch targets while reducing mobile visual weight.", files.header, "P2"),
    okFinding("protected-nav-chat", protectedNavChatUntouched, "Top nav, bottom nav, and chat files are untouched.", undefined, "P0"),
  ];
  const timelineFindings: Finding[] = [
    okFinding("timeline-feed-rendered", timelineFeedRendered, "Public profile renders a compact mixed timeline feed from the existing profile data.", files.feed, "P0"),
    okFinding("timeline-contract-used", timelineUsesSharedContract, "Timeline feed uses the shared creator profile timeline contract type/source marker.", files.feed, "P0"),
    okFinding("pending-draft-excluded", pendingDraftExcluded, "Timeline contract excludes pending drops and draft or ineligible broadcasts.", files.timelineContract, "P0"),
    okFinding("duplicate-drop-card-avoided", duplicateDropCardAvoided, "Profile timeline does not add a duplicate Drop card component.", files.feed, "P1"),
    okFinding("package-script", packageJson.includes("\"check:creator-profile-mobile-timeline\""), "Package check script is wired.", files.packageJson, "P1"),
    okFinding("release-notes", releaseNotesUpdated, "Same-commit public beta release note bullets are present.", files.releaseNotes, "P2"),
  ];

  const allFindings = [...dependencyFindings, ...uiFindings, ...timelineFindings];
  const report: CreatorProfileMobileTimelineReport = {
    generatedAtUtc: new Date().toISOString(),
    reportKey: "creator-profile-mobile-timeline",
    currentHead: currentHead(),
    summary: {
      broadcastTimelinePrepDetected,
      timelineContractDetected,
      creatorDropContractDetected,
      mobileHeaderCompact,
      profileCountDensityCompact,
      compactButtonsPresent,
      timelineFeedRendered,
      timelineUsesSharedContract,
      pendingDraftExcluded,
      duplicateDropCardAvoided,
      protectedNavChatUntouched,
      releaseNotesUpdated,
      p0Count: countFailures(allFindings, "P0"),
      p1Count: countFailures(allFindings, "P1"),
      p2Count: countFailures(allFindings, "P2"),
    },
    dependencyFindings,
    uiFindings,
    timelineFindings,
    protectedFileDiffs,
    fixesApplied: [
      "Reduced creator public profile header/avatar/count/button scale on mobile.",
      "Rendered a compact mixed profile timeline from the existing creator profile timeline contract.",
      "Kept pending drops and draft broadcasts filtered through the shared timeline contract.",
    ],
    nextFixOrder: [
      "Add richer media previews to timeline cards after a shared compact Drop card variant exists.",
      "Add browser screenshot evidence for the creator profile mobile timeline in a separate visual QA pass.",
    ],
  };

  return report;
}

function writeDoc(report: CreatorProfileMobileTimelineReport) {
  const markdown = `# Creator Profile Mobile Timeline

Generated: ${report.generatedAtUtc}

## Summary

- Broadcast timeline prep detected: ${report.summary.broadcastTimelinePrepDetected}
- Timeline contract detected: ${report.summary.timelineContractDetected}
- Mobile header compact: ${report.summary.mobileHeaderCompact}
- Profile count density compact: ${report.summary.profileCountDensityCompact}
- Timeline feed rendered: ${report.summary.timelineFeedRendered}
- Pending/draft content excluded: ${report.summary.pendingDraftExcluded}
- Protected nav/chat untouched: ${report.summary.protectedNavChatUntouched}
- P0/P1/P2: ${report.summary.p0Count}/${report.summary.p1Count}/${report.summary.p2Count}

## Fixes Applied

${report.fixesApplied.map((fix) => `- ${fix}`).join("\n")}

## Next Fix Order

${report.nextFixOrder.map((step) => `- ${step}`).join("\n")}
`;

  writeFileSync(docPath, markdown, "utf8");
}

const report = buildReport();
mkdirSync(dirname(reportPath), { recursive: true });
mkdirSync(dirname(docPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeDoc(report);

console.log(JSON.stringify(report.summary, null, 2));
if (report.summary.p0Count > 0 || report.summary.p1Count > 0) {
  process.exitCode = 1;
}
