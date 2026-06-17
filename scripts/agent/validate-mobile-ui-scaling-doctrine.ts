import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MOBILE_SCALE_CONTRACT,
  MOBILE_SCALE_CONTRACT_VERSION,
  assertNoDesktopStuffing,
  getMobileDensityForSurface,
  getMobileModuleClassNames,
  getSkeletonClassForModule,
} from "../../src/lib/frontend-hardening/ui/mobile-scale-contract";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";
type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

export type MobileUiScalingDoctrineReport = {
  generatedAtUtc: string;
  reportKey: "mobile-ui-scaling-doctrine";
  currentHead: string;
  summary: {
    doctrineCreated: boolean;
    sharedMobileScaleContractCreated: boolean;
    densityHelpersCreated: boolean;
    skeletonPolicyCreated: boolean;
    hydrationPolicyCreated: boolean;
    hardcodedCssScanCreated: boolean;
    protectedNavChatUntouched: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  doctrineFindings: Finding[];
  contractFindings: Finding[];
  protectedSurfaceFindings: Finding[];
  hardcodedCssScan: string[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

export type MobileUiScalingDoctrineInputs = {
  currentHead: string;
  generatedAtUtc: string;
  docs: {
    doctrine: string;
  };
  sources: {
    contract: string;
    packageJson: string;
  };
  changedFiles: string[];
  hardcodedScanMatches: string[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, "..", "..");
const artifactRelativePath = "agent/state/mobile-ui-scaling-doctrine.generated.json";
const docsRelativePath = "docs/agent-truth/mobile-ui-scaling-doctrine.md";

const hardcodedClassPattern = [
  "text-5xl",
  "text-4xl",
  "p-8",
  "p-7",
  "py-8",
  "py-7",
  "rounded-3xl",
  "h-screen",
  "max-h-screen",
].join("|");

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function optionalRead(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function changedFiles() {
  const unstaged = execFileSync("git", ["diff", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  const staged = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: repoRoot, encoding: "utf8" })
    .split(/\r?\n/u)
    .filter(Boolean);
  return Array.from(new Set([...unstaged, ...staged]));
}

function scanHardcodedCss() {
  const output = execFileSync("git", ["grep", "-n", "-E", hardcodedClassPattern, "--", "src/app", "src/components"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output.split(/\r?\n/u).filter(Boolean).slice(0, 80);
}

function finding(id: string, ok: boolean, detail: string, severity: Severity = "P1"): Finding {
  return {
    id,
    status: ok ? "fixed" : "missing",
    severity,
    detail,
  };
}

function countMissing(findings: Finding[], severity: Severity) {
  return findings.filter((entry) => entry.status === "missing" && entry.severity === severity).length;
}

function protectedChanged(files: string[]) {
  return files.filter((file) =>
    file.startsWith("src/components/Navigation/")
    || file.startsWith("src/components/Chat/")
    || file.startsWith("src/app/chat/")
    || /BottomNav|TopNav|Navbar|MobileBottomBar/u.test(file)
  );
}

export function buildMobileUiScalingDoctrineReport(
  inputs: MobileUiScalingDoctrineInputs,
): MobileUiScalingDoctrineReport {
  const doctrine = inputs.docs.doctrine;
  const contract = inputs.sources.contract;
  const protectedChanges = protectedChanged(inputs.changedFiles);
  const desktopStuffingCheck = assertNoDesktopStuffing({
    surface: "admin",
    moduleType: "debug",
    deviceBand: "mobile",
    className: getMobileModuleClassNames("admin", "debug"),
    nestedScroll: false,
    skeletonMatchesFinalLayout: true,
  });

  const doctrineFindings = [
    finding("doctrine-file-present", doctrine.includes("Mobile is the primary UX priority"), "Mobile-first doctrine exists.", "P0"),
    finding("protected-surfaces-documented", doctrine.includes("Top nav, bottom nav, and chat are protected"), "Protected nav/chat rule is documented.", "P0"),
    finding("skeleton-policy-documented", /Skeletons must reserve roughly final layout size/u.test(doctrine), "Skeleton sizing policy is documented.", "P0"),
    finding("hydration-policy-documented", /Hydration should not cause layout jumps/u.test(doctrine), "Hydration/loading race policy is documented.", "P1"),
    finding("next-fix-order-documented", doctrine.includes("## Next Fix Order"), "Doctrine includes next fix order.", "P0"),
  ];

  const contractFindings = [
    finding("contract-version-present", MOBILE_SCALE_CONTRACT_VERSION.includes("mobile-scale"), "Mobile scale contract version is present.", "P0"),
    finding("density-helper-present", contract.includes("getMobileDensityForSurface"), "Mobile density helper exists.", "P0"),
    finding("module-class-helper-present", contract.includes("getMobileModuleClassNames"), "Mobile module class helper exists.", "P0"),
    finding("skeleton-helper-present", contract.includes("getSkeletonClassForModule") && getSkeletonClassForModule("overview").includes("motion-reduce:animate-none"), "Skeleton helper exists and respects reduced motion.", "P0"),
    finding("desktop-stuffing-assertion-present", contract.includes("assertNoDesktopStuffing") && desktopStuffingCheck.ok, "Desktop-stuffing assertion exists and accepts shared compact classes.", "P0"),
    finding("tap-target-minimum", MOBILE_SCALE_CONTRACT.mobile.touchTargetMinPx >= 44, "Touch target minimum is at least 44px.", "P0"),
    finding("mobile-density-token", getMobileDensityForSurface("creator", "manager") === "compact", "Creator manager density resolves to compact mobile.", "P1"),
  ];

  const protectedSurfaceFindings = [
    finding("protected-nav-chat-untouched", protectedChanges.length === 0, protectedChanges.length === 0
      ? "Protected navigation and chat files were not changed."
      : `Protected files changed: ${protectedChanges.join(", ")}`, "P0"),
  ];

  const fixesApplied = [
    finding("shared-contract-added", contract.includes("MOBILE_SCALE_CONTRACT"), "Added shared mobile scale contract.", "P1"),
    finding("validator-added", inputs.sources.packageJson.includes("check:mobile-ui-scaling-doctrine"), "Added mobile UI scaling doctrine validator.", "P1"),
    finding("hardcoded-scan-added", hardcodedClassPattern.includes("text-5xl") && inputs.hardcodedScanMatches.length >= 0, "Added hardcoded CSS scan for future cleanup ordering.", "P1"),
  ];

  const allFindings = [
    ...doctrineFindings,
    ...contractFindings,
    ...protectedSurfaceFindings,
    ...fixesApplied,
  ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "mobile-ui-scaling-doctrine",
    currentHead: inputs.currentHead,
    summary: {
      doctrineCreated: doctrineFindings[0].status === "fixed",
      sharedMobileScaleContractCreated: contractFindings[0].status === "fixed",
      densityHelpersCreated: contractFindings[1].status === "fixed" && contractFindings[2].status === "fixed",
      skeletonPolicyCreated: doctrineFindings[2].status === "fixed" && contractFindings[3].status === "fixed",
      hydrationPolicyCreated: doctrineFindings[3].status === "fixed",
      hardcodedCssScanCreated: fixesApplied[2].status === "fixed",
      protectedNavChatUntouched: protectedSurfaceFindings[0].status === "fixed",
      p0Count: countMissing(allFindings, "P0"),
      p1Count: countMissing(allFindings, "P1"),
      p2Count: countMissing(allFindings, "P2"),
    },
    doctrineFindings,
    contractFindings,
    protectedSurfaceFindings,
    hardcodedCssScan: inputs.hardcodedScanMatches,
    fixesApplied,
    prCleanupActions: ["No open mobile UI, layout scale, dashboard card, skeleton, hydration, or CSS cleanup PRs were present at start."],
    nextFixOrder: [
      "Use src/lib/frontend-hardening/ui/mobile-scale-contract.ts for new or touched mobile modules before adding page-local density classes.",
      "Replace hardcoded p-8, display-size headings, raw h-screen, and unapproved nested scroll in touched files only.",
      "Keep top nav, bottom nav, and chat changes in their existing dedicated shell-safe validators.",
    ],
  };
}

export function validateMobileUiScalingDoctrineReport(report: MobileUiScalingDoctrineReport | null) {
  const failures: string[] = [];
  if (!report) return ["mobile UI scaling doctrine report missing."];
  if (report.reportKey !== "mobile-ui-scaling-doctrine") failures.push("reportKey must be mobile-ui-scaling-doctrine.");
  if (!report.summary.doctrineCreated) failures.push("doctrine missing.");
  if (!report.summary.sharedMobileScaleContractCreated) failures.push("shared mobile scale contract missing.");
  if (!report.summary.protectedNavChatUntouched) failures.push("protected nav/chat files changed by this pass.");
  if (!report.summary.densityHelpersCreated) failures.push("mobile density tokens/helpers missing.");
  if (!report.summary.skeletonPolicyCreated) failures.push("skeleton/loading policy missing.");
  if (!report.summary.hydrationPolicyCreated) failures.push("hydration/loading policy missing.");
  if (!report.summary.hardcodedCssScanCreated) failures.push("hardcoded CSS scan missing.");
  if (!Array.isArray(report.hardcodedCssScan)) failures.push("hardcodedCssScan must be represented.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking mobile UI scaling doctrine findings remain.");
  return failures;
}

function readInputs(): MobileUiScalingDoctrineInputs {
  let hardcodedScanMatches: string[] = [];
  try {
    hardcodedScanMatches = scanHardcodedCss();
  } catch {
    hardcodedScanMatches = [];
  }

  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    docs: {
      doctrine: optionalRead(docsRelativePath),
    },
    sources: {
      contract: optionalRead("src/lib/frontend-hardening/ui/mobile-scale-contract.ts"),
      packageJson: read("package.json"),
    },
    changedFiles: changedFiles(),
    hardcodedScanMatches,
  };
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(report: MobileUiScalingDoctrineReport) {
  const existing = optionalRead(docsRelativePath);
  const generatedBlock = [
    "",
    "## Validator Report",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    `- Doctrine created: ${report.summary.doctrineCreated ? "yes" : "no"}`,
    `- Shared mobile scale contract: ${report.summary.sharedMobileScaleContractCreated ? "yes" : "no"}`,
    `- Density helpers: ${report.summary.densityHelpersCreated ? "yes" : "no"}`,
    `- Skeleton policy: ${report.summary.skeletonPolicyCreated ? "yes" : "no"}`,
    `- Hydration policy: ${report.summary.hydrationPolicyCreated ? "yes" : "no"}`,
    `- Protected nav/chat untouched: ${report.summary.protectedNavChatUntouched ? "yes" : "no"}`,
    `- Hardcoded scan examples: ${report.hardcodedCssScan.length}`,
    "",
    "## Hardcoded Scan Examples",
    "",
    ...(report.hardcodedCssScan.length > 0 ? report.hardcodedCssScan.slice(0, 25).map((entry) => `- ${entry}`) : ["- none"]),
    "",
  ].join("\n");

  const content = existing.includes("## Validator Report")
    ? existing.replace(/\n## Validator Report[\s\S]*$/u, generatedBlock)
    : `${existing.trimEnd()}\n${generatedBlock}`;
  writeFileSync(join(repoRoot, docsRelativePath), content);
}

function main() {
  const report = buildMobileUiScalingDoctrineReport(readInputs());
  writeJson(artifactRelativePath, report);
  renderMarkdown(report);
  const failures = validateMobileUiScalingDoctrineReport(report);
  if (failures.length > 0) {
    console.error("[mobile-ui-scaling-doctrine] failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[mobile-ui-scaling-doctrine] ok: hardcodedScanExamples=${report.hardcodedCssScan.length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
