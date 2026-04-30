"use client";

import { type ReactNode } from "react";
import { BellRing } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { AdminDailyTaskPipelineModule } from "@/components/Admin/Analytics/AdminDailyTaskPipelineModule";
import { AnalyticsTooltip, SectionCard } from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import type { AdminTaskPipelineModel } from "@/lib/admin-task-pipeline";

const PIE_COLORS = ["#b28cff", "#22d3ee", "#fb7185", "#f59e0b", "#34d399", "#60a5fa"];

type NotificationActionItem = {
    label: string;
    value: number;
};

type NotificationReminderReason = {
    label: string;
    count: number;
};

type NotificationPieItem = {
    name: string;
    value: number;
};

export function AdminTaskAndNotificationModules(props: {
    renderSectionRangeControl: (sectionKey: string) => ReactNode;
    dailyTaskPipelineModel: AdminTaskPipelineModel;
    activeNotificationFunnelPieData: NotificationPieItem[];
    notificationActionItems: NotificationActionItem[];
    maxNotificationActionValue: number;
    hasNotificationReminderReasons: boolean;
    notificationReminderReasons: NotificationReminderReason[];
    formatDuration: (seconds: number) => string;
    formatPercent: (value: number) => string;
}) {
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

            <div className="grid gap-5">
                <SectionCard
                    title="Notification Funnel"
                    subtitle="Prompt, enablement, open, read, and reminder behavior."
                    icon={BellRing}
                    rightSlot={props.renderSectionRangeControl("notificationFunnel")}
                >
                    <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                        <div className="h-64 w-full">
                            {props.activeNotificationFunnelPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={props.activeNotificationFunnelPieData}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={52}
                                            outerRadius={84}
                                            paddingAngle={3}
                                        >
                                            {props.activeNotificationFunnelPieData.map((item, index) => (
                                                <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<AnalyticsTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                                    No notification funnel flow was tracked in this range.
                                </div>
                            )}
                        </div>

                        <div className="space-y-3">
                            {props.notificationActionItems.map((item) => (
                                <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5">
                                    <div className="mb-2 flex items-center justify-between gap-3">
                                        <p className="text-sm font-semibold text-white">{item.label}</p>
                                        <span className="text-sm font-bold text-brand-purple">{item.value.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400"
                                            style={{
                                                width: `${Math.max(6, (item.value / Math.max(1, props.maxNotificationActionValue || 1)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Reminder reasons</p>
                                <div className="flex flex-wrap gap-2">
                                    {props.hasNotificationReminderReasons ? (
                                        props.notificationReminderReasons.map((item) => (
                                            <span key={item.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white">
                                                {item.label} - {item.count}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-gray-500">No reminder traffic in this range.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </SectionCard>
            </div>
        </>
    );
}
