import "server-only";

import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import type { DebugEvidenceAuditSummary } from "@/lib/debug-evidence-contract";
import type { AdminTruthState } from "@/lib/admin-truth-state";
import type { AdminUserTruthSnapshot } from "@/lib/admin-user-truth-contract";
import type { SelfHealingRefreshQueueEntry } from "@/lib/agent-score/self-healing-refresh-queue";
import {
    buildDebugOperatorCockpit,
    type DebugOperatorAiCriticFindingInput,
    type DebugOperatorCockpitReport,
    type DebugOperatorLaneInput,
    type DebugOperatorPlaybookInput,
    type DebugOperatorWarningInput,
} from "@/lib/debug/debug-operator-cockpit";
import { resolveDebugBacklogSourceTruthState } from "@/lib/debug/debug-backlog-builder";
import type { DebugBacklogItem, DebugBacklogSourceTruthState } from "@/lib/debug/debug-backlog-contract";

export type AdminDebugTruthState = "live" | "stale" | "missing" | "unavailable" | "failed" | "unknown";
export type AdminDebugSeverity = "info" | "minor" | "moderate" | "major" | "critical";
export type AdminDebugControlTowerSection =
    | "beta_readiness"
    | "live_issues"
    | "device_ui"
    | "money_cost"
    | "telemetry_behavior"
    | "support_creator";

export type AdminDebugReportCard = {
    id: string;
    label: string;
    section: AdminDebugControlTowerSection;
    filePath: string;
    command: string;
    score: number | null;
    status: string;
    truthState: AdminDebugTruthState;
    freshness: "fresh" | "stale_24h" | "stale_72h" | "missing" | "failed" | "unknown";
    generatedAt: string | null;
    updatedAtMs: number | null;
    ageHours: number | null;
    findingCount: number;
    evidenceGateCount?: number;
    criticalCount: number;
    majorCount: number;
    required: boolean;
    sourceCommit: string | null;
    currentHead: string | null;
    sourceDrift: "current" | "stale" | "unknown";
    topFindings: AdminDebugFindingCard[];
};

export type AdminDebugFindingCard = {
    id: string;
    reportId: string;
    section: AdminDebugControlTowerSection;
    severity: AdminDebugSeverity;
    title: string;
    domain: string;
    filePath: string;
    humanReadableWarning: string;
    suggestedValidator: string;
    evidence: string[];
    truthState: AdminDebugTruthState;
    speedSecurityFindingKind?: "backend_work_fanout" | "request_body_cap";
    speedSecuritySourceState?: "current" | "stale" | "evidence-only";
    speedSecurityRefreshCommand?: "npm run check:speed-security";
};

export type AdminDebugLiveIssueCard = {
    id: string;
    source: string;
    severity: "info" | "warn" | "error" | "critical";
    category: string;
    route?: string;
    component?: string;
    fingerprint: string;
    message: string;
    humanMessage: string;
    occurrenceCount: number;
    lastSeenAt: number;
    truthState: AdminDebugTruthState;
    browserSecurityBlocked?: boolean;
    actionable?: boolean;
    nonActionableThirdParty?: boolean;
    sourceSurface?: string;
    browserFrameOwner?: string;
};

export type AdminDebugRuntimeEvidenceGroup = {
    id: string;
    fingerprint: string;
    source: DebugEvidenceAuditSummary["source"];
    severity: DebugEvidenceAuditSummary["severity"];
    truthState: AdminTruthState;
    occurrenceCount: number;
    issueCount: number;
    lastSeenAt: number;
    categories: string[];
    routes: string[];
    components: string[];
    issues: DebugEvidenceAuditSummary[];
};

export type AdminDebugNextAction = {
    id: string;
    action: string;
    domain: string;
    affectedFile: string;
    suggestedValidator: string;
    severity: AdminDebugSeverity;
};

export type AdminDebugBacklogItemCard = {
    id: string;
    title: string;
    owner: string;
    surface: string;
    severity: "critical" | "p0" | "p1" | "p2" | "p3" | "info";
    source: string;
    status: string;
    fixClass: string;
    scoreDimensionImpact: string[];
    scoreImpact: number;
    sourceFiles: string[];
    sourceRoute: string;
    evidenceStatus: string;
    evidenceReason: string;
    sourceTruthState: DebugBacklogSourceTruthState;
    exactNextAction: string;
};

export type AdminDebugBacklogSummaryCard = {
    total: number;
    open: number;
    fixed: number;
    deferred: number;
    blockedManual: number;
    blockedExternal: number;
    staleRetired: number;
    sourceFixable: number;
    evidenceRefreshable: number;
    sourceTruthStates: Record<string, number>;
    p0P1Open: number;
};

export type AdminDebugGumdropRecoveryDisplayState =
    | "healthy"
    | "unavailable"
    | "source_missing"
    | "stale"
    | "recovery_required"
    | "protected_manual_review";

export type AdminDebugGumdropRecoverySummary = {
    displayState: AdminDebugGumdropRecoveryDisplayState;
    truthState: AdminDebugTruthState;
    sourceReportPath: "agent/state/recovery-timeline-spine.generated.json";
    generatedAtUtc: string | null;
    freshness: "fresh" | "stale" | "missing" | "unknown";
    status: string;
    treasury: {
        ledgerConfirmed: number;
        analyticsCorrelated: number;
        analyticsMissing: number;
        ledgerMissingProtected: number;
        duplicateRisk: number;
        sourceBucketMismatch: number;
        productTruthEligibleCount: number;
    };
    recoveryQueue: {
        queueItemCount: number;
        ledgerProofRequiredCount: number;
        analyticsOnlyRejectedCount: number;
        duplicateRiskCount: number;
        sourceBucketMismatchCount: number;
        moneyAffectingRecoveryAllowedCount: 0;
    };
    canonicalMathLedger: {
        state: AdminDebugGumdropRecoveryDisplayState;
        status: string;
        path: "agent/state/canonical-math-ledger.generated.json";
        generatedAtUtc: string | null;
        freshness: "fresh" | "stale" | "missing" | "unknown";
    };
    labels: string[];
    nextAction: string;
    analyticsOnlyEvidenceLabel: "diagnostic_only_not_treasury_truth";
};

export type AdminDebugControlTowerModel = {
    generatedAt: string;
    title: "Control Tower";
    subtitle: "Public beta truth, live evidence, and next actions.";
    overallScore: number | null;
    overallStatus: string;
    canonicalPublicBetaScore: number | null;
    canonicalPublicBetaStatus: string;
    canonicalPublicBetaReadinessStatus: string;
    canonicalPublicBetaReadinessReason: string;
    canonicalPublicBetaEvidenceScore: number | null;
    canonicalPublicBetaCapDetails: string[];
    canonicalPublicBetaGeneratedAtUtc: string | null;
    canonicalPublicBetaSourceCommit: string | null;
    canonicalPublicBetaCurrentHead: string | null;
    canonicalPublicBetaSourceDrift: AdminDebugReportCard["sourceDrift"];
    canonicalPublicBetaTruthState: AdminDebugTruthState;
    reportAggregateScore: number | null;
    reportAggregateTruthState: AdminDebugTruthState;
    reportAggregateSummary: string;
    truthState: AdminDebugTruthState;
    criticalCount: number;
    staleReportCount: number;
    missingReportCount: number;
    liveIssueCount: number;
    reports: AdminDebugReportCard[];
    sections: Record<AdminDebugControlTowerSection, AdminDebugReportCard[]>;
    liveIssues: AdminDebugLiveIssueCard[];
    runtimeEvidenceGroups: AdminDebugRuntimeEvidenceGroup[];
    nextActions: AdminDebugNextAction[];
    debugBacklog: AdminDebugBacklogItemCard[];
    debugBacklogSummary: AdminDebugBacklogSummaryCard | null;
    operatorCockpit: DebugOperatorCockpitReport;
    debugEvidenceSource: "firestore" | "generated" | "unavailable";
    reportSource: "agent_state";
    businessSnapshot: AdminUserTruthSnapshot | null;
    businessTruthState: AdminTruthState;
    reportFreshnessState: "live" | "stale" | "missing" | "failed" | "unknown" | "unavailable";
    gumdropRecovery: AdminDebugGumdropRecoverySummary;
};

type ReportDefinition = {
    id: string;
    label: string;
    section: AdminDebugControlTowerSection;
    fileName: string;
    command: string;
    required?: boolean;
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const FRESH_MS = 24 * ONE_HOUR_MS;
const STALE_MAJOR_MS = 72 * ONE_HOUR_MS;

const SEVERITY_RANK: Record<AdminDebugSeverity, number> = {
    info: 0,
    minor: 1,
    moderate: 2,
    major: 3,
    critical: 4,
};

export const ADMIN_DEBUG_CONTROL_TOWER_REPORTS: ReportDefinition[] = [
    { id: "public-beta-score", label: "Public Beta", section: "beta_readiness", fileName: "public-beta-score.generated.json", command: "npm run check:beta-score", required: true },
    { id: "self-healing-refresh-queue", label: "Self-Healing Refresh Queue", section: "beta_readiness", fileName: "self-healing-refresh-queue.generated.json", command: "npm run check:self-healing-refresh-queue", required: true },
    { id: "speed-security-hardening", label: "Speed + Security", section: "beta_readiness", fileName: "speed-security-hardening.generated.json", command: "npm run check:speed-security", required: true },
    { id: "codebase-hardening", label: "Codebase Hardening", section: "beta_readiness", fileName: "codebase-hardening.generated.json", command: "npm run check:hardening", required: true },
    { id: "device-ui-dry-audit", label: "Device UI", section: "device_ui", fileName: "device-ui-dry-audit.generated.json", command: "npm run check:device-ui", required: true },
    { id: "device-layout-score", label: "Device Layout", section: "device_ui", fileName: "device-layout-score.generated.json", command: "npm run check:device-layout-score" },
    { id: "hydration-performance", label: "Hydration", section: "device_ui", fileName: "hydration-performance.generated.json", command: "npm run check:hydration-performance" },
    { id: "sitewide-image-optimization", label: "Image Loading", section: "device_ui", fileName: "sitewide-image-optimization.generated.json", command: "npm run check:sitewide-image-optimization" },
    { id: "content-protection", label: "Content Protection", section: "beta_readiness", fileName: "content-protection-score.generated.json", command: "npm run check:content-protection", required: true },
    { id: "gumdrop-economy", label: "GumDrops Economy", section: "money_cost", fileName: "gumdrop-economy-score.generated.json", command: "npm run check:gumdrop-economy", required: true },
    { id: "canonical-math-ledger", label: "Canonical Math Ledger", section: "money_cost", fileName: "canonical-math-ledger.generated.json", command: "npm run check:canonical-math-ledger", required: true },
    { id: "treasury-reconciliation-engine", label: "Treasury Reconciliation", section: "money_cost", fileName: "treasury-reconciliation-engine.generated.json", command: "npm run check:treasury-reconciliation-engine", required: true },
    { id: "gumdrop-recovery-timeline", label: "GumDrop Recovery Timeline", section: "money_cost", fileName: "recovery-timeline-spine.generated.json", command: "npm run check:recovery-timeline-spine" },
    { id: "google-cost", label: "Google Cost", section: "money_cost", fileName: "google-cost-bleed.generated.json", command: "npm run check:google-cost", required: true },
    { id: "cloud-cost", label: "Cloud Run / SQL / BigQuery", section: "money_cost", fileName: "cloudrun-sql-bigquery-guardrails.generated.json", command: "npm run check:cloud-cost", required: true },
    { id: "sql-mirror", label: "Data Connect Mirror", section: "money_cost", fileName: "data-connect-mirror-status.generated.json", command: "npm run check:data-connect-mirror-status" },
    { id: "telemetry-parity", label: "Telemetry Parity", section: "telemetry_behavior", fileName: "telemetry-parity-score.generated.json", command: "npm run check:telemetry-parity-score", required: true },
    { id: "behavior-math", label: "Behavior Math", section: "telemetry_behavior", fileName: "behavior-math-verification.generated.json", command: "npm run check:behavior-math-verification", required: true },
    { id: "privacy-behavior-legacy-recovery", label: "Privacy Behavior Legacy Recovery", section: "telemetry_behavior", fileName: "privacy-behavior-legacy-recovery.generated.json", command: "npm run check:privacy-behavior-legacy-recovery" },
    { id: "monolith-orphan-metrics", label: "Monolith + Orphan Metrics", section: "telemetry_behavior", fileName: "monolith-orphan-metric-registry.generated.json", command: "npm run check:monolith-orphan-metric-registry", required: true },
    { id: "event-catalog", label: "Event Catalog", section: "telemetry_behavior", fileName: "event-catalog-telemetry-audit.generated.json", command: "npm run check:event-catalog-telemetry" },
    { id: "watch-time-truth", label: "Watch Time", section: "telemetry_behavior", fileName: "watch-time-truth.generated.json", command: "npm run check:watch-time-truth" },
    { id: "debug-evidence", label: "Debug Evidence", section: "live_issues", fileName: "debug-evidence-index.generated.json", command: "npm run check:debug-evidence-pipeline" },
    { id: "precatch-runtime", label: "Pre-catcher", section: "live_issues", fileName: "precatch-runtime-issues.generated.json", command: "npm run precheck:runtime-issues" },
    { id: "support_policy_surface_health", label: "Support + Policy Surfaces", section: "support_creator", fileName: "support-policy-surface-cleanup.generated.json", command: "npm run check:support-policy-surface-cleanup" },
    { id: "support-recovery", label: "Support Recovery", section: "support_creator", fileName: "support-recovery-flow-audit.generated.json", command: "npm run check:support-recovery-flows" },
    { id: "creator-lane", label: "Creator Lane", section: "support_creator", fileName: "creator-lane-debug-parity.generated.json", command: "npm run score:creator-lane-debug-parity" },
    { id: "creator-lane-legacy", label: "Creator Lane Legacy", section: "support_creator", fileName: "creator-lane-legacy-truth-inventory.generated.json", command: "npm run check:creator-lane-legacy-truth-inventory" },
    { id: "orphaned-logic", label: "Orphaned Logic", section: "support_creator", fileName: "orphaned-logic-score.generated.json", command: "npm run check:orphaned-logic" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function toStringValue(value: unknown, fallback = "") {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function toStringArray(value: unknown) {
    return Array.isArray(value) ? value.map((entry) => String(entry)).filter((entry) => entry.trim().length > 0) : [];
}

function normalizeCommit(value: unknown) {
    return typeof value === "string" && /^[a-f0-9]{7,40}$/iu.test(value.trim())
        ? value.trim()
        : null;
}

function commitsMatch(left: string | null, right: string | null) {
    if (!left || !right) {
        return false;
    }
    return left === right || left.startsWith(right) || right.startsWith(left);
}

function resolveAgentStatePath(rootDir: string | null | undefined, fileName: string) {
    return rootDir
        ? path.join(rootDir, "agent", "state", fileName)
        : path.join(/*turbopackIgnore: true*/ process.cwd(), "agent", "state", fileName);
}

function resolveGeneratedStateRelativePath(rootDir: string | null | undefined, relativePath: string) {
    const normalizedPath = relativePath.replaceAll("\\", "/");
    if (!normalizedPath.startsWith("agent/state/")) {
        return rootDir ? path.join(rootDir, ...normalizedPath.split("/").filter(Boolean)) : null;
    }
    return resolveAgentStatePath(rootDir, normalizedPath.slice("agent/state/".length));
}

function readCurrentHead() {
    return normalizeCommit(
        process.env.VERCEL_GIT_COMMIT_SHA
        ?? process.env.GITHUB_SHA
        ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
        ?? process.env.NEXT_PUBLIC_COMMIT_SHA,
    );
}

function readReportCommitState(raw: Record<string, unknown>, repoCurrentHead: string | null) {
    const sourceCommit = normalizeCommit(raw.sourceCommit);
    const currentHead = normalizeCommit(raw.currentHead);
    const sourceCommitMismatch = Boolean(sourceCommit && currentHead && !commitsMatch(sourceCommit, currentHead));
    const currentHeadLag = Boolean(currentHead && repoCurrentHead && !commitsMatch(currentHead, repoCurrentHead));
    const sourceDrift: AdminDebugReportCard["sourceDrift"] = sourceCommitMismatch
        ? "stale"
        : sourceCommit || currentHead
            ? "current"
            : "unknown";

    return {
        sourceCommit,
        currentHead,
        sourceDrift,
        sourceCommitMismatch,
        currentHeadLag,
        repoCurrentHead,
    };
}

function buildSourceDriftFinding(
    definition: ReportDefinition,
    relativePath: string,
    commitState: ReturnType<typeof readReportCommitState>,
): AdminDebugFindingCard[] {
    if (commitState.sourceDrift !== "stale") {
        return [];
    }

    const evidence = [
        commitState.sourceCommit ? `sourceCommit=${commitState.sourceCommit}` : null,
        commitState.currentHead ? `reportCurrentHead=${commitState.currentHead}` : null,
        commitState.repoCurrentHead ? `repoCurrentHead=${commitState.repoCurrentHead}` : null,
    ].filter((entry): entry is string => Boolean(entry));

    return [{
        id: `${definition.id}-source-drift`,
        reportId: definition.id,
        section: definition.section,
        severity: "moderate",
        title: `${definition.label} source commit needs review`,
        domain: definition.section,
        filePath: relativePath,
        humanReadableWarning: "Generated report commit metadata does not match the current repo head and cannot be treated as live.",
        suggestedValidator: definition.command,
        evidence,
        truthState: "stale",
    }];
}

function normalizeSeverity(value: unknown): AdminDebugSeverity {
    const raw = String(value ?? "").toLowerCase();
    if (raw === "critical") return "critical";
    if (raw === "major" || raw === "error" || raw === "fail" || raw === "failed") return "major";
    if (raw === "moderate" || raw === "warn" || raw === "warning" || raw === "beta-risk" || raw === "review" || raw === "needs_review") return "moderate";
    if (raw === "minor") return "minor";
    return "info";
}

function statusFromScore(score: number | null, fallback: string) {
    if (!Number.isFinite(score ?? Number.NaN)) {
        return fallback || "unknown";
    }
    const numeric = score ?? 0;
    if (numeric >= 95) return "clean";
    if (numeric >= 90) return "pass";
    if (numeric >= 80) return "warning";
    if (numeric >= 70) return "beta-risk";
    return "fail";
}

function truthStateFromStatus(status: string, freshness: AdminDebugReportCard["freshness"], required: boolean): AdminDebugTruthState {
    if (freshness === "missing") return required ? "missing" : "unavailable";
    if (freshness === "failed") return "failed";
    if (freshness === "stale_24h" || freshness === "stale_72h") return "stale";
    const normalized = status.toLowerCase();
    if (["fail", "failed", "critical"].includes(normalized)) return "failed";
    if (["warning", "warn", "beta-risk", "degraded", "review", "needs_review"].includes(normalized)) return "stale";
    if (["clean", "pass", "live", "healthy"].includes(normalized)) return "live";
    return "unknown";
}

function collectFindings(raw: Record<string, unknown>): unknown[] {
    const candidates = [
        raw.findings,
        raw.topFindings,
        raw.criticalFindings,
        raw.requiredFixes,
        raw.exploitRisks,
        raw.costRisks,
        raw.speedRisks,
        raw.mismatches,
    ];
    const seen = new Set<string>();
    return candidates
        .flatMap((candidate) => Array.isArray(candidate) ? candidate : [])
        .filter((candidate) => {
            const rawFinding = isRecord(candidate) ? candidate : { title: String(candidate) };
            const dedupeKey = [
                toStringValue(rawFinding.id),
                toStringValue(rawFinding.title ?? rawFinding.message ?? rawFinding.humanReadableWarning),
                toStringValue(rawFinding.filePath ?? rawFinding.routePath ?? rawFinding.surface),
            ].filter(Boolean).join("|");
            const fallbackKey = JSON.stringify(candidate).slice(0, 500);
            const key = dedupeKey || fallbackKey;
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
}

function collectSelfHealingQueueFindings(raw: Record<string, unknown>): unknown[] {
    if (raw.reportKey !== "self-healing-refresh-queue" || !Array.isArray(raw.queue)) {
        return [];
    }

    return raw.queue.slice(0, 5).map((entry, index) => {
        const item = isRecord(entry) ? entry : {};
        const artifact = toStringValue(item.artifact, `refresh item ${index + 1}`);
        const canRunAutomatically = item.canRunAutomatically === true;
        const blockedReason = toStringValue(item.blockedReason);
        const staleReason = toStringValue(item.staleReason, "Refresh needed");
        const refreshCommand = toStringValue(item.refreshCommand, "Open the owning evidence lane.");
        const expectedOutcome = toStringValue(item.expectedOutcome, "Refresh the source evidence without clearing formal runtime proof.");
        const title = canRunAutomatically ? "Queued source refresh" : "Formal proof still required";
        const humanReadableWarning = canRunAutomatically
            ? `${artifact} can refresh from local source evidence.`
            : `${artifact} needs outside proof before this lane can clear.`;

        return {
            id: `self-healing-refresh-queue-${index}`,
            severity: canRunAutomatically ? "moderate" : "major",
            title,
            humanReadableWarning,
            filePath: artifact,
            evidence: [
                staleReason,
                blockedReason || expectedOutcome,
                refreshCommand,
            ].filter(Boolean),
        };
    });
}

function derivedFindingCount(raw: Record<string, unknown>, normalizedFindings: AdminDebugFindingCard[], queueFindings: AdminDebugFindingCard[]) {
    return Math.max(
        Number(raw.findingCount) || 0,
        Number(raw.dedupedFindingCount) || 0,
        normalizedFindings.length,
        queueFindings.length,
        raw.reportKey === "self-healing-refresh-queue" && isRecord(raw.summary)
            ? Number(raw.summary.total) || 0
            : 0,
    );
}

function translateSpeedSecurityFinding(
    reportId: string,
    title: string,
    warning: string,
): {
    title: string;
    warning: string;
    kind?: AdminDebugFindingCard["speedSecurityFindingKind"];
    evidence: string[];
} {
    if (reportId !== "speed-security-hardening") {
        return { title, warning, evidence: [] };
    }

    if (title === "Potential unbounded Promise.all fanout") {
        return {
            title: "Backend work cap needed",
            warning: "Backend work can fan out too much at once.",
            kind: "backend_work_fanout",
            evidence: [
                "data-debug-speed-security-finding-kind=backend_work_fanout",
                "data-debug-speed-security-source-state=evidence-only",
                "data-debug-speed-security-refresh-command=npm run check:speed-security",
                warning,
            ],
        };
    }

    if (title === "Mutating route has body limit contract but no source-visible cap") {
        return {
            title: "Request body cap needed",
            warning: "API route needs a visible payload size cap before JSON parsing.",
            kind: "request_body_cap",
            evidence: [
                "data-debug-speed-security-finding-kind=request_body_cap",
                "data-debug-speed-security-source-state=evidence-only",
                "data-debug-speed-security-refresh-command=npm run check:speed-security",
                warning,
            ],
        };
    }

    return { title, warning, evidence: [] };
}

function normalizeFinding(
    reportId: string,
    section: AdminDebugControlTowerSection,
    command: string,
    index: number,
    rawFinding: unknown,
): AdminDebugFindingCard {
    const raw = isRecord(rawFinding) ? rawFinding : { title: String(rawFinding) };
    const severity = normalizeSeverity(raw.severity ?? raw.status ?? raw.level);
    const rawTitle = toStringValue(raw.title ?? raw.message ?? raw.humanReadableWarning, "Generated report finding");
    const rawWarning = toStringValue(raw.humanReadableWarning ?? raw.escalation ?? raw.suggestedAction ?? raw.suggestedFix, rawTitle);
    const translation = translateSpeedSecurityFinding(reportId, rawTitle, rawWarning);
    const title = translation.title;
    const evidence = Array.isArray(raw.evidence)
        ? raw.evidence.slice(0, 4).map((entry) => String(entry).slice(0, 220))
        : raw.excerpt
            ? [String(raw.excerpt).slice(0, 220)]
            : [];
    const translatedEvidence = [...translation.evidence, ...evidence].slice(0, 4);

    return {
        id: toStringValue(raw.id, `${reportId}-${index}`),
        reportId,
        section,
        severity,
        title,
        domain: toStringValue(raw.domain ?? raw.category ?? raw.routeOrSurface, section),
        filePath: toStringValue(raw.filePath ?? raw.routePath ?? raw.surface, "unknown"),
        humanReadableWarning: translation.warning,
        suggestedValidator: toStringValue(raw.validator, command),
        evidence: translatedEvidence,
        truthState: severity === "critical" ? "failed" : severity === "major" ? "stale" : "live",
        speedSecurityFindingKind: translation.kind,
        speedSecuritySourceState: translation.kind ? "evidence-only" : undefined,
        speedSecurityRefreshCommand: translation.kind ? "npm run check:speed-security" : undefined,
    };
}

function stripEvidenceGatePrefix(detail: string) {
    return detail
        .replace(/^(unknown evidence|stale evidence|runtime unverified|external proof required|needs review|source validation only|report refresh needed):\s*/iu, "")
        .trim();
}

function normalizePublicBetaCapDetailForAdminModel(detail: string) {
    const normalized = stripEvidenceGatePrefix(detail);
    const lower = normalized.toLowerCase();
    const reason = normalized
        .replace(/^Targeted behavior tests\s*[-:]\s*/iu, "")
        .replace(/^Runtime\/provider smoke\s*[-:]\s*/iu, "")
        .replace(/^Admin truth\/sample evidence\s*[-:]\s*/iu, "")
        .replace(/^Report freshness and PR integrity\s*[-:]\s*/iu, "")
        .trim();

    if (lower.includes("targeted behavior tests")) {
        return `Source validation only: Targeted behavior tests - ${reason || "Implemented behavior checks passed. Runtime, provider, admin truth, and manual visual proof still need formal evidence."}`;
    }

    if (lower.includes("runtime/provider smoke") || lower.includes("provider smoke") || lower.includes("runtime smoke")) {
        return `External proof required: Runtime/provider smoke - ${reason || "Attach redacted provider proof and deployed runtime smoke evidence before clearing this gate."}`;
    }

    if (lower.includes("admin truth") || lower.includes("truth sample") || lower.includes("sample evidence")) {
        return `External proof required: Admin truth/sample evidence - ${reason || "Attach a fresh redacted production admin truth sample before clearing this gate."}`;
    }

    if (lower.includes("report freshness") || lower.includes("pr integrity") || lower.includes("freshness window") || lower.includes("current-head") || lower.includes("current head") || lower.includes("generated report")) {
        return `Report refresh needed: Report freshness and PR integrity - ${reason || normalized}`;
    }

    return detail;
}

function normalizePublicBetaReadinessStatusForAdminModel(status: string, reason: string, capDetails: string[]) {
    const combined = [status, reason, ...capDetails].filter(Boolean).join(" ");
    if (/runtime\/provider smoke|provider smoke|runtime smoke|admin truth|sample evidence|truth sample|external proof|proof required/iu.test(combined)) return "External proof required";
    if (/report freshness|pr integrity|freshness window|current-head|current head|generated reports? are older|source metadata is stale/iu.test(combined)) return "Report refresh needed";
    if (/targeted behavior tests|source checks|source validation only/iu.test(combined)) return "Source checks only";
    if (/unknown evidence/iu.test(combined)) return "Evidence needs classification";
    if (/stale evidence/iu.test(combined)) return "Refresh or proof needed";
    return status;
}

function normalizePublicBetaEvidenceGateFinding(
    definition: ReportDefinition,
    relativePath: string,
    detail: string,
    index: number,
): AdminDebugFindingCard {
    const normalized = stripEvidenceGatePrefix(detail);
    const lower = normalized.toLowerCase();

    if (lower.includes("targeted behavior tests")) {
        return {
            id: `public-beta-source-only-${index}`,
            reportId: definition.id,
            section: definition.section,
            severity: "moderate",
            title: "Source-only behavior evidence",
            domain: "beta_readiness",
            filePath: relativePath,
            humanReadableWarning: "Implemented behavior checks passed, but runtime, provider, screenshot, and admin truth proof still need formal evidence.",
            suggestedValidator: definition.command,
            evidence: [detail.slice(0, 220)],
            truthState: "unknown",
        };
    }

    if (lower.includes("runtime/provider smoke") || lower.includes("provider smoke") || lower.includes("runtime smoke")) {
        const operatorContext = /operator-confirmed|operator confirmed|paypal/iu.test(normalized)
            ? " The operator-confirmed payment is product context only and does not clear provider proof."
            : "";
        const runtimeRecorded = /runtime smoke:\s*keep automated deployed runtime smoke evidence fresh|formal runtime smoke passed|runtimeartifactstatus=formal_runtime_smoke_passed|runtimegatepassed=true/iu.test(normalized);
        const runtimeContext = runtimeRecorded
            ? " Runtime smoke is recorded; keep it fresh."
            : " Deployed runtime smoke is still required.";
        return {
            id: `public-beta-runtime-provider-proof-${index}`,
            reportId: definition.id,
            section: definition.section,
            severity: "major",
            title: "Runtime and provider proof required",
            domain: "beta_readiness",
            filePath: relativePath,
            humanReadableWarning: `Attach redacted provider proof.${runtimeContext}${operatorContext}`,
            suggestedValidator: definition.command,
            evidence: [detail.slice(0, 220)],
            truthState: "unknown",
        };
    }

    if (lower.includes("admin truth") || lower.includes("truth sample") || lower.includes("sample evidence")) {
        return {
            id: `public-beta-admin-truth-sample-${index}`,
            reportId: definition.id,
            section: definition.section,
            severity: "major",
            title: "Admin truth sample required",
            domain: "beta_readiness",
            filePath: relativePath,
            humanReadableWarning: "Attach a fresh redacted production admin truth sample before clearing this formal evidence gate.",
            suggestedValidator: definition.command,
            evidence: [detail.slice(0, 220)],
            truthState: "unknown",
        };
    }

    if (lower.includes("report freshness") || lower.includes("pr integrity") || lower.includes("freshness window") || lower.includes("current-head") || lower.includes("current head")) {
        const count = normalized.match(/\b\d+\b/u)?.[0];
        return {
            id: `public-beta-report-refresh-${index}`,
            reportId: definition.id,
            section: definition.section,
            severity: "major",
            title: "Report refresh required",
            domain: "beta_readiness",
            filePath: relativePath,
            humanReadableWarning: count
                ? `${count} required generated reports are outside the freshness window.`
                : "Required generated reports are outside the freshness window.",
            suggestedValidator: definition.command,
            evidence: [detail.slice(0, 220)],
            truthState: "stale",
        };
    }

    return {
        id: `public-beta-evidence-gate-${index}`,
        reportId: definition.id,
        section: definition.section,
        severity: "moderate",
        title: "Evidence gate needs review",
        domain: "beta_readiness",
        filePath: relativePath,
        humanReadableWarning: normalized || "Public beta evidence gate needs review.",
        suggestedValidator: definition.command,
        evidence: [detail.slice(0, 220)],
        truthState: "unknown",
    };
}

function publicBetaEvidenceGateFindings(
    definition: ReportDefinition,
    relativePath: string,
    raw: Record<string, unknown>,
) {
    if (definition.id !== "public-beta-score") return [];
    return toStringArray(raw.evidenceCapDetails)
        .slice(0, 5)
        .map((detail, index) => normalizePublicBetaEvidenceGateFinding(definition, relativePath, detail, index));
}

function readGeneratedReport(rootDir: string | null | undefined, definition: ReportDefinition, nowMs: number, repoCurrentHead: string | null): AdminDebugReportCard {
    const relativePath = path.join("agent", "state", definition.fileName).replaceAll("\\", "/");
    const fullPath = resolveAgentStatePath(rootDir, definition.fileName);
    if (!existsSync(fullPath)) {
        const truthState = definition.required ? "missing" : "unavailable";
        return {
            id: definition.id,
            label: definition.label,
            section: definition.section,
            filePath: relativePath,
            command: definition.command,
            score: null,
            status: truthState,
            truthState,
            freshness: "missing",
            generatedAt: null,
            updatedAtMs: null,
            ageHours: null,
            findingCount: 0,
            evidenceGateCount: 0,
            criticalCount: definition.required ? 1 : 0,
            majorCount: 0,
            required: definition.required === true,
            sourceCommit: null,
            currentHead: null,
            sourceDrift: "unknown",
            topFindings: definition.required
                ? [{
                    id: `${definition.id}-missing`,
                    reportId: definition.id,
                    section: definition.section,
                    severity: "critical",
                    title: `${definition.label} report is missing`,
                    domain: definition.section,
                    filePath: relativePath,
                    humanReadableWarning: "Required generated state is missing and cannot be treated as healthy.",
                    suggestedValidator: definition.command,
                    evidence: [`Missing ${relativePath}`],
                    truthState: "missing",
                }]
                : [],
        };
    }

    try {
        const updatedAtMs = statSync(fullPath).mtimeMs;
        const raw = JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
        const generatedAtRaw = raw.generatedAt ?? raw.generated_at;
        const generatedAt = typeof generatedAtRaw === "string" && generatedAtRaw.trim().length > 0
            ? generatedAtRaw.trim()
            : null;
        const generatedAtMs = generatedAt ? Date.parse(generatedAt) : Number.NaN;
        const sourceTimestamp = Number.isFinite(generatedAtMs) ? generatedAtMs : updatedAtMs;
        const ageHours = Math.max(0, (nowMs - sourceTimestamp) / ONE_HOUR_MS);
        const freshness = nowMs - sourceTimestamp > STALE_MAJOR_MS
            ? "stale_72h"
            : nowMs - sourceTimestamp > FRESH_MS
                ? "stale_24h"
                : "fresh";
        const score = toNumber(raw.overallScore ?? raw.score);
        const status = statusFromScore(score, toStringValue(raw.overallStatus ?? raw.status, "unknown"));
        const commitState = readReportCommitState(raw, repoCurrentHead);
        const allFindings = collectFindings(raw);
        const normalizedFindings = allFindings
            .map((finding, index) => normalizeFinding(definition.id, definition.section, definition.command, index, finding))
            .sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]);
        const queueFindings = collectSelfHealingQueueFindings(raw)
            .map((finding, index) => normalizeFinding(definition.id, definition.section, definition.command, index + normalizedFindings.length, finding))
            .sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]);
        const evidenceGateFindings = publicBetaEvidenceGateFindings(definition, relativePath, raw);
        const criticalCount = Math.max(
            Number(raw.criticalCount) || 0,
            [...normalizedFindings, ...queueFindings].filter((finding) => finding.severity === "critical").length,
        );
        const majorCount = Math.max(
            Number(raw.majorCount) || 0,
            [...normalizedFindings, ...queueFindings].filter((finding) => finding.severity === "major").length,
        );
        const staleFinding: AdminDebugFindingCard[] = freshness === "stale_72h" && definition.required
            ? [{
                id: `${definition.id}-stale-72h`,
                reportId: definition.id,
                section: definition.section,
                severity: "major",
                title: `${definition.label} report is older than 72 hours`,
                domain: definition.section,
                filePath: relativePath,
                humanReadableWarning: "Beta-critical generated state is stale and needs to be regenerated before signoff.",
                suggestedValidator: definition.command,
                evidence: [`Age ${ageHours.toFixed(1)}h`],
                truthState: "stale",
            }]
            : [];
        const sourceDriftFinding = buildSourceDriftFinding(definition, relativePath, commitState);
        const baseTruthState = truthStateFromStatus(status, freshness, definition.required === true);
        const truthState = commitState.sourceDrift === "stale" && !["failed", "missing"].includes(baseTruthState)
            ? "stale"
            : baseTruthState;

        return {
            id: definition.id,
            label: definition.label,
            section: definition.section,
            filePath: relativePath,
            command: definition.command,
            score,
            status,
            truthState,
            freshness,
            generatedAt,
            updatedAtMs,
            ageHours: Number(ageHours.toFixed(1)),
            findingCount: derivedFindingCount(raw, normalizedFindings, queueFindings),
            evidenceGateCount: evidenceGateFindings.length,
            criticalCount,
            majorCount: majorCount
                + staleFinding.length
                + sourceDriftFinding.length
                + evidenceGateFindings.filter((finding) => finding.severity === "major").length,
            required: definition.required === true,
            sourceCommit: commitState.sourceCommit,
            currentHead: commitState.currentHead,
            sourceDrift: commitState.sourceDrift,
            topFindings: [...staleFinding, ...sourceDriftFinding, ...evidenceGateFindings, ...queueFindings, ...normalizedFindings].slice(0, 5),
        };
    } catch (error) {
        return {
            id: definition.id,
            label: definition.label,
            section: definition.section,
            filePath: relativePath,
            command: definition.command,
            score: null,
            status: "failed",
            truthState: "failed",
            freshness: "failed",
            generatedAt: null,
            updatedAtMs: null,
            ageHours: null,
            findingCount: 1,
            evidenceGateCount: 0,
            criticalCount: definition.required ? 1 : 0,
            majorCount: definition.required ? 0 : 1,
            required: definition.required === true,
            sourceCommit: null,
            currentHead: null,
            sourceDrift: "unknown",
            topFindings: [{
                id: `${definition.id}-parse-failed`,
                reportId: definition.id,
                section: definition.section,
                severity: definition.required ? "critical" : "major",
                title: `${definition.label} report could not be parsed`,
                domain: definition.section,
                filePath: relativePath,
                humanReadableWarning: "Generated state is unreadable and cannot be treated as healthy.",
                suggestedValidator: definition.command,
                evidence: [error instanceof Error ? error.message : "Unknown parse error"],
                truthState: "failed",
            }],
        };
    }
}

function readCanonicalPublicBetaScore(rootDir: string | null | undefined, repoCurrentHead: string | null) {
    const fullPath = resolveAgentStatePath(rootDir, "public-beta-score.generated.json");
    if (!existsSync(fullPath)) {
        return {
            canonicalPublicBetaScore: null,
            canonicalPublicBetaStatus: "missing",
            canonicalPublicBetaReadinessStatus: "missing",
            canonicalPublicBetaReadinessReason: "Canonical public beta score artifact is missing.",
            canonicalPublicBetaEvidenceScore: null,
            canonicalPublicBetaCapDetails: [],
            canonicalPublicBetaGeneratedAtUtc: null,
            canonicalPublicBetaSourceCommit: null,
            canonicalPublicBetaCurrentHead: null,
            canonicalPublicBetaSourceDrift: "unknown" as const,
            canonicalPublicBetaTruthState: "missing" as const,
        };
    }

    try {
        const raw = JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
        const commitState = readReportCommitState(raw, repoCurrentHead);
        const capDetails = toStringArray(raw.evidenceCapDetails).map(normalizePublicBetaCapDetailForAdminModel);
        const sourceDriftCap = commitState.sourceDrift === "stale"
            ? [
                normalizePublicBetaCapDetailForAdminModel([
                    "Report freshness and PR integrity: Public beta score source metadata is stale",
                    commitState.sourceCommit ? `sourceCommit=${commitState.sourceCommit}` : null,
                    commitState.currentHead ? `reportCurrentHead=${commitState.currentHead}` : null,
                    commitState.repoCurrentHead ? `repoCurrentHead=${commitState.repoCurrentHead}` : null,
                ].filter((entry): entry is string => Boolean(entry)).join(" - ")),
            ]
            : [];
        const rawReadinessStatus = toStringValue(raw.readinessStatus, "unknown");
        const rawReadinessReason = toStringValue(raw.readinessStatusReason, "No readiness status reason was supplied.");
        const canonicalCapDetails = [...sourceDriftCap, ...capDetails];
        const canonicalReadinessReason = normalizePublicBetaCapDetailForAdminModel(commitState.sourceDrift === "stale"
            ? `Report freshness and PR integrity: Canonical public beta score artifact source metadata is stale. ${rawReadinessReason}`
            : rawReadinessReason);
        const canonicalReadinessStatus = normalizePublicBetaReadinessStatusForAdminModel(
            commitState.sourceDrift === "stale" ? "Report refresh needed" : rawReadinessStatus,
            canonicalReadinessReason,
            canonicalCapDetails,
        );
        return {
            canonicalPublicBetaScore: toNumber(raw.overallScore),
            canonicalPublicBetaStatus: commitState.sourceDrift === "stale"
                ? "stale"
                : toStringValue(raw.overallStatus ?? raw.status, "unknown"),
            canonicalPublicBetaReadinessStatus: canonicalReadinessStatus,
            canonicalPublicBetaReadinessReason: canonicalReadinessReason,
            canonicalPublicBetaEvidenceScore: toNumber(raw.evidenceScore),
            canonicalPublicBetaCapDetails: canonicalCapDetails,
            canonicalPublicBetaGeneratedAtUtc: toStringValue(raw.generatedAtUtc ?? raw.generatedAt, "") || null,
            canonicalPublicBetaSourceCommit: commitState.sourceCommit,
            canonicalPublicBetaCurrentHead: commitState.currentHead,
            canonicalPublicBetaSourceDrift: commitState.sourceDrift,
            canonicalPublicBetaTruthState: commitState.sourceDrift === "stale" ? "stale" as const : "live" as const,
        };
    } catch {
        return {
            canonicalPublicBetaScore: null,
            canonicalPublicBetaStatus: "failed",
            canonicalPublicBetaReadinessStatus: "failed",
            canonicalPublicBetaReadinessReason: "Canonical public beta score artifact could not be parsed.",
            canonicalPublicBetaEvidenceScore: null,
            canonicalPublicBetaCapDetails: [],
            canonicalPublicBetaGeneratedAtUtc: null,
            canonicalPublicBetaSourceCommit: null,
            canonicalPublicBetaCurrentHead: null,
            canonicalPublicBetaSourceDrift: "unknown" as const,
            canonicalPublicBetaTruthState: "failed" as const,
        };
    }
}

function normalizeLiveIssue(input: DebugEvidenceAuditSummary): AdminDebugLiveIssueCard {
    return {
        id: input.id,
        source: input.source,
        severity: input.severity,
        category: input.category,
        route: input.route,
        component: input.component,
        fingerprint: input.fingerprint,
        message: input.message,
        humanMessage: input.humanMessage,
        occurrenceCount: input.occurrenceCount,
        lastSeenAt: input.lastSeenAt,
        truthState: input.severity === "critical" ? "failed" : input.severity === "error" ? "stale" : "live",
        browserSecurityBlocked: input.technicalSummary?.browserSecurityBlocked,
        actionable: input.technicalSummary?.actionable,
        nonActionableThirdParty: input.technicalSummary?.nonActionableThirdParty,
        sourceSurface: input.technicalSummary?.sourceSurface,
        browserFrameOwner: input.technicalSummary?.browserFrameOwner,
    };
}

function readGeneratedDebugEvidence(rootDir: string | null | undefined): DebugEvidenceAuditSummary[] {
    const fullPath = resolveAgentStatePath(rootDir, "debug-evidence-index.generated.json");
    if (!existsSync(fullPath)) {
        return [];
    }

    try {
        const raw = JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
        return Array.isArray(raw.records)
            ? raw.records.filter((record): record is DebugEvidenceAuditSummary => (
                isRecord(record)
                && typeof record.id === "string"
                && typeof record.fingerprint === "string"
                && typeof record.humanMessage === "string"
                && typeof record.occurrenceCount === "number"
                && typeof record.lastSeenAt === "number"
            )).slice(0, 60)
            : [];
    } catch {
        return [];
    }
}

function normalizeDebugBacklogItem(value: unknown): AdminDebugBacklogItemCard | null {
    if (!isRecord(value)) {
        return null;
    }
    const sourceFiles = Array.isArray(value.sourceFiles)
        ? value.sourceFiles.map((entry) => String(entry)).filter(Boolean)
        : [];
    const scoreDimensionImpact = Array.isArray(value.scoreDimensionImpact)
        ? value.scoreDimensionImpact.map((entry) => String(entry)).filter(Boolean)
        : [];
    const id = toStringValue(value.id);
    const title = toStringValue(value.title);
    const owner = toStringValue(value.owner);
    const surface = toStringValue(value.surface);
    const exactNextAction = toStringValue(value.exactNextAction);
    const fixClass = toStringValue(value.fixClass, "evidence_refresh");
    const status = toStringValue(value.status, "open");
    const source = toStringValue(value.source, "debug_panel");
    const evidenceStatus = toStringValue(value.evidenceStatus, "unknown");
    const evidenceReason = toStringValue(value.evidenceReason, "No evidence reason supplied.");
    const sourceMessage = toStringValue(value.sourceMessage, title);
    if (!id || !title || !owner || !surface || !exactNextAction || sourceFiles.length === 0 || scoreDimensionImpact.length === 0) {
        return null;
    }
    const debugBacklogItem = {
        id,
        title,
        owner,
        surface,
        severity: toStringValue(value.severity, "p2") as DebugBacklogItem["severity"],
        source: source as DebugBacklogItem["source"],
        status: status as DebugBacklogItem["status"],
        fixClass: fixClass as DebugBacklogItem["fixClass"],
        scoreDimensionImpact: scoreDimensionImpact as DebugBacklogItem["scoreDimensionImpact"],
        scoreImpact: toNumber(value.scoreImpact) ?? 0,
        sourceFiles,
        sourceRoute: toStringValue(value.sourceRoute, "unknown"),
        evidenceStatus: evidenceStatus as DebugBacklogItem["evidenceStatus"],
        evidenceReason,
        exactNextAction,
        sourceMessage,
    } satisfies DebugBacklogItem;
    return {
        id,
        title,
        owner,
        surface,
        severity: debugBacklogItem.severity,
        source,
        status,
        fixClass,
        scoreDimensionImpact,
        scoreImpact: debugBacklogItem.scoreImpact,
        sourceFiles,
        sourceRoute: debugBacklogItem.sourceRoute,
        evidenceStatus,
        evidenceReason,
        sourceTruthState: resolveDebugBacklogSourceTruthState(debugBacklogItem),
        exactNextAction,
    };
}

function readGeneratedDebugBacklog(rootDir: string | null | undefined): {
    backlog: AdminDebugBacklogItemCard[];
    summary: AdminDebugBacklogSummaryCard | null;
} {
    const fullPath = resolveAgentStatePath(rootDir, "debug-backlog-engine.generated.json");
    if (!existsSync(fullPath)) {
        return { backlog: [], summary: null };
    }

    try {
        const raw = JSON.parse(readFileSync(fullPath, "utf8")) as Record<string, unknown>;
        const backlog = Array.isArray(raw.backlog)
            ? raw.backlog.map(normalizeDebugBacklogItem).filter((item): item is AdminDebugBacklogItemCard => Boolean(item)).slice(0, 40)
            : [];
        const summary = isRecord(raw.summary)
            ? {
                total: toNumber(raw.summary.total) ?? backlog.length,
                open: toNumber(raw.summary.open) ?? 0,
                fixed: toNumber(raw.summary.fixed) ?? 0,
                deferred: toNumber(raw.summary.deferred) ?? 0,
                blockedManual: toNumber(raw.summary.blockedManual) ?? 0,
                blockedExternal: toNumber(raw.summary.blockedExternal) ?? 0,
                staleRetired: toNumber(raw.summary.staleRetired) ?? 0,
                sourceFixable: toNumber(raw.summary.sourceFixable) ?? 0,
                evidenceRefreshable: toNumber(raw.summary.evidenceRefreshable) ?? 0,
                sourceTruthStates: isRecord(raw.summary.sourceTruthStates)
                    ? Object.fromEntries(Object.entries(raw.summary.sourceTruthStates).map(([key, value]) => [key, toNumber(value) ?? 0]))
                    : {},
                p0P1Open: toNumber(raw.summary.p0P1Open) ?? 0,
            }
            : null;
        return { backlog, summary };
    } catch {
        return { backlog: [], summary: null };
    }
}

function readJsonRecord(rootDir: string | null | undefined, relativePath: string): Record<string, unknown> | null {
    const fullPath = resolveGeneratedStateRelativePath(rootDir, relativePath);
    if (!fullPath) {
        return null;
    }
    if (!existsSync(fullPath)) {
        return null;
    }

    try {
        const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
        return isRecord(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function generatedAtUtcFromRecord(raw: Record<string, unknown> | null) {
    return toStringValue(raw?.generatedAtUtc ?? raw?.generatedAt ?? raw?.generated_at) || null;
}

function generatedFreshness(generatedAtUtc: string | null, nowMs: number): "fresh" | "stale" | "missing" | "unknown" {
    if (!generatedAtUtc) return "missing";
    const parsed = Date.parse(generatedAtUtc);
    if (!Number.isFinite(parsed)) return "unknown";
    return nowMs - parsed > FRESH_MS ? "stale" : "fresh";
}

function gumdropDisplayStateToTruthState(state: AdminDebugGumdropRecoveryDisplayState): AdminDebugTruthState {
    if (state === "healthy") return "live";
    if (state === "stale") return "stale";
    if (state === "source_missing") return "missing";
    if (state === "unavailable") return "unavailable";
    return "failed";
}

function readNestedRecord(source: Record<string, unknown> | null, key: string) {
    const value = source?.[key];
    return isRecord(value) ? value : null;
}

function readGeneratedGumdropRecoverySummary(rootDir: string | null | undefined, nowMs: number): AdminDebugGumdropRecoverySummary {
    const sourceReportPath = "agent/state/recovery-timeline-spine.generated.json" as const;
    const canonicalMathPath = "agent/state/canonical-math-ledger.generated.json" as const;
    const recovery = readJsonRecord(rootDir, sourceReportPath);
    const canonicalMath = readJsonRecord(rootDir, canonicalMathPath);
    const generatedAtUtc = generatedAtUtcFromRecord(recovery);
    const freshness = recovery ? generatedFreshness(generatedAtUtc, nowMs) : "missing";
    const canonicalMathGeneratedAtUtc = generatedAtUtcFromRecord(canonicalMath);
    const canonicalMathFreshness = canonicalMath ? generatedFreshness(canonicalMathGeneratedAtUtc, nowMs) : "missing";
    const treasurySummary = readNestedRecord(readNestedRecord(recovery, "treasuryTimelineReconciliation"), "summary");
    const queueSummary = readNestedRecord(readNestedRecord(recovery, "gumdropRecoveryQueue"), "summary");
    const recoveryPolicy = readNestedRecord(readNestedRecord(recovery, "gumdropRecoveryQueue"), "productTruthPolicy");
    const canonicalStatus = toStringValue(canonicalMath?.status, canonicalMath ? "unknown" : "source_missing");
    const canonicalState: AdminDebugGumdropRecoveryDisplayState = !canonicalMath
        ? "source_missing"
        : canonicalMathFreshness === "stale"
            ? "stale"
            : canonicalStatus === "fail" || canonicalStatus === "failed"
                ? "recovery_required"
                : "healthy";
    const treasury = {
        ledgerConfirmed: toNumber(treasurySummary?.ledger_confirmed) ?? 0,
        analyticsCorrelated: toNumber(treasurySummary?.analytics_correlated) ?? 0,
        analyticsMissing: toNumber(treasurySummary?.analytics_missing) ?? 0,
        ledgerMissingProtected: toNumber(treasurySummary?.ledger_missing_protected) ?? 0,
        duplicateRisk: toNumber(treasurySummary?.duplicate_risk) ?? 0,
        sourceBucketMismatch: toNumber(treasurySummary?.source_bucket_mismatch) ?? 0,
        productTruthEligibleCount: toNumber(treasurySummary?.productTruthEligibleCount) ?? 0,
    };
    const recoveryQueue = {
        queueItemCount: toNumber(queueSummary?.queueItemCount) ?? 0,
        ledgerProofRequiredCount: toNumber(queueSummary?.ledgerProofRequiredCount) ?? 0,
        analyticsOnlyRejectedCount: toNumber(queueSummary?.analyticsOnlyRejectedCount) ?? 0,
        duplicateRiskCount: toNumber(queueSummary?.duplicateRiskCount) ?? 0,
        sourceBucketMismatchCount: toNumber(queueSummary?.sourceBucketMismatchCount) ?? 0,
        moneyAffectingRecoveryAllowedCount: 0 as const,
    };
    const labels = [
        "treasury_ledger_primary",
        "analytics_only_diagnostic",
        "manual_recovery_dry_run",
        recoveryPolicy?.analyticsOnlyCanChangeBalance === false ? "analytics_only_balance_recovery_rejected" : "analytics_policy_unknown",
        canonicalState === "healthy" ? "canonical_math_ledger_healthy" : "canonical_math_ledger_needs_review",
    ];
    const displayState: AdminDebugGumdropRecoveryDisplayState = !recovery
        ? "source_missing"
        : freshness === "stale"
            ? "stale"
            : recoveryQueue.ledgerProofRequiredCount > 0 || treasury.ledgerMissingProtected > 0
                ? "protected_manual_review"
                : recoveryQueue.queueItemCount > 0 || treasury.sourceBucketMismatch > 0 || treasury.duplicateRisk > 0 || canonicalState !== "healthy"
                    ? "recovery_required"
                    : "healthy";

    return {
        displayState,
        truthState: gumdropDisplayStateToTruthState(displayState),
        sourceReportPath,
        generatedAtUtc,
        freshness,
        status: toStringValue(recovery?.status, recovery ? "unknown" : "source_missing"),
        treasury,
        recoveryQueue,
        canonicalMathLedger: {
            state: canonicalState,
            status: canonicalStatus,
            path: canonicalMathPath,
            generatedAtUtc: canonicalMathGeneratedAtUtc,
            freshness: canonicalMathFreshness,
        },
        labels,
        nextAction: displayState === "protected_manual_review"
            ? "Collect redacted ledger/server proof before any GumDrop recovery action."
            : displayState === "recovery_required"
                ? "Review queue counts, source-bucket mismatches, and canonical math ledger state before signoff."
                : displayState === "stale" || displayState === "source_missing"
                    ? "Run npm run check:recovery-timeline-spine and npm run check:canonical-math-ledger locally."
                    : "Keep analytics evidence diagnostic-only; no recovery action is required.",
        analyticsOnlyEvidenceLabel: "diagnostic_only_not_treasury_truth",
    };
}

function readGeneratedRefreshQueue(rootDir: string | null | undefined): SelfHealingRefreshQueueEntry[] {
    const raw = readJsonRecord(rootDir, path.join("agent", "state", "self-healing-refresh-queue.generated.json"));
    return Array.isArray(raw?.queue)
        ? raw.queue.filter(isRecord).map((entry) => ({
            artifact: toStringValue(entry.artifact, "unknown_artifact"),
            staleReason: toStringValue(entry.staleReason, "unknown"),
            refreshCommand: toStringValue(entry.refreshCommand, ""),
            scoreImpactEstimate: toNumber(entry.scoreImpactEstimate) ?? 0,
            owner: toStringValue(entry.owner, "repo") as SelfHealingRefreshQueueEntry["owner"],
            dependencyOrder: toNumber(entry.dependencyOrder) ?? 0,
            canRunAutomatically: entry.canRunAutomatically === true,
            blockedReason: toStringValue(entry.blockedReason, ""),
            source: toStringValue(entry.source, "refresh_plan") as SelfHealingRefreshQueueEntry["source"],
            expectedOutcome: toStringValue(entry.expectedOutcome, ""),
        }))
        : [];
}

function readGeneratedAiCriticFindings(rootDir: string | null | undefined): DebugOperatorAiCriticFindingInput[] {
    const raw = readJsonRecord(rootDir, path.join("agent", "state", "ai-debug-critic.generated.json"));
    const findings = Array.isArray(raw?.findings) ? raw.findings : [];
    return findings.filter(isRecord).slice(0, 8).map((finding) => ({
        id: toStringValue(finding.id, "ai-critic-finding"),
        severity: toStringValue(finding.severity, "required"),
        title: toStringValue(finding.title, "AI critic finding"),
        requiredFix: toStringValue(finding.detail, "Run npm run check:ai-debug-critic."),
    }));
}

function readGeneratedRecoveryPlaybooks(rootDir: string | null | undefined): DebugOperatorPlaybookInput[] {
    const raw = readJsonRecord(rootDir, path.join("agent", "state", "debug-recovery-playbooks.generated.json"));
    const playbooks = Array.isArray(raw?.playbooks) ? raw.playbooks : [];
    return playbooks.filter(isRecord).slice(0, 6).map((playbook) => ({
        id: toStringValue(playbook.id, "debug-recovery-playbook"),
        title: toStringValue(playbook.title, "Debug recovery playbook"),
        triggerPatterns: toStringArray(playbook.triggerPatterns),
        commands: toStringArray(playbook.commands),
        validators: toStringArray(playbook.validators),
        forbiddenActions: toStringArray(playbook.forbiddenActions),
    }));
}

function warningTruthStateForBacklogItem(item: AdminDebugBacklogItemCard): DebugOperatorWarningInput["truthState"] {
    switch (item.sourceTruthState) {
        case "runtime_proof_required":
        case "provider_or_external_proof_required":
        case "admin_truth_source_required":
        case "protected_manual_review":
        case "source_fixable":
            return "failed";
        case "source_refresh_required":
        case "stale_evidence_archive":
            return "stale";
        case "manual_visual_required":
            return "degraded";
        case "source_backed":
        case "not_actionable":
            return "live";
        default:
            return item.evidenceStatus === "unknown" ? "unknown" : "degraded";
    }
}

function buildCriticalWarnings(backlog: AdminDebugBacklogItemCard[], liveIssues: AdminDebugLiveIssueCard[]): DebugOperatorWarningInput[] {
    const backlogWarnings = backlog
        .filter((item) => item.status === "open" || item.status === "blocked_manual" || item.status === "blocked_external")
        .filter((item) => item.severity === "critical" || item.severity === "p0" || item.severity === "p1")
        .map((item) => ({
            id: item.id,
            severity: item.severity,
            owner: item.owner,
            message: item.title,
            nextAction: item.exactNextAction,
            truthState: warningTruthStateForBacklogItem(item),
            sourceTruthState: item.sourceTruthState,
        }));
    const liveWarnings = liveIssues
        .filter((issue) => issue.severity === "critical" || issue.severity === "error")
        .map((issue) => ({
            id: issue.id,
            severity: issue.severity,
            owner: issue.sourceSurface ?? issue.source,
            message: issue.humanMessage,
            nextAction: issue.actionable === false ? "Classify and keep as non-actionable evidence." : "Open live issue evidence and run the suggested debug validator.",
            truthState: issue.truthState === "live" ? "failed" as const : issue.truthState === "missing" ? "unknown" as const : issue.truthState,
        }));

    return [...backlogWarnings, ...liveWarnings].slice(0, 10);
}

function cockpitStateFromReport(report: AdminDebugReportCard) {
    return report.truthState === "missing" ? "unknown" as const : report.truthState;
}

function isRefreshOrMetadataFinding(finding: AdminDebugFindingCard) {
    return /source commit|current repo head|older than 72 hours|freshness|generated report|report metadata/iu.test(
        `${finding.title} ${finding.humanReadableWarning} ${finding.evidence.join(" ")}`,
    );
}

function isFormalEvidenceFinding(finding: AdminDebugFindingCard) {
    return /source-only behavior evidence|runtime and provider proof required|admin truth sample required|report refresh required|evidence gate/iu.test(finding.title);
}

function hasSourceFindings(report: AdminDebugReportCard) {
    if (report.findingCount > 0 || report.criticalCount > 0) return true;
    return report.topFindings.some((finding) => !isRefreshOrMetadataFinding(finding) && !isFormalEvidenceFinding(finding));
}

export function formatOperatorReportStatusForAdmin(report: AdminDebugReportCard) {
    const normalizedStatus = report.status.toLowerCase();
    const sourceFindingsPresent = hasSourceFindings(report);
    const sourceNeedsRefresh = report.freshness === "stale_24h" || report.freshness === "stale_72h" || report.sourceDrift === "stale";

    if (report.freshness === "missing" || report.truthState === "missing") return "Source missing";
    if (report.freshness === "failed") return "Source failed";
    if (sourceNeedsRefresh) return "Refresh due";
    if (!sourceFindingsPresent && (report.evidenceGateCount ?? 0) > 0) return "Formal proof required";
    if (["delayed", "queued", "waiting"].includes(normalizedStatus)) return sourceFindingsPresent ? "Review delayed" : "Waiting for evidence";
    if (["fail", "failed", "error"].includes(normalizedStatus)) return "Needs review";
    if (["beta-risk", "warning", "review", "needs_review"].includes(normalizedStatus)) return "Needs review";
    if (["clean", "pass", "passed", "ready", "ok", "live", "healthy"].includes(normalizedStatus) && !sourceFindingsPresent) return "Source current";

    return report.status.replaceAll("_", " ").replace(/\b\w/gu, (char) => char.toUpperCase());
}

function statusFromReports(reports: AdminDebugReportCard[], ids: string[], fallbackLabel: string, fallbackAction: string) {
    const selected = reports.filter((report) => ids.some((id) => report.id.includes(id) || report.filePath.includes(id)));
    const worst = selected.find((report) => report.truthState === "failed" || report.truthState === "missing")
        ?? selected.find((report) => report.truthState === "stale" || report.truthState === "unknown")
        ?? selected[0];
    return {
        state: worst ? cockpitStateFromReport(worst) : "unknown",
        label: worst ? `${worst.label}: ${formatOperatorReportStatusForAdmin(worst)}` : fallbackLabel,
        nextAction: worst?.command ?? fallbackAction,
    };
}

function costOwnerReviewLanes(reports: AdminDebugReportCard[]): DebugOperatorLaneInput[] {
    return reports
        .filter((report) => report.section === "money_cost" || report.id.includes("cost"))
        .map((report) => ({
            id: report.id,
            owner: "cost",
            label: `${report.label}: ${formatOperatorReportStatusForAdmin(report)}`,
            state: cockpitStateFromReport(report),
            nextAction: report.command,
        }));
}

function buildSections(reports: AdminDebugReportCard[]) {
    return reports.reduce<AdminDebugControlTowerModel["sections"]>((sections, report) => {
        sections[report.section].push(report);
        if (report.id === "device-ui-dry-audit" || report.id === "device-layout-score") {
            sections.beta_readiness.push(report);
        }
        if (report.id === "content-protection") {
            sections.device_ui.push(report);
        }
        if (report.id === "google-cost" || report.id === "cloud-cost") {
            sections.beta_readiness.push(report);
        }
        if (report.id === "telemetry-parity") {
            sections.beta_readiness.push(report);
        }
        return sections;
    }, {
        beta_readiness: [],
        live_issues: [],
        device_ui: [],
        money_cost: [],
        telemetry_behavior: [],
        support_creator: [],
    });
}

export function buildAdminDebugControlTowerModel(options?: {
    rootDir?: string;
    nowMs?: number;
    debugEvidence?: DebugEvidenceAuditSummary[];
    debugEvidenceSource?: "firestore" | "generated" | "unavailable";
}): AdminDebugControlTowerModel {
    const rootDir = options?.rootDir ?? null;
    const nowMs = options?.nowMs ?? Date.now();
    const repoCurrentHead = readCurrentHead();
    const reports = ADMIN_DEBUG_CONTROL_TOWER_REPORTS.map((definition) => readGeneratedReport(rootDir, definition, nowMs, repoCurrentHead));
    const canonicalPublicBeta = readCanonicalPublicBetaScore(rootDir, repoCurrentHead);
    const gumdropRecovery = readGeneratedGumdropRecoverySummary(rootDir, nowMs);
    const allFindings = reports.flatMap((report) => report.topFindings);
    const sortedFindings = [...allFindings].sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]);
    const generatedEvidence = options?.debugEvidence?.length ? [] : readGeneratedDebugEvidence(rootDir);
    const debugEvidence = options?.debugEvidence?.length ? options.debugEvidence : generatedEvidence;
    const generatedBacklog = readGeneratedDebugBacklog(rootDir);
    const liveIssues = debugEvidence
        .map(normalizeLiveIssue)
        .sort((left, right) => {
            const severityDelta = (right.severity === "critical" ? 4 : right.severity === "error" ? 3 : right.severity === "warn" ? 2 : 1)
                - (left.severity === "critical" ? 4 : left.severity === "error" ? 3 : left.severity === "warn" ? 2 : 1);
            return severityDelta || (right.occurrenceCount - left.occurrenceCount) || (right.lastSeenAt - left.lastSeenAt);
        })
        .slice(0, 10);
    const criticalCount = reports.reduce((total, report) => total + report.criticalCount, 0)
        + liveIssues.filter((issue) => issue.severity === "critical").length;
    const staleReportCount = reports.filter((report) => report.truthState === "stale").length;
    const missingReportCount = reports.filter((report) => report.truthState === "missing").length;
    const scoreValues = reports
        .filter((report) => report.required && Number.isFinite(report.score ?? Number.NaN))
        .map((report) => report.score as number);
    const reportAggregateScore = scoreValues.length > 0
        ? Number((scoreValues.reduce((total, score) => total + score, 0) / scoreValues.length).toFixed(1))
        : null;
    const truthState: AdminDebugTruthState = criticalCount > 0
        ? "failed"
        : missingReportCount > 0
            ? "missing"
            : staleReportCount > 0
                ? "stale"
                : "live";
    const reportAggregateSummary = reportAggregateScore === null
        ? "No required report scores are available."
        : `Required generated report average is ${reportAggregateScore}/100 across ${scoreValues.length} scored report(s).`;
    const nextActions: AdminDebugNextAction[] = sortedFindings.slice(0, 10).map((finding, index) => ({
        id: `next-${finding.id}-${index}`,
        action: finding.humanReadableWarning,
        domain: finding.domain,
        affectedFile: finding.filePath,
        suggestedValidator: finding.suggestedValidator,
        severity: finding.severity,
    }));
    const operatorCockpit = buildDebugOperatorCockpit({
        scoreImpactQueue: readGeneratedRefreshQueue(rootDir),
        criticalRuntimeWarnings: buildCriticalWarnings(generatedBacklog.backlog, liveIssues),
        adminTruthStatus: statusFromReports(reports, ["admin-truth", "admin_truth"], "Admin truth source not loaded; classify source sample before clearing the formal gate.", "Run npm run check:admin-debug-control-tower."),
        telemetryLaneStatus: statusFromReports(reports, ["telemetry", "behavior", "watch-time"], "Telemetry lane status is unknown.", "Run npm run check:telemetry-dependency-graph."),
        costOwnerReviewLanes: costOwnerReviewLanes(reports),
        aiCriticFindings: readGeneratedAiCriticFindings(rootDir),
        recoveryPlaybooks: readGeneratedRecoveryPlaybooks(rootDir),
    }, {
        generatedAtUtc: new Date(nowMs).toISOString(),
        currentHead: repoCurrentHead ?? "unknown",
    });

    return {
        generatedAt: new Date(nowMs).toISOString(),
        title: "Control Tower",
        subtitle: "Public beta truth, live evidence, and next actions.",
        overallScore: canonicalPublicBeta.canonicalPublicBetaScore,
        overallStatus: truthState === "failed" ? "failed" : truthState === "stale" ? "stale" : truthState === "missing" ? "missing" : "live",
        ...canonicalPublicBeta,
        reportAggregateScore,
        reportAggregateTruthState: truthState,
        reportAggregateSummary,
        truthState,
        criticalCount,
        staleReportCount,
        missingReportCount,
        liveIssueCount: liveIssues.length,
        reports,
        sections: buildSections(reports),
        liveIssues,
        runtimeEvidenceGroups: [],
        nextActions,
        debugBacklog: generatedBacklog.backlog,
        debugBacklogSummary: generatedBacklog.summary,
        operatorCockpit,
        debugEvidenceSource: options?.debugEvidenceSource ?? (options?.debugEvidence?.length ? "firestore" : generatedEvidence.length > 0 ? "generated" : "unavailable"),
        reportSource: "agent_state",
        businessSnapshot: null,
        businessTruthState: "unavailable",
        reportFreshnessState: truthState,
        gumdropRecovery,
    };
}
