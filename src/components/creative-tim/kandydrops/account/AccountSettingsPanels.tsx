"use client";

import Image from "next/image";
import { forwardRef } from "react";
import {
  BellRing,
  CalendarDays,
  Camera,
  CircleHelp,
  Download,
  FileText,
  Globe,
  Heart,
  LifeBuoy,
  Loader2,
  Lock,
  LogOut,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserRound,
  X,
  type LucideProps,
} from "lucide-react";

import type { ProfileState } from "@/app/dashboard/profile/profile-page-types";
import {
  normalizeTimezone,
  sanitizeUsername,
  TIMEZONE_OPTIONS,
} from "@/app/dashboard/profile/hooks/useProfileState";
import { PRIVACY_POLICY_LAST_UPDATED } from "@/lib/platform-config";
import { trackEvent } from "@/lib/telemetry";

import {
  KandyActionRow,
  KandyInfoRow,
  KandyReadOnlyNotice,
  KandySettingsField,
  KandySettingsPanel,
  KandySettingsSelect,
  KandyToggleRow,
} from "./AccountSettingsPanel";

function getNumberLabel(value: number | null) {
  return value === null ? "Unavailable" : value.toLocaleString("en-US");
}

function getJoinedLabel(createdAt: number | undefined) {
  return createdAt ? new Date(createdAt).toLocaleDateString([], { month: "short", year: "numeric" }) : "Recently";
}

const DownloadInProgressIcon = forwardRef<SVGSVGElement, LucideProps>(function DownloadInProgressIcon({ className, ...props }, ref) {
  return <Loader2 ref={ref} {...props} className={className ? `animate-spin ${className}` : "animate-spin"} />;
});

export function KandyProfilePanel({ state }: { state: ProfileState }) {
  const isReadOnlyProjection = state.isCreatorProjectionActive;

  return (
    <KandySettingsPanel
      eyebrow="Identity"
      title="Profile details"
      description="Make it easy for the right people to recognize you."
      icon={UserRound}
    >
      {isReadOnlyProjection ? <KandyReadOnlyNotice>Read-only admin projection. Profile edits are disabled.</KandyReadOnlyNotice> : null}
      <div className="flex items-center gap-4 border-b border-white/8 px-4 py-5 sm:px-5">
        <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.45rem] border border-white/15 bg-black/35 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
          <input
            type="file"
            accept="image/*"
            aria-label="Change profile photo"
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            onChange={state.handleChangeAvatar}
            disabled={state.isUploadingAvatar || isReadOnlyProjection}
          />
          {state.isUploadingAvatar ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65">
              <Loader2 className="h-5 w-5 animate-spin text-white" aria-label="Uploading profile photo" />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Camera className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
          )}
          {state.user?.photoURL ? (
            <Image src={state.user.photoURL} alt="Profile photo" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-black text-white">{state.avatarFallback}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-black tracking-tight text-white">{state.profileIdentityLabel}</p>
          <p className="mt-1 truncate text-sm text-white/55">{state.profileIdentityDetail}</p>
          <p className="mt-3 text-xs font-semibold text-brand-pink">Tap your photo to change it</p>
        </div>
      </div>
      <KandySettingsField
        label="Display name"
        icon={User}
        value={state.formState.displayName}
        onChange={(value) => state.updateForm("displayName", value)}
        placeholder="Enter your name"
        disabled={isReadOnlyProjection}
      />
      <KandySettingsField
        label="Username"
        description="Used for short URLs and identification."
        icon={UserRound}
        value={state.formState.username}
        onChange={(value) => state.updateForm("username", sanitizeUsername(value))}
        placeholder="your_handle"
        disabled={isReadOnlyProjection}
      />
    </KandySettingsPanel>
  );
}

export function KandyAccountDetailsPanel({ state }: { state: ProfileState }) {
  const isReadOnlyProjection = state.isCreatorProjectionActive;
  const balance = typeof state.userProfile?.gumDropsBalance === "number" ? state.userProfile.gumDropsBalance : null;
  const unlockedCount = state.userProfile ? state.userProfile.unlockedContent.length : null;

  return (
    <KandySettingsPanel
      eyebrow="Account"
      title="Account details"
      description="The practical details that keep your KandyDrops space in sync."
      icon={ShieldCheck}
    >
      {isReadOnlyProjection ? <KandyReadOnlyNotice>Read-only admin projection. Account edits are disabled.</KandyReadOnlyNotice> : null}
      <KandyInfoRow label="Email address" value={state.profileEmail} icon={Mail} />
      <KandySettingsField
        label="Birthday"
        icon={CalendarDays}
        value={state.formState.dateOfBirth}
        onChange={(value) => state.updateForm("dateOfBirth", value)}
        type="date"
        disabled={isReadOnlyProjection}
      />
      <KandySettingsSelect
        label="Timezone"
        icon={Globe}
        value={state.formState.timezone}
        onChange={(value) => state.updateForm("timezone", normalizeTimezone(value))}
        options={[...TIMEZONE_OPTIONS]}
        disabled={isReadOnlyProjection}
      />
      <div className="grid grid-cols-3 divide-x divide-white/10 bg-black/20">
        <div className="px-3 py-4 text-center">
          <p className="truncate text-base font-black text-white">{getNumberLabel(balance)}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">GumDrops</p>
        </div>
        <div className="px-3 py-4 text-center">
          <p className="truncate text-base font-black text-white">{getNumberLabel(unlockedCount)}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">Unwrapped</p>
        </div>
        <div className="px-3 py-4 text-center">
          <p className="truncate text-sm font-black text-white">{getJoinedLabel(state.userProfile?.createdAt)}</p>
          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/45">Joined</p>
        </div>
      </div>
    </KandySettingsPanel>
  );
}

export function KandyNotificationsPanel({ state }: { state: ProfileState }) {
  const isReadOnlyProjection = state.isCreatorProjectionActive;
  const trackNotificationToggle = (settingId: string, value: boolean) => {
    trackEvent("setting_toggle_changed", {
      setting_id: settingId,
      actor_role: state.userProfile?.role || "user",
      creator_id: state.userProfile?.uid || "",
      target_creator_id: state.userProfile?.uid || "",
      settings_surface: "account",
      section: "notifications",
      source_component: "ProfileNotificationsSection",
      truth_state: "source_ready",
      value: String(value),
    });
  };

  return (
    <KandySettingsPanel
      eyebrow="Stay in the loop"
      title="Notifications"
      description="Choose how KandyDrops gets your attention."
      icon={BellRing}
    >
      {isReadOnlyProjection ? <KandyReadOnlyNotice>Read-only admin projection. Notification changes are disabled.</KandyReadOnlyNotice> : null}
      <KandyInfoRow
        label="Service and purchase notices"
        description="Required for security and payments."
        icon={ShieldAlert}
        badge="Required"
      />
      <KandyToggleRow
        label="Browser push alerts"
        description={state.notificationSupportMessage || "Reminders for tasks and drops."}
        checked={state.formState.browserPushEnabled}
        onChange={(value) => {
          trackNotificationToggle("notification_preferences", value);
          void state.handleBrowserPushToggle(value);
        }}
        disabled={state.notificationSetupLoading || isReadOnlyProjection}
        badge={state.notificationSetupLoading ? "Please wait" : undefined}
      />
      <KandyToggleRow
        label="In-app alerts"
        description="Show task and drop alerts inside the app."
        checked={state.formState.inAppEnabled}
        onChange={(value) => {
          trackNotificationToggle("notification_preferences", value);
          state.updateForm("inAppEnabled", value);
        }}
        disabled={isReadOnlyProjection}
      />
      <KandyToggleRow
        label="New releases"
        description="Alert me when new drops go live."
        checked={state.formState.newDropAlerts}
        onChange={(value) => {
          trackNotificationToggle("notification_preferences", value);
          state.updateForm("newDropAlerts", value);
        }}
        disabled={isReadOnlyProjection}
      />
      <KandyInfoRow
        label="Ending soon"
        description="Drop expiration reminders are not available yet."
        icon={BellRing}
        badge="Unavailable"
      />
    </KandySettingsPanel>
  );
}

export function KandyPrivacyDataPanel({ state }: { state: ProfileState }) {
  const isReadOnlyProjection = state.isCreatorProjectionActive;
  const trackPrivacySetting = (settingId: string, value?: boolean) => {
    trackEvent("setting_toggle_changed", {
      setting_id: settingId,
      actor_role: state.userProfile?.role || "user",
      creator_id: state.userProfile?.uid || "",
      target_creator_id: state.userProfile?.uid || "",
      settings_surface: "privacy",
      section: "privacy_data",
      source_component: "ProfilePrivacyDataSection",
      truth_state: "source_ready",
      value: value === undefined ? "action" : String(value),
    });
  };
  const trackPrivacyAction = (settingId: string) => {
    trackEvent("setting_action_clicked", {
      setting_id: settingId,
      actor_role: state.userProfile?.role || "user",
      creator_id: state.userProfile?.uid || "",
      target_creator_id: state.userProfile?.uid || "",
      settings_surface: "privacy",
      section: "privacy_data",
      source_component: "ProfilePrivacyDataSection",
      truth_state: "source_ready",
    });
  };

  return (
    <KandySettingsPanel
      eyebrow="Your choices"
      title="Privacy and data"
      description="Keep control of the data that helps shape your KandyDrops experience."
      icon={Lock}
    >
      {isReadOnlyProjection ? <KandyReadOnlyNotice>Read-only admin projection. Privacy choices are disabled.</KandyReadOnlyNotice> : null}
      <KandyInfoRow
        label="Strictly necessary storage"
        description="Required for sign-in and core operations."
        icon={Lock}
        badge="Required"
      />
      <KandyToggleRow
        label="Anonymous analytics"
        description="Measure usage without tying it to your account."
        checked={state.formState.anonymousAnalyticsEnabled}
        onChange={(value) => {
          trackPrivacySetting("anonymous_analytics", value);
          state.updateForm("anonymousAnalyticsEnabled", value);
          if (!value) {
            state.updateForm("identifiedAnalyticsEnabled", false);
            state.updateForm("allowRecommendations", false);
            state.updateForm("showInAnonymousStats", false);
          }
        }}
        disabled={isReadOnlyProjection}
      />
      <KandyToggleRow
        label="Account-linked analytics"
        checked={state.formState.identifiedAnalyticsEnabled}
        onChange={(value) => {
          trackPrivacySetting("account_linked_analytics", value);
          state.updateForm("identifiedAnalyticsEnabled", value);
          if (value) state.updateForm("anonymousAnalyticsEnabled", true);
          else state.updateForm("allowRecommendations", false);
        }}
        disabled={isReadOnlyProjection}
      />
      <KandyToggleRow
        label="Activity recommendations"
        checked={state.formState.allowRecommendations}
        onChange={(value) => {
          trackPrivacySetting("activity_recommendations", value);
          state.updateForm("allowRecommendations", value);
          if (value) {
            state.updateForm("anonymousAnalyticsEnabled", true);
            state.updateForm("identifiedAnalyticsEnabled", true);
          }
        }}
        disabled={isReadOnlyProjection}
      />
      <KandyToggleRow
        label="Honor Global Privacy Control"
        checked={state.formState.honorGlobalPrivacyControl}
        onChange={(value) => {
          trackPrivacySetting("honor_global_privacy_control", value);
          state.updateForm("honorGlobalPrivacyControl", value);
        }}
        badge={state.browserGpcEnabled ? "Detected" : undefined}
        disabled={isReadOnlyProjection}
      />
      <KandyActionRow
        label="Essential Only Mode"
        description="Turn off all optional tracking immediately."
        icon={ShieldAlert}
        onClick={() => {
          trackPrivacyAction("essential_only_mode");
          void state.handleWithdrawOptionalTracking();
        }}
        disabled={isReadOnlyProjection}
      />
      <KandyActionRow
        label="Download My Data"
        description="Export your account data securely as JSON."
        icon={state.isDownloading ? DownloadInProgressIcon : Download}
        onClick={() => {
          trackPrivacyAction("download_my_data");
          void state.handleDownloadData();
        }}
      />
      <KandyActionRow
        label="Privacy Policy"
        description={`Last updated: ${PRIVACY_POLICY_LAST_UPDATED}`}
        icon={FileText}
        href="/privacy"
        onClick={() => trackPrivacyAction("privacy_policy")}
      />
    </KandySettingsPanel>
  );
}

export function KandySupportSafetyPanel({ state }: { state: ProfileState }) {
  const trackSupportAction = (settingId: string) => {
    trackEvent("setting_action_clicked", {
      setting_id: settingId,
      actor_role: state.userProfile?.role || "user",
      creator_id: state.userProfile?.uid || "",
      target_creator_id: state.userProfile?.uid || "",
      settings_surface: settingId === "delete_account" ? "danger_zone" : "support",
      section: "support_safety",
      source_component: "ProfileSupportSafetySection",
      truth_state: "source_ready",
    });
  };

  return (
    <>
      <KandySettingsPanel
        eyebrow="Help and safety"
        title="Support and account safety"
        description="Get help, review policies, or take care of account access."
        icon={Heart}
      >
        <KandyActionRow label="FAQ" icon={CircleHelp} href="/faq" onClick={() => trackSupportAction("faq")} />
        <KandyActionRow label="Support" icon={LifeBuoy} href="/dashboard/support" onClick={() => trackSupportAction("support")} />
        <KandyActionRow label="Policies" icon={FileText} href="/privacy" onClick={() => trackSupportAction("policies")} />
        <KandyActionRow
          label="Sign out"
          icon={LogOut}
          onClick={() => {
            trackSupportAction("sign_out");
            void state.logout();
          }}
        />
        <KandyActionRow
          label="Delete account"
          description="Permanently erase all your data."
          icon={state.isDeleting ? Loader2 : Trash2}
          onClick={() => {
            trackSupportAction("delete_account");
            state.handleRequestDeletion();
          }}
          destructive
        />
      </KandySettingsPanel>

      {state.deleteConfirmationOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-8 backdrop-blur-md sm:items-center"
          data-account-delete-confirmation-modal="true"
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-delete-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-red-300/20 bg-[linear-gradient(145deg,rgba(58,18,38,0.98),rgba(12,8,17,0.98))] text-white shadow-[0_30px_90px_rgba(0,0,0,0.68)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-200">Permanent action</p>
                <h3 id="account-delete-title" className="mt-1 text-xl font-black tracking-tight text-white">Delete account?</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  This permanently deletes your account, KandyDrops collection, and account data after this confirmation. This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={state.handleCancelAccountDeletion}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                aria-label="Cancel account deletion"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {state.deletionFeedback ? (
              <div className="mx-5 mt-5 rounded-2xl border border-red-300/25 bg-red-500/10 px-3 py-3 text-sm leading-6 text-red-100">
                {state.deletionFeedback}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 px-5 py-5">
              <button
                type="button"
                onClick={state.handleCancelAccountDeletion}
                className="min-h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-65"
                disabled={state.isDeleting}
              >
                Keep account
              </button>
              <button
                type="button"
                onClick={state.handleConfirmAccountDeletion}
                className="min-h-11 rounded-2xl bg-red-500 px-4 text-sm font-extrabold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 disabled:cursor-not-allowed disabled:opacity-65"
                disabled={state.isDeleting}
              >
                {state.isDeleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
