"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { useProfileState } from "@/app/dashboard/profile/hooks/useProfileState";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
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
        <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
      </div>
    );
  }

  const showCreatorCta = state.userProfile?.role === "creator";

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-lg bg-black px-[var(--account-settings-shell-side-padding)] pb-[var(--account-settings-bottom-safe-padding)] [scroll-padding-bottom:var(--account-settings-bottom-safe-padding)] sm:px-0"
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

      <div className="-mx-[var(--account-settings-shell-side-padding)] sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-md sm:mx-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-brand-purple/20 flex items-center justify-center">
            <span className="text-sm font-bold text-brand-purple">{state.avatarFallback}</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight leading-none">{state.profileName}</h1>
            <p className="mt-0.5 text-[10px] font-medium text-gray-400">{state.profileEmail}</p>
          </div>
        </div>
      </div>

      {showCreatorCta ? (
        <div className="mt-4 rounded-2xl border border-brand-purple/30 bg-brand-purple/10 px-4 py-3 text-sm text-white">
          <p className="font-bold">Creator tools moved to Creator Settings.</p>
          <p className="mt-1 text-xs text-white/75">Broadcasts, bookings, requests, and monetization settings live in one creator workspace.</p>
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
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-purple px-4 py-2 text-sm font-bold text-white"
          >
            Open Creator Settings
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}

      <form onSubmit={(event) => event.preventDefault()} className="space-y-4 pt-4">
        <ProfileProfileSection state={state} />
        <ProfileAccountSection state={state} />
        <ProfileNotificationsSection state={state} />
        <ProfilePrivacyDataSection state={state} />
        <ProfileSupportSafetySection state={state} />
      </form>
    </div>
  );
}
