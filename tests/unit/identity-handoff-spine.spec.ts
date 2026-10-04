import { spawnSync, execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { captureTakeoverSourceState, startTakeoverEvidence, type TakeoverTaskInput } from "../../scripts/agent/validate-agent-takeover-safety-check";
import { afterEach, describe, expect, it } from "vitest";

import {
  ACTOR_KINDS,
  IDENTITY_CONFIDENCE_VALUES,
  IDENTITY_STATES,
  LINK_REASON_VALUES,
  type IdentityState,
  type IdentityLinkCandidate,
} from "@/lib/analytics/identity-handoff-contract";
import {
  buildEventIdentityEnvelope,
  buildGuestIdentityContext,
  buildIdentityLinkCandidate,
  buildSignedInIdentityContext,
  classifyLegacyIdentity,
  preventGuestUserDoubleCount,
  resolveCurrentIdentityState,
  shouldLinkGuestToUser,
} from "@/lib/analytics/identity-handoff-engine";

describe("identity handoff spine", () => {
  it("publishes the canonical identity vocabulary", () => {
    expect(ACTOR_KINDS).toEqual([
      "guest",
      "signed_in_user",
      "creator_user",
      "admin",
      "admin_projection",
      "system",
      "legacy_unknown",
    ]);
    expect(IDENTITY_STATES).toContain("guest_full_behavioral");
    expect(IDENTITY_STATES).toContain("logged_in_linked_guest");
    expect(IDENTITY_CONFIDENCE_VALUES).toEqual(["exact", "linked", "inferred", "weak", "unknown"]);
    expect(LINK_REASON_VALUES).toEqual(["signup", "login", "consent_upgrade", "session_restore", "legacy_recovery"]);
  });

  it("resolves exactly one current identity state from consent and role inputs", () => {
    const cases: Array<[IdentityState, Parameters<typeof resolveCurrentIdentityState>[0]]> = [
      ["guest_unknown_consent", { consentMode: "unknown", sessionId: "sess_1" }],
      ["guest_necessary_only", { consentMode: "necessary_only", sessionId: "sess_1" }],
      ["guest_minimal_analytics", { consentMode: "minimal_analytics", sessionId: "sess_1" }],
      ["guest_full_behavioral", { consentMode: "full_behavioral", sessionId: "sess_1" }],
      ["signup_started", { consentMode: "full_behavioral", sessionId: "sess_1", authTransition: "signup_started" }],
      ["signup_completed_unlinked", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "user_1", authTransition: "signup_completed" }],
      ["logged_in_unlinked", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "user_1" }],
      ["logged_in_linked_guest", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "user_1", guestId: "guest_1", linkId: "identity_link_1" }],
      ["creator_logged_in", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "creator_1", roles: ["creator"] }],
      ["admin_authenticated", { consentMode: "full_behavioral", sessionId: "sess_1", userId: "admin_1", roles: ["admin"] }],
      ["guest_unknown_consent", { consentMode: "unknown", sessionId: "system_sess", systemGenerated: true }],
      ["legacy_unknown", { consentMode: "unknown", sessionId: null, legacyUnknown: true }],
    ];

    for (const [expected, input] of cases) {
      expect(resolveCurrentIdentityState(input)).toBe(expected);
    }
  });

  it("builds deterministic guest and signed-in identity contexts", () => {
    expect(buildGuestIdentityContext({
      guestId: "guest_1",
      sessionId: "sess_1",
      consentMode: "minimal_analytics",
    })).toMatchObject({
      actorKind: "guest",
      identityState: "guest_minimal_analytics",
      identityConfidence: "weak",
      guestId: "guest_1",
      sessionId: "sess_1",
      consentMode: "minimal_analytics",
    });

    expect(buildSignedInIdentityContext({
      userId: "user_1",
      guestId: "guest_1",
      sessionId: "sess_1",
      linkId: "identity_link_1",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      userId: "user_1",
      guestId: "guest_1",
      linkId: "identity_link_1",
    });
  });

  it("creates deterministic link candidates only when consent allows linkage", () => {
    const candidate = buildIdentityLinkCandidate({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
      reason: "signup",
    });
    const repeat = buildIdentityLinkCandidate({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
      reason: "login",
    });

    expect(candidate).toMatchObject({
      guestId: "guest_1",
      userId: "user_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
      reason: "signup",
      canLink: true,
      linkId: repeat.linkId,
    });
    expect(shouldLinkGuestToUser(candidate)).toBe(true);
    const blockedCandidate: IdentityLinkCandidate = {
      ...candidate,
      consentMode: "minimal_analytics",
      canLink: false,
      blockedReason: "consent_blocks_identity_link",
    };
    expect(shouldLinkGuestToUser(blockedCandidate)).toBe(false);
  });

  it("builds event envelopes with identity, consent, session, and unavailable guest reasons", () => {
    expect(buildEventIdentityEnvelope({
      eventName: "semantic_page_viewed",
      guestId: "guest_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "guest",
      identityState: "guest_full_behavioral",
      identityConfidence: "weak",
      consentMode: "full_behavioral",
      sessionId: "sess_1",
      guestId: "guest_1",
      unavailableGuestReason: null,
      includeInUserBehavior: true,
    });

    expect(buildEventIdentityEnvelope({
      eventName: "semantic_page_viewed",
      sessionId: "sess_1",
      consentMode: "necessary_only",
    })).toMatchObject({
      actorKind: "guest",
      identityState: "guest_necessary_only",
      identityConfidence: "unknown",
      unavailableGuestReason: "guest_id_unavailable_due_to_consent",
      includeInUserBehavior: false,
    });

    expect(buildEventIdentityEnvelope({
      eventName: "semantic_target_clicked",
      userId: "user_1",
      guestId: "guest_1",
      linkId: "identity_link_1",
      sessionId: "sess_1",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "signed_in_user",
      identityState: "logged_in_linked_guest",
      identityConfidence: "linked",
      linkId: "identity_link_1",
      includeInUserBehavior: true,
    });
  });

  it("classifies system-generated events as system instead of legacy unknown", () => {
    expect(buildEventIdentityEnvelope({
      eventName: "system_rollup_completed",
      sessionId: "system_sess",
      consentMode: "unknown",
      systemGenerated: true,
    })).toMatchObject({
      actorKind: "system",
      identityState: "guest_unknown_consent",
      identityConfidence: "exact",
      includeInUserBehavior: false,
    });

    expect(buildEventIdentityEnvelope({
      eventName: "system_rollup_completed",
      sessionId: "system_sess",
      identityState: "legacy_unknown",
      systemGenerated: true,
    })).toMatchObject({
      actorKind: "system",
      identityState: "guest_unknown_consent",
      identityConfidence: "exact",
      includeInUserBehavior: false,
    });
  });

  it("keeps legacy unknown, admin projection, signed-in user, and guest lanes distinct", () => {
    expect(buildEventIdentityEnvelope({
      eventName: "legacy_imported",
      sessionId: "legacy_sess",
      legacyUnknown: true,
    })).toMatchObject({
      actorKind: "legacy_unknown",
      identityState: "legacy_unknown",
      identityConfidence: "unknown",
      includeInUserBehavior: false,
    });

    expect(buildEventIdentityEnvelope({
      eventName: "admin_view_as_creator_started",
      userId: "admin_1",
      sessionId: "admin_sess",
      performedAs: "admin_view_as_creator",
      projectionMode: "read_only_projection",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "admin_projection",
      identityState: "admin_authenticated",
      identityConfidence: "exact",
      includeInUserBehavior: false,
    });

    expect(buildEventIdentityEnvelope({
      eventName: "wallet_opened",
      userId: "user_1",
      sessionId: "user_sess",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "signed_in_user",
      identityState: "logged_in_unlinked",
      identityConfidence: "exact",
      includeInUserBehavior: true,
    });

    expect(buildEventIdentityEnvelope({
      eventName: "semantic_page_viewed",
      guestId: "guest_1",
      sessionId: "guest_sess",
      consentMode: "full_behavioral",
    })).toMatchObject({
      actorKind: "guest",
      identityState: "guest_full_behavioral",
      identityConfidence: "weak",
      includeInUserBehavior: true,
    });
  });

  it("prevents guest and user double counting and excludes admin projection", () => {
    expect(preventGuestUserDoubleCount({
      eventId: "evt_1",
      guestId: "guest_1",
      userId: "user_1",
      linkId: "identity_link_1",
      sessionId: "sess_1",
      identityState: "logged_in_linked_guest",
      actorKind: "signed_in_user",
    })).toMatchObject({
      canonicalCountKey: "user:user_1",
      countAsGuest: false,
      countAsUser: true,
      suppressedDuplicateKey: "guest:guest_1",
    });

    expect(preventGuestUserDoubleCount({
      eventId: "evt_2",
      userId: "admin_1",
      sessionId: "sess_1",
      identityState: "admin_authenticated",
      actorKind: "admin_projection",
    })).toMatchObject({
      canonicalCountKey: "excluded:admin_projection",
      countAsGuest: false,
      countAsUser: false,
      includeInUserBehavior: false,
    });
  });

  it("keeps legacy unknown from becoming an exact user", () => {
    expect(classifyLegacyIdentity({
      eventName: "legacy_event",
      userId: "legacy_user",
      sessionId: "",
    })).toMatchObject({
      actorKind: "legacy_unknown",
      identityState: "legacy_unknown",
      identityConfidence: "unknown",
      userId: null,
      canPromoteToExactUser: false,
    });
  });
});


describe("identity validator immutable mutation scope through its actual CLI", () => {
  const repositoryRoot = process.cwd();
  const validatorPath = "scripts/agent/validate-identity-handoff-spine.ts";
  const reportPath = "agent/state/identity-handoff-spine.generated.json";
  const documentPath = "docs/agent-truth/identity-handoff-spine.md";
  const protectedPath = "src/components/Navigation/ScopeProtected.ts";
  const roots: string[] = [];
  const tsxCli = createRequire(import.meta.url).resolve("tsx/cli");
  function fixture(allowedFiles: string[] = ["fixture-owner.ts"]) {
    const root = mkdtempSync(path.join(os.tmpdir(), "kd-identity-scope-"));
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
    const input: TakeoverTaskInput = { taskKey: "identity-scope-fixture", activePromptLane: "source-validator", goal: "Verify actual caller scoping and preservation.", authority: "Isolated source-only fixture.", allowedFiles, forbiddenFiles: [protectedPath, "unexpected.ts"], inFlightLanes: ["sole fixture"], unknowns: ["No runtime or provider proof requested."], memoryWriteback: { required: false, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "No durable owner is changed by this isolated fixture." }, releaseNoteImpact: "No release.", justificationForNetAdditions: "Distinct actual CLI consumer scope and failure coverage.", authorityFiles: ["AGENTS.md"] };
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
      if (!path.resolve(root).startsWith(path.join(path.resolve(os.tmpdir()), "kd-identity-scope-"))) throw new Error("Unexpected fixture cleanup target.");
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("checks all guest payload identity fields from one built envelope, accepting renaming and rejecting comment decoys", () => {
    const file = "src/components/Analytics/DeepTracker.tsx";
    const target = fixture(["fixture-owner.ts", file]);
    const original = readFileSync(path.join(target.root, file), "utf8");
    expect(target.run().status).toBe(0);
    for (const field of ["actorKind", "identityState", "identityConfidence", "unavailableGuestReason"]) {
      const assignment = `${field}: envelope.${field}`;
      expect(original).toContain(assignment);
      target.write(file, original.replace(assignment, `${field}: "forged" /* ${assignment} */`));
      const rejected = target.run();
      expect(rejected.status).not.toBe(0);
      expect(rejected.output).toContain("guestTrackerUsesCanonicalEnvelope failed.");
    }
    target.write(file, original.replace(/\benvelope\b/gu, "capturedGuestEnvelope"));
    expect(target.run().status).toBe(0);
  }, 30000);
  it("follows the sole identified normalizer envelope into storage and rejects forged/comment-only bindings", () => {
    const routeFile = "src/app/api/analytics/ingest-identified/route.ts";
    const normalizerFile = "src/lib/runtime-facts/normalize-runtime-fact.ts";
    const target = fixture(["fixture-owner.ts", routeFile, normalizerFile]);
    const route = readFileSync(path.join(target.root, routeFile), "utf8");
    const normalizer = readFileSync(path.join(target.root, normalizerFile), "utf8");
    expect(target.run().status).toBe(0);
    for (const [before, after] of [
      ["identityEnvelope: canonicalIdentityEnvelope", 'identityEnvelope: {} /* identityEnvelope: canonicalIdentityEnvelope */'],
      ["canonicalIdentityState: canonicalIdentityEnvelope.identityState", 'canonicalIdentityState: "forged" /* canonicalIdentityState: canonicalIdentityEnvelope.identityState */'],
      ["userId: canonicalIdentityEnvelope.userId", 'userId: caller.uid /* userId: canonicalIdentityEnvelope.userId */'],
    ]) {
      expect(route).toContain(before);
      target.write(routeFile, route.replaceAll(before, after));
      const rejected = target.run();
      expect(rejected.status).not.toBe(0);
      expect(rejected.output).toContain("identifiedIngestBuildsCanonicalEnvelope failed.");
    }
    target.write(routeFile, route);
    expect(normalizer).toMatch(/    identityEnvelope,\r?\n/u);
    target.write(normalizerFile, normalizer.replace(/    identityEnvelope,\r?\n/u, "    identityEnvelope: {}, /* identityEnvelope */\n"));
    expect(target.run().output).toContain("identifiedIngestBuildsCanonicalEnvelope failed.");
    target.write(normalizerFile, normalizer);
    target.write(routeFile, route.replaceAll("runtimeFactResult", "normalizedResult").replaceAll("canonicalIdentityEnvelope", "normalizedIdentity"));
    expect(target.run().status).toBe(0);
  }, 30000);
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
