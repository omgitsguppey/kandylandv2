"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CreatorSettingsScopePicker, type CreatorSettingsRunwayScope } from "./CreatorSettingsWorkstreamRail";

type CreatorSettingsControlDeckProps = {
    activeScope: CreatorSettingsRunwayScope;
    children?: ReactNode;
    completionLabel?: string;
    isReadOnly: boolean;
    notice?: ReactNode;
    onSelectScope: (id: string) => void;
    saveError?: string | null;
    scopes: CreatorSettingsRunwayScope[];
    sourceFreshness?: string;
    sourceState?: string;
    sourceTruth?: string;
};

function valueOrFallback(value: string | undefined, fallback: string) {
    return value ? value.replaceAll("_", " ") : fallback;
}

export function CreatorSettingsControlDeck({
    activeScope,
    children,
    completionLabel,
    isReadOnly,
    notice,
    onSelectScope,
    saveError,
    scopes,
    sourceFreshness,
    sourceState,
    sourceTruth,
}: CreatorSettingsControlDeckProps) {
    return (
        <section
            className="space-y-5"
            data-creator-settings-control-plane="true"
            data-creator-settings-user-facing-safe="true"
            data-mobile-density="compact"
            data-mobile-sprawl-guard="true"
        >
            <header className="relative overflow-hidden border-y border-white/8 bg-[radial-gradient(circle_at_100%_0%,rgba(149,73,255,0.28),transparent_42%),linear-gradient(135deg,rgba(37,18,61,0.92),rgba(9,5,16,0.98))] px-4 py-5 sm:px-6 sm:py-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-200">Creator operating runway</p>
                        <h1 className="mt-1 text-2xl font-black text-white">One scope. One clear outcome.</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">Choose the setting or operation you need now. Everything else stays out of the way until you need it.</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-bold text-gray-200">
                        {isReadOnly ? "Read-only" : completionLabel ?? "Settings"}
                    </span>
                </div>

                <dl
                    className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs"
                    data-creator-settings-source-state={sourceState ?? "unknown"}
                    data-creator-settings-source-truth={sourceTruth ?? "unknown"}
                    data-creator-settings-source-freshness={sourceFreshness ?? "unknown"}
                >
                    <div className="flex items-baseline gap-1.5">
                        <dt className="font-black uppercase tracking-[0.14em] text-gray-500">Settings</dt>
                        <dd className="font-bold capitalize text-gray-200">{valueOrFallback(sourceState, "checking")}</dd>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <dt className="font-black uppercase tracking-[0.14em] text-gray-500">Source</dt>
                        <dd className="font-bold capitalize text-gray-200">{valueOrFallback(sourceTruth, "not available")}</dd>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <dt className="font-black uppercase tracking-[0.14em] text-gray-500">Freshness</dt>
                        <dd className="font-bold capitalize text-gray-200">{valueOrFallback(sourceFreshness, "not available")}</dd>
                    </div>
                </dl>
            </header>

            <div className="px-1 sm:px-0">
                <CreatorSettingsScopePicker activeId={activeScope.id} items={scopes} onSelect={onSelectScope} />
            </div>

            <div className="space-y-4">
                {notice ? <div>{notice}</div> : null}
                {saveError ? (
                    <div className="rounded-[1.35rem] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100">
                        {saveError}
                    </div>
                ) : null}

                <section
                    className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0816]/92 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-xl sm:p-6"
                    data-creator-active-scope={activeScope.id}
                    data-creator-active-manager={activeScope.kind === "operation" ? activeScope.id : "none"}
                    data-creator-section-key={activeScope.id}
                    data-creator-section-state={activeScope.state}
                    data-creator-stats-source-truth={activeScope.sourceTruth ?? "not_applicable"}
                    data-creator-stats-source-freshness={activeScope.sourceFreshness ?? "not_applicable"}
                    data-creator-stats-sample-count={activeScope.sampleCount ?? 0}
                    data-creator-fan-pass-management-state={activeScope.fanPassManagementState}
                    data-creator-bookings-management-state={activeScope.bookingsManagementState}
                    data-creator-chat-route-connected={activeScope.chatRouteConnected === undefined ? undefined : String(activeScope.chatRouteConnected)}
                    data-creator-earnings-source={activeScope.creatorEarningsSource}
                    data-creator-earnings-attribution={activeScope.creatorEarningsAttribution}
                    data-mobile-drilldown="true"
                    data-desktop-flow-collapsed="true"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-200">{activeScope.kind === "setting" ? "Set this now" : "Operate this now"}</p>
                            <h2 className="mt-1 text-xl font-black text-white">{activeScope.title}</h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">{activeScope.summary}</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold capitalize text-zinc-200">{activeScope.state.replaceAll("_", " ")}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-zinc-500">{activeScope.detail}</p>
                    {activeScope.href ? (
                        <Link href={activeScope.href} className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-brand-purple/25 bg-brand-purple/10 px-4 text-sm font-bold text-purple-100 transition hover:bg-brand-purple/20">
                            {activeScope.actionLabel ?? "Open"}
                        </Link>
                    ) : null}
                    <div className="mt-5" data-creator-active-control-deck={activeScope.id}>
                        {children ?? (
                            <p className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm leading-6 text-zinc-400">This focus has no inline manager. Use the connected destination above.</p>
                        )}
                    </div>
                </section>
            </div>
        </section>
    );
}
