import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import vm from "node:vm";
import ts from "typescript";

import {
  buildUserLoadingWalletMobileRefinementReport,
  validateUserLoadingWalletMobileRefinementReport,
} from "../../scripts/agent/validate-user-loading-wallet-mobile-refinement";
import { captureTakeoverSourceState, startTakeoverEvidence, type TakeoverTaskInput } from "../../scripts/agent/validate-agent-takeover-safety-check";

const repository = process.cwd();
const validator = "scripts/agent/validate-user-loading-wallet-mobile-refinement.ts";
const reportPath = "agent/state/user-loading-wallet-mobile-refinement.generated.json";
const purchasePath = "src/components/PurchaseModal.tsx";
const framePath = "src/components/creative-tim/kandydrops/wallet/KandyWalletModalFrame.tsx";
const libraryPath = "src/app/dashboard/library/LibraryClient.tsx";
const dashboardPath = "src/app/dashboard/DashboardClient.tsx";
const source = (file: string) => readFileSync(join(repository, file), "utf8");
const targetFiles = [purchasePath, framePath, libraryPath, dashboardPath, "src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection.tsx", "src/app/drops/loading.tsx", "src/app/drops/[id]/preview/loading.tsx", "tests/unit/user-loading-wallet-mobile-refinement.spec.ts"];

function inputs(overrides: Record<string, string> = {}, changedFiles: string[] = []) {
  return {
    currentHead: "head",
    generatedAtUtc: "2026-10-02T00:00:00.000Z",
    changedFiles,
    openPrActions: ["preserved #274: broad governance doc PR outside this scoped wallet/mobile pass."],
    sources: {
      packageJson: source("package.json"),
      mobileFinalLockDoc: source("docs/agent-truth/mobile-ui-final-lock.md"),
      mobileLoadingDoc: source("docs/agent-truth/mobile-loading-hydration-stability.md"),
      mobileScaleContract: source("src/lib/frontend-hardening/ui/mobile-scale-contract.ts"),
      loadingContract: source("src/lib/frontend-hardening/ui/loading-state-contract.ts"),
      files: { ...Object.fromEntries(targetFiles.map((file) => [file, source(file)])), ...overrides },
    },
  };
}

describe("user loading wallet mobile refinement", () => {
  it("passes current sourced loading and wallet catalog composition without requiring a retired transport helper", () => {
    const report = buildUserLoadingWalletMobileRefinementReport(inputs());
    expect(report.summary.walletRuntimeLogicUnchanged).toBe(true);
    expect(report.summary.walletMobileDensityCompact).toBe(true);
    expect(report.summary.walletLoadingStable).toBe(true);
    expect(report.summary.userDashboardModulesPreserved).toBe(true);
    expect(report.summary.userLibraryLoadingStable).toBe(true);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toEqual([]);
  });

  it("retains standalone protected nav/chat and financial-runtime incidents", () => {
    const report = buildUserLoadingWalletMobileRefinementReport(inputs({}, ["src/components/Chat/ChatExperience.tsx", "src/lib/gumdrop-economics.ts"]));
    expect(report.summary.protectedNavChatUntouched).toBe(false);
    expect(report.summary.walletRuntimeLogicUnchanged).toBe(false);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toEqual(expect.arrayContaining(["protected nav/chat files changed.", "wallet runtime/payment files changed beyond UI scale or runtime marker missing."]));
  });

  it("fails when compact wallet presentation or payment safety markers disappear", () => {
    const report = buildUserLoadingWalletMobileRefinementReport(inputs({ [purchasePath]: "rounded-3xl p-6 text-4xl PayPalButtons" }));
    expect(report.summary.walletMobileDensityCompact).toBe(false);
    expect(report.summary.walletRuntimeLogicUnchanged).toBe(false);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toContain("wallet mobile density marker missing or oversized wallet tokens remain.");
  });

  it("fails when user dashboard core modules disappear", () => {
    const report = buildUserLoadingWalletMobileRefinementReport(inputs({ [dashboardPath]: 'data-user-dashboard-loading-staged="true" getMobileSkeletonClass' }));
    expect(report.summary.userDashboardModulesPreserved).toBe(false);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toContain("user dashboard modules removed or no longer source-visible.");
  });

  it("rejects disconnected Library loading even when retired helper names and marker comments remain", () => {
    const broken = source(libraryPath).replace("<Card\n", "<div\n").replace("</Card>", "</div>") + '\n// getMobileSkeletonClass data-user-library-loading-stable="true" Loading your collection\n';
    const report = buildUserLoadingWalletMobileRefinementReport(inputs({ [libraryPath]: broken }));
    expect(report.summary.userLibraryLoadingStable).toBe(false);
  });

  it("requires the actual loading message and compact skeleton in the auth loading branch", () => {
    const missingMessage = source(libraryPath).replace("Loading your collection…", "");
    expect(buildUserLoadingWalletMobileRefinementReport(inputs({ [libraryPath]: missingMessage })).summary.userLibraryLoadingStable).toBe(false);
    const oversized = source(libraryPath).replace("min-h-24", "h-40");
    expect(buildUserLoadingWalletMobileRefinementReport(inputs({ [libraryPath]: oversized })).summary.userLibraryLoadingStable).toBe(false);
  });

  it("requires the imported and rendered wallet frame rather than a marker-only comment", () => {
    const disconnected = source(purchasePath).replaceAll("<KandyWalletModalFrame", "<DisconnectedFrame").replaceAll("</KandyWalletModalFrame>", "</DisconnectedFrame>") + '\n// data-wallet-loading-stable="true" data-wallet-runtime-logic-unchanged="true"\n';
    const report = buildUserLoadingWalletMobileRefinementReport(inputs({ [purchasePath]: disconnected }));
    expect(report.summary.walletLoadingStable).toBe(false);
    expect(report.summary.walletRuntimeLogicUnchanged).toBe(false);
  });

  it("rejects a restored duplicate wallet catalog transport while preserving fixed catalog and capture owners", () => {
    const duplicate = source(purchasePath) + '\nasync function duplicateCatalog() { return fetch("/api/wallet/packages"); }\n';
    const report = buildUserLoadingWalletMobileRefinementReport(inputs({ [purchasePath]: duplicate }));
    expect(report.summary.walletLoadingStable).toBe(false);
    expect(report.summary.walletRuntimeLogicUnchanged).toBe(true);
    expect(validateUserLoadingWalletMobileRefinementReport(report)).toContain("wallet fixed catalog or connected modal loading state missing, or duplicate catalog transport remains.");
  });

  it("accepts an equivalent bound catalog variable but rejects a disconnected catalog import with literal decoys", () => {
    const renamed = source(purchasePath).replaceAll("PACKAGES", "AVAILABLE_PACKAGES").replaceAll("FIXED_GUMDROP_AVAILABLE_PACKAGES", "FIXED_GUMDROP_PACKAGES");
    expect(buildUserLoadingWalletMobileRefinementReport(inputs({ [purchasePath]: renamed })).summary.walletLoadingStable).toBe(true);
    const disconnected = source(purchasePath).replace("FIXED_GUMDROP_PACKAGES.map", "unownedCatalog.map") + '\n// FIXED_GUMDROP_PACKAGES.map PACKAGES.map createStaleRequestGuard AbortController\n';
    expect(buildUserLoadingWalletMobileRefinementReport(inputs({ [purchasePath]: disconnected })).summary.walletLoadingStable).toBe(false);
  });
});

describe("actual Drops loading delegation", () => {
  it("rejects disconnected or oversized successor skeletons while accepting the current bounded route", () => {
    const route = "src/app/drops/loading.tsx", body = "src/components/creative-tim/kandydrops/drops/KandyEditorialReleaseCollection.tsx";
    expect(buildUserLoadingWalletMobileRefinementReport(inputs()).summary.dropLoadingCompact).toBe(true);
    const disconnected = source(route).replace("<KandyEditorialReleaseSkeleton", "<DisconnectedSkeleton") + '\n// data-mobile-density="compact"\n';
    expect(buildUserLoadingWalletMobileRefinementReport(inputs({ [route]: disconnected })).summary.dropLoadingCompact).toBe(false);
    const oversized = source(body).replace("aspect-[4/3]", "h-40");
    expect(buildUserLoadingWalletMobileRefinementReport(inputs({ [body]: oversized })).summary.dropLoadingCompact).toBe(false);
    const tooMany = source(route).replace("itemCount={4}", "itemCount={400}");
    expect(buildUserLoadingWalletMobileRefinementReport(inputs({ [route]: tooMany })).summary.dropLoadingCompact).toBe(false);
  });
});

describe("loading reader actual CLI scope", () => {
  const roots: string[] = [];
  const prefix = "kd-library-loading-scope-";
  function fixture() {
    const root = mkdtempSync(join(tmpdir(), prefix));
    roots.push(root);
    const write = (file: string, value: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), value); };
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore", shell: false });
    const required = new Set([...targetFiles, "package.json", "docs/agent-truth/mobile-ui-final-lock.md", "docs/agent-truth/mobile-loading-hydration-stability.md", "src/lib/frontend-hardening/ui/mobile-scale-contract.ts", "src/lib/frontend-hardening/ui/loading-state-contract.ts"]);
    for (const file of required) write(file, source(file));
    const protectedFile = "src/components/Chat/fixture.tsx";
    write(".gitignore", "output/\nagent/state/\ndocs/agent-truth/\n");
    write("AGENTS.md", "Isolated local reader authority.\n");
    write("fixture.ts", "export const value = 1;\n");
    write(protectedFile, "export const value = 1;\n");
    git("init", "--quiet"); git("config", "user.name", "Source fixture"); git("config", "user.email", "fixture@example.invalid"); git("add", "."); git("commit", "--quiet", "-m", "Fixture baseline");
    write(protectedFile, "export const value = 2;\n");
    const input: TakeoverTaskInput = { taskKey: "library-loading-reader", activePromptLane: "source-validator-caller", goal: "Preserve current loading composition and exact authorized mutation safety.", authority: "Isolated fixture only.", allowedFiles: ["fixture.ts"], forbiddenFiles: [protectedFile], inFlightLanes: ["sole fixture"], unknowns: ["No provider evidence."], memoryWriteback: { required: false, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "Test fixture only." }, releaseNoteImpact: "None", justificationForNetAdditions: "Distinct caller inherited/undeclared scope proof.", authorityFiles: ["AGENTS.md"] };
    const inputPath = "output/library-loading-reader/input.json";
    write(inputPath, JSON.stringify(input)); startTakeoverEvidence(inputPath, root);
    const run = (args = ["--task-input", inputPath]) => {
      const result = spawnSync(process.execPath, [createRequire(import.meta.url).resolve("tsx/cli"), "--tsconfig", join(repository, "tsconfig.json"), join(repository, validator), ...args], { cwd: root, encoding: "utf8", timeout: 30_000 });
      return { ...result, output: result.stdout + result.stderr };
    };
    return { root, write, run, git, protectedFile };
  }
  afterEach(() => {
    for (const root of roots.splice(0)) {
      if (!resolve(root).startsWith(join(resolve(tmpdir()), prefix))) throw new Error("Unexpected reader fixture cleanup target");
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("accepts declared mutations with inherited protected dirt and rejects later mutations before replacing prior evidence", () => {
    const f = fixture(); f.write("fixture.ts", "export const value = 2;\n");
    const accepted = f.run(); expect(accepted.output).not.toContain("Error:"); expect(accepted.status).toBe(0);
    const before = readFileSync(join(f.root, reportPath), "utf8");
    expect(JSON.parse(before).mutationScope).toMatchObject({ mode: "input_bound_task", changedFiles: ["fixture.ts"], sourceFingerprint: captureTakeoverSourceState(f.root).sourceFingerprint });
    f.write(f.protectedFile, "export const value = 3;\n");
    const denied = f.run(); expect(denied.status).not.toBe(0); expect(denied.output).toContain("Output scope violation: " + f.protectedFile);
    expect(readFileSync(join(f.root, reportPath), "utf8")).toBe(before);
    f.write(f.protectedFile, "export const value = 2;\n");
    expect(f.run().status).toBe(0);
    f.write("unexpected.ts", "export const unexpected = true;\n");
    const untracked = f.run(); expect(untracked.status).not.toBe(0); expect(untracked.output).toContain("Output scope violation: unexpected.ts");
    f.git("reset", "--quiet", "HEAD", "--", f.protectedFile);
  }, 60_000);
  it("retains the no-argument standalone protected-surface incident", () => {
    const f = fixture(), result = f.run([]);
    expect(result.status).not.toBe(0); expect(result.output).toContain("protected nav/chat files changed.");
    expect(JSON.parse(readFileSync(join(f.root, reportPath), "utf8")).mutationScope).toEqual({ mode: "whole_git_worktree" });
  }, 60_000);
});

describe("global hydration reader connected Drops seed", () => {
  const routeFile = "src/app/drops/page.tsx", loaderFile = "src/lib/server/public-discovery-preview.ts";
  function runGlobalReader(overrides: Record<string, string> = {}) {
    const file = "scripts/agent/validate-global-speed-hydration-cache.ts";
    const actualRequire = createRequire(join(repository, file));
    const actualFs = actualRequire("node:fs") as typeof import("node:fs");
    const logs: string[] = [];
    const exitSignal = new Error("reader exited");
    let exitCode = 0;
    const projectedFs = { ...actualFs, readFileSync(input: import("node:fs").PathOrFileDescriptor, encoding: BufferEncoding) {
      const file = typeof input === "number" ? "" : resolve(String(input)).slice(repository.length + 1).replaceAll("\\", "/");
      return overrides[file] ?? actualFs.readFileSync(input, encoding);
    } };
    const compiled = ts.transpileModule(source(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    try {
      vm.runInNewContext(compiled, {
        module: { exports: {} }, exports: {},
        require: (id: string) => id === "node:fs" ? projectedFs : actualRequire(id),
        process: { ...process, cwd: () => repository, exit: (code: number) => { exitCode = code; throw exitSignal; } },
        console: { log: (...values: unknown[]) => logs.push(values.join(" ")), error: (...values: unknown[]) => logs.push(values.join(" ")) },
      }, { filename: file, timeout: 10_000 });
    } catch (error) { if (error !== exitSignal) throw error; }
    return { exitCode, output: logs.join("\n") };
  }
  const expectedFailure = "Drops initial server seed must connect";
  it("accepts the actual route-to-loader parallel seed and preserves all other current guards", () => {
    const result = runGlobalReader();
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Global speed hydration cache validation passed.");
  });
  it("accepts equivalent local alias names across route, imported services, results and returned props", () => {
    const route = source(routeFile).replace('import { getPublicDiscoveryData }', 'import { getPublicDiscoveryData as loadShelf }').replace('await getPublicDiscoveryData("drops")', 'await loadShelf("drops")').replaceAll("allDrops", "seededReleases").replaceAll("creatorRailProfiles", "creatorSeed").replace('creatorSeed={creatorSeed}', 'creatorRailProfiles={creatorSeed}').replaceAll("const drops =", "const visibleReleases =").replace('initialDrops={drops}', 'initialDrops={visibleReleases}');
    const loader = source(loaderFile).replace('const [{ getDrops }, { listCreatorDiscoveryProfiles }]', 'const [{ getDrops: readReleases }, { listCreatorDiscoveryProfiles: readCreators }]').replace('getDrops(),', 'readReleases(),').replace('listCreatorDiscoveryProfiles(surface),', 'readCreators(audience),').replaceAll('surface:', 'audience:').replace('const [drops, creatorProfiles]', 'const [releases, people]').replace('return { drops, creatorProfiles };', 'return { drops: releases, creatorProfiles: people };');
    expect(runGlobalReader({ [routeFile]: route, [loaderFile]: loader }).exitCode).toBe(0);
  });
  it.each([
    ["comment-only route", () => ({ [routeFile]: source(routeFile).replace('await getPublicDiscoveryData("drops")', 'await Promise.resolve({ drops: [], creatorProfiles: [] })') + '\n// Promise.all getPublicDiscoveryData("drops")\n' })],
    ["unused route loader call", () => ({ [routeFile]: source(routeFile).replace('initialDrops={drops}', 'initialDrops={[]}') + '\n// Promise.all initialDrops={drops}\n' })],
    ["disconnected creator seed", () => ({ [routeFile]: source(routeFile).replace('creatorRailProfiles={creatorRailProfiles}', 'creatorRailProfiles={[]}') + '\n// Promise.all creatorRailProfiles={creatorRailProfiles}\n' })],
    ["wrong production service", () => ({ [routeFile]: source(routeFile) + '\n// Promise.all\n', [loaderFile]: source(loaderFile).replace('import("@/lib/server/drops")', 'import("@/lib/server/unrelated")') })],
    ["serial service fetches", () => ({ [routeFile]: source(routeFile) + '\n// Promise.all\n', [loaderFile]: source(loaderFile).replace('await Promise.all([\n        getDrops(),\n        listCreatorDiscoveryProfiles(surface),\n    ])', '[await getDrops(), await listCreatorDiscoveryProfiles(surface)]') })],
    ["unused parallel fetch decoy", () => ({ [routeFile]: source(routeFile) + '\n// Promise.all\n', [loaderFile]: source(loaderFile).replace('await Promise.all([\n        getDrops(),\n        listCreatorDiscoveryProfiles(surface),\n    ])', '[await getDrops(), await listCreatorDiscoveryProfiles(surface)]') + '\nasync function unusedSeed() { return Promise.all([getDrops(), listCreatorDiscoveryProfiles("drops")]); }\n' })],
    ["unreachable route return decoy", () => ({ [routeFile]: source(routeFile).replace('return <DropsClient', 'return null;\n    return <DropsClient') + '\n// Promise.all\n' })],
    ["unreachable production seed decoy", () => ({ [routeFile]: source(routeFile) + '\n// Promise.all\n', [loaderFile]: source(loaderFile).replace('const [{ getDrops }, { listCreatorDiscoveryProfiles }]', 'return { drops: [], creatorProfiles: [] };\n    const [{ getDrops }, { listCreatorDiscoveryProfiles }]') })],
    ["disconnected returned seed", () => ({ [routeFile]: source(routeFile) + '\n// Promise.all\n', [loaderFile]: source(loaderFile).replace('return { drops, creatorProfiles };', 'return { drops: [], creatorProfiles: [] };') })],
  ] as const)("rejects %s while literal decoys remain", (_name, overrides) => {
    const result = runGlobalReader(overrides());
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain(expectedFailure);
  });
});

describe("critical path lock connected owners", () => {
  const criticalValidator = "scripts/agent/validate-user-critical-path-lock.ts";
  const criticalReport = "agent/state/user-critical-path-lock.generated.json";
  const home = "src/app/page.tsx", homeClient = "src/app/HomeClient.tsx";
  const experience = "src/components/Landing/PublicHomeExperience.tsx", actions = "src/components/Landing/PublicHomeActions.tsx";
  const preview = "src/components/Drops/LockedDropPreviewClient.tsx", viewer = "src/app/dashboard/viewer/ViewerClient.tsx";
  const chat = "src/components/Chat/ChatExperience.tsx", inbox = "src/components/Support/SupportInbox.tsx";
  const conversation = "src/components/creative-tim/kandydrops/support/KandySupportConversation.tsx";
  const roots: string[] = [];
  const prefix = "kd-critical-connected-";
  const criticalValidatorSource = source(criticalValidator);
  function fixture(overrides: Record<string, string> = {}) {
    const root = mkdtempSync(join(tmpdir(), prefix));
    roots.push(root);
    const write = (file: string, value: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), value); };
    const required = new Set<string>();
    const owner = ts.createSourceFile(criticalValidator, criticalValidatorSource, ts.ScriptTarget.Latest, true);
    const collect = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const argument = node.expression.text === "renderedOwner" ? node.arguments[4]
          : ["readRequired", "readSourceAst"].includes(node.expression.text) ? node.arguments[0] : undefined;
        if (argument && ts.isStringLiteral(argument)) required.add(argument.text);
      }
      ts.forEachChild(node, collect);
    };
    collect(owner);
    for (const file of required) write(file, overrides[file] ?? source(file));
    for (const [file, value] of Object.entries(overrides)) write(file, value);
    write(".gitignore", "agent/state/\ncritical-reader.cjs\n");
    execFileSync("git", ["init", "--quiet"], { cwd: root, stdio: "ignore", shell: false });
    execFileSync("git", ["add", "."], { cwd: root, stdio: "ignore", shell: false });
    execFileSync("git", ["-c", "user.name=Source fixture", "-c", "user.email=fixture@example.invalid", "commit", "--quiet", "-m", "Source fixture"], { cwd: root, stdio: "ignore", shell: false });
    const compiled = ts.transpileModule(criticalValidatorSource, { fileName: criticalValidator, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    // Execute the complete real CLI with its real imported inspector/Git/report owners.
    // Only the input tree and generated output root are isolated; this is source proof.
    const absoluteValidator = join(repository, criticalValidator);
    write("critical-reader.cjs", `const {createRequire}=require("node:module");const actualRequire=createRequire(${JSON.stringify(absoluteValidator)});actualRequire("tsx/cjs");const owner={exports:{}};new Function("require","module","exports","__filename","__dirname",${JSON.stringify(compiled)})(actualRequire,owner,owner.exports,${JSON.stringify(absoluteValidator)},${JSON.stringify(dirname(absoluteValidator))});`);
    const run = () => {
      const result = spawnSync(process.execPath, [join(root, "critical-reader.cjs")], { cwd: root, encoding: "utf8", timeout: 30_000 });
      const report = JSON.parse(readFileSync(join(root, criticalReport), "utf8")) as { status: string; criticalBlockers: string[]; validationResults: { name: string; status: string }[]; promoReadinessNotes: string[] };
      return { ...result, report, output: result.stdout + result.stderr };
    };
    return { root, write, run };
  }
  afterEach(() => {
    for (const root of roots.splice(0)) {
      if (!resolve(root).startsWith(join(resolve(tmpdir()), prefix))) throw new Error("Unexpected critical-path fixture cleanup target");
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("accepts the actual current journey while retaining the 11-section report and source-only classification", () => {
    const result = fixture().run();
    expect(result.status).toBe(0);
    expect(result.report.criticalBlockers).toEqual([]);
    expect(result.report.validationResults).toHaveLength(11);
    expect(result.report.promoReadinessNotes.join(" ")).toContain("source integration only");
  }, 60_000);
  it.each([
    ["disconnected Home body", () => ({ [home]: source(home).replaceAll("<PublicHomeExperience", "<UnusedExperience") + "\n// PublicHomeExperience Hero\n" }), "canonical public account actions"],
    ["wrong signup callback", () => ({ [actions]: source(actions).replace('openAuthModal("signup")', 'openAuthModal("login")') + '\n// openAuthModal("signup")\n' }), "signup must be bound"],
    ["unowned signup hook", () => ({ [actions]: source(actions).replace('@/context/UIContext', '@/context/UnownedContext') + '\n// useUIActions openAuthModal("signup")\n' }), "canonical UIActions hook"],
    ["foreign redirect UID", () => ({ [homeClient]: source(homeClient).replace("getPreferredAuthenticatedPathForProfile(userProfile, user.uid)", 'getPreferredAuthenticatedPathForProfile(userProfile, "foreign_uid")') + '\n// getPreferredAuthenticatedPathForProfile(userProfile, user.uid)\n' }), "profile- and UID-bound preferred path"],
    ["swapped wallet paid source", () => ({ [purchasePath]: source(purchasePath).replace("paidBalanceLabel={formatCompactGd(walletBalanceSplit.paidGd)}", "paidBalanceLabel={formatCompactGd(walletBalanceSplit.freeGd)}") + "\n// formatCompactGd(walletBalanceSplit.paidGd)\n" }), "separate formatted reward and paid balances"],
    ["unrendered wallet frame", () => ({ [purchasePath]: source(purchasePath).replaceAll("<KandyWalletModalFrame", "<UnconnectedFrame").replaceAll("</KandyWalletModalFrame>", "</UnconnectedFrame>") + '\n// data-wallet-density="public-beta-compact" data-wallet-balance-chip="split-source"\n' }), "canonical compact split-source frame"],
    ["client reconstructed entitlement", () => ({ [preview]: source(preview).replace('const entitlementId = typeof result.entitlementId === "string" ? result.entitlementId.trim() : null;', 'const entitlementId = `drop-entitlement:${user.uid}:${drop.id}`;') + '\n// result.entitlementId.trim()\n' }), "strict successful server response"],
    ["non-strict unwrap acknowledgement", () => ({ [preview]: source(preview).replace('url: "/api/drops/unlock", requireSuccess: true', 'url: "/api/drops/unlock", requireSuccess: false') + "\n// requireSuccess: true\n" }), "strict successful server response"],
    ["unowned viewer authorization", () => ({ [viewer]: source(viewer).replace("const isAuthorized = accessState.allowed;", "const isAuthorized = true;") + "\n// const isAuthorized = accessState.allowed;\n" }), "canonical Drop access truth"],
    ["disconnected viewer access resolver", () => ({ [viewer]: source(viewer).replace("useMemo(() => resolveDropViewAccess({", "useMemo(() => unownedAccess({") + '\nfunction unusedAccess() { return resolveDropViewAccess({}); }\n' }), "canonical Drop access truth"],
    ["missing viewer denial", () => ({ [viewer]: source(viewer).replace("if (!isAuthorized) {", "if (false) {") + "\n// if (!isAuthorized)\n" }), "recovery state before content for !isAuthorized"],
    ["wrong Chat picker population", () => ({ [chat]: source(chat).replace("creators={followedCreators}", "creators={[]}") + "\n// creators={followedCreators} No followed creators yet\n" }), "followed creators and the canonical compose action"],
    ["disconnected Support create handler", () => ({ [inbox]: source(inbox).replace("onCreateThread={() => void handleCreateThread()}", "onCreateThread={() => undefined}") + "\n// handleCreateThread()\n" }), "actual composer state and create handler"],
    ["disconnected Support submit", () => ({ [conversation]: source(conversation).replace("onCreateThread();", "void 0;") + "\n// onCreateThread(); Start a support thread\n" }), "connected new-request form"],
  ] as const)("rejects %s despite stale marker/comment decoys", (_name, overrides, failure) => {
    const result = fixture(overrides()).run();
    expect(result.status).toBe(1);
    expect(result.report.criticalBlockers.join("\n")).toContain(failure);
  }, 60_000);
  it("accepts equivalent imported component/formatter/decoder aliases with the same consumed bindings", () => {
    const rename = (file: string, name: string, alias: string) => source(file).replace(new RegExp("\\b" + name + "\\b", "g"), alias)
      .replace('import { ' + alias + ' }', 'import { ' + name + ' as ' + alias + ' }')
      .replace('import { ' + alias + ',', 'import { ' + name + ' as ' + alias + ',');
    const result = fixture({
      [home]: rename(home, "PublicHomeExperience", "HomeBody").replace('Landing/HomeBody"', 'Landing/PublicHomeExperience"'),
      [experience]: rename(experience, "PublicHomeActions", "AccountActions").replace('./AccountActions"', './PublicHomeActions"'),
      [preview]: source(preview).replace('import { readUiJson }', 'import { readUiJson as readConfirmedJson }').replace('await readUiJson<', 'await readConfirmedJson<'),
      [purchasePath]: source(purchasePath).replace("formatCompactGd, resolveWalletBalanceSplit", "formatCompactGd as compactBalance, resolveWalletBalanceSplit as readBalance")
        .replace("() => resolveWalletBalanceSplit(userProfile)", "() => readBalance(userProfile)").replaceAll("formatCompactGd(walletBalanceSplit.", "compactBalance(walletBalanceSplit."),
    }).run();
    expect(result.status).toBe(0);
    expect(result.report.criticalBlockers).toEqual([]);
  }, 60_000);
  it("accepts revised human headings without removing the current reward and denial actions", () => {
    const result = fixture({
      [viewer]: source(viewer).replace('title="Sign in to continue"', 'title="Open your account to continue"').replace('title="This Drop is not in your collection"', 'title="Unwrap this Drop before viewing"'),
      [conversation]: source(conversation).replace("A softer place to get unstuck.", "Help with your KandyDrops account."),
      ["src/components/Dashboard/DailyCheckIn.tsx"]: source("src/components/Dashboard/DailyCheckIn.tsx").replace("Your next Reward GD", "Claim your Reward GD"),
    }).run();
    expect(result.status).toBe(0);
  }, 60_000);
  it("keeps the distinct wallet-not-changed and paid Chat copy safeguards", () => {
    const result = fixture({
      ["src/lib/problem-state-copy.ts"]: source("src/lib/problem-state-copy.ts").replace("Your wallet was not changed. Try again or contact support if PayPal charged you.", "Payment succeeded."),
      [chat]: source(chat).replace("You need more paid GumDrops before you can send this creator message.", "Use your reward balance instead."),
    }).run();
    expect(result.status).toBe(1);
    expect(result.report.criticalBlockers.join("\n")).toContain("Your wallet was not changed");
    expect(result.report.criticalBlockers.join("\n")).toContain("You need more paid GumDrops");
  }, 60_000);
  it("replaces failed source evidence only after the actual binding recovers", () => {
    const f = fixture({ [inbox]: source(inbox).replace("onCreateThread={() => void handleCreateThread()}", "onCreateThread={() => undefined}") });
    expect(f.run().report.status).toBe("fail");
    f.write(inbox, source(inbox));
    const recovered = f.run();
    expect(recovered.status).toBe(0);
    expect(recovered.report.status).toBe("pass");
    expect(recovered.report.criticalBlockers).toEqual([]);
  }, 60_000);
});
