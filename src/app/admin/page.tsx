"use client";

import Link from "next/link";
import { Activity, Package, TrendingUp, Users } from "lucide-react";

import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";
import { AdminDashboardModule } from "@/components/Admin/AdminDashboardModule";
import { AdminDropsAtGlancePanel } from "@/components/Admin/AdminDropsAtGlancePanel";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
import { TopDropsPanel } from "@/components/Admin/TopDropsPanel";

export default function AdminDashboardPage() {
    return (
        <div className="space-y-3 md:space-y-4">
            <PageViewEvent eventName="admin_dashboard_viewed" />
            <AdminPageHeader
                eyebrow="Control Room"
                title="Admin Dashboard"
                subtitle="Expandable modules for live platform health, drop operations, revenue trends, and moderation without hopping between tabs."
            />

            <div className="space-y-3 md:space-y-4">
                <AdminDashboardModule
                    title="Platform pulse"
                    description="Fresh overview stats and a straight path into the deeper analytics workspace."
                    defaultOpen={true}
                    actions={(
                        <Link
                            href="/admin/analytics"
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                        >
                            <TrendingUp className="h-4 w-4" />
                            Analytics
                        </Link>
                    )}
                >
                    <div className="space-y-3">
                        <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-gradient-to-r from-brand-purple/10 to-transparent p-3 md:p-4">
                            <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple md:h-12 md:w-12 md:rounded-2xl">
                                        <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white md:text-xl">Core Metrics Hub</h2>
                                        <p className="text-xs text-gray-400 md:text-sm">Real-time analytics, funnels, device mix, and parity tracking without stale cached payloads.</p>
                                    </div>
                                </div>
                                <Link
                                    href="/admin/analytics"
                                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                                >
                                    Open analytics
                                </Link>
                            </div>
                        </div>

                        <AdminStatsBar />
                    </div>
                </AdminDashboardModule>

                <AdminDashboardModule
                    title="Drops at a glance"
                    description="Quickly create, edit, queue, and sanity-check every drop from the home dashboard."
                    defaultOpen={true}
                    actions={(
                        <>
                            <Link
                                href="/admin/drops"
                                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                            >
                                <Package className="h-4 w-4" />
                                Drops
                            </Link>
                            <Link
                                href="/admin/queue"
                                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                            >
                                <Activity className="h-4 w-4" />
                                Queue
                            </Link>
                        </>
                    )}
                >
                    <AdminDropsAtGlancePanel />
                </AdminDashboardModule>

                <AdminDashboardModule
                    title="Revenue trends"
                    description="Thirty-day revenue and unwrap movement from the same overview feed that powers the rest of the dashboard."
                    defaultOpen={true}
                >
                    <AdminAnalyticsCharts />
                </AdminDashboardModule>

                <AdminDashboardModule
                    title="Top performing drops"
                    description="A quick leaderboard for the drops drawing the most unlock demand."
                    defaultOpen={false}
                >
                    <TopDropsPanel />
                </AdminDashboardModule>

                <AdminDashboardModule
                    title="Recent transactions"
                    description="Live commerce activity for the most recent purchases and balance changes."
                    defaultOpen={false}
                >
                    <RecentTransactionsPanel />
                </AdminDashboardModule>

                <AdminDashboardModule
                    title="Admin activity"
                    description="Moderation and operational activity from the broader admin workspace."
                    defaultOpen={false}
                    actions={(
                        <Link
                            href="/admin/users"
                            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:text-brand-pink"
                        >
                            <Users className="h-4 w-4" />
                            Users
                        </Link>
                    )}
                >
                    <AdminActivityLogPanel />
                </AdminDashboardModule>
            </div>
        </div>
    );
}
