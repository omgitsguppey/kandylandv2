import { spawnSync, execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { captureTakeoverSourceState, startTakeoverEvidence, type TakeoverTaskInput } from "../../scripts/agent/validate-agent-takeover-safety-check";
import { afterEach, describe, expect, it } from "vitest";

import {
  CONSENT_MODE_VALUES,
  CONSENT_TRACKING_STORAGE_KEYS,
  CONSENT_TRACKING_VERSION,
} from "@/lib/privacy/consent-tracking-contract";
import {
  canPersistIdentityLink,
  canTrackEvent,
  canUseBehavioralSignals,
  canUseExternalAnalytics,
  getConsentTelemetryReason,
  getConsentUpgradeEffect,
  resolveConsentMode,
  restrictConsentMode,
  deriveAnalyticsConsentState,
} from "@/lib/privacy/consent-tracking-policy";

describe("consent tracking contract", () => {
  it("defines versioned consent modes and storage keys", () => {
    expect(CONSENT_TRACKING_VERSION).toMatch(/^2026-05-/u);
    expect(CONSENT_MODE_VALUES).toEqual([
      "unknown",
      "necessary_only",
      "minimal_analytics",
      "full_analytics",
      "full_behavioral",
    ]);
    expect(CONSENT_TRACKING_STORAGE_KEYS.localStorage).toBe("kandydrops.privacy.settings");
    expect(CONSENT_TRACKING_STORAGE_KEYS.cookie).toBe("kandydrops_analytics_consent");
  });

  it("maps banner decisions to actual tracking capability changes", () => {
    expect(getConsentUpgradeEffect("accept_all")).toMatchObject({
      consentMode: "full_behavioral",
      enablesBehavioralTracking: true,
      enablesExternalAnalytics: true,
    });
    expect(getConsentUpgradeEffect("minimal")).toMatchObject({
      consentMode: "minimal_analytics",
      enablesBehavioralTracking: false,
      enablesExternalAnalytics: false,
    });
    expect(getConsentUpgradeEffect("decline_optional")).toMatchObject({
      consentMode: "necessary_only",
      enablesBehavioralTracking: false,
      enablesExternalAnalytics: false,
    });
  });

  it("defaults unknown consent to necessary-only behavior until a decision exists", () => {
    expect(resolveConsentMode({ consentUpdatedAt: 0 })).toBe("unknown");
    expect(canTrackEvent("semantic_page_viewed", "unknown")).toBe(false);
    expect(canTrackEvent("auth_sign_in_failed", "unknown")).toBe(true);
    expect(getConsentTelemetryReason("semantic_page_viewed", "unknown")).toBe("blocked_until_consent_decision");
  });

  it("allows bounded minimal liveness without full behavioral or external analytics", () => {
    expect(canTrackEvent("page_viewed", "minimal_analytics")).toBe(true);
    expect(canTrackEvent("semantic_page_viewed", "minimal_analytics")).toBe(true);
    expect(canTrackEvent("drop_card_impression", "minimal_analytics")).toBe(true);
    expect(canTrackEvent("semantic_target_clicked", "minimal_analytics")).toBe(false);
    expect(canUseBehavioralSignals("minimal_analytics")).toBe(false);
    expect(canUseExternalAnalytics("minimal_analytics")).toBe(false);
  });

  it("keeps required integrity events available under decline", () => {
    expect(canTrackEvent("security_rate_limit_triggered", "necessary_only")).toBe(true);
    expect(canTrackEvent("auth_sign_in_attempted", "necessary_only")).toBe(true);
    expect(canTrackEvent("paypal_capture_completed", "necessary_only")).toBe(true);
    expect(canTrackEvent("gumdrop_balance_reconciled", "necessary_only")).toBe(true);
    expect(canTrackEvent("creator_profile_viewed", "necessary_only")).toBe(false);
  });

  it("requires full behavioral consent for identity persistence and behavior signals", () => {
    expect(canPersistIdentityLink("minimal_analytics")).toBe(false);
    expect(canPersistIdentityLink("full_analytics")).toBe(true);
    expect(canUseBehavioralSignals("full_analytics")).toBe(false);
    expect(canUseBehavioralSignals("full_behavioral")).toBe(true);
    expect(canTrackEvent("semantic_target_clicked", "full_behavioral")).toBe(true);
  });
});


describe("request consent restrictions",()=>{
 it.each([
  ["full_behavioral","necessary_only","necessary_only"],
  ["necessary_only","full_behavioral","necessary_only"],
  ["full_behavioral","full_analytics","full_analytics"],
  ["full_analytics","full_behavioral","full_analytics"],
  ["minimal_analytics","full_behavioral","minimal_analytics"],
  ["full_behavioral","minimal_analytics","minimal_analytics"],
  ["unknown","full_behavioral","unknown"],
  ["full_behavioral","unknown","unknown"],
  ["full_behavioral",undefined,"full_behavioral"],
  ["minimal_analytics",undefined,"minimal_analytics"],
  ["full_behavioral",null,"unknown"],
  ["full_behavioral","invalid","unknown"],
 ])("restricts %s with declared %s to %s", (request,event,expected)=>{
  expect(restrictConsentMode(request as typeof CONSENT_MODE_VALUES[number],event)).toBe(expected);
 });
 it.each([
  ["full_behavioral","granted"],
  ["full_analytics","partial"],
  ["minimal_analytics","partial"],
  ["necessary_only","denied"],
  ["unknown","unknown"],
 ])("labels admitted %s as %s",(mode,expected)=>expect(deriveAnalyticsConsentState(mode as typeof CONSENT_MODE_VALUES[number])).toBe(expected));
});


describe("consent validator immutable mutation scope through its actual CLI", () => {
  const repositoryRoot = process.cwd();
  const validatorPath = "scripts/agent/validate-consent-tracking-contract.ts";
  const reportPath = "agent/state/consent-tracking-contract.generated.json";
  const documentPath = "docs/agent-truth/consent-tracking-contract.md";
  const protectedPath = "src/components/Navigation/ScopeProtected.ts";
  const roots: string[] = [];
  const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
  function fixture(allowedFiles: string[] = ["fixture-owner.ts"]) {
    const root = mkdtempSync(path.join(os.tmpdir(), "kd-consent-scope-"));
    roots.push(root);
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore", shell: false });
    const write = (file: string, bytes: string) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), bytes); };
    git("init", "--quiet"); git("config", "user.name", "Source validator fixture"); git("config", "user.email", "fixture@example.invalid");
    write(".gitignore", "output/\nagent/state/\n");
    write("AGENTS.md", "Isolated source-only validator fixture authority.\n");
    write("fixture-owner.ts", "export const version = 1;\n");
    write(protectedPath, "export const protectedVersion = 1;\n");
    const source = readFileSync(path.join(repositoryRoot, validatorPath), "utf8");
    for (const match of source.matchAll(/\bread\("([^"]+)"\)/gu)) {
      const file = match[1]; mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); copyFileSync(path.join(repositoryRoot, file), path.join(root, file));
    }
    write(documentPath, "Preserved durable document fixture.\n");
    git("add", "."); git("commit", "--quiet", "-m", "fixture baseline");
    write(protectedPath, "export const protectedVersion = 2;\n");
    const input: TakeoverTaskInput = { taskKey: "consent-scope-fixture", activePromptLane: "source-validator", goal: "Verify actual caller scoping and preservation.", authority: "Isolated source-only fixture.", allowedFiles, forbiddenFiles: [protectedPath, "unexpected.ts"], inFlightLanes: ["sole fixture"], unknowns: ["No runtime or provider proof requested."], memoryWriteback: { required: false, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "No durable owner is changed by this isolated fixture." }, releaseNoteImpact: "No release.", justificationForNetAdditions: "Distinct actual CLI consumer scope and failure coverage.", authorityFiles: ["AGENTS.md"] };
    const inputPath = "output/" + input.taskKey + "/input.json";
    write(inputPath, JSON.stringify(input, null, 2) + "\n"); startTakeoverEvidence(inputPath, root);
    const run = (args: string[] = ["--task-input", inputPath], environment: NodeJS.ProcessEnv = process.env) => {
      const result = spawnSync(process.execPath, [tsxCli, "--tsconfig", path.join(repositoryRoot, "tsconfig.json"), path.join(repositoryRoot, validatorPath), ...args], { cwd: root, env: environment, encoding: "utf8", shell: false });
      return { ...result, output: result.stdout + result.stderr };
    };
    return { root, input, inputPath, write, git, run };
  }
  afterEach(() => {
    for (const root of roots.splice(0)) {
      if (!path.resolve(root).startsWith(path.join(path.resolve(os.tmpdir()), "kd-consent-scope-"))) throw new Error("Unexpected fixture cleanup target.");
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("keeps real changed files/fingerprint, preserves documents, and recovers after an undeclared protected edit", () => {
    const target = fixture(); target.write("fixture-owner.ts", "export const version = 3;\n");
    expect(target.run().status).toBe(0);
    const report = JSON.parse(readFileSync(path.join(target.root, reportPath), "utf8"));
    expect(report.changedFiles).toEqual(["fixture-owner.ts"]);
    expect(report.mutationScope).toMatchObject({ mode: "input_bound_task", taskKey: target.input.taskKey, changedFiles: ["fixture-owner.ts"], sourceFingerprint: captureTakeoverSourceState(target.root).sourceFingerprint });
    expect(readFileSync(path.join(target.root, documentPath), "utf8")).toBe("Preserved durable document fixture.\n");
    const before = readFileSync(path.join(target.root, reportPath), "utf8");
    target.write(protectedPath, "export const protectedVersion = 4;\n");
    const rejected = target.run(); expect(rejected.status).not.toBe(0); expect(rejected.output).toContain("Output scope violation: " + protectedPath);
    expect(readFileSync(path.join(target.root, reportPath), "utf8")).toBe(before);
    target.write(protectedPath, "export const protectedVersion = 2;\n");
    expect(target.run().status).toBe(0);
    expect(JSON.parse(readFileSync(path.join(target.root, reportPath), "utf8")).mutationScope.sourceFingerprint).toBe(captureTakeoverSourceState(target.root).sourceFingerprint);
  }, 30000);
  it("checks the real queue clear call, rejects a comment decoy and accepts the current cleared batch reference", () => {
    const trackerPath = "src/components/Analytics/DeepTracker.tsx";
    const target = fixture(["fixture-owner.ts", trackerPath]);
    const tracker = readFileSync(path.join(target.root, trackerPath), "utf8");
    const clear = "persistGuestQueue([], null)";
    expect(tracker).toContain(clear);
    target.write(trackerPath, tracker.replace(clear, "/* persistGuestQueue([], null) */"));
    // This is a declared source mutation; it must fail the consent safeguard itself.
    const rejected = target.run();
    expect(rejected.status).not.toBe(0);
    expect(rejected.output).toContain("drop queued behavior when disabled");
    target.write(trackerPath, tracker.replace(clear, "persistGuestQueue([], stableGuestBatchRef.current)"));
    expect(target.run().status).toBe(0);
  }, 30000);
  it.each(["staged", "untracked"])("rejects a new %s mutation instead of treating inherited work as new", (mode) => {
    const target = fixture(); const file = mode === "staged" ? protectedPath : "unexpected.ts";
    target.write(file, "export const unexpected = true;\n"); if (mode === "staged") target.git("add", file);
    const result = target.run(); expect(result.status).not.toBe(0); expect(result.output).toContain("Output scope violation: " + file);
    expect(existsSync(path.join(target.root, reportPath))).toBe(false);
  }, 30000);
  it.each(["missing-argument", "duplicate-argument", "malformed-json", "input-tamper", "baseline-fingerprint-tamper"])("rejects %s before publishing passing evidence", (mode) => {
    const target = fixture(); let args = ["--task-input", target.inputPath]; let expected = "";
    if (mode === "missing-argument") { args = ["--task-input"]; expected = "immutable input path"; }
    if (mode === "duplicate-argument") { args.push("--task-input=" + target.inputPath); expected = "Exactly one --task-input"; }
    if (mode === "malformed-json") { target.write(target.inputPath, "{"); expected = "SyntaxError"; }
    if (mode === "input-tamper") { target.write(target.inputPath, JSON.stringify({ ...target.input, allowedFiles: ["fixture-owner.ts", "not-declared-before.ts"] })); expected = "declared task input changed"; }
    if (mode === "baseline-fingerprint-tamper") { const file = "output/" + target.input.taskKey + "/baseline.json"; const baseline = JSON.parse(readFileSync(path.join(target.root, file), "utf8")); target.write(file, JSON.stringify({ ...baseline, sourceFingerprint: "0".repeat(64) })); expected = "Baseline source fingerprint is invalid"; }
    const result = target.run(args); expect(result.status).not.toBe(0); expect(result.output).toContain(expected);
    expect(existsSync(path.join(target.root, reportPath))).toBe(false);
  }, 30000);
  it.each(["unstaged", "staged", "untracked"])("retains standalone whole-worktree protected %s failures and document publication", (mode) => {
    const target = fixture();
    if (mode === "staged") target.git("add", protectedPath);
    if (mode === "untracked") { target.git("checkout", "--", protectedPath); target.write("src/components/Navigation/Unexpected.ts", "export const unexpected = true;\n"); }
    const result = target.run([]); expect(result.status).not.toBe(0); expect(result.output).toContain("protected files changed:");
    const report = JSON.parse(readFileSync(path.join(target.root, reportPath), "utf8"));
    expect(report.mutationScope).toEqual({ mode: "whole_git_worktree" }); expect(report.changedFiles).toContain(mode === "untracked" ? "src/components/Navigation/Unexpected.ts" : protectedPath);
    expect(readFileSync(path.join(target.root, documentPath), "utf8")).not.toBe("Preserved durable document fixture.\n");
  }, 30000);
  it("fails closed if Git inspection is unavailable", () => {
    const target = fixture(); const result = target.run([], { ...process.env, PATH: "", Path: "" });
    expect(result.status).not.toBe(0); expect(result.output).toMatch(/git.*ENOENT|ENOENT.*git/u); expect(existsSync(path.join(target.root, reportPath))).toBe(false);
  }, 30000);
});


describe("observed session behavior consent admission", () => {
 it.each(["session_started","session_activity_tick","session_meaningful_interaction","session_closed","session_bounced","session_engaged"])("requires full behavioral consent for %s", event => {
  for(const mode of ["unknown","necessary_only","minimal_analytics","full_analytics"] as const) expect(canTrackEvent(event,mode)).toBe(false);
  expect(canTrackEvent(event,"full_behavioral")).toBe(true);
 });
 it("retains the separate minimal auth-session liveness owner", () => { expect(canTrackEvent("auth_session_established","minimal_analytics")).toBe(true); });
});
