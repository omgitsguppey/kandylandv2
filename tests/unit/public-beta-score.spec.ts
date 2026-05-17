import { describe, expect, it } from "vitest";

import {
    buildPublicBetaFinding,
    buildPublicBetaScoreReport,
    dedupePublicBetaFindings,
    type PublicBetaFinding,
} from "@/lib/agent-score/core";
import { assertAutofixGate, type PublicBetaAutofixPlan } from "@/lib/agent-score/autofix";
import { buildPublicBetaCommandBudget } from "@/lib/agent-score/reporting";
import type { DebugEvidenceAuditSummary } from "@/lib/debug-evidence-contract";

const freshEvidence = {
    requiredReports: [
        {
            path: "agent/state/final-launch-readiness-report.generated.json",
            generatedAt: new Date().toISOString(),
            freshness: "fresh" as const,
        },
    ],
    debugEvidence: {
        layout: [{
            id: "debug-1",
            fingerprint: "debug-1",
            source: "audit",
            severity: "info",
            category: "layout",
            message: "sample",
            humanMessage: "sample",
            occurrenceCount: 1,
            firstSeenAt: Date.now(),
            lastSeenAt: Date.now(),
        } satisfies DebugEvidenceAuditSummary],
    },
    targetedBehaviorEvidence: {
        path: "agent/state/targeted-behavior-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Targeted behavior validators passed.",
        evidence: ["targetedBehavior.status=passed"],
    },
    visualManualEvidence: {
        path: "agent/state/manual-smoke-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Manual visual smoke passed.",
        evidence: ["visualManual.status=passed"],
    },
    providerSmokeEvidence: {
        path: "agent/state/provider-smoke-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Formal provider smoke passed.",
        evidence: ["providerArtifactStatus=passed"],
    },
    runtimeSmokeEvidence: {
        path: "agent/state/runtime-smoke-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Formal runtime smoke passed.",
        evidence: ["runtimeArtifactStatus=passed"],
    },
    adminTruthSampleEvidence: {
        path: "agent/state/admin-truth-sample-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Fresh admin truth sample attached.",
        evidence: ["adminTruthSampleArtifactStatus=passed", "sampleCount=1"],
    },
    openPrTriageFresh: true,
};

const missingTargetedBehaviorEvidence = {
    path: "agent/state/targeted-behavior-evidence.generated.json",
    status: "missing_formal_evidence",
    passed: false,
    detail: "No formal targeted behavior evidence artifact was supplied.",
    evidence: ["targetedBehaviorArtifactStatus=missing_formal_evidence"],
};

const missingProviderSmokeEvidence = {
    path: "agent/state/provider-smoke-evidence.generated.json",
    status: "missing_formal_evidence",
    passed: false,
    detail: "Operator reported PayPal refill was tested but no screenshot/log attached.",
    evidence: ["providerArtifactStatus=missing_formal_evidence", "paypalRefillSmoke.status=operator_reported_not_formal_provider_smoke"],
};

const runtimeUnverifiedEvidence = {
    path: "agent/state/runtime-smoke-evidence.generated.json",
    status: "runtime_unverified",
    passed: false,
    detail: "No deployed runtime smoke.",
    evidence: ["runtimeArtifactStatus=runtime_unverified", "runtimeDeploymentSmokePassed=false"],
};

const missingAdminTruthEvidence = {
    path: "agent/state/admin-truth-sample-evidence.generated.json",
    status: "missing_or_unknown",
    passed: false,
    detail: "No fresh admin truth sample.",
    evidence: ["adminTruthSampleArtifactStatus=missing_or_unknown", "sampleCount=0"],
};

describe("public beta scoring math", () => {
    it("applies severity, confidence, blast radius, and recency multipliers", () => {
        const finding = buildPublicBetaFinding({
            domain: "economy",
            category: "purchase-bonus-source",
            title: "Paid pack bonus credited to reward balance",
            severity: "critical",
            confidence: 1,
            blastRadius: "payment",
            filePath: "src/app/api/paypal/capture/route.ts",
            canAutofix: false,
            autofixConfidence: 0,
            escalation: "Do not autofix payment capture logic.",
            evidence: ["bonus credited to reward"],
            docsBasis: ["repo", "kandydrops"],
        }, ["src/app/api/paypal/capture/route.ts"]);

        expect(finding.rawPenalty).toBe(25);
        expect(finding.weightedPenalty).toBe(50.31);
    });

    it("forces failure for high-confidence critical findings", () => {
        const report = buildPublicBetaScoreReport([{
            domain: "contentProtection",
            category: "content-leak",
            title: "Locked preview exposes contentUrl",
            severity: "critical",
            confidence: 0.99,
            blastRadius: "content",
            filePath: "src/components/Drops/LockedDropPreviewView.tsx",
            canAutofix: false,
            autofixConfidence: 0,
            escalation: "Stop and inspect safe preview payload mapping.",
            evidence: ["contentUrl in preview"],
            docsBasis: ["repo"],
        }], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: freshEvidence,
        });

        expect(report.overallStatus).toBe("fail");
        expect(report.domainScores.contentProtection.status).toBe("fail");
    });

    it("does not report clean when scanners find nothing but evidence is missing", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
        });

        expect(report.scannerScore).toBe(100);
        expect(report.scannerStatus).toBe("clean");
        expect(report.scoreExplanation.scannerScoreMeaning).toContain("scanner-only");
        expect(report.scoreExplanation.betaExitBlockedBy).toEqual(expect.arrayContaining([
            expect.stringContaining("Visual/manual smoke"),
        ]));
        expect(report.overallStatus).not.toBe("clean");
        expect(report.readinessStatus).not.toBe("Ready");
        expect(report.overallScore).toBeLessThan(100);
        expect(report.evidenceCapsApplied.length).toBeGreaterThan(0);
    });

    it("records cost-readiness lanes without treating source-only inventory as beta-exit proof", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                costReadiness: {
                    cloudRunCostReadiness: {
                        status: "cost_review_required",
                        detail: "Speed/security still has cost findings.",
                        evidence: ["speedSecurity.costRunawayWorkControls.findingCount=6"],
                        blocksBetaExit: false,
                    },
                    cloudSqlCostReadiness: {
                        status: "not_detected_in_repo",
                        detail: "No creator runtime Cloud SQL usage was detected.",
                        evidence: ["cloud-sql-agent-mirror-only"],
                        blocksBetaExit: false,
                    },
                    geminiCloudAssistCostReadiness: {
                        status: "cost_review_required",
                        detail: "Gemini and Vertex remain owner-review cost lanes.",
                        evidence: ["admin-ai-cost-surface-out-of-scope"],
                        blocksBetaExit: false,
                    },
                    route4xxReadiness: {
                        status: "source_inventory_complete",
                        detail: "Expected 4xx paths are classified and unexpected frontend 4xx was fixed.",
                        evidence: ["unexpected4xxFixed=1"],
                        blocksBetaExit: false,
                    },
                },
            },
        });

        expect(report.costReadiness.cloudRunCostReadiness.status).toBe("cost_review_required");
        expect(report.costReadiness.cloudSqlCostReadiness.status).toBe("not_detected_in_repo");
        expect(report.costReadiness.cloudSqlCostReadiness.status).not.toBe("pass");
        expect(report.costReadiness.route4xxReadiness.blocksBetaExit).toBe(false);
        expect(report.scoreExplanation.sourcePassConfidence).toContain("does not clear");
    });

    it("downgrades stale generated reports", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                requiredReports: [{
                    path: "agent/state/final-launch-readiness-report.generated.json",
                    generatedAt: "2026-05-01T00:00:00.000Z",
                    freshness: "stale",
                    ageHours: 48,
                }],
            },
        });

        expect(report.readinessStatus).toBe("Stale evidence");
        expect(report.overallStatus).toBe("beta-risk");
        expect(report.overallScore).toBeLessThan(100);
    });

    it("marks empty debug evidence as unknown", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                debugEvidence: { layout: [] },
            },
        });

        expect(report.evidenceGates).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "debugRuntimeEvidence", status: "Unknown evidence" }),
        ]));
        expect(report.readinessStatus).toBe("Unknown evidence");
    });

    it("caps missing visual evidence at Visual QA required", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                visualManualEvidence: {
                    path: "agent/state/manual-smoke-evidence.generated.json",
                    status: "missing_formal_evidence",
                    passed: false,
                    detail: "No valid visual/manual evidence artifact was supplied.",
                    evidence: ["visualManualArtifactStatus=missing_formal_evidence"],
                },
            },
        });

        expect(report.readinessStatus).toBe("Visual QA required");
        expect(report.overallStatus).toBe("warning");
    });

    it("caps missing provider smoke as smoke required", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: missingProviderSmokeEvidence,
            },
        });

        expect(report.readinessStatus).toBe("Ready with smoke required");
        expect(report.overallScore).toBeLessThan(100);
    });

    it("keeps operator-reported PayPal out of provider smoke credit", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: {
                    path: "agent/state/provider-smoke-evidence.generated.json",
                    status: "operator_reported_not_formal_provider_smoke",
                    passed: false,
                    detail: "Operator reported PayPal refill was tested but no artifact attached.",
                    evidence: ["paypalRefillSmoke.status=operator_reported_not_formal_provider_smoke"],
                },
                runtimeSmokeEvidence: runtimeUnverifiedEvidence,
            },
        });

        const smokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
        expect(smokeGate?.status).not.toBe("Ready");
        expect(smokeGate?.score).toBe(0);
        expect(smokeGate?.evidence.join("\n")).toContain("providerArtifactStatus=operator_reported_not_formal_provider_smoke");
        expect(smokeGate?.evidence.join("\n")).toContain("runtimeArtifactStatus=runtime_unverified");
    });

    it("keeps runtime_unverified out of runtime smoke credit", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                runtimeSmokeEvidence: runtimeUnverifiedEvidence,
            },
        });

        const smokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
        expect(smokeGate?.status).toBe("Runtime unverified");
        expect(smokeGate?.score).toBe(0);
        expect(smokeGate?.evidence.join("\n")).toContain("runtimeArtifactStatus=runtime_unverified");
    });

    it("awards smoke credit only when provider and runtime artifacts pass", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: freshEvidence,
        });

        const smokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
        expect(smokeGate?.status).toBe("Ready");
        expect(smokeGate?.score).toBe(15);
    });

    it("keeps missing_or_unknown admin truth from passing", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                adminTruthSampleEvidence: missingAdminTruthEvidence,
            },
        });

        const adminGate = report.evidenceGates.find((gate) => gate.id === "adminTruthSamples");
        expect(adminGate?.status).toBe("Unknown evidence");
        expect(adminGate?.score).toBe(0);
        expect(adminGate?.evidence.join("\n")).toContain("adminTruthSampleArtifactStatus=missing_or_unknown");
    });

    it("awards admin truth credit when the artifact passes", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: freshEvidence,
        });

        const adminGate = report.evidenceGates.find((gate) => gate.id === "adminTruthSamples");
        expect(adminGate?.status).toBe("Ready");
        expect(adminGate?.score).toBe(10);
    });

    it("keeps missing targeted behavior artifact non-passing without hardcoded false", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                targetedBehaviorEvidence: missingTargetedBehaviorEvidence,
            },
        });

        const targetedGate = report.evidenceGates.find((gate) => gate.id === "targetedBehaviorTests");
        expect(targetedGate?.status).toBe("Unknown evidence");
        expect(targetedGate?.score).toBe(0);
        expect(targetedGate?.detail).toContain("No formal targeted behavior evidence artifact");
        expect(targetedGate?.evidence.join("\n")).toContain("artifactStatus=missing_formal_evidence");
    });

    it("exposes all active cap details", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                targetedBehaviorEvidence: missingTargetedBehaviorEvidence,
                visualManualEvidence: {
                    path: "agent/state/manual-smoke-evidence.generated.json",
                    status: "missing_formal_evidence",
                    passed: false,
                    detail: "No valid visual/manual evidence artifact was supplied.",
                    evidence: ["visualManualArtifactStatus=missing_formal_evidence"],
                },
                providerSmokeEvidence: missingProviderSmokeEvidence,
                runtimeSmokeEvidence: runtimeUnverifiedEvidence,
                adminTruthSampleEvidence: missingAdminTruthEvidence,
            },
        });

        expect(report.evidenceCapDetails.length).toBeGreaterThan(3);
        expect(report.evidenceCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Targeted behavior tests - No formal targeted behavior evidence artifact was supplied."),
            expect.stringContaining("Runtime/provider smoke - Provider smoke:"),
            expect.stringContaining("Admin truth/sample evidence - No fresh admin truth sample."),
        ]));
    });

    it("does not use final launch report text as provider smoke truth", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                requiredReports: [{
                    path: "agent/state/final-launch-readiness-report.generated.json",
                    generatedAt: new Date().toISOString(),
                    freshness: "fresh" as const,
                }],
                providerSmokeEvidence: missingProviderSmokeEvidence,
            },
        });

        const smokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
        expect(smokeGate?.status).toBe("Ready with smoke required");
        expect(smokeGate?.score).toBe(0);
        expect(smokeGate?.evidence.join("\n")).toContain("providerArtifactStatus=missing_formal_evidence");
    });

    it("allows ready only when scanner and evidence gates are fresh", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: freshEvidence,
        });

        expect(report.overallScore).toBe(100);
        expect(report.overallStatus).toBe("clean");
        expect(report.readinessStatus).toBe("Ready");
    });

    it("dedupes duplicate findings and keeps the strongest evidence", () => {
        const first = buildPublicBetaFinding({
            domain: "layout",
            category: "viewport-unit",
            title: "Shell-critical mobile layout uses 100vh instead of 100dvh",
            severity: "moderate",
            confidence: 0.8,
            blastRadius: "component",
            filePath: "src/components/Chat/ChatRouteShell.tsx",
            line: 12,
            excerpt: "height: 100vh",
            canAutofix: true,
            autofixConfidence: 0.96,
            escalation: "Use repair gate.",
            evidence: ["first"],
            docsBasis: ["repo"],
        });
        const second = buildPublicBetaFinding({
            ...first,
            severity: "major",
            confidence: 0.95,
            evidence: ["second"],
        });

        const deduped = dedupePublicBetaFindings([first, second]);

        expect(deduped).toHaveLength(1);
        expect(deduped[0]?.severity).toBe("major");
        expect(deduped[0]?.evidence).toEqual(expect.arrayContaining(["first", "second"]));
    });

    it("refuses low-confidence autofixes", () => {
        const finding = {
            id: "layout-viewport-low",
            domain: "layout",
            category: "viewport-unit",
            title: "100vh",
            severity: "major",
            confidence: 0.9,
            blastRadius: "component",
            filePath: "src/components/Chat/ChatRouteShell.tsx",
            rawPenalty: 9,
            weightedPenalty: 9,
            canAutofix: true,
            autofixConfidence: 0.94,
            escalation: "test",
            evidence: ["test"],
            docsBasis: ["repo"],
        } satisfies PublicBetaFinding;
        const plan = {
            findingId: finding.id,
            filePath: finding.filePath,
            oldText: "100vh",
            newText: "100dvh",
            expectedOccurrences: 1,
            description: "test",
            confidence: 0.94,
        } satisfies PublicBetaAutofixPlan;

        expect(assertAutofixGate(finding, plan, "height: 100vh;")).toContain("below 0.95");
    });
});
