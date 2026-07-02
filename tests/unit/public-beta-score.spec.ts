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

const freshGeneratedAtUtc = new Date().toISOString();
const staleGeneratedAtUtc = "2026-05-01T00:00:00.000Z";

const freshEvidence = {
    requiredReports: [
        {
            path: "agent/state/final-launch-readiness-report.generated.json",
            generatedAt: freshGeneratedAtUtc,
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
        generatedAtUtc: freshGeneratedAtUtc,
    },
    uiSurfaceCoverageEvidence: {
        path: "agent/state/ui-visual-smoke-minimal.generated.json",
        status: "source_surface_checks_current",
        passed: true,
        detail: "Deterministic UI surface coverage passed.",
        evidence: ["uiVisualSmoke.status=source_surface_checks_current"],
        generatedAtUtc: freshGeneratedAtUtc,
    },
    providerSmokeEvidence: {
        path: "agent/state/provider-smoke-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Provider-backed site activity evidence passed.",
        evidence: ["providerArtifactStatus=passed"],
        generatedAtUtc: freshGeneratedAtUtc,
    },
    runtimeSmokeEvidence: {
        path: "agent/state/runtime-smoke-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Deployed runtime route evidence passed.",
        evidence: ["runtimeArtifactStatus=passed"],
        generatedAtUtc: freshGeneratedAtUtc,
    },
    debugRuntimeEvidenceArtifact: {
        path: "agent/state/debug-runtime-evidence.generated.json",
        status: "source_ready_debug_runtime_evidence",
        passed: true,
        detail: "Source-backed debug runtime evidence is current.",
        evidence: ["sourceBackedRuntimeConfidence=100", "deployedRuntimeSmokeCleared=false"],
        generatedAtUtc: freshGeneratedAtUtc,
    },
    behaviorMathEvidence: {
        path: "agent/state/behavior-math-evidence.generated.json",
        status: "source_ready_behavior_math",
        passed: true,
        detail: "Behavior math evidence is source-ready.",
        evidence: ["behaviorMathConfidence=85"],
        generatedAtUtc: freshGeneratedAtUtc,
    },
    adminTruthSampleEvidence: {
        path: "agent/state/admin-truth-sample-evidence.generated.json",
        status: "passed",
        passed: true,
        detail: "Fresh admin source activity sample supplied.",
        evidence: [
            "adminTruthSampleArtifactStatus=passed",
            "sampleCount=1",
            "formalAdminTruthSamplePassed=true",
            "productionSampleAttached=true",
        ],
        generatedAtUtc: freshGeneratedAtUtc,
    },
    openPrTriageFresh: true,
};

const missingTargetedBehaviorEvidence = {
    path: "agent/state/targeted-behavior-evidence.generated.json",
    status: "missing_formal_evidence",
    passed: false,
    detail: "No targeted source behavior evidence artifact was supplied.",
    evidence: ["targetedBehaviorArtifactStatus=missing_formal_evidence"],
};

const missingProviderSmokeEvidence = {
    path: "agent/state/provider-smoke-evidence.generated.json",
    status: "missing_formal_evidence",
    passed: false,
    detail: "Operator reported PayPal refill was tested but no provider-backed source artifact was produced.",
    evidence: ["providerArtifactStatus=missing_formal_evidence", "paypalRefillSmoke.status=operator_reported_not_formal_provider_smoke"],
};

const runtimeUnverifiedEvidence = {
    path: "agent/state/runtime-smoke-evidence.generated.json",
    status: "runtime_unverified",
    passed: false,
    detail: "No deployed runtime route evidence.",
    evidence: ["runtimeArtifactStatus=runtime_unverified", "runtimeDeploymentSmokePassed=false"],
};

const missingAdminTruthEvidence = {
    path: "agent/state/admin-truth-sample-evidence.generated.json",
    status: "missing_or_unknown",
    passed: false,
    detail: "No admin source activity sample.",
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
            expect.stringContaining("Provider-backed site activity + deployed route evidence"),
        ]));
        expect(report.evidenceWeights.runtimeProviderSmoke).toBeGreaterThan(report.evidenceWeights.targetedBehaviorTests);
        expect(report.evidenceWeights.runtimeProviderSmoke + report.evidenceWeights.adminTruthSamples)
            .toBeGreaterThan(report.evidenceWeights.sourceSafety + report.evidenceWeights.freshnessIntegrity);
        expect(report.healthScoreBreakdown.runtimeHealth.weight + report.healthScoreBreakdown.evidenceCompleteness.weight)
            .toBeGreaterThan(report.healthScoreBreakdown.sourceHealth.weight + report.healthScoreBreakdown.freshness.weight);
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

    it("marks empty debug evidence as source evidence required", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                debugEvidence: { layout: [] },
                debugRuntimeEvidenceArtifact: undefined,
            },
        });

        expect(report.evidenceGates).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "debugRuntimeEvidence", status: "Source evidence required" }),
        ]));
        expect(report.readinessStatus).not.toBe("Ready");
    });

    it("keeps missing UI source coverage from clearing the UI lane", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                uiSurfaceCoverageEvidence: {
                    path: "agent/state/ui-visual-smoke-minimal.generated.json",
                    status: "source_surface_checks_failed",
                    passed: false,
                    detail: "UI surface source coverage found gaps.",
                    evidence: ["uiVisualSmoke.status=source_surface_checks_failed", "uiVisualSmoke.missingSurfaces=admin_debug_summary_mobile"],
                },
            },
        });

        expect(report.operatorFinalChecks.uiVisualSurfaces.needsOperatorReview).toBe(true);
        expect(report.launchClearance.formalGates.uiSurfaceCoverage.cleared).toBe(false);
    });

    it("classifies missing provider smoke as source evidence required", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: missingProviderSmokeEvidence,
            },
        });

        expect(report.readinessStatus).toBe("Source evidence required");
        expect(report.overallScore).toBeLessThan(100);
    });

    it("keeps provider-backed site activity as the remaining cap when runtime route evidence is current", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: {
                    ...missingProviderSmokeEvidence,
                    generatedAtUtc: freshGeneratedAtUtc,
                },
                runtimeSmokeEvidence: {
                    ...freshEvidence.runtimeSmokeEvidence,
                    status: "formal_runtime_smoke_passed",
                    evidence: [
                        "runtimeArtifactStatus=formal_runtime_smoke_passed",
                        "runtimeDeploymentSmokePassed=true",
                    ],
                    generatedAtUtc: freshGeneratedAtUtc,
                },
            },
        });

        const smokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
        expect(smokeGate?.status).toBe("Source evidence required");
        expect(smokeGate?.detail).toContain("Provider-backed site activity:");
        expect(smokeGate?.detail).toContain("Deployed runtime route evidence is current.");
        expect(report.evidenceCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Produce provider-backed site activity evidence; deployed runtime route evidence is current."),
        ]));
        expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.deployedRuntimeSmoke.cleared).toBe(true);
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
        expect(smokeGate?.status).toBe("Source evidence required");
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
        expect(smokeGate?.score).toBe(24);
    });

    it("does not clear source gates from legacy evidence booleans", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                targetedBehaviorEvidence: undefined,
                providerSmokeEvidence: undefined,
                runtimeSmokeEvidence: undefined,
                adminTruthSampleEvidence: undefined,
                hasTargetedBehaviorEvidence: true,
                hasProviderSmokeEvidence: true,
                hasAdminTruthSampleEvidence: true,
            },
        });

        expect(report.evidenceGates).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "targetedBehaviorTests", status: "Source validation only", score: 0 }),
            expect.objectContaining({ id: "runtimeProviderSmoke", status: "Source evidence required", score: 0 }),
            expect.objectContaining({ id: "adminTruthSamples", status: "Source evidence required", score: 0 }),
        ]));
        expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.deployedRuntimeSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.adminTruthSample.cleared).toBe(false);
    });

    it("classifies passed targeted behavior artifacts as source-only when the artifact says source behavior only", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                targetedBehaviorEvidence: {
                    ...freshEvidence.targetedBehaviorEvidence,
                    detail: "Current implemented source behavior validators passed. This is targeted behavior evidence only and does not close provider-backed site activity, deployed route evidence, or admin source activity evidence.",
                    evidence: [
                        "targetedBehavior.status=passed",
                        "formalEvidenceImpact=source_behavior_only",
                    ],
                },
            },
        });

        const targetedGate = report.evidenceGates.find((gate) => gate.id === "targetedBehaviorTests");
        expect(targetedGate?.status).toBe("Source validation only");
        expect(targetedGate?.evidenceQuality).toBe("source_ready");
        expect(targetedGate?.runtimeCredit).toBe(0);
        expect(targetedGate?.detail).toContain("does not close provider-backed site activity");
        expect(targetedGate?.partialReason).toContain("matching site activity records");
        expect(targetedGate?.partialReason).not.toContain("manual proof");
        expect(report.evidenceCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Source validation only: Targeted behavior tests"),
        ]));
        expect(report.evidenceCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Source behavior passed; deployed route evidence, provider-backed site activity, and admin source activity lanes still need their matching records."),
        ]));
        expect(report.evidenceCapDetails.join("\n")).not.toContain("attach targeted source validator evidence");
        expect(report.evidenceCapDetails.join("\n")).not.toContain("does not prove visual review");
        expect(targetedGate?.detail).toContain("does not close provider-backed site activity");
    });

    it("uses source-ready behavior math as targeted behavior source credit without clearing runtime gates", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                targetedBehaviorEvidence: missingTargetedBehaviorEvidence,
                providerSmokeEvidence: { ...missingProviderSmokeEvidence, generatedAtUtc: freshGeneratedAtUtc },
                runtimeSmokeEvidence: { ...runtimeUnverifiedEvidence, generatedAtUtc: freshGeneratedAtUtc },
                adminTruthSampleEvidence: missingAdminTruthEvidence,
                behaviorMathEvidence: {
                    path: "agent/state/behavior-math-verification.generated.json",
                    status: "source_ready_behavior_math",
                    passed: true,
                    detail: "Behavior math is source-ready from first-party user activity, person metrics, and watch-session rollups.",
                    evidence: [
                        "behaviorMathConfidence=88",
                        "watchTimeTruth=watch_session_rollups_only_not_page_time",
                        "disabledTrackingHandling=excluded_from_behavior_metrics",
                    ],
                    generatedAtUtc: freshGeneratedAtUtc,
                },
            },
        });

        const targetedGate = report.evidenceGates.find((gate) => gate.id === "targetedBehaviorTests");
        const runtimeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");

        expect(targetedGate?.status).toBe("Source validation only");
        expect(targetedGate?.sourceCredit).toBe(88);
        expect(targetedGate?.runtimeCredit).toBe(0);
        expect(targetedGate?.detail).toContain("Source-ready behavior math/site activity evidence was supplied");
        expect(targetedGate?.evidence.join("\n")).toContain("behaviorMathSourceCredit=88");
        expect(targetedGate?.evidence.join("\n")).toContain("watch_session_rollups_only_not_page_time");
        expect(runtimeGate?.runtimeCredit).toBe(0);
        expect(report.evidenceCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Source activity evidence is present; attach targeted source validator evidence"),
        ]));
        expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.deployedRuntimeSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.adminTruthSample.cleared).toBe(false);
    });

    it("uses activity verification as source-only targeted behavior credit without clearing formal gates", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                targetedBehaviorEvidence: missingTargetedBehaviorEvidence,
                behaviorMathEvidence: undefined,
                providerSmokeEvidence: { ...missingProviderSmokeEvidence, generatedAtUtc: freshGeneratedAtUtc },
                runtimeSmokeEvidence: { ...runtimeUnverifiedEvidence, generatedAtUtc: freshGeneratedAtUtc },
                adminTruthSampleEvidence: missingAdminTruthEvidence,
                activityVerificationEvidence: {
                    path: "agent/state/activity-verification-engine.generated.json",
                    status: "source_ready_activity_verification",
                    passed: true,
                    detail: "Source-backed activity verification found score-eligible first-party activity.",
                    evidence: [
                        "activityVerification.verifiedByActivity=3",
                        "activityVerification.sourceReadyNoActivity=4",
                        "activityVerification.scoreEligibleActivity=3",
                        "activityVerification.confidenceScore=86",
                        "activityVerification.formalGatesCleared=false",
                    ],
                    generatedAtUtc: freshGeneratedAtUtc,
                },
            },
        });

        const targetedGate = report.evidenceGates.find((gate) => gate.id === "targetedBehaviorTests");
        const runtimeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");

        expect(targetedGate?.status).toBe("Source validation only");
        expect(targetedGate?.sourceCredit).toBe(86);
        expect(targetedGate?.runtimeCredit).toBe(0);
        expect(targetedGate?.evidence.join("\n")).toContain("activityVerificationSourceCredit=86");
        expect(targetedGate?.evidence.join("\n")).toContain("activityVerification.verifiedByActivity=3");
        expect(runtimeGate?.runtimeCredit).toBe(0);
        expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.deployedRuntimeSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.adminTruthSample.cleared).toBe(false);
    });

    it("does not score stale site activity and admin artifacts as current source evidence", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: {
                    ...freshEvidence.providerSmokeEvidence,
                    generatedAtUtc: staleGeneratedAtUtc,
                },
                runtimeSmokeEvidence: {
                    ...freshEvidence.runtimeSmokeEvidence,
                    generatedAtUtc: staleGeneratedAtUtc,
                },
                adminTruthSampleEvidence: {
                    ...freshEvidence.adminTruthSampleEvidence,
                    generatedAtUtc: staleGeneratedAtUtc,
                },
            },
        });

        expect(report.evidenceGates).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "runtimeProviderSmoke", status: "Stale evidence", score: 0 }),
            expect.objectContaining({ id: "adminTruthSamples", status: "Stale evidence", score: 0 }),
        ]));
        expect(report.evidenceCapDetails).toEqual(expect.arrayContaining([
            "Stale evidence: Provider-backed site activity + deployed route evidence - Refresh provider-backed site activity and deployed runtime route evidence.",
            "Stale evidence: Admin source activity sample evidence - Refresh the redacted admin source activity sample.",
        ]));
        expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.deployedRuntimeSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.adminTruthSample.cleared).toBe(false);
    });

    it("does not score passing artifacts with unknown freshness", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: {
                    ...freshEvidence.providerSmokeEvidence,
                    generatedAtUtc: undefined,
                },
                runtimeSmokeEvidence: {
                    ...freshEvidence.runtimeSmokeEvidence,
                    generatedAtUtc: undefined,
                },
                adminTruthSampleEvidence: {
                    ...freshEvidence.adminTruthSampleEvidence,
                    generatedAtUtc: undefined,
                },
            },
        });

        expect(report.evidenceGates).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: "runtimeProviderSmoke", status: "Unknown evidence", score: 0 }),
            expect.objectContaining({ id: "adminTruthSamples", status: "Unknown evidence", score: 0 }),
        ]));
        expect(report.evidenceCapDetails.join("\n")).toContain("Unknown evidence: Provider-backed site activity + deployed route evidence");
        expect(report.evidenceCapDetails.join("\n")).toContain("Unknown evidence: Admin source activity sample evidence");
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
        expect(adminGate?.status).toBe("Source evidence required");
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
        expect(adminGate?.score).toBe(12);
    });

    it("does not let historical stale admin samples poison a current passing source activity sample", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                adminTruthSampleEvidence: {
                    path: "agent/state/admin-truth-sample-evidence.generated.json",
                    status: "formal_admin_truth_sample_passed",
                    passed: true,
                    detail: "Keep the redacted first-party admin source activity JSON sample fresh.",
                    evidence: [
                        "adminTruthSampleArtifactStatus=formal_admin_truth_sample_passed",
                        "sampleCount=1",
                        "freshAdminTruthSampleAttached=true",
                        "adminTruthSample.passingArtifact=agent/evidence/admin-truth-sample/current.json",
                        "adminTruthSample.staleArtifacts=1",
                        "adminTruthSample.staleArtifact=agent/evidence/admin-truth-sample/old.json",
                        "adminTruthSample.staleReason=old artifact is stale",
                    ],
                    generatedAtUtc: freshGeneratedAtUtc,
                },
            },
        });

        const adminGate = report.evidenceGates.find((gate) => gate.id === "adminTruthSamples");
        expect(adminGate?.status).toBe("Ready");
        expect(adminGate?.score).toBe(12);
        expect(report.evidenceCapDetails.join("\n")).not.toContain("Admin source activity sample evidence");
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
        expect(targetedGate?.status).toBe("Source validation only");
        expect(targetedGate?.score).toBe(0);
        expect(targetedGate?.detail).toContain("Source-ready behavior math/site activity evidence was supplied");
        expect(targetedGate?.detail).toContain("targeted behavior validator evidence is still required");
        expect(targetedGate?.evidence.join("\n")).toContain("artifactStatus=missing_formal_evidence");
    });

    it("classifies stale targeted behavior source evidence as stale instead of unknown", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                targetedBehaviorEvidence: {
                    ...freshEvidence.targetedBehaviorEvidence,
                    generatedAtUtc: staleGeneratedAtUtc,
                },
            },
        });

        const targetedGate = report.evidenceGates.find((gate) => gate.id === "targetedBehaviorTests");
        expect(targetedGate?.status).toBe("Stale evidence");
        expect(targetedGate?.evidenceQuality).toBe("stale");
        expect(report.evidenceCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Stale evidence: Targeted behavior tests"),
        ]));
    });

    it("exposes all active cap details", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                targetedBehaviorEvidence: missingTargetedBehaviorEvidence,
                uiSurfaceCoverageEvidence: {
                    path: "agent/state/ui-visual-smoke-minimal.generated.json",
                    status: "source_surface_checks_failed",
                    passed: false,
                    detail: "No valid UI source coverage artifact was supplied.",
                    evidence: ["uiSurfaceCoverageArtifactStatus=source_surface_checks_failed"],
                },
                providerSmokeEvidence: missingProviderSmokeEvidence,
                runtimeSmokeEvidence: runtimeUnverifiedEvidence,
                adminTruthSampleEvidence: missingAdminTruthEvidence,
            },
        });

        expect(report.evidenceCapDetails.length).toBeGreaterThanOrEqual(3);
        expect(report.evidenceCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Targeted behavior tests - Source activity evidence is present; attach targeted source validator evidence"),
            expect.stringContaining("Provider-backed site activity + deployed route evidence - Produce provider-backed site activity"),
            expect.stringContaining("Admin source activity sample evidence - Produce a redacted admin source activity sample."),
        ]));
        expect(report.evidenceCapDetails.join("\n")).not.toContain("Operator reported PayPal");
        expect(report.evidenceCapDetails.join("\n")).not.toContain("No fresh admin truth sample.");
        expect(report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke")?.detail).toContain("Provider-backed site activity:");
        expect(report.evidenceGates.find((gate) => gate.id === "adminTruthSamples")?.detail).toContain("No admin source activity sample");
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
        expect(smokeGate?.status).toBe("Source evidence required");
        expect(smokeGate?.score).toBe(0);
        expect(smokeGate?.evidence.join("\n")).toContain("providerArtifactStatus=missing_formal_evidence");
    });

    it("credits first-party site activity evidence without requiring a separate source-lane artifact", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: missingProviderSmokeEvidence,
                runtimeSmokeEvidence: runtimeUnverifiedEvidence,
                sourceBackedRuntimeConfidenceEvidence: {
                    path: "agent/state/live-evidence-gate-replacement.generated.json",
                    status: "source_ready_live_activity_confirmed",
                    passed: true,
                    detail: "First-party site activity is present and can clear connected site-activity/runtime lanes.",
                    evidence: [
                        "liveRuntimeEvidence.firstPartySiteActivityConfirmed=3",
                        "liveRuntimeEvidence.providerRequired=0",
                        "liveRuntimeEvidence.blockedSiteActivityLanes=0",
                        "launchGateImpact=site_activity_can_clear_connected_site_activity_lanes",
                    ],
                    generatedAtUtc: freshGeneratedAtUtc,
                },
            },
        });

        const smokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
        expect(smokeGate?.evidence.join("\n")).toContain("launchGateImpact=site_activity_can_clear_connected_site_activity_lanes");
        expect(smokeGate?.evidence.join("\n")).not.toContain("does_not_clear_formal_provider_deployed_runtime");
        expect(smokeGate?.sourceCredit).toBeGreaterThan(0);
    });

    it("clears connected site-activity lanes when first-party activity says provider evidence is not required", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: missingProviderSmokeEvidence,
                runtimeSmokeEvidence: freshEvidence.runtimeSmokeEvidence,
                sourceBackedRuntimeConfidenceEvidence: {
                    path: "agent/state/live-evidence-gate-replacement.generated.json",
                    status: "source_ready_live_activity_confirmed",
                    passed: true,
                    detail: "First-party site activity is present and no provider-backed lane is required.",
                    evidence: [
                        "liveRuntimeEvidence.firstPartySiteActivityConfirmed=3",
                        "liveRuntimeEvidence.providerRequired=0",
                        "liveRuntimeEvidence.blockedSiteActivityLanes=0",
                        "launchGateImpact=site_activity_can_clear_connected_site_activity_lanes",
                    ],
                    generatedAtUtc: freshGeneratedAtUtc,
                },
            },
        });

        const smokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
        expect(smokeGate?.status).toBe("Ready");
        expect(smokeGate?.blocksLaunch).toBe(false);
        expect(smokeGate?.score).toBeGreaterThan(0);
        expect(report.launchBlockers.join("\n")).not.toContain("Provider-backed site activity + deployed route evidence");
        expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.deployedRuntimeSmoke.cleared).toBe(true);
    });

    it("does not clear provider-required activity from first-party source confidence alone", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: missingProviderSmokeEvidence,
                runtimeSmokeEvidence: freshEvidence.runtimeSmokeEvidence,
                sourceBackedRuntimeConfidenceEvidence: {
                    path: "agent/state/live-evidence-gate-replacement.generated.json",
                    status: "source_ready_live_activity_confirmed",
                    passed: true,
                    detail: "First-party site activity is present but provider-backed evidence is required.",
                    evidence: [
                        "liveRuntimeEvidence.firstPartySiteActivityConfirmed=3",
                        "liveRuntimeEvidence.providerRequired=1",
                        "liveRuntimeEvidence.blockedSiteActivityLanes=0",
                        "launchGateImpact=site_activity_can_clear_connected_site_activity_lanes",
                    ],
                    generatedAtUtc: freshGeneratedAtUtc,
                },
            },
        });

        const smokeGate = report.evidenceGates.find((gate) => gate.id === "runtimeProviderSmoke");
        expect(smokeGate?.status).toBe("Source evidence required");
        expect(smokeGate?.blocksLaunch).toBe(true);
        expect(report.launchBlockers.join("\n")).toContain("Provider-backed site activity + deployed route evidence");
    });

    it("allows ready only when scanner and evidence gates are fresh", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: freshEvidence,
        });

        expect(report.overallScore).toBeGreaterThanOrEqual(90);
        expect(report.overallStatus).toMatch(/clean|pass|beta-risk/);
        expect(report.readinessStatus).toBe("Ready");
    });

    it("separates Studio confidence display from formal launch clearance", () => {
        const report = buildPublicBetaScoreReport([], {
            commandBudget: buildPublicBetaCommandBudget(),
            evidence: {
                ...freshEvidence,
                providerSmokeEvidence: { ...missingProviderSmokeEvidence, generatedAtUtc: new Date().toISOString() },
                runtimeSmokeEvidence: { ...runtimeUnverifiedEvidence, generatedAtUtc: new Date().toISOString() },
                targetedBehaviorEvidence: {
                    ...freshEvidence.targetedBehaviorEvidence,
                    generatedAtUtc: new Date().toISOString(),
                },
                realUsageConfidenceEvidence: {
                    path: "agent/state/real-usage-confidence.generated.json",
                    status: "source_ready_real_usage_confidence",
                    passed: true,
                    detail: "Source-backed real usage confidence is current.",
                    evidence: ["confidenceScore=92", "formalGatesCleared=false"],
                    generatedAtUtc: new Date().toISOString(),
                },
                runtimeSmokeSubstituteMatrixEvidence: {
                    path: "agent/state/runtime-smoke-substitute-matrix.generated.json",
                    status: "source_ready_runtime_smoke_substitute_matrix",
                    passed: true,
                    detail: "Runtime smoke substitute matrix is source-ready.",
                    evidence: ["matrixRuntimeHealthCredit=92", "deployedRuntimeSmokeStillRequired=true"],
                    generatedAtUtc: new Date().toISOString(),
                },
                debugRuntimeEvidenceArtifact: {
                    path: "agent/state/debug-runtime-evidence.generated.json",
                    status: "source_ready_debug_runtime_evidence",
                    passed: true,
                    detail: "Source-backed debug runtime evidence is current.",
                    evidence: ["sourceBackedRuntimeConfidence=100", "deployedRuntimeSmokeCleared=false"],
                    generatedAtUtc: new Date().toISOString(),
                },
                adminTruthSampleEvidence: {
                    path: "agent/state/admin-truth-source-sample.generated.json",
                    status: "source_ready_admin_truth_sample",
                    passed: true,
                    detail: "Admin source truth wiring is current; production sample still required.",
                    evidence: [
                        "sourceTruthStatus=source_backed",
                        "criticalAdminTruthIssueCount=0",
                        "fakeHealthyStateDetected=false",
                        "formalAdminTruthSamplePassed=false",
                    ],
                    generatedAtUtc: new Date().toISOString(),
                },
                costReadiness: {
                    cloudRunCostReadiness: {
                        status: "source_guarded_external_review_remaining",
                        detail: "Cloud Run source guards are current; billing review remains external.",
                        evidence: ["externalReviewRequired=true"],
                        blocksBetaExit: false,
                    },
                    cloudSqlCostReadiness: {
                        status: "source_ready_no_runtime_usage_detected",
                        detail: "Runtime SQL usage is not detected; provider review remains external.",
                        evidence: ["externalReviewRequired=true"],
                        blocksBetaExit: false,
                    },
                    geminiCloudAssistCostReadiness: {
                        status: "source_guarded_external_review_remaining",
                        detail: "AI calls are guarded; provider billing review remains external.",
                        evidence: ["externalReviewRequired=true"],
                        blocksBetaExit: false,
                    },
                    route4xxReadiness: {
                        status: "source_ready_retry_storm_guarded",
                        detail: "Route 4xx retry storms are source-guarded.",
                        evidence: ["externalReviewRequired=false"],
                        blocksBetaExit: false,
                    },
                },
                regressionRiskRefreshEvidence: {
                    highBlastCoverageCurrent: true,
                    regressionRiskScore: 94,
                    failedLaneCount: 0,
                    inFlightLaneCount: 0,
                },
            },
        });

        expect(Object.keys(report.healthScoreBreakdown)).toEqual([
            "sourceHealth",
            "runtimeHealth",
            "evidenceCompleteness",
            "freshness",
            "costRisk",
            "regressionRisk",
        ]);
        expect(report.studioDashboard.sections.map((section) => section.label)).toEqual([
            "Audience Activity",
            "Runtime Confidence",
            "Source Quality",
            "Debug Signal",
            "Admin Hydration",
            "Evidence Gates",
        ]);
        expect(report.studioDashboard.sections.find((section) => section.id === "runtimeConfidence")?.score).toBe(report.runtimeHealthScore);
        expect(report.studioDashboard.sections.find((section) => section.id === "needsProof")?.status).toBe("needs_proof");
        expect(report.studioDashboard.sections.find((section) => section.id === "needsProof")?.detail).toContain("Open evidence gates:");
        expect(report.sourceHealthScore).toBeGreaterThanOrEqual(90);
        expect(report.runtimeHealthScore).toBeGreaterThanOrEqual(90);
        expect(report.evidenceCompletenessScore).toBeGreaterThanOrEqual(90);
        expect(report.freshnessScore).toBeGreaterThanOrEqual(90);
        expect(report.costRiskScore).toBeGreaterThanOrEqual(90);
        expect(report.regressionRiskScore).toBeGreaterThanOrEqual(90);
        expect(report.launchClearance.formalGates.providerSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.deployedRuntimeSmoke.cleared).toBe(false);
        expect(report.launchClearance.formalGates.adminTruthSample.cleared).toBe(false);
        expect(report.launchClearance.formalGates.paymentSourceOfFunds.cleared).toBe(false);
        expect(report.launchClearance.blockers).toEqual(report.launchBlockers);
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
