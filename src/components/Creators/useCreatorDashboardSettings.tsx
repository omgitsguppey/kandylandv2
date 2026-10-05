"use client";

import type { CreatorSettingsRunwayScope } from "@/components/creative-tim/kandydrops/creator/CreatorSettingsWorkstreamRail";

import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, BookOpenText, CalendarClock, DollarSign, Megaphone, MessageSquare, ShieldCheck, Users, Wallet } from "lucide-react";

import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";
import { resolveClientActionError, type ResolvedClientActionError } from "@/lib/errors/client-error-adapter";
import type { HumanErrorAction } from "@/lib/errors/error-language";
import { trackEvent } from "@/lib/telemetry";
import { getMobileModuleClassNames } from "@/lib/frontend-hardening/ui/mobile-scale-contract";
import { getMobileSkeletonClass } from "@/lib/frontend-hardening/ui/loading-state-contract";

import { resolveCreatorPricing } from "@/lib/creator-settings/creator-pricing-resolver";
import { pickCreatorSettingsControlPlaneSection, type CreatorSettingsCompletion, type CreatorSettingsControlPlane, type CreatorSettingsSectionId, type CreatorSettingsUserFacingImpact } from "@/lib/creator-settings/creator-settings-contract";

import { useSubmitBugReport } from "@/hooks/useSubmitBugReport";

type CreatorDashboardStats = {
  earningsGd: number;
  pendingCashoutGd: number;
  followerCount: number;
  profileViewsCount: number;
  liveDropsCount: number;
  contentCount?: number;
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
    fans?: CreatorStatsEvidenceSource;
    content?: CreatorStatsEvidenceSource;
    ledgerAccruals: CreatorStatsEvidenceSource;
    pendingPayouts: CreatorStatsEvidenceSource;
    subscriptions: CreatorStatsEvidenceSource;
    customRequests: CreatorStatsEvidenceSource;
    callBookings: CreatorStatsEvidenceSource;
    relationshipsOps: CreatorStatsEvidenceSource;
    drops: CreatorStatsEvidenceSource;
    userProfile: CreatorStatsEvidenceSource;
  };
  fanCountSource?: "relationship_count" | "profile_follower_count" | "settings_snapshot" | "unavailable";
  contentCountScope?: "creator_owned_or_assigned";
  issues: string[];
};

type CreatorSettingsResponse = {
  success?: boolean;
  settingsState?: "configured" | "not_configured";
  creatorSettings?: Record<string, unknown> | null;
  settings?: CreatorSettingsControlPlane | null;
  settingsCompletion?: CreatorSettingsCompletion | null;
  missingSetupItems?: CreatorSettingsSectionId[];
  sourceTruth?: string;
  userFacingImpact?: CreatorSettingsUserFacingImpact | null;
  creatorRestrictions?: Record<string, unknown> | null;
  stats?: CreatorDashboardStats | null;
  statsEvidence?: CreatorStatsEvidence | null;
  projection?: { readOnly?: boolean; targetCreatorId?: string } | null;
  error?: string;
};

const creatorOverviewModuleClassName = getMobileModuleClassNames("creator", "overview");
export const creatorManagerModuleClassName = getMobileModuleClassNames("creator", "manager");
export const creatorSettingsHeaderSkeletonClassName = getMobileSkeletonClass("creator", "manager");
export const creatorSettingsCardSkeletonClassName = getMobileSkeletonClass("creator", "overview");

type SectionState = "live" | "unavailable" | "not_configured" | "blocked" | "needs_setup" | "needs_review" | "error";

function creatorSectionStateFromEvidence(source: CreatorStatsEvidenceSource | undefined, fallbackValue = 0): SectionState {
  if (!source) return "unavailable";
  if ((source.state === "verified_sample" || source.state === "queried_zero") && source.sampleKnown) return "live";
  if (source.state === "unavailable") return "unavailable";
  if ((source.state === "verified_sample" || source.state === "queried_zero") && !source.sampleKnown) return "needs_review";
  if (source.state === "partial" || source.state === "missing_source" || source.state === "needs_review") return "needs_review";
  return fallbackValue > 0 ? "needs_review" : "unavailable";
}

function combineEvidenceState(...states: SectionState[]): SectionState {
  if (states.includes("unavailable")) return "unavailable";
  if (states.includes("needs_review")) return "needs_review";
  return states.every((state) => state === "live") ? "live" : "needs_review";
}

export function useCreatorDashboardSettings() {
const { userProfile } = useUserProfile();
const { viewAsState } = useAdminViewAs();
const { user } = useAuth();
const settingsBugReporter = useSubmitBugReport();
const [settings, setSettings] = useState<CreatorSettingsResponse | null>(null);
const [loading, setLoading] = useState(true);
const [settingsError, setSettingsError] = useState<ResolvedClientActionError | null>(null);
const [settingsSaveError, setSettingsSaveError] = useState<string | null>(null);
const [draftSettings, setDraftSettings] = useState<CreatorSettingsControlPlane | null>(null);
const [savingSection, setSavingSection] = useState<CreatorSettingsSectionId | null>(null);
const [openSection, setOpenSection] = useState<string | null>(null);
const [activeControlDeck, setActiveControlDeck] = useState<CreatorSettingsSectionId>("profile_basics");
const [reloadNonce, setReloadNonce] = useState(0);
const dashboardRequestIdRef = useRef(0);
const savingSectionRef = useRef<CreatorSettingsSectionId | null>(null);
const settingsSurfaceGenerationRef = useRef({ identity: "", generation: 0 });
const loadedSettingsSurfaceIdentityRef = useRef<string | null>(null);
const creatorId = viewAsState?.adminViewingAsUserId || userProfile?.uid || "";
const creatorName = viewAsState?.adminViewingAsDisplayName || userProfile?.displayName || "Creator";
const query = useMemo(() => (viewAsState?.adminViewingAsUserId ? `?creatorId=${encodeURIComponent(viewAsState.adminViewingAsUserId)}` : ""), [viewAsState?.adminViewingAsUserId]);
const isCreatorOrProjection = Boolean(viewAsState || userProfile?.role === "creator");
const canLoadCreatorDashboard = Boolean(user?.uid && creatorId && isCreatorOrProjection);
const settingsSurfaceIdentity = JSON.stringify([
    user?.uid ?? "signed-out",
    creatorId || "no-creator",
    viewAsState ? "projection" : "own-account",
    viewAsState?.viewAsActorUid ?? "",
    viewAsState?.simulationStartedAt ?? "",
  ]);
if (settingsSurfaceGenerationRef.current.identity !== settingsSurfaceIdentity) {
    settingsSurfaceGenerationRef.current = {
      identity: settingsSurfaceIdentity,
      generation: settingsSurfaceGenerationRef.current.generation + 1,
    };
  }
const settingsSurfaceGeneration = settingsSurfaceGenerationRef.current.generation;
const settingsBelongToCurrentSurface = loadedSettingsSurfaceIdentityRef.current === settingsSurfaceIdentity;
const currentSurfaceSettings = settingsBelongToCurrentSurface ? settings : null;
useEffect(() => {
    savingSectionRef.current = null;
    setSavingSection(null);
    setSettingsSaveError(null);
    setOpenSection(null);
  }, [settingsSurfaceGeneration]);
useEffect(() => {
    if (!canLoadCreatorDashboard) {
      loadedSettingsSurfaceIdentityRef.current = null;
      setSettings(null);
      setDraftSettings(null);
      setSettingsError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const requestId = dashboardRequestIdRef.current + 1;
    dashboardRequestIdRef.current = requestId;
    loadedSettingsSurfaceIdentityRef.current = null;
    async function load() {
      try {
        setLoading(true);
        setSettingsError(null);
        setSettings(null);
        setDraftSettings(null);
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
            loadedSettingsSurfaceIdentityRef.current = settingsSurfaceIdentity;
            setSettingsError(resolved);
          }
          return;
        }
        if (!cancelled && dashboardRequestIdRef.current === requestId) {
          loadedSettingsSurfaceIdentityRef.current = settingsSurfaceIdentity;
          setSettings(body);
          setDraftSettings(body.settings ?? null);
        }
      } catch (loadError) {
        if (!cancelled && dashboardRequestIdRef.current === requestId) {
          loadedSettingsSurfaceIdentityRef.current = settingsSurfaceIdentity;
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
  }, [canLoadCreatorDashboard, creatorId, query, reloadNonce, settingsSurfaceIdentity]);
useEffect(() => {
    if (!isCreatorOrProjection || !settingsBelongToCurrentSurface || !currentSurfaceSettings) {
      return;
    }

    trackEvent("creator_dashboard_settings_viewed", {
      actor_role: userProfile?.role || "creator",
      creator_id: creatorId,
      target_creator_id: creatorId,
      section: "dashboard",
      source_component: "CreatorDashboardSettingsHub",
      truth_state: currentSurfaceSettings?.projection?.readOnly ? "blocked" : "live",
    });
    trackEvent("settings_surface_viewed", {
      actor_role: userProfile?.role || "creator",
      creator_id: creatorId,
      target_creator_id: creatorId,
      section: "creator",
      settings_surface: "creator",
      source_component: "CreatorDashboardSettingsHub",
      truth_state: currentSurfaceSettings?.projection?.readOnly ? "blocked" : "source_ready",
    });
  }, [creatorId, currentSurfaceSettings, isCreatorOrProjection, settingsBelongToCurrentSurface, userProfile?.role]);
const stats = currentSurfaceSettings?.stats ?? null;
const statsEvidence = currentSurfaceSettings?.statsEvidence ?? null;
const settingsState = currentSurfaceSettings?.settingsState ?? (currentSurfaceSettings?.creatorSettings ? "configured" : "not_configured");
const creatorSettings = (currentSurfaceSettings?.creatorSettings ?? {}) as Record<string, unknown>;
const controlPlaneSettings = settingsBelongToCurrentSurface
    ? draftSettings ?? currentSurfaceSettings?.settings ?? null
    : null;
const settingsCompletion = currentSurfaceSettings?.settingsCompletion ?? null;
const creatorRestrictions = (currentSurfaceSettings?.creatorRestrictions ?? {}) as Record<string, unknown>;
const sourceReviewNotice = useMemo(() => {
    if (!currentSurfaceSettings || settingsError) {
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
  }, [currentSurfaceSettings, settingsError, settingsState, statsEvidence?.issues, statsEvidence?.sourceTruth]);
const availabilityWindows = Array.isArray(creatorSettings.availabilityWindows) ? creatorSettings.availabilityWindows : [];
const creatorPricing = resolveCreatorPricing(creatorSettings, {
    bookingServiceType: "video",
    bookingDurationMinutes: 1,
  });
const subscriptionPriceGd = creatorPricing.fanPass.priceGd;
const requestsState = creatorSectionStateFromEvidence(statsEvidence?.sources.customRequests, stats?.openRequests ?? 0);
const bookingsSourceState = creatorSectionStateFromEvidence(statsEvidence?.sources.callBookings, stats?.bookedCalls ?? 0);
const subscriptionsState = creatorSectionStateFromEvidence(statsEvidence?.sources.subscriptions, stats?.activeSubscribers ?? 0);
const earningsState = combineEvidenceState(
    creatorSectionStateFromEvidence(statsEvidence?.sources.ledgerAccruals, stats?.earningsGd ?? 0),
    creatorSectionStateFromEvidence(statsEvidence?.sources.pendingPayouts, stats?.pendingCashoutGd ?? 0),
  );
const audienceState = combineEvidenceState(
    creatorSectionStateFromEvidence(statsEvidence?.sources.fans ?? statsEvidence?.sources.relationshipsOps, stats?.followerCount ?? 0),
    creatorSectionStateFromEvidence(statsEvidence?.sources.userProfile, stats?.profileViewsCount ?? 0),
  );
const dashboardContentCount = stats?.contentCount ?? stats?.liveDropsCount ?? 0;
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
const isReadOnlyProjection = currentSurfaceSettings?.projection?.readOnly === true;
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
const updateDraftSettings = <Key extends keyof CreatorSettingsControlPlane>(key: Key, value: CreatorSettingsControlPlane[Key]) => {
    setDraftSettings((current) => current ? { ...current, [key]: value } : current);
  };
const saveSettingsSection = async (section: CreatorSettingsSectionId) => {
    if (
      !controlPlaneSettings
      || !settingsBelongToCurrentSurface
      || isReadOnlyProjection
      || savingSectionRef.current !== null
    ) {
      return;
    }

    savingSectionRef.current = section;
    const saveSurfaceGeneration = settingsSurfaceGenerationRef.current.generation;
    const submittedDraftSettings = controlPlaneSettings;
    const submittedSectionSettings = pickCreatorSettingsControlPlaneSection(submittedDraftSettings, section);
    const isCurrentSaveSurface = () => (
      settingsSurfaceGenerationRef.current.generation === saveSurfaceGeneration
    );
    try {
      setSavingSection(section);
      setSettingsSaveError(null);
      const response = await authFetch("/api/creator/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: submittedSectionSettings }),
      });
      const body = await response.json().catch(() => ({})) as CreatorSettingsResponse & { message?: string; errors?: string[] };
      if (!isCurrentSaveSurface()) {
        return;
      }
      if (!response.ok) {
        const message = Array.isArray(body.errors) && body.errors.length > 0
          ? body.errors.join(" ")
          : body.message || "Creator settings could not be saved.";
        setSettingsSaveError(message);
        trackEvent("setting_save_failed", {
          actor_role: userProfile?.role || "creator",
          creator_id: creatorId,
          target_creator_id: creatorId,
          setting_id: section,
          settings_surface: "creator",
          section,
          source_component: "CreatorDashboardSettingsHub",
          truth_state: "source_ready",
          failure_code: `http_${response.status}`,
        });
        return;
      }

      setSettings((current) => ({
        ...(current ?? {}),
        ...body,
      }));
      setDraftSettings((current) => (
        current === submittedDraftSettings && body.settings
          ? {
              ...current,
              ...pickCreatorSettingsControlPlaneSection(body.settings, section),
            }
          : current
      ));
      trackEvent("creator_settings_control_plane_saved", {
        actor_role: userProfile?.role || "creator",
        creator_id: creatorId,
        target_creator_id: creatorId,
        section,
        source_component: "CreatorDashboardSettingsHub",
        truth_state: "creator_settings_doc",
      });
      trackEvent("creator_setting_updated", {
        actor_role: userProfile?.role || "creator",
        creator_id: creatorId,
        target_creator_id: creatorId,
        setting_id: section,
        settings_surface: "creator",
        section,
        source_component: "CreatorDashboardSettingsHub",
        truth_state: "creator_settings_doc",
      });
      trackEvent("setting_save_succeeded", {
        actor_role: userProfile?.role || "creator",
        creator_id: creatorId,
        target_creator_id: creatorId,
        setting_id: section,
        settings_surface: "creator",
        section,
        source_component: "CreatorDashboardSettingsHub",
        truth_state: "creator_settings_doc",
      });
    } catch {
      if (!isCurrentSaveSurface()) {
        return;
      }
      setSettingsSaveError("Creator settings could not be saved. Try again.");
      trackEvent("setting_save_failed", {
        actor_role: userProfile?.role || "creator",
        creator_id: creatorId,
        target_creator_id: creatorId,
        setting_id: section,
        settings_surface: "creator",
        section,
        source_component: "CreatorDashboardSettingsHub",
        truth_state: "source_ready",
        failure_code: "network_or_unknown",
      });
    } finally {
      if (isCurrentSaveSurface() && savingSectionRef.current === section) {
        savingSectionRef.current = null;
        setSavingSection(null);
      }
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
        ? `Earnings are based on paid creator experiences. Ledger and payout totals are connected for review. Fans: ${stats.followerCount.toLocaleString()} | Active subscribers: ${stats.activeSubscribers.toLocaleString()}`
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
      summary: audienceState === "live" && stats ? `${stats.followerCount.toLocaleString()} Fans | ${dashboardContentCount.toLocaleString()} Content | ${stats.profileViewsCount.toLocaleString()} content views.` : "Audience source sample needs review.",
      detail: "Audience visibility and fan state come from creator relationship records. Content uses creator-owned or assigned drops, while content views stay separate.",
      sourceTruth: statsEvidence?.sourceTruth,
      sourceFreshness: statsEvidence?.sourceFreshness,
      sampleCount: statsEvidence?.sampleCount,
      icon: <BellRing className="h-4 w-4" />,
    },
  ];
const settingScopes: CreatorSettingsRunwayScope[] = [
    { id: "setting:profile_basics", kind: "setting", title: "Profile", state: settingsState === "configured" ? "live" : "needs_setup", summary: "Name and public bio.", detail: "Set the public basics fans see before they follow or unlock.", sourceTruth: statsEvidence?.sourceTruth, sourceFreshness: statsEvidence?.sourceFreshness },
    { id: "setting:fan_pass", kind: "setting", title: "Fan Pass", state: fanPassEnabled ? "live" : "needs_setup", summary: "Membership access and paid-source price.", detail: "Set Fan Pass access, price, and welcome copy in one save scope.", sourceTruth: statsEvidence?.sourceTruth, sourceFreshness: statsEvidence?.sourceFreshness, fanPassManagementState },
    { id: "setting:gumdrop_experiences", kind: "setting", title: "Experiences", state: requestsEnabled || bookingsEnabled ? "live" : "needs_setup", summary: "Requests and live-time pricing.", detail: "Set creator requests and booking availability rules without changing their operational managers.", sourceTruth: statsEvidence?.sourceTruth, sourceFreshness: statsEvidence?.sourceFreshness },
    { id: "setting:broadcasts", kind: "setting", title: "Broadcasts", state: creatorSettings.broadcastsEnabled === true ? "live" : "needs_setup", summary: "Audience announcements.", detail: "Set who hears creator broadcasts before working in the broadcast manager.", sourceTruth: statsEvidence?.sourceTruth, sourceFreshness: statsEvidence?.sourceFreshness },
    { id: "setting:timeline", kind: "setting", title: "Timeline", state: controlPlaneSettings?.profileTimelineEnabled ? "live" : "needs_setup", summary: "What reaches your profile.", detail: "Set timeline visibility without exposing admin-only publication controls.", sourceTruth: statsEvidence?.sourceTruth, sourceFreshness: statsEvidence?.sourceFreshness },
  ];
const operationScopes: CreatorSettingsRunwayScope[] = sections.map((section) => ({
    id: `operation:${section.id}`,
    kind: "operation",
    title: section.title,
    state: section.state,
    summary: section.summary,
    detail: section.detail,
    href: section.href,
    actionLabel: section.actionLabel,
    sourceTruth: section.sourceTruth,
    sourceFreshness: section.sourceFreshness,
    sampleCount: section.sampleCount,
    fanPassManagementState: section.fanPassManagementState,
    bookingsManagementState: section.bookingsManagementState,
    chatRouteConnected: section.chatRouteConnected,
    creatorEarningsSource: section.creatorEarningsSource,
    creatorEarningsAttribution: section.creatorEarningsAttribution,
  }));
const runwayScopes = [...settingScopes, ...operationScopes];
const activeScopeId = openSection ? `operation:${openSection}` : `setting:${activeControlDeck}`;
const activeScope = runwayScopes.find((scope) => scope.id === activeScopeId) ?? settingScopes[0];
const selectRunwayScope = (scopeId: string) => {
    const selectedScope = runwayScopes.find((scope) => scope.id === scopeId);
    if (!selectedScope) return;

    if (selectedScope.kind === "setting") {
      setActiveControlDeck(selectedScope.id.replace("setting:", "") as CreatorSettingsSectionId);
      setOpenSection(null);
      return;
    }

    const sectionId = selectedScope.id.replace("operation:", "");
    setOpenSection(sectionId);
    trackEvent("creator_settings_section_opened", {
      actor_role: userProfile?.role || "creator",
      creator_id: creatorId,
      target_creator_id: creatorId,
      section: sectionId,
      source_component: "CreatorDashboardSettingsHub",
      truth_state: selectedScope.state,
    });
  };
return { settingsBugReporter, loading, settingsError, settingsSaveError, savingSection, openSection, activeControlDeck, creatorId, creatorName, isCreatorOrProjection, settingsBelongToCurrentSurface, currentSurfaceSettings, statsEvidence, settingsState, creatorSettings, controlPlaneSettings, settingsCompletion, creatorRestrictions, sourceReviewNotice, creatorPricing, subscriptionPriceGd, requestsState, bookingsSourceState, subscriptionsState, requestsEnabled, requestsRestricted, bookingsEnabled, bookingsRestricted, bookingsAvailabilityConfigured, fanPassEnabled, fanPassRestricted, isReadOnlyProjection, handleSettingsErrorPrimaryAction, updateDraftSettings, saveSettingsSection, runwayScopes, activeScope, selectRunwayScope };
}
