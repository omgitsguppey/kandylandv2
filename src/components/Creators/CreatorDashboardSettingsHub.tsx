"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BellRing, BookOpenText, CalendarClock, DollarSign, Loader2, Megaphone, MessageSquare, ShieldCheck, Users, Wallet } from "lucide-react";

import { useAdminViewAs } from "@/context/AdminViewAsContext";
import { useAuth, useUserProfile } from "@/context/AuthContext";
import { authFetch } from "@/lib/authFetch";
import { buildCreatorPublicHref } from "@/lib/creator-profile-routing";
import { trackEvent } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { CreatorBroadcastManager } from "@/components/Creators/CreatorBroadcastManager";

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

type CreatorSettingsResponse = {
  success?: boolean;
  creatorSettings?: Record<string, unknown> | null;
  creatorRestrictions?: Record<string, unknown> | null;
  stats?: CreatorDashboardStats | null;
  projection?: { readOnly?: boolean; targetCreatorId?: string } | null;
  error?: string;
};

type SectionState = "live" | "unavailable" | "not_configured" | "blocked" | "needs_setup" | "error";

function sectionTone(state: SectionState) {
  switch (state) {
    case "live":
      return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
    case "unavailable":
    case "blocked":
      return "border-red-400/20 bg-red-500/10 text-red-100";
    case "needs_setup":
      return "border-amber-400/20 bg-amber-500/10 text-amber-100";
    default:
      return "border-white/10 bg-white/5 text-gray-200";
  }
}

function SectionCard({
  title,
  state,
  summary,
  detail,
  href,
  icon,
  expanded,
  onToggle,
}: {
  title: string;
  state: SectionState;
  summary: string;
  detail: string;
  href?: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn("mt-0.5 rounded-2xl border p-2", sectionTone(state))}>{icon}</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white">{title}</h3>
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em]", sectionTone(state))}>
                {state.replaceAll("_", " ")}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-300">{summary}</p>
          </div>
        </div>
        <ArrowRight className={cn("h-4 w-4 shrink-0 text-gray-400 transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded ? (
        <div className="mt-3 border-t border-white/10 pt-3 text-sm text-gray-400">
          <p>{detail}</p>
          {href ? (
            <Link href={href} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-brand-purple">
              Open section
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function CreatorDashboardSettingsHub() {
  const { userProfile } = useUserProfile();
  const { viewAsState } = useAdminViewAs();
  const { user } = useAuth();
  const [settings, setSettings] = useState<CreatorSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("broadcasts");

  const creatorId = viewAsState?.adminViewingAsUserId || userProfile?.uid || "";
  const creatorName = viewAsState?.adminViewingAsDisplayName || userProfile?.displayName || "Creator";
  const query = useMemo(() => (viewAsState?.adminViewingAsUserId ? `?creatorId=${encodeURIComponent(viewAsState.adminViewingAsUserId)}` : ""), [viewAsState?.adminViewingAsUserId]);
  const isCreatorOrProjection = Boolean(viewAsState || userProfile?.role === "creator" || userProfile?.role === "admin");

  useEffect(() => {
    if (!isCreatorOrProjection) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const response = await authFetch(`/api/creator/settings${query}`);
        const body = await response.json().catch(() => ({})) as CreatorSettingsResponse;
        if (!response.ok) {
          throw new Error(body.error || "Creator dashboard could not be loaded.");
        }
        if (!cancelled) {
          setSettings(body);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Creator dashboard could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isCreatorOrProjection, query]);

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
  const creatorSettings = (settings?.creatorSettings ?? {}) as Record<string, unknown>;
  const creatorRestrictions = (settings?.creatorRestrictions ?? {}) as Record<string, unknown>;
  const availabilityWindows = Array.isArray(creatorSettings.availabilityWindows) ? creatorSettings.availabilityWindows : [];
  const subscriptionPriceGd = typeof creatorSettings.subscriptionPriceGd === "number" ? creatorSettings.subscriptionPriceGd : 0;
  const publicProfileHref = buildCreatorPublicHref({
    creatorId,
    creatorUsername: typeof userProfile?.username === "string" ? userProfile.username : "",
    username: typeof userProfile?.username === "string" ? userProfile.username : "",
  });

  const sections: Array<{
    id: string;
    title: string;
    state: SectionState;
    summary: string;
    detail: string;
    href?: string;
    icon: React.ReactNode;
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
      icon: <Megaphone className="h-4 w-4" />,
    },
    {
      id: "fan_pass",
      title: "Fan Pass",
      state: creatorRestrictions.subscriptionsRestricted === true
        ? "blocked"
        : creatorSettings.subscriptionsEnabled === true && subscriptionPriceGd > 0
          ? "live"
          : creatorSettings.subscriptionsEnabled === false
            ? "needs_setup"
            : "not_configured",
      summary: creatorRestrictions.subscriptionsRestricted === true
        ? "Fan Pass is blocked."
        : creatorSettings.subscriptionsEnabled === true && subscriptionPriceGd > 0
          ? "Fan Pass pricing is active."
          : "Fan Pass needs setup.",
      detail: `Subscription price: ${subscriptionPriceGd.toLocaleString()} GD.`,
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
      detail: "Message pricing and paid-GD guidance stay tied to server truth.",
      href: "/dashboard/chat",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      id: "requests",
      title: "Requests",
      state: creatorRestrictions.customRequestsRestricted === true
        ? "blocked"
        : creatorSettings.customRequestsEnabled === true
          ? "live"
          : creatorSettings.customRequestsEnabled === false
            ? "needs_setup"
            : "not_configured",
      summary: (stats?.openRequests ?? 0) > 0 ? `${stats?.openRequests} open request${(stats?.openRequests ?? 0) === 1 ? "" : "s"}.` : "No open requests.",
      detail: "Custom request pricing and status come from the creator request collection.",
      href: "/dashboard/creator",
      icon: <Users className="h-4 w-4" />,
    },
    {
      id: "bookings",
      title: "Live time / bookings",
      state: creatorRestrictions.bookingsRestricted === true
        ? "blocked"
        : creatorSettings.bookingsEnabled === true && availabilityWindows.length > 0
          ? "live"
          : creatorSettings.bookingsEnabled === false
            ? "needs_setup"
            : "not_configured",
      summary: (stats?.bookedCalls ?? 0) > 0 ? `${stats?.bookedCalls} bookings in flight.` : "No live bookings yet.",
      detail: "Booking windows, rates, and availability are backed by the creator booking route.",
      href: "/dashboard/creator",
      icon: <CalendarClock className="h-4 w-4" />,
    },
    {
      id: "availability",
      title: "Availability",
      state: availabilityWindows.length > 0 ? "live" : "not_configured",
      summary: availabilityWindows.length > 0 ? "Availability windows are configured." : "Availability is not configured yet.",
      detail: "Availability windows come from the creator settings document.",
      href: "/dashboard/creator",
      icon: <BookOpenText className="h-4 w-4" />,
    },
    {
      id: "earnings",
      title: "Earnings / payout",
      state: stats ? "live" : "unavailable",
      summary: stats ? `${stats.earningsGd.toLocaleString()} GD earned, ${stats.pendingCashoutGd.toLocaleString()} GD pending.` : "Earnings are unavailable.",
      detail: stats
        ? `Followers: ${stats.followerCount.toLocaleString()} | Active subscribers: ${stats.activeSubscribers.toLocaleString()}`
        : "Earnings roll up from the ledger and payout collections.",
      href: "/dashboard/creator",
      icon: <DollarSign className="h-4 w-4" />,
    },
    {
      id: "audience",
      title: "Notifications / audience",
      state: stats ? "live" : "unavailable",
      summary: stats ? `${stats.followerCount.toLocaleString()} followers | ${stats.profileViewsCount.toLocaleString()} profile views.` : "Audience metrics unavailable.",
      detail: "Audience visibility and follower state come from the creator relationship collections.",
      href: "/dashboard/creator",
      icon: <BellRing className="h-4 w-4" />,
    },
  ];

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
    <div className="mx-auto w-full max-w-4xl space-y-4 px-3 pb-8 sm:px-4">
      <div className="rounded-3xl border border-white/10 bg-black/50 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-gray-400">Creator dashboard settings</p>
            <h1 className="mt-1 text-2xl font-black text-white">Manage creator operations</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-300">Broadcasts, Fan Pass, bookings, requests, earnings, and public profile tools live here. The page stays read-only in admin projection mode.</p>
          </div>
          {settings?.projection?.readOnly ? (
            <span className="rounded-full border border-brand-purple/20 bg-brand-purple/10 px-3 py-1 text-xs font-bold text-brand-purple">Read-only projection</span>
          ) : null}
        </div>
        {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            title={section.title}
            state={section.state}
            summary={section.summary}
            detail={section.detail}
            href={section.href}
            icon={section.icon}
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

      <CreatorBroadcastManager creatorId={creatorId} creatorName={creatorName} />
    </div>
  );
}
