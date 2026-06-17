"use client";

import { AlertTriangle, Bot, ClipboardList, Coins, RadioTower, RefreshCw, ShieldCheck, Target } from "lucide-react";

import type { DebugOperatorCockpitReport, DebugOperatorCockpitSection } from "@/lib/debug/debug-operator-cockpit";
import { cn } from "@/lib/utils";

const ICONS = {
    score_impact_queue: Target,
    critical_runtime_debug_warnings: AlertTriangle,
    stale_artifact_refresh_queue: RefreshCw,
    admin_truth_status: ShieldCheck,
    telemetry_lane_status: RadioTower,
    cost_owner_review_lanes: Coins,
    ai_critic_requested_changes: Bot,
    recovery_playbook_cta: ClipboardList,
};

function stateTone(state: string) {
    if (state === "failed") return "border-red-400/30 bg-red-500/10 text-red-100";
    if (state === "degraded" || state === "stale") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
    if (state === "live") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
    return "border-white/10 bg-white/5 text-gray-200";
}

function stateLabel(state: string) {
    if (state === "failed") return "Needs fix";
    if (state === "degraded") return "Review";
    if (state === "stale") return "Refresh";
    if (state === "live") return "Ready";
    if (state === "unavailable") return "Unavailable";
    return "Unknown";
}

function asRecord(item: unknown): Record<string, unknown> {
    return item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
}

function itemLabel(item: unknown) {
    const record = asRecord(item);
    return String(record.title ?? record.artifact ?? record.label ?? record.message ?? record.id ?? "Unknown item");
}

function itemAction(item: unknown) {
    const record = asRecord(item);
    const commands = Array.isArray(record.commands) ? record.commands : [];
    const action = String(record.refreshCommand ?? record.nextAction ?? record.requiredFix ?? commands[0] ?? "Open the linked validator.");
    const sourceTruthState = typeof record.sourceTruthState === "string"
        ? record.sourceTruthState.replaceAll("_", " ")
        : "";
    return sourceTruthState ? `${sourceTruthState}. ${action}` : action;
}

function CockpitSectionCard({ section }: { section: DebugOperatorCockpitSection }) {
    const Icon = ICONS[section.id];
    const firstItems = section.items.slice(0, 3);

    return (
        <article
            className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] p-3"
            data-debug-operator-section={section.id}
            data-debug-truth-state={section.state}
        >
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="text-sm font-black text-white">{section.title}</h3>
                            <p className="mt-1 text-xs leading-5 text-gray-300">{section.operatorSummary}</p>
                        </div>
                        <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]", stateTone(section.state))}>
                            {stateLabel(section.state)}
                        </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                            Owner: {section.owner}
                        </span>
                    </div>
                    <p className="mt-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs font-semibold text-white">
                        Next: {section.nextAction}
                    </p>
                    {firstItems.length > 0 ? (
                        <div className="mt-3 space-y-2">
                            {firstItems.map((item, index) => (
                                <div key={`${section.id}-${index}`} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs">
                                    <p className="font-semibold text-white">{itemLabel(item)}</p>
                                    <p className="mt-1 text-gray-400">{itemAction(item)}</p>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

export function DebugOperatorCockpit({ cockpit }: { cockpit?: DebugOperatorCockpitReport | null }) {
    if (!cockpit) {
        return (
            <section className="rounded-[1.2rem] border border-white/10 bg-black/25 p-4" data-debug-operator-cockpit="missing" data-debug-truth-state="unknown">
                <h3 className="font-bold text-white">Operator Cockpit</h3>
                <p className="mt-1 text-sm text-gray-300">Operator cockpit evidence has not loaded yet.</p>
            </section>
        );
    }

    const sourceStateCounts = cockpit.defaultSections.reduce<Record<string, number>>((counts, section) => ({
        ...counts,
        [section.state]: (counts[section.state] ?? 0) + 1,
    }), {});
    const needsActionCount =
        (sourceStateCounts.failed ?? 0) +
        (sourceStateCounts.degraded ?? 0) +
        (sourceStateCounts.unknown ?? 0) +
        (sourceStateCounts.unavailable ?? 0);
    const refreshDueCount = sourceStateCounts.stale ?? 0;
    const readyCount = sourceStateCounts.live ?? 0;

    return (
        <section
            className="rounded-[1.2rem] border border-brand-purple/20 bg-brand-purple/[0.06] p-3"
            data-debug-operator-cockpit="default"
            data-debug-raw-dump-default-open={String(cockpit.rawDumpDefaultOpen)}
            data-debug-truth-state={cockpit.overallStatus === "pass" ? "degraded" : "failed"}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-purple">Operator Cockpit</p>
                    <h3 className="text-lg font-black text-white">What to fix next</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-300">Grouped by source state, owner, and next action.</p>
                </div>
                <div className="flex flex-wrap gap-2" data-debug-operator-summary-source-states="true">
                    <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                        Needs action {needsActionCount}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                        Refresh due {refreshDueCount}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[11px] text-gray-300">
                        Ready {readyCount}
                    </span>
                </div>
            </div>
            <div className="mt-3 grid gap-2">
                {cockpit.defaultSections.map((section) => (
                    <CockpitSectionCard key={section.id} section={section} />
                ))}
            </div>
        </section>
    );
}
