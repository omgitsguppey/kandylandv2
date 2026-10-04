import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join, resolve } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { changedFiles as deleteFlowFiles } from "../../scripts/agent/validate-account-settings-delete-flow";
import { changedFiles as mobilePaddingFiles } from "../../scripts/agent/validate-account-settings-mobile-padding";
import { changedFiles as settingsParityFiles } from "../../scripts/agent/validate-settings-connection-parity";
import { changedFiles as supportPolicyFiles } from "../../scripts/agent/validate-support-policy-surface-cleanup";
import { readValidatorMutationScope, startTakeoverEvidence, withValidatorMutationScope, type TakeoverTaskInput } from "../../scripts/agent/validate-agent-takeover-safety-check";

import {
  REQUIRED_VISUAL_CONFIRMATION_ROUTES,
  buildUserCreatorVisualConfirmationReport,
  changedFiles as visualConfirmationFiles,
  detectChatShellBottomGuardRegression,
  detectEagerCreatorManagerMount,
  detectFakeActionTarget,
  detectFinalVisualQaClaimWithoutEvidence,
  detectForbiddenAdminBackendDrift,
  detectForbiddenPaymentRuntimeDrift,
  detectMissingManagerMobileTargets,
  detectMissingReleaseDrawerOverflowGuard,
  detectReproductionEvidenceMismatch,
  type UserCreatorVisualConfirmationReport,
} from "../../scripts/agent/validate-user-creator-visual-confirmation";

const root = process.cwd();
const fixtureRoots: string[] = [];
const accountOwner = "src/components/Settings/UserSettingsPage.tsx";
const protectedNavbar = "src/components/Navbar.tsx";
const protectedPayment = "src/app/api/paypal/capture/route.ts";
const scopeReaders = [
  ["delete flow", deleteFlowFiles],
  ["mobile padding", mobilePaddingFiles],
  ["settings parity", settingsParityFiles],
  ["support policy", supportPolicyFiles],
  ["visual confirmation", visualConfirmationFiles],
] as const;

function mutationFixture() {
  const fixtureRoot = mkdtempSync(join(os.tmpdir(), "kd-account-reader-scope-"));
  fixtureRoots.push(fixtureRoot);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: fixtureRoot, stdio: "ignore", shell: false });
  const write = (relativePath: string, bytes: string) => {
    const target = join(fixtureRoot, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
  };
  git("init", "--quiet");
  git("config", "user.name", "Account reader fixture");
  git("config", "user.email", "fixture@example.invalid");
  write(".gitignore", "output/\n");
  write("AGENTS.md", "Fixture authority: exact Account source scope.\n");
  write(accountOwner, "export const accountValue = 1;\n");
  write(protectedNavbar, "export const navbarValue = 1;\n");
  write(protectedPayment, "export const paymentValue = 1;\n");
  git("add", ".");
  git("commit", "--quiet", "-m", "reader fixture baseline");
  write(protectedNavbar, "export const navbarValue = 2;\n");
  write(protectedPayment, "export const paymentValue = 2;\n");
  const input: TakeoverTaskInput = {
    taskKey: "account-reader-scope-test",
    activePromptLane: "existing-account-reader-fixture",
    goal: "Distinguish inherited dirty source from exact authorized Account changes.",
    authority: "Isolated source-reader behavior fixture.",
    allowedFiles: [accountOwner],
    forbiddenFiles: [protectedNavbar, protectedPayment],
    inFlightLanes: ["sole fixture"],
    unknowns: ["This fixture supplies no runtime or provider proof."],
    memoryWriteback: { required: false, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "No durable governance changes in the isolated fixture." },
    releaseNoteImpact: "No public release accepted.",
    justificationForNetAdditions: "Distinct existing-reader adapter coverage.",
    authorityFiles: ["AGENTS.md"],
  };
  const inputPath = "output/account-reader-scope-test/input.json";
  const inputBytes = JSON.stringify(input, null, 2) + "\n";
  write(inputPath, inputBytes);
  startTakeoverEvidence(inputPath, fixtureRoot);
  return { fixtureRoot, git, write, input, inputPath, inputBytes, args: ["--task-input", inputPath] };
}

afterEach(() => {
  const expectedPrefix = join(resolve(os.tmpdir()), "kd-account-reader-scope-").toLowerCase();
  for (const fixtureRoot of fixtureRoots.splice(0)) {
    if (!resolve(fixtureRoot).toLowerCase().startsWith(expectedPrefix)) throw new Error("Unexpected Account fixture cleanup target.");
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

function read(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

function readJson(relativePath: string) {
  return JSON.parse(read(relativePath)) as UserCreatorVisualConfirmationReport;
}

describe("user creator visual confirmation", () => {
  it("records source-owned visual confirmation without requiring screenshots", () => {
    const report = buildUserCreatorVisualConfirmationReport({ reproductionEvidenceAttached: false });

    expect(report.reportKey).toBe("user-creator-visual-confirmation");
    expect(report.mutationScope).toEqual({ mode: "whole_git_worktree" });
    expect(report.currentHead).toMatch(/^[a-f0-9]{40}$/u);
    expect(report.summary.routesChecked).toBeGreaterThanOrEqual(REQUIRED_VISUAL_CONFIRMATION_ROUTES.length);
    expect(report.summary.reproductionEvidenceAttached).toBe(false);
    expect(report.summary.sourceCoveredRoutes).toBeGreaterThanOrEqual(REQUIRED_VISUAL_CONFIRMATION_ROUTES.length);
    expect(report.deferredReproductionChecks.length).toBeGreaterThan(0);
  });

  it("requires every visual route in the source coverage route list when reproduction evidence is absent", () => {
    const report = buildUserCreatorVisualConfirmationReport({ reproductionEvidenceAttached: false });
    const routeIds = new Set(report.routes.map((route) => route.route));

    for (const route of REQUIRED_VISUAL_CONFIRMATION_ROUTES) {
      expect(routeIds.has(route)).toBe(true);
    }

    expect(detectReproductionEvidenceMismatch(report)).toEqual([]);
  });

  it("binds Account and Creator compositions to their actual primary canvases", () => {
    const report = buildUserCreatorVisualConfirmationReport({ reproductionEvidenceAttached: false });
    expect(report.routes.find((route) => route.route === "/settings")).toMatchObject({
      routeKind: "composition",
      primaryCanvas: "src/components/creative-tim/kandydrops/account/KandyAccountCenter.tsx",
    });
    expect(report.routes.find((route) => route.route === "/dashboard/creator/settings")).toMatchObject({
      routeKind: "composition",
      primaryCanvas: "src/components/Creators/CreatorDashboardSettingsHub.tsx",
    });
    for (const alias of ["/dashboard/profile", "/dashboard/settings"]) {
      expect(report.routes.find((route) => route.route === alias)).toMatchObject({
        routeKind: "redirect_alias",
        redirectTarget: "/settings",
        primaryCanvas: "src/components/creative-tim/kandydrops/account/KandyAccountCenter.tsx",
      });
    }
    expect(detectReproductionEvidenceMismatch(report)).toEqual([]);
  });

  it("rejects absent source owners instead of counting them as source coverage", () => {
    const report = buildUserCreatorVisualConfirmationReport({ reproductionEvidenceAttached: false });
    const brokenOwner = "src/components/Settings/AbsentAccountOwner.tsx";
    const invalid = {
      ...report,
      routes: report.routes.map((route) => route.route === "/settings"
        ? { ...route, primaryCanvas: brokenOwner, sourceFiles: [brokenOwner] }
        : route),
    };
    expect(detectReproductionEvidenceMismatch(invalid)).toContain(`missing_source_owner:/settings:${brokenOwner}`);
  });

  it("rejects redirect aliases attributed to a different canvas or target", () => {
    const report = buildUserCreatorVisualConfirmationReport({ reproductionEvidenceAttached: false });
    const invalid = {
      ...report,
      routes: report.routes.map((route) => route.route === "/dashboard/profile"
        ? { ...route, redirectTarget: "/dashboard/creator/settings" }
        : route),
    };
    expect(detectReproductionEvidenceMismatch(invalid)).toContain("invalid_redirect_owner:/dashboard/profile");
    expect(detectReproductionEvidenceMismatch(invalid)).toContain("missing_redirect_binding:/dashboard/profile");
  });

  it("requires a real exclusive manager render bound to the current control deck", () => {
    const hub = read("src/components/Creators/CreatorDashboardSettingsHub.tsx");
    const deck = read("src/components/creative-tim/kandydrops/creator/CreatorSettingsControlDeck.tsx");
    expect(detectEagerCreatorManagerMount(hub, deck)).toBe(false);
    expect(detectEagerCreatorManagerMount(hub)).toBe(true);
    expect(detectEagerCreatorManagerMount(hub.replace("{openSection ? activeManager :", "{openSection ? <><CreatorRequestsManager /><CreatorBookingsManager /><CreatorFanPassManager /><CreatorBroadcastManager /></> :"), deck)).toBe(true);
  });

  it("detects fake action targets and creator self-loops", () => {
    expect(detectFakeActionTarget('<a href="#">Broken</a>')).toBe(true);
    expect(detectFakeActionTarget('<Link href="/dashboard/creator">Open section</Link>', "src/components/Creators/Card.tsx")).toBe(true);
    expect(detectFakeActionTarget('<Link href="/dashboard/chat">Chat</Link>', "src/components/Creators/Card.tsx")).toBe(false);
  });

  it("blocks forbidden admin backend and payment runtime drift", () => {
    expect(detectForbiddenAdminBackendDrift(["src/app/admin/debug/page.tsx"])).toEqual(["src/app/admin/debug/page.tsx"]);
    expect(detectForbiddenAdminBackendDrift(["src/components/Creators/CreatorBroadcastManager.tsx"])).toEqual([]);
    expect(detectForbiddenPaymentRuntimeDrift(["src/lib/paypal/capture.ts"])).toEqual(["src/lib/paypal/capture.ts"]);
    expect(detectForbiddenPaymentRuntimeDrift(["src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx"])).toEqual([]);
  });

  it("detects missing mobile-safe manager targets", () => {
    expect(detectMissingManagerMobileTargets('<button className="rounded-full px-3 py-1.5 text-xs">Refresh</button>')).toBe(true);
    expect(detectMissingManagerMobileTargets('<button className="min-h-11 rounded-full px-3 py-2.5 text-xs">Refresh</button>')).toBe(false);
  });

  it("requires release drawer overflow and current-version guards", () => {
    expect(detectMissingReleaseDrawerOverflowGuard('<aside className="max-h-96">Drawer</aside>')).toBe(true);

    const drawer = read("src/components/ReleaseNotes/BetaReleaseNotesDrawer.tsx");
    expect(detectMissingReleaseDrawerOverflowGuard(drawer)).toBe(false);
  });

  it("requires chat shell bottom safe-area markers", () => {
    expect(detectChatShellBottomGuardRegression("<div />")).toBe(true);

    const chatShell = read("src/components/Chat/ChatExperience.tsx");
    expect(detectChatShellBottomGuardRegression(chatShell)).toBe(false);
  });

  it("does not allow final visual QA pass claims without evidence", () => {
    const report = buildUserCreatorVisualConfirmationReport({ reproductionEvidenceAttached: false });
    expect(detectFinalVisualQaClaimWithoutEvidence(report)).toBe(false);

    expect(detectFinalVisualQaClaimWithoutEvidence({
      ...report,
      summary: {
        ...report.summary,
        reproductionEvidenceAttached: false,
      },
      nextFixOrder: ["final visual QA passed"],
    })).toBe(true);
  });
});

describe("existing Account readers use the canonical immutable mutation scope", () => {
  it.each(scopeReaders)("%s preserves standalone forbidden dirt and rejects new undeclared changes", (_name, collectFiles) => {
    const { fixtureRoot, write, args } = mutationFixture();
    const standalone = collectFiles(fixtureRoot, []);
    expect(standalone).toContain(protectedNavbar);
    expect(detectForbiddenPaymentRuntimeDrift(standalone)).toContain(protectedPayment);
    expect(readValidatorMutationScope(fixtureRoot, [])).toBeNull();

    write(accountOwner, "export const accountValue = 3;\n");
    expect(collectFiles(fixtureRoot, args)).toEqual([]);
    const scope = readValidatorMutationScope(fixtureRoot, args)!;
    expect(scope.changedFiles).toEqual([accountOwner]);
    expect(scope.inheritedDirtySourceFileCount).toBe(2);
    const previousCwd = process.cwd();
    const previousArgv = process.argv;
    try {
      process.chdir(fixtureRoot);
      process.argv = [process.execPath, "reader-fixture", ...args];
      expect(withValidatorMutationScope({ status: "pass" }).mutationScope).toEqual(scope);
    } finally {
      process.argv = previousArgv;
      process.chdir(previousCwd);
    }

    write(protectedNavbar, "export const navbarValue = 4;\n");
    expect(() => collectFiles(fixtureRoot, args)).toThrow(`Output scope violation: ${protectedNavbar}`);
    write(protectedNavbar, "export const navbarValue = 2;\n");
    write(protectedPayment, "export const paymentValue = 4;\n");
    expect(() => collectFiles(fixtureRoot, args)).toThrow(`Output scope violation: ${protectedPayment}`);
    write(protectedPayment, "export const paymentValue = 2;\n");
    const undeclared = "src/components/Settings/UnexpectedAccount.tsx";
    write(undeclared, "export const unexpected = true;\n");
    expect(() => collectFiles(fixtureRoot, args)).toThrow(`Output scope violation: ${undeclared}`);
    rmSync(join(fixtureRoot, undeclared));
    expect(collectFiles(fixtureRoot, args)).toEqual([]);
  });

  it.each(scopeReaders)("%s rejects changed input, authority, retained preimages and Git HEAD", (_name, collectFiles) => {
    const { fixtureRoot, git, write, input, inputPath, inputBytes, args } = mutationFixture();
    expect(() => collectFiles(fixtureRoot, ["--task-input"])).toThrow("immutable input path");
    expect(() => collectFiles(fixtureRoot, [...args, `--task-input=${inputPath}`])).toThrow("Exactly one");
    write(inputPath, JSON.stringify({ ...input, allowedFiles: [...input.allowedFiles, "unexpected.ts"] }));
    expect(() => collectFiles(fixtureRoot, args)).toThrow("declared task input changed");
    write(inputPath, inputBytes);
    write("AGENTS.md", "Changed fixture authority.\n");
    expect(() => collectFiles(fixtureRoot, args)).toThrow("Authority changed after the baseline");
    write("AGENTS.md", "Fixture authority: exact Account source scope.\n");
    const preimage = `output/account-reader-scope-test/before/${accountOwner}.source`;
    write(preimage, "Changed retained preimage.\n");
    expect(() => collectFiles(fixtureRoot, args)).toThrow(`Retained baseline bytes are missing or changed: ${accountOwner}`);
    write(preimage, "export const accountValue = 1;\n");
    expect(collectFiles(fixtureRoot, args)).toEqual([]);
    git("commit", "--allow-empty", "--quiet", "-m", "different revision");
    expect(() => collectFiles(fixtureRoot, args)).toThrow("does not match current Git HEAD");
  });
});
