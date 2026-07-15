import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { buildAdminDebugControlTowerModel as buildAdminDebugControlTowerModelFromSource, formatOperatorReportStatusForAdmin, type AdminDebugReportCard } from "@/lib/admin-debug-control-tower";

const tempRoots: string[] = [];
const TEST_HEAD = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function buildAdminDebugControlTowerModel(
    options?: Parameters<typeof buildAdminDebugControlTowerModelFromSource>[0],
) {
    return buildAdminDebugControlTowerModelFromSource({ repoCurrentHead: TEST_HEAD, ...options });
}

function createTempRoot() {
    const root = join(tmpdir(), `kd-control-tower-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(root, "agent", "state"), { recursive: true });
    tempRoots.push(root);
    return root;
}

function writeReport(root: string, fileName: string, payload: Record<string, unknown>) {
    writeFileSync(join(root, "agent", "state", fileName), JSON.stringify(payload, null, 2), "utf8");
}

function reportCard(overrides: Partial<AdminDebugReportCard>): AdminDebugReportCard {
    return {
        id: "sample-report",
        label: "Sample Report",
        section: "beta_readiness",
        filePath: "agent/state/sample.generated.json",
        command: "npm run check:sample",
        score: null,
        status: "clean",
        truthState: "live",
        freshness: "fresh",
        generatedAt: "2026-06-18T00:00:00.000Z",
        updatedAtMs: Date.UTC(2026, 5, 18),
        ageHours: 0,
        findingCount: 0,
        evidenceGateCount: 0,
        criticalCount: 0,
        majorCount: 0,
        required: true,
        sourceCommit: null,
        currentHead: null,
        sourceDrift: "unknown",
        topFindings: [],
        ...overrides,
    };
}

function readyOperatorDecision() {
    return {
        version: "operator_decision_v1",
        sourceReadiness: { score: 100, status: "ready", detail: "Source ready." },
        releaseReadiness: { status: "launch_ready", ready: true, blockerCount: 0, detail: "Launch ready." },
        primaryAction: null,
        actionQueues: {
            sourceFixes: [],
            sourceVerification: [],
            evidenceRefresh: [],
            externalProof: [],
            ownerReview: [],
        },
        compositeConfidence: { score: 100, useAsWorkTarget: false, detail: "Diagnostic only." },
    };
}

describe("admin debug control tower model", () => {
    afterEach(() => {
        for (const root of tempRoots.splice(0)) {
            rmSync(root, { recursive: true, force: true });
        }
    });

    it("labels required missing reports as missing and critical", () => {
        const root = createTempRoot();
        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });

        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");
        expect(publicBeta?.truthState).toBe("missing");
        expect(publicBeta?.criticalCount).toBe(1);
        expect(model.criticalCount).toBeGreaterThan(0);
        expect(model.overallStatus).toBe("failed");
    });

    it("labels stale reports as stale instead of live", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-04-30T00:00:00.000Z",
            overallScore: 99,
            overallStatus: "clean",
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });
        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");

        expect(publicBeta?.truthState).toBe("stale");
        expect(publicBeta?.freshness).toBe("stale_72h");
        expect(publicBeta?.topFindings[0]?.title).toContain("older than 72 hours");
    });

    it("uses generatedAtUtc for generic report freshness instead of the file modification time", () => {
        const root = createTempRoot();
        writeReport(root, "device-ui-dry-audit.generated.json", {
            generatedAtUtc: "2026-05-01T00:00:00.000Z",
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4, 1) });
        const deviceUi = model.reports.find((report) => report.id === "device-ui-dry-audit");

        expect(deviceUi?.generatedAt).toBe("2026-05-01T00:00:00.000Z");
        expect(deviceUi?.freshness).toBe("stale_72h");
        expect(deviceUi?.truthState).toBe("stale");
    });

    it("does not treat missing or future generated timestamps as fresh", () => {
        const root = createTempRoot();
        writeReport(root, "device-ui-dry-audit.generated.json", {
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            findings: [],
        });
        writeReport(root, "device-layout-score.generated.json", {
            generatedAtUtc: "2026-05-05T00:00:00.000Z",
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4, 1) });
        const deviceUi = model.reports.find((report) => report.id === "device-ui-dry-audit");
        const deviceLayout = model.reports.find((report) => report.id === "device-layout-score");

        expect(deviceUi?.freshness).toBe("unknown");
        expect(deviceUi?.truthState).toBe("unknown");
        expect(deviceLayout?.freshness).toBe("unknown");
        expect(deviceLayout?.truthState).toBe("unknown");
    });

    it("surfaces explicit validation failures ahead of a high numeric score", () => {
        const root = createTempRoot();
        writeReport(root, "speed-security-hardening.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            overallScore: 100,
            overallStatus: "clean",
            passed: false,
            validationFailures: ["A required route contract failed."],
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4, 1) });
        const speedSecurity = model.reports.find((report) => report.id === "speed-security-hardening");

        expect(speedSecurity?.score).toBe(100);
        expect(speedSecurity?.status).toBe("failed");
        expect(speedSecurity?.truthState).toBe("failed");
        expect(speedSecurity?.findingCount).toBeGreaterThan(0);
        expect(speedSecurity?.topFindings[0]?.humanReadableWarning).toBe("A required route contract failed.");
    });

    it("keeps an actionable source finding ahead of a generic failed-status explanation", () => {
        const root = createTempRoot();
        writeReport(root, "speed-security-hardening.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            overallScore: 100,
            overallStatus: "failed",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            findings: [{
                id: "route-contract-failure",
                severity: "critical",
                title: "Route contract needs a source fix",
                humanReadableWarning: "Add the missing trusted-origin guard to the affected route.",
                filePath: "src/app/api/example/route.ts",
            }],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4, 1) });
        const speedSecurity = model.reports.find((report) => report.id === "speed-security-hardening");

        expect(speedSecurity?.status).toBe("failed");
        expect(speedSecurity?.findingCount).toBe(1);
        expect(speedSecurity?.topFindings[0]?.title).toBe("Route contract needs a source fix");
        expect(speedSecurity?.topFindings.some((finding) => finding.id.includes("explicit-validation-failure"))).toBe(false);
    });

    it("reads canonical public beta score and cap reasons separately from report averages", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 25,
            overallStatus: "beta-risk",
            readinessStatus: "Stale evidence",
            readinessStatusReason: "3 required generated report(s) are older than the freshness window.",
            evidenceScore: 25,
            evidenceCapDetails: [
                "Runtime unverified: Runtime/provider smoke - Attach deployed route evidence.",
                "Unknown evidence: Admin truth/sample evidence - Record a fresh redacted admin truth source sample.",
                "Stale evidence: Freshness, PR, and HEAD integrity - 3 required generated report(s) are older than the freshness window.",
                "Needs review: Cost owner evidence - External billing review remains required.",
            ],
            sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            currentHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            findings: [],
        });
        writeReport(root, "speed-security-hardening.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 75,
            overallStatus: "warning",
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });

        expect(model.canonicalPublicBetaScore).toBe(25);
        expect(model.canonicalPublicBetaStatus).toBe("beta-risk");
        expect(model.canonicalPublicBetaReadinessStatus).toBe("Source activity evidence required");
        expect(model.canonicalPublicBetaReadinessReason).toContain("3 required generated report");
        expect(model.canonicalPublicBetaEvidenceScore).toBe(25);
        expect(model.canonicalPublicBetaCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Source activity evidence required"),
            expect.stringContaining("Admin source activity sample"),
            expect.stringContaining("Cost owner evidence"),
        ]));
        expect(model.canonicalPublicBetaCapDetails.join("\n")).not.toContain("Unknown evidence:");
        expect(model.canonicalPublicBetaCapDetails.join("\n")).not.toContain("Stale evidence:");
        expect(model.canonicalPublicBetaCapDetails.join("\n")).not.toContain("Runtime unverified:");
        expect(model.canonicalPublicBetaCapDetails).toHaveLength(4);
        expect(model.canonicalPublicBetaSourceDrift).toBe("current");
        expect(model.canonicalPublicBetaTruthState).toBe("live");
        expect(model.reportAggregateScore).toBe(50);
        expect(model.reportAggregateSummary).toContain("Required generated report average");
        expect(model.overallScore).toBe(25);
    });

    it("turns public beta cap details into evidence gates instead of zero-finding errors", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 77.4,
            overallStatus: "ERROR",
            readinessStatus: "Source evidence required",
            readinessStatusReason: "Unknown evidence: Targeted behavior tests - Current implemented source behavior validators passed.",
            evidenceCapDetails: [
                "Unknown evidence: Targeted behavior tests - Current implemented source behavior validators passed. This is targeted behavior evidence only and does not prove provider-backed site activity, deployed route evidence, or admin source activity sample evidence.",
                "Stale evidence: Runtime/provider smoke - Provider smoke: Payment context was recorded. Provider-backed site activity evidence is still separate.",
                "Stale evidence: Admin truth/sample evidence - Produce a redacted admin source activity sample before clearing the admin source activity gate.",
                "Stale evidence: Required report freshness - 6 required generated report(s) are older than the freshness window.",
            ],
            sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            currentHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });
        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");

        expect(publicBeta?.status).toBe("failed");
        expect(publicBeta?.truthState).toBe("failed");
        expect(publicBeta?.findingCount).toBe(1);
        expect(publicBeta?.evidenceGateCount).toBe(4);
        expect(publicBeta?.topFindings.map((finding) => finding.title)).toEqual(expect.arrayContaining([
            "Public Beta validation failed",
            "Source-only behavior evidence",
            "Source activity evidence required",
            "Admin source activity sample required",
            "Refresh due",
        ]));
        expect(publicBeta?.topFindings.map((finding) => finding.humanReadableWarning).join(" ")).not.toContain("Unknown evidence:");
        expect(publicBeta?.topFindings.map((finding) => finding.humanReadableWarning).join(" ")).not.toContain("Stale evidence:");
        expect(publicBeta?.topFindings.flatMap((finding) => finding.evidence).join(" ")).not.toContain("Unknown evidence:");
        expect(publicBeta?.topFindings.flatMap((finding) => finding.evidence).join(" ")).not.toContain("Stale evidence:");
        expect(model.canonicalPublicBetaCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Source-only evidence"),
            expect.stringContaining("Source activity evidence required"),
            expect.stringContaining("Admin source activity sample required"),
            expect.stringContaining("Refresh due"),
        ]));
        expect(model.canonicalPublicBetaCapDetails.join("\n")).not.toContain("Unknown evidence:");
        expect(model.canonicalPublicBetaCapDetails.join("\n")).not.toContain("Stale evidence:");
    });

    it("projects the typed operator decision and evidence gates before legacy cap strings", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 63.18,
            overallStatus: "beta-risk",
            sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            currentHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            evidenceGates: [
                {
                    id: "targetedBehavior",
                    label: "Targeted behavior tests",
                    status: "Stale evidence",
                    detail: "The targeted source artifact is stale.",
                    recommendedAction: "Refresh the targeted source validator evidence.",
                    evidenceQuality: "source_ready",
                    freshness: "stale",
                    blocksLaunch: true,
                },
                {
                    id: "runtimeProviderSmoke",
                    label: "Provider-backed source activity evidence",
                    status: "Runtime unverified",
                    detail: "Provider-backed source activity evidence is missing.",
                    recommendedAction: "Attach current provider-backed source activity evidence.",
                    evidenceQuality: "external_proof_required",
                    freshness: "unknown",
                    blocksLaunch: true,
                },
            ],
            evidenceCapDetails: [
                "Stale evidence: Admin truth/sample evidence - This legacy string must not drive typed findings.",
            ],
            operatorDecision: {
                version: "operator_decision_v1",
                sourceReadiness: {
                    score: 83.6,
                    status: "verification_due",
                    detail: "One source verification action remains.",
                },
                releaseReadiness: {
                    status: "source_ready",
                    ready: false,
                    blockerCount: 2,
                    detail: "Two launch blockers remain.",
                },
                primaryAction: {
                    id: "gate:targetedBehavior:0",
                    lane: "evidence_refresh",
                    title: "Targeted behavior tests",
                    action: "Refresh the targeted source validator evidence.",
                    source: "evidenceGate:targetedBehavior",
                    blocksLaunch: true,
                },
                actionQueues: {
                    sourceFixes: [],
                    sourceVerification: [],
                    evidenceRefresh: [{
                        id: "gate:targetedBehavior:0",
                        lane: "evidence_refresh",
                        title: "Targeted behavior tests",
                        action: "Refresh the targeted source validator evidence.",
                        source: "evidenceGate:targetedBehavior",
                        blocksLaunch: true,
                    }],
                    externalProof: [{
                        id: "gate:runtimeProviderSmoke:1",
                        lane: "external_proof",
                        title: "Provider-backed source activity evidence",
                        action: "Attach current provider-backed source activity evidence.",
                        source: "evidenceGate:runtimeProviderSmoke",
                        blocksLaunch: true,
                    }],
                    ownerReview: [],
                },
                compositeConfidence: {
                    score: 63.18,
                    useAsWorkTarget: false,
                    detail: "Diagnostic context only.",
                },
            },
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });
        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");

        expect(model.canonicalPublicBetaOperatorDecision?.primaryAction?.lane).toBe("evidence_refresh");
        expect(model.canonicalPublicBetaOperatorDecision?.compositeConfidence.useAsWorkTarget).toBe(false);
        expect(model.canonicalPublicBetaEvidenceGates).toHaveLength(2);
        expect(publicBeta?.evidenceGateCount).toBe(2);
        expect(publicBeta?.topFindings.map((finding) => finding.title)).toEqual([
            "Targeted behavior tests refresh required",
            "Provider-backed source activity evidence",
        ]);
        expect(publicBeta?.topFindings[0]?.truthState).toBe("stale");
        expect(publicBeta?.topFindings.map((finding) => finding.title).join(" ")).not.toContain("Admin");
        expect(model.canonicalPublicBetaReadinessReason).toBe("Two launch blockers remain.");
    });

    it("fails closed when a v2 score omits its typed decision and evidence gates", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            scoreVersion: "beta_health_v2",
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4, 1) });

        expect(model.canonicalPublicBetaTruthState).toBe("failed");
        expect(model.canonicalPublicBetaStatus).toBe("failed");
        expect(model.canonicalPublicBetaOperatorDecision).toBeNull();
        expect(model.canonicalPublicBetaReadinessReason).toContain("typed decision or evidence gates are malformed");
    });

    it("rejects a launch-ready decision that contradicts a blocking typed evidence gate", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            scoreVersion: "beta_health_v2",
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            launchGateStatus: "launch_ready",
            evidenceGates: [{
                id: "paymentSourceOfFunds",
                label: "Protected payment source-of-funds proof",
                status: "External proof required",
                detail: "Current protected payment proof is missing.",
                recommendedAction: "Attach current protected payment proof.",
                evidenceQuality: "missing",
                freshness: "missing",
                blocksLaunch: true,
            }],
            operatorDecision: readyOperatorDecision(),
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4, 1) });

        expect(model.canonicalPublicBetaTruthState).toBe("failed");
        expect(model.canonicalPublicBetaStatus).toBe("failed");
        expect(model.canonicalPublicBetaOperatorDecision).toBeNull();
        expect(model.canonicalPublicBetaReadinessReason).toContain("typed decision or evidence gates are malformed");
    });

    it("rejects empty typed evidence gates and a non-ready decision with no blocking action", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            scoreVersion: "beta_health_v2",
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            evidenceGates: [],
            operatorDecision: {
                ...readyOperatorDecision(),
                releaseReadiness: {
                    status: "owner_review",
                    ready: false,
                    blockerCount: 0,
                    detail: "Owner review is required.",
                },
            },
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4, 1) });
        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");

        expect(model.canonicalPublicBetaTruthState).toBe("failed");
        expect(model.canonicalPublicBetaOperatorDecision).toBeNull();
        expect(publicBeta?.topFindings.some((finding) => finding.title === "Typed public beta evidence gates are malformed")).toBe(true);
    });

    it("rejects a typed non-ready decision whose queues contain no blocking action", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            scoreVersion: "beta_health_v2",
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            evidenceGates: [{
                id: "sourceSafety",
                label: "Source safety",
                status: "Ready",
                detail: "Source safety checks passed.",
                recommendedAction: "Keep source safety checks current.",
                evidenceQuality: "source_ready",
                freshness: "fresh",
                blocksLaunch: false,
            }],
            operatorDecision: {
                ...readyOperatorDecision(),
                releaseReadiness: {
                    status: "owner_review",
                    ready: false,
                    blockerCount: 0,
                    detail: "Owner review is required.",
                },
            },
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4, 1) });

        expect(model.canonicalPublicBetaTruthState).toBe("failed");
        expect(model.canonicalPublicBetaOperatorDecision).toBeNull();
        expect(model.canonicalPublicBetaReadinessReason).toContain("typed decision or evidence gates are malformed");
    });

    it("keeps missing score provenance unknown instead of presenting it as live", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 99,
            overallStatus: "clean",
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });
        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");

        expect(publicBeta?.sourceDrift).toBe("unknown");
        expect(publicBeta?.truthState).toBe("unknown");
        expect(model.canonicalPublicBetaSourceDrift).toBe("unknown");
        expect(model.canonicalPublicBetaTruthState).toBe("unknown");
    });

    it("suppresses an otherwise ready decision when the score is older than 24 hours", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            operatorDecision: readyOperatorDecision(),
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 5, 1) });

        expect(model.canonicalPublicBetaTruthState).toBe("stale");
        expect(model.canonicalPublicBetaReadinessStatus).toBe("Report refresh needed");
        expect(model.canonicalPublicBetaReadinessReason).toContain("outside the 24-hour freshness window");
        expect(model.canonicalPublicBetaOperatorDecision).toBeNull();
    });

    it("keeps a fresh self-consistent score unknown when the current code version is unavailable", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            overallScore: 100,
            overallStatus: "clean",
            sourceCommit: TEST_HEAD,
            currentHead: TEST_HEAD,
            operatorDecision: readyOperatorDecision(),
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({
            rootDir: root,
            nowMs: Date.UTC(2026, 4, 4, 1),
            repoCurrentHead: null,
        });

        expect(model.canonicalPublicBetaSourceDrift).toBe("unknown");
        expect(model.canonicalPublicBetaTruthState).toBe("unknown");
        expect(model.canonicalPublicBetaStatus).toBe("unknown");
        expect(model.canonicalPublicBetaReadinessReason).toContain("Current code version is unavailable");
        expect(model.canonicalPublicBetaOperatorDecision).toBeNull();
    });

    it("reads current provider-backed site activity caps without old smoke labels", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 84,
            overallStatus: "warning",
            readinessStatus: "Source evidence required",
            readinessStatusReason: "Source evidence required: Provider-backed site activity + deployed route evidence - Produce provider-backed site activity evidence; deployed runtime route evidence is current.",
            evidenceCapDetails: [
                "Source evidence required: Provider-backed site activity + deployed route evidence - Produce provider-backed site activity evidence; deployed runtime route evidence is current.",
            ],
            sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            currentHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });
        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");

        expect(model.canonicalPublicBetaReadinessStatus).toBe("Source activity evidence required");
        expect(model.canonicalPublicBetaCapDetails).toEqual([
            "Source activity evidence required: Produce redacted provider-backed source activity evidence. Deployed route evidence is recorded; keep it fresh.",
        ]);
        expect(publicBeta?.topFindings[0]?.title).toBe("Source activity evidence required");
        expect(publicBeta?.topFindings[0]?.humanReadableWarning).toContain("Produce redacted provider-backed source activity evidence.");
        expect(publicBeta?.topFindings[0]?.humanReadableWarning).toContain("Deployed route evidence is recorded; keep it fresh.");
        expect(JSON.stringify(model)).not.toMatch(/runtime\/provider smoke|formal provider smoke|deployed runtime smoke|first-party admin sample/iu);
    });

    it("formats zero-finding operator report statuses as evidence states", () => {
        expect(formatOperatorReportStatusForAdmin(reportCard({
            status: "DELAYED",
            truthState: "unknown",
        }))).toBe("Waiting for evidence");
        expect(formatOperatorReportStatusForAdmin(reportCard({
            status: "ERROR",
            truthState: "unknown",
        }))).toBe("Needs review");
        expect(formatOperatorReportStatusForAdmin(reportCard({
            id: "public-beta-score",
            status: "ERROR",
            truthState: "failed",
            evidenceGateCount: 4,
            topFindings: [{
                id: "public-beta-runtime-provider-evidence-0",
                reportId: "public-beta-score",
                section: "beta_readiness",
                severity: "major",
                title: "Provider and route evidence required",
                domain: "beta_readiness",
                filePath: "agent/state/public-beta-score.generated.json",
                humanReadableWarning: "Produce redacted provider-backed site activity evidence. Deployed route evidence is still required.",
                suggestedValidator: "npm run check:beta-score",
                evidence: [],
                truthState: "unknown",
            }],
        }))).toBe("Source evidence required");
        expect(formatOperatorReportStatusForAdmin(reportCard({
            id: "public-beta-score",
            status: "ERROR",
            truthState: "failed",
            evidenceGateCount: 1,
            topFindings: [{
                id: "public-beta-source-only-0",
                reportId: "public-beta-score",
                section: "beta_readiness",
                severity: "moderate",
                title: "Source-only behavior evidence",
                domain: "beta_readiness",
                filePath: "agent/state/public-beta-score.generated.json",
                humanReadableWarning: "Implemented behavior checks passed.",
                suggestedValidator: "npm run check:beta-score",
                evidence: [],
                truthState: "live",
            }],
        }))).toBe("Source checks only");
        expect(formatOperatorReportStatusForAdmin(reportCard({
            status: "clean",
            truthState: "stale",
            freshness: "stale_72h",
        }))).toBe("Refresh due");
    });

    it("hydrates self-healing refresh queue items as source-derived evidence", () => {
        const root = createTempRoot();
        writeReport(root, "self-healing-refresh-queue.generated.json", {
            generatedAtUtc: "2026-05-04T00:00:00.000Z",
            reportKey: "self-healing-refresh-queue",
            overallStatus: "pass",
            queue: [
                {
                    artifact: "agent/state/source-refresh.generated.json",
                    staleReason: "source_backed",
                    refreshCommand: "npm run check:source-refresh",
                    canRunAutomatically: true,
                    blockedReason: "",
                    expectedOutcome: "Refresh generated source evidence.",
                },
                {
                    artifact: "runtime_provider_smoke",
                    staleReason: "Source evidence required",
                    refreshCommand: "Attach provider-backed site activity evidence.",
                    canRunAutomatically: false,
                    blockedReason: "blocked_typed_evidence: provider-backed site activity artifact required.",
                    expectedOutcome: "Remain blocked until provider-backed site activity evidence is attached.",
                },
            ],
            summary: {
                total: 2,
                automatic: 1,
                blocked: 1,
            },
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });
        const queue = model.reports.find((report) => report.id === "self-healing-refresh-queue");

        expect(queue?.findingCount).toBe(2);
        expect(queue?.topFindings.map((finding) => finding.title)).toEqual(expect.arrayContaining([
            "Queued source refresh",
            "Source evidence still required",
        ]));
        expect(queue?.topFindings.map((finding) => finding.humanReadableWarning).join(" ")).toContain("runtime_provider_smoke needs source evidence");
        expect(queue?.topFindings.flatMap((finding) => finding.evidence).join(" ")).toContain("Source evidence required");
    });

    it("marks generated report source commit drift as stale instead of live", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 99,
            overallStatus: "clean",
            sourceCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            currentHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });
        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");

        expect(publicBeta?.truthState).toBe("stale");
        expect(publicBeta?.sourceDrift).toBe("stale");
        expect(publicBeta?.topFindings[0]?.title).toContain("report refresh needed");
        expect(model.canonicalPublicBetaStatus).toBe("stale");
        expect(model.canonicalPublicBetaReadinessStatus).toBe("Report refresh needed");
        expect(model.canonicalPublicBetaReadinessReason).toContain("source metadata is stale");
        expect(model.canonicalPublicBetaCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Public beta score source metadata"),
        ]));
        expect(model.canonicalPublicBetaCapDetails.join("\n")).toContain("Refresh due:");
        expect(model.canonicalPublicBetaCapDetails.join("\n")).not.toContain("Stale evidence:");
        expect(model.canonicalPublicBetaSourceDrift).toBe("stale");
        expect(model.canonicalPublicBetaTruthState).toBe("stale");
    });

    it("marks fresh generated snapshots stale when current-head metadata lags the deployed head", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 99,
            overallStatus: "clean",
            readinessStatus: "Ready",
            readinessStatusReason: "Source artifacts are current.",
            currentHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            findings: [],
        });

        const model = buildAdminDebugControlTowerModel({
            rootDir: root,
            nowMs: Date.UTC(2026, 4, 4),
            repoCurrentHead: "cccccccccccccccccccccccccccccccccccccccc",
        });
        const publicBeta = model.reports.find((report) => report.id === "public-beta-score");

        expect(publicBeta?.truthState).toBe("stale");
        expect(publicBeta?.sourceDrift).toBe("stale");
        expect(publicBeta?.topFindings.some((finding) => finding.title.includes("report refresh needed"))).toBe(true);
        expect(model.canonicalPublicBetaReadinessStatus).toBe("Report refresh needed");
        expect(model.canonicalPublicBetaSourceDrift).toBe("stale");
        expect(model.canonicalPublicBetaTruthState).toBe("stale");
    });

    it("wires the compact UI to canonical beta score fields instead of aggregate score", () => {
        const root = process.cwd();
        const component = readFileSync(join(root, "src/app/admin/debug/components/DebugControlTower.tsx"), "utf8");
        const operatorCockpit = readFileSync(join(root, "src/app/admin/debug/components/DebugOperatorCockpit.tsx"), "utf8");
        const publicBetaUi = `${component}\n${operatorCockpit}`;

        expect(component).toContain("canonicalPublicBetaScore");
        expect(component).toContain("canonicalPublicBetaReadinessReason");
        expect(component).toContain("canonicalPublicBetaCapDetails");
        expect(component).toContain("canonicalPublicBetaSourceDrift");
        expect(component).toContain("canonicalPublicBetaTruthState");
        expect(component).toContain("canonicalPublicBetaOperatorDecision");
        expect(component).toContain("canonicalPublicBetaEvidenceGates");
        expect(publicBetaUi).toContain('data-public-beta-composite-role="diagnostic-only"');
        expect(publicBetaUi).toContain('data-public-beta-evidence-source="typed-gates"');
        expect(component).not.toContain("canonicalPublicBetaCapDetails.slice(0, 3)");
        expect(component).toContain('data-debug-visible-summary="single-triage-strip"');
        expect(component).toContain("Details and next steps");
        expect(publicBetaUi).toContain("Source evidence and refresh work");
        expect(component).not.toContain("Needs proof");
        expect(component).not.toContain("Status {model.canonicalPublicBetaStatus}");
        expect(component).not.toContain("Source reports</p>");
        expect(component).not.toContain("model.reportAggregateScore");
        expect(component).not.toContain("model?.overallScore ?? \"--\"");
        expect(operatorCockpit).toContain("data-debug-operator-summary-source-states");
        expect(operatorCockpit).toContain("Needs action {needsActionCount}");
        expect(operatorCockpit).toContain("Refresh due {refreshDueCount}");
        expect(operatorCockpit).toContain("Ready {readyCount}");
        expect(operatorCockpit).not.toContain("Sections {cockpit.summary.sectionCount}");
        expect(operatorCockpit).not.toContain("AI critic {cockpit.summary.aiCriticFindings}");
        expect(operatorCockpit).not.toContain("Playbooks {cockpit.summary.recoveryPlaybooks}");
        expect(operatorCockpit).not.toContain("Score impact:");
    });

    it("keeps the route runtime admin summary compact while preserving chat drilldown", () => {
        const root = process.cwd();
        const monitoring = readFileSync(join(root, "src/app/admin/debug/components/DebugTabMonitoring.tsx"), "utf8");
        const routeDrilldown = readFileSync(join(root, "src/app/admin/debug/components/DebugMonitoringRoutes.tsx"), "utf8");

        expect(monitoring).toContain("routeRuntimeSummary");
        expect(monitoring).toContain("Chat routes");
        expect(monitoring).toContain("Native chat fail");
        expect(monitoring).toContain("Native chat stale");
        expect(monitoring).toContain("Native chat unseen");
        expect(monitoring).toContain("Compat chat fail");
        expect(monitoring).toContain("Compat chat stale");
        expect(monitoring).toContain("Compat chat unseen");
        expect(routeDrilldown).toContain("Native chat error rate");
        expect(routeDrilldown).toContain("Compat error rate");
    });

    it("surfaces critical findings and next actions first", () => {
        const root = createTempRoot();
        writeReport(root, "public-beta-score.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 64,
            overallStatus: "fail",
            findings: [
                {
                    id: "critical-preview-leak",
                    severity: "critical",
                    domain: "contentProtection",
                    title: "Locked preview exposes content URLs",
                    filePath: "src/components/DropPreviewModal.tsx",
                    escalation: "Remove internal URLs from locked preview payload.",
                    evidence: ["contentUrls before entitlement"],
                },
            ],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });

        expect(model.nextActions[0]?.severity).toBe("critical");
        expect(model.nextActions[0]?.affectedFile).toBe("src/components/DropPreviewModal.tsx");
        expect(model.sections.beta_readiness.some((report) => report.id === "public-beta-score")).toBe(true);
    });

    it("dedupes overlapping generated report finding arrays before admin display", () => {
        const root = createTempRoot();
        writeReport(root, "speed-security-hardening.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            overallScore: 52,
            overallStatus: "beta-risk",
            findings: [
                {
                    id: "speed_security_duplicate",
                    severity: "major",
                    title: "Request body cap needed",
                    filePath: "src/app/api/example/route.ts",
                    humanReadableWarning: "API route needs a visible payload size cap.",
                },
            ],
            exploitRisks: [
                {
                    id: "speed_security_duplicate",
                    severity: "major",
                    title: "Request body cap needed",
                    filePath: "src/app/api/example/route.ts",
                    humanReadableWarning: "API route needs a visible payload size cap.",
                },
            ],
            costRisks: [
                {
                    id: "speed_security_unique",
                    severity: "moderate",
                    title: "Potential unbounded Promise.all fanout",
                    filePath: "src/lib/example.ts",
                    humanReadableWarning: "Backend work can fan out too much at once.",
                },
            ],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });
        const speedSecurity = model.reports.find((report) => report.id === "speed-security-hardening");

        expect(speedSecurity?.findingCount).toBe(2);
        expect(speedSecurity?.topFindings.map((finding) => finding.id)).toEqual([
            "speed_security_duplicate",
            "speed_security_unique",
        ]);
    });

    it("derives backlog item truth states instead of showing generic manual proof buckets", () => {
        const root = createTempRoot();
        writeReport(root, "debug-backlog-engine.generated.json", {
            summary: {
                total: 2,
                open: 1,
                fixed: 0,
                deferred: 0,
                blockedManual: 1,
                blockedExternal: 0,
                staleRetired: 0,
                sourceFixable: 0,
                evidenceRefreshable: 0,
                sourceTruthStates: {
                    runtime_proof_required: 1,
                    admin_truth_source_required: 1,
                },
                p0P1Open: 2,
            },
            backlog: [
                {
                    id: "admin-truth-sample",
                    title: "Admin truth sample missing",
                    owner: "admin_debug",
                    surface: "admin_debug",
                    severity: "p1",
                    source: "admin_truth",
                    status: "blocked_manual",
                    fixClass: "manual_required",
                    scoreDimensionImpact: ["evidenceCompleteness"],
                    scoreImpact: 4,
                    sourceFiles: ["agent/state/admin-truth-sample-evidence.generated.json"],
                    sourceRoute: "/admin/debug",
                    evidenceStatus: "formal_missing",
                    evidenceReason: "Admin truth source sample is missing.",
                    exactNextAction: "Attach a redacted admin truth source sample.",
                    sourceMessage: "Admin truth source sample is missing.",
                },
                {
                    id: "runtime-smoke",
                    title: "Runtime smoke missing",
                    owner: "runtime_evidence",
                    surface: "runtime",
                    severity: "p1",
                    source: "beta_score",
                    status: "open",
                    fixClass: "manual_required",
                    scoreDimensionImpact: ["runtimeHealth"],
                    scoreImpact: 4,
                    sourceFiles: ["agent/state/runtime-smoke-evidence.generated.json"],
                    sourceRoute: "/admin/debug",
                    evidenceStatus: "runtime_unverified",
                    evidenceReason: "Deployed runtime evidence is missing.",
                    exactNextAction: "Attach deployed runtime evidence.",
                    sourceMessage: "Deployed runtime evidence is missing.",
                },
            ],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });

        expect(model.debugBacklog.map((item) => item.sourceTruthState)).toEqual([
            "admin_truth_source_required",
            "runtime_proof_required",
        ]);
        expect(JSON.stringify(model.debugBacklog)).not.toContain("\"sourceTruthState\":\"protected_manual_review\"");
    });

    it("keeps debug evidence redacted and support-scoped", () => {
        const model = buildAdminDebugControlTowerModel({
            rootDir: createTempRoot(),
            nowMs: Date.UTC(2026, 4, 4),
            debugEvidenceSource: "firestore",
            debugEvidence: [{
                id: "support-permission",
                fingerprint: "support_admin_403",
                source: "support",
                severity: "critical",
                category: "support",
                route: "/api/admin/support/threads/thread-1",
                message: "Support message detail route returned forbidden.",
                humanMessage: "Support message detail route returned forbidden.",
                occurrenceCount: 5,
                firstSeenAt: Date.UTC(2026, 4, 3),
                lastSeenAt: Date.UTC(2026, 4, 4),
                linkedSupportThreadId: "thread-1",
            }],
        });

        expect(model.liveIssues[0]?.category).toBe("support");
        expect(JSON.stringify(model)).not.toContain("secret support body");
        expect(model.liveIssues[0]?.humanMessage).toContain("forbidden");
    });

    it("loads generated debug evidence when Firestore evidence is unavailable", () => {
        const root = createTempRoot();
        writeReport(root, "debug-evidence-index.generated.json", {
            generatedAt: "2026-05-04T00:00:00.000Z",
            source: "local",
            redacted: true,
            records: [{
                id: "chat-shell-focus",
                fingerprint: "chat_focus_shift",
                source: "client",
                severity: "error",
                category: "chat",
                component: "ChatExperience",
                message: "Chat input focus shifted the shell.",
                humanMessage: "Chat input focus shifted the shell.",
                occurrenceCount: 4,
                firstSeenAt: Date.UTC(2026, 4, 3),
                lastSeenAt: Date.UTC(2026, 4, 4),
            }],
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.UTC(2026, 4, 4) });

        expect(model.debugEvidenceSource).toBe("generated");
        expect(model.liveIssues[0]?.fingerprint).toBe("chat_focus_shift");
        expect(JSON.stringify(model)).not.toContain("secret support body");
    });

    it("keeps browser security boundary issues in the client evidence lane instead of backend failure copy", () => {
        const model = buildAdminDebugControlTowerModel({
            rootDir: createTempRoot(),
            nowMs: Date.UTC(2026, 4, 4),
            debugEvidenceSource: "firestore",
            debugEvidence: [{
                id: "browser-boundary",
                fingerprint: "browser_boundary_admin_debug",
                source: "client",
                severity: "warn",
                category: "browser_security_boundary",
                route: "/admin/debug",
                component: "AdminErrorCatcher",
                message: 'Blocked a frame with origin "https://kandydrops.com" from accessing a cross-origin frame.',
                humanMessage: "Browser blocked cross-origin frame access. This is expected when third-party iframes are protected. App code should not inspect cross-origin frames.",
                occurrenceCount: 4,
                firstSeenAt: Date.UTC(2026, 4, 3),
                lastSeenAt: Date.UTC(2026, 4, 4),
                technicalSummary: {
                    browserSecurityBlocked: true,
                    actionable: false,
                    nonActionableThirdParty: true,
                    sourceSurface: "admin",
                    browserFrameOwner: "paypal",
                },
            }],
        });

        expect(model.liveIssues[0]?.category).toBe("browser_security_boundary");
        expect(model.liveIssues[0]?.severity).toBe("warn");
        expect(model.liveIssues[0]?.truthState).toBe("live");
        expect(model.liveIssues[0]?.nonActionableThirdParty).toBe(true);
        expect(model.liveIssues[0]?.sourceSurface).toBe("admin");
    });

    it("surfaces analytics recovery evidence in Admin Debug without promotion or production backfill", () => {
        const root = process.cwd();
        const route = readFileSync(join(root, "src/app/api/admin/debug/route.ts"), "utf8");
        const runtimeEvidence = readFileSync(join(root, "src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx"), "utf8");
        const debugNow = readFileSync(join(root, "src/app/admin/debug/components/DebugTabNow.tsx"), "utf8");

        expect(route).toContain("adminAnalyticsRecoveryEvidence");
        expect(route).toContain("buildAdminAnalyticsRecoveryEvidenceDebugMetadata");
        expect(route).toContain("productionAllowedNow: false");
        expect(route).toContain("adminAnalyticsPromotedNow: false");
        for (const laneKey of [
            "analytics_identity_links",
            "guest_tracking_indexes",
            "user_journey_indexes",
            "behavioral_timeline_facts",
            "notification_facts",
            "support_recovery_facts",
            "analytics_legacy_recovered_events",
            "analytics_pipeline_daily",
            "analytics_export_status",
            "analytics_guest_batches",
            "analytics_sessions",
            "analytics_event_facts",
        ]) {
            expect(route).toContain(laneKey);
        }
        for (const label of [
            "debug_only",
            "needs_review",
            "recovery_evidence_debug_first",
            "source_confidence",
            "mapping_warning",
            "production_backfill_disabled",
        ]) {
            expect(route).toContain(label);
        }

        expect(runtimeEvidence).toContain("DebugRecoveryEvidenceSummary");
        expect(runtimeEvidence).toContain("data-admin-debug-recovery-evidence");
        expect(runtimeEvidence).toContain("data-admin-debug-recovery-production-allowed");
        expect(runtimeEvidence).toContain("data-admin-debug-recovery-summary-compact=\"true\"");
        expect(runtimeEvidence).toContain("data-admin-debug-recovery-details-default=\"collapsed\"");
        expect(runtimeEvidence).toContain("data-admin-debug-recovery-no-scrollwrap=\"true\"");
        expect(runtimeEvidence).toContain("data-admin-debug-recovery-details=\"collapsed_by_default\"");
        expect(runtimeEvidence).toContain("productionAllowedNow=false");
        expect(runtimeEvidence).toContain("adminAnalyticsPromotedNow");
        expect(runtimeEvidence).toContain("data-admin-debug-recovery-lane-detail-default=\"collapsed\"");
        expect(runtimeEvidence).not.toContain("ScrollWrap");
        expect(runtimeEvidence).not.toContain("overflow-auto");
        expect(debugNow).toContain("<DebugRecoveryEvidenceSummary recoveryEvidence={data?.adminAnalyticsRecoveryEvidence} />");
        expect(debugNow).not.toContain("title=\"Business truth now\"");
    });

    it("surfaces GumDrop recovery queue state without promoting analytics-only evidence", () => {
        const root = createTempRoot();
        writeReport(root, "recovery-timeline-spine.generated.json", {
            reportKey: "recovery-timeline-spine",
            generatedAtUtc: "2026-06-08T00:00:00.000Z",
            status: "pass",
            treasuryTimelineReconciliation: {
                summary: {
                    ledger_confirmed: 3,
                    analytics_correlated: 2,
                    analytics_missing: 1,
                    ledger_missing_protected: 2,
                    duplicate_risk: 0,
                    source_bucket_mismatch: 1,
                    productTruthEligibleCount: 3,
                },
            },
            gumdropRecoveryQueue: {
                summary: {
                    queueItemCount: 4,
                    ledgerProofRequiredCount: 2,
                    analyticsOnlyRejectedCount: 2,
                    duplicateRiskCount: 0,
                    sourceBucketMismatchCount: 1,
                    moneyAffectingRecoveryAllowedCount: 0,
                },
                productTruthPolicy: {
                    dryRunOnly: true,
                    creditsOrDebitsUsers: false,
                    backfillsTransactions: false,
                    analyticsOnlyCanChangeBalance: false,
                },
            },
        });
        writeReport(root, "canonical-math-ledger.generated.json", {
            reportKey: "canonical-math-ledger",
            generatedAtUtc: "2026-06-08T00:00:00.000Z",
            status: "pass",
        });

        const model = buildAdminDebugControlTowerModel({ rootDir: root, nowMs: Date.parse("2026-06-08T01:00:00.000Z") });

        expect(model.gumdropRecovery.displayState).toBe("protected_manual_review");
        expect(model.gumdropRecovery.truthState).toBe("failed");
        expect(model.gumdropRecovery.treasury).toMatchObject({
            ledgerConfirmed: 3,
            ledgerMissingProtected: 2,
            sourceBucketMismatch: 1,
            productTruthEligibleCount: 3,
        });
        expect(model.gumdropRecovery.recoveryQueue).toMatchObject({
            queueItemCount: 4,
            ledgerProofRequiredCount: 2,
            analyticsOnlyRejectedCount: 2,
            moneyAffectingRecoveryAllowedCount: 0,
        });
        expect(model.gumdropRecovery.analyticsOnlyEvidenceLabel).toBe("diagnostic_only_not_treasury_truth");
        expect(model.gumdropRecovery.nextAction).toContain("ledger/server proof");
    });

    it("keeps GumDrop recovery display source-visible and compact in Admin Debug", () => {
        const root = process.cwd();
        const controlTower = readFileSync(join(root, "src/app/admin/debug/components/DebugControlTower.tsx"), "utf8");
        const runtimeEvidence = readFileSync(join(root, "src/app/admin/debug/components/DebugRuntimeEvidenceGroups.tsx"), "utf8");

        expect(controlTower).toContain("DebugGumdropRecoverySummary");
        expect(runtimeEvidence).toContain("data-admin-debug-gumdrop-recovery=\"true\"");
        expect(runtimeEvidence).toContain("data-admin-debug-gumdrop-recovery-state");
        expect(runtimeEvidence).toContain("data-admin-debug-gumdrop-recovery-analytics-only");
        expect(runtimeEvidence).toContain("data-admin-debug-gumdrop-recovery-ledger-review-count");
        expect(runtimeEvidence).toContain("diagnostic_only_not_treasury_truth");
        expect(runtimeEvidence).toContain("money-action-allowed");
        expect(runtimeEvidence).toContain("ledger source needed");
        expect(runtimeEvidence).not.toContain("proof required");
        expect(runtimeEvidence).toContain("Ledger/server proof remains money truth");
        expect(runtimeEvidence).toContain("data-admin-debug-gumdrop-recovery-details=\"collapsed_by_default\"");
    });
});
