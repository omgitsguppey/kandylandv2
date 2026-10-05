"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";


import { toCreatorLaneParityMismatch, type CreatorLaneParityMismatch } from "@/lib/creator-lane-debug-parity";
import { Pill, Section } from "./DebugPrimitives";
import { ADMIN_NO_SOURCE_LABEL } from "@/lib/admin-truth-state";
import { formatRecentActivity as formatRelative, formatUtcTimestamp as formatUtc } from "./DebugTime";

export function DebugCreatorLane({ data }: { data: any }) {
    const creatorLaneDebug = data?.creatorOnboardingDiagnostics?.creatorLaneDebug;
    if (!creatorLaneDebug || !["ok", "needs_review"].includes(creatorLaneDebug.parityStatus)
        || !Array.isArray(data?.creatorOnboardingDiagnostics?.issues)
        || ![
            data?.creatorOnboardingDiagnostics?.summary?.totalIssues,
            creatorLaneDebug.report?.historyGapCount ?? data?.creatorOnboardingDiagnostics?.summary?.historyCoverageIssueCount,
            creatorLaneDebug.sourceSnapshots?.onboardingCount,
            creatorLaneDebug.sourceSnapshots?.reviewQueueCount,
            creatorLaneDebug.sourceSnapshots?.userProjectionCount,
            creatorLaneDebug.sourceSnapshots?.settingsCount,
            creatorLaneDebug.sourceSnapshots?.creatorExperienceActivityCount,
        ].every((value) => typeof value === "number" && Number.isInteger(value) && value >= 0)) {
        return (
            <Section title="Creator Lane" subtitle="Creator parity source and findings." defaultOpen
                summary={<Pill label="Parity" value={ADMIN_NO_SOURCE_LABEL} truthState="unavailable" />}>
                <div className="min-w-0 space-y-2 text-sm text-muted-foreground" data-creator-lane-status="source_missing">
                    <p>Creator parity source is not loaded.</p>
                    <p>Missing source is not zero. Source counts and anomaly findings are unavailable.</p>
                </div>
            </Section>
        );
    }
    const creatorLaneIssues = data?.creatorOnboardingDiagnostics?.issues || [];
    const creatorLaneNeedsReview = (data?.creatorOnboardingDiagnostics?.summary?.totalIssues ?? 0) > 0;
    const creatorLaneReport = creatorLaneDebug?.report;
    const materializationState = creatorLaneReport?.materializationFreshnessState
        ?? creatorLaneDebug?.materializationFreshnessState
        ?? (creatorLaneDebug?.lastMaterializedAt ? "live" : "not_recorded");
    const reportStatus = creatorLaneReport?.status ?? creatorLaneDebug?.reportStatus ?? (creatorLaneNeedsReview ? "review" : "live");
    const generatedAtUtc = creatorLaneReport?.generatedAtUtc ?? "live admin snapshot";
    const optionalAuditNotes = creatorLaneReport?.optionalAuditNotes
        ?? creatorLaneDebug?.optionalAuditNotes
        ?? [];
    const normalizedMismatches: CreatorLaneParityMismatch[] = creatorLaneReport?.mismatches?.length
        ? creatorLaneReport.mismatches
        : creatorLaneIssues.map(toCreatorLaneParityMismatch);
    const historyGapCount = creatorLaneReport?.historyGapCount
        ?? data?.creatorOnboardingDiagnostics?.summary?.historyCoverageIssueCount
        ?? 0;
    const lastMaterializedAtUtc = creatorLaneReport?.lastMaterializedAtUtc
        ?? creatorLaneDebug?.lastMaterializedAtUtc
        ?? (creatorLaneDebug?.lastMaterializedAt ? new Date(creatorLaneDebug.lastMaterializedAt).toISOString() : null);

    return (
        <Section
            title="Creator Lane"
            subtitle="Technical parity across onboarding, review queue, user projection, settings, experience records, and history."
            defaultOpen={creatorLaneNeedsReview || materializationState === "not_recorded"}
            summary={<><Pill label="Parity" value={creatorLaneDebug?.parityStatus ?? "ok"} tone={creatorLaneNeedsReview ? "warn" : "good"} /><Pill label="Issues" value={data?.creatorOnboardingDiagnostics?.summary?.totalIssues ?? 0} tone={creatorLaneNeedsReview ? "warn" : "good"} /><Pill label="History gaps" value={historyGapCount} tone={historyGapCount > 0 ? "warn" : "good"} /><Pill label="Freshness" value={materializationState} tone={materializationState === "live" ? "good" : "warn"} truthState={materializationState === "live" ? "live" : "degraded"} /></>}
        >
            <div
                className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-4"
                data-creator-lane-status={reportStatus}
                data-creator-lane-generated-at-utc={generatedAtUtc}
                data-creator-lane-materialization-freshness={materializationState}
                data-creator-lane-mismatch-count={normalizedMismatches.length}
                data-creator-lane-optional-audit-note-count={optionalAuditNotes.length}
            >
                <div className="rounded-[1rem] border border-border bg-secondary p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Source snapshots</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{creatorLaneDebug?.sourceSnapshots?.onboardingCount ?? 0}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {(creatorLaneDebug?.sourceSnapshots?.reviewQueueCount ?? 0)} queue entries, {(creatorLaneDebug?.sourceSnapshots?.userProjectionCount ?? 0)} user projections.
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {(creatorLaneDebug?.sourceSnapshots?.settingsCount ?? 0)} settings, {(creatorLaneDebug?.sourceSnapshots?.creatorExperienceActivityCount ?? 0)} experience records.
                    </p>
                </div>
                <div className="rounded-[1rem] border border-border bg-secondary p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Mismatches</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{creatorLaneIssues.length}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Queue, role, agreement, ID, settings, and history parity checks.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Report generatedAtUtc: {generatedAtUtc}</p>
                </div>
                <div className="rounded-[1rem] border border-border bg-secondary p-4">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Last materialized</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{creatorLaneDebug?.lastMaterializedAt ? formatRelative(creatorLaneDebug.lastMaterializedAt) : "Not recorded"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {materializationState === "not_recorded"
                            ? "Materializer has no recorded completion timestamp. Source snapshots loaded, but queue materializer completion was not recorded."
                            : `lastMaterializedAtUtc ${lastMaterializedAtUtc ?? formatUtc(creatorLaneDebug?.lastMaterializedAt, "Not recorded")}`}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{creatorLaneDebug?.recommendedFix ?? "No action needed."}</p>
                </div>
            </div>

            {normalizedMismatches.length > 0 ? (
                <div className="mt-4 rounded-[1rem] border border-border bg-secondary">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <div>
                            <p className="font-semibold text-foreground">Top creator lane mismatches</p>
                            <p className="text-xs text-muted-foreground">Actionable creator id, surface, expected state, actual state, and next validator.</p>
                        </div>
                        <Pill label="Rows" value={Math.min(6, normalizedMismatches.length)} />
                    </div>
                    <div className="divide-y divide-white/10">
                        {normalizedMismatches.slice(0, 6).map((mismatch) => (
                            <div key={`${mismatch.creatorId}-${mismatch.surface}-${mismatch.title}`} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-foreground">{mismatch.title ?? "Creator lane mismatch"}</p>
                                        <p className="text-xs text-muted-foreground">creatorId {mismatch.creatorId} | surface {mismatch.surface}</p>
                                    </div>
                                    <Pill label="Severity" value={mismatch.severity} tone={mismatch.severity === "critical" ? "bad" : mismatch.severity === "review" ? "warn" : "neutral"} />
                                </div>
                                <p className="text-xs text-muted-foreground">Expected: {mismatch.expected}</p>
                                <p className="text-xs text-muted-foreground">Actual: {mismatch.actual}</p>
                                <p className="text-xs text-muted-foreground">Suggested action: {mismatch.suggestedAction}</p>
                                <p className="text-xs font-semibold text-foreground/80">{mismatch.validator}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {optionalAuditNotes.length > 0 ? (
                <div className="mt-4 rounded-[1rem] border border-border bg-secondary">
                    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                        <div>
                            <p className="font-semibold text-foreground">Optional audit notes</p>
                            <p className="text-xs text-muted-foreground">Low-severity context that does not block creator parity.</p>
                        </div>
                        <Pill label="Rows" value={optionalAuditNotes.length} tone="neutral" />
                    </div>
                    <div className="divide-y divide-white/10">
                        {optionalAuditNotes.slice(0, 6).map((note: any) => (
                            <div key={`${note.key}-${note.creatorId ?? note.userId}`} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-foreground">{note.message}</p>
                                        <p className="text-xs text-muted-foreground">{note.creatorDisplayName ?? "Creator"} - {note.creatorId ?? note.userId}</p>
                                    </div>
                                    <Pill label="Severity" value={note.severity ?? "info"} tone="neutral" />
                                </div>
                                <p className="text-sm text-muted-foreground">{note.detail}</p>
                                <p className="text-xs text-muted-foreground">Suggested action: {note.suggestedAction}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="mt-4 rounded-[1rem] border border-border bg-secondary">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                    <div>
                        <p className="font-semibold text-foreground">Creator lane parity issues</p>
                        <p className="text-xs text-muted-foreground">Admin Roster shows only short warnings. Full source evidence stays here.</p>
                    </div>
                    <Pill label="Rows" value={creatorLaneIssues.length} />
                </div>
                <div className="divide-y divide-white/10">
                    {creatorLaneIssues.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-muted-foreground">No creator onboarding anomalies are currently detected.</div>
                    ) : (
                        creatorLaneIssues.slice(0, 12).map((issue: any) => (
                            <div key={`${issue.key}-${issue.userId}`} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-foreground">{issue.message}</p>
                                        <p className="text-xs text-muted-foreground">{issue.creatorDisplayName} - {issue.userId}</p>
                                    </div>
                                    <Pill label="Severity" value={issue.severity} tone={issue.severity === "error" || issue.severity === "critical" ? "bad" : "warn"} />
                                </div>
                                <p className="text-sm text-muted-foreground">{issue.detail}</p>
                                <p className="text-xs text-muted-foreground">Roster warning: {issue.rosterWarning}</p>
                                <p className="text-xs text-muted-foreground">Recommended fix: {issue.recommendedFix}</p>
                                <p className="text-xs text-muted-foreground">Can self-heal: {issue.canSelfHeal ? "Yes" : "No"}</p>
                                <Disclosure className="rounded-lg border border-border bg-background/20 px-3 py-2 text-xs text-muted-foreground">
                                    <DisclosureSummary className="cursor-pointer text-foreground">Source details</DisclosureSummary>
                                    <pre className="mt-2 whitespace-pre-wrap break-words">{JSON.stringify({
                                        sourceSnapshots: issue.sourceSnapshots,
                                        mismatches: issue.mismatches,
                                        missingHistoryEvents: issue.missingHistoryEvents,
                                        missingEvidenceFields: issue.missingEvidenceFields,
                                    }, null, 2)}</pre>
                                </Disclosure>
                                <a href={issue.link} className="text-xs font-semibold text-primary hover:text-foreground">
                                    Open creator record
                                </a>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </Section>
    );
}
