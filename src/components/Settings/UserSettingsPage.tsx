"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { useProfileState } from "@/app/dashboard/profile/hooks/useProfileState";
import { PageViewEvent } from "@/components/Analytics/PageViewEvent";
import {
  KandyAccountDetailsPanel,
  KandyNotificationsPanel,
  KandyPrivacyDataPanel,
  KandyProfilePanel,
  KandySupportSafetyPanel,
} from "@/components/creative-tim/kandydrops/account/AccountSettingsPanels";
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
      <section
        className="relative w-full px-[var(--account-settings-shell-side-padding)] pb-[var(--account-settings-bottom-safe-padding)] pt-5 [scroll-padding-bottom:var(--account-settings-bottom-safe-padding)] sm:px-0"
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

      {showCreatorCta ? (
        <div className="relative mb-5 overflow-hidden rounded-[1.7rem] border border-brand-purple/30 bg-[linear-gradient(135deg,rgba(178,140,255,0.22),rgba(20,13,31,0.94)_54%,rgba(255,111,207,0.13))] px-5 py-5 text-sm text-white shadow-[0_18px_42px_rgba(0,0,0,0.24)]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand-pink/20 blur-3xl" />
          <div className="relative">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-pink">Creator workspace</p>
          <p className="mt-1 text-lg font-black tracking-tight">Creator tools live separately.</p>
          <p className="mt-1 text-sm leading-6 text-white/70">Broadcasts, bookings, requests, and monetization settings are kept together in Creator Settings.</p>
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
            className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-brand-purple px-4 py-2 text-sm font-black text-white shadow-[0_0_24px_rgba(178,140,255,0.34)] transition hover:bg-brand-purple/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0915]"
          >
            Open Creator Settings
            <ArrowRight className="h-4 w-4" />
          </Link>
          </div>
        </div>
      ) : null}

      <form onSubmit={(event) => event.preventDefault()} className="space-y-5">
        <KandyProfilePanel state={state} />
        <KandyAccountDetailsPanel state={state} />
        <KandyNotificationsPanel state={state} />
        <KandyPrivacyDataPanel state={state} />
        <KandySupportSafetyPanel state={state} />
      </form>
    </section>
  );
}
