import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readJson<T>(pathFromRoot: string): T {
    return JSON.parse(readFileSync(join(root, pathFromRoot), "utf8")) as T;
}

type DebugPanelOutputTriageReport = {
    summary: {
        staleItems: number;
        missingItems: number;
        falseLiveRisks: number;
        refreshableItems: number;
        blockingItems: number;
    };
    debugItems: Array<{
        key: string;
        label: string;
        sourceArtifact: string;
        freshness: string;
        canonicality: string;
        owningValidator: string | null;
        refreshCommand: string | null;
        blocksPhaseOne: boolean;
        uiTruthState: string;
        issue: string;
        recommendedAction: string;
    }>;
};

describe("debug panel output triage", () => {
    const report = readJson<DebugPanelOutputTriageReport>("agent/state/debug-panel-output-triage.generated.json");

    it("keeps stale items visible as stale or archive evidence", () => {
        const staleItems = report.debugItems.filter((item) => item.freshness === "stale");

        expect(staleItems.length).toBeGreaterThan(0);
        expect(
            staleItems.every((item) =>
                /stale|archive|evidence|formal_proof_required/i.test(`${item.uiTruthState} ${item.canonicality} ${item.issue}`),
            ),
        ).toBe(true);
    });

    it("keeps missing provider-backed site activity missing instead of passing operator-reported PayPal", () => {
        const provider = report.debugItems.find((item) => item.key === "provider_smoke");

        expect(provider).toBeDefined();
        expect(provider?.sourceArtifact).toBe("agent/state/provider-smoke-evidence.generated.json");
        expect(provider?.uiTruthState).not.toBe("live");
        expect(provider?.issue).toMatch(/Operator-reported PayPal|missing/i);
        expect(provider?.recommendedAction).toMatch(/provider-backed site activity/i);
        expect(provider?.recommendedAction).not.toMatch(/formal provider smoke/i);
    });

    it("does not let targeted behavior evidence clear visual/provider/runtime/admin caps", () => {
        const targeted = report.debugItems.find((item) => item.key === "targeted_behavior_evidence");
        const scoreCaps = report.debugItems.find((item) => item.key === "score_cap_reasons");

        expect(targeted?.issue).toMatch(/does not prove visual confirmation, provider-backed site activity, runtime\/deployed route evidence, or admin source activity sample evidence/i);
        expect(scoreCaps?.sourceArtifact).toBe("agent/state/public-beta-score.generated.json");
        expect(scoreCaps?.blocksPhaseOne).toBe(true);
        expect(scoreCaps?.uiTruthState).not.toBe("live");
    });

    it("uses the canonical public beta score artifact and not the aggregate report score", () => {
        const source = readFileSync(join(root, "src/lib/admin-debug-control-tower.ts"), "utf8");
        const ui = readFileSync(join(root, "src/app/admin/debug/components/DebugControlTower.tsx"), "utf8");
        const score = report.debugItems.find((item) => item.key === "public_beta_score");

        expect(score?.sourceArtifact).toBe("agent/state/public-beta-score.generated.json");
        expect(source).toContain("readCanonicalPublicBetaScore");
        expect(source).toContain("reportAggregateScore");
        expect(ui).toContain("canonicalPublicBetaScore");
        expect(ui).toContain("data-debug-report-source=\"source-detail\"");
    });

    it("keeps archive candidates labeled as evidence or archive, not current authority", () => {
        const repoSpring = report.debugItems.find((item) => item.key === "repo_spring_cleaning");
        const launchArtifacts = report.debugItems.filter((item) =>
            ["final_launch_readiness", "launch_readiness", "launch_pr_triage"].includes(item.key),
        );

        expect(repoSpring).toBeDefined();
        expect(repoSpring?.canonicality).toMatch(/archive|stale_evidence|missing/);
        expect(repoSpring?.blocksPhaseOne).toBe(false);
        expect(launchArtifacts.length).toBe(3);
        expect(launchArtifacts.every((item) => item.canonicality === "archive_evidence")).toBe(true);
        expect(launchArtifacts.every((item) => item.uiTruthState === "archive")).toBe(true);
        expect(launchArtifacts.every((item) => item.blocksPhaseOne === false)).toBe(true);
    });

    it("surfaces refresh commands for refreshable stale items", () => {
        const refreshableStale = report.debugItems.filter((item) => item.freshness === "stale" && item.refreshCommand);

        expect(report.summary.refreshableItems).toBeGreaterThan(0);
        expect(refreshableStale.length).toBeGreaterThan(0);
        expect(refreshableStale.every((item) => item.owningValidator || /validator/i.test(item.issue))).toBe(true);
    });
});
