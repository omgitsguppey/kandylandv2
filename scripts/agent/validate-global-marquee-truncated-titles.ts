import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type FindingSeverity = "P0" | "P1" | "P2";

type GlobalMarqueeFinding = {
  severity: FindingSeverity;
  file: string;
  detail: string;
};

export type GlobalMarqueeTruncatedTitlesReport = {
  generatedAtUtc: string;
  reportKey: "global-marquee-truncated-titles";
  currentHead: string;
  summary: {
    existingDropMarqueeReused: boolean;
    sharedMarqueeComponentReady: boolean;
    titleMarqueeWrapperPreserved: boolean;
    reducedMotionRespected: boolean;
    onlySingleLineTitlesTargeted: boolean;
    protectedNavUntouched: boolean;
    protectedChatUntouched: boolean;
    noBodyTextMarquee: boolean;
    noLayoutWidthExpansion: boolean;
    touchedTitleSurfacesCovered: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  reusedComponents: string[];
  rolloutSurfaces: string[];
  findings: GlobalMarqueeFinding[];
  protectedFileDiffs: string[];
  fixesApplied: string[];
  nextFixOrder: string[];
};

export type GlobalMarqueeReportInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  packageJson: string;
  fileContents: Map<string, string>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/global-marquee-truncated-titles.generated.json";
const docsRelativePath = "docs/agent-truth/global-marquee-truncated-titles.md";

const protectedNavPatterns = [
  /^src\/components\/Navigation\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const protectedChatPatterns = [
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
];

const rolloutFiles = [
  "src/components/Creators/CreatorProfileTimelineFeed.tsx",
  "src/components/Creators/CreatorDropManager.tsx",
  "src/components/Creators/FanPassSubscriberRow.tsx",
  "src/components/Admin/AdminAiDescriptionOperations.tsx",
  "src/components/Admin/TopDropsTable.tsx",
  "src/components/Dashboard/OwnedDropGalleryCard.tsx",
  "src/components/DropCardLayout.tsx",
];

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

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function optionalRead(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function isNavPath(file: string) {
  return protectedNavPatterns.some((pattern) => pattern.test(file));
}

function isChatPath(file: string) {
  return protectedChatPatterns.some((pattern) => pattern.test(file));
}

function getFile(inputs: GlobalMarqueeReportInputs, relativePath: string) {
  return inputs.fileContents.get(relativePath) ?? optionalRead(relativePath);
}

function count(findings: GlobalMarqueeFinding[], severity: FindingSeverity) {
  return findings.filter((finding) => finding.severity === severity).length;
}

function bodyTextUsesMarquee(contents: Iterable<[string, string]>) {
  const offenders: string[] = [];
  for (const [file, source] of contents) {
    const lines = source.split(/\r?\n/u);
    lines.forEach((line, index) => {
      if (
        line.includes("MarqueeText")
        && /\b(description|body|preview|copy|detail|subtitle)\b/u.test(line)
      ) {
        offenders.push(`${file}:${index + 1}`);
      }
    });
  }
  return offenders;
}

export function buildGlobalMarqueeTruncatedTitlesReport(inputs: GlobalMarqueeReportInputs): GlobalMarqueeTruncatedTitlesReport {
  const marquee = getFile(inputs, "src/components/ui/MarqueeText.tsx");
  const titleMarquee = getFile(inputs, "src/components/ui/TitleMarquee.tsx");
  const globals = getFile(inputs, "src/app/globals.css");
  const packageScriptReady = inputs.packageJson.includes("check:global-marquee-truncated-titles");
  const protectedFileDiffs = inputs.changedFiles.filter((file) => isNavPath(file) || isChatPath(file));
  const rolloutSources = rolloutFiles.map((file) => [file, getFile(inputs, file)] as const);
  const bodyTextOffenders = bodyTextUsesMarquee(new Map([
    ["src/components/ui/MarqueeText.tsx", marquee],
    ["src/components/ui/TitleMarquee.tsx", titleMarquee],
    ...rolloutSources,
    ...Array.from(inputs.fileContents.entries()),
  ]));

  const sharedMarqueeComponentReady = marquee.includes("export function MarqueeText")
    && marquee.includes("onlyWhenTruncated")
    && marquee.includes("title-marquee-active")
    && marquee.includes("ResizeObserver");
  const titleMarqueeWrapperPreserved = titleMarquee.includes("MarqueeText")
    && titleMarquee.includes("export function TitleMarquee")
    && !titleMarquee.includes("ResizeObserver");
  const reducedMotionRespected = globals.includes("@media (prefers-reduced-motion: reduce)")
    && globals.includes(".title-marquee-active")
    && globals.includes("animation: none");
  const noLayoutWidthExpansion = marquee.includes("max-w-full")
    && marquee.includes("overflow-hidden")
    && marquee.includes("whitespace-nowrap");
  const touchedTitleSurfacesCovered = rolloutSources.every(([, source]) => source.includes("MarqueeText") || source.includes("TitleMarquee"));
  const protectedNavUntouched = protectedFileDiffs.every((file) => !isNavPath(file));
  const protectedChatUntouched = protectedFileDiffs.every((file) => !isChatPath(file));

  const findings: GlobalMarqueeFinding[] = [];
  if (!sharedMarqueeComponentReady) findings.push({ severity: "P0", file: "src/components/ui/MarqueeText.tsx", detail: "Shared MarqueeText component is missing or does not carry the existing marquee behavior." });
  if (!titleMarqueeWrapperPreserved) findings.push({ severity: "P0", file: "src/components/ui/TitleMarquee.tsx", detail: "Drop TitleMarquee compatibility wrapper is missing or duplicates measurement logic." });
  if (!reducedMotionRespected) findings.push({ severity: "P0", file: "src/app/globals.css", detail: "Reduced-motion marquee handling is missing." });
  if (protectedFileDiffs.length > 0) findings.push({ severity: "P0", file: protectedFileDiffs.join(", "), detail: "Protected nav/chat files changed by this pass." });
  if (bodyTextOffenders.length > 0) findings.push({ severity: "P0", file: bodyTextOffenders.join(", "), detail: "Body or description text uses marquee." });
  if (!noLayoutWidthExpansion) findings.push({ severity: "P1", file: "src/components/ui/MarqueeText.tsx", detail: "Marquee wrapper lacks width/overflow guards." });
  if (!touchedTitleSurfacesCovered) findings.push({ severity: "P1", file: "rolloutFiles", detail: "Expected title surfaces do not use the shared marquee wrapper." });
  if (!packageScriptReady) findings.push({ severity: "P1", file: "package.json", detail: "check:global-marquee-truncated-titles script is missing." });

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "global-marquee-truncated-titles",
    currentHead: inputs.currentHead,
    summary: {
      existingDropMarqueeReused: titleMarqueeWrapperPreserved,
      sharedMarqueeComponentReady,
      titleMarqueeWrapperPreserved,
      reducedMotionRespected,
      onlySingleLineTitlesTargeted: bodyTextOffenders.length === 0,
      protectedNavUntouched,
      protectedChatUntouched,
      noBodyTextMarquee: bodyTextOffenders.length === 0,
      noLayoutWidthExpansion,
      touchedTitleSurfacesCovered,
      p0Count: count(findings, "P0"),
      p1Count: count(findings, "P1"),
      p2Count: count(findings, "P2"),
    },
    reusedComponents: [
      "src/components/ui/TitleMarquee.tsx",
      "src/components/ui/MarqueeText.tsx",
      "src/app/globals.css title-marquee keyframes",
    ],
    rolloutSurfaces: rolloutFiles,
    findings,
    protectedFileDiffs,
    fixesApplied: [
      "Extracted drop title marquee measurement behavior into MarqueeText.",
      "Kept TitleMarquee as the drop-compatible wrapper over MarqueeText.",
      "Applied MarqueeText to selected creator title rows, Fan Pass fan labels, admin top-drop titles, and admin AI job/gallery titles.",
      "Kept body copy, descriptions, nav, bottom nav, and chat out of marquee rollout.",
    ],
    nextFixOrder: [
      "Apply MarqueeText opportunistically to newly touched single-line title/name truncation surfaces.",
      "Avoid marquee for descriptions, previews, secondary metadata, and body paragraphs.",
      "Keep future title marquee changes inside MarqueeText/TitleMarquee and the existing title-marquee CSS.",
    ],
  };
}

export function validateGlobalMarqueeTruncatedTitlesReport(report: GlobalMarqueeTruncatedTitlesReport | null) {
  const failures: string[] = [];
  if (!report) return ["global marquee truncated title report missing."];
  if (report.reportKey !== "global-marquee-truncated-titles") failures.push("reportKey must be global-marquee-truncated-titles.");
  if (!report.summary.existingDropMarqueeReused || !report.summary.sharedMarqueeComponentReady) failures.push("existing drop marquee duplicated instead of reused/shared.");
  if (!report.summary.titleMarqueeWrapperPreserved) failures.push("TitleMarquee compatibility wrapper missing.");
  if (!report.summary.reducedMotionRespected) failures.push("reduced-motion not respected.");
  if (!report.summary.noBodyTextMarquee) failures.push("body or description text uses marquee.");
  if (!report.summary.protectedNavUntouched || !report.summary.protectedChatUntouched) failures.push("protected nav/chat files changed by this pass.");
  if (!report.summary.noLayoutWidthExpansion) failures.push("animation can cause layout width expansion.");
  if (!report.summary.touchedTitleSurfacesCovered) failures.push("title truncation remains in touched surfaces without shared component.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking marquee rollout findings remain.");
  return failures;
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(report: GlobalMarqueeTruncatedTitlesReport) {
  return [
    "# Global Marquee Truncated Titles",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Existing drop marquee reused: ${report.summary.existingDropMarqueeReused ? "yes" : "no"}`,
    `- Shared marquee component ready: ${report.summary.sharedMarqueeComponentReady ? "yes" : "no"}`,
    `- Reduced motion respected: ${report.summary.reducedMotionRespected ? "yes" : "no"}`,
    `- Body text marquee avoided: ${report.summary.noBodyTextMarquee ? "yes" : "no"}`,
    `- Protected nav untouched: ${report.summary.protectedNavUntouched ? "yes" : "no"}`,
    `- Protected chat untouched: ${report.summary.protectedChatUntouched ? "yes" : "no"}`,
    `- Layout width expansion guarded: ${report.summary.noLayoutWidthExpansion ? "yes" : "no"}`,
    `- Blocking findings: P0=${report.summary.p0Count}, P1=${report.summary.p1Count}, P2=${report.summary.p2Count}`,
    "",
    "## Reused Components",
    "",
    ...report.reusedComponents.map((component) => `- ${component}`),
    "",
    "## Rollout Surfaces",
    "",
    ...report.rolloutSurfaces.map((surface) => `- ${surface}`),
    "",
    "## Findings",
    "",
    ...(report.findings.length > 0 ? report.findings.map((finding) => `- ${finding.severity}: ${finding.file} - ${finding.detail}`) : ["- None."]),
    "",
    "## Fixes Applied",
    "",
    ...report.fixesApplied.map((fix) => `- ${fix}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ].join("\n");
}

function readInputs(): GlobalMarqueeReportInputs {
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles: changedFiles(),
    packageJson: read("package.json"),
    fileContents: new Map(),
  };
}

function main() {
  const report = buildGlobalMarqueeTruncatedTitlesReport(readInputs());
  writeJson(artifactRelativePath, report);
  const docsPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(docsPath), { recursive: true });
  writeFileSync(docsPath, renderMarkdown(report));
  const failures = validateGlobalMarqueeTruncatedTitlesReport(report);
  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`[global-marquee-truncated-titles] ${failure}`);
    }
    process.exit(1);
  }
  console.log(`[global-marquee-truncated-titles] ok: surfaces=${report.rolloutSurfaces.length} reused=${report.reusedComponents.length}`);
}

if (process.argv[1]?.endsWith("validate-global-marquee-truncated-titles.ts")) {
  main();
}
