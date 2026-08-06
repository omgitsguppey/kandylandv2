"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { useProfileState } from "@/app/dashboard/profile/hooks/useProfileState";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import { Badge } from "@/components/creative-tim/ui/badge";
import { Card } from "@/components/creative-tim/ui/card";
import { ProfileAccountSection } from "@/app/dashboard/profile/components/ProfileAccountSection";
import { ProfileNotificationsSection } from "@/app/dashboard/profile/components/ProfileNotificationsSection";
import { ProfilePrivacyDataSection } from "@/app/dashboard/profile/components/ProfilePrivacyDataSection";
import { ProfileProfileSection } from "@/app/dashboard/profile/components/ProfileProfileSection";
import { ProfileSupportSafetySection } from "@/app/dashboard/profile/components/ProfileSupportSafetySection";
import { CREATOR_SETTINGS_ROUTE } from "@/lib/creator-profile-routing";
import { trackEvent } from "@/lib/telemetry";
import { USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET } from "@/lib/user-mobile-shell";

const ACCOUNT_SETTINGS_BOTTOM_SAFE_PADDING =
  `calc(${USER_MOBILE_FLOATING_CONTROL_BOTTOM_OFFSET} + env(safe-area-inset-bottom) + 5.5rem)`;
const ACCOUNT_SETTINGS_SHELL_SIDE_PADDING = "clamp(0.75rem, 4vw, 1rem)";

export function UserSettingsPage() {
  const state = useProfileState();
  const actorRole = state.userProfile?.role || "user";
  const creatorId = state.userProfile?.uid || "";
  const accountSettingsShellStyle = {
    "--account-settings-bottom-safe-padding": ACCOUNT_SETTINGS_BOTTOM_SAFE_PADDING,
    "--account-settings-shell-side-padding": ACCOUNT_SETTINGS_SHELL_SIDE_PADDING,
  } as CSSProperties;

  if (!state.userProfile) {
    return (
      <div className="flex h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" aria-hidden="true" />
      </div>
    );
  }

  const showCreatorCta = state.userProfile?.role === "creator";

    return (
      <div
        className="relative isolate mx-auto min-h-screen w-full max-w-lg overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(164,118,255,0.18),_transparent_32rem),linear-gradient(180deg,_#111116_0%,_#050506_42%,_#000_100%)] px-[var(--account-settings-shell-side-padding)] pb-[var(--account-settings-bottom-safe-padding)] [scroll-padding-bottom:var(--account-settings-bottom-safe-padding)] sm:px-0"
      data-account-settings-bottom-safe="true"
      data-settings-bottom-safe="true"
      data-account-settings-side-padding-parity="true"
      data-account-settings-shell-aligned="true"
      data-report-issue-chip-untouched="true"
      data-delete-account-visible-above-floating-actions="true"
      style={accountSettingsShellStyle}
      >
      <PageViewEvent
        eventName="user_settings_viewed"
        eventParams={{
          actor_role: actorRole,
          creator_id: creatorId,
          target_creator_id: creatorId,
          section: "user_settings",
          source_component: "UserSettingsPage",
          truth_state: "live",
        }}
      />
      <PageViewEvent
        eventName="settings_surface_viewed"
        eventParams={{
          actor_role: actorRole,
          creator_id: creatorId,
          target_creator_id: creatorId,
          section: "account",
          settings_surface: "account",
          source_component: "UserSettingsPage",
          truth_state: "source_ready",
        }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_20%_0%,rgba(164,118,255,0.16),transparent_58%)]" />

      <Card className="relative -mx-[var(--account-settings-shell-side-padding)] sticky top-0 z-10 !gap-0 !rounded-none !border-x-0 !border-t-0 !border-b-white/10 !bg-black/78 !p-0 shadow-[0_14px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:mx-0 sm:!rounded-b-[1.35rem] sm:!border-x sm:!border-t sm:!border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand-purple/30 bg-brand-purple/15 shadow-[0_0_22px_rgba(164,118,255,0.14)]">
            <span className="text-sm font-black text-brand-purple">{state.avatarFallback}</span>
          </div>
          <div>
            <h1 className="text-lg font-black leading-none tracking-tight text-white">{state.profileName}</h1>
            <p className="mt-1 text-[10px] font-semibold tracking-wide text-gray-400">{state.profileEmail}</p>
          </div>
        </div>
        <Badge className="hidden h-7 rounded-full border-brand-purple/25 bg-brand-purple/10 px-2.5 text-[10px] font-black uppercase tracking-[0.15em] text-purple-100 shadow-none hover:bg-brand-purple/10 sm:inline-flex">
          Account
        </Badge>
        </div>
      </Card>

      {showCreatorCta ? (
        <Card className="relative mt-5 !gap-0 !overflow-hidden !rounded-[1.45rem] !border-brand-purple/30 !bg-[linear-gradient(135deg,rgba(164,118,255,0.18),rgba(18,18,23,0.92)_55%)] !p-0 text-sm text-white shadow-[0_18px_40px_rgba(0,0,0,0.24)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand-purple/20 blur-3xl" />
          <div className="relative px-4 py-4">
          <p className="font-black">Creator tools moved to Creator Settings.</p>
          <p className="mt-1 text-xs leading-5 text-white/75">Broadcasts, bookings, requests, and monetization settings live in one creator workspace.</p>
          <Link
            href={CREATOR_SETTINGS_ROUTE}
            onClick={() => {
              trackEvent("user_settings_creator_tools_cta_clicked", {
                actor_role: state.userProfile?.role || "user",
                creator_id: creatorId,
                target_creator_id: creatorId,
                section: "creator_dashboard_cta",
                source_component: "UserSettingsPage",
                truth_state: "migrated",
              });
            }}
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-purple px-4 py-2 text-sm font-black text-white shadow-[0_0_24px_rgba(164,118,255,0.34)] transition hover:bg-brand-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Open Creator Settings
            <ArrowRight className="h-4 w-4" />
          </Link>
          </div>
        </Card>
      ) : null}

      <form onSubmit={(event) => event.preventDefault()} className="relative space-y-4 pt-5">
        <ProfileProfileSection state={state} />
        <ProfileAccountSection state={state} />
        <ProfileNotificationsSection state={state} />
        <ProfilePrivacyDataSection state={state} />
        <ProfileSupportSafetySection state={state} />
      </form>
    </div>
  );
}
