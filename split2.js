const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('src/app/admin/analytics/page.tsx');
let content = fs.readFileSync(srcPath, 'utf-8');
const lines = content.split('\n');

const importEnd = lines.findIndex(l => l.startsWith('type ViewTab')) - 1;
const sharedStart = lines.findIndex(l => l.startsWith('const TABS:'));
const exportDefault = lines.findIndex(l => l.startsWith('export default function AdminAnalyticsPage'));
const returnStatementIdx = lines.slice(exportDefault).findIndex(l => l.trim().startsWith('return (')) + exportDefault;

const stateVarsContent = lines.slice(exportDefault + 1, returnStatementIdx).join('\n');

const hookContent = `
import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import type { ViewTab } from "../components/AnalyticsShared";

export function useAnalyticsState() {
` + stateVarsContent + `
    return {
        user, activeTab, setActiveTab, data, isLoading, isValidating, error, mutate, handleRefresh, refreshLabel, refreshIconName, overviewData, formatCurrency, formatNumber, formatPercent, getPercentTone, getPipelineStatusLabel
    };
}
`;

fs.writeFileSync(path.resolve('src/app/admin/analytics/hooks/useAnalyticsState.ts'), hookContent);

const sharedContent = `
import { Activity, CreditCard, DollarSign, Eye, RefreshCw, Star, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import React from 'react';

export type ViewTab = "operations" | "audience" | "commerce";

` + lines.slice(sharedStart, exportDefault).join('\n') + `

export { TABS, SectionCard, KpiCard, TrendPill, TableCell, TableHeader };
`;

fs.writeFileSync(path.resolve('src/app/admin/analytics/components/AnalyticsShared.tsx'), sharedContent);

const tabs = ['operations', 'audience', 'commerce'];
const componentNames = ['AnalyticsOperationsTab', 'AnalyticsAudienceTab', 'AnalyticsCommerceTab'];

for (let i=0; i<tabs.length; i++) {
    const tab = tabs[i];
    const comp = componentNames[i];
    const startObj = lines.findIndex(l => l.includes(`{activeTab === "${tab}" ? (`));
    let endObj = startObj;
    let brackets = 0;
    while(endObj < lines.length) {
        if(lines[endObj].includes('{')) brackets += (lines[endObj].match(/\\{/g)||[]).length;
        if(lines[endObj].includes('}')) brackets -= (lines[endObj].match(/\\}/g)||[]).length;
        if (brackets === 0 && endObj > startObj) break;
        endObj++;
    }
    
    let tabBlock = "";
    for (let j=startObj+1; j<lines.length; j++){
       if (lines[j].trim() === ') : null}' || (lines[j].trim() === ')' && lines[j+1].trim() === ': null}')) break;
       tabBlock += lines[j] + '\n';
    }

    const tabFile = `
import { Activity, CreditCard, DollarSign, Eye, Star, TrendingUp, Users } from "lucide-react";
import { SectionCard, KpiCard, TrendPill, TableCell, TableHeader } from "./AnalyticsShared";
import React from 'react';

export function ${comp}({ state }: { state: any }) {
    const { 
        data, formatCurrency, formatNumber, formatPercent, getPercentTone, getPipelineStatusLabel, overviewData
    } = state;

    return (
        ${tabBlock.trim() || "<p>Coming soon</p>"}
    );
}
`;
    fs.writeFileSync(path.resolve(`src/app/admin/analytics/components/${comp}.tsx`), tabFile);
}

const newPageContent = `
"use client";

import { Activity, RefreshCw } from "lucide-react";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { Button } from "@/components/ui/Button";
import { useAnalyticsState } from "./hooks/useAnalyticsState";
import { TABS } from "./components/AnalyticsShared";
import { AnalyticsOperationsTab } from "./components/AnalyticsOperationsTab";
import { AnalyticsAudienceTab } from "./components/AnalyticsAudienceTab";
import { AnalyticsCommerceTab } from "./components/AnalyticsCommerceTab";
import { cn } from "@/lib/utils";
import React from 'react';

export default function AdminAnalyticsPage() {
    const state = useAnalyticsState();
    const { activeTab, setActiveTab, handleRefresh, refreshLabel, refreshIconName, data, isLoading, isValidating, error } = state;

    const renderRefreshIcon = () => {
        if (refreshIconName === "Activity") return <Activity className="mr-2 h-4 w-4" />;
        return <RefreshCw className={cn("mr-2 h-4 w-4", isValidating && "animate-spin")} />;
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <PageViewEvent eventName="admin_analytics_viewed" />
            <AdminPageHeader
                eyebrow="Admin Analytics"
                title="Platform Data"
                compact
                actions={(
                    <div className="flex items-center gap-3">
                        <Button variant="glass" onClick={handleRefresh} disabled={isValidating || isLoading}>
                            {renderRefreshIcon()}
                            {refreshLabel}
                        </Button>
                    </div>
                )}
            />

            <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                                active ? "border-brand-purple/40 bg-brand-purple/20 text-white" : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {error ? (
                <div className="rounded-[1.25rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">
                    Failed to load analytics data.
                </div>
            ) : null}
            {!data && isLoading ? (
                <div className="rounded-[1.25rem] border border-white/10 bg-black/25 p-6 text-sm text-gray-300">
                    <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                    Loading analytics payload...
                </div>
            ) : null}

            {data ? (
                <div className="space-y-4 md:space-y-6">
                    {activeTab === "operations" && <AnalyticsOperationsTab state={state} />}
                    {activeTab === "audience" && <AnalyticsAudienceTab state={state} />}
                    {activeTab === "commerce" && <AnalyticsCommerceTab state={state} />}
                </div>
            ) : null}
        </div>
    );
}
`;

fs.writeFileSync(path.resolve('src/app/admin/analytics/page.tsx'), newPageContent);
console.log("Successfully decomposed admin/analytics/page.tsx!");
