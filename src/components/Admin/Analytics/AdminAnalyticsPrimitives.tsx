"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Info, ListTree, Table2 } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { resolveAdminAnalyticsBadgeLabel } from "@/lib/admin-analytics-contracts";
import { coerceAdminSurfaceState, type AdminSurfaceState } from "@/lib/admin-parity";
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
    density?: "default" | "compact";
    summaryLine?: string;
}

export interface MetricCardProps {
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
    className?: string;
    valueClassName?: string;
    truthState?: AdminSurfaceState;
    dictionaryTooltip?: string;
    statusBadgeLabel?: string;
    compactPrimary?: boolean;
    badgePlacement?: "header" | "footer" | "hidden";
}

export type AnalyticsViewMode = "chart" | "table" | "cards";

export interface AnalyticsViewModeOption {
    id: AnalyticsViewMode;
    label: string;
}

export interface AnalyticsViewModeToggleProps {
    value: AnalyticsViewMode;
    onChange: (value: AnalyticsViewMode) => void;
    options?: AnalyticsViewModeOption[];
    className?: string;
}

const DEFAULT_ANALYTICS_VIEW_MODES: AnalyticsViewModeOption[] = [
    { id: "chart", label: "Chart" },
    { id: "table", label: "Table" },
    { id: "cards", label: "Cards" },
];

const ANALYTICS_VIEW_MODE_ICONS: Record<AnalyticsViewMode, LucideIcon> = {
    chart: BarChart3,
    table: Table2,
    cards: ListTree,
};

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
    density = "default",
    summaryLine,
}: SectionCardProps) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const compact = density === "compact";
    const showRightSlot = Boolean(rightSlot) && (!collapsible || expanded);

    return (
        <section
            className={cn(
                compact
                    ? "glass-panel rounded-[1.2rem] border border-white/10 p-2.5 md:rounded-[1.4rem] md:p-4"
                    : "glass-panel rounded-[1.4rem] border border-white/10 p-3 md:p-4",
                className,
            )}
        >
            <div className={cn("flex items-start justify-between gap-2", compact ? "mb-2" : "mb-2.5")}>
                <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                        <div
                            className={cn(
                                "flex items-center justify-center border border-white/10 bg-white/5 text-brand-purple",
                                compact ? "h-7 w-7 rounded-[0.8rem]" : "h-7.5 w-7.5 rounded-[0.9rem]",
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <h2 className={cn("font-bold text-white", compact ? "text-[14px] md:text-base" : "text-[15px] md:text-base")}>
                            {title}
                        </h2>
                    </div>
                    {subtitle ? (
                        <p className={cn("text-[11px] text-gray-400 md:text-xs", compact ? "leading-4" : "leading-5")}>
                            {subtitle}
                        </p>
                    ) : null}
                    {!expanded && summaryLine ? (
                        <p className="mt-1 truncate text-[11px] font-semibold text-gray-300">
                            {summaryLine}
                        </p>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {showRightSlot ? rightSlot : null}
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

export function AnalyticsViewModeToggle({
    value,
    onChange,
    options = DEFAULT_ANALYTICS_VIEW_MODES,
    className,
}: AnalyticsViewModeToggleProps) {
    return (
        <div
            className={cn("inline-flex min-h-9 rounded-full border border-white/10 bg-black/25 p-0.5", className)}
            data-admin-analytics-view-mode={value}
            aria-label="Analytics view mode"
        >
            {options.map((option) => {
                const active = option.id === value;
                const Icon = ANALYTICS_VIEW_MODE_ICONS[option.id];
                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onChange(option.id)}
                        aria-label={option.label}
                        aria-pressed={active}
                        className={cn(
                            "inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-[10px] font-bold transition-colors md:gap-1.5 md:px-2.5 md:text-[11px]",
                            active
                                ? "bg-brand-purple/20 text-white"
                                : "text-gray-400 hover:bg-white/5 hover:text-white",
                        )}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">{option.label}</span>
                    </button>
                );
            })}
        </div>
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
    statusBadgeLabel,
    compactPrimary = false,
    badgePlacement = "header",
}: MetricCardProps) {
    const resolvedTruthState = truthState ? coerceAdminSurfaceState(truthState) : undefined;
    const statusBadge = resolvedTruthState ? (
        <AdminStatusBadge
            state={resolvedTruthState}
            label={statusBadgeLabel ?? resolveAdminAnalyticsBadgeLabel(resolvedTruthState)}
            className="max-w-full min-w-0 truncate whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] leading-4 tracking-[0.08em]"
        />
    ) : null;

    return (
        <div
            className={cn(
                "overflow-hidden rounded-lg border border-white/10 bg-black/30 p-2.5 md:rounded-[1.1rem]",
                className,
            )}
            data-admin-analytics-truth-state={resolvedTruthState}
        >
            <div
                className={cn(
                    "mb-1.5 items-start gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500",
                    badgePlacement === "header" ? "grid grid-cols-[minmax(0,1fr)_auto]" : "grid grid-cols-1",
                )}
            >
                <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-brand-purple" />
                    <span className={cn("min-w-0", compactPrimary ? "whitespace-normal leading-4" : "truncate")}>{label}</span>
                    {dictionaryTooltip && (
                        <div className="group relative ml-1 flex shrink-0 items-center">
                            <Info
                                aria-label={dictionaryTooltip}
                                className="h-3 w-3 text-gray-400 hover:text-white transition-colors cursor-help"
                            />
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-48 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100 sm:block">
                                <div className="rounded-lg border border-white/10 bg-black/95 p-2 text-[10px] font-medium normal-case leading-tight text-gray-300 shadow-xl backdrop-blur-md">
                                    {dictionaryTooltip}
                                </div>
                                <div className="absolute left-1/2 top-full -mt-1 -translate-x-1/2 border-4 border-transparent border-t-black/95" />
                            </div>
                        </div>
                    )}
                </div>
                {badgePlacement === "header" && statusBadge ? (
                    <div className="min-w-0 max-w-[5.75rem] justify-self-end overflow-hidden">
                        {statusBadge}
                    </div>
                ) : null}
            </div>
            <div
                className={cn(
                    "text-[1.45rem] font-black tracking-tight text-white",
                    valueClassName,
                )}
            >
                {value}
            </div>
            {hint ? <p className="mt-1 text-[11px] text-gray-400">{hint}</p> : null}
            {badgePlacement === "footer" && statusBadge ? (
                <div className="mt-1.5 flex justify-start">
                    {statusBadge}
                </div>
            ) : null}
        </div>
    );
}

export const AnalyticsPrimitivesActivityIcon = Activity;
