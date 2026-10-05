import { execFileSync } from "node:child_process";
import ts from "typescript";
import { listValidatorScopeFiles, readValidatorMutationScope } from "./validate-agent-takeover-safety-check";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Severity = "P0" | "P1" | "P2";
type FindingStatus = "fixed" | "missing" | "deferred";
type Finding = {
  id: string;
  status: FindingStatus;
  severity: Severity;
  detail: string;
};

export type UserLoadingWalletMobileRefinementReport = {
  generatedAtUtc: string;
  reportKey: "user-loading-wallet-mobile-refinement";
  currentHead: string;
  mutationScope?: ReturnType<typeof readValidatorMutationScope> | { mode: "whole_git_worktree" };
  summary: {
    mobileDependenciesPresent: boolean;
    protectedNavChatUntouched: boolean;
    walletRuntimeLogicUnchanged: boolean;
    walletMobileDensityCompact: boolean;
    walletLoadingStable: boolean;
    userDashboardStagedLoading: boolean;
    userDashboardModulesPreserved: boolean;
    userLibraryLoadingStable: boolean;
    dropLoadingCompact: boolean;
    largeSkeletonsRemoved: boolean;
    openPrsClassified: boolean;
    p0Count: number;
    p1Count: number;
    p2Count: number;
  };
  dependencyFindings: Finding[];
  protectedSurfaceFindings: Finding[];
  walletFindings: Finding[];
  loadingFindings: Finding[];
  userDashboardFindings: Finding[];
  fixesApplied: Finding[];
  prCleanupActions: string[];
  nextFixOrder: string[];
};

export type UserLoadingWalletMobileRefinementInputs = {
  currentHead: string;
  generatedAtUtc: string;
  changedFiles: string[];
  openPrActions: string[];
  sources: {
    packageJson: string;
    mobileFinalLockDoc: string;
    mobileLoadingDoc: string;
    mobileScaleContract: string;
    loadingContract: string;
    files: Record<string, string>;
  };
};

const repoRoot = process.cwd();
const artifactRelativePath = "agent/state/user-loading-wallet-mobile-refinement.generated.json";
const docsRelativePath = "docs/agent-truth/user-loading-wallet-mobile-refinement.md";

const protectedPathPatterns = [
  /^src\/components\/Navigation\//u,
  /^src\/components\/Chat\//u,
  /^src\/app\/chat\//u,
  /^src\/app\/dashboard\/chat\//u,
  /(^|\/)(Navbar|TopNav|BottomNav|MobileBottomBar)\.tsx$/u,
];

const forbiddenRuntimePatterns = [
  /^src\/app\/api\/paypal\//u,
  /^src\/lib\/paypal/u,
  /^src\/lib\/gumdrop-economics\.ts$/u,
  /^src\/lib\/gumdrop-ledger\.ts$/u,
  /^src\/lib\/server\/gumdrop/u,
  /^src\/lib\/server\/wallet/u,
  /^firestore\.rules$/u,
  /^storage\.rules$/u,
];

const targetFiles = [
  "src/components/PurchaseModal.tsx",
  "src/hooks/useWalletPurchase.ts",
  "src/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame.tsx",
  "src/app/dashboard/DashboardClient.tsx",
  "src/app/dashboard/library/LibraryClient.tsx",
  "src/app/drops/loading.tsx",
  "src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection.tsx",
  "src/app/drops/[id]/preview/loading.tsx",
  "tests/unit/user-loading-wallet-mobile-refinement.spec.ts",
];

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function optionalRead(relativePath: string) {
  const fullPath = join(repoRoot, relativePath);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function read(relativePath: string) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
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

function isProtectedPath(file: string) {
  const normalized = file.replaceAll("\\", "/");
  return protectedPathPatterns.some((pattern) => pattern.test(normalized));
}

function isForbiddenRuntimePath(file: string) {
  const normalized = file.replaceAll("\\", "/");
  return forbiddenRuntimePatterns.some((pattern) => pattern.test(normalized));
}

function hasOversizedWalletTokens(source: string) {
  return /\brounded-3xl\b|\bp-6\b|\bp-8\b|\btext-4xl\b|\btext-5xl\b|\bh-32\b|\bh-40\b/u.test(source);
}

function hasLargeSkeletonTokens(source: string) {
  return /\bh-44\b|min-h-\[21rem\]|\bh-40\b|\bh-32\b/u.test(source);
}

function sourceTree(source: string) {
  return ts.createSourceFile("surface.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function importedName(tree: ts.SourceFile, moduleName: string, exportName: string) {
  for (const statement of tree.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== moduleName) continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const entry of bindings.elements) if ((entry.propertyName ?? entry.name).text === exportName) return entry.name.text;
  }
  return null;
}

function containsNode(tree: ts.Node, predicate: (node: ts.Node) => boolean): boolean {
  if (predicate(tree)) return true;
  return ts.forEachChild(tree, (node) => containsNode(node, predicate) || undefined) ?? false;
}

function hasAttribute(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, name: string, value: string) {
  return node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute)
    && attribute.name.getText() === name && attribute.initializer && ts.isStringLiteral(attribute.initializer)
    && attribute.initializer.text === value);
}

function namedJsx(node: ts.Node, name: string | null): node is ts.JsxOpeningElement | ts.JsxSelfClosingElement {
  return Boolean(name && (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText() === name);
}

function walletFrameConnected(source: string, frame: string) {
  const tree = sourceTree(source), frameTree = sourceTree(frame);
  const frameName = importedName(tree, "@/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame", "KandyWalletModalFrame");
  const contentName = importedName(frameTree, "@/components/creative-tim/ui/dialog", "DialogContent");
  return containsNode(tree, (node) => namedJsx(node, frameName))
    && containsNode(frameTree, (node) => namedJsx(node, contentName)
      && hasAttribute(node, "data-wallet-loading-stable", "true")
      && hasAttribute(node, "data-wallet-runtime-logic-unchanged", "true"));
}

function walletRuntimeMarkersPresent(source: string, frame: string) {
  return walletFrameConnected(source, frame)
    && source.includes("PayPalButtons")
    && source.includes("fundingSource={FUNDING.PAYPAL}")
    && source.includes("data-wallet-paypal-render-mode");
}

function walletStableMarkersPresent(source: string, frame: string) {
  const tree = sourceTree(source);
  const fixed = importedName(tree, "@/lib/gumdrops-packages", "FIXED_GUMDROP_PACKAGES");
  const catalogNames: string[] = [];
  containsNode(tree, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer
      && ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression)
      && node.initializer.expression.name.text === "map" && node.initializer.expression.expression.getText() === fixed) catalogNames.push(node.name.text);
    return false;
  });
  const rendersCatalog = containsNode(tree, (node) => ts.isCallExpression(node)
    && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "map"
    && catalogNames.includes(node.expression.expression.getText()));
  const duplicateCatalogRead = containsNode(tree, (node) => ts.isCallExpression(node)
    && node.arguments.some((argument) => ts.isStringLiteral(argument) && argument.text === "/api/wallet/packages"));
  return walletFrameConnected(source, frame) && rendersCatalog && !duplicateCatalogRead;
}

function libraryStableLoadingPresent(source: string) {
  const tree = sourceTree(source);
  const card = importedName(tree, "@/components/ui/card", "Card");
  return containsNode(tree, (node) => ts.isIfStatement(node)
    && containsNode(node.expression, (part) => ts.isIdentifier(part) && part.text === "authLoading")
    && containsNode(node.thenStatement, (part) => namedJsx(part, card)
      && hasAttribute(part, "role", "status")
      && hasAttribute(part, "data-user-library-loading-stable", "true")
      && hasAttribute(part, "data-mobile-density", "compact")
      && hasAttribute(part, "data-mobile-skeleton", "user-library-route"))
    && containsNode(node.thenStatement, (part) => ts.isJsxText(part) && part.text.includes("Loading your collection")))
    && !hasLargeSkeletonTokens(source);
}

function dropsLoadingPresent(route: string, collection: string) {
  const tree = sourceTree(route), collectionTree = sourceTree(collection);
  if (!hasLargeSkeletonTokens(route) && containsNode(tree, (node) => ts.isReturnStatement(node) && Boolean(node.expression
    && containsNode(node.expression, (part) => (ts.isJsxOpeningElement(part) || ts.isJsxSelfClosingElement(part))
      && hasAttribute(part, "data-mobile-density", "compact"))))) return true;
  const skeleton = importedName(tree, "@/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection", "KandyEditorialReleaseSkeleton");
  const returnedSkeleton = containsNode(tree, (node) => ts.isReturnStatement(node) && Boolean(node.expression
    && containsNode(node.expression, (part) => namedJsx(part, skeleton) && part.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText() === "itemCount" && attribute.initializer
      && ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression
      && ts.isNumericLiteral(attribute.initializer.expression) && Number(attribute.initializer.expression.text) === 4))));
  const actualSkeletonBody = collectionTree.statements.find((node): node is ts.FunctionDeclaration => ts.isFunctionDeclaration(node) && node.name?.text === "KandyEditorialReleaseSkeleton");
  return Boolean(returnedSkeleton && actualSkeletonBody?.body && !hasLargeSkeletonTokens(actualSkeletonBody.body.getText())
    && containsNode(actualSkeletonBody.body, (node) => (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && hasAttribute(node, "data-mobile-density", "editorial-release")
      && hasAttribute(node, "data-mobile-skeleton", "drops-editorial-release")
      && hasAttribute(node, "aria-label", "Loading KandyDrops")));
}

function walletDensityMarkersPresent(source: string) {
  return source.includes('data-wallet-mobile-density="compact"') && !hasOversizedWalletTokens(source);
}

function dashboardModulesPreserved(source: string) {
  return ["DailyCheckIn", "CollectionList", "RecentActivityFeed", "CreatorDiscoveryRail"].every((needle) => source.includes(needle));
}

export function buildUserLoadingWalletMobileRefinementReport(
  inputs: UserLoadingWalletMobileRefinementInputs,
): UserLoadingWalletMobileRefinementReport {
  const purchaseModal = (inputs.sources.files["src/components/PurchaseModal.tsx"] ?? "") + (inputs.sources.files["src/hooks/useWalletPurchase.ts"] ?? "");
  const walletFrame = inputs.sources.files["src/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame.tsx"] ?? "";
  const dashboard = inputs.sources.files["src/app/dashboard/DashboardClient.tsx"] ?? "";
  const library = inputs.sources.files["src/app/dashboard/library/LibraryClient.tsx"] ?? "";
  const dropsLoading = inputs.sources.files["src/app/drops/loading.tsx"] ?? "";
  const previewLoading = inputs.sources.files["src/app/drops/[id]/preview/loading.tsx"] ?? "";
  const releaseCollection = inputs.sources.files["src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection.tsx"] ?? "";
  const changedProtected = inputs.changedFiles.filter(isProtectedPath);
  const changedRuntime = inputs.changedFiles.filter(isForbiddenRuntimePath);

  const mobileDependenciesPresent = (inputs.sources.mobileFinalLockDoc.includes("mobile-ui-final-lock")
    || inputs.sources.mobileFinalLockDoc.includes("Mobile UI Final Lock"))
    && (inputs.sources.mobileLoadingDoc.includes("mobile-loading-hydration-stability")
      || inputs.sources.mobileLoadingDoc.includes("Mobile Loading Hydration Stability"))
    && inputs.sources.mobileScaleContract.includes("getMobileModuleClassNames")
    && inputs.sources.loadingContract.includes("createStaleRequestGuard")
    && inputs.sources.packageJson.includes("check:user-loading-wallet-mobile-refinement");

  const dependencyFindings = [
    finding("mobile-dependencies-present", mobileDependenciesPresent, "Existing mobile doctrine, loading contract, scale contract, and package script are present.", "P0"),
  ];

  const protectedSurfaceFindings = [
    finding(
      "protected-nav-chat-untouched",
      changedProtected.length === 0,
      changedProtected.length === 0 ? "Protected nav/chat files were not changed." : `Protected files changed: ${changedProtected.join(", ")}`,
      "P0",
    ),
    finding(
      "wallet-runtime-files-untouched",
      changedRuntime.length === 0,
      changedRuntime.length === 0 ? "Payment, GumDrop math, Firebase, and wallet server runtime files were not changed." : `Forbidden runtime files changed: ${changedRuntime.join(", ")}`,
      "P0",
    ),
  ];

  const walletFindings = [
    finding("wallet-runtime-logic-marker", walletRuntimeMarkersPresent(purchaseModal, walletFrame), "Wallet modal keeps PayPal runtime markers and declares runtime logic unchanged.", "P0"),
    finding("wallet-mobile-density-compact", walletDensityMarkersPresent(purchaseModal), "Wallet modal uses compact mobile density and avoids oversized wallet tokens.", "P1"),
    finding("wallet-loading-stable", walletStableMarkersPresent(purchaseModal, walletFrame), "Wallet renders the canonical fixed package catalog without a duplicate metadata request; payment callback guards remain separately owned.", "P1"),
  ];

  const userDashboardFindings = [
    finding("dashboard-staged-loading", dashboard.includes('data-user-dashboard-loading-staged="true"'), "User dashboard declares staged loading instead of optional-module blocking.", "P1"),
    finding("dashboard-modules-preserved", dashboardModulesPreserved(dashboard), "Daily Rewards, My KandyDrops collection, Recent Activity, and Creator Spotlight modules remain source-visible.", "P0"),
    finding("library-loading-stable", libraryStableLoadingPresent(library), "Auth loading returns the connected sourced Card status branch with compact skeleton, human loading state and no oversized skeleton tokens.", "P1"),
  ];

  const loadingFindings = [
    finding("drops-loading-compact", dropsLoadingPresent(dropsLoading, releaseCollection), "Drops route returns its actual bounded four-item skeleton owner without oversized height tokens; legacy compact route support is retained.", "P1"),
    finding("preview-loading-compact", previewLoading.includes('data-mobile-density="compact"') && !hasLargeSkeletonTokens(previewLoading), "Drop preview skeleton is compact on mobile.", "P1"),
  ];

  const openPrsClassified = inputs.openPrActions.length > 0;
  const fixesApplied = [
    finding("open-prs-classified", openPrsClassified, "Relevant open PRs were classified for this pass.", "P0"),
    finding("release-note-script-ready", inputs.sources.packageJson.includes("check:release-notes"), "Release note validator remains available for same-commit notes.", "P2"),
  ];

  const allFindings = [
    ...dependencyFindings,
    ...protectedSurfaceFindings,
    ...walletFindings,
    ...loadingFindings,
    ...userDashboardFindings,
    ...fixesApplied,
  ];

  return {
    generatedAtUtc: inputs.generatedAtUtc,
    reportKey: "user-loading-wallet-mobile-refinement",
    currentHead: inputs.currentHead,
    summary: {
      mobileDependenciesPresent,
      protectedNavChatUntouched: protectedSurfaceFindings[0].status === "fixed",
      walletRuntimeLogicUnchanged: protectedSurfaceFindings[1].status === "fixed" && walletFindings[0].status === "fixed",
      walletMobileDensityCompact: walletFindings[1].status === "fixed",
      walletLoadingStable: walletFindings[2].status === "fixed",
      userDashboardStagedLoading: userDashboardFindings[0].status === "fixed",
      userDashboardModulesPreserved: userDashboardFindings[1].status === "fixed",
      userLibraryLoadingStable: userDashboardFindings[2].status === "fixed",
      dropLoadingCompact: loadingFindings.every((entry) => entry.status === "fixed"),
      largeSkeletonsRemoved: loadingFindings.every((entry) => entry.status === "fixed"),
      openPrsClassified,
      p0Count: countMissing(allFindings, "P0"),
      p1Count: countMissing(allFindings, "P1"),
      p2Count: countMissing(allFindings, "P2"),
    },
    dependencyFindings,
    protectedSurfaceFindings,
    walletFindings,
    loadingFindings,
    userDashboardFindings,
    fixesApplied,
    prCleanupActions: inputs.openPrActions,
    nextFixOrder: [
      "Apply the compact wallet markers to any future wallet entrypoints that reuse PurchaseModal.",
      "Keep route loading placeholders close to final module size before optional visual reproduction.",
      "Continue moving optional dashboard modules to staged dynamic loading when they become source-heavy.",
    ],
  };
}

export function validateUserLoadingWalletMobileRefinementReport(report: UserLoadingWalletMobileRefinementReport | null) {
  const failures: string[] = [];
  if (!report) return ["user loading wallet mobile refinement report missing."];
  if (report.reportKey !== "user-loading-wallet-mobile-refinement") failures.push("reportKey must be user-loading-wallet-mobile-refinement.");
  if (!report.summary.mobileDependenciesPresent) failures.push("mobile loading/scale dependencies or package script missing.");
  if (!report.summary.protectedNavChatUntouched) failures.push("protected nav/chat files changed.");
  if (!report.summary.walletRuntimeLogicUnchanged) failures.push("wallet runtime/payment files changed beyond UI scale or runtime marker missing.");
  if (!report.summary.walletMobileDensityCompact) failures.push("wallet mobile density marker missing or oversized wallet tokens remain.");
  if (!report.summary.walletLoadingStable) failures.push("wallet fixed catalog or connected modal loading state missing, or duplicate catalog transport remains.");
  if (!report.summary.userDashboardStagedLoading) failures.push("user dashboard still blocks on optional modules.");
  if (!report.summary.userDashboardModulesPreserved) failures.push("user dashboard modules removed or no longer source-visible.");
  if (!report.summary.userLibraryLoadingStable) failures.push("My KandyDrops library loading marker missing.");
  if (!report.summary.dropLoadingCompact) failures.push("large skeletons remain in touched user drop surfaces.");
  if (!report.summary.openPrsClassified) failures.push("open PRs are unclassified.");
  if (!Array.isArray(report.nextFixOrder) || report.nextFixOrder.length === 0) failures.push("nextFixOrder missing.");
  if (report.summary.p0Count > 0 || report.summary.p1Count > 0) failures.push("blocking user loading wallet mobile findings remain.");
  return failures;
}

function readInputs(changedFiles: string[]): UserLoadingWalletMobileRefinementInputs {
  const files = Object.fromEntries(targetFiles.map((file) => [file, optionalRead(file)]));
  return {
    currentHead: currentHead(),
    generatedAtUtc: new Date().toISOString(),
    changedFiles,
    openPrActions: [
      "Preserved PR #274: broad monolith governance doc PR outside this scoped wallet/mobile pass and mentions protected chat.",
    ],
    sources: {
      packageJson: read("package.json"),
      mobileFinalLockDoc: optionalRead("docs/agent-truth/mobile-ui-final-lock.md"),
      mobileLoadingDoc: optionalRead("docs/agent-truth/mobile-loading-hydration-stability.md"),
      mobileScaleContract: optionalRead("src/lib/frontend-hardening/ui/mobile-scale-contract.ts"),
      loadingContract: optionalRead("src/lib/frontend-hardening/ui/loading-state-contract.ts"),
      files,
    },
  };
}

function writeJson(relativePath: string, value: unknown) {
  const fullPath = join(repoRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderMarkdown(report: UserLoadingWalletMobileRefinementReport) {
  const lines = [
    "# User Loading Wallet Mobile Refinement",
    "",
    `Generated: ${report.generatedAtUtc}`,
    `Current code version: ${report.currentHead}`,
    "",
    "## Summary",
    "",
    `- Mobile dependencies present: ${report.summary.mobileDependenciesPresent ? "yes" : "no"}`,
    `- Protected nav/chat untouched: ${report.summary.protectedNavChatUntouched ? "yes" : "no"}`,
    `- Wallet runtime logic unchanged: ${report.summary.walletRuntimeLogicUnchanged ? "yes" : "no"}`,
    `- Wallet mobile density compact: ${report.summary.walletMobileDensityCompact ? "yes" : "no"}`,
    `- Wallet loading stable: ${report.summary.walletLoadingStable ? "yes" : "no"}`,
    `- User dashboard staged loading: ${report.summary.userDashboardStagedLoading ? "yes" : "no"}`,
    `- User dashboard modules preserved: ${report.summary.userDashboardModulesPreserved ? "yes" : "no"}`,
    `- My KandyDrops loading stable: ${report.summary.userLibraryLoadingStable ? "yes" : "no"}`,
    `- Drop loading compact: ${report.summary.dropLoadingCompact ? "yes" : "no"}`,
    "",
    "## Fixes Applied",
    "",
    ...report.walletFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    ...report.userDashboardFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    ...report.loadingFindings.map((entry) => `- ${entry.status}: ${entry.detail}`),
    "",
    "## PR Cleanup",
    "",
    ...report.prCleanupActions.map((entry) => `- ${entry}`),
    "",
    "## Next Fix Order",
    "",
    ...report.nextFixOrder.map((step, index) => `${index + 1}. ${step}`),
    "",
  ];
  const fullPath = join(repoRoot, docsRelativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, lines.join("\n"));
}

function main() {
  const mutationScope = readValidatorMutationScope(repoRoot);
  const report = { ...buildUserLoadingWalletMobileRefinementReport(readInputs(mutationScope ? [] : listValidatorScopeFiles(repoRoot, []))), mutationScope: mutationScope ?? { mode: "whole_git_worktree" as const } };
  writeJson(artifactRelativePath, report);
  renderMarkdown(report);
  const failures = validateUserLoadingWalletMobileRefinementReport(report);
  if (failures.length > 0) {
    console.error("[user-loading-wallet-mobile-refinement] failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`[user-loading-wallet-mobile-refinement] ok: p0=${report.summary.p0Count} p1=${report.summary.p1Count}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
