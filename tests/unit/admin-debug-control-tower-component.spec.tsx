// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DebugControlTower } from "@/app/admin/debug/components/DebugControlTower";

const mockState = vi.hoisted(() => ({
    payload: {
        generatedAt: "2026-05-04T12:00:00.000Z",
        title: "Control Tower",
        subtitle: "Readiness, current issues, and next actions.",
        overallScore: 88,
        overallStatus: "stale",
        truthState: "stale",
        criticalCount: 1,
        staleReportCount: 1,
        missingReportCount: 0,
        liveIssueCount: 1,
        reportSource: "agent_state",
        debugEvidenceSource: "generated",
        gumdropRecovery: {
            displayState: "source_missing",
            truthState: "unavailable",
            sourceReportPath: "agent/state/recovery-timeline-spine.generated.json",
            generatedAtUtc: null,
            freshness: "missing",
            status: "source_missing",
            treasury: {
                ledgerConfirmed: 0,
                analyticsCorrelated: 0,
                analyticsMissing: 0,
                ledgerMissingProtected: 0,
                duplicateRisk: 0,
                sourceBucketMismatch: 0,
                productTruthEligibleCount: 0,
            },
            recoveryQueue: {
                queueItemCount: 0,
                ledgerProofRequiredCount: 0,
                analyticsOnlyRejectedCount: 0,
                duplicateRiskCount: 0,
                sourceBucketMismatchCount: 0,
                moneyAffectingRecoveryAllowedCount: 0,
            },
            canonicalMathLedger: {
                state: "source_missing",
                status: "source_missing",
                path: "agent/state/canonical-math-ledger.generated.json",
                generatedAtUtc: null,
                freshness: "missing",
            },
            labels: ["source_missing", "diagnostic_only_not_treasury_truth"],
            nextAction: "Run local recovery timeline and canonical math ledger checks before treating recovery evidence as current.",
            analyticsOnlyEvidenceLabel: "diagnostic_only_not_treasury_truth",
        },
        reports: [],
        sections: {
            beta_readiness: [{
                id: "public-beta-score",
                label: "Public Beta",
                section: "beta_readiness",
                filePath: "agent/state/public-beta-score.generated.json",
                command: "npm run check:beta-score",
                score: 98,
                status: "clean",
                truthState: "live",
                freshness: "fresh",
                generatedAt: "2026-05-04T12:00:00.000Z",
                updatedAtMs: Date.UTC(2026, 4, 4),
                ageHours: 0,
                findingCount: 1,
                criticalCount: 0,
                majorCount: 0,
                required: true,
                topFindings: [],
            }],
            live_issues: [],
            device_ui: [{
                id: "device-ui-dry-audit",
                label: "Device UI",
                section: "device_ui",
                filePath: "agent/state/device-ui-dry-audit.generated.json",
                command: "npm run check:device-ui",
                score: 97,
                status: "clean",
                truthState: "live",
                freshness: "fresh",
                generatedAt: "2026-05-04T12:00:00.000Z",
                updatedAtMs: Date.UTC(2026, 4, 4),
                ageHours: 0,
                findingCount: 0,
                criticalCount: 0,
                majorCount: 0,
                required: true,
                topFindings: [],
            }],
            money_cost: [{
                id: "google-cost",
                label: "Google Cost",
                section: "money_cost",
                filePath: "agent/state/google-cost-bleed.generated.json",
                command: "npm run check:google-cost",
                score: 0,
                status: "fail",
                truthState: "failed",
                freshness: "fresh",
                generatedAt: "2026-05-04T12:00:00.000Z",
                updatedAtMs: Date.UTC(2026, 4, 4),
                ageHours: 0,
                findingCount: 1,
                criticalCount: 1,
                majorCount: 0,
                required: true,
                topFindings: [{
                    id: "cost-critical",
                    reportId: "google-cost",
                    section: "money_cost",
                    severity: "critical",
                    title: "Runtime SQL used outside mirror",
                    domain: "cost",
                    filePath: "src/app/api/example/route.ts",
                    humanReadableWarning: "Runtime SQL must stay out of product routes.",
                    suggestedValidator: "npm run check:google-cost",
                    evidence: ["redacted evidence only"],
                    truthState: "failed",
                }],
            }],
            telemetry_behavior: [],
            support_creator: [],
        },
        liveIssues: [{
            id: "support-issue",
            source: "support",
            severity: "critical",
            category: "support",
            route: "/api/admin/support/threads/thread-1",
            component: "SupportThreadDetail",
            fingerprint: "support_admin_403",
            message: "Support message detail route returned forbidden.",
            humanMessage: "Support message detail route returned forbidden.",
            occurrenceCount: 3,
            lastSeenAt: Date.UTC(2026, 4, 4),
            truthState: "failed",
        }],
        nextActions: [{
            id: "next-cost",
            action: "Runtime SQL must stay out of product routes.",
            domain: "cost",
            affectedFile: "src/app/api/example/route.ts",
            suggestedValidator: "npm run check:google-cost",
            severity: "critical",
        }],
        operatorCockpit: {
            generatedAtUtc: "2026-05-04T12:00:00.000Z",
            reportKey: "debug-operator-cockpit",
            currentHead: "test-head",
            sourceCommit: "test-head",
            overallStatus: "pass",
            rawDumpDefaultOpen: false,
            validationFailures: [],
            summary: {
                sectionCount: 1,
                scoreImpactItems: 0,
                staleRefreshItems: 0,
                criticalWarningItems: 1,
                aiCriticFindings: 0,
                recoveryPlaybooks: 0,
            },
            defaultSections: [{
                id: "critical_runtime_debug_warnings",
                title: "Critical Runtime + Debug Warnings",
                operatorSummary: "Admin truth sample needs a source artifact.",
                owner: "admin_debug",
                state: "failed",
                scoreImpactEstimate: 4,
                nextAction: "Attach a redacted admin truth source sample.",
                items: [{
                    title: "Admin truth sample missing",
                    nextAction: "Attach a redacted admin truth source sample.",
                    sourceTruthState: "admin_truth_source_required",
                }],
            }],
        },
    },
}));

vi.mock("@/lib/authFetch", () => ({
    authFetch: vi.fn(async () => ({
        ok: true,
        json: async () => mockState.payload,
    })),
}));

vi.mock("@/lib/client-error-reporting", () => ({
    reportClientIssue: vi.fn(),
}));

describe("DebugControlTower", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
        (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    it("renders mobile compact control tower sections without sensitive bodies", async () => {
        await act(async () => {
            root.render(<DebugControlTower />);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(container.querySelector("[data-admin-debug-v2='control-tower']")).toBeTruthy();
        expect(container.querySelector("[data-debug-mobile-layout='compact-card-stack']")).toBeTruthy();
        expect(container.textContent).toContain("Control Tower");
        expect(container.textContent).toContain("Public Beta");
        expect(container.textContent).toContain("Money + Cost");
        expect(container.textContent).toContain("Support message detail route returned forbidden.");
        expect(container.textContent).toContain("Last updated");
        expect(container.textContent).toContain("Why this state");
        expect(container.textContent).toContain("Next check: npm run check:google-cost");
        expect(container.textContent).toContain("Next actions");
        expect(container.textContent).toContain("Admin sample required");
        expect(container.textContent).not.toContain("Source score");
        expect(container.textContent).not.toContain("0h old");
        expect(container.textContent).not.toContain("admin truth source required");
        expect(container.textContent).not.toContain("Device + UI");
        expect(container.textContent).not.toContain("secret support body");
    });

    it("labels zero-finding public beta proof gates as proof required instead of app errors", async () => {
        const originalPayload = JSON.parse(JSON.stringify(mockState.payload));
        const proofReport = {
            ...mockState.payload.sections.beta_readiness[0],
            score: 69,
            status: "fail",
            truthState: "failed",
            findingCount: 0,
            criticalCount: 0,
            majorCount: 0,
            topFindings: [],
        };

        try {
            const payload = mockState.payload as any;
            payload.canonicalPublicBetaCapDetails = [
                "Stale evidence: Runtime/provider smoke - Formal provider smoke evidence is missing.",
                "Stale evidence: Admin truth/sample evidence - Attach a redacted production admin truth sample.",
            ];
            payload.canonicalPublicBetaReadinessReason = "Formal provider and admin truth proof remain required.";
            payload.canonicalPublicBetaTruthState = "live";
            payload.reports = [proofReport];
            payload.sections.beta_readiness = [proofReport];

            await act(async () => {
                root.render(<DebugControlTower />);
            });

            await act(async () => {
                await Promise.resolve();
            });

            const publicBetaCards = Array.from(container.querySelectorAll("[data-debug-report-source='agent/state/public-beta-score.generated.json']"));
            const publicBetaText = publicBetaCards.map((entry) => entry.textContent ?? "").join(" ");

            expect(publicBetaText).toContain("External proof required");
            expect(publicBetaText).toContain("Proof gate");
            expect(container.textContent).toContain("External proof required");
            expect(container.textContent).toContain("Proof required");
            expect(container.textContent).toContain("External proof required - Attach redacted provider proof");
            expect(container.textContent).toContain("Admin sample required");
            expect(publicBetaText).not.toContain("0 findings");
            expect(publicBetaText).not.toContain("ERROR");
            expect(container.textContent).not.toContain("Stale evidence: Runtime/provider smoke");
            expect(container.textContent).not.toContain("Stale evidence: Admin truth/sample evidence");
        } finally {
            Object.assign(mockState.payload, originalPayload);
        }
    });

    it("formats public beta evidence boundaries before they reach Admin Debug copy", async () => {
        const originalPayload = JSON.parse(JSON.stringify(mockState.payload));

        try {
            const payload = mockState.payload as any;
            payload.canonicalPublicBetaCapDetails = [
                "Unknown evidence: Targeted behavior tests - Current implemented source behavior validators passed. This is targeted behavior evidence only and does not prove provider smoke, runtime smoke, or admin truth sample evidence.",
                "Stale evidence: Report freshness and PR integrity - 6 required generated report(s) are older than the freshness window.",
            ];
            payload.canonicalPublicBetaReadinessReason = "Unknown evidence: Targeted behavior tests - Current implemented source behavior validators passed. This is targeted behavior evidence only and does not prove provider smoke, runtime smoke, or admin truth sample evidence.";

            await act(async () => {
                root.render(<DebugControlTower />);
            });

            await act(async () => {
                await Promise.resolve();
            });

            expect(container.textContent).toContain("Source-only evidence: Implemented behavior checks passed");
            expect(container.textContent).toContain("Refresh due");
            expect(container.textContent).toContain("Refresh due");
            expect(container.textContent).toContain("Refresh due - 6 required generated reports are outside the freshness window.");
            expect(container.textContent).not.toContain("Unknown evidence: Targeted behavior tests");
            expect(container.textContent).not.toContain("Stale evidence: Report freshness and PR integrity");
            expect(container.textContent).not.toContain("manual proof");
            expect(container.textContent).not.toContain("Proof required");
        } finally {
            Object.assign(mockState.payload, originalPayload);
        }
    });

    it("keeps mixed public beta evidence gates compact and source-derived", async () => {
        const originalPayload = JSON.parse(JSON.stringify(mockState.payload));
        const proofReport = {
            ...mockState.payload.sections.beta_readiness[0],
            score: 77.4,
            status: "ERROR",
            truthState: "failed",
            findingCount: 0,
            evidenceGateCount: 4,
            criticalCount: 0,
            majorCount: 0,
            topFindings: [],
        };

        try {
            const payload = mockState.payload as any;
            payload.canonicalPublicBetaCapDetails = [
                "Unknown evidence: Targeted behavior tests - Current implemented source behavior validators passed. This is targeted behavior evidence only and does not prove provider smoke, runtime smoke, or admin truth sample evidence.",
                "Stale evidence: Runtime/provider smoke - Provider smoke: Operator-confirmed GumDrop revenue smoke was recorded. Formal provider evidence is still separate. Formal provider smoke evidence is missing. Operator-confirmed PayPal activity is tracked as product context only; it does not clear formal provider smoke. Attach real redacted provider smoke evidence; operator confirmation alone is not formal provider proof. Runtime smoke: Keep automated deployed runtime smoke evidence fresh.",
                "Stale evidence: Admin truth/sample evidence - Attach a redacted production admin truth sample before clearing the formal admin truth evidence gate.",
                "Stale evidence: Report freshness and PR integrity - 6 required generated report(s) are older than the freshness window.",
            ];
            payload.canonicalPublicBetaStatus = "ERROR";
            payload.canonicalPublicBetaReadinessStatus = "External proof required";
            payload.canonicalPublicBetaReadinessReason = payload.canonicalPublicBetaCapDetails[0];
            payload.canonicalPublicBetaTruthState = "live";
            payload.reports = [proofReport];
            payload.sections.beta_readiness = [proofReport];

            await act(async () => {
                root.render(<DebugControlTower />);
            });

            await act(async () => {
                await Promise.resolve();
            });

            const publicBetaCards = Array.from(container.querySelectorAll("[data-debug-report-source='agent/state/public-beta-score.generated.json']"));
            const publicBetaText = publicBetaCards.map((entry) => entry.textContent ?? "").join(" ");

            expect(publicBetaText).toContain("External proof required");
            expect(publicBetaText).toContain("4 evidence gates");
            expect(container.textContent).toContain("Source-only evidence - Implemented behavior checks passed");
            expect(container.textContent).toContain("External proof required - The operator-confirmed payment is product context only");
            expect(container.textContent).toContain("Runtime smoke is recorded; keep it fresh.");
            expect(container.textContent).toContain("Admin sample required");
            expect(container.textContent).toContain("Refresh due - 6 required generated reports are outside the freshness window.");
            expect(publicBetaText).not.toContain("0 findings");
            expect(container.textContent).not.toContain("ERROR");
            expect(container.textContent).not.toContain("Unknown evidence: Targeted behavior tests");
            expect(container.textContent).not.toContain("Stale evidence: Runtime/provider smoke");
            expect(container.textContent).not.toContain("Stale evidence: Admin truth/sample evidence");
            expect(container.textContent).not.toContain("Stale evidence: Report freshness and PR integrity");
        } finally {
            Object.assign(mockState.payload, originalPayload);
        }
    });

    it("labels stale zero-finding report rows as refresh due instead of delayed errors", async () => {
        const originalPayload = JSON.parse(JSON.stringify(mockState.payload));
        const staleDeviceReport = {
            ...mockState.payload.sections.device_ui[0],
            truthState: "stale",
            freshness: "stale_72h",
            status: "clean",
            findingCount: 0,
            criticalCount: 0,
            majorCount: 1,
            topFindings: [{
                id: "device-ui-stale-72h",
                reportId: "device-ui-dry-audit",
                section: "device_ui",
                severity: "major",
                title: "Device UI report is older than 72 hours",
                domain: "device_ui",
                filePath: "agent/state/device-ui-dry-audit.generated.json",
                humanReadableWarning: "Beta-critical generated state is stale and needs to be regenerated before signoff.",
                suggestedValidator: "npm run check:device-ui",
                evidence: ["Age 160h"],
                truthState: "stale",
            }],
        };

        try {
            const payload = mockState.payload as any;
            payload.reports = [staleDeviceReport];
            payload.sections.device_ui = [staleDeviceReport];

            await act(async () => {
                root.render(<DebugControlTower />);
            });

            await act(async () => {
                await Promise.resolve();
            });

            const deviceCards = Array.from(container.querySelectorAll("[data-debug-report-source='agent/state/device-ui-dry-audit.generated.json']"));
            const deviceText = deviceCards.map((entry) => entry.textContent ?? "").join(" ");

            expect(deviceText).toContain("Refresh due");
            expect(deviceText).toContain("No active findings");
            expect(deviceText).not.toContain("0 findings");
            expect(deviceText).not.toContain("DELAYED");
            expect(deviceText).not.toContain("ERROR");
        } finally {
            Object.assign(mockState.payload, originalPayload);
        }
    });

    it("labels delayed zero-finding report rows as pending evidence instead of empty errors", async () => {
        const originalPayload = JSON.parse(JSON.stringify(mockState.payload));
        const delayedReport = {
            ...mockState.payload.sections.beta_readiness[0],
            id: "self-healing-refresh-queue",
            label: "Self-Healing Refresh Queue",
            filePath: "agent/state/self-healing-refresh-queue.generated.json",
            command: "npm run check:self-healing-refresh-queue",
            status: "DELAYED",
            truthState: "stale",
            findingCount: 0,
            criticalCount: 0,
            majorCount: 0,
            topFindings: [],
        };

        try {
            const payload = mockState.payload as any;
            payload.reports = [delayedReport];
            payload.sections.beta_readiness = [delayedReport];

            await act(async () => {
                root.render(<DebugControlTower />);
            });

            await act(async () => {
                await Promise.resolve();
            });

            const queueCards = Array.from(container.querySelectorAll("[data-debug-report-source='agent/state/self-healing-refresh-queue.generated.json']"));
            const queueText = queueCards.map((entry) => entry.textContent ?? "").join(" ");

            expect(queueText).toContain("Waiting for evidence");
            expect(queueText).toContain("Evidence pending");
            expect(queueText).not.toContain("0 findings");
            expect(queueText).not.toContain("No active findings");
            expect(queueText).not.toContain("DELAYED");
        } finally {
            Object.assign(mockState.payload, originalPayload);
        }
    });

    it("formats delayed reports with findings as review delayed instead of raw delayed status", async () => {
        const originalPayload = JSON.parse(JSON.stringify(mockState.payload));
        const delayedReport = {
            ...mockState.payload.sections.beta_readiness[0],
            id: "speed-security-hardening",
            label: "Speed + Security",
            filePath: "agent/state/speed-security-hardening.generated.json",
            command: "npm run check:speed-security",
            status: "DELAYED",
            truthState: "stale",
            findingCount: 164,
            majorCount: 14,
            topFindings: [{
                id: "speed-security-source-gap",
                reportId: "speed-security-hardening",
                section: "beta_readiness",
                severity: "major",
                title: "Speed/security source gaps need review",
                domain: "speed_security",
                filePath: "agent/state/speed-security-hardening.generated.json",
                humanReadableWarning: "Source guardrails found reviewable speed/security work.",
                suggestedValidator: "npm run check:speed-security",
                evidence: ["redacted source evidence only"],
                truthState: "stale",
            }],
        };

        try {
            const payload = mockState.payload as any;
            payload.reports = [delayedReport];
            payload.sections.beta_readiness = [delayedReport];

            await act(async () => {
                root.render(<DebugControlTower />);
            });

            await act(async () => {
                await Promise.resolve();
            });

            const speedCards = Array.from(container.querySelectorAll("[data-debug-report-source='agent/state/speed-security-hardening.generated.json']"));
            const speedText = speedCards.map((entry) => entry.textContent ?? "").join(" ");

            expect(speedText).toContain("Review delayed");
            expect(speedText).toContain("164 source findings");
            expect(speedText).not.toContain("DELAYED");
        } finally {
            Object.assign(mockState.payload, originalPayload);
        }
    });

    it("renders browser security boundary current issues as review/info copy instead of backend failure copy", async () => {
        mockState.payload.liveIssues = [{
            id: "browser-boundary",
            source: "client",
            severity: "warn",
            category: "browser_security_boundary",
            route: "/admin/debug",
            component: "AdminErrorCatcher",
            fingerprint: "browser_boundary_admin_debug",
            message: 'Blocked a frame with origin "https://kandydrops.com" from accessing a cross-origin frame.',
            humanMessage: "Browser blocked cross-origin frame access. This is expected when third-party iframes are protected. App code should not inspect cross-origin frames.",
            occurrenceCount: 4,
            lastSeenAt: Date.UTC(2026, 4, 4),
            truthState: "live",
            browserSecurityBlocked: true,
            actionable: false,
            nonActionableThirdParty: true,
            sourceSurface: "admin",
            browserFrameOwner: "paypal",
        }] as any;

        await act(async () => {
            root.render(<DebugControlTower />);
        });

        await act(async () => {
            await Promise.resolve();
        });

        expect(container.textContent).toContain("browser security boundary");
        expect(container.textContent).toContain("Expected third-party iframe boundary. This is not a backend failure.");
    });
});
