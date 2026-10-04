"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";

import { useProfileState } from "@/app/dashboard/profile/hooks/useProfileState";
import { usePageViewEvent } from "@/components/Analytics/PageViewEvent";
import {
  KandyAccountDetailsPanel,
  KandyNotificationsPanel,
  KandyPrivacyDataPanel,
  KandyProfilePanel,
  KandySupportSafetyPanel,
} from "@/components/creative-tim/kandydrops/account/AccountSettingsPanels";
import { Card, CardContent } from "@/components/creative-tim/ui/card";
import { buttonVariants } from "@/components/ui/Button";
import { useAuthLoading } from "@/context/AuthContext";
import { CREATOR_SETTINGS_ROUTE } from "@/lib/creator-profile-routing";
import { trackEvent } from "@/lib/telemetry";
import { USER_MOBILE_BOTTOM_NAV_SAFE_GAP } from "@/lib/user-mobile-shell";

// The root shell already reserves the bottom navigation and safe area.
// This local clearance covers only the existing h-11 report chip and its gap.
const ACCOUNT_SETTINGS_BOTTOM_SAFE_PADDING = `calc(2.75rem + ${USER_MOBILE_BOTTOM_NAV_SAFE_GAP})`;
// The same chip is h-11 with md:bottom-7 on wider screens.
const ACCOUNT_SETTINGS_DESKTOP_BOTTOM_SAFE_PADDING = "calc(2.75rem + 1.75rem)";
const ACCOUNT_SETTINGS_SHELL_SIDE_PADDING = "0rem";

export function UserSettingsPage() {
  const state = useProfileState();
  const { loading } = useAuthLoading();
  const actorRole = state.userProfile?.role || "user";
  const creatorId = state.userProfile?.uid || "";
  const actor = { id: state.user?.uid ?? null, loading };
  usePageViewEvent({ eventName: "user_settings_viewed", eventParams: { actor_role: actorRole, creator_id: creatorId, target_creator_id: creatorId, section: "user_settings", source_component: "UserSettingsPage", truth_state: "live" }, actor, ready: state.accountReady });
  usePageViewEvent({ eventName: "settings_surface_viewed", eventParams: { actor_role: actorRole, creator_id: creatorId, target_creator_id: creatorId, section: "account", settings_surface: "account", source_component: "UserSettingsPage", truth_state: "source_ready" }, actor, ready: state.accountReady });
  const accountSettingsShellStyle = {
    "--account-settings-bottom-safe-padding": ACCOUNT_SETTINGS_BOTTOM_SAFE_PADDING,
    "--account-settings-desktop-bottom-safe-padding": ACCOUNT_SETTINGS_DESKTOP_BOTTOM_SAFE_PADDING,
    "--account-settings-shell-side-padding": ACCOUNT_SETTINGS_SHELL_SIDE_PADDING,
  } as CSSProperties;

  if (!state.userProfile) {
    return (
      <Card className="shadow-none">
        <CardContent className="min-w-0 space-y-3 break-words" role="status" aria-live="polite">
          {loading || state.profileOwnerPending ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Loading account settings...</p>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Account settings are unavailable right now.</p>
              <p className="text-sm leading-relaxed text-muted-foreground">Return to your collection or contact support for help.</p>
              <Link href="/dashboard/support" className={buttonVariants({ variant: "outline", className: "max-w-full min-w-0 break-words" })}>Open support</Link>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const showCreatorCta = state.userProfile.role === "creator";

  return (
    <section
      className="w-full px-[var(--account-settings-shell-side-padding)] pb-[var(--account-settings-bottom-safe-padding)] [scroll-padding-bottom:var(--account-settings-bottom-safe-padding)] md:pb-[var(--account-settings-desktop-bottom-safe-padding)] md:[scroll-padding-bottom:var(--account-settings-desktop-bottom-safe-padding)]"
      data-account-settings-bottom-safe="true"
      data-settings-bottom-safe="true"
      data-account-settings-side-padding-parity="true"
      data-account-settings-shell-aligned="true"
      data-report-issue-chip-untouched="true"
      data-delete-account-visible-above-floating-actions="true"
      data-account-settings-nav-reservation="root-owned"
      style={accountSettingsShellStyle}
    >
      {showCreatorCta ? (
        <Card className="mb-6 gap-4 shadow-none">
          <CardContent className="min-w-0 space-y-3 break-words">
            <h2 className="text-lg font-semibold text-foreground">Creator settings</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Manage broadcasts, bookings, requests, and monetization in your creator workspace.</p>
            <Link
              href={CREATOR_SETTINGS_ROUTE}
              onClick={() => trackEvent("user_settings_creator_tools_cta_clicked", { actor_role: state.userProfile?.role || "user", creator_id: creatorId, target_creator_id: creatorId, section: "creator_dashboard_cta", source_component: "UserSettingsPage", truth_state: "migrated" })}
              className={buttonVariants({ variant: "outline", className: "max-w-full min-w-0 gap-2" })}
            >
              <span className="min-w-0 break-words">Open Creator Settings</span> <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {(state.saving || state.saveFeedback) ? <p role="status" aria-live="polite" className="mb-4 text-sm text-muted-foreground">{state.saving ? "Saving changes..." : state.saveFeedback}</p> : null}
      <form onSubmit={(event) => event.preventDefault()} className="space-y-6" aria-label="Account settings">
        <KandyProfilePanel state={state} />
        <KandyAccountDetailsPanel state={state} />
        <KandyNotificationsPanel state={state} />
        <KandyPrivacyDataPanel state={state} />
        <KandySupportSafetyPanel state={state} />
      </form>
    </section>
  );
}
