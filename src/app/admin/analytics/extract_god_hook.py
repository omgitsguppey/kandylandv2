import re

page_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\page.tsx"
with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

start_imports = 0
end_imports = page_content.find('export default function AdminAnalyticsPage() {')

imports_code = page_content[start_imports:end_imports]

start_hook = page_content.find('const { user } = useAuth();', end_imports)
end_hook = page_content.find('if (needsSetup) {', start_hook)

hook_code = page_content[start_hook:end_hook]

# Create useAdminAnalyticsState.ts
hook_file_content = imports_code + "\n\nexport function useAdminAnalyticsState() {\n" + hook_code + """
  return {
    user, activeTab, setActiveTab, range, nowMs, viewerUserDraft, setViewerUserDraft, viewerUserFilter, setViewerUserFilter,
    moduleRanges, setModuleRanges, savingSectionKey, setSavingSectionKey, analyticsFilterStorageKey,
    activeSessionFilter, setActiveSessionFilter, activeDropFilter, setActiveDropFilter, activeSubFilter, setActiveSubFilter,
    customDateRange, setCustomDateRange, handleRangeSelect, isCustomRangeDisabled,
    hasActiveFilters, isExportLivePulseLoading, setIsExportLivePulseLoading,
    liveResponse, historicalResponse, liveError, historicalError, liveLoading, historicalLoading,
    needsSetup, blockingAnalyticsError, isPrimingAnalytics, backgroundAnalyticsIssues, updateActiveSessionFilter,
    updateActiveDropFilter, updateActiveSubFilter, handleRefresh, handleAdminAnalyticsExport, getSectionRange, renderSectionRangeControl,
    EVENT_LABELS, funnel, onboardingStats, onboardingDurationBuckets, onboardingStepStats, authBreakdown, historySeries,
    rawEvents, componentContexts, semanticCategories, devices, pages, geo, totals, commerce, activeViewerFilter, setActiveViewerFilter,
    testAdminApiErrorTracking, clearAllFilters, clearViewerFilter,
    authOutcomeHasData, authOutcomeChartItems, authOutcomeTotals,
    authOnboardingDiscrepancies, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    guestBounceQualityCards, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    topEvents, liveInteractionStreamRange, liveInteractionStreamData,
    validations, getValidationClasses, dataValidationRange,
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    returnCadenceRange, returnCadenceData, repeatVisitSegments, uniqueReturners, returnerConversionRate,
    navigationDestinationsRange, destinationMix, deviceMixRange, getDeviceIcon, topPathsRange, regionsRange,
    commerceSnapshotRange, packagePerformanceRange, packagePerformance,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops, recentCommerceFeedRange, feedItems, describeEvent, formatAbsoluteDateTime,
    formatMoney, formatCompactNumber, formatDuration, formatPercent, formatRelativeTime, analyticsSectionHealth,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries, journeyFunnelMetrics
  };
}
"""

with open(r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\hooks\useAdminAnalyticsState.ts", 'w', encoding='utf-8') as f:
    f.write(hook_file_content)

print(f"Hook len: {len(hook_file_content)}")

# Update page.tsx
# Replace everything from `const { user } = useAuth();` to `if (needsSetup) {` with `const state = useAdminAnalyticsState();`
page_before = page_content[:start_hook]
page_after = page_content[end_hook:]

# Wait, `needsSetup` is used in page_after. So we should expose it from state.
# We also need to add the import for useAdminAnalyticsState.
new_page = page_before + "  const state = useAdminAnalyticsState();\n  const { needsSetup, activeTab, setActiveTab, handleRefresh, liveLoading, historicalLoading, isPrimingAnalytics, formatAbsoluteDateTime, formatRelativeTime, liveResponse, clearAllFilters, hasActiveFilters, isExportLivePulseLoading, handleAdminAnalyticsExport, testAdminApiErrorTracking, backgroundAnalyticsIssues, analyticsSectionHealth, EVENT_LABELS } = state;\n\n  " + page_after

# Now replace all instances of {...props_obj} inside AdminAnalyticsOperationsTab etc to {...state}
tab_rendering_regex = re.compile(r'\{activeTab === "(operations|audience|commerce)" \? <AdminAnalytics(Operations|Audience|Commerce)Tab \{[^\}]+\} /> : null\}')
new_page = tab_rendering_regex.sub(lambda m: f'{{activeTab === "{m.group(1)}" ? <AdminAnalytics{m.group(2)}Tab {{...state}} /> : null}}', new_page)

# Need to insert import
new_page = new_page.replace('import { AdminAnalyticsOperationsTab', 'import { useAdminAnalyticsState } from "./hooks/useAdminAnalyticsState";\nimport { AdminAnalyticsOperationsTab')

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(new_page)

print(f"Page updated to length: {len(new_page)}")

