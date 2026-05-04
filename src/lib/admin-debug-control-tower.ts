import "server-only";

import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import type { DebugEvidenceAuditSummary } from "@/lib/debug-evidence-contract";

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
    criticalCount: number;
    majorCount: number;
    required: boolean;
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
};

export type AdminDebugNextAction = {
    id: string;
    action: string;
    domain: string;
    affectedFile: string;
    suggestedValidator: string;
    severity: AdminDebugSeverity;
};

export type AdminDebugControlTowerModel = {
    generatedAt: string;
    title: "Control Tower";
    subtitle: "Public beta truth, live evidence, and next actions.";
    overallScore: number | null;
    overallStatus: string;
    truthState: AdminDebugTruthState;
    criticalCount: number;
    staleReportCount: number;
    missingReportCount: number;
    liveIssueCount: number;
    reports: AdminDebugReportCard[];
    sections: Record<AdminDebugControlTowerSection, AdminDebugReportCard[]>;
    liveIssues: AdminDebugLiveIssueCard[];
    nextActions: AdminDebugNextAction[];
    debugEvidenceSource: "firestore" | "generated" | "unavailable";
    reportSource: "agent_state";
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
    { id: "speed-security-hardening", label: "Speed + Security", section: "beta_readiness", fileName: "speed-security-hardening.generated.json", command: "npm run check:speed-security", required: true },
    { id: "codebase-hardening", label: "Codebase Hardening", section: "beta_readiness", fileName: "codebase-hardening.generated.json", command: "npm run check:hardening", required: true },
    { id: "device-ui-dry-audit", label: "Device UI", section: "device_ui", fileName: "device-ui-dry-audit.generated.json", command: "npm run check:device-ui", required: true },
    { id: "device-layout-score", label: "Device Layout", section: "device_ui", fileName: "device-layout-score.generated.json", command: "npm run check:device-layout-score" },
    { id: "hydration-performance", label: "Hydration", section: "device_ui", fileName: "hydration-performance.generated.json", command: "npm run check:hydration-performance" },
    { id: "sitewide-image-optimization", label: "Image Loading", section: "device_ui", fileName: "sitewide-image-optimization.generated.json", command: "npm run check:sitewide-image-optimization" },
    { id: "content-protection", label: "Content Protection", section: "beta_readiness", fileName: "content-protection-score.generated.json", command: "npm run check:content-protection", required: true },
    { id: "gumdrop-economy", label: "GumDrops Economy", section: "money_cost", fileName: "gumdrop-economy-score.generated.json", command: "npm run check:gumdrop-economy", required: true },
    { id: "google-cost", label: "Google Cost", section: "money_cost", fileName: "google-cost-bleed.generated.json", command: "npm run check:google-cost", required: true },
    { id: "cloud-cost", label: "Cloud Run / SQL / BigQuery", section: "money_cost", fileName: "cloudrun-sql-bigquery-guardrails.generated.json", command: "npm run check:cloud-cost", required: true },
    { id: "sql-mirror", label: "Data Connect Mirror", section: "money_cost", fileName: "sql-mirror-status.generated.json", command: "npm run agent:sync-sql" },
    { id: "telemetry-parity", label: "Telemetry Parity", section: "telemetry_behavior", fileName: "telemetry-parity-score.generated.json", command: "npm run check:telemetry-parity-score", required: true },
    { id: "event-catalog", label: "Event Catalog", section: "telemetry_behavior", fileName: "event-catalog-telemetry-audit.generated.json", command: "npm run check:event-catalog-telemetry" },
    { id: "watch-time-truth", label: "Watch Time", section: "telemetry_behavior", fileName: "watch-time-truth.generated.json", command: "npm run check:watch-time-truth" },
    { id: "debug-evidence", label: "Debug Evidence", section: "live_issues", fileName: "debug-evidence-index.generated.json", command: "npm run check:debug-evidence-pipeline" },
    { id: "precatch-runtime", label: "Pre-catcher", section: "live_issues", fileName: "precatch-runtime-issues.generated.json", command: "npm run precheck:runtime-issues" },
    { id: "support-recovery", label: "Support Recovery", section: "support_creator", fileName: "support-recovery-flow-audit.generated.json", command: "npm run check:support-recovery-flows" },
    { id: "creator-lane", label: "Creator Lane", section: "support_creator", fileName: "creator-lane-legacy-truth-inventory.generated.json", command: "npm run check:creator-lane-legacy-truth-inventory" },
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

function normalizeSeverity(value: unknown): AdminDebugSeverity {
    const raw = String(value ?? "").toLowerCase();
    if (raw === "critical") return "critical";
    if (raw === "major" || raw === "error" || raw === "fail" || raw === "failed") return "major";
    if (raw === "moderate" || raw === "warn" || raw === "warning" || raw === "beta-risk") return "moderate";
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
    if (["warning", "warn", "beta-risk", "degraded"].includes(normalized)) return "stale";
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
    ];
    return candidates.flatMap((candidate) => Array.isArray(candidate) ? candidate : []);
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
    const title = toStringValue(raw.title ?? raw.message ?? raw.humanReadableWarning, "Generated report finding");
    const evidence = Array.isArray(raw.evidence)
        ? raw.evidence.slice(0, 4).map((entry) => String(entry).slice(0, 220))
        : raw.excerpt
            ? [String(raw.excerpt).slice(0, 220)]
            : [];

    return {
        id: toStringValue(raw.id, `${reportId}-${index}`),
        reportId,
        section,
        severity,
        title,
        domain: toStringValue(raw.domain ?? raw.category ?? raw.routeOrSurface, section),
        filePath: toStringValue(raw.filePath ?? raw.routePath ?? raw.surface, "unknown"),
        humanReadableWarning: toStringValue(raw.humanReadableWarning ?? raw.escalation ?? raw.suggestedFix, title),
        suggestedValidator: command,
        evidence,
        truthState: severity === "critical" ? "failed" : severity === "major" ? "stale" : "live",
    };
}

function readGeneratedReport(rootDir: string, definition: ReportDefinition, nowMs: number): AdminDebugReportCard {
    const relativePath = join("agent", "state", definition.fileName).replaceAll("\\", "/");
    const fullPath = join(rootDir, "agent", "state", definition.fileName);
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
            criticalCount: definition.required ? 1 : 0,
            majorCount: 0,
            required: definition.required === true,
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
        const allFindings = collectFindings(raw);
        const normalizedFindings = allFindings
            .map((finding, index) => normalizeFinding(definition.id, definition.section, definition.command, index, finding))
            .sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]);
        const criticalCount = Math.max(
            Number(raw.criticalCount) || 0,
            normalizedFindings.filter((finding) => finding.severity === "critical").length,
        );
        const majorCount = Math.max(
            Number(raw.majorCount) || 0,
            normalizedFindings.filter((finding) => finding.severity === "major").length,
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
        const truthState = truthStateFromStatus(status, freshness, definition.required === true);

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
            findingCount: Math.max(Number(raw.findingCount) || 0, Number(raw.dedupedFindingCount) || 0, normalizedFindings.length),
            criticalCount,
            majorCount: majorCount + staleFinding.length,
            required: definition.required === true,
            topFindings: [...staleFinding, ...normalizedFindings].slice(0, 5),
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
            criticalCount: definition.required ? 1 : 0,
            majorCount: definition.required ? 0 : 1,
            required: definition.required === true,
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
    };
}

function readGeneratedDebugEvidence(rootDir: string): DebugEvidenceAuditSummary[] {
    const fullPath = join(rootDir, "agent", "state", "debug-evidence-index.generated.json");
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
    const rootDir = options?.rootDir ?? process.cwd();
    const nowMs = options?.nowMs ?? Date.now();
    const reports = ADMIN_DEBUG_CONTROL_TOWER_REPORTS.map((definition) => readGeneratedReport(rootDir, definition, nowMs));
    const allFindings = reports.flatMap((report) => report.topFindings);
    const sortedFindings = [...allFindings].sort((left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity]);
    const generatedEvidence = options?.debugEvidence?.length ? [] : readGeneratedDebugEvidence(rootDir);
    const debugEvidence = options?.debugEvidence?.length ? options.debugEvidence : generatedEvidence;
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
    const overallScore = scoreValues.length > 0
        ? Number((scoreValues.reduce((total, score) => total + score, 0) / scoreValues.length).toFixed(1))
        : null;
    const truthState: AdminDebugTruthState = criticalCount > 0
        ? "failed"
        : missingReportCount > 0
            ? "missing"
            : staleReportCount > 0
                ? "stale"
                : "live";
    const nextActions: AdminDebugNextAction[] = sortedFindings.slice(0, 10).map((finding, index) => ({
        id: `next-${finding.id}-${index}`,
        action: finding.humanReadableWarning,
        domain: finding.domain,
        affectedFile: finding.filePath,
        suggestedValidator: finding.suggestedValidator,
        severity: finding.severity,
    }));

    return {
        generatedAt: new Date(nowMs).toISOString(),
        title: "Control Tower",
        subtitle: "Public beta truth, live evidence, and next actions.",
        overallScore,
        overallStatus: truthState === "failed" ? "failed" : truthState === "stale" ? "stale" : truthState === "missing" ? "missing" : "live",
        truthState,
        criticalCount,
        staleReportCount,
        missingReportCount,
        liveIssueCount: liveIssues.length,
        reports,
        sections: buildSections(reports),
        liveIssues,
        nextActions,
        debugEvidenceSource: options?.debugEvidenceSource ?? (options?.debugEvidence?.length ? "firestore" : generatedEvidence.length > 0 ? "generated" : "unavailable"),
        reportSource: "agent_state",
    };
}
