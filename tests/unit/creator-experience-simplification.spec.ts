import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { captureTakeoverSourceState, startTakeoverEvidence, type TakeoverTaskInput } from "../../scripts/agent/validate-agent-takeover-safety-check";

import { afterEach, describe, expect, it } from "vitest";

function readSource(path: string) {
    return readFileSync(join(process.cwd(), path), "utf8");
}

describe("creator experience simplification guardrails", () => {
    it("keeps the Phase 1 economy contract available", () => {
        expect(existsSync(join(process.cwd(), "src/lib/gumdrop-source-of-funds.ts"))).toBe(true);
        expect(existsSync(join(process.cwd(), "agent/state/gumdrop-economy-accuracy.generated.json"))).toBe(true);
        expect(readSource("src/lib/gumdrop-source-of-funds.ts")).toContain("paid_purchase_including_bonus");
    });

    it("guards generated slot booking in source and tests", () => {
        const panel = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");
        const route = readSource("src/app/api/creator/bookings/route.ts");

        expect(panel).toContain('data-booking-free-pick-disabled="true"');
        expect(panel).toContain("selectedBookingSlot");
        expect(panel).not.toContain("datetime-local");
        expect(route).toContain("buildCreatorBookingSlots");
        expect(route).toContain("slot_unavailable");
        expect(route).toContain("Pick one of the available creator time slots.");
    });

    it("locks creator owner mode and drop visibility scope", () => {
        const panel = readSource("src/components/Creators/CreatorExperiencesPanel.tsx");
        const creatorProfile = readSource("src/app/creators/[username]/CreatorProfileClient.tsx");
        const drops = readSource("src/app/drops/DropsClient.tsx");

        expect(panel).toContain('data-creator-owner-mode="true"');
        expect(panel).toContain('data-fan-controls-hidden="true"');
        expect(panel).toContain("/dashboard/creator");
        expect(creatorProfile).toContain('data-drop-visibility-scope="creator_profile"');
        expect(creatorProfile).toContain('data-drop-visibility-scope="own_creator_drops"');
        const discovery = readSource("src/components/creative-tim/kandydrops/drops/DropsDiscoveryExperience.tsx");
        expect(drops).toContain('<DropsDiscoveryExperience');
        expect(drops).toContain('drops={filteredDrops}');
        expect(discovery).toContain('data-drop-visibility-scope="public_discovery"');
        expect(discovery).toContain('{collection}');
        expect(discovery).not.toContain('data-drop-visibility-scope="own_creator_drops"');
        expect(drops).not.toContain('data-drop-visibility-scope="own_creator_drops"');
    });

    it("keeps memory and docs aligned with durable Phase 2 rules", () => {
        const memory = readSource("memory.md");
        const docs = readSource("docs/agent-truth/creator-experience-simplification.md");
        const packageJson = readSource("package.json");

        expect(memory).toContain("Creator booking UX uses generated availability slots, not arbitrary fan date/time.");
        expect(memory).toContain("Phase 2 depends on Phase 1 GumDrop economy contract and must not change paid-bonus ledger math.");
        expect(memory.toLowerCase()).not.toContain("bonus gumdrops are reward");
        expect(docs).toContain("Fan booking no longer uses arbitrary date/time input.");
        expect(packageJson).toContain('"check:creator-experience-simplification"');
    });
});

describe("Creator simplification actual CLI scope", () => {
    const repository = process.cwd();
    const validator = "scripts/agent/validate-creator-experience-simplification.ts";
    const report = "agent/state/creator-experience-simplification.generated.json";
    const protectedFile = "src/app/admin/fixture.ts";
    const roots: string[] = [];
    function fixture() {
        const root = mkdtempSync(join(tmpdir(), "kd-creator-scope-"));
        roots.push(root);
        const write = (file: string, value: string) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), value); };
        const git = (...args: string[]) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
        write(".gitignore", "output/\nagent/state/\n");
        write("AGENTS.md", "Isolated source-only authority.\n");
        for (const match of readSource(validator).matchAll(/readRequired\("([^"]+)"\)/gu)) {
            mkdirSync(dirname(join(root, match[1])), { recursive: true });
            copyFileSync(join(repository, match[1]), join(root, match[1]));
        }
        write(protectedFile, "export const version = 1;\n");
        write("fixture.ts", "export const value = 1;\n");
        git("init", "--quiet"); git("config", "user.name", "Source fixture"); git("config", "user.email", "fixture@example.invalid");
        git("add", "."); git("commit", "--quiet", "-m", "Fixture baseline");
        write(protectedFile, "export const version = 2;\n");
        const input: TakeoverTaskInput = { taskKey: "creator-scope-fixture", activePromptLane: "source-reader", goal: "Exercise inherited and undeclared scope.", authority: "Isolated fixture only.", allowedFiles: ["fixture.ts"], forbiddenFiles: [protectedFile], inFlightLanes: ["sole fixture"], unknowns: ["No provider proof."], memoryWriteback: { required: false, evidencePath: "REPO_MEMORY_LEDGER.md", reason: "Fixture only." }, releaseNoteImpact: "None", justificationForNetAdditions: "Distinct CLI caller scope coverage.", authorityFiles: ["AGENTS.md"] };
        const inputPath = "output/creator-scope-fixture/input.json";
        write(inputPath, JSON.stringify(input)); startTakeoverEvidence(inputPath, root);
        const run = (args = ["--task-input", inputPath]) => {
            const result = spawnSync(process.execPath, [createRequire(import.meta.url).resolve("tsx/cli"), "--tsconfig", join(repository, "tsconfig.json"), join(repository, validator), ...args], { cwd: root, encoding: "utf8" });
            return { ...result, output: result.stdout + result.stderr };
        };
        return { root, write, git, run };
    }
    afterEach(() => {
        for (const root of roots.splice(0)) {
            if (!resolve(root).startsWith(join(resolve(tmpdir()), "kd-creator-scope-"))) throw new Error("Unexpected fixture cleanup target");
            rmSync(root, { recursive: true, force: true });
        }
    });
    it("accepts only declared mutations and preserves the last report through rejection and recovery", () => {
        const f = fixture(); f.write("fixture.ts", "export const value = 2;\n");
        expect(f.run().status).toBe(0);
        const before = readFileSync(join(f.root, report), "utf8");
        expect(JSON.parse(before).mutationScope).toMatchObject({ mode: "input_bound_task", changedFiles: ["fixture.ts"], sourceFingerprint: captureTakeoverSourceState(f.root).sourceFingerprint });
        f.write(protectedFile, "export const version = 3;\n"); f.git("add", protectedFile);
        const denied = f.run(); expect(denied.status).not.toBe(0); expect(denied.output).toContain("Output scope violation: " + protectedFile);
        expect(readFileSync(join(f.root, report), "utf8")).toBe(before);
        f.git("reset", "--quiet", "HEAD", "--", protectedFile); f.write(protectedFile, "export const version = 2;\n");
        expect(f.run().status).toBe(0);
    }, 30000);
    it("retains standalone inherited Admin incidents", () => {
        const f = fixture(); const result = f.run([]);
        expect(result.status).not.toBe(0); expect(result.output).toContain("Forbidden admin file changed: " + protectedFile);
        expect(JSON.parse(readFileSync(join(f.root, report), "utf8")).mutationScope).toEqual({ mode: "whole_git_worktree" });
    }, 30000);
    it("rejects an untracked mutation before creating a report", () => {
        const f = fixture(); f.write("unexpected.ts", "export const unexpected = true;\n");
        const result = f.run(); expect(result.status).not.toBe(0); expect(result.output).toContain("Output scope violation: unexpected.ts");
        expect(existsSync(join(f.root, report))).toBe(false);
    }, 30000);
});
