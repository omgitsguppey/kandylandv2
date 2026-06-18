"use client";

import { toCreatorLaneParityMismatch, type CreatorLaneParityMismatch } from "@/lib/creator-lane-debug-parity";
import { Pill, Section } from "./DebugPrimitives";

function formatRelative(timestamp?: number) {
    if (!timestamp) return "No recent activity";
    const deltaMs = Math.max(0, Date.now() - timestamp);
    const minutes = Math.floor(deltaMs / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

function formatUtc(timestamp?: number | null) {
    return timestamp ? new Date(timestamp).toISOString() : "Not recorded";
}

export function DebugCreatorLane({ data }: { data: any }) {
    const creatorLaneDebug = data?.creatorOnboardingDiagnostics?.creatorLaneDebug;
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
                className="grid gap-4 lg:grid-cols-3"
                data-creator-lane-status={reportStatus}
                data-creator-lane-generated-at-utc={generatedAtUtc}
                data-creator-lane-materialization-freshness={materializationState}
                data-creator-lane-mismatch-count={normalizedMismatches.length}
                data-creator-lane-optional-audit-note-count={optionalAuditNotes.length}
            >
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Source snapshots</p>
                    <p className="mt-2 text-xl font-black text-white">{creatorLaneDebug?.sourceSnapshots?.onboardingCount ?? 0}</p>
                    <p className="mt-1 text-sm text-gray-400">
                        {(creatorLaneDebug?.sourceSnapshots?.reviewQueueCount ?? 0)} queue entries, {(creatorLaneDebug?.sourceSnapshots?.userProjectionCount ?? 0)} user projections.
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                        {(creatorLaneDebug?.sourceSnapshots?.settingsCount ?? 0)} settings, {(creatorLaneDebug?.sourceSnapshots?.creatorExperienceActivityCount ?? 0)} experience records.
                    </p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Mismatches</p>
                    <p className="mt-2 text-xl font-black text-white">{creatorLaneIssues.length}</p>
                    <p className="mt-1 text-sm text-gray-400">Queue, role, agreement, ID, settings, and history parity checks.</p>
                    <p className="mt-1 text-xs text-gray-500">Report generatedAtUtc: {generatedAtUtc}</p>
                </div>
                <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Last materialized</p>
                    <p className="mt-2 text-xl font-black text-white">{creatorLaneDebug?.lastMaterializedAt ? formatRelative(creatorLaneDebug.lastMaterializedAt) : "Not recorded"}</p>
                    <p className="mt-1 text-sm text-gray-400">
                        {materializationState === "not_recorded"
                            ? "Materializer has no recorded completion timestamp. Source snapshots loaded, but queue materializer completion was not recorded."
                            : `lastMaterializedAtUtc ${lastMaterializedAtUtc ?? formatUtc(creatorLaneDebug?.lastMaterializedAt)}`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{creatorLaneDebug?.recommendedFix ?? "No action needed."}</p>
                </div>
            </div>

            {normalizedMismatches.length > 0 ? (
                <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div>
                            <p className="font-semibold text-white">Top creator lane mismatches</p>
                            <p className="text-xs text-gray-400">Actionable creator id, surface, expected state, actual state, and next validator.</p>
                        </div>
                        <Pill label="Rows" value={Math.min(6, normalizedMismatches.length)} />
                    </div>
                    <div className="divide-y divide-white/10">
                        {normalizedMismatches.slice(0, 6).map((mismatch) => (
                            <div key={`${mismatch.creatorId}-${mismatch.surface}-${mismatch.title}`} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white">{mismatch.title ?? "Creator lane mismatch"}</p>
                                        <p className="text-xs text-gray-400">creatorId {mismatch.creatorId} | surface {mismatch.surface}</p>
                                    </div>
                                    <Pill label="Severity" value={mismatch.severity} tone={mismatch.severity === "critical" ? "bad" : mismatch.severity === "review" ? "warn" : "neutral"} />
                                </div>
                                <p className="text-xs text-gray-300">Expected: {mismatch.expected}</p>
                                <p className="text-xs text-gray-300">Actual: {mismatch.actual}</p>
                                <p className="text-xs text-gray-400">Suggested action: {mismatch.suggestedAction}</p>
                                <p className="text-xs font-semibold text-white/80">{mismatch.validator}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            {optionalAuditNotes.length > 0 ? (
                <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                    <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                        <div>
                            <p className="font-semibold text-white">Optional audit notes</p>
                            <p className="text-xs text-gray-400">Low-severity context that does not block creator parity.</p>
                        </div>
                        <Pill label="Rows" value={optionalAuditNotes.length} tone="neutral" />
                    </div>
                    <div className="divide-y divide-white/10">
                        {optionalAuditNotes.slice(0, 6).map((note: any) => (
                            <div key={`${note.key}-${note.creatorId ?? note.userId}`} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white">{note.message}</p>
                                        <p className="text-xs text-gray-400">{note.creatorDisplayName ?? "Creator"} - {note.creatorId ?? note.userId}</p>
                                    </div>
                                    <Pill label="Severity" value={note.severity ?? "info"} tone="neutral" />
                                </div>
                                <p className="text-sm text-gray-300">{note.detail}</p>
                                <p className="text-xs text-gray-400">Suggested action: {note.suggestedAction}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.03]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                    <div>
                        <p className="font-semibold text-white">Creator lane parity issues</p>
                        <p className="text-xs text-gray-400">Admin Roster shows only short warnings. Full source evidence stays here.</p>
                    </div>
                    <Pill label="Rows" value={creatorLaneIssues.length} />
                </div>
                <div className="divide-y divide-white/10">
                    {creatorLaneIssues.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-gray-300">No creator onboarding anomalies are currently detected.</div>
                    ) : (
                        creatorLaneIssues.slice(0, 12).map((issue: any) => (
                            <div key={`${issue.key}-${issue.userId}`} className="space-y-2 px-4 py-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold text-white">{issue.message}</p>
                                        <p className="text-xs text-gray-400">{issue.creatorDisplayName} - {issue.userId}</p>
                                    </div>
                                    <Pill label="Severity" value={issue.severity} tone={issue.severity === "error" || issue.severity === "critical" ? "bad" : "warn"} />
                                </div>
                                <p className="text-sm text-gray-300">{issue.detail}</p>
                                <p className="text-xs text-gray-400">Roster warning: {issue.rosterWarning}</p>
                                <p className="text-xs text-gray-400">Recommended fix: {issue.recommendedFix}</p>
                                <p className="text-xs text-gray-400">Can self-heal: {issue.canSelfHeal ? "Yes" : "No"}</p>
                                <details className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                                    <summary className="cursor-pointer text-gray-200">Source notes</summary>
                                    <pre className="mt-2 whitespace-pre-wrap break-words">{JSON.stringify({
                                        sourceSnapshots: issue.sourceSnapshots,
                                        mismatches: issue.mismatches,
                                        missingHistoryEvents: issue.missingHistoryEvents,
                                        missingEvidenceFields: issue.missingEvidenceFields,
                                    }, null, 2)}</pre>
                                </details>
                                <a href={issue.link} className="text-xs font-semibold text-brand-purple hover:text-white">
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
