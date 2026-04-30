"use client";

import { useEffect, type ReactNode } from "react";
import { BellRing } from "lucide-react";

import { AdminDailyTaskPipelineModule } from "@/components/Admin/Analytics/AdminDailyTaskPipelineModule";
import { SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import type { AdminNotificationFunnelModel } from "@/lib/admin-notification-funnel";
import type { AdminTaskPipelineModel } from "@/lib/admin-task-pipeline";

function formatMetricValue(value: number | null) {
    return value === null ? "Waiting" : value.toLocaleString();
}

export function AdminTaskAndNotificationModules(props: {
    renderSectionRangeControl: (sectionKey: string) => ReactNode;
    dailyTaskPipelineModel: AdminTaskPipelineModel;
    notificationFunnelModel: AdminNotificationFunnelModel;
    formatDuration: (seconds: number) => string;
    formatPercent: (value: number) => string;
}) {
    useEffect(() => {
        (window as typeof window & {
            __KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__?: unknown;
        }).__KANDYDROPS_ADMIN_ANALYTICS_NOTIFICATION_FUNNEL_DEBUG__ = props.notificationFunnelModel.debug;
    }, [props.notificationFunnelModel.debug]);

    const primaryMetrics = props.notificationFunnelModel.metrics.slice(0, 6);
    const secondaryMetrics = props.notificationFunnelModel.metrics.slice(6);

    return (
        <>
            <div className="grid gap-5">
                <AdminDailyTaskPipelineModule
                    renderSectionRangeControl={props.renderSectionRangeControl}
                    model={props.dailyTaskPipelineModel}
                    formatDuration={props.formatDuration}
                    formatPercent={props.formatPercent}
                />
            </div>

            <div className="grid gap-3">
                <SectionCard
                    title="Notification Funnel"
                    subtitle="Prompt, enablement, send, open, read, and clear behavior."
                    icon={BellRing}
                    rightSlot={props.renderSectionRangeControl("notificationFunnel")}
                >
                    <div className="compact-notification-funnel space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2">
                            <p className="min-w-0 text-xs leading-5 text-gray-300">
                                {props.notificationFunnelModel.visibleCopy}
                            </p>
                            <span className="max-w-[5.75rem] shrink-0 truncate rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                {props.notificationFunnelModel.truthLabel}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                            {primaryMetrics.map((metric) => (
                                <div
                                    key={metric.key}
                                    className="min-w-0 rounded-[0.9rem] border border-white/10 bg-white/[0.04] px-3 py-2"
                                    title={`${metric.label}: ${metric.helper}`}
                                    aria-label={`${metric.label}: ${metric.helper}`}
                                >
                                    <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">
                                        {metric.label}
                                    </p>
                                    <p className="mt-1 text-lg font-black leading-none text-white">
                                        {formatMetricValue(metric.value)}
                                    </p>
                                    <p className="mt-1 truncate text-[10px] font-semibold text-gray-500">
                                        {metric.truthState === "unavailable" ? "debug source" : metric.source}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-2 md:grid-cols-[0.9fr_1.1fr]">
                            <div className="grid grid-cols-2 gap-2">
                                {secondaryMetrics.map((metric) => (
                                    <div
                                        key={metric.key}
                                        className="rounded-[0.9rem] border border-white/10 bg-black/25 px-3 py-2"
                                        title={metric.helper}
                                    >
                                        <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">
                                            {metric.label}
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-white">
                                            {formatMetricValue(metric.value)}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-[0.9rem] border border-white/10 bg-black/25 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">
                                    Reminder reasons
                                </p>
                                <p className="mt-1 text-xs leading-5 text-gray-300">
                                    {props.notificationFunnelModel.reminderReasonSummary}
                                </p>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>
        </>
    );
}
