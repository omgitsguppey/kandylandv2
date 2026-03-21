"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Receipt, ShieldAlert, TrendingUp } from "lucide-react";
import { AdminStatsBar } from "@/components/Admin/AdminStatsBar";
import { TopDropsPanel } from "@/components/Admin/TopDropsPanel";
import { RecentTransactionsPanel } from "@/components/Admin/RecentTransactionsPanel";
import { AdminActivityLogPanel } from "@/components/Admin/AdminActivityLogPanel";
import { AdminAnalyticsCharts } from "@/components/Admin/AdminAnalyticsCharts";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { cn } from "@/lib/utils";

type MobileOverviewSection = "snapshot" | "commerce" | "admin";

const MOBILE_OVERVIEW_SECTIONS: Array<{
    id: MobileOverviewSection;
    label: string;
    title: string;
    description: string;
    icon: typeof TrendingUp;
}> = [
    {
        id: "snapshot",
        label: "Snapshot",
        title: "Read the daily pulse first",
        description: "This is the fastest way to see revenue and unwrap trend direction before you dive into any lists.",
        icon: TrendingUp,
    },
    {
        id: "commerce",
        label: "Commerce",
        title: "Then check what actually happened",
        description: "Top drops and live transactions explain where the money and unwraps are really coming from.",
        icon: Receipt,
    },
    {
        id: "admin",
        label: "Admin",
        title: "Finish with internal actions",
        description: "The activity log is the final check when you need to verify manual admin changes or adjustments.",
        icon: ShieldAlert,
    },
];

export default function AdminDashboardPage() {
    const isCompactViewport = useCompactViewport();
    const [mobileSection, setMobileSection] = useState<MobileOverviewSection>("snapshot");
    const activeMobileSection = useMemo(
        () => MOBILE_OVERVIEW_SECTIONS.find((section) => section.id === mobileSection) ?? MOBILE_OVERVIEW_SECTIONS[0],
        [mobileSection],
    );

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

            {isCompactViewport ? (
                <div className="space-y-4">
                    <section className="rounded-[1.8rem] border border-white/10 bg-black/35 p-4 backdrop-blur-xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Overview Flow</p>
                        <h2 className="mt-2 text-lg font-bold text-white">One mobile step at a time</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            The overview now moves in a simpler order so you can read the important story first, then drill into the lists only when needed.
                        </p>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {MOBILE_OVERVIEW_SECTIONS.map((section) => {
                                const Icon = section.icon;
                                const active = section.id === mobileSection;
                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => setMobileSection(section.id)}
                                        className={cn(
                                            "rounded-2xl border px-3 py-3 text-left transition-colors",
                                            active ? "border-brand-purple/40 bg-brand-purple/15 text-white" : "border-white/10 bg-white/5 text-gray-300",
                                        )}
                                    >
                                        <Icon className={cn("mb-2 h-4 w-4", active ? "text-brand-purple" : "text-gray-500")} />
                                        <div className="text-[11px] font-bold leading-tight">{section.label}</div>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
                            <p className="text-sm font-semibold text-white">{activeMobileSection.title}</p>
                            <p className="mt-2 text-sm leading-6 text-gray-300">{activeMobileSection.description}</p>
                        </div>
                    </section>

                    {mobileSection === "snapshot" ? (
                        <AdminAnalyticsCharts />
                    ) : null}

                    {mobileSection === "commerce" ? (
                        <div className="space-y-4">
                            <TopDropsPanel />
                            <RecentTransactionsPanel />
                        </div>
                    ) : null}

                    {mobileSection === "admin" ? (
                        <AdminActivityLogPanel />
                    ) : null}
                </div>
            ) : (
                <>
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
                </>
            )}
        </div>
    );
}
