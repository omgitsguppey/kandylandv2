"use client";

import { useEffect, type ReactNode } from "react";
import { BellRing } from "lucide-react";

import { AdminDailyTaskPipelineModule } from "@/components/Admin/Analytics/AdminDailyTaskPipelineModule";
import { SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import type { AdminNotificationFunnelModel, NotificationFunnelStep } from "@/lib/admin-notification-funnel";
import type { AdminTaskPipelineModel } from "@/lib/admin-task-pipeline";

const NO_PERMISSION_SAMPLE_LABEL = "No permission sample";
const DEBUG_NOTIFICATION_RECORDS_LABEL = "Debug notification records";
const TASK_REMINDER_TELEMETRY_LABEL = "task reminder telemetry";

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
    const generatedAtLabel = props.notificationFunnelModel.generatedAtUtc
        ? new Date(props.notificationFunnelModel.generatedAtUtc).toLocaleString()
        : "Unavailable";

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
                    <div
                        className="compact-notification-funnel space-y-3"
                        data-notification-funnel-state={props.notificationFunnelModel.state}
                        data-notification-denominator-mode={props.notificationFunnelModel.denominatorMode}
                        data-notification-missing-source-count={props.notificationFunnelModel.missingSourceCount}
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2">
                            <p className="min-w-0 text-xs leading-5 text-gray-300">
                                {props.notificationFunnelModel.visibleCopy}
                            </p>
                            <span className="max-w-[5.75rem] shrink-0 truncate rounded-full border border-white/10 bg-white/[0.08] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                                {props.notificationFunnelModel.truthLabel}
                            </span>
                        </div>

                        <div className="grid gap-2 rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300 md:grid-cols-4">
                            <span><span className="font-semibold text-white">State:</span> {props.notificationFunnelModel.state}</span>
                            <span><span className="font-semibold text-white">Denominator:</span> {props.notificationFunnelModel.denominatorMode}</span>
                            <span><span className="font-semibold text-white">Range:</span> {props.notificationFunnelModel.range}</span>
                            <span><span className="font-semibold text-white">Last updated:</span> {generatedAtLabel}</span>
                        </div>

                        {props.notificationFunnelModel.warnings.length > 0 ? (
                            <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2 text-[11px] leading-5 text-gray-300">
                                {props.notificationFunnelModel.warnings.map((warning) => (
                                    <p key={warning}>{warning}</p>
                                ))}
                            </div>
                        ) : null}

                        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                            {primaryMetrics.map((metric) => (
                                <NotificationStepCard key={metric.key} step={metric} />
                            ))}
                        </div>

                        <div className="grid gap-2 md:grid-cols-[0.9fr_1.1fr]">
                            <div className="grid grid-cols-2 gap-2">
                                {secondaryMetrics.map((metric) => (
                                    <NotificationStepCard key={metric.key} step={metric} compact />
                                ))}
                            </div>

                            <div className="rounded-[0.9rem] border border-white/10 bg-black/25 px-3 py-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">
                                    Reminder reasons
                                </p>
                                <p className="mt-1 text-xs leading-5 text-gray-300">
                                    {props.notificationFunnelModel.reminderReasonSummary}
                                </p>
                                <p className="mt-1 text-[10px] leading-5 text-gray-500">
                                    Source {props.notificationFunnelModel.reminderReasonsSourceLabel || TASK_REMINDER_TELEMETRY_LABEL} · freshness {props.notificationFunnelModel.reminderReasonsFreshness}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-gray-400">
                                    {props.notificationFunnelModel.reminderReasons.map((reason) => (
                                        <span
                                            key={`${reason.reason}-${reason.count}`}
                                            data-notification-reminder-reason-count={reason.count}
                                            className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5"
                                        >
                                            {reason.reason} {reason.count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>
        </>
    );
}

function NotificationStepCard(props: { step: NotificationFunnelStep; compact?: boolean }) {
    return (
        <div
            key={props.step.key}
            className="min-w-0 rounded-[0.9rem] border border-white/10 bg-white/[0.04] px-3 py-2"
            title={`${props.step.label}: ${props.step.explanation}`}
            aria-label={`${props.step.label}: ${props.step.explanation}`}
            data-notification-step={props.step.key}
            data-notification-step-source={props.step.sourceTruth}
            data-notification-step-status={props.step.status}
            data-notification-step-freshness={props.step.freshnessState}
        >
            <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">
                {props.step.label}
            </p>
            <p className={props.compact ? "mt-1 text-sm font-bold text-white" : "mt-1 text-lg font-black leading-none text-white"}>
                {props.step.displayValue || (props.step.key === "enabled" ? NO_PERMISSION_SAMPLE_LABEL : "Unavailable")}
            </p>
            <p className="mt-1 truncate text-[10px] font-semibold text-gray-500">
                {props.step.sourceLabel || (props.step.key === "sent" ? DEBUG_NOTIFICATION_RECORDS_LABEL : props.step.sourceLabel)}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-gray-400">
                {props.step.status} · {props.step.freshnessState}
                {props.step.denominator ? ` · ${props.step.denominator}` : ""}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-gray-500">
                {props.step.explanation}
            </p>
        </div>
    );
}
