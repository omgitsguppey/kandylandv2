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
    hasTargetedBehaviorEvidence: true,
    hasVisualManualEvidence: true,
    hasProviderSmokeEvidence: true,
    hasAdminTruthSampleEvidence: true,
    openPrTriageFresh: true,
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
        expect(report.overallStatus).not.toBe("clean");
        expect(report.readinessStatus).not.toBe("Ready");
        expect(report.overallScore).toBeLessThan(100);
        expect(report.evidenceCapsApplied.length).toBeGreaterThan(0);
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
                hasVisualManualEvidence: false,
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
                hasProviderSmokeEvidence: false,
            },
        });

        expect(report.readinessStatus).toBe("Ready with smoke required");
        expect(report.overallScore).toBeLessThan(100);
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
