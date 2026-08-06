"use client";

import type { ReactNode } from "react";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";

import { Badge } from "@/components/creative-tim/ui/badge";
import { Card } from "@/components/creative-tim/ui/card";
import { Separator } from "@/components/creative-tim/ui/separator";

type RecentActivityFeedFrameProps = {
    children: ReactNode;
    expanded: boolean;
    onToggleExpanded: () => void;
};

export function RecentActivityFeedFrame({
    children,
    expanded,
    onToggleExpanded,
}: RecentActivityFeedFrameProps) {
    return (
        <Card
            className="glass-panel mt-4 overflow-hidden !gap-0 rounded-3xl border border-white/10 !p-0 shadow-xl lg:mt-8"
            data-mobile-residual-cleanup="score-impact"
        >
            <div className="flex items-start justify-between gap-3 px-3.5 pb-3.5 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Badge
                            aria-hidden="true"
                            variant="outline"
                            className="h-8 w-8 shrink-0 justify-center rounded-full border-brand-purple/30 bg-brand-purple/10 p-0 text-brand-purple"
                        >
                            <Activity className="h-4 w-4" aria-hidden="true" />
                        </Badge>
                        <p className="text-xs font-semibold uppercase tracking-widest text-brand-purple">Activity</p>
                    </div>
                    <h3 className="mt-2 text-xl font-bold tracking-tight text-white">Recent Activity</h3>
                    <p className="mt-1 text-sm leading-5 text-gray-400">
                        {expanded ? "Search and browse your full activity without leaving the dashboard." : "Latest update from your account."}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onToggleExpanded}
                    className="inline-flex min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple/40"
                    aria-expanded={expanded}
                    aria-label={expanded ? "Collapse recent activity" : "Expand recent activity"}
                >
                    {expanded ? "Collapse" : "View all"}
                    {expanded ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
                </button>
            </div>
            <Separator className="mx-3.5 bg-white/10 sm:mx-5" />
            <div className="px-3.5 pb-3.5 pt-3.5 sm:px-5 sm:pb-5 sm:pt-4">
                {children}
            </div>
        </Card>
    );
}
