// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DebugControlTower } from "@/app/admin/debug/components/DebugControlTower";

const mockState = vi.hoisted(() => ({
    payload: {
        generatedAt: "2026-05-04T12:00:00.000Z",
        title: "Control Tower",
        subtitle: "Public beta truth, live evidence, and next actions.",
        overallScore: 88,
        overallStatus: "stale",
        truthState: "stale",
        criticalCount: 1,
        staleReportCount: 1,
        missingReportCount: 0,
        liveIssueCount: 1,
        reportSource: "agent_state",
        debugEvidenceSource: "generated",
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
        expect(container.textContent).toContain("Device + UI");
        expect(container.textContent).toContain("Money + Cost");
        expect(container.textContent).toContain("Support message detail route returned forbidden.");
        expect(container.textContent).toContain("Recommended Next Actions");
        expect(container.textContent).not.toContain("secret support body");
    });

    it("renders browser security boundary live issues as review/info copy instead of backend failure copy", async () => {
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
