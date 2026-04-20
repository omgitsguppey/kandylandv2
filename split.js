const fs = require('fs');
const path = require('path');

const srcPath = path.resolve('src/app/admin/debug/page.tsx');
let content = fs.readFileSync(srcPath, 'utf-8');
const lines = content.split('\n');

const importEnd = lines.findIndex(l => l.startsWith('type DebugTabId')) - 1;
const sharedStart = lines.findIndex(l => l.startsWith('const DEBUG_TABS'));
const exportDefault = lines.findIndex(l => l.startsWith('export default function DebugConsole'));
const returnStatementIdx = lines.slice(exportDefault).findIndex(l => l.trim().startsWith('return (')) + exportDefault;

const stateVarsContent = lines.slice(exportDefault + 1, returnStatementIdx).join('\n');

const hookContent = `
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAdminOverview } from "@/hooks/useAdminOverview";
import { useAdminUiChartHealthReporter } from "@/hooks/useAdminUiChartHealthReporter";
import { useAdminPollingSWR } from "@/hooks/useAdminPollingSWR";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import type { AdminAiDebugSummary } from "@/lib/ai-debug-assistant";
import { filterAdminDebugRouteRuntimeHealth, buildAdminDebugRouteRuntimeRateSummary } from "@/lib/admin-debug-route-runtime";
import { getRouteRuntimeHealthCluster, getRouteRuntimeHealthCoverageState, summarizeRouteRuntimeHealth } from "@/lib/route-runtime-health";
import { buildAdminUiChartHealthItem, summarizeAdminUiChartHealth } from "@/lib/admin-ui-chart-health";
import { ADMIN_DEBUG_DEFAULT_TAB, AdminDebugRouteRuntimeFilter, AdminDebugTabOption } from "@/lib/admin-debug-preferences";
import { reportClientIssue } from "@/lib/client-error-reporting";
import { authFetch } from "@/lib/authFetch";

type DebugTabId = AdminDebugTabOption;

export function useDebugState() {
` + stateVarsContent + `
    return {
        user, userProfile, isCompactViewport, processing, setProcessing, repairingId, setRepairingId, simAmount, setSimAmount, activeTab, setActiveTab, routeRuntimeFilter, setRouteRuntimeFilter, aiAssistantEnabled, setAiAssistantEnabled, aiAssistantModel, setAiAssistantModel, savingAiAssistantSettings, setSavingAiAssistantSettings, savingDebugPreferences, setSavingDebugPreferences, data, error, isLoading, mutate, debugPreferencesData, mutateDebugPreferences, aiDebugData, aiDebugError, mutateAiDebug, overviewData, overviewLoading, mutateOverview, persistDebugPreferences, handleActiveTabChange, handleRouteRuntimeFilterChange, recentTransactions, panelLogWarnCount, panelLogFailCount, analyticsChartHealth, analyticsChartHealthSummary, routeRuntimeHealth, filteredRouteRuntimeHealth, routeRuntimeHealthSummary, nativeChatRouteRuntimeHealth, compatibilityChatRouteRuntimeHealth, nativeChatRouteRuntimeSummary, compatibilityChatRouteRuntimeSummary, nativeChatRouteRuntimeRates, compatibilityChatRouteRuntimeRates, queueJobHeartbeats, runtimeWarnings, notificationDispatchOutcomes, queueRuntimeSummary, derivedActionCount, freshestLoadedSignalAt, overviewDependencyUpdatedAt, routeRuntimeLaneUpdatedAt, unseenRouteRuntimeCount, observedRouteRuntimeCount, activePipelineFailureCount, recentPipelineFailureCount, sampledPipelineFailureCount, activeDiagnosticCount, recentDiagnosticCount, sampledDiagnosticCount, debugSurfaceHealth, aiStatusLabel, aiStatusTone, refreshAll, handleManualBalanceAdjustment, handleRepairProposal, handleSaveAiAssistantSettings
    };
}
`;

fs.writeFileSync(path.resolve('src/app/admin/debug/hooks/useDebugState.ts'), hookContent);

const sharedContent = `
import { ChevronDown, ChevronUp, Activity, ShieldAlert, Radio, Sparkles, Terminal } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { AdminDebugTabOption } from "@/lib/admin-debug-preferences";

type DebugTabId = AdminDebugTabOption;
` + lines.slice(sharedStart, exportDefault).join('\n') + `

export { DEBUG_TABS, formatTimestamp, formatRelative, formatWindowHours, getPipelineStatusLabel, getChartHealthStatusTone, getFreshnessTone, compactNumber, Pill, StatCard, Section, ScrollWrap };
`;

fs.writeFileSync(path.resolve('src/app/admin/debug/components/DebugShared.tsx'), sharedContent);

const tabs = ['now', 'actions', 'monitoring', 'ai', 'advanced'];
const componentNames = ['DebugNowTab', 'DebugActionsTab', 'DebugMonitoringTab', 'DebugAITab', 'DebugAdvancedTab'];

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
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DEBUG_TABS, formatTimestamp, formatRelative, formatWindowHours, getPipelineStatusLabel, getChartHealthStatusTone, getFreshnessTone, compactNumber, Pill, StatCard, Section, ScrollWrap } from "./DebugShared";

export function ${comp}({ state }: { state: any }) {
    const { 
        data, error, isLoading, isCompactViewport, user, processing, simAmount, setSimAmount, handleManualBalanceAdjustment, 
        freshestLoadedSignalAt, activePipelineFailureCount, recentPipelineFailureCount, sampledPipelineFailureCount,
        activeDiagnosticCount, recentDiagnosticCount, sampledDiagnosticCount, 
        derivedActionCount, aiStatusLabel, queueRuntimeSummary, notificationDispatchOutcomes,
        aiDebugData, aiDebugError, aiAssistantEnabled, setAiAssistantEnabled, aiAssistantModel, setAiAssistantModel,
        savingAiAssistantSettings, handleSaveAiAssistantSettings, repairingId, handleRepairProposal,
        routeRuntimeHealthSummary, observedRouteRuntimeCount, unseenRouteRuntimeCount, routeRuntimeLaneUpdatedAt,
        routeRuntimeFilter, setRouteRuntimeFilter, filteredRouteRuntimeHealth, handleRouteRuntimeFilterChange,
        recentTransactions, queueJobHeartbeats, runtimeWarnings, analyticsChartHealthSummary, panelLogWarnCount, panelLogFailCount,
        nativeChatRouteRuntimeSummary, compatibilityChatRouteRuntimeSummary, nativeChatRouteRuntimeRates, compatibilityChatRouteRuntimeRates,
        activeTab
    } = state;

    return (
        <>
            ${tabBlock.trim() || "<p>Coming soon</p>"}
        </>
    );
}
`;
    fs.writeFileSync(path.resolve(`src/app/admin/debug/components/${comp}.tsx`), tabFile);
}

const newPageContent = `
"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { Button } from "@/components/ui/Button";
import { useDebugState } from "./hooks/useDebugState";
import { DEBUG_TABS, StatCard } from "./components/DebugShared";
import { DebugNowTab } from "./components/DebugNowTab";
import { DebugActionsTab } from "./components/DebugActionsTab";
import { DebugMonitoringTab } from "./components/DebugMonitoringTab";
import { DebugAITab } from "./components/DebugAITab";
import { DebugAdvancedTab } from "./components/DebugAdvancedTab";
import { cn } from "@/lib/utils";

export default function DebugConsole() {
    const state = useDebugState();
    const { 
        data, error, isLoading, overviewLoading, activeTab, isCompactViewport, handleActiveTabChange, refreshAll, savingDebugPreferences,
        derivedActionCount, routeRuntimeHealthSummary, observedRouteRuntimeCount, freshestLoadedSignalAt, aiStatusLabel, activePipelineFailureCount, recentPipelineFailureCount, sampledPipelineFailureCount
    } = state;

    const renderTabControls = () => {
        if (isCompactViewport) {
            return (
                <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                    <label className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-gray-400">Operator lane</label>
                    <select
                        value={activeTab}
                        onChange={(event) => handleActiveTabChange(event.target.value)}
                        className="min-h-11 w-full rounded-[1rem] border border-white/10 bg-black/40 px-3 text-sm font-semibold text-white"
                    >
                        {DEBUG_TABS.map((tab) => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
                    </select>
                    {savingDebugPreferences ? <p className="mt-2 text-xs text-gray-500">Saving debug preference...</p> : null}
                </div>
            );
        }

        return (
            <div className="flex flex-wrap gap-2">
                {DEBUG_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleActiveTabChange(tab.id)}
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
                                active ? "border-brand-purple/40 bg-brand-purple/20 text-white" : "border-white/10 bg-white/5 text-gray-300"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-4 md:space-y-6">
            <PageViewEvent eventName="admin_debug_viewed" />
            <AdminPageHeader
                eyebrow="Admin Debug"
                title="Debug Console"
                compact
                actions={(
                    <Button variant="glass" onClick={refreshAll}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                )}
            />

            {renderTabControls()}

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-8">
                <StatCard label="Health score" value={data?.opsHealth ? \`\${data.opsHealth.score}%\` : "--"} meta={\`\${data?.opsHealth?.diagnostics?.activeIssueClusterCount || 0} active issue clusters\`} />
                <StatCard label="Pipeline active" value={activePipelineFailureCount} meta={\`recent \${recentPipelineFailureCount} | sample \${sampledPipelineFailureCount}\`} />
                <StatCard label="Task-issue users" value={data?.stats?.usersWithTaskIssues ?? "--"} meta={\`\${data?.stats?.runtimeUsersWithRefreshIssues ?? 0} sampled refresh warnings\`} />
                <StatCard label="Creator issues" value={data?.stats?.creatorOnboardingIssues ?? "--"} meta={\`\${data?.creatorOnboardingDiagnostics?.summary?.missingQueueCount ?? 0} missing queue links\`} />
                <StatCard label="Open actions" value={derivedActionCount} meta="Derived action requirements" />
                <StatCard label="Route health" value={routeRuntimeHealthSummary?.total ? \`\${routeRuntimeHealthSummary.fail}/\${routeRuntimeHealthSummary.warn}/\${routeRuntimeHealthSummary.stale}\` : "--"} meta={routeRuntimeHealthSummary?.total ? \`\${routeRuntimeHealthSummary.total} tracked | \${observedRouteRuntimeCount} observed\` : "no route rollups yet"} />
                <StatCard label="AI assistant" value={aiStatusLabel} meta="Live status" />
            </div>

            {error ? <div className="rounded-[1.35rem] border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100">Debug data could not be loaded right now.</div> : null}
            {(isLoading || overviewLoading) && !data ? <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-6 text-sm text-gray-300"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading debug surfaces...</div> : null}

            {activeTab === "now" && <DebugNowTab state={state} />}
            {activeTab === "actions" && <DebugActionsTab state={state} />}
            {activeTab === "monitoring" && <DebugMonitoringTab state={state} />}
            {activeTab === "ai" && <DebugAITab state={state} />}
            {activeTab === "advanced" && <DebugAdvancedTab state={state} />}
        </div>
    );
}
`;

fs.writeFileSync(path.resolve('src/app/admin/debug/page.tsx'), newPageContent);
console.log("Successfully decomposed admin/debug/page.tsx!");
