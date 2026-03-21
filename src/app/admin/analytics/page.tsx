"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  BellRing,
  Candy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Database,
  DollarSign,
  Eye,
  FileText,
  Funnel,
  Loader2,
  MapPin,
  Monitor,
  PlayCircle,
  Route,
  Share2,
  ShieldAlert,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuthSWR } from "@/hooks/useAuthSWR";
import { useCompactViewport } from "@/hooks/useCompactViewport";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "@/components/Admin/AdminPageHeader";
import { TELEMETRY_EVENT_LABELS } from "@/lib/telemetry-catalog";
import { humanizeAnalyticsKey, resolveRawInteractionLabel } from "@/lib/analytics-semantics";
import { ANALYTICS_RUNTIME_COLLECTION, ANALYTICS_RUNTIME_DOC_ID } from "@/lib/analytics-runtime";
import { recordClientDiagnostic } from "@/lib/client-diagnostics";
import { authFetch } from "@/lib/authFetch";
import type { AdminOpsHealth, AdminOpsHealthSeverity, AdminOpsHealthStatus } from "@/lib/admin-ops-health";

type ViewTab = "operations" | "audience" | "commerce" | "security";
type RangeOption = "24h" | "3d" | "7d" | "14d" | "30d" | "90d" | "all";
type HistoricalSectionId =
  | "stationSnapshot"
  | "livePulse"
  | "journeyFunnel"
  | "authOutcomeSplit"
  | "onboardingVelocity"
  | "eventMix"
  | "liveInteractionStream"
  | "serverTelemetryHealth"
  | "coverageEngine"
  | "categorySemantics"
  | "creatorMetrics"
  | "semanticsEngine"
  | "dataValidation"
  | "audienceSnapshot"
  | "returnCadence"
  | "navigationDestinations"
  | "deviceMix"
  | "topPaths"
  | "regions"
  | "commerceSnapshot"
  | "packagePerformance"
  | "contentConversion"
  | "topDropConversion"
  | "recentCommerceFeed"
  | "viewerDrilldown"
  | "viewerJourney"
  | "watchDepthTags"
  | "securityPosture"
  | "dailyTaskPipeline"
  | "taskCompletionSpeed"
  | "taskLeaderboard"
  | "notificationFunnel"
  | "flaggedAccounts";

interface RealtimePoint {
  minute: number;
  users: number;
  views: number;
}

interface HistoricalPoint {
  date: string;
  rawDate: string;
  users: number;
  views: number;
  sessions: number;
  newUsers: number;
  avgSessionDuration: number;
  engagementRate: number;
}

interface EventBreakdownItem {
  eventName: string;
  count: number;
}

interface DeviceMixItem {
  device: string;
  users: number;
  sessions: number;
  engagementRate: number;
}

interface GeoItem {
  country: string;
  city: string;
  users: number;
}

interface PageItem {
  path: string;
  views: number;
  avgTime: number;
  engagementRate: number;
}

interface TopDropItem {
  dropId: string;
  dropTitle: string;
  views: number;
  unlocks: number;
}

interface CommerceFeedItem {
  id: string;
  type?: string;
  status?: string;
  amount?: number;
  cost?: number;
  description?: string;
  timestamp?: number;
  username?: string;
  userPhoto?: string;
}

interface SecurityItem {
  uid: string;
  username: string;
  photoURL?: string;
  ripAttempts: number;
  lastViolation: string | null;
  lastViolationReason: string;
  lastViolationDropId?: string | null;
  lastViolationDropTitle?: string | null;
}

interface RawEventItem {
  type: string;
  detail?: string;
  targetText?: string;
  targetTag?: string;
  targetId?: string;
  scrollDepthPercent?: number;
  path: string;
  uid: string;
  username?: string;
  userPhoto?: string;
  timestamp: number;
}

interface AuthBreakdownItem {
  method: string;
  attempts: number;
  successes: number;
  failures: number;
  avgDurationMs: number;
  successRate: number;
}

interface CountBucketItem {
  label: string;
  count: number;
}

interface OnboardingStepStatItem {
  stepKey: string;
  stepTitle: string;
  stepIndex: number;
  starts: number;
  completions: number;
  avgDurationMs: number;
}

interface DestinationMixItem {
  destination: string;
  count: number;
}

interface TaskLeaderboardItem {
  taskId: string;
  title: string;
  assigned: number;
  started: number;
  completed: number;
  failed: number;
  rewardTotal: number;
  avgDurationMs: number;
  completionRate: number;
}

interface PackagePerformanceItem {
  label: string;
  starts: number;
  purchases: number;
  failures: number;
  revenueUsd: number;
  drops: number;
  conversionRate: number;
  abandonmentRate: number;
}

interface UnlockCategoryItem {
  label: string;
  previews: number;
  unlocks: number;
  unlockRate: number;
}

interface ContentTagDemandItem {
  tag: string;
  count: number;
}

interface ViewerOverviewItem {
  viewCount: number;
  sessionCount: number;
  uniqueViewerCount: number;
  repeatSessionCount: number;
  totalWatchSeconds: number;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  avgLoadMs: number;
  assetCompletionRate: number;
  assetSwitches: number;
  downloads: number;
  relatedClicks: number;
}

interface ViewerDropInsightItem {
  dropId: string;
  dropTitle: string;
  viewCount: number;
  sessionCount: number;
  uniqueViewerCount: number;
  repeatSessionCount: number;
  totalWatchSeconds: number;
  avgSessionSeconds: number;
  avgWatchSeconds: number;
  assetStarts: number;
  assetCompletions: number;
  assetSwitches: number;
  downloads: number;
  relatedClicks: number;
  avgLoadMs: number;
}

interface ViewerUserOptionItem {
  uid: string;
  username: string;
  viewCount: number;
  sessionCount: number;
  totalWatchSeconds: number;
}

interface ValidationItem {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

interface ModuleCoverageSourceItem {
  key: string;
  label: string;
  count: number;
}

interface ModuleCoverageItem {
  key: string;
  label: string;
  status: "healthy" | "partial" | "empty";
  score: number;
  total: number;
  populatedSources: number;
  detail: string;
  sources: ModuleCoverageSourceItem[];
}

interface SemanticCategoryItem {
  key: string;
  label: string;
  viewCount: number;
  viewDurationMs: number;
  engagedViewCount: number;
  passiveViewCount: number;
  bounceCount: number;
  exitCount: number;
  clickCount: number;
  hoverCount: number;
  pagesVisited: number;
  signInCount: number;
  returnCount: number;
  logoutCount: number;
  watchSecondsTotal: number;
  watchSessionCount: number;
  avgViewSeconds: number;
  engagedRate: number;
}

interface SemanticEngineSourceItem {
  key: string;
  label: string;
  engine: string;
  description: string;
}

interface SemanticEngineStrategyItem {
  key: string;
  label: string;
  description: string;
}

interface SocialMetricItem {
  key: string;
  label: string;
  shortLabel: string;
  category: string;
  value: number;
  formattedValue: string;
  status: "healthy" | "partial" | "empty";
  sampleSize: number;
  reliability: "canonical" | "cross_source" | "directional";
  description: string;
  referenceModel: string;
  formula: string;
  sources: string[];
}

interface SocialMetricCategoryItem {
  key: string;
  label: string;
  metrics: SocialMetricItem[];
}

interface SocialMetricOverviewItem {
  total: number;
  healthy: number;
  partial: number;
  empty: number;
}

interface HistoricalAnalyticsResponse {
  success: boolean;
  requiresSetup?: boolean;
  error?: string;
  data?: HistoricalPoint[];
  totals?: {
    users: number;
    views: number;
    sessions: number;
    newUsers: number;
      avgSessionDuration: number;
      engagementRate: number;
  };
  events?: Record<string, number>;
  eventBreakdown?: EventBreakdownItem[];
  devices?: DeviceMixItem[];
  funnel?: {
    authModalOpens: number;
    authSignIns: number;
    authSignUps: number;
    previewOpens: number;
    viewerOpens: number;
    assetSwitches: number;
    unlocks: number;
    shares: number;
    walletOpens: number;
    checkoutStarts: number;
    purchases: number;
    checkIns: number;
    experienceViews: number;
  };
  geo?: GeoItem[];
  pages?: PageItem[];
  topDrops?: TopDropItem[];
  commerce?: {
    revenueUsd: number;
    adjustedProfitUsd?: number;
    bonusValueUsd?: number;
    deliveredGumDrops?: number;
    bonusGumDrops?: number;
    effectiveUsdPer100Gd?: number;
    gdSpent: number;
    feed?: CommerceFeedItem[];
  };
  security?: SecurityItem[];
  onboardingStats?: {
    starts: number;
    completions: number;
    avgDuration: number;
    completionRate: number;
    startSource: "tracked" | "completion_fallback" | "none";
  };
  onboardingStepStats?: OnboardingStepStatItem[];
  rawEvents?: RawEventItem[];
  authBreakdown?: AuthBreakdownItem[];
  onboardingDurationBuckets?: CountBucketItem[];
  repeatVisitSegments?: CountBucketItem[];
  destinationMix?: DestinationMixItem[];
  notificationFunnel?: CountBucketItem[];
  notificationActions?: Array<{ label: string; value: number }>;
  taskGuidance?: {
    viewed: number;
    dismissed: number;
    tapped: number;
    completed: number;
    tapThroughRate: number;
    guidedCompletionRate: number;
  };
  taskPipeline?: CountBucketItem[];
  taskLeaderboard?: TaskLeaderboardItem[];
  taskDurationBuckets?: CountBucketItem[];
  reminderReasons?: CountBucketItem[];
  packagePerformance?: PackagePerformanceItem[];
  unlockCategoryMix?: UnlockCategoryItem[];
  watchDepthBuckets?: CountBucketItem[];
  contentJourney?: CountBucketItem[];
  contentTagDemand?: ContentTagDemandItem[];
  viewerOverview?: ViewerOverviewItem;
  viewerDropInsights?: ViewerDropInsightItem[];
  viewerUsers?: ViewerUserOptionItem[];
  viewerFilter?: string;
  semanticCategories?: SemanticCategoryItem[];
  semanticEngine?: {
    sources: SemanticEngineSourceItem[];
    strategies: SemanticEngineStrategyItem[];
  };
  socialMetrics?: {
    version: string;
    metrics: SocialMetricItem[];
    categories: SocialMetricCategoryItem[];
    overview: SocialMetricOverviewItem;
  };
  moduleCoverage?: ModuleCoverageItem[];
  unhealthyModules?: ModuleCoverageItem[];
  parityScore?: number;
  validations?: ValidationItem[];
  opsHealth?: AdminOpsHealth;
}

interface HistoricalOverrideEntry {
  data?: HistoricalAnalyticsResponse;
  error?: string;
  fetchedAt: number;
  isLoading: boolean;
}

interface RealtimeAnalyticsResponse {
  success: boolean;
  requiresSetup?: boolean;
  error?: string;
  totalActive?: number;
  deepTrackerActive?: number;
  data?: RealtimePoint[];
  onboardingStats?: {
    starts: number;
    completions: number;
    avgDuration: number;
    completionRate: number;
    startSource: "tracked" | "completion_fallback" | "none";
  };
}

interface TooltipValue {
  color?: string;
  name?: string;
  value?: string | number;
}

interface AnalyticsTooltipProps {
  active?: boolean;
  payload?: TooltipValue[];
  label?: string;
  valueFormatter?: (value: string | number, name?: string) => string;
}

interface SectionCardProps {
  panelId?: HistoricalSectionId;
  sectionRange?: RangeOption;
  onSectionRangeChange?: (nextRange: RangeOption) => void;
  rangeOptions?: Array<{ value: RangeOption; label: string }>;
  loading?: boolean;
  title: string;
  subtitle?: string;
  icon: typeof Activity;
  children: React.ReactNode;
  className?: string;
  rightSlot?: React.ReactNode;
  collapsedPreview?: React.ReactNode;
  defaultExpanded?: boolean;
}

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Activity;
  className?: string;
  valueClassName?: string;
}

interface PanelGuideContent {
  summary: string;
  takeaways: string[];
  deepDiveTitle: string;
  deepDiveBody: string[];
}

interface FlowGroup {
  title: string;
  subtitle: string;
  panels: HistoricalSectionId[];
}

const RANGE_OPTIONS: Array<{ value: RangeOption; label: string }> = [
  { value: "24h", label: "24H" },
  { value: "3d", label: "3D" },
  { value: "7d", label: "7D" },
  { value: "14d", label: "14D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "all", label: "All" },
];

const TAB_OPTIONS: Array<{ id: ViewTab; label: string; icon: typeof Activity }> = [
  { id: "operations", label: "Operations", icon: Activity },
  { id: "audience", label: "Audience", icon: Users },
  { id: "commerce", label: "Commerce", icon: DollarSign },
  { id: "security", label: "Signals", icon: ShieldAlert },
];

const EVENT_LABELS: Record<string, string> = TELEMETRY_EVENT_LABELS;
const PIE_COLORS = ["#b28cff", "#7c3aed", "#22d3ee", "#f472b6", "#34d399", "#f59e0b"];

const INITIAL_ANALYTICS_NOW = Date.now();
const GLOBAL_RANGE_OPTIONS = RANGE_OPTIONS.filter((option) => option.value !== "24h");
const SECTION_FILTER_OPTIONS = GLOBAL_RANGE_OPTIONS;
const EMPTY_OPS_HEALTH: AdminOpsHealth = {
  score: 0,
  runtime: {
    gaPropertyConfigured: false,
    appCheckConfigured: false,
    appCheckRequired: false,
    recaptchaConfigured: false,
    vapidConfigured: false,
    databaseUrlConfigured: false,
    projectId: "",
    navigationSessionSigningReady: false,
    warnings: [],
  },
  diagnostics: {
    total: 0,
    errorCount: 0,
    warnCount: 0,
    infoCount: 0,
    lastDiagnosticAt: 0,
    channels: [],
    recent: [],
  },
  pipeline: {
    failureCount: 0,
    lastFailureAt: 0,
    lastRouteName: "",
    lastErrorMessage: "",
    routes: [],
  },
  materializers: [],
};

const PANEL_LABELS = {
  stationSnapshot: "Station Snapshot",
  livePulse: "Live Pulse",
  journeyFunnel: "Journey Funnel",
  authOutcomeSplit: "Auth Outcome Split",
  onboardingVelocity: "Onboarding Velocity",
  eventMix: "Event Mix",
  liveInteractionStream: "Interaction Stream",
  serverTelemetryHealth: "Telemetry Health",
  coverageEngine: "Coverage Engine",
  categorySemantics: "Category Semantics",
  creatorMetrics: "Creator Metrics",
  semanticsEngine: "Semantics Engine",
  dataValidation: "Data Validation",
  audienceSnapshot: "Audience Snapshot",
  returnCadence: "Return Cadence",
  navigationDestinations: "Destinations",
  deviceMix: "Device Mix",
  topPaths: "Top Paths",
  regions: "Regions",
  commerceSnapshot: "Commerce Snapshot",
  packagePerformance: "Package Performance",
  contentConversion: "Content Conversion",
  topDropConversion: "Top Drop Conversion",
  recentCommerceFeed: "Commerce Feed",
  viewerDrilldown: "Viewer Drilldown",
  viewerJourney: "Viewer Journey",
  watchDepthTags: "Watch Depth & Tags",
  securityPosture: "Security Posture",
  dailyTaskPipeline: "Task Pipeline",
  taskCompletionSpeed: "Task Speed",
  taskLeaderboard: "Task Leaderboard",
  notificationFunnel: "Notification Funnel",
  flaggedAccounts: "Flagged Accounts",
} satisfies Record<HistoricalSectionId, string>;

const FLOW_GROUPS_BY_TAB = {
  operations: [
    {
      title: "Start with health",
      subtitle: "Open the big-picture panels first so you know whether traffic and systems look normal before drilling in.",
      panels: ["stationSnapshot", "livePulse", "journeyFunnel"],
    },
    {
      title: "Explain what changed",
      subtitle: "Use these panels when the headline moves and you need to know whether auth, onboarding, or event mix caused it.",
      panels: ["authOutcomeSplit", "onboardingVelocity", "eventMix", "liveInteractionStream"],
    },
    {
      title: "Validate trust",
      subtitle: "Finish with coverage and health so you know whether the story you are reading is complete enough to share.",
      panels: ["serverTelemetryHealth", "coverageEngine", "categorySemantics", "creatorMetrics", "semanticsEngine", "dataValidation"],
    },
  ],
  audience: [
    {
      title: "Start with audience size",
      subtitle: "Begin with who showed up and whether engagement looks healthy at a glance.",
      panels: ["audienceSnapshot", "returnCadence"],
    },
    {
      title: "Then follow movement",
      subtitle: "Use the navigation and device panels to understand how people are moving through the product and on which screens.",
      panels: ["navigationDestinations", "deviceMix", "topPaths"],
    },
    {
      title: "Finish with geography",
      subtitle: "Check location only after you know traffic quality, so demand by place is easier to interpret.",
      panels: ["regions"],
    },
  ],
  commerce: [
    {
      title: "Start with revenue quality",
      subtitle: "Begin with the top-level commerce state before breaking into packs, content, and viewer behavior.",
      panels: ["commerceSnapshot", "packagePerformance", "contentConversion"],
    },
    {
      title: "Then inspect drop demand",
      subtitle: "These panels tell you which specific drops and transactions are driving the commercial story.",
      panels: ["topDropConversion", "recentCommerceFeed"],
    },
    {
      title: "Finish with post-unlock depth",
      subtitle: "Use viewer and watch-depth panels to understand whether the content experience is sustaining value after payment.",
      panels: ["viewerDrilldown", "viewerJourney", "watchDepthTags"],
    },
  ],
  security: [
    {
      title: "Start with risk level",
      subtitle: "Check whether the system is broadly healthy or whether a risk spike is driving the tab.",
      panels: ["securityPosture", "flaggedAccounts"],
    },
    {
      title: "Then inspect task health",
      subtitle: "These panels explain whether task assignment, guidance, and completion are behaving as expected.",
      panels: ["dailyTaskPipeline", "taskCompletionSpeed", "taskLeaderboard"],
    },
    {
      title: "Finish with notification behavior",
      subtitle: "Close with the notification funnel to see whether reminder and enablement behavior supports or undermines retention.",
      panels: ["notificationFunnel"],
    },
  ],
} satisfies Record<ViewTab, FlowGroup[]>;

const PANEL_GUIDES = {
  stationSnapshot: {
    summary: "Start here first. This panel is the fastest way to tell whether traffic, revenue, device mix, or risk changed enough to justify a deeper investigation elsewhere.",
    takeaways: ["Open with totals", "Compare mobile share", "Check risk beside revenue"],
    deepDiveTitle: "Go deeper when the headline looks off",
    deepDiveBody: [
      "If users rise without revenue, move next to Journey Funnel or Commerce Snapshot to see where intent is dropping.",
      "If violations rise at the same time as traffic, check Security Posture before trusting conversion movement at face value.",
    ],
  },
  livePulse: {
    summary: "This panel mixes true realtime activity with selected-range funnel history so you can compare what is happening now against what has been normal for the chosen window.",
    takeaways: ["Realtime is immediate", "Funnel is windowed", "Use it as a sanity check"],
    deepDiveTitle: "How to read the mix correctly",
    deepDiveBody: [
      "GA Active Now and Tracked Users (30m) tell you whether something is currently happening; they are not historical counts.",
      "Onboarding and Purchases in this card follow the selected panel window, so use them to judge whether the current pulse is converting the way it usually does.",
    ],
  },
  journeyFunnel: {
    summary: "Read this top to bottom. Each step shows how many people made it to the next product moment, so large gaps reveal where intent is leaking out.",
    takeaways: ["Follow the drop-off", "Check unlock to checkout", "Use shares and check-ins as side signals"],
    deepDiveTitle: "What large gaps usually mean",
    deepDiveBody: [
      "A big preview-to-viewer gap usually points to friction in the preview experience or weak motivation to continue.",
      "A big unlock-to-checkout gap usually means value is landing, but purchase intent is failing after the content moment.",
    ],
  },
  authOutcomeSplit: {
    summary: "This isolates sign-in and sign-up quality by method, so you can tell whether completion problems belong to Google, email, or another entry path.",
    takeaways: ["Compare success rate", "Watch failure volume", "Use average completion time as friction"],
    deepDiveTitle: "How to interpret method health",
    deepDiveBody: [
      "A low success rate with normal attempts usually means the method is available but failing during completion.",
      "A long average duration with okay success usually means users are hesitating, retrying, or hitting extra prompts before finishing.",
    ],
  },
  onboardingVelocity: {
    summary: "This is your onboarding completion quality panel. It shows how many people started, how many finished, and where time is being spent in the guided flow.",
    takeaways: ["Watch starts vs completions", "Use step timings", "Check the data source chip"],
    deepDiveTitle: "Best way to use this panel",
    deepDiveBody: [
      "If completion rate falls, inspect the step cards first to find the slowest or least-finished stage.",
      "If the source chip shows fallback coverage, treat start counts more cautiously and lean on completions plus duration buckets.",
    ],
  },
  eventMix: {
    summary: "This tells you which tracked behaviors dominate the selected range, so you can tell whether the app is being used more for discovery, commerce, viewing, or system actions.",
    takeaways: ["Use for behavior share", "Spot unusual event spikes", "Cross-check against feature launches"],
    deepDiveTitle: "When this panel matters most",
    deepDiveBody: [
      "Use it after product changes or campaigns to confirm that the expected user actions actually became a larger share of activity.",
      "If one event suddenly dominates, compare it with the relevant funnel panel to see whether the spike is healthy or just noisy.",
    ],
  },
  liveInteractionStream: {
    summary: "This is the raw recent interaction feed. It helps you see what people are actually doing on the site without leaving the dashboard.",
    takeaways: ["Use for recency", "Watch paths and targets", "Best for debugging user behavior"],
    deepDiveTitle: "How to use the stream efficiently",
    deepDiveBody: [
      "Look for repeated actions on the same path to spot loops, hesitation, or users hunting for a control.",
      "Use the details here to validate whether a spike in another panel corresponds to real user movement or just background noise.",
    ],
  },
  serverTelemetryHealth: {
    summary: "This is the backend confidence layer for analytics. It tells you whether the runtime, diagnostics, and materializers are healthy enough for the dashboard to be trusted.",
    takeaways: ["Check score first", "Watch failures", "Use before diagnosing missing data"],
    deepDiveTitle: "How to treat a weak health score",
    deepDiveBody: [
      "If health is degraded, missing or stale panels may be a pipeline problem rather than a product problem.",
      "Use this before chasing data gaps, especially when a panel suddenly empties without a matching product explanation.",
    ],
  },
  coverageEngine: {
    summary: "Coverage answers a simple question: which analytics modules actually populated for this range, and which ones are partial or empty.",
    takeaways: ["Use for trust", "Watch empty modules", "Confirm parity before reporting"],
    deepDiveTitle: "When to drill deeper here",
    deepDiveBody: [
      "A partial or empty module means the dashboard may still render, but that slice should be treated as incomplete.",
      "Use the unhealthy list before sharing reports externally so you do not summarize a window with known gaps.",
    ],
  },
  categorySemantics: {
    summary: "This groups behavior by semantic intent, helping you see whether time is being spent on discovery, engagement, commerce, onboarding, or return actions.",
    takeaways: ["Use for intent mix", "Compare category watch time", "Spot demand shifts fast"],
    deepDiveTitle: "What semantic changes usually reveal",
    deepDiveBody: [
      "If commerce semantics rise without matching revenue, users are showing intent but not completing payment or unlock flows.",
      "If engagement dominates while discovery falls, current users may be consuming content well but new entry points may be underperforming.",
    ],
  },
  creatorMetrics: {
    summary: "This is a creator-side signal health panel. It shows whether the tracked creator and social-style metrics are landing consistently enough to trust.",
    takeaways: ["Read as signal quality", "Compare categories", "Use for creator reporting confidence"],
    deepDiveTitle: "How to use this in practice",
    deepDiveBody: [
      "Healthy categories mean you can trust creator-facing trend summaries; partial or empty categories mean those reads are incomplete.",
      "Use the category breakdown to see whether the issue is isolated to one source or broad across the creator signal set.",
    ],
  },
  semanticsEngine: {
    summary: "This panel explains how semantic analytics are being resolved under the hood, so admins can understand which source and strategy produced the grouped results above.",
    takeaways: ["Read for attribution", "Check strategy usage", "Validate interpretation rules"],
    deepDiveTitle: "Why this panel exists",
    deepDiveBody: [
      "If category summaries look surprising, use this panel to see which semantic strategies actually classified the events.",
      "It is most useful when validating new analytics changes or explaining why a category total moved unexpectedly.",
    ],
  },
  dataValidation: {
    summary: "Validation is the dashboard’s self-check. It highlights parity or completeness issues that could make a polished chart misleading.",
    takeaways: ["Read before reporting", "Watch warnings", "Use failure text to target fixes"],
    deepDiveTitle: "How to act on failures",
    deepDiveBody: [
      "A warning usually means the panel is usable with caution; a fail means the underlying data source relationship is actively broken.",
      "Use the detailed copy here to decide whether the issue belongs to ingestion, materialization, or historical aggregation.",
    ],
  },
  audienceSnapshot: {
    summary: "This is the broad audience health panel. Use it to understand how many people showed up, how many were new, and how deeply they engaged over the selected range.",
    takeaways: ["Start with total users", "Check new vs returning", "Use engagement for quality"],
    deepDiveTitle: "Where to look next from here",
    deepDiveBody: [
      "If audience volume changes sharply, move to Return Cadence, Top Paths, and Regions to explain who changed and where they came from.",
      "If engagement falls while users rise, the traffic mix may have widened faster than the product experience can retain.",
    ],
  },
  returnCadence: {
    summary: "This shows how often people come back, which is useful for telling the difference between one-time spikes and genuinely sticky behavior.",
    takeaways: ["Watch repeat share", "Use for stickiness", "Pair with audience volume"],
    deepDiveTitle: "How to read return quality",
    deepDiveBody: [
      "If first-time volume rises but repeat cadence does not, growth may be top-of-funnel only.",
      "If repeat segments rise while total users stay flat, the product may be deepening with the existing audience rather than expanding outward.",
    ],
  },
  navigationDestinations: {
    summary: "This panel tells you where tracked taps actually send people, making it easier to judge whether navigation intent lines up with the content you expected to win.",
    takeaways: ["Read for destination demand", "Use after CTA changes", "Look for misaligned traffic"],
    deepDiveTitle: "What to look for in destination shifts",
    deepDiveBody: [
      "A destination that climbs without matching downstream engagement may be attracting taps but not satisfying intent.",
      "A destination that falls after a UI update can explain why another funnel suddenly looks weaker.",
    ],
  },
  deviceMix: {
    summary: "Device mix shows which device categories are carrying usage and whether engagement quality differs by screen type.",
    takeaways: ["Check mobile first", "Compare sessions", "Use engagement rate as quality"],
    deepDiveTitle: "Why device mix matters",
    deepDiveBody: [
      "If mobile share rises, compare mobile-facing panels and UX before assuming the whole funnel changed for everyone.",
      "A weaker engagement rate on one device type usually points to UI friction rather than content demand.",
    ],
  },
  topPaths: {
    summary: "Top Paths answers the simple question: where are people actually spending their visits, and which pages hold attention best.",
    takeaways: ["Use for demand concentration", "Check dwell quality", "Find the true traffic winners"],
    deepDiveTitle: "How to read the path list",
    deepDiveBody: [
      "High views with low time usually signal skim traffic or weak landing relevance.",
      "High views with stronger time or engagement usually indicate pages worth promoting harder or learning from.",
    ],
  },
  regions: {
    summary: "Regions highlights where demand is coming from geographically so you can identify unexpected pockets of traffic or underserved markets.",
    takeaways: ["Watch top cities", "Compare relative demand", "Use for launch timing clues"],
    deepDiveTitle: "Best uses for this panel",
    deepDiveBody: [
      "Use it after campaigns or creator pushes to confirm that traffic landed where you expected.",
      "If a new city appears suddenly, compare it with drop launches, referrals, or external promotion before calling it organic growth.",
    ],
  },
  commerceSnapshot: {
    summary: "This is the fastest revenue quality read in the dashboard. It brings revenue, profit, Gum Drop movement, and purchase funnel health into one view.",
    takeaways: ["Start with revenue", "Check profit next", "Use funnel counts to explain performance"],
    deepDiveTitle: "How to interpret a weak commerce day",
    deepDiveBody: [
      "If revenue is down but wallet opens are stable, users may still be interested but dropping before checkout or completion.",
      "If delivered Gum Drops rise faster than profit, promotional or bonus activity may be outpacing paid demand.",
    ],
  },
  packagePerformance: {
    summary: "Package Performance compares each wallet pack by starts, purchases, abandonment, and realized revenue so you can see which offer shapes are actually working.",
    takeaways: ["Compare conversion", "Watch abandonment", "Use revenue and starts together"],
    deepDiveTitle: "What strong vs weak packs look like",
    deepDiveBody: [
      "A pack with many starts but weak purchases is attracting interest but losing confidence before completion.",
      "A pack with fewer starts but higher conversion may be more persuasive once reached, even if it is not the most visible option.",
    ],
  },
  contentConversion: {
    summary: "This panel compares previews to unwraps by content type, which helps you see which content formats attract curiosity and which ones actually convert.",
    takeaways: ["Use unlock rate", "Compare preview appetite", "Spot content mismatch"],
    deepDiveTitle: "How to use content conversion",
    deepDiveBody: [
      "High previews with low unwraps usually mean the concept is interesting but the value proposition is not landing.",
      "High unwrap rates on a smaller preview base can point to niche content that converts extremely well once seen.",
    ],
  },
  topDropConversion: {
    summary: "This isolates the individual drops doing the most work so you can see which specific experiences are driving views versus actual unlock demand.",
    takeaways: ["Compare views to unlocks", "Find over-performing drops", "Use for content prioritization"],
    deepDiveTitle: "What to watch in drop-level conversion",
    deepDiveBody: [
      "A high-view, low-unlock drop may be a discovery winner but a conversion miss.",
      "A lower-view, high-unlock drop is often a strong candidate for promotion because intent is already proven.",
    ],
  },
  recentCommerceFeed: {
    summary: "This is the inline recent commerce feed, useful for quickly validating whether transaction activity matches what the summary cards are saying.",
    takeaways: ["Use for recency", "Spot unusual transaction types", "Confirm the summary with real examples"],
    deepDiveTitle: "When to rely on the feed",
    deepDiveBody: [
      "Use it when summary totals move suddenly and you need to see whether the underlying events look normal.",
      "The feed is especially helpful for checking whether a spike came from repeated small transactions or a handful of large ones.",
    ],
  },
  viewerDrilldown: {
    summary: "Viewer Drilldown is the main content-consumption quality panel. It shows how deeply people engage once they have unlocked content.",
    takeaways: ["Watch watch time", "Compare unique viewers", "Use load time and completion together"],
    deepDiveTitle: "How to diagnose content quality here",
    deepDiveBody: [
      "If views are high but watch time or completion is low, the content is being opened more than it is being consumed.",
      "If load time rises while completion falls, playback friction may be dragging down otherwise strong content interest.",
    ],
  },
  viewerJourney: {
    summary: "This panel shows what people actually do inside the viewer, making it easier to tell whether they watch through, switch assets, or leave early.",
    takeaways: ["Read sequence behavior", "Use for viewer UX tuning", "Watch switch and completion balance"],
    deepDiveTitle: "What the journey tells you",
    deepDiveBody: [
      "Frequent switching can mean the asset set is interesting, but it can also signal users are searching for the one file they really want.",
      "A healthy journey usually shows both starts and meaningful completion, not just repeated opens.",
    ],
  },
  watchDepthTags: {
    summary: "Watch depth and tags help explain not just what gets opened, but what kinds of content people stay with once they are inside.",
    takeaways: ["Use bucket depth", "Check top tags", "Find durable demand"],
    deepDiveTitle: "How to use depth plus tags together",
    deepDiveBody: [
      "If a tag gets many starts but shallow depth, it may be curiosity-driven more than satisfying.",
      "Tags that show both strong demand and deep watch time are usually the most reliable candidates for future expansion.",
    ],
  },
  securityPosture: {
    summary: "Security Posture is the top-level risk view. It pairs flagged-account activity with related usage signals so you can judge whether risk is isolated or intertwined with normal demand.",
    takeaways: ["Start with violation count", "Compare flagged users", "Use engagement context"],
    deepDiveTitle: "How to interpret risk with context",
    deepDiveBody: [
      "If violations rise while normal experience views remain flat, risk may be concentrated rather than broad-based.",
      "If violations rise alongside broader viewer activity, check whether a specific drop or traffic source is attracting abuse.",
    ],
  },
  dailyTaskPipeline: {
    summary: "This panel tracks the task system from guide exposure through completion, so you can see whether tasks are being seen, tapped, and actually finished.",
    takeaways: ["Watch guide taps", "Compare taps to wins", "Use it for task UX health"],
    deepDiveTitle: "How to diagnose task friction",
    deepDiveBody: [
      "High guide views with low taps usually mean the prompt is visible but not persuasive.",
      "High taps with low completions usually mean the task intent is clear, but the downstream action is breaking or too heavy.",
    ],
  },
  taskCompletionSpeed: {
    summary: "This shows how quickly completed tasks finish, helping you spot missions that are either too trivial or too demanding for the daily loop.",
    takeaways: ["Use for pacing", "Watch long-tail tasks", "Pair with leaderboard data"],
    deepDiveTitle: "What duration buckets reveal",
    deepDiveBody: [
      "Very fast completions usually indicate low-friction or passive tasks.",
      "A heavy long-tail bucket usually means one or more tasks are creating too much effort relative to their reward or clarity.",
    ],
  },
  taskLeaderboard: {
    summary: "The leaderboard compares tasks by starts, completions, reward payout, and average duration so you can see which missions really drive behavior.",
    takeaways: ["Compare completion rate", "Use reward totals carefully", "Watch average duration"],
    deepDiveTitle: "How to rank tasks the right way",
    deepDiveBody: [
      "A task can pay out a lot simply because it is assigned often; completion rate and average duration tell you whether it is actually healthy.",
      "The best performers usually balance strong completion with reasonable duration and clear player value.",
    ],
  },
  notificationFunnel: {
    summary: "This panel shows how people move from prompt to permission to open and read, plus why reminders are being sent.",
    takeaways: ["Start with enablement", "Check opens and reads", "Use reminder reasons as context"],
    deepDiveTitle: "How to read notification performance",
    deepDiveBody: [
      "If prompts are shown often but enablement stays weak, the ask or timing likely needs work.",
      "If reminders are sent but reads stay flat, delivery may be happening without enough message relevance or urgency.",
    ],
  },
  flaggedAccounts: {
    summary: "This is the account-level risk list for manual review. Use it when Security Posture tells you the risk is real and you need to see who is involved.",
    takeaways: ["Use for triage", "Check repeat offenders", "Pair with violation reason"],
    deepDiveTitle: "Best way to use the flagged list",
    deepDiveBody: [
      "Start with the accounts showing the most attempts or the most recent activity, especially if they map to the same drop or pattern.",
      "This panel is for investigation, not trend reading; treat it as the follow-up step after broader risk panels move.",
    ],
  },
} satisfies Record<HistoricalSectionId, PanelGuideContent>;

const HISTORICAL_SECTION_IDS_BY_TAB: Record<ViewTab, HistoricalSectionId[]> = {
  operations: [
    "stationSnapshot",
    "livePulse",
    "journeyFunnel",
    "authOutcomeSplit",
    "onboardingVelocity",
    "eventMix",
    "liveInteractionStream",
    "serverTelemetryHealth",
    "coverageEngine",
    "categorySemantics",
    "creatorMetrics",
    "semanticsEngine",
    "dataValidation",
  ],
  audience: ["audienceSnapshot", "returnCadence", "navigationDestinations", "deviceMix", "topPaths", "regions"],
  commerce: ["commerceSnapshot", "packagePerformance", "contentConversion", "topDropConversion", "recentCommerceFeed", "viewerDrilldown", "viewerJourney", "watchDepthTags"],
  security: ["securityPosture", "dailyTaskPipeline", "taskCompletionSpeed", "taskLeaderboard", "notificationFunnel", "flaggedAccounts"],
};

const ALL_HISTORICAL_SECTION_IDS: HistoricalSectionId[] = [
  "stationSnapshot",
  "livePulse",
  "journeyFunnel",
  "authOutcomeSplit",
  "onboardingVelocity",
  "eventMix",
  "liveInteractionStream",
  "serverTelemetryHealth",
  "coverageEngine",
  "categorySemantics",
  "creatorMetrics",
  "semanticsEngine",
  "dataValidation",
  "audienceSnapshot",
  "returnCadence",
  "navigationDestinations",
  "deviceMix",
  "topPaths",
  "regions",
  "commerceSnapshot",
  "packagePerformance",
  "contentConversion",
  "topDropConversion",
  "recentCommerceFeed",
  "viewerDrilldown",
  "viewerJourney",
  "watchDepthTags",
  "securityPosture",
  "dailyTaskPipeline",
  "taskCompletionSpeed",
  "taskLeaderboard",
  "notificationFunnel",
  "flaggedAccounts",
];

function buildSectionRangeState(defaultRange: RangeOption): Record<HistoricalSectionId, RangeOption> {
  return Object.fromEntries(
    ALL_HISTORICAL_SECTION_IDS.map((sectionId) => [sectionId, defaultRange]),
  ) as Record<HistoricalSectionId, RangeOption>;
}

function buildHistoricalOverrideKey(sectionId: HistoricalSectionId, period: RangeOption, viewerUserFilter: string) {
  return `${sectionId}::${period}::${viewerUserFilter.trim().toLowerCase() || "__all__"}`;
}

function filterOptionLabel(value: RangeOption) {
  return RANGE_OPTIONS.find((option) => option.value === value)?.label || value.toUpperCase();
}

function AnalyticsTooltip({ active, payload, label, valueFormatter }: AnalyticsTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/90 p-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`${entry.name}-${index}`} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}</span>
            </div>
            <span className="font-semibold text-white">
              {valueFormatter ? valueFormatter(entry.value ?? 0, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompactPreviewList({
  items,
  columns = 2,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "accent" }>;
  columns?: 1 | 2 | 3;
}) {
  return (
    <div className={cn("grid gap-2", columns === 1 ? "grid-cols-1" : columns === 3 ? "md:grid-cols-3" : "md:grid-cols-2")}>
      {items.map((item) => (
        <div key={`${item.label}-${item.value}`} className="rounded-[1.25rem] border border-white/10 bg-black/25 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">{item.label}</p>
          <p className={cn("mt-1 text-sm font-semibold text-white", item.tone === "accent" ? "text-brand-purple" : undefined)}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function RangeFilterControl({
  title,
  value,
  options,
  onChange,
  compactViewport,
}: {
  title: string;
  value: RangeOption;
  options: Array<{ value: RangeOption; label: string }>;
  onChange: (nextRange: RangeOption) => void;
  compactViewport: boolean;
}) {
  if (compactViewport) {
    return (
      <label className="block md:hidden">
        <span className="sr-only">{title} range</span>
        <div className="relative">
          <select
            value={value}
            onChange={(event) => onChange(event.target.value as RangeOption)}
            className="min-h-11 w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-11 text-sm font-semibold text-white outline-none transition-colors focus:border-brand-purple/40"
            aria-label={`${title} time range`}
          >
            {options.map((option) => (
              <option key={`${title}-${option.value}`} value={option.value} className="bg-zinc-950 text-white">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-purple" />
        </div>
      </label>
    );
  }

  return (
    <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
      {options.map((option) => (
        <button
          key={`${title}-${option.value}`}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
            value === option.value
              ? "border-white bg-white text-black"
              : "border-white/10 bg-white/5 text-gray-400 hover:border-brand-purple/30 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SectionGuide({ guide }: { guide: PanelGuideContent }) {
  const [isDeepReadOpen, setIsDeepReadOpen] = useState(false);

  return (
    <div className="mb-4 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            <FileText className="h-3.5 w-3.5 text-brand-purple" />
            <span>How To Read This Panel</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-gray-300">{guide.summary}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsDeepReadOpen((current) => !current)}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/10"
          aria-expanded={isDeepReadOpen}
        >
          <span>{isDeepReadOpen ? "Hide deeper view" : "Tap to go deeper"}</span>
          {isDeepReadOpen ? <ChevronUp className="h-4 w-4 text-brand-purple" /> : <ChevronDown className="h-4 w-4 text-brand-purple" />}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {guide.takeaways.map((item) => (
          <span key={item} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">
            {item}
          </span>
        ))}
      </div>

      {isDeepReadOpen ? (
        <div className="mt-4 rounded-[1.25rem] border border-brand-purple/20 bg-brand-purple/[0.08] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-purple">{guide.deepDiveTitle}</p>
          <ul className="mt-3 space-y-2 pl-5 text-sm leading-6 text-gray-200">
            {guide.deepDiveBody.map((item) => (
              <li key={item} className="list-disc marker:text-brand-purple">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function getPanelAnchorId(panelId: HistoricalSectionId) {
  return `analytics-panel-${panelId}`;
}

function FlowNavigator({
  tab,
  compactViewport,
}: {
  tab: ViewTab;
  compactViewport: boolean;
}) {
  const groups = FLOW_GROUPS_BY_TAB[tab];

  const jumpToPanel = useCallback((panelId: HistoricalSectionId) => {
    const element = document.getElementById(getPanelAnchorId(panelId));
    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: compactViewport ? "start" : "center",
    });
  }, [compactViewport]);

  return (
    <section className="rounded-[1.8rem] border border-white/10 bg-black/35 p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">Recommended Flow</p>
          <h2 className="mt-2 text-lg font-bold text-white">Read this tab in order</h2>
          <p className="mt-1 text-sm text-gray-400">
            Each step keeps the same data, but makes the page easier to navigate by telling you what to read first, what explains it, and what validates it.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">
          {groups.reduce((sum, group) => sum + group.panels.length, 0)} panels in this tab
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        {groups.map((group, index) => (
          <div key={`${tab}-${group.title}`} className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-brand-purple/25 bg-brand-purple/12 text-sm font-bold text-brand-purple">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{group.title}</p>
                <p className="text-xs text-gray-500">{group.panels.length} linked panels</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-300">{group.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.panels.map((panelId) => (
                <button
                  key={panelId}
                  type="button"
                  onClick={() => jumpToPanel(panelId)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/10"
                >
                  <Route className="h-3.5 w-3.5 text-brand-purple" />
                  <span>{PANEL_LABELS[panelId]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionCard({
  panelId,
  sectionRange,
  onSectionRangeChange,
  rangeOptions = SECTION_FILTER_OPTIONS,
  loading = false,
  title,
  subtitle,
  icon: Icon,
  children,
  className,
  rightSlot,
  collapsedPreview,
  defaultExpanded = false,
}: SectionCardProps) {
  const compactViewport = useCompactViewport();
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null);
  const hasSectionFilter = Boolean(sectionRange && onSectionRangeChange);
  const isExpanded = manualExpanded ?? defaultExpanded;
  const panelGuide = panelId ? PANEL_GUIDES[panelId] : null;

  return (
    <section
      id={panelId ? getPanelAnchorId(panelId) : undefined}
      className={cn("glass-panel rounded-[2rem] border border-white/10 p-4 md:p-6", className)}
    >
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-brand-purple">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-bold text-white md:text-xl">{title}</h2>
            </div>
            {subtitle ? <p className="text-sm text-gray-400">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {rightSlot}
            {loading ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-purple" />
                Syncing
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setManualExpanded((current) => !(current ?? defaultExpanded));
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-brand-purple/40 hover:bg-brand-purple/10"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${title}`}
            >
              <span>{isExpanded ? "Collapse panel" : "Expand panel"}</span>
              {isExpanded ? <ChevronUp className="h-4 w-4 text-brand-purple" /> : <ChevronDown className="h-4 w-4 text-brand-purple" />}
            </button>
          </div>
        </div>
        {hasSectionFilter && sectionRange ? (
          <RangeFilterControl
            title={title}
            value={sectionRange}
            options={rangeOptions}
            onChange={(nextRange) => onSectionRangeChange?.(nextRange)}
            compactViewport={compactViewport}
          />
        ) : null}
      </div>
      {isExpanded ? (
        <>
          {panelGuide ? <SectionGuide guide={panelGuide} /> : null}
          {children}
        </>
      ) : collapsedPreview ?? (
        <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-black/20 px-4 py-4 text-sm text-gray-500">
          Tap the arrow button above to expand this panel.
        </div>
      )}
    </section>
  );
}

function MetricCard({ label, value, hint, icon: Icon, className, valueClassName }: MetricCardProps) {
  return (
    <div className={cn("rounded-[1.6rem] border border-white/10 bg-black/30 p-4", className)}>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
        <Icon className="h-3.5 w-3.5 text-brand-purple" />
        <span>{label}</span>
      </div>
      <div className={cn("text-2xl font-black tracking-tight text-white", valueClassName)}>{value}</div>
      {hint ? <p className="mt-2 text-xs text-gray-400">{hint}</p> : null}
    </div>
  );
}

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value < 1000 ? 0 : 1,
  }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function formatDataSourceLabel(source: "tracked" | "completion_fallback" | "none"): string {
  if (source === "tracked") return "Direct starts";
  if (source === "completion_fallback") return "Completion fallback";
  return "No starts";
}

function formatRelativeTime(timestamp: number, nowMs: number): string {
  const diff = Math.max(0, nowMs - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDateTime(timestamp: number): string {
  if (!timestamp) return "Never";
  return new Date(timestamp).toLocaleString();
}

function getValidationClasses(status: ValidationItem["status"]) {
  if (status === "pass") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "fail") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function getModuleCoverageClasses(status: ModuleCoverageItem["status"]) {
  if (status === "healthy") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "empty") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function getMetricStatusClasses(status: SocialMetricItem["status"]) {
  if (status === "healthy") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "empty") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function getOpsHealthClasses(status: AdminOpsHealthStatus) {
  if (status === "healthy") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  }

  if (status === "fail") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-200";
}

function getSeverityClasses(severity: AdminOpsHealthSeverity) {
  if (severity === "error") {
    return "border-red-500/20 bg-red-500/10 text-red-200";
  }

  if (severity === "warn") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

function describeEvent(event: RawEventItem): string {
  if (event.detail) return event.detail;
  if (event.type === "scroll") return `Scrolled to ${event.scrollDepthPercent ?? 0}% depth`;
  if (event.type === "click") return `Clicked ${event.targetText || event.targetId || event.targetTag || "element"}`;
  if (event.type === "hover") return `Hovered ${event.targetText || event.targetId || event.targetTag || "element"}`;
  return resolveRawInteractionLabel(event.type);
}

function getDeviceIcon(device: string) {
  return device.toLowerCase() === "mobile" ? Smartphone : Monitor;
}

function isRecentViolation(timestamp: string | null, nowMs: number): boolean {
  if (!timestamp) return false;
  const diffMs = nowMs - new Date(timestamp).getTime();
  return diffMs < 24 * 60 * 60 * 1000;
}

export default function AdminAnalyticsPage() {
  const isCompactViewport = useCompactViewport();
  const [activeTab, setActiveTab] = useState<ViewTab>("operations");
  const [range, setRange] = useState<RangeOption>("30d");
  const [nowMs, setNowMs] = useState(INITIAL_ANALYTICS_NOW);
  const [viewerUserDraft, setViewerUserDraft] = useState("");
  const [viewerUserFilter, setViewerUserFilter] = useState("");
  const [sectionRanges, setSectionRanges] = useState<Record<HistoricalSectionId, RangeOption>>(() => buildSectionRangeState("30d"));
  const [historicalOverrides, setHistoricalOverrides] = useState<Record<string, HistoricalOverrideEntry>>({});
  const liveRefreshTimeoutRef = useRef<number | null>(null);
  const historicalRefreshTimeoutRef = useRef<number | null>(null);
  const historicalOverridesRef = useRef<Record<string, HistoricalOverrideEntry>>({});
  const historicalOverrideRequestsRef = useRef<Map<string, Promise<void>>>(new Map());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const {
    data: liveResponse,
    error: liveError,
    isLoading: liveLoading,
    mutate: refreshLive,
  } = useAuthSWR<RealtimeAnalyticsResponse>("/api/admin/analytics/realtime", {
    refreshInterval: 12_000,
    keepPreviousData: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 1_000,
  });

  const {
    data: historicalResponse,
    error: historicalError,
    isLoading: historicalLoading,
    mutate: refreshHistorical,
  } = useAuthSWR<HistoricalAnalyticsResponse>(
    `/api/admin/analytics/historical?period=${range}${viewerUserFilter ? `&viewerUser=${encodeURIComponent(viewerUserFilter)}` : ""}`,
    {
    refreshInterval: 20_000,
    keepPreviousData: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2_000,
    },
  );

  useEffect(() => {
    historicalOverridesRef.current = historicalOverrides;
  }, [historicalOverrides]);

  const fetchHistoricalOverride = useCallback(async (sectionId: HistoricalSectionId, period: RangeOption, viewerFilterValue: string, force = false) => {
    const key = buildHistoricalOverrideKey(sectionId, period, viewerFilterValue);
    const existingEntry = historicalOverridesRef.current[key];
    const staleAfterMs = period === "24h" || period === "3d" ? 15_000 : 25_000;

    if (!force && existingEntry?.fetchedAt && (Date.now() - existingEntry.fetchedAt) < staleAfterMs) {
      return;
    }

    const inFlightRequest = historicalOverrideRequestsRef.current.get(key);
    if (inFlightRequest) {
      await inFlightRequest;
      return;
    }

    setHistoricalOverrides((current) => ({
      ...current,
      [key]: {
        data: current[key]?.data,
        error: undefined,
        fetchedAt: current[key]?.fetchedAt ?? 0,
        isLoading: true,
      },
    }));

    const requestPromise = (async () => {
      try {
        const response = await authFetch(
          `/api/admin/analytics/historical?period=${period}&section=${sectionId}${viewerFilterValue ? `&viewerUser=${encodeURIComponent(viewerFilterValue)}` : ""}`,
        );
        const result = await response.json() as HistoricalAnalyticsResponse;

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to load analytics");
        }

        setHistoricalOverrides((current) => ({
          ...current,
          [key]: {
            data: result,
            error: undefined,
            fetchedAt: Date.now(),
            isLoading: false,
          },
        }));
      } catch (error) {
        setHistoricalOverrides((current) => ({
          ...current,
          [key]: {
            data: current[key]?.data,
            error: error instanceof Error ? error.message : String(error),
            fetchedAt: Date.now(),
            isLoading: false,
          },
        }));
      } finally {
        historicalOverrideRequestsRef.current.delete(key);
      }
    })();

    historicalOverrideRequestsRef.current.set(key, requestPromise);
    await requestPromise;
  }, []);

  const visibleSectionIds = useMemo(
    () => HISTORICAL_SECTION_IDS_BY_TAB[activeTab],
    [activeTab],
  );

  const activeOverrideTargets = useMemo(() => {
    const seen = new Set<string>();
    const targets: Array<{ key: string; sectionId: HistoricalSectionId; period: RangeOption; viewerFilterValue: string }> = [];

    visibleSectionIds.forEach((sectionId) => {
      const sectionRange = sectionRanges[sectionId] ?? range;
      if (sectionRange === range) {
        return;
      }

      const key = buildHistoricalOverrideKey(sectionId, sectionRange, viewerUserFilter);
      if (seen.has(key)) {
        return;
      }

      seen.add(key);
      targets.push({ key, sectionId, period: sectionRange, viewerFilterValue: viewerUserFilter });
    });

    return targets;
  }, [range, sectionRanges, viewerUserFilter, visibleSectionIds]);

  useEffect(() => {
    activeOverrideTargets.forEach((target) => {
      void fetchHistoricalOverride(target.sectionId, target.period, target.viewerFilterValue);
    });
  }, [activeOverrideTargets, fetchHistoricalOverride]);

  useEffect(() => {
    const refreshVisibleOverrides = () => {
      activeOverrideTargets.forEach((target) => {
        void fetchHistoricalOverride(target.sectionId, target.period, target.viewerFilterValue, true);
      });
    };

    const intervalId = window.setInterval(refreshVisibleOverrides, 30_000);
    window.addEventListener("focus", refreshVisibleOverrides);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshVisibleOverrides);
    };
  }, [activeOverrideTargets, fetchHistoricalOverride]);

  const handleApplyRangeToAllSections = useCallback((nextRange: RangeOption) => {
    setRange(nextRange);
    setSectionRanges(buildSectionRangeState(nextRange));
  }, []);

  const handleSectionRangeChange = useCallback((sectionId: HistoricalSectionId, nextRange: RangeOption) => {
    setSectionRanges((current) => ({
      ...current,
      [sectionId]: nextRange,
    }));
  }, []);

  const getHistoricalResponseForSection = useCallback((sectionId: HistoricalSectionId) => {
    const sectionRange = sectionRanges[sectionId] ?? range;
    if (sectionRange === range) {
      return historicalResponse;
    }

    return historicalOverrides[buildHistoricalOverrideKey(sectionId, sectionRange, viewerUserFilter)]?.data;
  }, [historicalOverrides, historicalResponse, range, sectionRanges, viewerUserFilter]);

  const getSectionRangeValue = useCallback((sectionId: HistoricalSectionId) => {
    return sectionRanges[sectionId] ?? range;
  }, [range, sectionRanges]);

  const isSectionLoading = useCallback((sectionId: HistoricalSectionId) => {
    const sectionRange = sectionRanges[sectionId] ?? range;
    if (sectionRange === range) {
      return historicalLoading;
    }

    return historicalOverrides[buildHistoricalOverrideKey(sectionId, sectionRange, viewerUserFilter)]?.isLoading ?? false;
  }, [historicalLoading, historicalOverrides, range, sectionRanges, viewerUserFilter]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let sawInitialSnapshot = false;
    const liveTimeoutRef = liveRefreshTimeoutRef;
    const historyTimeoutRef = historicalRefreshTimeoutRef;

    const scheduleRealtimeRefresh = (ref: { current: number | null }, delayMs: number, callback: () => void) => {
      if (ref.current !== null) {
        return;
      }

      ref.current = window.setTimeout(() => {
        ref.current = null;
        callback();
      }, delayMs);
    };

    async function subscribeToAnalyticsRuntime() {
      try {
        const [{ doc, onSnapshot }, { db }] = await Promise.all([
          import("firebase/firestore"),
          import("@/lib/firebase-data"),
        ]);

        if (cancelled) {
          return;
        }

        unsubscribe = onSnapshot(
          doc(db, ANALYTICS_RUNTIME_COLLECTION, ANALYTICS_RUNTIME_DOC_ID),
          () => {
            if (!sawInitialSnapshot) {
              sawInitialSnapshot = true;
              return;
            }

            scheduleRealtimeRefresh(liveTimeoutRef, 1_250, () => {
              void refreshLive();
            });
            scheduleRealtimeRefresh(historyTimeoutRef, 3_500, () => {
              void refreshHistorical();
              activeOverrideTargets.forEach((target) => {
                void fetchHistoricalOverride(target.sectionId, target.period, target.viewerFilterValue, true);
              });
            });
          },
          (error) => {
            recordClientDiagnostic("realtime", "Admin analytics runtime subscription failed", {
              message: error.message,
            });
          },
        );
      } catch (error) {
        if (!cancelled) {
          recordClientDiagnostic("firebase", "Admin analytics runtime setup failed", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    void subscribeToAnalyticsRuntime();

    return () => {
      cancelled = true;
      if (liveTimeoutRef.current !== null) {
        window.clearTimeout(liveTimeoutRef.current);
        liveTimeoutRef.current = null;
      }
      if (historyTimeoutRef.current !== null) {
        window.clearTimeout(historyTimeoutRef.current);
        historyTimeoutRef.current = null;
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [activeOverrideTargets, fetchHistoricalOverride, refreshHistorical, refreshLive]);

  const liveSeries = useMemo(
    () =>
      (liveResponse?.data ?? []).map((point) => ({
        ...point,
        label: point.minute === 0 ? "Now" : `${point.minute}m`,
      })),
    [liveResponse],
  );

  const historySeries = historicalResponse?.data ?? [];
  const totals = historicalResponse?.totals ?? {
    users: 0,
    views: 0,
    sessions: 0,
    newUsers: 0,
    avgSessionDuration: 0,
    engagementRate: 0,
  };
  const eventBreakdown = historicalResponse?.eventBreakdown ?? [];
  const eventsData = historicalResponse?.events ?? {};
  const funnel = historicalResponse?.funnel ?? {
    authModalOpens: 0,
    authSignIns: 0,
    authSignUps: 0,
    previewOpens: 0,
    viewerOpens: 0,
    assetSwitches: 0,
    unlocks: 0,
    shares: 0,
    walletOpens: 0,
    checkoutStarts: 0,
    purchases: 0,
    checkIns: 0,
    experienceViews: 0,
  };
  const devices = historicalResponse?.devices ?? [];
  const pages = historicalResponse?.pages ?? [];
  const geo = historicalResponse?.geo ?? [];
  const topDrops = historicalResponse?.topDrops ?? [];
  const commerce = historicalResponse?.commerce ?? {
    revenueUsd: 0,
    adjustedProfitUsd: 0,
    bonusValueUsd: 0,
    deliveredGumDrops: 0,
    bonusGumDrops: 0,
    effectiveUsdPer100Gd: 0,
    gdSpent: 0,
    feed: [],
  };
  const security = historicalResponse?.security ?? [];
  const rawEvents = historicalResponse?.rawEvents ?? [];
  const onboardingStats = historicalResponse?.onboardingStats ?? {
    starts: 0,
    completions: 0,
    avgDuration: 0,
    completionRate: 0,
    startSource: "none" as const,
  };
  const onboardingStepStats = historicalResponse?.onboardingStepStats ?? [];
  const authBreakdown = historicalResponse?.authBreakdown ?? [];
  const onboardingDurationBuckets = historicalResponse?.onboardingDurationBuckets ?? [];
  const repeatVisitSegments = historicalResponse?.repeatVisitSegments ?? [];
  const destinationMix = historicalResponse?.destinationMix ?? [];
  const notificationFunnel = historicalResponse?.notificationFunnel ?? [];
  const notificationActions = historicalResponse?.notificationActions ?? [];
  const taskGuidance = historicalResponse?.taskGuidance ?? {
    viewed: 0,
    dismissed: 0,
    tapped: 0,
    completed: 0,
    tapThroughRate: 0,
    guidedCompletionRate: 0,
  };
  const taskPipeline = historicalResponse?.taskPipeline ?? [];
  const taskLeaderboard = historicalResponse?.taskLeaderboard ?? [];
  const taskDurationBuckets = historicalResponse?.taskDurationBuckets ?? [];
  const reminderReasons = historicalResponse?.reminderReasons ?? [];
  const packagePerformance = historicalResponse?.packagePerformance ?? [];
  const unlockCategoryMix = historicalResponse?.unlockCategoryMix ?? [];
  const watchDepthBuckets = historicalResponse?.watchDepthBuckets ?? [];
  const contentJourney = historicalResponse?.contentJourney ?? [];
  const contentTagDemand = historicalResponse?.contentTagDemand ?? [];
  const viewerOverview = historicalResponse?.viewerOverview ?? {
    viewCount: 0,
    sessionCount: 0,
    uniqueViewerCount: 0,
    repeatSessionCount: 0,
    totalWatchSeconds: 0,
    avgSessionSeconds: 0,
    avgWatchSeconds: 0,
    avgLoadMs: 0,
    assetCompletionRate: 0,
    assetSwitches: 0,
    downloads: 0,
    relatedClicks: 0,
  };
  const viewerDropInsights = historicalResponse?.viewerDropInsights ?? [];
  const viewerUsers = historicalResponse?.viewerUsers ?? [];
  const activeViewerFilter = historicalResponse?.viewerFilter ?? viewerUserFilter;
  const semanticCategories = historicalResponse?.semanticCategories ?? [];
  const semanticEngine = historicalResponse?.semanticEngine ?? { sources: [], strategies: [] };
  const socialMetrics = historicalResponse?.socialMetrics ?? {
    version: "unknown",
    metrics: [],
    categories: [],
    overview: {
      total: 0,
      healthy: 0,
      partial: 0,
      empty: 0,
    },
  };
  const moduleCoverage = historicalResponse?.moduleCoverage ?? [];
  const unhealthyModules = historicalResponse?.unhealthyModules ?? [];
  const parityScore = historicalResponse?.parityScore ?? 0;
  const validations = historicalResponse?.validations ?? [];
  const opsHealth = historicalResponse?.opsHealth ?? EMPTY_OPS_HEALTH;

  const needsSetup =
    liveResponse?.requiresSetup ||
    historicalResponse?.requiresSetup ||
    (liveError as { info?: { requiresSetup?: boolean } } | undefined)?.info?.requiresSetup ||
    (historicalError as { info?: { requiresSetup?: boolean } } | undefined)?.info?.requiresSetup;

  const totalDeviceUsers = devices.reduce((sum, item) => sum + item.users, 0);
  const mobileUsers = devices.find((item) => item.device.toLowerCase() === "mobile")?.users ?? 0;
  const mobileShare = totalDeviceUsers > 0 ? mobileUsers / totalDeviceUsers : 0;

  const topEvents = eventBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label: EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));

  const stationSnapshotRange = getSectionRangeValue("stationSnapshot");
  const stationSnapshotData = getHistoricalResponseForSection("stationSnapshot");
  const stationSnapshotTotals = stationSnapshotData?.totals ?? totals;
  const stationSnapshotCommerce = stationSnapshotData?.commerce ?? commerce;
  const stationSnapshotDevices = stationSnapshotData?.devices ?? devices;
  const stationSnapshotSecurity = stationSnapshotData?.security ?? security;
  const stationSnapshotTotalDeviceUsers = stationSnapshotDevices.reduce((sum, item) => sum + item.users, 0);
  const stationSnapshotMobileUsers = stationSnapshotDevices.find((item) => item.device.toLowerCase() === "mobile")?.users ?? 0;
  const stationSnapshotMobileShare = stationSnapshotTotalDeviceUsers > 0 ? stationSnapshotMobileUsers / stationSnapshotTotalDeviceUsers : 0;
  const stationSnapshotSecuritySignals = stationSnapshotSecurity.reduce((sum, item) => sum + item.ripAttempts, 0);

  const livePulseRange = getSectionRangeValue("livePulse");
  const livePulseData = getHistoricalResponseForSection("livePulse");
  const livePulseFunnel = livePulseData?.funnel ?? funnel;
  const livePulseOnboardingStats = livePulseData?.onboardingStats ?? onboardingStats;

  const journeyFunnelRange = getSectionRangeValue("journeyFunnel");
  const journeyFunnelData = getHistoricalResponseForSection("journeyFunnel");
  const journeyFunnelMetrics = journeyFunnelData?.funnel ?? funnel;

  const authOutcomeRange = getSectionRangeValue("authOutcomeSplit");
  const authOutcomeBreakdown = getHistoricalResponseForSection("authOutcomeSplit")?.authBreakdown ?? authBreakdown;

  const onboardingRange = getSectionRangeValue("onboardingVelocity");
  const onboardingData = getHistoricalResponseForSection("onboardingVelocity");
  const onboardingStatsView = onboardingData?.onboardingStats ?? onboardingStats;
  const onboardingStepStatsView = onboardingData?.onboardingStepStats ?? onboardingStepStats;
  const onboardingDurationBucketsView = onboardingData?.onboardingDurationBuckets ?? onboardingDurationBuckets;
  const onboardingSourceLabelView = formatDataSourceLabel(onboardingStatsView.startSource);

  const eventMixRange = getSectionRangeValue("eventMix");
  const eventMixBreakdown = getHistoricalResponseForSection("eventMix")?.eventBreakdown ?? eventBreakdown;
  const topEventsView = eventMixBreakdown.slice(0, 8).map((entry) => ({
    ...entry,
    label: EVENT_LABELS[entry.eventName] || entry.eventName.replaceAll("_", " "),
  }));

  const liveInteractionRange = getSectionRangeValue("liveInteractionStream");
  const liveInteractionEvents = getHistoricalResponseForSection("liveInteractionStream")?.rawEvents ?? rawEvents;

  const serverTelemetryHealthRange = getSectionRangeValue("serverTelemetryHealth");
  const serverTelemetryHealthData = getHistoricalResponseForSection("serverTelemetryHealth");
  const opsHealthView = serverTelemetryHealthData?.opsHealth ?? opsHealth;
  const healthyMaterializerCountView = opsHealthView.materializers.filter((item) => item.status === "healthy").length;
  const unhealthyMaterializerCountView = opsHealthView.materializers.filter((item) => item.status !== "healthy").length;

  const coverageEngineRange = getSectionRangeValue("coverageEngine");
  const coverageEngineData = getHistoricalResponseForSection("coverageEngine");
  const moduleCoverageView = coverageEngineData?.moduleCoverage ?? moduleCoverage;
  const unhealthyModulesView = coverageEngineData?.unhealthyModules ?? unhealthyModules;
  const parityScoreView = coverageEngineData?.parityScore ?? parityScore;
  const healthyModuleCountView = moduleCoverageView.filter((item) => item.status === "healthy").length;
  const partialModuleCountView = moduleCoverageView.filter((item) => item.status === "partial").length;
  const emptyModuleCountView = moduleCoverageView.filter((item) => item.status === "empty").length;

  const categorySemanticsRange = getSectionRangeValue("categorySemantics");
  const categorySemantics = getHistoricalResponseForSection("categorySemantics")?.semanticCategories ?? semanticCategories;
  const semanticCategoryCardsView = categorySemantics.map((item) => ({
    ...item,
    avgViewLabel: formatDuration(item.avgViewSeconds * 1000),
    watchLabel: item.watchSecondsTotal > 0 ? formatDuration(item.watchSecondsTotal * 1000) : "0s",
    returnActions: item.signInCount + item.returnCount + item.logoutCount,
  }));

  const creatorMetricsRange = getSectionRangeValue("creatorMetrics");
  const creatorMetricsData = getHistoricalResponseForSection("creatorMetrics")?.socialMetrics ?? socialMetrics;
  const socialMetricCategoryCardsView = creatorMetricsData.categories.map((category) => ({
    ...category,
    headline: category.metrics[0]?.formattedValue ?? "0",
    healthyCount: category.metrics.filter((metric) => metric.status === "healthy").length,
  }));

  const semanticsEngineRange = getSectionRangeValue("semanticsEngine");
  const semanticsEngineView = getHistoricalResponseForSection("semanticsEngine")?.semanticEngine ?? semanticEngine;

  const dataValidationRange = getSectionRangeValue("dataValidation");
  const validationsView = getHistoricalResponseForSection("dataValidation")?.validations ?? validations;

  const audienceSnapshotRange = getSectionRangeValue("audienceSnapshot");
  const audienceSnapshotData = getHistoricalResponseForSection("audienceSnapshot");
  const audienceTotals = audienceSnapshotData?.totals ?? totals;
  const audienceHistorySeries = audienceSnapshotData?.data ?? historySeries;

  const returnCadenceRange = getSectionRangeValue("returnCadence");
  const returnCadenceSegments = getHistoricalResponseForSection("returnCadence")?.repeatVisitSegments ?? repeatVisitSegments;

  const navigationDestinationsRange = getSectionRangeValue("navigationDestinations");
  const navigationDestinations = getHistoricalResponseForSection("navigationDestinations")?.destinationMix ?? destinationMix;

  const deviceMixRange = getSectionRangeValue("deviceMix");
  const deviceMixItems = getHistoricalResponseForSection("deviceMix")?.devices ?? devices;
  const deviceMixTotalUsers = deviceMixItems.reduce((sum, item) => sum + item.users, 0);

  const topPathsRange = getSectionRangeValue("topPaths");
  const topPathsItems = getHistoricalResponseForSection("topPaths")?.pages ?? pages;

  const regionsRange = getSectionRangeValue("regions");
  const regionsItems = getHistoricalResponseForSection("regions")?.geo ?? geo;

  const commerceSnapshotRange = getSectionRangeValue("commerceSnapshot");
  const commerceSnapshotData = getHistoricalResponseForSection("commerceSnapshot");
  const commerceSnapshot = commerceSnapshotData?.commerce ?? commerce;
  const commerceSnapshotFunnel = commerceSnapshotData?.funnel ?? funnel;

  const packagePerformanceRange = getSectionRangeValue("packagePerformance");
  const packagePerformanceItems = getHistoricalResponseForSection("packagePerformance")?.packagePerformance ?? packagePerformance;

  const contentConversionRange = getSectionRangeValue("contentConversion");
  const contentConversionItems = getHistoricalResponseForSection("contentConversion")?.unlockCategoryMix ?? unlockCategoryMix;

  const topDropConversionRange = getSectionRangeValue("topDropConversion");
  const topDropConversionItems = getHistoricalResponseForSection("topDropConversion")?.topDrops ?? topDrops;

  const recentCommerceFeedRange = getSectionRangeValue("recentCommerceFeed");
  const recentCommerceFeedItems = (getHistoricalResponseForSection("recentCommerceFeed")?.commerce ?? commerce).feed ?? [];

  const viewerDrilldownRange = getSectionRangeValue("viewerDrilldown");
  const viewerDrilldownData = getHistoricalResponseForSection("viewerDrilldown");
  const viewerOverviewView = viewerDrilldownData?.viewerOverview ?? viewerOverview;
  const viewerDropInsightsView = viewerDrilldownData?.viewerDropInsights ?? viewerDropInsights;
  const viewerUsersView = viewerDrilldownData?.viewerUsers ?? viewerUsers;
  const activeViewerFilterView = viewerDrilldownData?.viewerFilter ?? activeViewerFilter;
  const viewerDropChartDataView = viewerDropInsightsView.slice(0, 8).map((item) => ({
    ...item,
    shortLabel: item.dropTitle.length > 16 ? `${item.dropTitle.slice(0, 16)}...` : item.dropTitle,
  }));

  const viewerJourneyRange = getSectionRangeValue("viewerJourney");
  const viewerJourneyItems = getHistoricalResponseForSection("viewerJourney")?.contentJourney ?? contentJourney;

  const watchDepthTagsRange = getSectionRangeValue("watchDepthTags");
  const watchDepthItems = getHistoricalResponseForSection("watchDepthTags")?.watchDepthBuckets ?? watchDepthBuckets;
  const contentTagDemandItems = getHistoricalResponseForSection("watchDepthTags")?.contentTagDemand ?? contentTagDemand;

  const securityPostureRange = getSectionRangeValue("securityPosture");
  const securityPostureData = getHistoricalResponseForSection("securityPosture");
  const securityPostureItems = securityPostureData?.security ?? security;
  const securityPostureFunnel = securityPostureData?.funnel ?? funnel;
  const securityPostureViolationCount = securityPostureItems.reduce((sum, item) => sum + item.ripAttempts, 0);

  const dailyTaskPipelineRange = getSectionRangeValue("dailyTaskPipeline");
  const dailyTaskPipelineData = getHistoricalResponseForSection("dailyTaskPipeline");
  const taskGuidanceView = dailyTaskPipelineData?.taskGuidance ?? taskGuidance;
  const taskPipelineView = dailyTaskPipelineData?.taskPipeline ?? taskPipeline;

  const taskCompletionSpeedRange = getSectionRangeValue("taskCompletionSpeed");
  const taskDurationBucketsView = getHistoricalResponseForSection("taskCompletionSpeed")?.taskDurationBuckets ?? taskDurationBuckets;

  const taskLeaderboardRange = getSectionRangeValue("taskLeaderboard");
  const taskLeaderboardView = getHistoricalResponseForSection("taskLeaderboard")?.taskLeaderboard ?? taskLeaderboard;

  const notificationFunnelRange = getSectionRangeValue("notificationFunnel");
  const notificationFunnelData = getHistoricalResponseForSection("notificationFunnel");
  const notificationFunnelView = notificationFunnelData?.notificationFunnel ?? notificationFunnel;
  const notificationActionsView = notificationFunnelData?.notificationActions ?? notificationActions;
  const reminderReasonsView = notificationFunnelData?.reminderReasons ?? reminderReasons;

  const flaggedAccountsRange = getSectionRangeValue("flaggedAccounts");
  const flaggedAccountsItems = getHistoricalResponseForSection("flaggedAccounts")?.security ?? security;

  const applyViewerFilter = () => {
    setViewerUserFilter(viewerUserDraft.trim());
  };

  const clearViewerFilter = () => {
    setViewerUserDraft("");
    setViewerUserFilter("");
  };

  if (needsSetup) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-10">
        <div className="glass-panel max-w-xl rounded-[2rem] border border-red-500/20 p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-red-500/10 text-red-400">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Analytics Needs GA Setup</h1>
          <p className="mt-3 text-sm text-gray-400">
            Add <code>GA_PROPERTY_ID</code> to the environment so the admin analytics console can query Google Analytics 4.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-20 md:space-y-6 md:pb-8">
      <AdminPageHeader
        eyebrow="Admin Analytics"
        title="Mobile Monitoring Station"
        subtitle="Live pulse, device mix, funnel health, revenue signals, and risk monitoring tuned for small screens first."
        actions={
          <div className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-100">
            <span className={cn("h-2.5 w-2.5 rounded-full bg-emerald-300", liveLoading || historicalLoading ? "animate-pulse" : "")} />
            Auto-syncing
          </div>
        }
      />

      <SectionCard
        panelId="stationSnapshot"
        sectionRange={stationSnapshotRange}
        onSectionRangeChange={(nextRange) => handleSectionRangeChange("stationSnapshot", nextRange)}
        loading={isSectionLoading("stationSnapshot")}
        title="Station Snapshot"
        subtitle="Quick-glance metrics stay collapsible now, so the dashboard opens lighter on mobile while still surfacing the essentials."
        icon={Monitor}
        defaultExpanded={!isCompactViewport}
        rightSlot={<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">{filterOptionLabel(stationSnapshotRange)}</span>}
        collapsedPreview={(
          <CompactPreviewList
            items={[
              { label: "Users", value: formatCompactNumber(stationSnapshotTotals.users), tone: "accent" },
              { label: "Mobile Share", value: formatPercent(stationSnapshotMobileShare) },
              { label: "Revenue", value: formatMoney(stationSnapshotCommerce.revenueUsd) },
              { label: "Violation Events", value: stationSnapshotSecuritySignals.toLocaleString() },
            ]}
          />
        )}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <MetricCard label="Active Users" value={formatCompactNumber(stationSnapshotTotals.users)} hint={`${stationSnapshotTotals.newUsers.toLocaleString()} new users in range`} icon={Users} />
          <MetricCard label="Mobile Share" value={formatPercent(stationSnapshotMobileShare)} hint={`${stationSnapshotMobileUsers.toLocaleString()} mobile users in range`} icon={Smartphone} />
          <MetricCard label="Revenue" value={formatMoney(stationSnapshotCommerce.revenueUsd)} hint={`${filterOptionLabel(stationSnapshotRange)} tracked revenue`} icon={DollarSign} />
          <MetricCard
            label="Violation Events"
            value={stationSnapshotSecuritySignals.toLocaleString()}
            hint={`${stationSnapshotSecurity.length.toLocaleString()} flagged accounts in range`}
            icon={ShieldAlert}
            valueClassName={stationSnapshotSecuritySignals > 0 ? "text-2xl font-black tracking-tight text-red-400" : undefined}
          />
        </div>
      </SectionCard>

      <div className="sticky top-[8.6rem] z-20 space-y-3 rounded-[1.8rem] border border-white/10 bg-black/65 p-3 backdrop-blur-xl md:top-24">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {TAB_OPTIONS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "rounded-2xl border px-3 py-3 text-left transition-colors",
                  active ? "border-brand-purple/40 bg-brand-purple/15 text-white" : "border-white/10 bg-white/5 text-gray-300",
                )}
              >
                <Icon className={cn("mb-2 h-4 w-4", active ? "text-brand-purple" : "text-gray-500")} />
                <div className="text-sm font-bold">{tab.label}</div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            Apply window to all panels
          </p>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-300">
            Default {filterOptionLabel(range)}
          </span>
        </div>

        <RangeFilterControl
          title="Global analytics range"
          value={range}
          options={GLOBAL_RANGE_OPTIONS}
          onChange={handleApplyRangeToAllSections}
          compactViewport={isCompactViewport}
        />
      </div>

      {(liveError || historicalError) && (
        <div className="rounded-[1.8rem] border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-300">
            {(liveError as Error | undefined)?.message || (historicalError as Error | undefined)?.message || "Analytics request failed."}
          </p>
        </div>
      )}

      {!liveResponse && !historicalResponse && (liveLoading || historicalLoading) ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
            <p className="text-sm text-gray-500">Syncing analytics...</p>
          </div>
        </div>
      ) : null}

      <FlowNavigator tab={activeTab} compactViewport={isCompactViewport} />

      <main className="space-y-5 md:space-y-6">
        {activeTab === "operations" ? (
          <>
            <SectionCard
              panelId="livePulse"
              sectionRange={livePulseRange}
              onSectionRangeChange={(nextRange) => handleSectionRangeChange("livePulse", nextRange)}
              loading={isSectionLoading("livePulse")}
              title="Live Pulse"
              subtitle="Realtime traffic sits beside selected-range funnel and onboarding history so mobile admins can sanity-check both without leaving the page."
              icon={Activity}
              defaultExpanded={!isCompactViewport}
              rightSlot={<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-400">{filterOptionLabel(livePulseRange)}</span>}
              collapsedPreview={(
                <CompactPreviewList
                  items={[
                    { label: "GA active now", value: formatCompactNumber(liveResponse?.totalActive ?? 0), tone: "accent" },
                    { label: "Tracked users (30m)", value: formatCompactNumber(liveResponse?.deepTrackerActive ?? 0) },
                    { label: `Onboarding (${filterOptionLabel(livePulseRange)})`, value: livePulseOnboardingStats.completions.toLocaleString() },
                    { label: `Purchases (${filterOptionLabel(livePulseRange)})`, value: livePulseFunnel.purchases.toLocaleString() },
                  ]}
                />
              )}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="GA Active Now" value={formatCompactNumber(liveResponse?.totalActive ?? 0)} hint="Google Analytics realtime" icon={Users} />
                <MetricCard label="Tracked Users (30m)" value={formatCompactNumber(liveResponse?.deepTrackerActive ?? 0)} hint="Authenticated users active in the last 30 minutes" icon={Sparkles} />
                <MetricCard label={`Onboarding (${filterOptionLabel(livePulseRange)})`} value={livePulseOnboardingStats.completions.toLocaleString()} hint={`Avg ${formatDuration(livePulseOnboardingStats.avgDuration)} across ${filterOptionLabel(livePulseRange)}`} icon={PlayCircle} />
                <MetricCard
                  label={`Purchases (${filterOptionLabel(livePulseRange)})`}
                  value={livePulseFunnel.purchases.toLocaleString()}
                  hint={`${formatPercent(livePulseFunnel.checkoutStarts > 0 ? livePulseFunnel.purchases / livePulseFunnel.checkoutStarts : 0)} of checkout starts in ${filterOptionLabel(livePulseRange)}`}
                  icon={ShoppingBag}
                />
              </div>

              <div className="mt-5 h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={liveSeries} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="liveUsersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b28cff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="liveViewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area type="monotone" dataKey="users" name="Active users" stroke="#b28cff" strokeWidth={2.5} fill="url(#liveUsersFill)" />
                    <Area type="monotone" dataKey="views" name="Page views" stroke="#22d3ee" strokeWidth={2.5} fill="url(#liveViewsFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              panelId="journeyFunnel"
              sectionRange={journeyFunnelRange}
              onSectionRangeChange={(nextRange) => handleSectionRangeChange("journeyFunnel", nextRange)}
              loading={isSectionLoading("journeyFunnel")}
              title="Journey Funnel"
              subtitle="The custom event chain now shows where mobile users are entering, previewing, unlocking, and paying."
              icon={Eye}
              collapsedPreview={(
                <CompactPreviewList
                  items={[
                    { label: "Auth opens", value: journeyFunnelMetrics.authModalOpens.toLocaleString() },
                    { label: "Previews", value: journeyFunnelMetrics.previewOpens.toLocaleString() },
                    { label: "Unlocks", value: journeyFunnelMetrics.unlocks.toLocaleString(), tone: "accent" },
                    { label: "Purchases", value: journeyFunnelMetrics.purchases.toLocaleString() },
                  ]}
                />
              )}
            >
              <div className="grid gap-3">
                {[
                  { label: "Auth modal opens", count: journeyFunnelMetrics.authModalOpens, ratio: 1, icon: Users },
                  { label: "Drop previews", count: journeyFunnelMetrics.previewOpens, ratio: journeyFunnelMetrics.authModalOpens > 0 ? journeyFunnelMetrics.previewOpens / journeyFunnelMetrics.authModalOpens : 0, icon: Eye },
                  { label: "Viewer opens", count: journeyFunnelMetrics.viewerOpens, ratio: journeyFunnelMetrics.previewOpens > 0 ? journeyFunnelMetrics.viewerOpens / journeyFunnelMetrics.previewOpens : 0, icon: PlayCircle },
                  { label: "Unlocks", count: journeyFunnelMetrics.unlocks, ratio: journeyFunnelMetrics.previewOpens > 0 ? journeyFunnelMetrics.unlocks / journeyFunnelMetrics.previewOpens : 0, icon: Sparkles },
                  { label: "Checkout starts", count: journeyFunnelMetrics.checkoutStarts, ratio: journeyFunnelMetrics.unlocks > 0 ? journeyFunnelMetrics.checkoutStarts / journeyFunnelMetrics.unlocks : 0, icon: Wallet },
                  { label: "Purchases", count: journeyFunnelMetrics.purchases, ratio: journeyFunnelMetrics.checkoutStarts > 0 ? journeyFunnelMetrics.purchases / journeyFunnelMetrics.checkoutStarts : 0, icon: ShoppingBag },
                ].map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 text-brand-purple">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{step.label}</p>
                            <p className="text-xs text-gray-500">{step.count.toLocaleString()} events</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-white">{step.label === "Auth modal opens" ? "Base" : formatPercent(step.ratio)}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(6, Math.min(100, step.ratio * 100 || 0))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <MetricCard label="Shares" value={journeyFunnelMetrics.shares.toLocaleString()} hint="Copied invite/share actions" icon={Share2} />
                <MetricCard label="Daily Check-ins" value={journeyFunnelMetrics.checkIns.toLocaleString()} hint="Reward claims in range" icon={CheckCircle2} />
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                panelId="authOutcomeSplit"
                sectionRange={authOutcomeRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("authOutcomeSplit", nextRange)}
                loading={isSectionLoading("authOutcomeSplit")}
                title="Auth Outcome Split"
                subtitle="Start, finish, and average completion speed by auth method."
                icon={Users}
                collapsedPreview={(
                <CompactPreviewList
                  items={authOutcomeBreakdown.slice(0, 4).map((item) => ({
                    label: item.method,
                    value: `${item.successes} success | ${formatPercent(item.successRate)}`,
                    tone: item.successRate >= 0.5 ? "accent" : "default",
                  }))}
                />
              )}
              >
                <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={authOutcomeBreakdown.map((item) => ({ name: item.method, value: item.successes }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={56}
                          outerRadius={86}
                          paddingAngle={4}
                        >
                          {authOutcomeBreakdown.map((item, index) => (
                            <Cell key={item.method} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<AnalyticsTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {authOutcomeBreakdown.length > 0 ? (
                      authOutcomeBreakdown.map((item, index) => (
                        <div key={item.method} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                              <p className="text-sm font-semibold text-white">{item.method}</p>
                            </div>
                            <span className="text-sm font-bold text-brand-purple">{formatPercent(item.successRate)}</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {item.successes.toLocaleString()} success | {item.failures.toLocaleString()} failed | {formatDuration(item.avgDurationMs / 1000)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                        Auth detail rows will populate after more sign-in and sign-up completions are tracked.
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                panelId="onboardingVelocity"
                sectionRange={onboardingRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("onboardingVelocity", nextRange)}
                loading={isSectionLoading("onboardingVelocity")}
                title="Onboarding Velocity"
                subtitle="How long new users take to finish the guided tour on mobile, using deduped onboarding starts, completions, and step facts."
                icon={PlayCircle}
                rightSlot={<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-400">{onboardingSourceLabelView}</span>}
                collapsedPreview={(
                <CompactPreviewList
                  items={[
                    { label: "Started", value: formatCompactNumber(onboardingStatsView.starts || 0) },
                    { label: "Completed", value: onboardingStatsView.completions.toLocaleString(), tone: "accent" },
                    { label: "Avg time", value: formatDuration(onboardingStatsView.avgDuration) },
                    { label: "Completion", value: formatPercent(onboardingStatsView.completionRate || 0) },
                  ]}
                />
              )}>
                <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={onboardingDurationBucketsView} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip content={<AnalyticsTooltip />} />
                        <Bar dataKey="count" name="Completions" fill="#b28cff" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-3 self-start">
                    <MetricCard label="Started" value={formatCompactNumber(onboardingStatsView.starts || 0)} hint={onboardingStatsView.startSource === "tracked" ? "Direct onboarding starts" : "Backfilled from completion coverage"} icon={PlayCircle} />
                    <MetricCard label="Completed" value={onboardingStatsView.completions.toLocaleString()} hint="Finished tours" icon={CheckCircle2} />
                    <MetricCard label="Avg Time" value={formatDuration(onboardingStatsView.avgDuration)} hint="Mean completion time" icon={Clock3} />
                    <MetricCard
                      label="Completion Rate"
                      value={formatPercent(onboardingStatsView.completionRate || 0)}
                      hint="Completed vs normalized starts"
                      icon={Sparkles}
                    />
                  </div>
                </div>
                {onboardingStepStatsView.length > 0 ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {onboardingStepStatsView.map((step) => (
                      <div key={step.stepKey} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">Step {step.stepIndex}</p>
                        <h4 className="mt-2 text-sm font-semibold text-white">{step.stepTitle}</h4>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-400">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Starts</p>
                            <p className="mt-1 text-sm font-semibold text-white">{formatCompactNumber(step.starts)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Done</p>
                            <p className="mt-1 text-sm font-semibold text-white">{step.completions.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500">Avg</p>
                            <p className="mt-1 text-sm font-semibold text-white">{formatDuration(step.avgDurationMs)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                panelId="eventMix"
                sectionRange={eventMixRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("eventMix", nextRange)}
                loading={isSectionLoading("eventMix")}
                title="Event Mix"
                subtitle="The strongest custom GA events for the selected window."
                icon={Sparkles}
                collapsedPreview={(
                <CompactPreviewList
                  items={topEventsView.slice(0, 4).map((entry) => ({
                    label: entry.label,
                    value: formatCompactNumber(entry.count),
                    tone: "accent",
                  }))}
                />
              )}
              >
                <div className="h-64 w-full md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topEventsView} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar dataKey="count" name="Events" fill="#b28cff" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard
                panelId="liveInteractionStream"
                sectionRange={liveInteractionRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("liveInteractionStream", nextRange)}
                loading={isSectionLoading("liveInteractionStream")}
                title="Live Interaction Stream"
                subtitle="Most recent telemetry events and guest interaction buckets collected from the live site."
                icon={Clock3}
                collapsedPreview={(
                <CompactPreviewList
                  items={liveInteractionEvents.slice(0, 4).map((event) => ({
                    label: event.type,
                    value: `${(event.username || "Guest").trim()} | ${formatRelativeTime(event.timestamp, nowMs)}`,
                  }))}
                  columns={1}
                />
              )}
              >
                <div className="space-y-3">
                  {liveInteractionEvents.length > 0 ? (
                    liveInteractionEvents.slice(0, 8).map((event, index) => (
                      <div key={`${event.timestamp}-${index}`} className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
                            {EVENT_LABELS[event.type] || resolveRawInteractionLabel(event.type) || humanizeAnalyticsKey(event.type)}
                          </span>
                          <span className="text-[11px] text-gray-500">{formatRelativeTime(event.timestamp, nowMs)}</span>
                        </div>
                        <p className="text-sm text-white">{describeEvent(event)}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          {(event.username || "Guest").trim()} on <span className="text-gray-400">{event.path}</span>
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No recent interaction traces yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

              <SectionCard
                panelId="serverTelemetryHealth"
                sectionRange={serverTelemetryHealthRange}
              onSectionRangeChange={(nextRange) => handleSectionRangeChange("serverTelemetryHealth", nextRange)}
              loading={isSectionLoading("serverTelemetryHealth")}
              title="Server Telemetry Health"
              subtitle="Shared backend runtime, diagnostics, and function-fed materializers so the dashboard stays grounded in the same server-side truth as the debug console."
              icon={Monitor}
              collapsedPreview={(
                <CompactPreviewList
                  items={[
                    { label: "Health", value: `${opsHealthView.score}%`, tone: "accent" },
                    { label: "Failures", value: opsHealthView.pipeline.failureCount.toLocaleString() },
                    { label: "Diagnostics", value: opsHealthView.diagnostics.errorCount.toLocaleString() },
                    { label: "Warn/fail", value: unhealthyMaterializerCountView.toLocaleString() },
                  ]}
                />
              )}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Health score" value={`${opsHealthView.score}%`} hint="Runtime + pipeline + materializer confidence" icon={CheckCircle2} />
                <MetricCard label="Materializers" value={healthyMaterializerCountView.toLocaleString()} hint={`${unhealthyMaterializerCountView.toLocaleString()} warn/fail in current window`} icon={Database} />
                <MetricCard label="Pipeline failures" value={opsHealthView.pipeline.failureCount.toLocaleString()} hint={opsHealthView.pipeline.lastFailureAt ? formatRelativeTime(opsHealthView.pipeline.lastFailureAt, nowMs) : "No recent failures"} icon={AlertTriangle} />
                <MetricCard label="Diagnostics" value={opsHealthView.diagnostics.total.toLocaleString()} hint={`${opsHealthView.diagnostics.errorCount.toLocaleString()} errors | ${opsHealthView.diagnostics.warnCount.toLocaleString()} warnings`} icon={BellRing} />
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Runtime readiness</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { label: "GA property", ready: opsHealthView.runtime.gaPropertyConfigured },
                        { label: "Navigation session", ready: opsHealthView.runtime.navigationSessionSigningReady },
                        { label: "App Check", ready: opsHealthView.runtime.appCheckConfigured || !opsHealthView.runtime.appCheckRequired },
                        { label: "Realtime DB", ready: opsHealthView.runtime.databaseUrlConfigured },
                        { label: "VAPID", ready: opsHealthView.runtime.vapidConfigured },
                        { label: "reCAPTCHA", ready: opsHealthView.runtime.recaptchaConfigured || !opsHealthView.runtime.appCheckRequired },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">{item.label}</p>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", item.ready ? getOpsHealthClasses("healthy") : getOpsHealthClasses("warn"))}>
                              {item.ready ? "Ready" : "Check"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Project</p>
                      <p className="mt-1 text-sm font-semibold text-white">{opsHealthView.runtime.projectId || "Unknown project"}</p>
                    </div>

                    {opsHealthView.runtime.warnings.length > 0 ? (
                      <div className="mt-4 space-y-2">
                        {opsHealthView.runtime.warnings.map((warning) => (
                          <div key={warning} className="rounded-[1rem] border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-xs leading-6 text-amber-100">
                            {warning}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1rem] border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-xs leading-6 text-emerald-200">
                        Runtime configuration is aligned for telemetry, functions, and admin diagnostics.
                      </div>
                    )}
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Pipeline routes</p>
                      <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", opsHealthView.pipeline.failureCount > 0 ? getOpsHealthClasses("warn") : getOpsHealthClasses("healthy"))}>
                        {opsHealthView.pipeline.failureCount > 0 ? "Attention" : "Healthy"}
                      </span>
                    </div>
                    {opsHealthView.pipeline.lastRouteName ? (
                      <div className="mb-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-sm font-semibold text-white">{opsHealthView.pipeline.lastRouteName}</p>
                        <p className="mt-1 text-xs leading-6 text-gray-400">{opsHealthView.pipeline.lastErrorMessage || "Latest recorded route failure."}</p>
                        <p className="mt-2 text-[11px] text-gray-500">{formatDateTime(opsHealthView.pipeline.lastFailureAt)}</p>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {opsHealthView.pipeline.routes.length > 0 ? opsHealthView.pipeline.routes.map((route) => (
                        <div key={route.routeKey} className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                          <p className="text-sm font-semibold text-white">{route.label}</p>
                          <span className="text-sm font-semibold text-brand-purple">{route.count.toLocaleString()}</span>
                        </div>
                      )) : (
                        <div className="rounded-[1rem] border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-xs leading-6 text-emerald-200">
                          No pipeline failures recorded for this selected range.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Function-fed materializers</p>
                    <div className="grid gap-2">
                      {opsHealthView.materializers.map((item) => (
                        <div key={item.key} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">{item.label}</p>
                              <p className="mt-1 text-xs leading-6 text-gray-400">{item.detail}</p>
                            </div>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", getOpsHealthClasses(item.status))}>
                              {item.status}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-400">
                            <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">
                              {humanizeAnalyticsKey(item.engine)}
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">
                              {item.count.toLocaleString()} records
                            </span>
                            <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1">
                              {item.lastSeenAt ? formatRelativeTime(item.lastSeenAt, nowMs) : "No recent activity"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Recent diagnostics</p>
                    <div className="space-y-2">
                      {opsHealthView.diagnostics.recent.length > 0 ? opsHealthView.diagnostics.recent.map((entry) => (
                        <div key={entry.id} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", getSeverityClasses(entry.severity))}>
                                  {entry.severity}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                                  {entry.channel}
                                </span>
                              </div>
                              <p className="mt-2 text-sm font-semibold text-white">{entry.message}</p>
                              {entry.detailPreview ? <p className="mt-1 text-xs leading-6 text-gray-400">{entry.detailPreview}</p> : null}
                            </div>
                            <span className="text-[11px] text-gray-500">{formatRelativeTime(entry.timestamp, nowMs)}</span>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-[1rem] border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-xs leading-6 text-emerald-200">
                          No recent diagnostics were recorded for this range.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

              <SectionCard
                panelId="coverageEngine"
                sectionRange={coverageEngineRange}
              onSectionRangeChange={(nextRange) => handleSectionRangeChange("coverageEngine", nextRange)}
              loading={isSectionLoading("coverageEngine")}
              title="Coverage Engine"
              subtitle="Cross-checks GA4, event facts, telemetry logs, and canonical rollups so empty modules explain themselves instead of quietly failing."
              icon={Activity}
              collapsedPreview={(
                <CompactPreviewList
                  items={[
                    { label: "Parity", value: `${parityScoreView}%`, tone: "accent" },
                    { label: "Healthy", value: healthyModuleCountView.toLocaleString() },
                    { label: "Partial", value: partialModuleCountView.toLocaleString() },
                    { label: "Empty", value: emptyModuleCountView.toLocaleString() },
                  ]}
                />
              )}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Parity Score" value={`${parityScoreView}%`} hint="Algorithmic confidence across indexed source groups" icon={CheckCircle2} />
                <MetricCard label="Healthy" value={healthyModuleCountView.toLocaleString()} hint="Modules with multi-source coverage" icon={Sparkles} />
                <MetricCard label="Partial" value={partialModuleCountView.toLocaleString()} hint="Some data landed, but not from enough sources" icon={AlertTriangle} />
                <MetricCard label="Empty" value={emptyModuleCountView.toLocaleString()} hint="No indexed data in this selected range" icon={FileText} />
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {moduleCoverageView.map((module) => (
                  <div key={module.key} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{module.label}</p>
                        <p className="mt-1 text-xs leading-6 text-gray-400">{module.detail}</p>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", getModuleCoverageClasses(module.status))}>
                        {module.status}
                      </span>
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-2">
                      <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Score</p>
                        <p className="mt-1 text-sm font-bold text-white">{module.score}%</p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Total</p>
                        <p className="mt-1 text-sm font-bold text-white">{module.total.toLocaleString()}</p>
                      </div>
                      <div className="rounded-[1rem] border border-white/10 bg-black/25 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Sources</p>
                        <p className="mt-1 text-sm font-bold text-white">{module.populatedSources.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      {module.sources.map((source) => (
                        <div key={`${module.key}-${source.key}`} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">{source.label}</p>
                          <p className="mt-1 text-sm font-semibold text-white">{source.count.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {unhealthyModulesView.length > 0 ? (
                <div className="mt-5 rounded-[1.6rem] border border-amber-400/15 bg-amber-400/10 p-4">
                  <p className="text-sm font-semibold text-white">Modules needing attention</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {unhealthyModulesView.map((module) => (
                      <div key={`attention-${module.key}`} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                        <p className="text-sm font-semibold text-white">{module.label}</p>
                        <p className="mt-1 text-xs leading-6 text-gray-400">{module.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <SectionCard
                panelId="categorySemantics"
                sectionRange={categorySemanticsRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("categorySemantics", nextRange)}
                loading={isSectionLoading("categorySemantics")}
                title="Category Semantics"
                subtitle="One normalized layer for public browsing, signed-in journeys, admin work, and KandyDrop consumption."
                icon={Route}
                collapsedPreview={(
                  <CompactPreviewList
                    items={semanticCategoryCardsView.map((item) => ({
                      label: item.label,
                    value: `${item.viewCount} views | ${item.clickCount} clicks`,
                    }))}
                  />
                )}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  {semanticCategoryCardsView.map((item) => (
                    <div key={item.key} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.label}</p>
                          <p className="mt-1 text-xs leading-6 text-gray-400">
                            {item.pagesVisited.toLocaleString()} pages, {item.viewCount.toLocaleString()} views, and {item.clickCount.toLocaleString()} tracked clicks in range.
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                          {formatPercent(item.engagedRate)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Avg view</p>
                          <p className="mt-1 font-semibold text-white">{item.avgViewLabel}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Watch time</p>
                          <p className="mt-1 font-semibold text-white">{item.watchLabel}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Engaged vs passive</p>
                          <p className="mt-1 font-semibold text-white">{item.engagedViewCount} / {item.passiveViewCount}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Bounces vs exits</p>
                          <p className="mt-1 font-semibold text-white">{item.bounceCount} / {item.exitCount}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Sign-ins / returns</p>
                          <p className="mt-1 font-semibold text-white">{item.signInCount} / {item.returnCount}</p>
                        </div>
                        <div className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Logouts / watch sessions</p>
                          <p className="mt-1 font-semibold text-white">{item.logoutCount} / {item.watchSessionCount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                panelId="creatorMetrics"
                sectionRange={creatorMetricsRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("creatorMetrics", nextRange)}
                loading={isSectionLoading("creatorMetrics")}
                title="Creator Metrics"
                subtitle="Thirty platform-style metrics defined in one shared catalog so future AI and reporting layers read the same formulas, sources, and reliability notes."
                icon={Sparkles}
                collapsedPreview={(
                  <CompactPreviewList
                    items={[
                      { label: "Metrics", value: creatorMetricsData.overview.total.toLocaleString(), tone: "accent" },
                      { label: "Healthy", value: creatorMetricsData.overview.healthy.toLocaleString() },
                      { label: "Partial", value: creatorMetricsData.overview.partial.toLocaleString() },
                      { label: "Catalog", value: creatorMetricsData.version },
                    ]}
                  />
                )}
              >
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard label="Catalog metrics" value={creatorMetricsData.overview.total.toLocaleString()} hint="Shared social-style metric definitions" icon={Sparkles} />
                  <MetricCard label="Healthy" value={creatorMetricsData.overview.healthy.toLocaleString()} hint="Metrics with strong first-party support" icon={CheckCircle2} />
                  <MetricCard label="Partial" value={creatorMetricsData.overview.partial.toLocaleString()} hint="Directional metrics using blended signals" icon={AlertTriangle} />
                  <MetricCard label="Version" value={creatorMetricsData.version} hint="Catalog schema version" icon={FileText} />
                </div>

                <div className="mt-5 grid gap-3">
                  {socialMetricCategoryCardsView.map((category) => (
                    <div key={category.key} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{category.label}</p>
                          <p className="mt-1 text-xs leading-6 text-gray-400">
                            {category.metrics.length.toLocaleString()} metrics with {category.healthyCount.toLocaleString()} fully healthy signals in this range.
                          </p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-purple">
                          {category.headline}
                        </span>
                      </div>

                      <div className="grid gap-2">
                        {category.metrics.map((metric) => (
                          <div key={metric.key} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-white">{metric.label}</p>
                                  <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]", getMetricStatusClasses(metric.status))}>
                                    {metric.status}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs leading-6 text-gray-400">{metric.description}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-base font-black tracking-tight text-white">{metric.formattedValue}</p>
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                                  Sample {metric.sampleSize.toLocaleString()}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                              <div className="rounded-[0.9rem] border border-white/10 bg-black/25 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Platform analog</p>
                                <p className="mt-1 text-xs leading-5 text-white">{metric.referenceModel}</p>
                              </div>
                              <div className="rounded-[0.9rem] border border-white/10 bg-black/25 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Formula</p>
                                <p className="mt-1 text-xs leading-5 text-white">{metric.formula}</p>
                              </div>
                              <div className="rounded-[0.9rem] border border-white/10 bg-black/25 px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Sources</p>
                                <p className="mt-1 text-xs leading-5 text-white">{metric.sources.map((source) => humanizeAnalyticsKey(source)).join(", ")}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                panelId="semanticsEngine"
                sectionRange={semanticsEngineRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("semanticsEngine", nextRange)}
                loading={isSectionLoading("semanticsEngine")}
                title="Semantics Engine"
                subtitle="Registry-driven source adapters and math rules, so new data plugs in by metadata instead of another custom function."
                icon={FileText}
                collapsedPreview={(
                  <CompactPreviewList
                    items={[
                      { label: "Sources", value: semanticsEngineView.sources.length.toLocaleString(), tone: "accent" },
                      { label: "Strategies", value: semanticsEngineView.strategies.length.toLocaleString() },
                    ]}
                    columns={1}
                  />
                )}
              >
                <div className="grid gap-4">
                  <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Connected sources</p>
                    <div className="grid gap-2">
                      {semanticsEngineView.sources.map((source) => (
                        <div key={source.key} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-white">{source.label}</p>
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-300">
                              {humanizeAnalyticsKey(source.engine)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-6 text-gray-400">{source.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Algorithm registry</p>
                    <div className="space-y-2">
                      {semanticsEngineView.strategies.map((strategy, index) => (
                        <div key={strategy.key} className="rounded-[1rem] border border-white/10 bg-black/20 px-3 py-3">
                          <p className="text-sm font-semibold text-white">{index + 1}. {strategy.label}</p>
                          <p className="mt-1 text-xs leading-6 text-gray-400">{strategy.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

              <SectionCard
                panelId="dataValidation"
                sectionRange={dataValidationRange}
              onSectionRangeChange={(nextRange) => handleSectionRangeChange("dataValidation", nextRange)}
              loading={isSectionLoading("dataValidation")}
              title="Data Validation"
              subtitle="Every overview here is grounded in a real source, with parity checks surfaced instead of hidden."
              icon={CheckCircle2}
            >
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {validationsView.map((item) => (
                  <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]", getValidationClasses(item.status))}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs leading-6 text-gray-400">{item.detail}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </>
        ) : null}

        {activeTab === "audience" ? (
          <>
              <SectionCard
                panelId="audienceSnapshot"
                sectionRange={audienceSnapshotRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("audienceSnapshot", nextRange)}
              loading={isSectionLoading("audienceSnapshot")}
              title="Audience Snapshot"
              subtitle="The selected time range emphasizes mobile traffic, retention quality, and visit depth."
              icon={Users}
              defaultExpanded={!isCompactViewport}
              collapsedPreview={(
                <CompactPreviewList
                  items={[
                    { label: "Users", value: formatCompactNumber(audienceTotals.users), tone: "accent" },
                    { label: "Mobile share", value: formatPercent(audienceSnapshotData?.devices ? ((audienceSnapshotData.devices.find((item) => item.device.toLowerCase() === "mobile")?.users ?? 0) / Math.max(1, audienceSnapshotData.devices.reduce((sum, item) => sum + item.users, 0))) : mobileShare) },
                    { label: "Views", value: formatCompactNumber(audienceTotals.views) },
                    { label: "Avg session", value: formatDuration(audienceTotals.avgSessionDuration) },
                  ]}
                />
              )}
              >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Active Users" value={formatCompactNumber(audienceTotals.users)} hint={`${audienceTotals.newUsers.toLocaleString()} new users`} icon={Users} />
                <MetricCard label="Sessions" value={formatCompactNumber(audienceTotals.sessions)} hint={`${audienceTotals.views.toLocaleString()} views`} icon={Activity} />
                <MetricCard label="Avg Session" value={formatDuration(audienceTotals.avgSessionDuration)} hint="Average time per visit" icon={Clock3} />
                <MetricCard label="Engagement" value={formatPercent(audienceTotals.engagementRate)} hint="GA engagement rate" icon={Sparkles} />
              </div>

              <div className="mt-5 h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={audienceHistorySeries} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="historyUsersFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#b28cff" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#b28cff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} minTickGap={20} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<AnalyticsTooltip />} />
                    <Area type="monotone" dataKey="users" name="Users" stroke="#b28cff" strokeWidth={2.5} fill="url(#historyUsersFill)" />
                    <Area type="monotone" dataKey="views" name="Views" stroke="#22d3ee" strokeWidth={2} fillOpacity={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                panelId="returnCadence"
                sectionRange={returnCadenceRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("returnCadence", nextRange)}
                loading={isSectionLoading("returnCadence")}
                title="Return Cadence"
                subtitle="Authenticated users grouped by how many distinct days they came back during the selected range."
                icon={Route}
                collapsedPreview={(
                <CompactPreviewList
                  items={returnCadenceSegments.map((item) => ({ label: item.label, value: item.count.toLocaleString() }))}
                />
              )}
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={returnCadenceSegments} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar dataKey="count" name="Users" fill="#b28cff" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard
                panelId="navigationDestinations"
                sectionRange={navigationDestinationsRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("navigationDestinations", nextRange)}
                loading={isSectionLoading("navigationDestinations")}
                title="Navigation Destinations"
                subtitle="Top in-app destinations reached from tracked taps, useful for mobile drill-down on where intent actually goes."
                icon={Route}
                collapsedPreview={(
                <CompactPreviewList
                  items={navigationDestinations.slice(0, 4).map((item) => ({ label: item.destination, value: item.count.toLocaleString(), tone: "accent" }))}
                  columns={1}
                />
              )}
              >
                <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={navigationDestinations.slice(0, 6).map((item) => ({ name: item.destination, value: item.count }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={3}
                        >
                          {navigationDestinations.slice(0, 6).map((item, index) => (
                            <Cell key={item.destination} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<AnalyticsTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {navigationDestinations.length > 0 ? (
                      navigationDestinations.slice(0, 6).map((item, index) => (
                        <div key={item.destination} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                              <p className="text-sm font-semibold text-white">{item.destination}</p>
                            </div>
                            <span className="text-sm font-bold text-brand-purple">{item.count.toLocaleString()}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(8, (item.count / Math.max(1, navigationDestinations[0]?.count || 1)) * 100)}%` }} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                        Destination drill-down will fill in once more navigation taps are tracked.
                      </div>
                    )}
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard
                panelId="deviceMix"
                sectionRange={deviceMixRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("deviceMix", nextRange)}
                loading={isSectionLoading("deviceMix")}
                title="Device Mix"
                subtitle="Mobile is the admin priority, so device share and engagement stay visible as first-class metrics."
                icon={Smartphone}
                collapsedPreview={(
                <CompactPreviewList
                  items={deviceMixItems.slice(0, 4).map((item) => ({ label: item.device, value: `${item.users} users | ${formatPercent(item.engagementRate)}` }))}
                />
              )}
              >
                <div className="space-y-3">
                  {deviceMixItems.length > 0 ? (
                    deviceMixItems.map((item) => {
                      const Icon = getDeviceIcon(item.device);
                      const share = deviceMixTotalUsers > 0 ? item.users / deviceMixTotalUsers : 0;
                      return (
                        <div key={item.device} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 text-brand-purple">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold capitalize text-white">{item.device}</p>
                                <p className="text-xs text-gray-500">{item.sessions.toLocaleString()} sessions</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-white">{formatPercent(share)}</p>
                              <p className="text-xs text-gray-500">{formatPercent(item.engagementRate)} engaged</p>
                            </div>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(8, share * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      Device data will appear after GA has enough sessions for this range.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                panelId="topPaths"
                sectionRange={topPathsRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("topPaths", nextRange)}
                loading={isSectionLoading("topPaths")}
                title="Top Paths"
                subtitle="What mobile admins should watch first: where people are actually spending time."
                icon={FileText}
                collapsedPreview={(
                <CompactPreviewList
                  items={topPathsItems.slice(0, 4).map((item) => ({ label: item.path, value: `${formatCompactNumber(item.views)} views | ${formatDuration(item.avgTime)}` }))}
                  columns={1}
                />
              )}
              >
                <div className="space-y-3">
                  {topPathsItems.length > 0 ? (
                    topPathsItems.slice(0, 8).map((page) => (
                      <div key={page.path} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{page.path || "/"}</p>
                            <p className="mt-1 text-xs text-gray-500">
                            {page.views.toLocaleString()} views | {formatDuration(page.avgTime)} avg time
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-xs font-semibold text-brand-purple">
                            {formatPercent(page.engagementRate)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No page-path data available yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

              <SectionCard
                panelId="regions"
                sectionRange={regionsRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("regions", nextRange)}
                loading={isSectionLoading("regions")}
                title="Regions"
                subtitle="Geographic demand surfaced in a mobile-friendly list instead of a cramped desktop-style table."
                icon={MapPin}
                collapsedPreview={(
                <CompactPreviewList
                  items={regionsItems.slice(0, 4).map((item) => ({ label: item.city || item.country, value: `${item.users.toLocaleString()} users` }))}
                  columns={1}
                />
              )}
              >
              <div className="space-y-3">
                {regionsItems.length > 0 ? (
                  regionsItems.slice(0, 10).map((item) => (
                    <div key={`${item.country}-${item.city}`} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.city}</p>
                          <p className="text-xs text-gray-500">{item.country}</p>
                        </div>
                        <p className="text-lg font-black text-white">{item.users.toLocaleString()}</p>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-brand-purple" style={{ width: `${Math.max(8, (item.users / Math.max(1, regionsItems[0]?.users || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                    Not enough location data yet for this range.
                  </div>
                )}
              </div>
            </SectionCard>
          </>
        ) : null}

        {activeTab === "commerce" ? (
          <>
              <SectionCard
                panelId="commerceSnapshot"
                sectionRange={commerceSnapshotRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("commerceSnapshot", nextRange)}
              loading={isSectionLoading("commerceSnapshot")}
              title="Commerce Snapshot"
              subtitle="A tighter mobile revenue view with unlock and purchase efficiency kept above the fold."
              icon={DollarSign}
              defaultExpanded={!isCompactViewport}
              collapsedPreview={(
                <CompactPreviewList
                  items={[
                    { label: "Revenue", value: formatMoney(commerceSnapshot.revenueUsd), tone: "accent" },
                    { label: "Profit", value: formatMoney(commerceSnapshot.adjustedProfitUsd ?? 0) },
                    { label: "Delivered", value: formatCompactNumber(commerceSnapshot.deliveredGumDrops ?? 0) },
                    { label: "Spent", value: formatCompactNumber(commerceSnapshot.gdSpent) },
                  ]}
                />
              )}
              >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Revenue" value={formatMoney(commerceSnapshot.revenueUsd)} hint="Completed currency purchases" icon={DollarSign} />
                <MetricCard label="Adj. Profit" value={formatMoney(commerceSnapshot.adjustedProfitUsd ?? 0)} hint={`${formatMoney(commerceSnapshot.bonusValueUsd ?? 0)} promo value granted`} icon={Wallet} />
                <MetricCard label="Yield / 100 GD" value={formatMoney(commerceSnapshot.effectiveUsdPer100Gd ?? 0)} hint={`${formatCompactNumber(commerceSnapshot.deliveredGumDrops ?? 0)} GD delivered`} icon={Sparkles} />
                <MetricCard label="GD Spent" value={formatCompactNumber(commerceSnapshot.gdSpent)} hint={`${formatCompactNumber(commerceSnapshot.bonusGumDrops ?? 0)} bonus GD granted`} icon={ShoppingBag} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Wallet Opens</p>
                  <p className="mt-2 text-3xl font-black text-white">{commerceSnapshotFunnel.walletOpens.toLocaleString()}</p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Checkout Starts</p>
                  <p className="mt-2 text-3xl font-black text-white">{commerceSnapshotFunnel.checkoutStarts.toLocaleString()}</p>
                </div>
                <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Purchase Completions</p>
                  <p className="mt-2 text-3xl font-black text-white">{commerceSnapshotFunnel.purchases.toLocaleString()}</p>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                panelId="packagePerformance"
                sectionRange={packagePerformanceRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("packagePerformance", nextRange)}
                loading={isSectionLoading("packagePerformance")}
                title="Package Performance"
                subtitle="Which Gum Drop packs are getting checkout intent, completions, and drop-off."
                icon={Wallet}
                collapsedPreview={(
                <CompactPreviewList
                  items={packagePerformanceItems.slice(0, 4).map((item) => ({ label: item.label, value: `${item.purchases} buys | ${formatPercent(item.conversionRate)}` }))}
                />
              )}
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={packagePerformanceItems.slice(0, 6)} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar dataKey="starts" name="Checkouts" fill="#374151" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="purchases" name="Purchases" fill="#b28cff" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 space-y-3">
                  {packagePerformanceItems.slice(0, 5).map((item) => (
                    <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">{item.label}</p>
                            <p className="text-xs text-gray-500">{item.starts.toLocaleString()} checkouts | {item.purchases.toLocaleString()} purchases</p>
                        </div>
                        <span className="text-sm font-bold text-brand-purple">{formatPercent(item.conversionRate)}</span>
                      </div>
                      <p className="text-xs leading-6 text-gray-400">
                            {formatMoney(item.revenueUsd)} revenue | {formatPercent(item.abandonmentRate)} abandonment
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                panelId="contentConversion"
                sectionRange={contentConversionRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("contentConversion", nextRange)}
                loading={isSectionLoading("contentConversion")}
                title="Content Conversion"
                subtitle="Which content types are previewed most and which actually get unwrapped."
                icon={Candy}
                collapsedPreview={(
                <CompactPreviewList
                  items={contentConversionItems.slice(0, 4).map((item) => ({ label: item.label, value: `${item.unlocks} unlocks | ${formatPercent(item.unlockRate)}` }))}
                />
              )}
              >
                <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={contentConversionItems.slice(0, 6)} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip content={<AnalyticsTooltip />} />
                        <Bar dataKey="previews" name="Previews" fill="#374151" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="unlocks" name="Unlocks" fill="#b28cff" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {contentConversionItems.slice(0, 5).map((item) => (
                      <div key={item.label} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold capitalize text-white">{item.label}</p>
                          <span className="text-sm font-bold text-brand-purple">{formatPercent(item.unlockRate)}</span>
                        </div>
                          <p className="text-xs text-gray-500">{item.previews.toLocaleString()} previews | {item.unlocks.toLocaleString()} unwraps</p>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
              <SectionCard
                panelId="topDropConversion"
                sectionRange={topDropConversionRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("topDropConversion", nextRange)}
                loading={isSectionLoading("topDropConversion")}
                title="Top Drop Conversion"
                subtitle="Unlocked drops with enough demand to matter, surfaced as a compact mobile chart and list."
                icon={ShoppingBag}
                collapsedPreview={(
                <CompactPreviewList
                  items={topDropConversionItems.slice(0, 4).map((item) => ({ label: item.dropTitle, value: `${item.unlocks} unlocks | ${item.views} views` }))}
                  columns={1}
                />
              )}
              >
                <div className="h-64 w-full md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topDropConversionItems.slice(0, 8)} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="dropTitle" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={
                          <AnalyticsTooltip
                            valueFormatter={(value, name) =>
                              name === "Unlocks" || name === "Views" ? Number(value).toLocaleString() : String(value)
                            }
                          />
                        }
                      />
                      <Bar dataKey="views" name="Views" fill="#374151" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="unlocks" name="Unlocks" fill="#b28cff" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-5 space-y-3">
                  {topDropConversionItems.slice(0, 6).map((drop) => {
                    const rate = drop.views > 0 ? drop.unlocks / drop.views : 0;
                    return (
                      <div key={drop.dropId} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{drop.dropTitle}</p>
                            <p className="mt-1 text-[11px] text-gray-500">{drop.dropId}</p>
                            <p className="mt-1 text-xs text-gray-500">
                            {drop.views.toLocaleString()} views | {drop.unlocks.toLocaleString()} unlocks
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-brand-purple">{formatPercent(rate)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(6, rate * 100)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionCard>

              <SectionCard
                panelId="recentCommerceFeed"
                sectionRange={recentCommerceFeedRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("recentCommerceFeed", nextRange)}
                loading={isSectionLoading("recentCommerceFeed")}
                title="Recent Commerce Feed"
                subtitle="Recent transactions condensed into mobile cards so admins can skim activity without horizontal scrolling."
                icon={Wallet}
                collapsedPreview={(
                <CompactPreviewList
                  items={recentCommerceFeedItems.slice(0, 4).map((item) => ({ label: item.username || item.type || "Entry", value: `${item.description || "Transaction"} | ${formatRelativeTime(item.timestamp || 0, nowMs)}` }))}
                  columns={1}
                />
              )}
              >
                <div className="space-y-3">
                  {recentCommerceFeedItems.length > 0 ? (
                    recentCommerceFeedItems.slice(0, 10).map((item) => (
                      <div key={item.id} className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                            {item.userPhoto ? (
                              <Image src={item.userPhoto} alt={item.username || "User"} fill className="object-cover" />
                            ) : (
                              <Wallet className="h-4 w-4 text-brand-purple" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{item.description || item.type || "Transaction"}</p>
                            <p className="mt-1 text-xs text-gray-500">
                            {item.username ? `@${item.username}` : "Unknown user"} | {item.timestamp ? formatRelativeTime(item.timestamp, nowMs) : "Just now"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-brand-purple">
                              {typeof item.cost === "number" && item.cost > 0
                                ? formatMoney(item.cost)
                                : typeof item.amount === "number"
                                  ? item.amount.toLocaleString()
                                  : "0"}
                            </p>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">{item.status || "logged"}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      No recent commerce feed entries yet.
                    </div>
                  )}
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                panelId="viewerDrilldown"
                sectionRange={viewerDrilldownRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("viewerDrilldown", nextRange)}
                loading={isSectionLoading("viewerDrilldown")}
                title="Library Viewer Drilldown"
                subtitle={
                  activeViewerFilterView
                    ? `Viewer playback, watch time, and drop affinity filtered to ${activeViewerFilterView.startsWith("@") ? activeViewerFilterView : `@${activeViewerFilterView}`}.`
                    : "Overall library-viewer performance across watch time, repeat sessions, asset completion, and the drops people actually spend time with."
                }
                icon={Eye}
                className="xl:col-span-2"
                rightSlot={
                  activeViewerFilterView ? (
                    <span className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-purple">
                      Filtered
                    </span>
                  ) : null
                }
              >
                <div className="space-y-4">
                  <div className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row">
                      <label className="min-w-0 flex-1">
                        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                          Filter by username or UID
                        </span>
                        <input
                          type="text"
                          value={viewerUserDraft}
                          onChange={(event) => setViewerUserDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              applyViewerFilter();
                            }
                          }}
                          placeholder="codexkdqa or user uid"
                          className="h-12 w-full rounded-2xl border border-white/10 bg-black/40 px-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-brand-purple/40"
                        />
                      </label>
                      <div className="flex gap-2 lg:self-end">
                        <button
                          type="button"
                          onClick={applyViewerFilter}
                          className="min-h-12 rounded-2xl bg-brand-purple px-4 text-sm font-bold text-white transition-colors hover:bg-brand-purple/90"
                        >
                          Apply filter
                        </button>
                        <button
                          type="button"
                          onClick={clearViewerFilter}
                          className="min-h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-gray-200 transition-colors hover:border-brand-purple/30 hover:text-white"
                        >
                          Overall
                        </button>
                      </div>
                    </div>

                    {viewerUsersView.length > 0 ? (
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {viewerUsersView.map((item) => (
                          <button
                            key={item.uid}
                            type="button"
                            onClick={() => {
                              setViewerUserDraft(item.username);
                              setViewerUserFilter(item.username);
                            }}
                            className={cn(
                              "shrink-0 rounded-full border px-3 py-2 text-left text-xs transition-colors",
                              activeViewerFilterView && item.username === activeViewerFilterView
                                ? "border-brand-purple/40 bg-brand-purple/15 text-white"
                                : "border-white/10 bg-white/5 text-gray-300 hover:border-brand-purple/30 hover:text-white",
                            )}
                          >
                            <span className="font-semibold">{item.username.startsWith("@") ? item.username : `@${item.username}`}</span>
                            <span className="ml-2 text-gray-500">{item.sessionCount} sessions</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
                    <MetricCard label="Views" value={formatCompactNumber(viewerOverviewView.viewCount)} hint="Viewer opens" icon={Eye} />
                    <MetricCard label="Sessions" value={formatCompactNumber(viewerOverviewView.sessionCount)} hint={`${viewerOverviewView.repeatSessionCount.toLocaleString()} repeat sessions`} icon={PlayCircle} />
                    <MetricCard label="Unique Viewers" value={formatCompactNumber(viewerOverviewView.uniqueViewerCount)} hint="Distinct collectors in filter" icon={Users} />
                    <MetricCard label="Watch Time" value={formatDuration(viewerOverviewView.totalWatchSeconds)} hint={`${formatDuration(viewerOverviewView.avgWatchSeconds)} avg watch`} icon={Clock3} />
                    <MetricCard label="Load Speed" value={viewerOverviewView.avgLoadMs > 0 ? `${viewerOverviewView.avgLoadMs}ms` : "n/a"} hint="Average secure asset load" icon={Activity} />
                    <MetricCard label="Completion" value={formatPercent(viewerOverviewView.assetCompletionRate)} hint={`${viewerOverviewView.downloads.toLocaleString()} downloads | ${viewerOverviewView.relatedClicks.toLocaleString()} next clicks`} icon={CheckCircle2} />
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Top viewed drops by watch time</p>
                      {viewerDropChartDataView.length > 0 ? (
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={viewerDropChartDataView} margin={{ top: 8, right: 6, left: -18, bottom: 16 }}>
                              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                              <XAxis dataKey="shortLabel" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-16} textAnchor="end" height={56} />
                              <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                              <Tooltip
                                content={
                                  <AnalyticsTooltip
                                    valueFormatter={(value, name) => {
                                      if (name === "Watch") {
                                        return formatDuration(Number(value));
                                      }
                                      return `${value}`;
                                    }}
                                  />
                                }
                              />
                              <Bar dataKey="totalWatchSeconds" name="Watch" fill="#b28cff" radius={[10, 10, 0, 0]} />
                              <Bar dataKey="sessionCount" name="Sessions" fill="#22d3ee" radius={[10, 10, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                          Viewer drilldown data will populate once collectors start watching library content in the selected range.
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {viewerDropInsightsView.slice(0, 5).map((item) => (
                        <div key={item.dropId} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">{item.dropTitle}</p>
                              <p className="mt-1 text-xs text-gray-500">
                            {item.sessionCount.toLocaleString()} sessions | {item.uniqueViewerCount.toLocaleString()} viewers
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-1 text-[11px] font-semibold text-brand-purple">
                              {formatDuration(item.totalWatchSeconds)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">Views<br />{item.viewCount}</div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">Repeat<br />{item.repeatSessionCount}</div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-gray-300">Avg watch<br />{formatDuration(item.avgWatchSeconds)}</div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-brand-purple">Avg load<br />{item.avgLoadMs > 0 ? `${item.avgLoadMs}ms` : "n/a"}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                panelId="viewerJourney"
                sectionRange={viewerJourneyRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("viewerJourney", nextRange)}
                loading={isSectionLoading("viewerJourney")}
                title="Viewer Journey"
                subtitle="How far users move from preview to playback to actual content consumption."
                icon={PlayCircle}
                collapsedPreview={(
                <CompactPreviewList
                  items={viewerJourneyItems.slice(0, 5).map((item) => ({ label: item.label, value: item.count.toLocaleString() }))}
                />
              )}
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={viewerJourneyItems} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={56} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Line type="monotone" dataKey="count" name="Events" stroke="#b28cff" strokeWidth={3} dot={{ r: 4, fill: "#b28cff" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard
                panelId="watchDepthTags"
                sectionRange={watchDepthTagsRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("watchDepthTags", nextRange)}
                loading={isSectionLoading("watchDepthTags")}
                title="Watch Depth + Tags"
                subtitle="What people actually watch once they unwrap, plus the tags pulling the most demand."
                icon={Eye}
                collapsedPreview={(
                <CompactPreviewList
                  items={[
                    ...(watchDepthItems.slice(0, 2).map((item) => ({ label: item.label, value: item.count.toLocaleString() }))),
                    ...(contentTagDemandItems.slice(0, 2).map((item) => ({ label: item.tag, value: `${item.count} hits`, tone: "accent" as const }))),
                  ]}
                />
              )}
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Watch depth</p>
                    <div className="space-y-3">
                      {watchDepthItems.map((bucket) => (
                        <div key={bucket.label}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="text-white">{bucket.label}</span>
                            <span className="font-semibold text-brand-purple">{bucket.count.toLocaleString()}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(6, (bucket.count / Math.max(1, watchDepthItems[0]?.count || 1)) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Top tags</p>
                    <div className="flex flex-wrap gap-2">
                      {contentTagDemandItems.length > 0 ? (
                        contentTagDemandItems.map((item) => (
                          <span key={item.tag} className="rounded-full border border-brand-purple/25 bg-brand-purple/12 px-3 py-2 text-xs font-semibold text-white">
                          {item.tag} | {item.count}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Tag demand will populate after more unwraps land in this range.</p>
                      )}
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>
          </>
        ) : null}

        {activeTab === "security" ? (
          <>
            <SectionCard
              panelId="securityPosture"
              sectionRange={securityPostureRange}
              onSectionRangeChange={(nextRange) => handleSectionRangeChange("securityPosture", nextRange)}
              loading={isSectionLoading("securityPosture")}
              title="Security Posture"
              subtitle="Flagged accounts are grouped into mobile cards with the newest risk surfaced first."
              icon={ShieldAlert}
              defaultExpanded={!isCompactViewport}
              collapsedPreview={(
              <CompactPreviewList
                items={[
                  { label: "Flagged", value: securityPostureItems.length.toLocaleString(), tone: "accent" },
                  { label: "Violation events", value: securityPostureViolationCount.toLocaleString() },
                  { label: "Experience views", value: securityPostureFunnel.experienceViews.toLocaleString() },
                  { label: "Viewer switches", value: securityPostureFunnel.assetSwitches.toLocaleString() },
                ]}
              />
            )}
            >
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricCard label="Flagged Users" value={securityPostureItems.length.toLocaleString()} hint="Users with recorded rip attempts" icon={ShieldAlert} />
                <MetricCard label="Violation Events" value={securityPostureViolationCount.toLocaleString()} hint={`${filterOptionLabel(securityPostureRange)} recorded security events`} icon={AlertTriangle} valueClassName={securityPostureViolationCount > 0 ? "text-2xl font-black tracking-tight text-red-400" : undefined} />
                <MetricCard label="Experience Views" value={securityPostureFunnel.experienceViews.toLocaleString()} hint="Signals around discovery" icon={Sparkles} />
                <MetricCard label="Viewer Switches" value={securityPostureFunnel.assetSwitches.toLocaleString()} hint="Asset interactions in viewer" icon={PlayCircle} />
              </div>
            </SectionCard>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                panelId="dailyTaskPipeline"
                sectionRange={dailyTaskPipelineRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("dailyTaskPipeline", nextRange)}
                loading={isSectionLoading("dailyTaskPipeline")}
                title="Daily Task Pipeline"
                subtitle="Canonical task lifecycle and the new guidance banner funnel in one mobile-friendly progression view."
                icon={Funnel}
                collapsedPreview={(
                <CompactPreviewList
                  items={taskPipelineView.slice(0, 6).map((item) => ({ label: item.label, value: item.count.toLocaleString() }))}
                />
              )}
              >
                <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <MetricCard label="Guides Shown" value={taskGuidanceView.viewed.toLocaleString()} hint={`${taskGuidanceView.dismissed.toLocaleString()} dismissed`} icon={MapPin} />
                  <MetricCard label="Guide Taps" value={taskGuidanceView.tapped.toLocaleString()} hint={formatPercent(taskGuidanceView.tapThroughRate)} icon={Route} />
                  <MetricCard label="Guide Wins" value={taskGuidanceView.completed.toLocaleString()} hint="Completed from guided flow" icon={Sparkles} />
                  <MetricCard label="Tap Conversion" value={formatPercent(taskGuidanceView.guidedCompletionRate)} hint="Guided completions vs CTA taps" icon={CheckCircle2} />
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskPipelineView} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar dataKey="count" name="Events" fill="#b28cff" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>

              <SectionCard
                panelId="taskCompletionSpeed"
                sectionRange={taskCompletionSpeedRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("taskCompletionSpeed", nextRange)}
                loading={isSectionLoading("taskCompletionSpeed")}
                title="Task Completion Speed"
                subtitle="How fast the finished task set is closing, so you can tune missions that are too easy or too heavy."
                icon={Clock3}
                collapsedPreview={(
                <CompactPreviewList
                  items={taskDurationBucketsView.map((item) => ({ label: item.label, value: item.count.toLocaleString() }))}
                />
              )}
              >
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskDurationBucketsView} margin={{ top: 8, right: 0, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                      <XAxis dataKey="label" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip content={<AnalyticsTooltip />} />
                      <Bar dataKey="count" name="Completions" fill="#22d3ee" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <SectionCard
                panelId="taskLeaderboard"
                sectionRange={taskLeaderboardRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("taskLeaderboard", nextRange)}
                loading={isSectionLoading("taskLeaderboard")}
                title="Task Leaderboard"
                subtitle="The missions driving the most completions, reward payout, and momentum."
                icon={Sparkles}
                collapsedPreview={(
                <CompactPreviewList
                  items={taskLeaderboardView.slice(0, 4).map((task) => ({ label: task.title, value: `${task.completed} complete | ${formatPercent(task.completionRate)}` }))}
                  columns={1}
                />
              )}
              >
                <div className="space-y-3">
                  {taskLeaderboardView.length > 0 ? (
                    taskLeaderboardView.map((task) => (
                      <div key={task.taskId} className="rounded-[1.5rem] border border-white/10 bg-black/30 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{task.title}</p>
                            <p className="mt-1 text-xs text-gray-500">
                            {task.completed.toLocaleString()} completed | {formatDuration(task.avgDurationMs / 1000)} avg
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-brand-purple">{formatPercent(task.completionRate)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-gray-300">Assigned<br />{task.assigned}</div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-gray-300">Started<br />{task.started}</div>
                          <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-2 text-brand-purple">Reward<br />{task.rewardTotal}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-5 text-sm text-gray-500">
                      Task leaderboard data will appear once more lifecycle events land in this range.
                    </div>
                  )}
                </div>
              </SectionCard>

              <SectionCard
                panelId="notificationFunnel"
                sectionRange={notificationFunnelRange}
                onSectionRangeChange={(nextRange) => handleSectionRangeChange("notificationFunnel", nextRange)}
                loading={isSectionLoading("notificationFunnel")}
                title="Notification Funnel"
                subtitle="Prompt, enablement, open, and read behaviors, plus reminder reasons when people run short on time."
                icon={BellRing}
                collapsedPreview={(
                <CompactPreviewList
                  items={notificationFunnelView.slice(0, 5).map((item) => ({ label: item.label, value: item.count.toLocaleString() }))}
                />
              )}
              >
                <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={notificationFunnelView.filter((item) => item.count > 0).map((item) => ({ name: item.label, value: item.count }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={3}
                        >
                          {notificationFunnelView.filter((item) => item.count > 0).map((item, index) => (
                            <Cell key={item.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<AnalyticsTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-3">
                    {notificationActionsView.map((item) => (
                      <div key={item.label} className="rounded-[1.4rem] border border-white/10 bg-black/30 p-3.5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-white">{item.label}</p>
                          <span className="text-sm font-bold text-brand-purple">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full bg-gradient-to-r from-brand-purple to-cyan-400" style={{ width: `${Math.max(6, (item.value / Math.max(1, notificationActionsView[0]?.value || 1)) * 100)}%` }} />
                        </div>
                      </div>
                    ))}

                    <div className="rounded-[1.4rem] border border-white/10 bg-black/30 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Reminder reasons</p>
                      <div className="flex flex-wrap gap-2">
                        {reminderReasonsView.length > 0 ? reminderReasonsView.map((item) => (
                          <span key={item.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white">
                          {item.label} | {item.count}
                          </span>
                        )) : <span className="text-sm text-gray-500">No reminder traffic in this range.</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            </div>

              <SectionCard
                panelId="flaggedAccounts"
                sectionRange={flaggedAccountsRange}
              onSectionRangeChange={(nextRange) => handleSectionRangeChange("flaggedAccounts", nextRange)}
              loading={isSectionLoading("flaggedAccounts")}
              title="Flagged Accounts"
              subtitle="A phone-sized audit list with user, vector, timing, and target drop at a glance."
              icon={AlertTriangle}
              collapsedPreview={(
              <CompactPreviewList
                  items={flaggedAccountsItems.slice(0, 4).map((item) => ({ label: item.username, value: `${item.lastViolationReason} | ${item.ripAttempts} violations` }))}
                columns={1}
              />
            )}
            >
              <div className="space-y-3">
                {flaggedAccountsItems.length > 0 ? (
                  flaggedAccountsItems.map((item) => {
                    const recent = isRecentViolation(item.lastViolation, nowMs);
                    return (
                      <div
                        key={item.uid}
                        className={cn(
                          "rounded-[1.6rem] border p-4",
                          recent ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-black/30",
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                            {item.photoURL ? (
                              <Image src={item.photoURL} alt={item.username} fill className="object-cover" />
                            ) : (
                              <span className="text-base font-bold text-gray-400">{item.username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-white">{item.username}</p>
                              {recent ? <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white">New</span> : null}
                            </div>
                            <p className="mt-1 break-all text-[11px] text-gray-500">{item.uid}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-red-400">{item.ripAttempts}</p>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">violations</p>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Last seen</p>
                            <p className="mt-2 text-sm text-white">{item.lastViolation ? new Date(item.lastViolation).toLocaleString() : "Unknown"}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Vector</p>
                            <p className="mt-2 text-sm text-white">{item.lastViolationReason}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">Drop</p>
                            <p className="mt-2 text-sm text-white">{item.lastViolationDropTitle || item.lastViolationDropId || "N/A"}</p>
                            {item.lastViolationDropTitle && item.lastViolationDropId ? (
                              <p className="mt-1 text-[11px] text-gray-500">{item.lastViolationDropId}</p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-black/20 p-6 text-center">
                    <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-green-500/60" />
                    <p className="text-sm font-semibold text-white">Clear skies</p>
                    <p className="mt-1 text-sm text-gray-500">No flagged users were returned for this period.</p>
                  </div>
                )}
              </div>
            </SectionCard>
          </>
        ) : null}
      </main>
    </div>
  );
}
