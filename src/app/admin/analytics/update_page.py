import re

page_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\page.tsx"
with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

props = """    renderSectionRangeControl, liveResponse, historicalResponse, liveLoading, historicalLoading, nowMs, EVENT_LABELS,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries,
    journeyFunnelMetrics,
    authOutcomeHasData, authOutcomeChartItems, authOutcomeTotals,
    authOnboardingDiscrepancies, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    formatCompactNumber, formatDuration, formatPercent, formatRelativeTime,
    guestBounceQualityCards, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    topEvents,
    liveInteractionStreamRange, liveInteractionStreamData,
    validations, getValidationClasses, dataValidationRange,
    
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    returnCadenceRange, returnCadenceData, repeatVisitSegments, uniqueReturners, returnerConversionRate,
    navigationDestinationsRange, destinationMix,
    deviceMixRange, devices, getDeviceIcon,
    topPathsRange, pages,
    regionsRange, geo,

    commerceSnapshotRange, commerce,
    packagePerformanceRange, packagePerformance,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops,
    recentCommerceFeedRange, feedItems, describeEvent, formatAbsoluteDateTime,
    
    clearAllFilters, clearViewerFilter, viewerUserFilter, formatMoney, activeViewerFilter"""

prop_keys = [p.strip() for p in props.replace('\n', '').replace('// Audience Tab', '').replace('// Commerce Tab', '').replace('// Added remaining', '').split(',') if p.strip()]
props_obj = "{" + ",\n".join(f"      {k}" for k in prop_keys) + "\n    }"

imports = """import { AdminAnalyticsOperationsTab } from "./components/AdminAnalyticsOperationsTab";
import { AdminAnalyticsAudienceTab } from "./components/AdminAnalyticsAudienceTab";
import { AdminAnalyticsCommerceTab } from "./components/AdminAnalyticsCommerceTab";\n"""

start_idx = page_content.find('<main className="space-y-4 md:space-y-5">')
end_idx = page_content.find('</main>', start_idx)

if start_idx != -1 and end_idx != -1:
    before = page_content[:start_idx + len('<main className="space-y-4 md:space-y-5">')]
    after = page_content[end_idx:]
    
    import_target = 'export default function AdminAnalyticsPage() {'
    import_idx = before.find(import_target)
    before = before[:import_idx] + imports + before[import_idx:]
    
    new_content = """
        {activeTab === "operations" ? <AdminAnalyticsOperationsTab {...""" + props_obj + """} /> : null}
        {activeTab === "audience" ? <AdminAnalyticsAudienceTab {...""" + props_obj + """} /> : null}
        {activeTab === "commerce" ? <AdminAnalyticsCommerceTab {...""" + props_obj + """} /> : null}
      """
    
    full_content = before + new_content + after
    with open(page_path, 'w', encoding='utf-8') as f:
        f.write(full_content)
    print("Page updated!")
else:
    print("Main block not found")
