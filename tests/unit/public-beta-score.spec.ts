import { describe, expect, it } from "vitest";

import {
    buildPublicBetaFinding,
    buildPublicBetaScoreReport,
    dedupePublicBetaFindings,
    type PublicBetaFinding,
} from "@/lib/agent-score/core";
import { assertAutofixGate, type PublicBetaAutofixPlan } from "@/lib/agent-score/autofix";
import { buildPublicBetaCommandBudget } from "@/lib/agent-score/reporting";

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
        });

        expect(report.overallStatus).toBe("fail");
        expect(report.domainScores.contentProtection.status).toBe("fail");
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
