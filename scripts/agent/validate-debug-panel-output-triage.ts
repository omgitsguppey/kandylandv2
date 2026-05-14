import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type FreshnessState = "fresh" | "stale" | "unknown" | "missing";
type UiTruthState = "live" | "stale" | "missing" | "unavailable" | "needs_review" | "blocked" | "evidence" | "archive";

type DebugItem = {
    key: string;
    label: string;
    sourceArtifact: string;
    sourceGeneratedAt: string | null;
    sourceCommit: string | null;
    currentHead: string | null;
    freshness: FreshnessState;
    canonicality: string;
    owningValidator: string | null;
    refreshCommand: string | null;
    blocksPhaseOne: boolean;
    uiTruthState: UiTruthState;
    issue: string;
    recommendedAction: string;
};

type RefreshAttempt = {
    command: string;
    status: "pass" | "fail" | "unavailable" | "validator_only_stale" | "not_run";
    artifact?: string;
    effect: string;
    note: string;
};

type DebugPanelOutputTriageReport = {
    generatedAtUtc: string;
    reportKey: "debug-panel-output-triage";
    currentHead: string;
    summary: {
        debugItemsScanned: number;
        staleItems: number;
        missingItems: number;
        falseLiveRisks: number;
        refreshableItems: number;
        nonBlockingArchiveItems: number;
        blockingItems: number;
        p0Count: number;
        p1Count: number;
        p2Count: number;
    };
    debugItems: DebugItem[];
    refreshAttempts: RefreshAttempt[];
    fixQueue: Array<{
        priority: "P0" | "P1" | "P2";
        itemKey: string;
        action: string;
    }>;
};

const ROOT = process.cwd();
const STATE_DIR = join(ROOT, "agent", "state");
const REPORT_PATH = join(STATE_DIR, "debug-panel-output-triage.generated.json");

const FRESHNESS_WINDOW_MS = 24 * 60 * 60 * 1000;

const TASK_ALLOWED_REFRESH_COMMANDS = new Set([
    "npm run score:beta",
    "npm run check:beta-score",
    "npm run check:provider-smoke-evidence",
    "npm run check:runtime-smoke-evidence",
    "npm run check:admin-truth-sample-evidence",
    "npm run check:targeted-behavior-evidence",
    "npm run check:user-facing-feature-connection-audit",
    "npm run check:repo-spring-cleaning-rewire",
    "npm run check:admin-debug-control-tower",
    "npm run check:admin-truth",
    "npm run check:release-notes",
    "npm run check:launch-pr-triage",
    "npm run check:launch-readiness-final",
    "npm run check:final-launch-readiness-report",
]);

function taskAllowedRefreshCommand(command: string | null): string | null {
    return command && TASK_ALLOWED_REFRESH_COMMANDS.has(command) ? command : null;
}

const DEBUG_REPORTS = [
    {
        key: "report_public_beta_score",
        label: "Generated report freshness: public beta score",
        artifact: "agent/state/public-beta-score.generated.json",
        owningValidator: "npm run check:beta-score",
        refreshCommand: "npm run score:beta",
        required: true,
    },
    {
        key: "report_speed_security",
        label: "Generated report freshness: speed/security hardening",
        artifact: "agent/state/speed-security-hardening.generated.json",
        owningValidator: "npm run check:speed-security",
        refreshCommand: "npm run score:speed-security",
        required: true,
    },
    {
        key: "report_codebase_hardening",
        label: "Generated report freshness: codebase hardening",
        artifact: "agent/state/codebase-hardening.generated.json",
        owningValidator: "npm run check:hardening",
        refreshCommand: "npm run score:hardening",
        required: true,
    },
    {
        key: "report_device_ui",
        label: "Generated report freshness: device UI dry audit",
        artifact: "agent/state/device-ui-dry-audit.generated.json",
        owningValidator: "npm run check:device-ui",
        refreshCommand: "npm run score:device-ui",
        required: true,
    },
    {
        key: "report_device_layout",
        label: "Generated report freshness: device layout score",
        artifact: "agent/state/device-layout-score.generated.json",
        owningValidator: "npm run check:device-layout-score",
        refreshCommand: "npm run score:device-layout",
        required: true,
    },
    {
        key: "report_hydration",
        label: "Generated report freshness: hydration performance",
        artifact: "agent/state/hydration-performance.generated.json",
        owningValidator: "npm run check:hydration-performance",
        refreshCommand: "npm run score:hydration",
        required: true,
    },
    {
        key: "report_sitewide_image",
        label: "Generated report freshness: sitewide image optimization",
        artifact: "agent/state/sitewide-image-optimization.generated.json",
        owningValidator: "npm run check:sitewide-image-optimization",
        refreshCommand: null,
        required: true,
    },
    {
        key: "report_content_protection",
        label: "Generated report freshness: content protection",
        artifact: "agent/state/content-protection.generated.json",
        owningValidator: "npm run check:content-protection",
        refreshCommand: "npm run score:content-protection",
        required: true,
    },
    {
        key: "report_gumdrop_economy",
        label: "Generated report freshness: GumDrop economy",
        artifact: "agent/state/gumdrop-economy.generated.json",
        owningValidator: "npm run check:gumdrop-economy",
        refreshCommand: "npm run score:economy",
        required: true,
    },
    {
        key: "report_google_cost",
        label: "Generated report freshness: Google cost",
        artifact: "agent/state/google-cost-bleed.generated.json",
        owningValidator: "npm run check:google-cost",
        refreshCommand: "npm run score:google-cost",
        required: true,
    },
    {
        key: "report_cloud_cost",
        label: "Generated report freshness: Cloud cost",
        artifact: "agent/state/cloudrun-sql-bigquery-guardrails.generated.json",
        owningValidator: "npm run check:cloud-cost",
        refreshCommand: "npm run score:cloud-cost",
        required: true,
    },
    {
        key: "report_sql_mirror",
        label: "Generated report freshness: SQL mirror",
        artifact: "agent/state/sql-mirror-status.generated.json",
        owningValidator: "npm run check:generated-report-authority",
        refreshCommand: null,
        required: false,
    },
    {
        key: "report_telemetry_parity",
        label: "Generated report freshness: telemetry parity",
        artifact: "agent/state/telemetry-parity-score.generated.json",
        owningValidator: "npm run check:telemetry-parity-score",
        refreshCommand: "npm run score:telemetry",
        required: true,
    },
    {
        key: "report_event_catalog",
        label: "Generated report freshness: event catalog",
        artifact: "agent/state/event-catalog-telemetry.generated.json",
        owningValidator: "npm run check:event-catalog-telemetry",
        refreshCommand: null,
        required: false,
    },
    {
        key: "report_watch_time_truth",
        label: "Generated report freshness: watch-time truth",
        artifact: "agent/state/watch-time-rollup-truth.generated.json",
        owningValidator: "npm run check:watch-time-rollup-truth",
        refreshCommand: "npm run check:watch-time-rollup-truth",
        required: true,
    },
    {
        key: "report_debug_evidence",
        label: "Generated report freshness: debug evidence pipeline",
        artifact: "agent/state/debug-evidence-pipeline.generated.json",
        owningValidator: "npm run check:debug-evidence-pipeline",
        refreshCommand: null,
        required: true,
    },
    {
        key: "report_precatch_runtime",
        label: "Generated report freshness: precatch runtime issues",
        artifact: "agent/state/precatch-runtime-issues.generated.json",
        owningValidator: "npm run precheck:runtime-issues",
        refreshCommand: "npm run precheck:runtime-issues",
        required: false,
    },
    {
        key: "report_support_recovery",
        label: "Generated report freshness: support recovery",
        artifact: "agent/state/support-recovery-flows.generated.json",
        owningValidator: "npm run check:support-recovery-flows",
        refreshCommand: null,
        required: true,
    },
    {
        key: "report_creator_lane",
        label: "Generated report freshness: creator lane parity",
        artifact: "agent/state/creator-lane-debug-parity.generated.json",
        owningValidator: "npm run check:creator-lane-debug-parity",
        refreshCommand: "npm run score:creator-lane-debug-parity",
        required: false,
    },
    {
        key: "report_creator_lane_legacy",
        label: "Generated report freshness: creator lane legacy",
        artifact: "agent/state/creator-lane-legacy-truth-inventory.generated.json",
        owningValidator: "npm run check:creator-lane-legacy-truth-inventory",
        refreshCommand: null,
        required: false,
    },
    {
        key: "report_orphaned_logic",
        label: "Generated report freshness: orphaned logic",
        artifact: "agent/state/orphaned-logic-score.generated.json",
        owningValidator: "npm run check:orphaned-logic",
        refreshCommand: "npm run score:orphans",
        required: true,
    },
] as const;

const EXTRA_ITEMS = [
    {
        key: "public_beta_score",
        label: "Public beta score",
        artifact: "agent/state/public-beta-score.generated.json",
        owningValidator: "npm run check:beta-score",
        refreshCommand: "npm run score:beta",
        canonicality: "canonical",
    },
    {
        key: "score_cap_reasons",
        label: "Score cap reasons",
        artifact: "agent/state/public-beta-score.generated.json",
        owningValidator: "npm run check:beta-score",
        refreshCommand: "npm run score:beta",
        canonicality: "canonical",
    },
    {
        key: "provider_smoke",
        label: "Provider smoke",
        artifact: "agent/state/provider-smoke-evidence.generated.json",
        owningValidator: "npm run check:provider-smoke-evidence",
        refreshCommand: "npm run check:provider-smoke-evidence",
        canonicality: "evidence_only",
    },
    {
        key: "runtime_evidence",
        label: "Runtime evidence",
        artifact: "agent/state/runtime-smoke-evidence.generated.json",
        owningValidator: "npm run check:runtime-smoke-evidence",
        refreshCommand: "npm run check:runtime-smoke-evidence",
        canonicality: "evidence_only",
    },
    {
        key: "admin_truth_samples",
        label: "Admin truth samples",
        artifact: "agent/state/admin-truth-sample-evidence.generated.json",
        owningValidator: "npm run check:admin-truth-sample-evidence",
        refreshCommand: "npm run check:admin-truth-sample-evidence",
        canonicality: "evidence_only",
    },
    {
        key: "targeted_behavior_evidence",
        label: "Targeted behavior evidence",
        artifact: "agent/state/targeted-behavior-evidence.generated.json",
        owningValidator: "npm run check:targeted-behavior-evidence",
        refreshCommand: "npm run check:targeted-behavior-evidence",
        canonicality: "evidence_only",
    },
    {
        key: "creator_connection_audit",
        label: "Creator connection audit",
        artifact: "agent/state/user-facing-feature-connection-audit.generated.json",
        owningValidator: "npm run check:user-facing-feature-connection-audit",
        refreshCommand: "npm run check:user-facing-feature-connection-audit",
        canonicality: "evidence_only",
    },
    {
        key: "repo_spring_cleaning",
        label: "Repo spring cleaning",
        artifact: "agent/state/repo-spring-cleaning-rewire.generated.json",
        owningValidator: "npm run check:repo-spring-cleaning-rewire",
        refreshCommand: "npm run check:repo-spring-cleaning-rewire",
        canonicality: "archive_candidate",
    },
    {
        key: "analytics_rewire",
        label: "Analytics rewire",
        artifact: "agent/state/analytics-rewire-phase-one.generated.json",
        owningValidator: "npm run check:analytics-rewire-phase-one",
        refreshCommand: null,
        canonicality: "evidence_only",
    },
    {
        key: "recovery_evidence",
        label: "Recovery evidence",
        artifact: "agent/state/lost-data-recovery-dry-run.generated.json",
        owningValidator: "npm run check:lost-data-recovery-dry-run",
        refreshCommand: null,
        canonicality: "evidence_only",
    },
    {
        key: "system_health",
        label: "System health",
        artifact: "agent/state/admin-truth.generated.json",
        owningValidator: "npm run check:admin-truth",
        refreshCommand: "npm run check:admin-truth",
        canonicality: "evidence_only",
    },
    {
        key: "final_launch_readiness",
        label: "Final launch readiness",
        artifact: "agent/state/final-launch-readiness-report.generated.json",
        owningValidator: "npm run check:final-launch-readiness-report",
        refreshCommand: "npm run check:final-launch-readiness-report",
        canonicality: "evidence_only",
    },
    {
        key: "launch_readiness",
        label: "Launch readiness",
        artifact: "agent/state/launch-readiness-report.generated.json",
        owningValidator: "npm run check:launch-readiness-final",
        refreshCommand: "npm run check:launch-readiness-final",
        canonicality: "evidence_only",
    },
    {
        key: "launch_pr_triage",
        label: "Launch PR triage",
        artifact: "agent/state/launch-pr-triage.generated.json",
        owningValidator: "npm run check:launch-pr-triage",
        refreshCommand: "npm run check:launch-pr-triage",
        canonicality: "evidence_only",
    },
] as const;

function runGit(args: string[]) {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function readJson(pathFromRoot: string): Record<string, any> | null {
    const fullPath = join(ROOT, pathFromRoot);
    if (!existsSync(fullPath)) {
        return null;
    }
    try {
        return JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, any>;
    } catch {
        return null;
    }
}

function readText(pathFromRoot: string): string {
    const fullPath = join(ROOT, pathFromRoot);
    return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function generatedAtOf(payload: Record<string, any> | null): string | null {
    if (!payload) {
        return null;
    }
    const generatedAt = payload.generatedAtUtc ?? payload.generatedAt ?? payload.generated_at ?? payload.createdAtUtc;
    return typeof generatedAt === "string" ? generatedAt : null;
}

function commitOf(payload: Record<string, any> | null): string | null {
    if (!payload) {
        return null;
    }
    const commit = payload.sourceCommit ?? payload.headCommitAtTriage ?? payload.gitCommit;
    return typeof commit === "string" ? commit : null;
}

function headOf(payload: Record<string, any> | null): string | null {
    if (!payload) {
        return null;
    }
    const currentHead = payload.currentHead ?? payload.headCommitAtTriage ?? payload.gitCommit;
    return typeof currentHead === "string" ? currentHead : null;
}

function freshnessOf(pathFromRoot: string, payload: Record<string, any> | null, repoHead: string): FreshnessState {
    if (!payload || !existsSync(join(ROOT, pathFromRoot))) {
        return "missing";
    }
    const generatedAt = generatedAtOf(payload);
    const itemHead = headOf(payload);
    const sourceCommit = commitOf(payload);
    if ((itemHead && itemHead !== repoHead) || (sourceCommit && sourceCommit !== repoHead)) {
        return "stale";
    }
    if (!generatedAt) {
        return "unknown";
    }
    const generatedMs = Date.parse(generatedAt);
    if (!Number.isFinite(generatedMs)) {
        return "unknown";
    }
    return Date.now() - generatedMs > FRESHNESS_WINDOW_MS ? "stale" : "fresh";
}

function statusOf(payload: Record<string, any> | null): string {
    if (!payload) {
        return "missing";
    }
    const status =
        payload.overallStatus ??
        payload.status ??
        payload.readinessStatus ??
        payload.summary?.overallStatus ??
        payload.readinessImpact?.overallStatus;
    return typeof status === "string" ? status : "unknown";
}

function boolOf(payload: Record<string, any> | null, path: string[]): boolean | null {
    let cursor: any = payload;
    for (const key of path) {
        if (!cursor || typeof cursor !== "object") {
            return null;
        }
        cursor = cursor[key];
    }
    return typeof cursor === "boolean" ? cursor : null;
}

function publicBetaGate(payload: Record<string, any> | null, id: string): Record<string, any> | null {
    const gates = Array.isArray(payload?.evidenceGates) ? payload?.evidenceGates : [];
    return gates.find((gate: Record<string, any>) => gate.id === id) ?? null;
}

function itemIssueFor(key: string, payload: Record<string, any> | null, freshness: FreshnessState, repoHead: string): string {
    if (!payload) {
        return "Source artifact is missing from the Debug source chain.";
    }
    const itemHead = headOf(payload);
    const sourceCommit = commitOf(payload);
    const status = statusOf(payload);
    const driftParts = [
        itemHead && itemHead !== repoHead ? `currentHead ${itemHead} does not match repo HEAD ${repoHead}` : null,
        sourceCommit && sourceCommit !== repoHead ? `sourceCommit ${sourceCommit} does not match repo HEAD ${repoHead}` : null,
    ].filter(Boolean);
    if (key === "provider_smoke") {
        const paypalStatus = payload.paypalRefillSmoke?.status;
        if (paypalStatus === "operator_reported_not_formal_provider_smoke") {
            return "Operator-reported PayPal smoke is tracked but is not formal provider smoke evidence.";
        }
    }
    if (key === "runtime_evidence" && status === "runtime_unverified") {
        return "Runtime smoke is unverified; local validators remain diagnostic only.";
    }
    if (key === "admin_truth_samples" && status === "missing_or_unknown") {
        return "Admin truth sample evidence is missing or unknown; Debug must not render it healthy.";
    }
    if (key === "targeted_behavior_evidence") {
        return "Targeted behavior evidence only proves focused validators; it does not prove visual/provider/runtime/admin sample evidence.";
    }
    if (key === "score_cap_reasons") {
        const caps = Array.isArray(payload.evidenceCapDetails) ? payload.evidenceCapDetails.length : 0;
        return caps > 0 ? `${caps} beta score cap reason(s) remain visible.` : "No beta score cap reasons are present.";
    }
    if (driftParts.length > 0) {
        return `Source drift: ${driftParts.join("; ")}.`;
    }
    if (freshness === "stale") {
        return "Generated report is older than the 24 hour freshness window.";
    }
    if (freshness === "unknown") {
        return "Generated report has no parseable generatedAt/generatedAtUtc timestamp.";
    }
    return status === "passed" || status === "clean" || status === "ok" ? "Current Debug source is available." : `Debug source status is ${status}.`;
}

function recommendedActionFor(key: string, payload: Record<string, any> | null, refreshCommand: string | null): string {
    if (!payload) {
        return refreshCommand ? `Run ${refreshCommand} if that command owns the missing artifact; otherwise keep the Debug state missing.` : "Keep missing state visible until an owning generator is identified.";
    }
    if (key === "provider_smoke") {
        return "Attach or generate formal provider smoke evidence; do not convert operator-reported PayPal into a pass.";
    }
    if (key === "runtime_evidence") {
        return "Run formal deployed runtime smoke before marking runtime/provider smoke complete.";
    }
    if (key === "admin_truth_samples") {
        return "Attach a fresh first-party admin truth sample before upgrading this gate.";
    }
    if (key === "targeted_behavior_evidence") {
        return "Use targeted behavior as one gate only; keep visual, provider, runtime, and admin sample caps separate.";
    }
    if (key === "score_cap_reasons") {
        return "Work the visible cap reasons in order instead of hiding them in Debug.";
    }
    if (key === "public_beta_score") {
        return "Use the canonical beta score and cap reasons as the primary Phase 1 queue.";
    }
    return refreshCommand ? `Run ${refreshCommand} when this stale warning must be refreshed.` : "Leave the item labeled as evidence or archive until a focused refresh command exists.";
}

function truthStateFor(key: string, payload: Record<string, any> | null, freshness: FreshnessState): UiTruthState {
    if (!payload || freshness === "missing") {
        return "missing";
    }
    if (freshness === "stale") {
        return key === "repo_spring_cleaning" ? "archive" : "stale";
    }
    const status = statusOf(payload);
    if (["missing_formal_evidence", "operator_reported_not_formal_provider_smoke", "missing_or_unknown"].includes(status)) {
        return "missing";
    }
    if (["runtime_unverified", "unavailable"].includes(status)) {
        return "unavailable";
    }
    if (key === "score_cap_reasons" && Array.isArray(payload.evidenceCapDetails) && payload.evidenceCapDetails.length > 0) {
        return "blocked";
    }
    if (["needs_review", "partial", "warning", "beta-risk"].includes(status)) {
        return "needs_review";
    }
    if (["passed", "clean", "ok", "ready"].includes(status)) {
        return "live";
    }
    return "evidence";
}

function blocksPhaseOneFor(key: string, payload: Record<string, any> | null, freshness: FreshnessState): boolean {
    if (key === "repo_spring_cleaning") {
        return false;
    }
    if (!payload) {
        return ["public_beta_score", "score_cap_reasons", "provider_smoke", "runtime_evidence", "admin_truth_samples"].includes(key);
    }
    if (key === "public_beta_score") {
        return payload.readinessStatus !== "Ready" || payload.overallStatus !== "ready";
    }
    if (key === "score_cap_reasons") {
        return Array.isArray(payload.evidenceCapDetails) && payload.evidenceCapDetails.length > 0;
    }
    if (key === "provider_smoke") {
        return boolOf(payload, ["readinessImpact", "providerSmokeGatePassed"]) !== true;
    }
    if (key === "runtime_evidence") {
        return boolOf(payload, ["readinessImpact", "runtimeGatePassed"]) !== true;
    }
    if (key === "admin_truth_samples") {
        return boolOf(payload, ["readinessImpact", "adminTruthSampleGatePassed"]) !== true;
    }
    if (["final_launch_readiness", "launch_readiness", "launch_pr_triage"].includes(key)) {
        return freshness !== "fresh";
    }
    return false;
}

function normalizeCanonicality(baseCanonicality: string, freshness: FreshnessState): string {
    if (freshness === "missing") {
        return "missing";
    }
    if (freshness === "stale") {
        return baseCanonicality === "archive_candidate" ? "archive_candidate" : "stale_evidence";
    }
    return baseCanonicality;
}

function buildItem(input: {
    key: string;
    label: string;
    artifact: string;
    owningValidator: string | null;
    refreshCommand: string | null;
    canonicality: string;
    repoHead: string;
}): DebugItem {
    const payload = readJson(input.artifact);
    const freshness = freshnessOf(input.artifact, payload, input.repoHead);
    const refreshCommand = taskAllowedRefreshCommand(input.refreshCommand);
    return {
        key: input.key,
        label: input.label,
        sourceArtifact: input.artifact,
        sourceGeneratedAt: generatedAtOf(payload),
        sourceCommit: commitOf(payload),
        currentHead: headOf(payload) ?? input.repoHead,
        freshness,
        canonicality: normalizeCanonicality(input.canonicality, freshness),
        owningValidator: input.owningValidator,
        refreshCommand,
        blocksPhaseOne: blocksPhaseOneFor(input.key, payload, freshness),
        uiTruthState: truthStateFor(input.key, payload, freshness),
        issue: itemIssueFor(input.key, payload, freshness, input.repoHead),
        recommendedAction: recommendedActionFor(input.key, payload, refreshCommand),
    };
}

function previousRefreshAttempts(): RefreshAttempt[] {
    if (!existsSync(REPORT_PATH)) {
        return [];
    }
    try {
        const previous = JSON.parse(readFileSync(REPORT_PATH, "utf8")) as Partial<DebugPanelOutputTriageReport>;
        return Array.isArray(previous.refreshAttempts) ? previous.refreshAttempts : [];
    } catch {
        return [];
    }
}

function defaultRefreshAttempts(): RefreshAttempt[] {
    return [
        {
            command: "npm run score:beta",
            status: "not_run",
            artifact: "agent/state/public-beta-score.generated.json",
            effect: "Refreshes canonical beta score when run.",
            note: "Allowed focused refresh command for this lane.",
        },
        {
            command: "npm run check:launch-pr-triage",
            status: "not_run",
            artifact: "agent/state/launch-pr-triage.generated.json",
            effect: "Validator-only stale check unless an upstream generator refreshes the artifact.",
            note: "Do not fake currentHead when this validator reports stale evidence.",
        },
        {
            command: "npm run check:launch-readiness-final",
            status: "not_run",
            artifact: "agent/state/launch-readiness-report.generated.json",
            effect: "Validator-only stale check unless an upstream generator refreshes the artifact.",
            note: "Do not fake launch readiness freshness.",
        },
        {
            command: "npm run check:final-launch-readiness-report",
            status: "not_run",
            artifact: "agent/state/final-launch-readiness-report.generated.json",
            effect: "Validator-only stale check unless an upstream generator refreshes the artifact.",
            note: "Do not fake final launch readiness freshness.",
        },
    ];
}

function buildReport(): DebugPanelOutputTriageReport {
    const repoHead = runGit(["rev-parse", "HEAD"]);
    const reportItems = DEBUG_REPORTS.map((report) =>
        buildItem({
            key: report.key,
            label: report.label,
            artifact: report.artifact,
            owningValidator: report.owningValidator,
            refreshCommand: report.refreshCommand,
            canonicality: report.required ? "evidence_only" : "archive_candidate",
            repoHead,
        }),
    );
    const extraItems = EXTRA_ITEMS.map((item) =>
        buildItem({
            key: item.key,
            label: item.label,
            artifact: item.artifact,
            owningValidator: item.owningValidator,
            refreshCommand: item.refreshCommand,
            canonicality: item.canonicality,
            repoHead,
        }),
    );
    const debugItems = [...extraItems, ...reportItems];
    const falseLiveRisks = debugItems.filter(
        (item) =>
            item.uiTruthState === "live" &&
            (item.freshness !== "fresh" || ["missing", "stale_evidence", "archive_candidate"].includes(item.canonicality)),
    ).length;
    const p0Items = debugItems.filter((item) =>
        ["provider_smoke", "admin_truth_samples"].includes(item.key) && item.uiTruthState === "live",
    );
    const p1Items = debugItems.filter((item) => item.blocksPhaseOne || item.freshness === "stale");
    const p2Items = debugItems.filter((item) => item.canonicality === "archive_candidate" || item.freshness === "unknown");
    const fixQueue = [
        ...p0Items.map((item) => ({
            priority: "P0" as const,
            itemKey: item.key,
            action: item.recommendedAction,
        })),
        ...p1Items.map((item) => ({
            priority: "P1" as const,
            itemKey: item.key,
            action: item.recommendedAction,
        })),
        ...p2Items.map((item) => ({
            priority: "P2" as const,
            itemKey: item.key,
            action: item.recommendedAction,
        })),
    ];

    return {
        generatedAtUtc: new Date().toISOString(),
        reportKey: "debug-panel-output-triage",
        currentHead: repoHead,
        summary: {
            debugItemsScanned: debugItems.length,
            staleItems: debugItems.filter((item) => item.freshness === "stale").length,
            missingItems: debugItems.filter((item) => item.freshness === "missing").length,
            falseLiveRisks,
            refreshableItems: debugItems.filter((item) => item.refreshCommand).length,
            nonBlockingArchiveItems: debugItems.filter((item) => item.canonicality === "archive_candidate" && !item.blocksPhaseOne).length,
            blockingItems: debugItems.filter((item) => item.blocksPhaseOne).length,
            p0Count: p0Items.length,
            p1Count: p1Items.length,
            p2Count: p2Items.length,
        },
        debugItems,
        refreshAttempts: previousRefreshAttempts().length > 0 ? previousRefreshAttempts() : defaultRefreshAttempts(),
        fixQueue,
    };
}

function validateReport(report: DebugPanelOutputTriageReport): string[] {
    const failures: string[] = [];
    const controlTowerSource = readText("src/lib/admin-debug-control-tower.ts");
    const debugUiSource = readText("src/app/admin/debug/components/DebugControlTower.tsx");
    const publicBeta = readJson("agent/state/public-beta-score.generated.json");
    const provider = readJson("agent/state/provider-smoke-evidence.generated.json");
    const targeted = readJson("agent/state/targeted-behavior-evidence.generated.json");

    if (report.reportKey !== "debug-panel-output-triage") {
        failures.push("Report key must be debug-panel-output-triage.");
    }
    if (!Array.isArray(report.debugItems) || report.debugItems.length === 0) {
        failures.push("Debug output triage report is missing debugItems.");
    }
    for (const item of report.debugItems) {
        if (!item.sourceArtifact || !item.freshness || !item.canonicality || !item.uiTruthState) {
            failures.push(`${item.key} lacks source artifact/state metadata.`);
        }
        if (item.freshness === "stale" && !/(stale|evidence|archive)/i.test(`${item.canonicality} ${item.uiTruthState} ${item.issue}`)) {
            failures.push(`${item.key} is stale without stale/evidence/archive labeling.`);
        }
        if (item.freshness === "stale" && item.refreshCommand && !item.owningValidator && !/validator/i.test(item.issue)) {
            failures.push(`${item.key} is refreshable and stale without an owning validator or explanation.`);
        }
        if (item.sourceCommit && item.currentHead && item.sourceCommit !== report.currentHead && !/(drift|stale)/i.test(`${item.freshness} ${item.issue}`)) {
            failures.push(`${item.key} ignores sourceCommit/currentHead drift.`);
        }
        if (item.currentHead && item.currentHead !== report.currentHead && !/(drift|stale)/i.test(`${item.freshness} ${item.issue}`)) {
            failures.push(`${item.key} ignores artifact currentHead drift.`);
        }
    }

    const providerStatus = provider?.overallStatus ?? provider?.providerSmoke?.status;
    const paypalStatus = provider?.paypalRefillSmoke?.status;
    const providerItem = report.debugItems.find((item) => item.key === "provider_smoke");
    if (
        ["missing_formal_evidence", "operator_reported_not_formal_provider_smoke"].includes(providerStatus) ||
        paypalStatus === "operator_reported_not_formal_provider_smoke"
    ) {
        if (providerItem?.uiTruthState === "live" || provider?.passed === true || provider?.providerSmoke?.passed === true) {
            failures.push("Provider smoke missing/operator-reported evidence can appear as passed.");
        }
    }

    const targetedItem = report.debugItems.find((item) => item.key === "targeted_behavior_evidence");
    const targetedNote = `${targetedItem?.issue ?? ""} ${JSON.stringify(targeted?.commands ?? [])} ${JSON.stringify(targeted?.readinessImpact ?? {})}`;
    for (const forbiddenClaim of ["visual", "provider", "runtime", "admin"]) {
        if (!targetedNote.toLowerCase().includes(forbiddenClaim)) {
            failures.push(`Targeted behavior evidence does not explicitly avoid replacing ${forbiddenClaim} proof.`);
        }
    }

    if (!controlTowerSource.includes("readCanonicalPublicBetaScore") || !controlTowerSource.includes("public-beta-score.generated.json")) {
        failures.push("Public beta score is not sourced from public-beta-score.generated.json.");
    }
    if (!controlTowerSource.includes("reportAggregateScore") || !debugUiSource.includes("Report evidence summary")) {
        failures.push("Report aggregate score is not separated from the canonical public beta score.");
    }
    if (!debugUiSource.includes("canonicalPublicBetaScore") || !debugUiSource.includes("canonicalPublicBetaCapDetails")) {
        failures.push("Debug UI does not surface canonical beta score and cap details.");
    }
    if (!Array.isArray(publicBeta?.evidenceCapDetails)) {
        failures.push("Canonical beta report does not expose evidenceCapDetails.");
    }
    if (!report.debugItems.some((item) => item.key === "score_cap_reasons" && item.sourceArtifact === "agent/state/public-beta-score.generated.json")) {
        failures.push("Score cap reasons are not mapped to the canonical public beta score artifact.");
    }
    if (!report.debugItems.some((item) => item.refreshCommand && item.freshness === "stale")) {
        failures.push("No refreshable stale item was recorded.");
    }

    return failures;
}

const report = buildReport();
writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

const failures = validateReport(report);
if (failures.length > 0) {
    console.error("Debug panel output triage validation failed:");
    for (const failure of failures) {
        console.error(`- ${failure}`);
    }
    process.exit(1);
}

console.log(
    `Debug panel output triage passed: ${report.summary.debugItemsScanned} item(s), ${report.summary.staleItems} stale, ${report.summary.missingItems} missing, ${report.summary.blockingItems} blocking.`,
);
