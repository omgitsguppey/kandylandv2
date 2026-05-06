"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Pill, Section } from "./DebugPrimitives";
import { AdminAiAssistantRealtimePanel } from "./AdminAiAssistantRealtimePanel";
import type { PillTone } from "./DebugPrimitives";
import type { AdminAiDebugSummary } from "@/lib/ai-debug-assistant";

/* ─── Helpers ─── */
function formatTimestamp(timestamp?: number) {
    if (!timestamp) return "Not recorded";
    return new Date(timestamp).toLocaleString();
}
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

    return (
        <div className="space-y-4">
            <Section
                title="AI debug assistant"
                subtitle="Explicit live guidance over current debug evidence. Page load reads saved status only and does not trigger paid AI calls."
                defaultOpen
                summary={<><Pill label="Status" value={aiStatusLabel} tone={aiStatusTone} /><Pill label="Response" value={responseStateLabel} tone={aiDebugData?.response_state === "live" ? "good" : aiDebugData?.response_state === "saved" ? "warn" : "warn"} /><Pill label="Enabled" value={aiDebugData?.enabled === false ? "No" : "Yes"} tone={aiDebugData?.enabled === false ? "warn" : "good"} /><Pill label="Configured model" value={aiDebugData?.configured_model || aiAssistantModel || "gemini-3.1-flash-lite-preview"} /><Pill label="Runtime" value={aiDebugData?.runtime_ready ? "Ready" : "Unavailable"} tone={aiDebugData?.runtime_ready ? "good" : "bad"} /><Pill label="Live call" value={aiDebugData?.live_call_eligible ? "Eligible" : "Blocked"} tone={aiDebugData?.live_call_eligible ? "good" : "warn"} /><Pill label="Cost guard" value={aiDebugData?.cost_guard_state || "unknown"} tone={aiDebugData?.cost_guard_state === "admin_gated" ? "good" : "warn"} /><Pill label="Update source" value={aiAssistantRealtime.feedStatus === "realtime" ? "Live" : aiAssistantRealtime.feedStatus === "failed" ? "Delayed" : "Saved"} tone={aiAssistantRealtime.feedStatus === "realtime" ? "good" : aiAssistantRealtime.feedStatus === "failed" ? "bad" : "warn"} /><Pill label="Last run" value={aiDebugData?.generated_at ? formatRelative(Date.parse(aiDebugData.generated_at)) : "Not recorded"} /><Pill label="Latency" value={aiDebugData ? `${aiDebugData.latency_ms}ms` : "--"} tone={aiDebugData && aiDebugData.latency_ms > 5000 ? "warn" : "neutral"} /></>}
            >
                {aiDebugError ? (
                    <div className="rounded-[1rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                        AI debug summaries could not be loaded right now. Canonical diagnostics remain authoritative.
                    </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-1">
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Runtime config</p>
                                <p className="mt-2 text-sm text-gray-300">Admin settings control whether summaries run. Technical runtime details are listed below.</p>
                            </div>
                            <Pill label="Resolved" value={aiDebugData?.model || aiAssistantModel || "gemini-3.1-flash-lite-preview"} tone={aiStatusTone} />
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Configured model</p>
                                <p className="mt-2 text-sm font-semibold text-white">{aiDebugData?.configured_model || aiAssistantModel || "gemini-3.1-flash-lite-preview"}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Runtime status</p>
                                <p className="mt-2 text-sm font-semibold text-white">{aiDebugData?.runtime_ready ? "Ready" : "Unavailable"}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Project</p>
                                <p className="mt-2 break-all text-sm font-semibold text-white">{aiDebugData?.runtime_project || "Missing"}</p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Location</p>
                                <p className="mt-2 text-sm font-semibold text-white">{aiDebugData?.runtime_location || "Missing"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Assistant controls</p>
                        <div className="mt-4 space-y-4">
                            <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                                <div>
                                    <p className="text-sm font-semibold text-white">Enabled</p>
                                    <p className="mt-1 text-xs text-gray-400">Turns assistant generation on or off without hiding saved guidance.</p>
                                </div>
                                <input type="checkbox" checked={aiAssistantEnabled} onChange={(event) => onAiAssistantEnabledChange(event.target.checked)} className="h-5 w-5 rounded border-white/20 bg-black/40 text-brand-purple" />
                            </label>
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-white">Configured model</span>
                                <input type="text" value={aiAssistantModel} onChange={(event) => onAiAssistantModelChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none focus:border-brand-purple/40" spellCheck={false} />
                                <span className="mt-2 block text-xs text-gray-400">Default stays on the flash-lite alias unless you deliberately override it.</span>
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
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">What it found</p>
                                <p className="mt-3 text-sm leading-6 text-gray-200">{aiDebugData.summary}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <Pill label="Source" value={aiDebugData.response_state === "live" ? "Live model" : aiDebugData.response_state === "saved" ? "Saved guidance" : "Deterministic fallback"} tone={aiDebugData.response_state === "live" ? "good" : "warn"} />
                                    <Pill label="Provider" value={aiDebugData.provider} />
                                    <Pill label="Role" value={aiDebugData.model_role} />
                                    <Pill label="Prompt" value={aiDebugData.prompt_version} />
                                    <Pill label="Generated" value={formatTimestamp(Date.parse(aiDebugData.generated_at))} />
                                    <Pill label="Runtime" value={aiDebugData.runtime_ready ? "Ready" : "Unavailable"} tone={aiDebugData.runtime_ready ? "good" : "bad"} />
                                </div>
                                {aiDebugData.availability_note ? (<p className="mt-3 text-xs leading-6 text-gray-400">{aiDebugData.availability_note}</p>) : null}
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">What to do next</p>
                                <ul className="mt-3 space-y-2 text-sm text-gray-200">
                                    {(aiDebugData.suggested_next_checks || []).map((entry) => <li key={entry}>- {entry}</li>)}
                                </ul>
                            </div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Issue summary</p>
                                <p className="mt-3 text-sm text-gray-200">{aiDebugData.issue_summary}</p>
                                <p className="mt-3 text-xs text-gray-400">Likely cause: {aiDebugData.likely_cause}</p>
                                <p className="mt-2 text-xs text-gray-400">Confidence: {aiDebugData.confidence}</p>
                            </div>
                            <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Apply eligibility</p>
                                <p className="mt-3 text-sm text-gray-200">{aiDebugData.apply_eligibility.state}</p>
                                <p className="mt-2 text-xs text-gray-400">{aiDebugData.apply_eligibility.reason}</p>
                                <p className="mt-2 text-xs text-gray-400">Rollback: {aiDebugData.rollback_note}</p>
                            </div>
                        </div>
                        <details className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4">
                            <summary className="cursor-pointer text-sm font-semibold text-white">Technical detail</summary>
                            <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Likely root causes</p>
                                    <ul className="mt-3 space-y-2 text-sm text-gray-200">{(aiDebugData.likely_root_causes || []).map((entry) => <li key={entry}>- {entry}</li>)}</ul>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Affected systems</p>
                                    <div className="mt-3 flex flex-wrap gap-2">{(aiDebugData.affected_systems || []).map((entry) => <Pill key={entry} label="System" value={entry} tone="warn" />)}</div>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Confidence notes</p>
                                    <ul className="mt-3 space-y-2 text-sm text-gray-200">{(aiDebugData.confidence_notes || []).map((entry) => <li key={entry}>- {entry}</li>)}</ul>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Source evidence</p>
                                    <ul className="mt-3 space-y-2 text-sm text-gray-200">{(aiDebugData.source_evidence || []).map((entry) => <li key={entry}>- {entry}</li>)}</ul>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Safe fix plan</p>
                                    <ul className="mt-3 space-y-2 text-sm text-gray-200">{(aiDebugData.safe_fix_plan || []).map((entry) => <li key={entry}>- {entry}</li>)}</ul>
                                </div>
                                <div className="rounded-[1rem] border border-white/10 bg-black/20 p-4">
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-gray-400">Files and validators</p>
                                    <ul className="mt-3 space-y-2 text-sm text-gray-200">
                                        {(aiDebugData.files_to_inspect || []).map((entry) => <li key={entry}>- {entry}</li>)}
                                        {(aiDebugData.validators_to_run || []).map((entry) => <li key={entry}>- {entry}</li>)}
                                    </ul>
                                </div>
                            </div>
                        </details>
                    </div>
                ) : !aiDebugError ? (
                    <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-300">
                        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                        Preparing bounded AI debug summary...
                    </div>
                ) : null}
            </Section>
        </div>
    );
}
