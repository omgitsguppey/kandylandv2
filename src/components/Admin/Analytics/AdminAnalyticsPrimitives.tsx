"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Info, ListTree, Table2 } from "lucide-react";

import { AdminStatusBadge } from "@/components/Admin/AdminStatusBadge";
import { Card } from "@/components/creative-tim/ui/card";
import { Button, buttonVariants } from "@/components/ui/Button";
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
        <Card className="min-w-0 gap-0 bg-popover p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
                {label}
            </p>
            <div className="space-y-1.5">
                {payload.map((entry, index) => (
                    <div
                        key={`${entry.name}-${index}`}
                        className="flex items-center justify-between gap-3 text-sm"
                    >
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span>{entry.name}</span>
                        </div>
                        <span className="font-semibold text-foreground">
                            {valueFormatter
                                ? valueFormatter(entry.value ?? 0, entry.name)
                                : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        </Card>
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
    const contentId = useId();
    const compact = density === "compact";
    const showRightSlot = Boolean(rightSlot) && (!collapsible || expanded);

    return (
        <section className={cn("@container min-w-0 max-w-full wrap-anywhere space-y-4 py-3", className)}>
            <header className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 max-w-full flex-[1_1_12rem]">
                    <h2 className="flex min-w-0 items-start gap-2 text-base font-semibold"><Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><span className="min-w-0 wrap-anywhere">{title}</span></h2>
                    {subtitle ? (
                        <p className="mt-1 min-w-0 wrap-anywhere text-sm text-muted-foreground">{subtitle}</p>
                    ) : null}
                    {!expanded && summaryLine ? (
                        <p className="mt-1 wrap-anywhere text-xs text-muted-foreground">
                            {summaryLine}
                        </p>
                    ) : null}
                </div>
                <div className="flex min-w-0 max-w-full flex-[0_1_auto] flex-wrap items-center justify-end gap-2">
                    {showRightSlot ? rightSlot : null}
                    {collapsible ? (
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => setExpanded((prev) => !prev)}
                            aria-label={`${expanded ? "Hide" : "Show"} ${title} details`}
                            aria-expanded={expanded}
                            aria-controls={contentId}
                            className="max-w-full wrap-anywhere"
                        >
                            {expanded ? "Hide" : "Details"}
                        </Button>
                    ) : null}
                </div>
            </header>
            {expanded || !collapsible ? <div id={contentId} className={cn("min-w-0", compact && "space-y-3")}>{children}</div> : null}
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
            className={cn("inline-flex max-w-full flex-wrap gap-1", className)}
            data-admin-analytics-view-mode={value}
            aria-label="Analytics view mode"
        >
            {options.map((option) => {
                const active = option.id === value;
                const Icon = ANALYTICS_VIEW_MODE_ICONS[option.id];
                return (
                    <Button
                        variant={active ? "default" : "ghost"}
                        key={option.id}
                        type="button"
                        onClick={() => onChange(option.id)}
                        aria-label={option.label}
                        aria-pressed={active}
                        className="gap-1.5 px-3"
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        <span>{option.label}</span>
                    </Button>
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
            className="max-w-full overflow-visible whitespace-normal wrap-anywhere text-xs"
        />
    ) : null;

    return (
        <Card
            className={cn("min-w-0 gap-0 p-3 shadow-none", className)}
            data-admin-analytics-truth-state={resolvedTruthState}
            data-admin-analytics-metric-density={compactPrimary ? "compact" : "default"}
        >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <p className="flex min-w-0 items-start gap-1.5 text-sm font-medium text-muted-foreground">
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 wrap-anywhere">{label}</span>
                </p>
                {badgePlacement === "header" && statusBadge ? statusBadge : null}
            </div>
            <div className={cn("mt-2 text-2xl font-semibold tabular-nums text-card-foreground", valueClassName, "min-w-0 max-w-full whitespace-normal overflow-visible wrap-anywhere")}>
                {value}
            </div>
            {hint ? <p className="mt-1 wrap-anywhere text-sm text-muted-foreground">{hint}</p> : null}
            {badgePlacement === "footer" && statusBadge ? (
                <div className="mt-2 flex min-w-0 max-w-full flex-wrap">{statusBadge}</div>
            ) : null}
            {dictionaryTooltip ? (
                <details className="mt-2 min-w-0">
                    <summary className={buttonVariants({ variant: "ghost", size: "sm", className: "min-w-11 max-w-full justify-start px-2" })} aria-label={"About " + label}>
                        <Info className="size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 wrap-anywhere">About this metric</span>
                    </summary>
                    <p className="mt-2 wrap-anywhere text-sm text-muted-foreground">{dictionaryTooltip}</p>
                </details>
            ) : null}
        </Card>
    );
}

export const AnalyticsPrimitivesActivityIcon = Activity;
