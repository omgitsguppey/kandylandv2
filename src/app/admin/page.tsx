"use client";

import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { TopDropsPanel } from "@/components/Admin/TopDropsPanel";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";

export default function AdminDashboardPage() {
    return (
        <div className="space-y-4 md:space-y-6">
            <PageViewEvent eventName="admin_dashboard_viewed" />
            <AdminPageHeader
                eyebrow="Control Room"
                title="Admin Dashboard"
                subtitle="Quick platform health, revenue, and creator activity with a tighter mobile layout for on-the-go checks."
            />

            <Link href="/admin/analytics" className="group block w-full overflow-hidden rounded-[1.6rem] border border-white/10 glass-panel transition-colors hover:border-brand-purple/50">
                <div className="flex flex-col items-start justify-between gap-3 bg-gradient-to-r from-brand-purple/10 to-transparent p-4 md:flex-row md:items-center md:p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/20 text-brand-purple md:h-12 md:w-12 md:rounded-2xl">
                            <TrendingUp className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white transition-colors group-hover:text-brand-purple md:text-xl">Core Metrics Hub</h2>
                            <p className="text-xs text-gray-400 md:text-sm">Mobile-first analytics, funnels, device mix, and real-time telemetry.</p>
                        </div>
                    </div>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 transition-colors group-hover:bg-brand-purple group-hover:text-white md:h-10 md:w-10">
                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-white md:h-5 md:w-5" />
                    </div>
                </div>

                <AdminStatsBar />
            </Link>

            <AdminAnalyticsCharts />

            <div className="grid grid-cols-1 gap-3.5 md:gap-6 lg:grid-cols-2">
                <div className="order-1">
                    <TopDropsPanel />
                </div>
                <div className="order-3 lg:order-2">
                    <RecentTransactionsPanel />
                </div>
                <div className="lg:col-span-2">
                    <AdminActivityLogPanel />
                </div>
            </div>
        </div>
    );
}
