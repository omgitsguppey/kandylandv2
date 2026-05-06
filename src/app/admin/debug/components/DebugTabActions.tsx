"use client";

import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pill, Section, ScrollWrap } from "./DebugPrimitives";
import { DebugBugIntakePanel } from "./DebugBugIntakePanel";

/* ─── Helpers ─── */
function toneForTaskSeverity(severity?: string) {
    if (severity === "error") return "bad" as const;
    if (severity === "review") return "warn" as const;
    if (severity === "info") return "neutral" as const;
    return "neutral" as const;
}
function toneForRepairActionability(actionability?: string) {
    if (actionability === "actionable") return "warn" as const;
    if (actionability === "inspect_only" || actionability === "manual_review") return "neutral" as const;
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
    const repairGroups = data?.orchestration?.proposalGroups || data?.orchestration?.proposals || [];

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
                        subtitle="Deduped repair and inspection proposals grouped by canonical source."
                        defaultOpen={(data?.orchestration?.summary?.actionableProposals ?? 0) > 0 || (data?.orchestration?.summary?.inspectOnlyProposals ?? 0) > 0}
                        summary={<><Pill label="Actionable repairs" value={data?.orchestration?.summary?.actionableProposals ?? 0} tone={(data?.orchestration?.summary?.actionableProposals ?? 0) ? "warn" : "good"} /><Pill label="Inspect-only" value={data?.orchestration?.summary?.inspectOnlyProposals ?? 0} tone={(data?.orchestration?.summary?.inspectOnlyProposals ?? 0) ? "warn" : "good"} /><Pill label="Duplicates collapsed" value={data?.orchestration?.summary?.duplicateProposalsCollapsed ?? 0} tone={(data?.orchestration?.summary?.duplicateProposalsCollapsed ?? 0) ? "warn" : "good"} /><Pill label="Contamination risks" value={data?.orchestration?.summary?.contaminationRisks ?? 0} tone={(data?.orchestration?.summary?.contaminationRisks ?? 0) ? "bad" : "good"} /></>}
                    >
                        <ScrollWrap>
                            <div
                                className="divide-y divide-white/10"
                                data-debug-repair-visible-count={repairGroups.length}
                                data-debug-repair-actionable-count={data?.orchestration?.summary?.actionableProposals ?? 0}
                                data-debug-repair-inspect-only-count={data?.orchestration?.summary?.inspectOnlyProposals ?? 0}
                            >
                                {repairGroups.length ? repairGroups.map((proposal: any) => (
                                    <div
                                        key={proposal.groupId ?? proposal.dedupeKey ?? proposal.proposalId}
                                        className="space-y-2 px-4 py-3"
                                        data-debug-repair-proposal-id={proposal.representativeProposalId ?? proposal.proposalId}
                                        data-debug-repair-dedupe-key={proposal.dedupeKey}
                                        data-debug-repair-canonical-source-path={proposal.canonicalSourcePath ?? proposal.canonicalSourcePaths?.[0] ?? "grouped"}
                                        data-debug-repair-actionability={proposal.actionability}
                                        data-debug-repair-source-context-state={proposal.sourceContextState}
                                        data-debug-repair-duplicate-count={proposal.duplicateCount}
                                        data-debug-repair-source-collection={proposal.sourceCollection ?? proposal.sourceType}
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div>
                                                <p className="font-semibold text-white">{proposal.title ?? proposal.label}</p>
                                                <p className="text-xs text-gray-400">{proposal.canonicalSourcePath ?? `${proposal.affectedRecordCount ?? 1} affected ${proposal.sourceCollection ?? proposal.sourceType} records`}</p>
                                            </div>
                                            <Pill label="Actionability" value={proposal.actionability ?? "unknown"} tone={toneForRepairActionability(proposal.actionability)} />
                                        </div>
                                        <p className="text-sm text-gray-200">{proposal.detail ?? proposal.suggestedAction}</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Pill label="Status" value={proposal.status} tone={proposal.status === "open" ? "warn" : proposal.status === "applied" ? "good" : "neutral"} />
                                            <Pill label="Source collection" value={proposal.sourceCollection ?? proposal.sourceType ?? "unknown"} />
                                            <Pill label="Repair kind" value={proposal.repairKind ?? "unknown"} />
                                            <Pill label="Reason" value={proposal.missingContextReason ?? "missing_context"} />
                                            <Pill label="Context" value={proposal.sourceContextState ?? "unknown"} tone={proposal.sourceContextState === "complete" ? "good" : "warn"} />
                                            <Pill label="Affected records" value={proposal.affectedRecordCount ?? 1} tone={(proposal.affectedRecordCount ?? 1) > 1 ? "warn" : "neutral"} />
                                            <Pill label="Duplicates" value={`${proposal.duplicateCount ?? 0} hidden`} tone={(proposal.duplicateCount ?? 0) > 0 ? "warn" : "neutral"} />
                                            <Pill label="First seen UTC" value={proposal.firstSeenAtUtc ?? "unknown"} />
                                            <Pill label="Last seen UTC" value={proposal.lastSeenAtUtc ?? "unknown"} />
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300">
                                            <p>{proposal.suggestedAction}</p>
                                            <p className="mt-1 text-gray-500">Missing context: {(proposal.missingContextFields || []).join(", ") || proposal.missingContextReason || "unknown"}</p>
                                            {(proposal.visibleRecords || []).length > 0 ? (
                                                <details className="mt-2">
                                                    <summary className="cursor-pointer text-gray-200">Show source records</summary>
                                                    <div className="mt-2 space-y-1">
                                                        {(proposal.visibleRecords || []).slice(0, 5).map((record: any) => (
                                                            <p key={record.dedupeKey} className="break-all text-gray-500">{record.canonicalSourcePath} ({record.duplicateCount} proposal{record.duplicateCount === 1 ? "" : "s"})</p>
                                                        ))}
                                                    </div>
                                                    {(proposal.hiddenRecordCount ?? 0) > 0 ? <p className="mt-1 text-gray-500">Show more: {proposal.hiddenRecordCount} additional record{proposal.hiddenRecordCount === 1 ? "" : "s"} collapsed.</p> : null}
                                                </details>
                                            ) : null}
                                            {(proposal.affectedProposalIds || proposal.duplicateProposalIds || []).length > 0 ? (
                                                <details className="mt-2">
                                                    <summary className="cursor-pointer text-gray-200">Affected proposal ids</summary>
                                                    <p className="mt-1 break-all text-gray-500">{(proposal.affectedProposalIds || proposal.duplicateProposalIds || []).join(", ")}</p>
                                                </details>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {proposal.actionability === "actionable" ? (
                                                <Button
                                                    variant="glass"
                                                    size="sm"
                                                    disabled={repairingId === (proposal.representativeProposalId ?? proposal.proposalId) || proposal.status !== "open" || (proposal.affectedProposalIds || []).length > 1}
                                                    onClick={() => onRepairProposal(proposal.representativeProposalId ?? proposal.proposalId, "apply")}
                                                >
                                                    {repairingId === (proposal.representativeProposalId ?? proposal.proposalId) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                    Apply
                                                </Button>
                                            ) : (
                                                <Button variant="glass" size="sm" disabled>
                                                    Inspect
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={repairingId === (proposal.representativeProposalId ?? proposal.proposalId) || proposal.status !== "open" || (proposal.affectedProposalIds || []).length > 1}
                                                onClick={() => onRepairProposal(proposal.representativeProposalId ?? proposal.proposalId, "dismiss")}
                                            >
                                                Dismiss
                                            </Button>
                                        </div>
                                    </div>
                                )) : <div className="px-4 py-4 text-sm text-emerald-100">No repair proposals are open in the current orchestration sample.</div>}
                            </div>
                        </ScrollWrap>
                    </Section>

                    <DebugBugIntakePanel data={data} />

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
