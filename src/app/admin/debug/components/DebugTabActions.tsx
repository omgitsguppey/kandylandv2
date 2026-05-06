"use client";

import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pill, Section, ScrollWrap } from "./DebugPrimitives";

/* ─── Helpers ─── */
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
function toneForTaskSeverity(severity?: string) {
    if (severity === "error") return "bad" as const;
    if (severity === "review") return "warn" as const;
    if (severity === "info") return "neutral" as const;
    return "neutral" as const;
}

/* ─── Props ─── */
export interface DebugTabActionsProps {
    data: any;
    repairingId: string | null;
    processing: boolean;
    simAmount: string;
    onSimAmountChange: (value: string) => void;
    onRepairProposal: (proposalId: string, action: "apply" | "dismiss") => void;
    onManualBalanceAdjustment: () => void;
}

/* ─── Component ─── */
export function DebugTabActions({
    data,
    repairingId,
    processing,
    simAmount,
    onSimAmountChange,
    onRepairProposal,
    onManualBalanceAdjustment,
}: DebugTabActionsProps) {
    return (
        <div className="space-y-4">
                    <Section
                        title="Task Issues Attribution"
                        subtitle="Detailed provenance for users flagged with task issues in the telemetry sample."
                        defaultOpen={(data?.assignmentIssues || []).length > 0}
                        summary={<><Pill label="Impacted Users" value={(data?.assignmentIssues || []).length} tone={(data?.assignmentIssues || []).length > 0 ? "warn" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.assignmentIssues || []).map((issue: any) => {
                                    const attribution = issue.attribution;
                                    return (
                                    <div key={issue.uid} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{issue.username}</p>
                                                <p className="text-xs text-gray-400">{issue.uid}</p>
                                            </div>
                                            <Pill label="Issues" value={issue.issueCount} tone={toneForTaskSeverity(attribution?.severity ?? "review")} />
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {(issue.issues || []).map((desc: string, i: number) => (
                                                <Pill key={i} label="Diagnostic" value={desc} tone={toneForTaskSeverity(attribution?.severity ?? "review")} />
                                            ))}
                                            {attribution ? (
                                                <>
                                                    <Pill label="Expected source" value={attribution.expectedSource} />
                                                    <Pill label="Found source" value={attribution.foundSource} />
                                                    <Pill label="Issue type" value={attribution.issueType} tone={toneForTaskSeverity(attribution.severity)} />
                                                    <Pill label="Freshness" value={attribution.sourceFreshness} tone={attribution.sourceFreshness === "live" ? "good" : "warn"} />
                                                    <Pill label="Eligible" value={attribution.eligibleForTasks ? "yes" : "no"} tone={attribution.eligibleForTasks ? "good" : "neutral"} />
                                                </>
                                            ) : null}
                                        </div>
                                        {attribution ? (
                                            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                                                <p>{attribution.recommendedAction}</p>
                                                <p className="mt-1 text-gray-500">expected {attribution.expectedTaskCount} | found {attribution.foundTaskCount} | canSelfHeal {attribution.canSelfHeal ? "yes" : "no"}</p>
                                            </div>
                                        ) : null}
                                    </div>
                                    );
                                })}
                                {(data?.assignmentIssues || []).length === 0 ? (
                                    <div className="px-4 py-4 text-sm text-gray-300">No task assignment issues detected in the current sample.</div>
                                ) : null}
                            </div>
                        </ScrollWrap>
                    </Section>
                    <Section
                        title="Repairs available now"
                        subtitle="Open repair proposals that can be applied or dismissed."
                        defaultOpen={(data?.stats?.orchestrationActionableRepairs ?? 0) > 0}
                        summary={<><Pill label="Actionable" value={data?.stats?.orchestrationActionableRepairs ?? 0} tone={(data?.stats?.orchestrationActionableRepairs ?? 0) ? "warn" : "good"} /><Pill label="Contamination risks" value={data?.orchestration?.summary?.contaminationRisks ?? 0} tone={(data?.orchestration?.summary?.contaminationRisks ?? 0) ? "bad" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div className="divide-y divide-white/10">
                                {(data?.orchestration?.proposals || []).length ? (data?.orchestration?.proposals || []).map((proposal: any) => (
                                    <div key={proposal.id} className="space-y-2 px-4 py-3">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{proposal.label}</p>
                                                <p className="text-xs text-gray-400">{proposal.sourceDocumentPath}</p>
                                            </div>
                                            <Pill label="Status" value={proposal.status} tone={proposal.status === "open" ? "warn" : proposal.status === "resolved" ? "good" : "neutral"} />
                                        </div>
                                        <p className="text-sm text-gray-200">{proposal.detail}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="glass"
                                                size="sm"
                                                disabled={repairingId === proposal.id || proposal.actionType !== "rebuild_projection" || proposal.status !== "open"}
                                                onClick={() => onRepairProposal(proposal.id, "apply")}
                                            >
                                                {repairingId === proposal.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                Apply
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={repairingId === proposal.id || proposal.status !== "open"}
                                                onClick={() => onRepairProposal(proposal.id, "dismiss")}
                                            >
                                                Dismiss
                                            </Button>
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No repair proposals are open in the current orchestration sample.</div>}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <Section
                        title="Bug reports to triage"
                        subtitle="Recent bug intake with severity, path, and diagnostic context."
                        defaultOpen={(data?.bugReports || []).length > 0}
                        summary={<><Pill label="Loaded" value={(data?.bugReports || []).length} /><Pill label="Last 7d" value={data?.stats?.bugReportsLast7d ?? 0} tone={(data?.stats?.bugReportsLast7d ?? 0) > 0 ? "warn" : "good"} /></>}
                    >
                        <div className="space-y-3">
                            {(data?.bugReports || []).length ? (data?.bugReports || []).map((report: any) => (
                                <div key={report.id} className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-white">{report.summary || "Untitled bug report"}</p>
                                            <p className="mt-1 text-xs text-gray-400">{report.currentPath || "Unknown path"} | {report.componentName || "Unknown component"}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Status" value={report.status} />
                                            <Pill label="Severity" value={report.severity} tone={report.severity === "high" || report.severity === "critical" ? "bad" : report.severity === "medium" ? "warn" : "neutral"} />
                                        </div>
                                    </div>
                                    <p className="mt-3 line-clamp-3 text-sm text-gray-300">{report.message}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        <Pill label="Breadcrumbs" value={report.breadcrumbsCount} />
                                        <Pill label="Diagnostics" value={report.diagnosticsCount} />
                                        <Pill label="Rollouts" value={report.rolloutCount} />
                                        <Pill label="When" value={formatRelative(report.timestamp)} />
                                    </div>
                                </div>
                            )) : <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">No bug reports are loaded in the current sample.</div>}
                        </div>
                    </Section>

                    <Section
                        title="Manual utilities (not live health)"
                        subtitle="Operator-triggered controls that stay separate from live diagnostics."
                        defaultOpen={false}
                        summary={<><Pill label="Balance adjust" value={`${simAmount} drops`} /></>}
                    >
                        <div className="rounded-[1rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                            Manual utilities can help unblock investigation, but they are not monitoring signals and they should not be read as system status.
                        </div>
                        <div className="mt-4 rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Add Gum Drops to the current admin user</p>
                            <div className="mt-3 flex gap-2">
                                <input
                                    type="number"
                                    className="min-h-11 flex-1 rounded-[1rem] border border-white/10 bg-black/40 px-3 text-white"
                                    value={simAmount}
                                    onChange={(event) => onSimAmountChange(event.target.value)}
                                />
                                <Button variant="brand" onClick={onManualBalanceAdjustment} disabled={processing}>
                                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </Section>
                </div>
    );
}
