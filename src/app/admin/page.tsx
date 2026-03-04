"use client";

import Link from "next/link";
import { ChevronRight, TrendingUp } from "lucide-react";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { TopDropsPanel } from "@/components/Admin/TopDropsPanel";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";

export default function AdminDashboardPage() {
    return (
        <div>
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-gray-400">Quick overview and recent platform activity.</p>
                </div>
            </header>

            <Link href="/admin/analytics" className="block w-full rounded-3xl overflow-hidden glass-panel border border-white/10 group mb-12 hover:border-brand-pink/50 transition-colors">
                <div className="bg-gradient-to-r from-brand-pink/10 to-transparent p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-pink/20 text-brand-pink flex items-center justify-center shrink-0">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white group-hover:text-brand-pink transition-colors">Core Metrics Hub</h2>
                            <p className="text-sm text-gray-400">Tap to dive deep into real-time users and historical retention charts</p>
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-brand-pink group-hover:text-white transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    </div>
                </div>

                <AdminStatsBar />
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <TopDropsPanel />
                <RecentTransactionsPanel />
            </div>
        </div>
    );
}
