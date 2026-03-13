"use client";

import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { TopDropsPanel } from "@/components/Admin/TopDropsPanel";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            <AdminPageHeader
                eyebrow="Control Room"
                title="Admin Dashboard"
                subtitle="Quick platform health, revenue, and creator activity with a tighter mobile layout for on-the-go checks."
            />

            <Link href="/admin/analytics" className="block w-full rounded-[2rem] overflow-hidden glass-panel border border-white/10 group hover:border-brand-purple/50 transition-colors">
                <div className="bg-gradient-to-r from-brand-purple/10 to-transparent p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-purple/20 text-brand-purple flex items-center justify-center shrink-0">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white group-hover:text-brand-purple transition-colors">Core Metrics Hub</h2>
                            <p className="text-sm text-gray-400">Mobile-first analytics, funnels, device mix, and real-time telemetry.</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-brand-purple group-hover:text-white transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    </div>
                </div>

                <AdminStatsBar />
            </Link>

            <AdminAnalyticsCharts />

            <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2">
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
