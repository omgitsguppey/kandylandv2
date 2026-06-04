import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { buildAdminDebugControlTowerModel } from "@/lib/admin-debug-control-tower";

const tempRoots: string[] = [];

function createTempRoot() {
    const root = join(tmpdir(), `kd-control-tower-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(join(root, "agent", "state"), { recursive: true });
    tempRoots.push(root);
    return root;
}

function writeReport(root: string, fileName: string, payload: Record<string, unknown>) {
    writeFileSync(join(root, "agent", "state", fileName), JSON.stringify(payload, null, 2), "utf8");
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
                "Runtime unverified: Runtime/provider smoke - Run formal deployed runtime smoke later.",
                "Unknown evidence: Admin truth/sample evidence - Record a fresh admin truth screenshot.",
                "Stale evidence: Freshness, PR, and HEAD integrity - 3 required generated report(s) are older than the freshness window.",
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
        expect(model.canonicalPublicBetaReadinessStatus).toBe("Stale evidence");
        expect(model.canonicalPublicBetaReadinessReason).toContain("3 required generated report");
        expect(model.canonicalPublicBetaEvidenceScore).toBe(25);
        expect(model.canonicalPublicBetaCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Runtime unverified"),
            expect.stringContaining("Admin truth/sample evidence"),
        ]));
        expect(model.reportAggregateScore).toBe(50);
        expect(model.reportAggregateSummary).toContain("Required generated report average");
        expect(model.overallScore).toBe(25);
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
        expect(publicBeta?.topFindings[0]?.title).toContain("source commit needs review");
    });

    it("wires the compact UI to canonical beta score fields instead of aggregate score", () => {
        const root = process.cwd();
        const component = readFileSync(join(root, "src/app/admin/debug/components/DebugControlTower.tsx"), "utf8");

        expect(component).toContain("canonicalPublicBetaScore");
        expect(component).toContain("canonicalPublicBetaReadinessReason");
        expect(component).toContain("canonicalPublicBetaCapDetails.slice(0, 3)");
        expect(component).toContain('data-debug-visible-summary="single-triage-strip"');
        expect(component).toContain("Evidence drawer");
        expect(component).toContain("Source detail");
        expect(component).not.toContain("Needs proof");
        expect(component).not.toContain("Status {model.canonicalPublicBetaStatus}");
        expect(component).not.toContain("Source reports</p>");
        expect(component).not.toContain("model.reportAggregateScore");
        expect(component).not.toContain("model?.overallScore ?? \"--\"");
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
});
