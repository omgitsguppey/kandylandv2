"use client";

import { DisclosureSummary } from "@/components/ui/disclosure";
import { Disclosure } from "@/components/ui/disclosure";
import { Input } from "@/components/ui/input";


import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pill, Section } from "./DebugPrimitives";
import { AdminAiAssistantRealtimePanel } from "./AdminAiAssistantRealtimePanel";
import { AdminDebugWorkstream } from "@/components/creative-tim/kandydrops/admin-debug/AdminDebugWorkstream";
import type { PillTone } from "./DebugPrimitives";
import { formatRecentActivity as formatRelative } from "./DebugTime";
import type { AdminAiDebugSummary } from "@/lib/ai-debug-assistant";

/* ─── Helpers ─── */
function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}
function formatOptionalTimestamp(value?: string) {
    if (!value) return "Not recorded";
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : value;
}

/* ─── Props ─── */
export interface DebugTabAiProps {
    aiDebugData: AdminAiDebugSummary | undefined;
    aiDebugError: any;
    aiStatusLabel: string;
    aiStatusTone: PillTone;
    aiAssistantEnabled: boolean;
    aiAssistantModel: string;
    aiAssistantRealtime: any;
    savingAiAssistantSettings: boolean;
    runningAiAssistantLiveCall: boolean;
    onAiAssistantEnabledChange: (enabled: boolean) => void;
    onAiAssistantModelChange: (model: string) => void;
    onSaveAiAssistantSettings: () => void;
    onRunAiAssistantLiveCall: () => void;
}

/* ─── Component ─── */
export function DebugTabAi({
    aiDebugData,
    aiDebugError,
    aiStatusLabel,
    aiStatusTone,
    aiAssistantEnabled,
    aiAssistantModel,
    aiAssistantRealtime,
    savingAiAssistantSettings,
    runningAiAssistantLiveCall,
    onAiAssistantEnabledChange,
    onAiAssistantModelChange,
    onSaveAiAssistantSettings,
    onRunAiAssistantLiveCall,
}: DebugTabAiProps) {
    const responseStateLabel = aiDebugData?.response_state === "live"
        ? "Live"
        : aiDebugData?.response_state === "saved"
            ? "Saved"
            : aiDebugData?.response_state === "fallback"
                ? "Fallback"
                : "Unknown";
    const displayedSourceLabel = aiDebugData?.displayed_summary_source === "live_model"
        ? "Live model"
        : aiDebugData?.displayed_summary_source === "saved_guidance"
            ? "Saved guidance"
            : "Deterministic fallback";
    const summaryFreshnessLabel = aiDebugData?.displayed_summary_freshness === "fresh"
        ? "Fresh"
        : aiDebugData?.displayed_summary_freshness === "stale"
            ? "Refresh due"
            : "Unknown";
    const liveStatusLabel = aiDebugData?.live_summary_status
        ? aiDebugData.live_summary_status.replace(/_/g, " ")
        : "unknown";
    const lastLiveRunLabel = aiDebugData?.last_model_call_at ? formatRelative(Date.parse(aiDebugData.last_model_call_at)) : "Not available";
    const workbench = aiDebugData?.workbench;

    return (
        <AdminDebugWorkstream
            eyebrow="AI workstream"
            title="Guidance with an explicit cost boundary"
            subtitle="Saved status loads here by default. Live guidance remains an explicit, permission-gated action."
        >
            <Section
                title="AI debug assistant"
                subtitle="Explicit live guidance over current debug evidence. Page load reads saved status only and does not trigger paid AI calls."
                defaultOpen
                summary={<><Pill label="Status" value={aiStatusLabel} tone={aiStatusTone} /><Pill label="Displayed source" value={displayedSourceLabel} tone={aiDebugData?.response_state === "live" ? "good" : "warn"} /><Pill label="Enabled" value={aiDebugData?.enabled === false ? "No" : "Yes"} tone={aiDebugData?.enabled === false ? "warn" : "good"} /><Pill label="Current model" value={aiDebugData?.resolved_model || aiAssistantModel || "gemini-3.1-flash-lite-preview"} /><Pill label="Runtime" value={aiDebugData?.runtime_ready ? "Ready" : "Unavailable"} tone={aiDebugData?.runtime_ready ? "good" : "bad"} /><Pill label="Live summary" value={liveStatusLabel} tone={aiDebugData?.live_summary_status === "live" ? "good" : aiDebugData?.live_summary_status === "failed" ? "bad" : "warn"} /><Pill label="Summary freshness" value={summaryFreshnessLabel} tone={aiDebugData?.displayed_summary_freshness === "fresh" ? "good" : aiDebugData?.displayed_summary_freshness === "stale" ? "warn" : "neutral"} /><Pill label="Cost guard" value={aiDebugData?.cost_guard_state || "unknown"} tone={aiDebugData?.cost_guard_state === "admin_gated" ? "good" : "warn"} /><Pill label="Last live run" value={lastLiveRunLabel} /><Pill label="Fallback latency" value={aiDebugData?.last_fallback_latency_ms != null ? `${aiDebugData.last_fallback_latency_ms}ms` : "Not recorded"} tone={aiDebugData?.last_fallback_latency_ms != null ? "warn" : "neutral"} /></>}
            >
                {aiDebugError ? (
                    <div className="rounded-[1rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                        AI debug summaries could not be loaded right now. Canonical diagnostics remain authoritative.
                    </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="rounded-[1rem] border border-border bg-secondary p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Runtime config</p>
                                <p className="mt-2 text-sm text-muted-foreground">Admin settings control whether summaries run. Technical runtime details are listed below.</p>
                            </div>
                            <Pill label="Resolved" value={aiDebugData?.model || aiAssistantModel || "gemini-3.1-flash-lite-preview"} tone={aiStatusTone} />
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-border bg-background/20 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Configured model</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{aiDebugData?.configured_model || aiAssistantModel || "gemini-3.1-flash-lite-preview"}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/20 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Resolved model</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{aiDebugData?.resolved_model || aiDebugData?.model || aiAssistantModel || "gemini-3.1-flash-lite-preview"}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/20 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Runtime status</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{aiDebugData?.runtime_ready ? "Ready" : "Unavailable"}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/20 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Project</p>
                                <p className="mt-2 break-all text-sm font-semibold text-foreground">{aiDebugData?.runtime_project || "Missing"}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/20 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Location</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{aiDebugData?.runtime_location || "Missing"}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/20 p-3">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Runtime checked</p>
                                <p className="mt-2 text-sm font-semibold text-foreground">{formatOptionalTimestamp(aiDebugData?.runtime_checked_at)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1rem] border border-border bg-secondary p-4">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assistant controls</p>
                        <div className="mt-4 space-y-4">
                            <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/20 px-3 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">Enabled</p>
                                    <p className="mt-1 text-xs text-muted-foreground">Turns assistant generation on or off without hiding saved guidance.</p>
                                </div>
                                <input type="checkbox" checked={aiAssistantEnabled} onChange={(event) => onAiAssistantEnabledChange(event.target.checked)} className="h-5 w-5 rounded border-border bg-background/40 text-primary" />
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-foreground">Configured model</span>
                                <Input type="text" value={aiAssistantModel} onChange={(event) => onAiAssistantModelChange(event.target.value)} className="w-full rounded-xl border border-border bg-background/20 px-3 py-3 text-sm text-foreground outline-none focus:border-primary/40" spellCheck={false} />
                                <span className="mt-2 block text-xs text-muted-foreground">Default stays on the flash-lite alias unless you deliberately override it.</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                <Button variant="glass" onClick={onSaveAiAssistantSettings} disabled={savingAiAssistantSettings}>
                                    {savingAiAssistantSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Save assistant settings
                                </Button>
                                <Button variant="outline" onClick={onRunAiAssistantLiveCall} disabled={runningAiAssistantLiveCall || aiDebugData?.live_call_eligible === false}>
                                    {runningAiAssistantLiveCall ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    Generate live guidance
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <AdminAiAssistantRealtimePanel state={aiAssistantRealtime} />

                {aiDebugData ? (
                    <div className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-1">
                            <div className="rounded-[1rem] border border-border bg-secondary p-4">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Workbench summary</p>
                                <p className="mt-3 text-sm leading-6 text-foreground">{aiDebugData.summary}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Pill label="Fallback" value={workbench?.fallbackStatus?.replace(/_/g, " ") || "unknown"} tone={workbench?.fallbackStatus === "deterministic_fallback_summary" ? "warn" : "neutral"} />
                                    <Pill label="Planner" value={workbench?.livePlannerStatus?.replace(/_/g, " ") || "unknown"} tone={workbench?.livePlannerStatus === "ai_plan_ready" ? "good" : "neutral"} />
                                    <Pill label="Route preflight" value={workbench?.routePreflightStatus?.replace(/_/g, " ") || "unknown"} tone={workbench?.routePreflightStatus === "no_sample" ? "warn" : "neutral"} />
                                    <Pill label="Provider" value={aiDebugData.provider} />
                                    <Pill label="Role" value={aiDebugData.model_role} />
                                    <Pill label="Prompt" value={aiDebugData.prompt_version} />
                                    <Pill label="Displayed summary" value={formatOptionalTimestamp(aiDebugData.displayed_summary_generated_at)} />
                                    <Pill label="Debug evidence" value={formatOptionalTimestamp(aiDebugData.debug_evidence_generated_at)} />
                                </div>
                                {aiDebugData.saved_summary_model && aiDebugData.saved_summary_model !== aiDebugData.resolved_model ? (
                                    <p className="mt-3 text-xs leading-6 text-warning">Saved summary model: {aiDebugData.saved_summary_model}. Current configured model: {aiDebugData.resolved_model}.</p>
                                ) : null}
                                {aiDebugData.displayed_summary_freshness_reason ? (
                                    <p className="mt-3 text-xs leading-6 text-muted-foreground">{aiDebugData.displayed_summary_freshness_reason}</p>
                                ) : null}
                                {aiDebugData.availability_note ? (<p className="mt-3 text-xs leading-6 text-muted-foreground">{aiDebugData.availability_note}</p>) : null}
                            </div>
                            <div className="rounded-[1rem] border border-border bg-secondary p-4">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Work item groups</p>
                                <div className="mt-3 grid gap-2">
                                    {(workbench?.workItemGroups || []).slice(0, 5).map((group) => (
                                        <div key={group.groupId} className="rounded-xl border border-border bg-background/20 p-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Pill label="Items" value={String(group.count)} />
                                                <Pill label="Priority" value={String(group.priorityScore)} tone={group.priorityScore >= 70 ? "warn" : "neutral"} />
                                                <Pill label="Mode" value={group.selectedMode.replace(/_/g, " ")} tone={group.selectedMode === "source_patch_candidate" ? "warn" : "neutral"} />
                                                <Pill label="Eligibility" value={group.applyEligibility.replace(/_/g, " ")} tone={group.applyEligibility === "critic_required" || group.applyEligibility === "human_approval_required" ? "warn" : "neutral"} />
                                            </div>
                                            <p className="mt-2 text-sm font-semibold text-foreground">{group.title}</p>
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{group.nextAction}</p>
                                        </div>
                                    ))}
                                    {(workbench?.workItemGroups || []).length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No structured repair work items loaded.</p>
                                    ) : null}
                                </div>
                            </div>
                            <div className="rounded-[1rem] border border-border bg-secondary p-4">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Proposal queue</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Pill label="Inspect only" value={String(workbench?.counts.inspectOnly ?? 0)} />
                                    <Pill label="Patch candidates" value={String(workbench?.counts.sourcePatchCandidates ?? 0)} tone={(workbench?.counts.sourcePatchCandidates ?? 0) > 0 ? "warn" : "neutral"} />
                                    <Pill label="Critic required" value={String(workbench?.counts.criticRequired ?? 0)} tone={(workbench?.counts.criticRequired ?? 0) > 0 ? "warn" : "neutral"} />
                                    <Pill label="Human approval" value={String(workbench?.counts.humanApprovalRequired ?? 0)} tone={(workbench?.counts.humanApprovalRequired ?? 0) > 0 ? "warn" : "neutral"} />
                                    <Pill label="Auto apply" value={String(workbench?.counts.autoApplyAllowed ?? 0)} tone={(workbench?.counts.autoApplyAllowed ?? 0) > 0 ? "bad" : "good"} />
                                </div>
                                <ul className="mt-3 space-y-2 text-sm text-foreground">
                                    {(workbench?.proposalQueue || []).slice(0, 4).map((proposal) => (
                                        <li key={proposal.proposalId}>- {proposal.mode.replace(/_/g, " ")}: {proposal.status.replace(/_/g, " ")}; validators {proposal.validators.length}</li>
                                    ))}
                                    {(workbench?.proposalQueue || []).length === 0 ? <li>- No apply-ready proposals. Inspect-only work remains reviewable.</li> : null}
                                </ul>
                            </div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-[1rem] border border-border bg-secondary p-4">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Issue summary</p>
                                <p className="mt-3 text-sm text-foreground">{aiDebugData.issue_summary}</p>
                                <p className="mt-3 text-xs text-muted-foreground">Likely cause: {aiDebugData.likely_cause}</p>
                                <p className="mt-2 text-xs text-muted-foreground">Confidence: {aiDebugData.confidence}</p>
                            </div>
                            <div className="rounded-[1rem] border border-border bg-secondary p-4">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Apply eligibility</p>
                                <p className="mt-3 text-sm text-foreground">{aiDebugData.apply_eligibility.state}</p>
                                <p className="mt-2 text-xs text-muted-foreground">{aiDebugData.apply_eligibility.reason}</p>
                                <p className="mt-2 text-xs text-muted-foreground">Rollback: {aiDebugData.rollback_note}</p>
                                <p className="mt-2 text-xs text-muted-foreground">Model latency: {aiDebugData.last_model_latency_ms != null ? `${aiDebugData.last_model_latency_ms}ms` : "Not recorded"}</p>
                                <p className="mt-2 text-xs text-muted-foreground">Fallback generated: {formatOptionalTimestamp(aiDebugData.last_fallback_generated_at)}</p>
                            </div>
                        </div>
                        <Disclosure className="rounded-[1rem] border border-border bg-secondary p-4">
                            <DisclosureSummary className="cursor-pointer text-sm font-semibold text-foreground">Technical detail</DisclosureSummary>
                            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                <div className="rounded-[1rem] border border-border bg-background/20 p-4">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Likely root causes</p>
                                    <ul className="mt-3 space-y-2 text-sm text-foreground">{(aiDebugData.likely_root_causes || []).map((entry) => <li key={entry}>- {entry}</li>)}</ul>
                                </div>
                                <div className="rounded-[1rem] border border-border bg-background/20 p-4">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Affected systems</p>
                                    <div className="mt-3 flex flex-wrap gap-2">{(aiDebugData.affected_systems || []).map((entry) => <Pill key={entry} label="System" value={entry} tone="warn" />)}</div>
                                </div>
                                <div className="rounded-[1rem] border border-border bg-background/20 p-4">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Confidence notes</p>
                                    <ul className="mt-3 space-y-2 text-sm text-foreground">{(aiDebugData.confidence_notes || []).map((entry) => <li key={entry}>- {entry}</li>)}</ul>
                                </div>
                                <div className="rounded-[1rem] border border-border bg-background/20 p-4">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Source evidence</p>
                                    <ul className="mt-3 space-y-2 text-sm text-foreground">{(aiDebugData.source_evidence || []).map((entry) => <li key={entry}>- {entry}</li>)}</ul>
                                </div>
                                <div className="rounded-[1rem] border border-border bg-background/20 p-4">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Safe fix plan</p>
                                    <ul className="mt-3 space-y-2 text-sm text-foreground">{(aiDebugData.safe_fix_plan || []).map((entry) => <li key={entry}>- {entry}</li>)}</ul>
                                </div>
                                <div className="rounded-[1rem] border border-border bg-background/20 p-4">
                                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Files and validators</p>
                                    <ul className="mt-3 space-y-2 text-sm text-foreground">
                                        {(aiDebugData.files_to_inspect || []).map((entry) => <li key={entry}>- {entry}</li>)}
                                        {(aiDebugData.validators_to_run || []).map((entry) => <li key={entry}>- {entry}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </Disclosure>
                    </div>
                ) : !aiDebugError ? (
                    <div className="rounded-[1rem] border border-border bg-secondary p-4 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Preparing bounded AI debug summary...
                    </div>
                ) : null}
            </Section>
        </AdminDebugWorkstream>
    );
}
