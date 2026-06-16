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
        expect(model.canonicalPublicBetaReadinessStatus).toBe("Stale evidence");
        expect(model.canonicalPublicBetaReadinessReason).toContain("3 required generated report");
        expect(model.canonicalPublicBetaEvidenceScore).toBe(25);
        expect(model.canonicalPublicBetaCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Runtime unverified"),
            expect.stringContaining("Admin truth/sample evidence"),
            expect.stringContaining("Cost owner evidence"),
        ]));
        expect(model.canonicalPublicBetaCapDetails).toHaveLength(4);
        expect(model.canonicalPublicBetaSourceDrift).toBe("current");
        expect(model.canonicalPublicBetaTruthState).toBe("live");
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
        expect(model.canonicalPublicBetaStatus).toBe("stale");
        expect(model.canonicalPublicBetaReadinessStatus).toBe("Stale evidence");
        expect(model.canonicalPublicBetaReadinessReason).toContain("source metadata is stale");
        expect(model.canonicalPublicBetaCapDetails).toEqual(expect.arrayContaining([
            expect.stringContaining("Public beta score source metadata"),
        ]));
        expect(model.canonicalPublicBetaSourceDrift).toBe("stale");
        expect(model.canonicalPublicBetaTruthState).toBe("stale");
    });

    it("wires the compact UI to canonical beta score fields instead of aggregate score", () => {
        const root = process.cwd();
        const component = readFileSync(join(root, "src/app/admin/debug/components/DebugControlTower.tsx"), "utf8");

        expect(component).toContain("canonicalPublicBetaScore");
        expect(component).toContain("canonicalPublicBetaReadinessReason");
        expect(component).toContain("canonicalPublicBetaCapDetails");
        expect(component).toContain("canonicalPublicBetaSourceDrift");
        expect(component).toContain("canonicalPublicBetaTruthState");
        expect(component).not.toContain("canonicalPublicBetaCapDetails.slice(0, 3)");
        expect(component).toContain('data-debug-visible-summary="single-triage-strip"');
        expect(component).toContain("Evidence drawer");
        expect(component).toContain("Source detail");
        expect(component).not.toContain("Needs proof");
        expect(component).not.toContain("Status {model.canonicalPublicBetaStatus}");
        expect(component).not.toContain("Source reports</p>");
        expect(component).not.toContain("model.reportAggregateScore");
        expect(component).not.toContain("model?.overallScore ?? \"--\"");
    });

    it("keeps the route runtime admin summary compact while preserving chat drilldown", () => {
        const root = process.cwd();
        const monitoring = readFileSync(join(root, "src/app/admin/debug/components/DebugTabMonitoring.tsx"), "utf8");
        const routeDrilldown = readFileSync(join(root, "src/app/admin/debug/components/DebugMonitoringRoutes.tsx"), "utf8");

        expect(monitoring).toContain("routeRuntimeSummary");
        expect(monitoring).toContain("Chat routes");
        expect(monitoring).not.toContain("Native chat fail");
        expect(monitoring).not.toContain("Native chat stale");
        expect(monitoring).not.toContain("Native chat unseen");
        expect(monitoring).not.toContain("Compat chat fail");
        expect(monitoring).not.toContain("Compat chat stale");
        expect(monitoring).not.toContain("Compat chat unseen");
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
