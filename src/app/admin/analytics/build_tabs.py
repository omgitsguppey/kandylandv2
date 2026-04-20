import os

page_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\page.tsx"
with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

def extract_section(start_str, end_str):
    start = page_content.find(start_str)
    end = page_content.find(end_str, start)
    if start != -1 and end != -1:
        return page_content[start:end]
    return ""

def create_tab_file(filename, name, content):
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(f'''import React, {{ useMemo }} from "react";
import {{
  Activity, AlertTriangle, Candy, CheckCircle2, Clock3, DollarSign, Eye, FileText, Funnel, Loader2, MapPin, Monitor, PlayCircle, Route, Share2, ShoppingBag, Smartphone, Sparkles, Users, Wallet,
}} from "lucide-react";
import {{ Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Pie, PieChart, Cell, Line, LineChart }} from "recharts";
import {{ AnalyticsTooltip, MetricCard, SectionCard }} from "@/components/Admin/Analytics/AdminAnalyticsPrimitives";
import {{ AdminOnboardingAnalyticsModules }} from "@/components/Admin/Analytics/AdminOnboardingAnalyticsModules";
import {{ AdminTruthSurfaces }} from '../AdminTruthSurfaces';
import {{ PageViewEvent }} from "@/components/Analytics/PageViewEvent";

export function {name}(props: any) {{
  const {{
    renderSectionRangeControl, liveResponse, historicalResponse, liveLoading, historicalLoading, nowMs, EVENT_LABELS,
    liveSurfaceMix, liveActiveUsers, livePulseOnboardingStats, livePulseOnboardingStartCount, livePulseOnboardingCompletionRate, livePulseFunnel, liveSeries,
    journeyFunnelMetrics,
    authOutcomeHasData, authOutcomeChartItems, authOutcomeTotals,
    authOnboardingDiscrepancies, onboardingVelocityHasData, onboardingVelocityBuckets, onboardingVelocityStartCount, onboardingVelocityCompletionCount, onboardingVelocityCompletionRate, onboardingVelocityDropOffCount, onboardingVelocityStats, onboardingVelocityStartSourceHint, onboardingStepFlowItems,
    formatCompactNumber, formatDuration, formatPercent, formatRelativeTime,
    guestBounceQualityCards, guestBounceGlobalSemantics, guestBounceGuestRate, guestBounceEngagedRate, guestBounceIdentifiedRate, guestBounceUserSemantics,
    topEvents,
    liveInteractionStreamRange, liveInteractionStreamData,
    validations, getValidationClasses, dataValidationRange,
    
    // Audience Tab
    totalDeviceUsers, mobileUsers, mobileShare, audienceSnapshotRange, semanticQualityCards, guestBounceRate, identifiedBounceRate, guestEngagedRate,
    returnCadenceRange, returnCadenceData, repeatVisitSegments, uniqueReturners, returnerConversionRate,
    navigationDestinationsRange, destinationMix,
    deviceMixRange, devices, getDeviceIcon,
    topPathsRange, pages,
    regionsRange, geo,

    // Commerce Tab
    commerceSnapshotRange, commerce,
    packagePerformanceRange, packagePerformance,
    PIE_COLORS, contentConversionRange, unlockCategoryMix, previewToUnlockRate, checkoutToPurchaseRate,
    topDropConversionRange, topDrops,
    recentCommerceFeedRange, feedItems, describeEvent, formatAbsoluteDateTime,
    
    // Added remaining
    clearAllFilters, clearViewerFilter, viewerUserFilter, formatMoney, activeViewerFilter
  }} = props;

  return (
    <>
{content}
    </>
  );
}}
''')

# Operations
ops_content = extract_section('{activeTab === "operations" ? (', '{activeTab === "audience" ? (')
ops_content = ops_content.replace('{activeTab === "operations" ? (', '')
ops_content = ops_content.strip()
if ops_content.endswith(') : null}'):
    ops_content = ops_content[:-9].strip()
elif ops_content.endswith(')'):
    ops_content = ops_content[:-1].strip()

# Audience
aud_content = extract_section('{activeTab === "audience" ? (', '{activeTab === "commerce" ? (')
aud_content = aud_content.replace('{activeTab === "audience" ? (', '')
aud_content = aud_content.strip()
if aud_content.endswith(') : null}'):
    aud_content = aud_content[:-9].strip()
elif aud_content.endswith(')'):
    aud_content = aud_content[:-1].strip()

# Commerce
comm_content = extract_section('{activeTab === "commerce" ? (', '</main>')
comm_content = comm_content.replace('{activeTab === "commerce" ? (', '')
comm_content = comm_content.strip()
if comm_content.endswith(') : null}'):
    comm_content = comm_content[:-9].strip()
elif comm_content.endswith(')'):
    comm_content = comm_content[:-1].strip()

base_path = r"C:\Users\uylus\OneDrive\Documents\KandyDrops_Final\src\app\admin\analytics\components"
create_tab_file(os.path.join(base_path, "AdminAnalyticsOperationsTab.tsx"), "AdminAnalyticsOperationsTab", ops_content)
create_tab_file(os.path.join(base_path, "AdminAnalyticsAudienceTab.tsx"), "AdminAnalyticsAudienceTab", aud_content)
create_tab_file(os.path.join(base_path, "AdminAnalyticsCommerceTab.tsx"), "AdminAnalyticsCommerceTab", comm_content)

print("Created components!")
