"use client";

import Image from "next/image";
import Link from "next/link";
import { forwardRef, useRef } from "react";
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
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/creative-tim/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/Button";

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
  return createdAt && Number.isFinite(createdAt) ? new Date(createdAt).toLocaleDateString([], { month: "short", year: "numeric" }) : "Unavailable";
}

const DownloadInProgressIcon = forwardRef<SVGSVGElement, LucideProps>(function DownloadInProgressIcon({ className, ...props }, ref) {
  return <Loader2 ref={ref} {...props} className={className ? `animate-spin motion-reduce:animate-none ${className}` : "animate-spin motion-reduce:animate-none"} />;
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
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-5">
        <div className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
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
              <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none text-white" aria-label="Uploading profile photo" />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-black/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              <Camera className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
          )}
          {state.user?.photoURL ? (
            <Image src={state.user.photoURL} alt="Profile photo" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-foreground">{state.avatarFallback}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 basis-40 break-words">
          <p className="break-words text-lg font-semibold tracking-tight text-foreground">{state.profileIdentityLabel}</p>
          <p className="mt-1 break-words text-sm text-muted-foreground">{state.profileIdentityDetail}</p>
          <p className="mt-3 text-xs text-muted-foreground">{isReadOnlyProjection ? "Profile photo is read-only" : "Tap your photo to change it"}</p>
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
  const paidBalance = typeof state.userProfile?.gumDropsPurchasedBalance === "number" ? state.userProfile.gumDropsPurchasedBalance : null;
  const rewardBalance = typeof state.userProfile?.gumDropsRewardBalance === "number" ? state.userProfile.gumDropsRewardBalance : null;
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
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] divide-x divide-border">
        <div className="min-w-0 break-words px-3 py-4 text-center">
          <dt className="text-xs text-muted-foreground">GumDrops</dt>
          <dd className="mt-1 break-words text-base font-medium text-foreground">{getNumberLabel(balance)}</dd>
        </div>
        <div className="min-w-0 break-words px-3 py-4 text-center">
          <dt className="text-xs text-muted-foreground">Unwrapped</dt>
          <dd className="mt-1 break-words text-base font-medium text-foreground">{getNumberLabel(unlockedCount)}</dd>
        </div>
        <div className="min-w-0 break-words px-3 py-4 text-center">
          <dt className="text-xs text-muted-foreground">Joined</dt>
          <dd className="mt-1 text-sm font-medium text-foreground">{getJoinedLabel(state.userProfile?.createdAt)}</dd>
        </div>
      </dl>
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] divide-x divide-border border-t border-border">
        <div className="min-w-0 break-words px-3 py-4 text-center"><dt className="text-xs text-muted-foreground">Paid GumDrops</dt><dd className="mt-1 break-words text-sm font-medium text-foreground">{getNumberLabel(paidBalance)}</dd></div>
        <div className="min-w-0 break-words px-3 py-4 text-center"><dt className="text-xs text-muted-foreground">Reward GumDrops</dt><dd className="mt-1 break-words text-sm font-medium text-foreground">{getNumberLabel(rewardBalance)}</dd></div>
      </dl>
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
  const deletionTitleRef = useRef<HTMLHeadingElement>(null);
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
    <Dialog
      open={state.deleteConfirmationOpen}
      onOpenChange={(open) => {
        if (!open && !state.isDeleting) state.handleCancelAccountDeletion();
      }}
    >
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
        <DialogTrigger asChild>
        <KandyActionRow
          label="Delete account"
          description="Permanently delete your account."
          icon={state.isDeleting ? Loader2 : Trash2}
          onClick={() => {
            trackSupportAction("delete_account");
            state.handleRequestDeletion();
          }}
          destructive
          disabled={state.isDeleting || state.isCreatorProjectionActive}
        />
        </DialogTrigger>
      </KandySettingsPanel>

        <DialogContent
          aria-modal="true"
          showCloseButton={false}
          className="gap-0 overflow-x-hidden p-0"
          data-account-delete-confirmation-modal="true"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            deletionTitleRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (state.isDeleting) event.preventDefault();
          }}
          onInteractOutside={(event) => event.preventDefault()}
        >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border p-4">
                <p className="min-w-0 break-words text-xs font-medium text-destructive">Permanent action</p>
              <DialogClose asChild><Button type="button" variant="ghost" size="icon" disabled={state.isDeleting} aria-label="Cancel account deletion" className="shrink-0">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button></DialogClose>
                <DialogTitle asChild><h3 ref={deletionTitleRef} tabIndex={-1} className="col-span-2 min-w-0 break-words text-xl font-semibold tracking-tight text-foreground">Delete account?</h3></DialogTitle>
                <DialogDescription asChild>
                  <p className="col-span-2 min-w-0 break-words text-sm leading-relaxed text-muted-foreground">
                    You will lose access to your account and KandyDrops collection. Some records may be retained for legal, security, or payment obligations as described in our <Link href="/privacy" className="inline-flex min-h-11 min-w-11 max-w-full items-center break-words underline underline-offset-4">Privacy Policy</Link>. This cannot be undone.
                  </p>
                </DialogDescription>
            </div>

            {state.deletionFeedback ? (
              <div role="alert" className="mx-4 mt-4 min-w-0 break-words rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-3 text-sm leading-relaxed text-foreground">
                {state.deletionFeedback}
              </div>
            ) : null}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-3 p-4">
              <DialogClose asChild><Button type="button" variant="outline" disabled={state.isDeleting} className="min-w-0 break-words">
                Keep account
              </Button></DialogClose>
              {state.deletionRequiresSupportReview ? (
                <Link href="/dashboard/support" className={buttonVariants({ variant: "brand", className: "min-w-0 break-words" })}>Contact support</Link>
              ) : <Button type="button" variant="danger" className="min-w-0 break-words" onClick={state.handleConfirmAccountDeletion} disabled={state.isDeleting} aria-busy={state.isDeleting}>
                {state.isDeleting ? "Deleting..." : "Delete account"}
              </Button>}
            </div>
        </DialogContent>
    </Dialog>
  );
}
