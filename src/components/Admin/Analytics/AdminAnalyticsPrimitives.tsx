"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity , Info } from "lucide-react";

import { cn } from "@/lib/utils";

type TooltipValue = {
    name?: string;
    value?: string | number;
    color?: string;
};

export interface AnalyticsTooltipProps {
    active?: boolean;
    payload?: TooltipValue[];
    label?: string;
    valueFormatter?: (value: string | number, name?: string) => string;
}

export interface SectionCardProps {
    title: string;
    subtitle?: string;
    icon: LucideIcon;
    children: ReactNode;
    className?: string;
    rightSlot?: ReactNode;
    defaultExpanded?: boolean;
    collapsible?: boolean;
}

export interface MetricCardProps {
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
    className?: string;
    valueClassName?: string;
    truthState?: "live" | "fallback" | "partial" | "failed" | "cached" | "stale" | "unknown";
    dictionaryTooltip?: string;
}

export function AnalyticsTooltip({
    active,
    payload,
    label,
    valueFormatter,
}: AnalyticsTooltipProps) {
    if (!active || !payload?.length) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-md">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                {label}
            </p>
            <div className="space-y-1.5">
                {payload.map((entry, index) => (
                    <div
                        key={`${entry.name}-${index}`}
                        className="flex items-center justify-between gap-3 text-sm"
                    >
                        <div className="flex items-center gap-2 text-gray-300">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}</span>
                        </div>
                        <span className="font-semibold text-white">
                            {valueFormatter
                                ? valueFormatter(entry.value ?? 0, entry.name)
                                : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function SectionCard({
    title,
    subtitle,
    icon: Icon,
    children,
    className,
    rightSlot,
    defaultExpanded = false,
    collapsible = true,
}: SectionCardProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    return (
        <section
            className={cn(
                "glass-panel rounded-[1.4rem] border border-white/10 p-3 md:p-4",
                className,
            )}
        >
            <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                        <div className="flex h-7.5 w-7.5 items-center justify-center rounded-[0.9rem] border border-white/10 bg-white/5 text-brand-purple">
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <h2 className="text-[15px] font-bold text-white md:text-base">
                            {title}
                        </h2>
                    </div>
                    {subtitle ? (
                        <p className="text-[11px] leading-5 text-gray-400 md:text-xs">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                <div className="flex items-center gap-2">
                    {rightSlot}
                    {collapsible ? (
                        <button
                            type="button"
                            onClick={() => setExpanded((prev) => !prev)}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300 transition-colors hover:border-brand-purple/40 hover:text-white"
                            aria-expanded={expanded}
                        >
                            {expanded ? "Collapse" : "Expand"}
                        </button>
                    ) : null}
                </div>
            </div>
            {expanded || !collapsible ? children : null}
        </section>
    );
}



export function MetricCard({
    label,
    value,
    hint,
    icon: Icon,
    className,
    valueClassName,
    truthState,
    dictionaryTooltip,
}: MetricCardProps) {
    return (
        <div
            className={cn(
                "rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5",
                className,
            )}
        >
            <div className="mb-2.5 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-brand-purple" />
                    <span>{label}</span>
                    {dictionaryTooltip && (
                        <div className="group relative ml-1 flex items-center">
                            <Info className="h-3 w-3 text-gray-400 hover:text-white transition-colors cursor-help" />
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-48 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                                <div className="rounded-lg border border-white/10 bg-black/95 p-2 text-[10px] font-medium normal-case leading-tight text-gray-300 shadow-xl backdrop-blur-md">
                                    {dictionaryTooltip}
                                </div>
                                <div className="absolute left-1/2 top-full -mt-1 -translate-x-1/2 border-4 border-transparent border-t-black/95" />
                            </div>
                        </div>
                    )}
                </div>
                {truthState ? (
                    <span 
                        title={`Data state: ${truthState}`}
                        className={cn(
                            "cursor-help rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em]",
                            truthState === "live" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-400/20" :
                            truthState === "fallback" ? "bg-amber-500/10 text-amber-400 border border-amber-400/20" :
                            truthState === "partial" ? "bg-amber-500/10 text-amber-400 border border-amber-400/20" :
                            truthState === "failed" ? "bg-red-500/10 text-red-400 border border-red-400/20" :
                            truthState === "cached" ? "bg-blue-500/10 text-blue-400 border border-blue-400/20" :
                            truthState === "stale" ? "bg-orange-500/10 text-orange-400 border border-orange-400/20" :
                            "bg-gray-500/10 text-gray-400 border border-gray-400/20"
                        )}
                    >
                        {truthState}
                    </span>
                ) : null}
            </div>
            <div
                className={cn(
                    "text-[1.7rem] font-black tracking-tight text-white",
                    valueClassName,
                )}
            >
                {value}
            </div>
            {hint ? <p className="mt-1.5 text-[11px] text-gray-400">{hint}</p> : null}
        </div>
    );
}

export const AnalyticsPrimitivesActivityIcon = Activity;
