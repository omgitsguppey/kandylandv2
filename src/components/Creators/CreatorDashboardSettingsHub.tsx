"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BellRing, BookOpenText, CalendarClock, DollarSign, Loader2, Megaphone, MessageSquare, ShieldCheck, Users, Wallet } from "lucide-react";

import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";
import { buildBugReportContext, getSafePreviousRoute, resolveClientActionError, type ResolvedClientActionError } from "@/lib/errors/client-error-adapter";
import type { HumanErrorAction } from "@/lib/errors/error-language";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { HumanErrorNotice } from "@/components/errors/HumanErrorNotice";
import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";
import { CreatorBroadcastManager } from "@/components/Creators/CreatorBroadcastManager";
import { CreatorRequestsManager } from "@/components/Creators/CreatorRequestsManager";
import { CreatorBookingsManager } from "@/components/Creators/CreatorBookingsManager";
import { CreatorFanPassManager } from "@/components/Creators/CreatorFanPassManager";

type CreatorDashboardStats = {
  earningsGd: number;
  pendingCashoutGd: number;
  followerCount: number;
  profileViewsCount: number;
  liveDropsCount: number;
  activeSubscribers: number;
  openRequests: number;
  bookedCalls: number;
};

type CreatorStatsEvidenceState =
  | "verified_sample"
  | "queried_zero"
  | "partial"
  | "missing_source"
  | "needs_review"
  | "unavailable";

type CreatorStatsEvidenceSource = {
  state: CreatorStatsEvidenceState;
  value: number;
  sampleKnown: boolean;
  collection: string;
};

type CreatorStatsEvidence = {
  generatedAtUtc: string;
  sourceTruth: "canonical" | "partial" | "needs_review" | "unavailable";
  sourceFreshness: "fresh" | "stale" | "unknown" | "unavailable";
  sampleCount: number;
  zeroValuesAreProven: boolean;
  readOnlyProjection: boolean;
  sources: {
    ledgerAccruals: CreatorStatsEvidenceSource;
    pendingPayouts: CreatorStatsEvidenceSource;
    subscriptions: CreatorStatsEvidenceSource;
    customRequests: CreatorStatsEvidenceSource;
    callBookings: CreatorStatsEvidenceSource;
    relationshipsOps: CreatorStatsEvidenceSource;
    drops: CreatorStatsEvidenceSource;
    userProfile: CreatorStatsEvidenceSource;
  };
  issues: string[];
};

type CreatorSettingsResponse = {
  success?: boolean;
  settingsState?: "configured" | "not_configured";
  creatorSettings?: Record<string, unknown> | null;
  creatorRestrictions?: Record<string, unknown> | null;
  stats?: CreatorDashboardStats | null;
  statsEvidence?: CreatorStatsEvidence | null;
  projection?: { readOnly?: boolean; targetCreatorId?: string } | null;
  error?: string;
};

type SectionState = "live" | "unavailable" | "not_configured" | "blocked" | "needs_setup" | "needs_review" | "error";

function sectionTone(state: SectionState) {
  switch (state) {
    case "live":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    case "unavailable":
    case "blocked":
      return "border-red-400/20 bg-red-500/10 text-red-100";
    case "needs_setup":
    case "needs_review":
      return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    default:
      return "border-white/10 bg-white/5 text-gray-200";
  }
}

function SectionCard({
  id,
  title,
  state,
  summary,
  detail,
  href,
  icon,
  sourceTruth,
  sourceFreshness,
  sampleCount,
  fanPassManagementState,
  bookingsManagementState,
  chatRouteConnected,
  creatorEarningsSource,
  creatorEarningsAttribution,
  actionLabel,
  expanded,
  onToggle,
}: {
  id: string;
  title: string;
  state: SectionState;
  summary: string;
  detail: string;
  href?: string;
  icon: React.ReactNode;
  sourceTruth?: string;
  sourceFreshness?: string;
  sampleCount?: number;
  fanPassManagementState?: "subscriber_visibility" | "configuration_only" | "blocked";
  bookingsManagementState?: "connected" | "configuration_only" | "blocked" | "not_configured";
  chatRouteConnected?: boolean;
  creatorEarningsSource?: string;
  creatorEarningsAttribution?: "creator_experience_paid_source";
  actionLabel?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      className="min-h-[92px] rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 sm:min-h-[128px] sm:rounded-3xl sm:p-5"
      data-creator-section-key={id}
      data-creator-section-state={state}
      data-creator-dashboard-card-density="mobile_compact"
      data-creator-stats-source-truth={sourceTruth ?? "not_applicable"}
      data-creator-stats-source-freshness={sourceFreshness ?? "not_applicable"}
      data-creator-stats-sample-count={sampleCount ?? 0}
      data-creator-fan-pass-management-state={fanPassManagementState}
      data-creator-bookings-management-state={bookingsManagementState}
      data-creator-chat-route-connected={chatRouteConnected === undefined ? undefined : String(chatRouteConnected)}
      data-creator-earnings-source={creatorEarningsSource}
      data-creator-earnings-attribution={creatorEarningsAttribution}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <div className={cn("mt-0.5 rounded-xl border p-1.5 sm:rounded-2xl sm:p-2", sectionTone(state))}>{icon}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <span className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] sm:px-2 sm:text-[10px] sm:tracking-[0.16em]", sectionTone(state))}>
                {state.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-gray-300 sm:text-sm">{summary}</p>
          </div>
        </div>
        <ArrowRight className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded ? (
        <div className="mt-2.5 border-t border-white/10 pt-2.5 text-xs leading-5 text-gray-400 sm:mt-3 sm:pt-3 sm:text-sm">
          <p>{detail}</p>
          {href ? (
            <Link href={href} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-purple/25 bg-brand-purple/10 px-3 py-2.5 text-sm font-semibold text-brand-purple transition hover:bg-brand-purple/15">
              {actionLabel ?? "Open"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function creatorSectionStateFromEvidence(source: CreatorStatsEvidenceSource | undefined, fallbackValue = 0): SectionState {
  if (!source) return "unavailable";
  if (source.state === "verified_sample" || source.state === "queried_zero") return "live";
  if (source.state === "unavailable") return "unavailable";
  if (source.state === "partial" || source.state === "missing_source" || source.state === "needs_review") return "needs_review";
  return fallbackValue > 0 ? "needs_review" : "unavailable";
}

function combineEvidenceState(...states: SectionState[]): SectionState {
  if (states.includes("unavailable")) return "unavailable";
  if (states.includes("needs_review")) return "needs_review";
  return states.every((state) => state === "live") ? "live" : "needs_review";
}

export function CreatorDashboardSettingsHub() {
  const { userProfile } = useUserProfile();
  const { viewAsState } = useAdminViewAs();
  const { user } = useAuth();
  const settingsBugReporter = useSubmitBugReport();
  const [settings, setSettings] = useState<CreatorSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<ResolvedClientActionError | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const dashboardRequestIdRef = useRef(0);

  const creatorId = viewAsState?.adminViewingAsUserId || userProfile?.uid || "";
  const creatorName = viewAsState?.adminViewingAsDisplayName || userProfile?.displayName || "Creator";
  const query = useMemo(() => (viewAsState?.adminViewingAsUserId ? `?creatorId=${encodeURIComponent(viewAsState.adminViewingAsUserId)}` : ""), [viewAsState?.adminViewingAsUserId]);
  const isCreatorOrProjection = Boolean(viewAsState || userProfile?.role === "creator");
  const canLoadCreatorDashboard = Boolean(user?.uid && creatorId && isCreatorOrProjection);

  useEffect(() => {
    if (!canLoadCreatorDashboard) {
      setSettings(null);
      setSettingsError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requestId = dashboardRequestIdRef.current + 1;
    dashboardRequestIdRef.current = requestId;
    async function load() {
      try {
        setLoading(true);
        setSettingsError(null);
        setSettings(null);
        const response = await authFetch(`/api/creator/settings${query}`);
        const body = await response.json().catch(() => ({})) as CreatorSettingsResponse;
        if (!response.ok) {
          const rawPayload = body as Record<string, unknown>;
          const code = rawPayload.errorKey ?? rawPayload.code ?? (response.status >= 500 ? "dashboard_source_unavailable" : undefined);
          const resolved = resolveClientActionError(rawPayload, {
            surface: "creator_dashboard",
            route: "/api/creator/settings",
            status: response.status,
            code,
            fallbackKey: "dashboard_source_unavailable",
            context: {
              manager: "creator_settings",
              source_component: "CreatorDashboardSettingsHub",
            },
          });
          if (!cancelled && dashboardRequestIdRef.current === requestId) {
            setSettingsError(resolved);
          }
          return;
        }
        if (!cancelled && dashboardRequestIdRef.current === requestId) {
          setSettings(body);
        }
      } catch (loadError) {
        if (!cancelled && dashboardRequestIdRef.current === requestId) {
          setSettingsError(resolveClientActionError(loadError, {
            surface: "creator_dashboard",
            route: "/api/creator/settings",
            fallbackKey: "dashboard_source_unavailable",
            context: {
              manager: "creator_settings",
              source_component: "CreatorDashboardSettingsHub",
            },
          }));
        }
      } finally {
        if (!cancelled && dashboardRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [canLoadCreatorDashboard, creatorId, query, reloadNonce]);

  useEffect(() => {
    if (!isCreatorOrProjection) {
      return;
    }

    trackEvent("creator_dashboard_settings_viewed", {
      actor_role: userProfile?.role || "creator",
      creator_id: creatorId,
      target_creator_id: creatorId,
      section: "dashboard",
      source_component: "CreatorDashboardSettingsHub",
      truth_state: settings?.projection?.readOnly ? "blocked" : "live",
    });
  }, [creatorId, isCreatorOrProjection, settings?.projection?.readOnly, userProfile?.role]);

  const stats = settings?.stats ?? null;
  const statsEvidence = settings?.statsEvidence ?? null;
  const settingsState = settings?.settingsState ?? (settings?.creatorSettings ? "configured" : "not_configured");
  const creatorSettings = (settings?.creatorSettings ?? {}) as Record<string, unknown>;
  const creatorRestrictions = (settings?.creatorRestrictions ?? {}) as Record<string, unknown>;
  const sourceReviewNotice = useMemo(() => {
    if (!settings || settingsError) {
      return null;
    }
    if (settingsState === "not_configured" || statsEvidence?.issues?.includes("creator_settings_not_configured")) {
      return {
        tone: "setup",
        title: "Creator Settings need setup",
        body: "Some creator tools are using safe defaults until this creator finishes setup.",
      };
    }
    if (statsEvidence?.sourceTruth === "partial" || statsEvidence?.sourceTruth === "needs_review" || statsEvidence?.sourceTruth === "unavailable") {
      return {
        tone: "review",
        title: "Some creator stats need source review",
        body: "The workspace is showing safe partial data while one or more stat sources are unavailable.",
      };
    }
    return null;
  }, [settings, settingsError, settingsState, statsEvidence?.issues, statsEvidence?.sourceTruth]);
  const availabilityWindows = Array.isArray(creatorSettings.availabilityWindows) ? creatorSettings.availabilityWindows : [];
  const subscriptionPriceGd = typeof creatorSettings.subscriptionPriceGd === "number" ? creatorSettings.subscriptionPriceGd : 0;
  const requestsState = creatorSectionStateFromEvidence(statsEvidence?.sources.customRequests, stats?.openRequests ?? 0);
  const bookingsSourceState = creatorSectionStateFromEvidence(statsEvidence?.sources.callBookings, stats?.bookedCalls ?? 0);
  const subscriptionsState = creatorSectionStateFromEvidence(statsEvidence?.sources.subscriptions, stats?.activeSubscribers ?? 0);
  const earningsState = combineEvidenceState(
    creatorSectionStateFromEvidence(statsEvidence?.sources.ledgerAccruals, stats?.earningsGd ?? 0),
    creatorSectionStateFromEvidence(statsEvidence?.sources.pendingPayouts, stats?.pendingCashoutGd ?? 0),
  );
  const audienceState = combineEvidenceState(
    creatorSectionStateFromEvidence(statsEvidence?.sources.relationshipsOps, stats?.followerCount ?? 0),
    creatorSectionStateFromEvidence(statsEvidence?.sources.userProfile, stats?.profileViewsCount ?? 0),
  );
  const messageSectionHref = creatorRestrictions.messagingRestricted === true || creatorSettings.messagingEnabled !== true ? undefined : "/dashboard/chat";
  const requestsEnabled = creatorSettings.customRequestsEnabled === true;
  const requestsRestricted = creatorRestrictions.customRequestsRestricted === true;
  const bookingsEnabled = creatorSettings.bookingsEnabled === true;
  const bookingsRestricted = creatorRestrictions.bookingsRestricted === true;
  const bookingsAvailabilityConfigured = availabilityWindows.length > 0;
  const bookingsManagementState = bookingsRestricted
    ? "blocked"
    : bookingsEnabled && bookingsAvailabilityConfigured
      ? "connected"
      : bookingsEnabled
        ? "configuration_only"
        : "not_configured";
  const fanPassEnabled = creatorSettings.subscriptionsEnabled === true;
  const fanPassRestricted = creatorRestrictions.subscriptionsRestricted === true;
  const fanPassManagementState = fanPassRestricted
    ? "blocked"
    : fanPassEnabled && subscriptionPriceGd > 0
      ? "subscriber_visibility"
      : "configuration_only";
  const isReadOnlyProjection = settings?.projection?.readOnly === true;
  const publicProfileHref = buildCreatorPublicHref({
    creatorId,
    creatorUsername: typeof userProfile?.username === "string" ? userProfile.username : "",
    username: typeof userProfile?.username === "string" ? userProfile.username : "",
  });
  const handleSettingsErrorPrimaryAction = (action: HumanErrorAction) => {
    if (action === "refresh" || action === "retry") {
      setReloadNonce((current) => current + 1);
    }
  };

  const sections: Array<{
    id: string;
    title: string;
    state: SectionState;
    summary: string;
    detail: string;
    href?: string;
    actionLabel?: string;
    icon: React.ReactNode;
    sourceTruth?: string;
    sourceFreshness?: string;
    sampleCount?: number;
    fanPassManagementState?: "subscriber_visibility" | "configuration_only" | "blocked";
    bookingsManagementState?: "connected" | "configuration_only" | "blocked" | "not_configured";
    chatRouteConnected?: boolean;
    creatorEarningsSource?: string;
    creatorEarningsAttribution?: "creator_experience_paid_source";
  }> = [
    {
      id: "public_profile",
      title: "Public Profile",
      state: publicProfileHref ? "live" : "needs_setup",
      summary: publicProfileHref ? "Your fan-facing profile is live." : "Add a username to publish a public profile.",
      detail: publicProfileHref
        ? `Fans can find ${creatorName} at ${publicProfileHref}.`
        : "Set a username and display name, then publish the profile from creator settings.",
      href: publicProfileHref || "/dashboard/profile",
      actionLabel: publicProfileHref ? "Open profile" : "Open profile settings",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      id: "broadcasts",
      title: "Broadcasts",
      state: creatorRestrictions.broadcastsRestricted === true
        ? "blocked"
        : creatorSettings.broadcastsEnabled === true
          ? "live"
          : creatorSettings.broadcastsEnabled === false
            ? "blocked"
            : "not_configured",
      summary: creatorRestrictions.broadcastsRestricted === true
        ? "Broadcasts are blocked."
        : creatorSettings.broadcastsEnabled === true
          ? "Broadcasts are live and manageable."
          : "Broadcasts are not configured yet.",
      detail: "Use the broadcast manager to review delivery history and send new fan updates.",
      sourceTruth: creatorSettings.broadcastsEnabled === true && creatorRestrictions.broadcastsRestricted !== true ? "canonical" : "unavailable",
      sourceFreshness: creatorSettings.broadcastsEnabled === true && creatorRestrictions.broadcastsRestricted !== true ? "fresh" : "unavailable",
      icon: <Megaphone className="h-4 w-4" />,
    },
    {
      id: "fan_pass",
      title: "Fan Pass",
      state: creatorRestrictions.subscriptionsRestricted === true
        ? "blocked"
        : fanPassEnabled && subscriptionPriceGd > 0
          ? subscriptionsState
        : creatorSettings.subscriptionsEnabled === false
            ? "needs_setup"
            : "not_configured",
      summary: creatorRestrictions.subscriptionsRestricted === true
        ? "Fan Pass is blocked."
        : fanPassEnabled && subscriptionPriceGd > 0 && subscriptionsState === "live"
          ? "Fan Pass subscriber visibility is connected."
          : fanPassEnabled && subscriptionPriceGd > 0
            ? "Fan Pass source sample needs review."
          : "Fan Pass needs setup.",
      detail: fanPassRestricted
        ? "Fan Pass is restricted for this creator."
        : fanPassEnabled && subscriptionPriceGd > 0
          ? "Subscriber visibility is connected below. Public creator pages own Fan Pass membership changes."
          : "Fan Pass subscriber visibility is configuration-only until pricing is enabled.",
      sourceTruth: statsEvidence?.sourceTruth,
      sourceFreshness: statsEvidence?.sourceFreshness,
      sampleCount: statsEvidence?.sampleCount,
      fanPassManagementState,
      icon: <Wallet className="h-4 w-4" />,
    },
    {
      id: "messages",
      title: "Messages",
      state: creatorRestrictions.messagingRestricted === true
        ? "blocked"
        : creatorSettings.messagingEnabled === true
          ? "live"
          : creatorSettings.messagingEnabled === false
            ? "needs_setup"
            : "not_configured",
      summary: creatorRestrictions.messagingRestricted === true
        ? "Paid chat is blocked."
        : creatorSettings.messagingEnabled === true
          ? "Paid chat is live."
          : "Paid chat needs setup.",
      detail: messageSectionHref ? "Opens the existing chat dashboard." : "Chat is not enabled for this creator.",
      href: messageSectionHref,
      actionLabel: "Open chat",
      chatRouteConnected: Boolean(messageSectionHref),
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: "requests",
      title: "Requests",
      state: creatorRestrictions.customRequestsRestricted === true
        ? "blocked"
        : requestsEnabled
          ? requestsState
          : creatorSettings.customRequestsEnabled === false
            ? "needs_setup"
            : "not_configured",
      summary: requestsRestricted
        ? "Custom requests are blocked."
        : requestsEnabled && requestsState === "live"
        ? ((stats?.openRequests ?? 0) > 0 ? `${stats?.openRequests} open request${(stats?.openRequests ?? 0) === 1 ? "" : "s"}.` : "No open requests.")
        : requestsEnabled
          ? "Request source sample needs review."
          : "Custom requests are not enabled.",
      detail: requestsRestricted
        ? "Custom requests are blocked for this creator."
        : requestsEnabled
          ? "Manage pending custom requests below."
          : "Configuration-only until custom requests are enabled.",
      sourceTruth: statsEvidence?.sourceTruth,
      sourceFreshness: statsEvidence?.sourceFreshness,
      sampleCount: statsEvidence?.sampleCount,
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "bookings",
      title: "Live time / bookings",
      state: creatorRestrictions.bookingsRestricted === true
        ? "blocked"
        : bookingsEnabled && bookingsAvailabilityConfigured
          ? bookingsSourceState
        : creatorSettings.bookingsEnabled === false
            ? "needs_setup"
            : "not_configured",
      summary: bookingsRestricted
        ? "Bookings are blocked."
        : bookingsEnabled && !bookingsAvailabilityConfigured
          ? "Availability is required before bookings can be managed."
          : bookingsSourceState === "live"
        ? ((stats?.bookedCalls ?? 0) > 0 ? `${stats?.bookedCalls} bookings in flight.` : "No live bookings yet.")
        : "Booking source sample needs review.",
      detail: bookingsRestricted
        ? "Bookings are restricted for this creator."
        : bookingsEnabled && bookingsAvailabilityConfigured
          ? "Manage booked live-time sessions below."
          : bookingsEnabled
            ? "Configure availability before accepting bookings."
            : "Bookings are configuration-only until enabled.",
      sourceTruth: statsEvidence?.sourceTruth,
      sourceFreshness: statsEvidence?.sourceFreshness,
      sampleCount: statsEvidence?.sampleCount,
      bookingsManagementState,
      icon: <CalendarClock className="h-4 w-4" />,
    },
    {
      id: "availability",
      title: "Availability",
      state: availabilityWindows.length > 0 ? "live" : "not_configured",
      summary: availabilityWindows.length > 0 ? "Availability windows are configured." : "Availability is not configured yet.",
      detail: "Availability windows come from the creator settings document.",
      sourceTruth: settingsState === "configured" ? "canonical" : "partial",
      sourceFreshness: settingsState === "configured" ? "fresh" : "unknown",
      icon: <BookOpenText className="h-4 w-4" />,
    },
    {
      id: "earnings",
      title: "Earnings / payout",
      state: earningsState,
      summary: earningsState === "live" && stats ? `${stats.earningsGd.toLocaleString()} GD earned, ${stats.pendingCashoutGd.toLocaleString()} GD pending.` : "Earnings need source review.",
      detail: stats
        ? `Earnings are based on paid creator experiences. Ledger and payout totals are connected for review. Followers: ${stats.followerCount.toLocaleString()} | Active subscribers: ${stats.activeSubscribers.toLocaleString()}`
        : "Earnings roll up from the ledger and payout collections.",
      sourceTruth: statsEvidence?.sourceTruth,
      sourceFreshness: statsEvidence?.sourceFreshness,
      sampleCount: statsEvidence?.sampleCount,
      creatorEarningsSource: statsEvidence?.sources.ledgerAccruals.collection ?? "unavailable",
      creatorEarningsAttribution: "creator_experience_paid_source",
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      id: "audience",
      title: "Notifications / audience",
      state: audienceState,
      summary: audienceState === "live" && stats ? `${stats.followerCount.toLocaleString()} followers | ${stats.profileViewsCount.toLocaleString()} profile views.` : "Audience source sample needs review.",
      detail: "Audience visibility and follower state come from creator relationship records.",
      sourceTruth: statsEvidence?.sourceTruth,
      sourceFreshness: statsEvidence?.sourceFreshness,
      sampleCount: statsEvidence?.sampleCount,
      icon: <BellRing className="h-4 w-4" />,
    },
  ];
  const activeManager = openSection === "requests" ? (
    <CreatorRequestsManager
      creatorId={creatorId}
      creatorName={creatorName}
      enabled={requestsEnabled}
      restricted={requestsRestricted}
      readOnly={isReadOnlyProjection}
      sourceState={requestsState}
    />
  ) : openSection === "bookings" ? (
    <CreatorBookingsManager
      creatorId={creatorId}
      creatorName={creatorName}
      enabled={bookingsEnabled}
      restricted={bookingsRestricted}
      readOnly={isReadOnlyProjection}
      sourceState={bookingsSourceState}
      availabilityConfigured={bookingsAvailabilityConfigured}
    />
  ) : openSection === "fan_pass" ? (
    <CreatorFanPassManager
      creatorId={creatorId}
      creatorName={creatorName}
      enabled={fanPassEnabled}
      restricted={fanPassRestricted}
      priceGd={subscriptionPriceGd}
      readOnly={isReadOnlyProjection}
      sourceState={subscriptionsState}
    />
  ) : openSection === "broadcasts" ? (
    <CreatorBroadcastManager
      creatorId={creatorId}
      creatorName={creatorName}
      broadcastsEnabled={creatorSettings.broadcastsEnabled === true}
      broadcastsRestricted={creatorRestrictions.broadcastsRestricted === true}
    />
  ) : null;

  if (!isCreatorOrProjection) {
    return (
      <section className="mx-auto w-full max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-white">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-gray-400">Creator dashboard</p>
        <h2 className="mt-2 text-2xl font-black">Creator tools are not available on this account.</h2>
        <p className="mt-2 text-sm text-gray-300">Creator settings are only available to creator-role accounts.</p>
      </section>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  return (
    <div
      className="mx-auto w-full max-w-4xl space-y-3 px-3 pb-[calc(env(safe-area-inset-bottom)+7rem)] sm:space-y-4 sm:px-4 sm:pb-8"
      data-creator-dashboard-density="mobile_compact"
      data-bottom-nav-safe="true"
      data-report-issue-safe-offset="bottom-nav"
    >
      <div className="rounded-2xl border border-white/10 bg-black/50 p-3 sm:rounded-3xl sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Creator dashboard settings</p>
            <h1 className="mt-1 text-xl font-black text-white sm:text-2xl">Manage creator operations</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">Broadcasts, Fan Pass, bookings, requests, earnings, and public profile tools live here. The page stays read-only in admin projection mode.</p>
          </div>
          {isReadOnlyProjection ? (
            <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">Read-only projection</span>
          ) : null}
        </div>
        {settingsError ? (
          <HumanErrorNotice
            descriptor={settingsError.descriptor}
            compact
            className="mt-3"
            onPrimaryAction={handleSettingsErrorPrimaryAction}
            onSubmitBug={() => settingsBugReporter.submit(settingsError.descriptor, buildBugReportContext({
              descriptor: settingsError.descriptor,
              route: "/api/creator/settings",
              previousRoute: getSafePreviousRoute(),
              extra: {
                manager: "creator_settings",
                surface: "creator_dashboard",
                route: "/api/creator/settings",
                errorKey: settingsError.descriptor.errorKey,
              },
            }))}
          />
        ) : null}
        {!settingsError && sourceReviewNotice ? (
          <div
            className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100 sm:text-sm"
            data-creator-settings-source-state={settingsState}
            data-creator-settings-source-review={sourceReviewNotice.tone}
          >
            <p className="font-bold text-amber-50">{sourceReviewNotice.title}</p>
            <p className="mt-0.5 text-amber-100/85">{sourceReviewNotice.body}</p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            id={section.id}
            title={section.title}
            state={section.state}
            summary={section.summary}
            detail={section.detail}
            href={section.href}
            actionLabel={section.actionLabel}
            icon={section.icon}
            sourceTruth={section.sourceTruth}
            sourceFreshness={section.sourceFreshness}
            sampleCount={section.sampleCount}
            fanPassManagementState={section.fanPassManagementState}
            bookingsManagementState={section.bookingsManagementState}
            chatRouteConnected={section.chatRouteConnected}
            creatorEarningsSource={section.creatorEarningsSource}
            creatorEarningsAttribution={section.creatorEarningsAttribution}
            expanded={openSection === section.id}
            onToggle={() => {
              setOpenSection((current) => current === section.id ? null : section.id);
              trackEvent("creator_settings_section_opened", {
                actor_role: userProfile?.role || "creator",
                creator_id: creatorId,
                target_creator_id: creatorId,
                section: section.id,
                source_component: "CreatorDashboardSettingsHub",
                truth_state: section.state,
              });
            }}
          />
        ))}
      </div>

      <div className="space-y-2" data-creator-active-manager={openSection ?? "none"}>
        <p className="px-1 text-xs font-semibold text-gray-400">Open a section to load its manager.</p>
        {activeManager}
      </div>
    </div>
  );
}
